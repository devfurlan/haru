import prisma from '../lib/prisma.js';
import {
  generateSeriesDates,
  occursWithinOpenBlocks,
  RECURRENCE_MAX_HORIZON_DAYS,
  type RecurrenceFrequency,
} from '../lib/recurrence.js';
import { sendAppointmentTemplate } from './appointmentTemplateService.js';
import {
  notifyAppointmentCanceled,
  notifyAppointmentCreated,
  notifyAppointmentRescheduled,
} from './notificationService.js';

export interface BookAppointmentArgs {
  tenantId: string;
  contactId: string;
  serviceId: string;
  startsAtIso: string;
}

export type BookAppointmentResult =
  | {
      ok: true;
      appointmentId: string;
      summary: string;
      /** Preço do serviço (centavos). 0 = sem cobrança. Pro LLM decidir se oferece pagamento. */
      priceCents: number;
      /** Se o estabelecimento aceita pagamento online (tenant.paymentProvider definido). */
      paymentAvailable: boolean;
    }
  | { ok: false; reason: string };

export async function bookAppointment(args: BookAppointmentArgs): Promise<BookAppointmentResult> {
  // Gate de cadastro: só agenda depois que o cliente confirmou o cadastro básico
  // pelo bot (profileCompletedAt setado por save_customer_profile). NÃO usamos
  // `name` porque o profile do WhatsApp o autopreenche e nunca dispararia o gate.
  const contact = await prisma.contact.findFirst({
    where: { id: args.contactId, tenantId: args.tenantId },
    select: { profileCompletedAt: true },
  });
  if (!contact || !contact.profileCompletedAt) {
    return {
      ok: false,
      reason:
        'cadastro incompleto - confirme o nome (e ofereça email e data de nascimento, que são ' +
        'opcionais) e chame save_customer_profile antes de agendar',
    };
  }

  const startsAt = new Date(args.startsAtIso);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, reason: 'starts_at inválido (use ISO 8601 com timezone)' };
  }
  if (startsAt < new Date()) {
    return { ok: false, reason: 'starts_at no passado' };
  }

  const service = await prisma.service.findFirst({
    where: { id: args.serviceId, tenantId: args.tenantId, active: true },
  });
  if (!service) {
    return { ok: false, reason: 'service_id não encontrado ou inativo' };
  }

  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60 * 1000);

  // Conflito com outro agendamento PENDING/CONFIRMED no mesmo tenant
  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId: args.tenantId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      // Overlap: existing.startsAt < new.endsAt AND existing.endsAt > new.startsAt
      AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
    },
  });
  if (conflict) {
    return { ok: false, reason: 'horário ocupado por outro agendamento' };
  }

  // Bloqueio pontual da agenda (folga/compromisso do dono) - indisponível.
  const blocked = await prisma.scheduleException.findFirst({
    where: {
      tenantId: args.tenantId,
      AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
    },
    select: { id: true },
  });
  if (blocked) {
    return { ok: false, reason: 'horário bloqueado na agenda (indisponível)' };
  }

  const appointment = await prisma.appointment.create({
    data: {
      tenantId: args.tenantId,
      contactId: args.contactId,
      serviceId: service.id,
      startsAt,
      endsAt,
      status: 'CONFIRMED',
    },
  });

  // Fire-and-forget: notifica via webhook se o tenant configurou
  notifyAppointmentCreated(appointment.id).catch((err) =>
    console.error('[appointment] notify failed', err),
  );

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: args.tenantId },
    select: { timezone: true, paymentProvider: true },
  });

  const summary = `${service.name} · ${new Intl.DateTimeFormat('pt-BR', {
    timeZone: tenant.timezone,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(startsAt)}`;

  return {
    ok: true,
    appointmentId: appointment.id,
    summary,
    priceCents: service.priceCents,
    paymentAvailable: tenant.paymentProvider != null,
  };
}

export interface BookRecurringArgs {
  tenantId: string;
  contactId: string;
  serviceId: string;
  startsAtIso: string;
  frequency: RecurrenceFrequency;
  occurrences: number;
}

export type BookRecurringResult =
  | {
      ok: true;
      seriesId: string;
      createdCount: number;
      /** Resumo da 1ª ocorrência criada (serviço · dia/hora). */
      summary: string;
      /** Datas puladas (humanizadas no fuso do tenant) por conflito/fora do expediente. */
      skipped: string[];
      /** Quantas ocorrências caíram além do horizonte de 90 dias. */
      beyondHorizon: number;
    }
  | { ok: false; reason: string };

const MS_PER_DAY = 86_400_000;

/**
 * Cria uma série de agendamentos recorrentes (semanal/quinzenal/mensal) confirmados.
 * A 1ª ocorrência é o horário escolhido; as demais saltam mantendo a hora-de-parede.
 * PULA (sem travar a série) ocorrências que caem fora do expediente, colidem com
 * outro agendamento ou passam do horizonte de 90 dias - e devolve quais foram puladas.
 */
export async function bookRecurringAppointment(
  args: BookRecurringArgs,
): Promise<BookRecurringResult> {
  const contact = await prisma.contact.findFirst({
    where: { id: args.contactId, tenantId: args.tenantId },
    select: { profileCompletedAt: true },
  });
  if (!contact || !contact.profileCompletedAt) {
    return {
      ok: false,
      reason:
        'cadastro incompleto - confirme o nome (e ofereça email e data de nascimento, que são ' +
        'opcionais) e chame save_customer_profile antes de agendar',
    };
  }

  const first = new Date(args.startsAtIso);
  if (Number.isNaN(first.getTime())) {
    return { ok: false, reason: 'starts_at inválido (use ISO 8601 com timezone)' };
  }
  if (first < new Date()) {
    return { ok: false, reason: 'starts_at no passado' };
  }
  const occurrences = Math.min(Math.max(Math.trunc(args.occurrences), 2), 12);

  const service = await prisma.service.findFirst({
    where: { id: args.serviceId, tenantId: args.tenantId, active: true },
  });
  if (!service) {
    return { ok: false, reason: 'service_id não encontrado ou inativo' };
  }

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: args.tenantId },
    select: { timezone: true },
  });
  const blocks = await prisma.scheduleBlock.findMany({
    where: { tenantId: args.tenantId },
    select: { weekday: true, startMinute: true, endMinute: true },
  });

  const now = new Date();
  // Bloqueios pontuais da agenda - ocorrências dentro deles são puladas.
  const exceptions = await prisma.scheduleException.findMany({
    where: { tenantId: args.tenantId, endsAt: { gt: now } },
    select: { startsAt: true, endsAt: true },
  });
  const maxInstant = new Date(now.getTime() + RECURRENCE_MAX_HORIZON_DAYS * MS_PER_DAY);
  const dates = generateSeriesDates(args.startsAtIso, tenant.timezone, args.frequency, occurrences);

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: tenant.timezone,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);

  const toCreate: { startsAt: Date; endsAt: Date }[] = [];
  const skipped: string[] = [];
  let beyondHorizon = 0;

  for (const iso of dates) {
    const startsAt = new Date(iso);
    if (startsAt > maxInstant) {
      beyondHorizon++;
      continue;
    }
    if (startsAt <= now) {
      skipped.push(fmt(startsAt));
      continue;
    }
    if (!occursWithinOpenBlocks(iso, service.durationMinutes, tenant.timezone, blocks)) {
      skipped.push(fmt(startsAt));
      continue;
    }
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);
    const blockedByException = exceptions.some((e) => e.startsAt < endsAt && e.endsAt > startsAt);
    if (blockedByException) {
      skipped.push(fmt(startsAt));
      continue;
    }
    const conflict = await prisma.appointment.findFirst({
      where: {
        tenantId: args.tenantId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
      },
      select: { id: true },
    });
    if (conflict) {
      skipped.push(fmt(startsAt));
      continue;
    }
    toCreate.push({ startsAt, endsAt });
  }

  if (toCreate.length === 0) {
    return {
      ok: false,
      reason: 'nenhum horário da série está livre - proponha outro horário inicial',
    };
  }

  const { seriesId, firstId } = await prisma.$transaction(async (tx) => {
    const series = await tx.appointmentSeries.create({
      data: { tenantId: args.tenantId, frequency: args.frequency },
    });
    let firstCreatedId = '';
    for (const { startsAt, endsAt } of toCreate) {
      const appt = await tx.appointment.create({
        data: {
          tenantId: args.tenantId,
          contactId: args.contactId,
          serviceId: service.id,
          startsAt,
          endsAt,
          status: 'CONFIRMED',
          seriesId: series.id,
        },
        select: { id: true },
      });
      if (!firstCreatedId) firstCreatedId = appt.id;
    }
    return { seriesId: series.id, firstId: firstCreatedId };
  });

  // Fire-and-forget: um único webhook (1ª ocorrência) - evita N notificações.
  notifyAppointmentCreated(firstId).catch((err) =>
    console.error('[appointment] notify create (series) failed', err),
  );

  return {
    ok: true,
    seriesId,
    createdCount: toCreate.length,
    summary: `${service.name} · ${fmt(toCreate[0].startsAt)}`,
    skipped,
    beyondHorizon,
  };
}

export interface CancelAppointmentArgs {
  tenantId: string;
  contactId: string;
  appointmentId: string;
}

export type CancelAppointmentResult = { ok: true; summary: string } | { ok: false; reason: string };

/**
 * Cancela um agendamento, com scope obrigatório por contactId - o cliente só
 * pode cancelar agendamentos próprios. Não permite cancelar appointments já
 * COMPLETED/CANCELED/NO_SHOW.
 */
export async function cancelAppointmentForContact(
  args: CancelAppointmentArgs,
): Promise<CancelAppointmentResult> {
  const appt = await prisma.appointment.findFirst({
    where: {
      id: args.appointmentId,
      tenantId: args.tenantId,
      contactId: args.contactId,
    },
    include: { service: true, tenant: { select: { timezone: true } } },
  });

  if (!appt) {
    return { ok: false, reason: 'agendamento não encontrado ou não pertence a este cliente' };
  }
  if (appt.status === 'CANCELED') {
    return { ok: false, reason: 'agendamento já estava cancelado' };
  }
  if (appt.status === 'COMPLETED' || appt.status === 'NO_SHOW') {
    return { ok: false, reason: 'agendamento já realizado, não pode ser cancelado' };
  }

  await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: 'CANCELED' },
  });

  // Fire-and-forget: webhook externo + template pro cliente
  notifyAppointmentCanceled(appt.id).catch((err) =>
    console.error('[appointment] notify cancel failed', err),
  );
  sendAppointmentTemplate(appt.id, 'cancel').catch((err) =>
    console.error('[appointment] template cancel failed', err),
  );

  const summary = `${appt.service.name} · ${new Intl.DateTimeFormat('pt-BR', {
    timeZone: appt.tenant.timezone,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(appt.startsAt)}`;

  return { ok: true, summary };
}

export interface CancelSeriesArgs {
  tenantId: string;
  contactId: string;
  seriesId: string;
}

export type CancelSeriesResult =
  | { ok: true; canceledCount: number }
  | { ok: false; reason: string };

/**
 * Cancela TODAS as ocorrências futuras (PENDING/CONFIRMED) de uma série, com scope
 * por contactId - o cliente só cancela séries próprias. Não toca em ocorrências
 * passadas/realizadas. Notifica o cliente uma única vez (é o mesmo contato).
 */
export async function cancelSeriesForContact(args: CancelSeriesArgs): Promise<CancelSeriesResult> {
  const now = new Date();
  const futures = await prisma.appointment.findMany({
    where: {
      tenantId: args.tenantId,
      contactId: args.contactId,
      seriesId: args.seriesId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: now },
    },
    select: { id: true },
    orderBy: { startsAt: 'asc' },
  });
  if (futures.length === 0) {
    return {
      ok: false,
      reason: 'nenhuma ocorrência futura nessa série (ou ela não pertence a este cliente)',
    };
  }

  await prisma.appointment.updateMany({
    where: {
      tenantId: args.tenantId,
      contactId: args.contactId,
      seriesId: args.seriesId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: now },
    },
    data: { status: 'CANCELED' },
  });

  notifyAppointmentCanceled(futures[0].id).catch((err) =>
    console.error('[appointment] notify cancel (series) failed', err),
  );
  sendAppointmentTemplate(futures[0].id, 'cancel').catch((err) =>
    console.error('[appointment] template cancel (series) failed', err),
  );

  return { ok: true, canceledCount: futures.length };
}

export interface RescheduleAppointmentArgs {
  tenantId: string;
  contactId: string;
  appointmentId: string;
  newStartsAtIso: string;
}

export type RescheduleAppointmentResult =
  | { ok: true; summary: string }
  | { ok: false; reason: string };

/**
 * Move um agendamento existente pra uma nova `startsAt`. Mantém o mesmo serviço
 * (e portanto a mesma duração - endsAt é recalculado). Reseta `reminderSentAt`
 * pra que um novo lembrete dispare no horário relativo ao novo slot.
 */
export async function rescheduleAppointmentForContact(
  args: RescheduleAppointmentArgs,
): Promise<RescheduleAppointmentResult> {
  const newStartsAt = new Date(args.newStartsAtIso);
  if (Number.isNaN(newStartsAt.getTime())) {
    return { ok: false, reason: 'new_starts_at inválido (use ISO 8601 com timezone)' };
  }
  if (newStartsAt < new Date()) {
    return { ok: false, reason: 'new_starts_at no passado' };
  }

  const appt = await prisma.appointment.findFirst({
    where: {
      id: args.appointmentId,
      tenantId: args.tenantId,
      contactId: args.contactId,
    },
    include: { service: true, tenant: { select: { timezone: true } } },
  });

  if (!appt) {
    return { ok: false, reason: 'agendamento não encontrado ou não pertence a este cliente' };
  }
  if (appt.status === 'CANCELED') {
    return { ok: false, reason: 'agendamento está cancelado - peça pra criar um novo' };
  }
  if (appt.status === 'COMPLETED' || appt.status === 'NO_SHOW') {
    return { ok: false, reason: 'agendamento já realizado, não pode ser remarcado' };
  }

  const newEndsAt = new Date(newStartsAt.getTime() + appt.service.durationMinutes * 60_000);

  // Conflito com OUTROS agendamentos (exclui o próprio)
  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId: args.tenantId,
      id: { not: appt.id },
      status: { in: ['PENDING', 'CONFIRMED'] },
      AND: [{ startsAt: { lt: newEndsAt } }, { endsAt: { gt: newStartsAt } }],
    },
  });
  if (conflict) {
    return { ok: false, reason: 'novo horário já ocupado por outro agendamento' };
  }

  // Bloqueio pontual da agenda (folga/compromisso do dono) - indisponível.
  const blocked = await prisma.scheduleException.findFirst({
    where: {
      tenantId: args.tenantId,
      AND: [{ startsAt: { lt: newEndsAt } }, { endsAt: { gt: newStartsAt } }],
    },
    select: { id: true },
  });
  if (blocked) {
    return { ok: false, reason: 'novo horário bloqueado na agenda (indisponível)' };
  }

  await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      // Lembrete já foi enviado pro horário antigo - zera pra disparar de novo
      // pro novo horário (se cair dentro da janela).
      reminderSentAt: null,
    },
  });

  notifyAppointmentRescheduled(appt.id).catch((err) =>
    console.error('[appointment] notify reschedule failed', err),
  );
  sendAppointmentTemplate(appt.id, 'reschedule').catch((err) =>
    console.error('[appointment] template reschedule failed', err),
  );

  const summary = `${appt.service.name} · ${new Intl.DateTimeFormat('pt-BR', {
    timeZone: appt.tenant.timezone,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(newStartsAt)}`;

  return { ok: true, summary };
}
