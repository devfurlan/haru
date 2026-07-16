import { sendAppointmentEmails } from '../lib/appointmentEmail.js';
import prisma from '../lib/prisma.js';
import {
  generateSeriesDates,
  occursWithinOpenBlocks,
  RECURRENCE_MAX_HORIZON_DAYS,
  type RecurrenceFrequency,
} from '../lib/recurrence.js';
import {
  notifyAppointmentCanceled,
  notifyAppointmentCreated,
  notifyAppointmentRescheduled,
} from './notificationService.js';
import { resolveProfessionalForBooking } from './professionalService.js';

export interface BookAppointmentArgs {
  tenantId: string;
  contactId: string;
  serviceId: string;
  startsAtIso: string;
  /** Profissional escolhido. Vazio/ausente = sem preferência (sistema resolve). */
  professionalId?: string;
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

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: args.tenantId },
    select: { timezone: true, paymentProvider: true },
  });

  // Resolve o profissional (escolhido ou "sem preferência" = primeiro livre). Isso
  // valida, por profissional: atende o serviço, cabe no expediente, sem conflito e
  // sem folga. No caso solo é sempre o único profissional.
  const resolved = await resolveProfessionalForBooking({
    tenantId: args.tenantId,
    serviceId: service.id,
    startsAt,
    endsAt,
    tz: tenant.timezone,
    durationMinutes: service.durationMinutes,
    requestedProfessionalId: args.professionalId,
  });
  if (!resolved.ok) {
    return { ok: false, reason: resolved.reason };
  }

  // ponytail: o bot cria direto, sem a guarda de corrida (advisory lock em
  // insertAppointmentGuarded) nem o freeze da fila de espera (isSlotFrozenByWaitlist). Aceitável
  // porque o bot é o addon "Atendente IA", não lançado. Ao lançar, rotear por insertAppointmentGuarded
  // e checar o freeze aqui (senão o bot marca por cima de reserva da fila / double-booka em corrida).
  const appointment = await prisma.appointment.create({
    data: {
      tenantId: args.tenantId,
      contactId: args.contactId,
      serviceId: service.id,
      professionalId: resolved.professionalId,
      startsAt,
      endsAt,
      status: 'CONFIRMED',
    },
  });

  // Fire-and-forget: notifica via webhook se o tenant configurou
  notifyAppointmentCreated(appointment.id).catch((err) =>
    console.error('[appointment] notify failed', err),
  );
  // E-mail: confirmação pro cliente + "novo agendamento" pro dono (best-effort).
  sendAppointmentEmails({
    appointmentId: appointment.id,
    event: 'confirmed',
    notifyOwner: true,
  }).catch((err) => console.error('[appointment] email booked failed', err));

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
  /** Profissional escolhido. Vazio/ausente = sem preferência (resolve na 1ª data). */
  professionalId?: string;
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

  // A série fica com UM profissional fixo, resolvido pela 1ª ocorrência (escolhido
  // ou "sem preferência" = primeiro livre). As demais ocorrências em que ele
  // estiver ocupado/fora do expediente são puladas (igual ao avulso).
  const firstEndsAt = new Date(first.getTime() + service.durationMinutes * 60_000);
  const resolved = await resolveProfessionalForBooking({
    tenantId: args.tenantId,
    serviceId: service.id,
    startsAt: first,
    endsAt: firstEndsAt,
    tz: tenant.timezone,
    durationMinutes: service.durationMinutes,
    requestedProfessionalId: args.professionalId,
  });
  if (!resolved.ok) {
    return { ok: false, reason: resolved.reason };
  }
  const professionalId = resolved.professionalId;

  const blocks = await prisma.scheduleBlock.findMany({
    where: { tenantId: args.tenantId, professionalId },
    select: { weekday: true, startMinute: true, endMinute: true },
  });

  const now = new Date();
  // Bloqueios pontuais da agenda (do tenant + do profissional) - ocorrências dentro
  // deles são puladas.
  const exceptions = await prisma.scheduleException.findMany({
    where: {
      tenantId: args.tenantId,
      endsAt: { gt: now },
      OR: [{ professionalId: null }, { professionalId }],
    },
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
        professionalId,
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
          professionalId,
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
  sendAppointmentEmails({ appointmentId: firstId, event: 'confirmed', notifyOwner: true }).catch(
    (err) => console.error('[appointment] email booked (series) failed', err),
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

  // Fire-and-forget: webhook pro DONO. O cliente NÃO recebe template aqui - ele
  // está conversando ao vivo com o bot, que confirma o cancelamento na resposta.
  // O template de cancelamento é só pra mudanças fora de conversa (painel web).
  notifyAppointmentCanceled(appt.id).catch((err) =>
    console.error('[appointment] notify cancel failed', err),
  );
  // E-mail: cliente já é avisado na conversa; manda só pro DONO.
  sendAppointmentEmails({
    appointmentId: appt.id,
    event: 'canceled',
    notifyCustomer: false,
    notifyOwner: true,
  }).catch((err) => console.error('[appointment] email cancel failed', err));

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

  // Fire-and-forget: webhook pro DONO. Cliente é avisado pela resposta do bot.
  notifyAppointmentCanceled(futures[0].id).catch((err) =>
    console.error('[appointment] notify cancel (series) failed', err),
  );
  sendAppointmentEmails({
    appointmentId: futures[0].id,
    event: 'canceled',
    notifyCustomer: false,
    notifyOwner: true,
  }).catch((err) => console.error('[appointment] email cancel (series) failed', err));

  return { ok: true, canceledCount: futures.length };
}

export interface RescheduleAppointmentArgs {
  tenantId: string;
  contactId: string;
  appointmentId: string;
  newStartsAtIso: string;
  /** Opcional: troca o serviço junto com o horário. Vazio = mantém o atual. */
  newServiceId?: string;
}

export type RescheduleAppointmentResult =
  | {
      ok: true;
      /** Serviço · dia/hora NOVOS. */
      summary: string;
      /** Serviço · dia/hora ANTIGOS (pra mensagem única "troquei o antigo pelo novo"). */
      previousSummary: string;
      /** Se a remarcação também trocou o serviço. */
      serviceChanged: boolean;
      /** Preço do serviço novo (centavos). 0 = sem cobrança. */
      priceCents: number;
      /** Se o estabelecimento aceita pagamento online (tenant.paymentProvider definido). */
      paymentAvailable: boolean;
    }
  | { ok: false; reason: string };

/**
 * Move um agendamento existente pra uma nova `startsAt` e, opcionalmente, troca o
 * serviço (`newServiceId`). A duração/preço passam a ser os do serviço-alvo e o
 * endsAt é recalculado. Reseta `reminderSentAt` pra que um novo lembrete dispare
 * no horário relativo ao novo slot.
 *
 * O CLIENTE não recebe template aqui: o bot está em conversa ativa e confirma a
 * mudança numa única mensagem. Só o webhook do dono é disparado.
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
    include: { service: true, tenant: { select: { timezone: true, paymentProvider: true } } },
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

  // Troca opcional de serviço: se vier um newServiceId diferente, valida e usa a
  // duração/preço do serviço novo; senão mantém o serviço atual.
  const wantsServiceChange = !!args.newServiceId && args.newServiceId !== appt.serviceId;
  const targetService = wantsServiceChange
    ? await prisma.service.findFirst({
        where: { id: args.newServiceId, tenantId: args.tenantId, active: true },
      })
    : appt.service;
  if (!targetService) {
    return { ok: false, reason: 'new_service_id não encontrado ou inativo' };
  }

  // A remarcação mantém o MESMO profissional. Se trocar de serviço, ele precisa
  // atender o novo serviço (senão é caso de cancelar e criar um novo).
  if (wantsServiceChange) {
    const offers = await prisma.professionalService.findFirst({
      where: { professionalId: appt.professionalId, serviceId: targetService.id },
      select: { id: true },
    });
    if (!offers) {
      return {
        ok: false,
        reason:
          'o profissional deste agendamento não atende o novo serviço - cancele e crie um novo',
      };
    }
  }

  const newEndsAt = new Date(newStartsAt.getTime() + targetService.durationMinutes * 60_000);

  // Conflito com OUTROS agendamentos DO MESMO PROFISSIONAL (exclui o próprio).
  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId: args.tenantId,
      professionalId: appt.professionalId,
      id: { not: appt.id },
      status: { in: ['PENDING', 'CONFIRMED'] },
      AND: [{ startsAt: { lt: newEndsAt } }, { endsAt: { gt: newStartsAt } }],
    },
  });
  if (conflict) {
    return { ok: false, reason: 'novo horário já ocupado por outro agendamento' };
  }

  // Bloqueio pontual da agenda (folga do tenant ou do profissional) - indisponível.
  const blocked = await prisma.scheduleException.findFirst({
    where: {
      tenantId: args.tenantId,
      OR: [{ professionalId: null }, { professionalId: appt.professionalId }],
      AND: [{ startsAt: { lt: newEndsAt } }, { endsAt: { gt: newStartsAt } }],
    },
    select: { id: true },
  });
  if (blocked) {
    return { ok: false, reason: 'novo horário bloqueado na agenda (indisponível)' };
  }

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: appt.tenant.timezone,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);

  // Resumo do que SAIU (serviço/horário antigos) antes de sobrescrever.
  const previousSummary = `${appt.service.name} · ${fmt(appt.startsAt)}`;

  await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      serviceId: targetService.id,
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      // Lembrete já foi enviado pro horário antigo - zera pra disparar de novo
      // pro novo horário (se cair dentro da janela). Vale pros dois canais.
      reminderSentAt: null,
      reminderEmailSentAt: null,
      // Atendimento moveu: re-arma o convite de avaliação pro novo horário.
      reviewInviteSentAt: null,
    },
  });

  // Fire-and-forget: webhook pro DONO. Sem template pro cliente (ver doc acima).
  notifyAppointmentRescheduled(appt.id).catch((err) =>
    console.error('[appointment] notify reschedule failed', err),
  );
  // E-mail: cliente já é avisado na conversa; manda só pro DONO.
  sendAppointmentEmails({
    appointmentId: appt.id,
    event: 'rescheduled',
    notifyCustomer: false,
    notifyOwner: true,
  }).catch((err) => console.error('[appointment] email reschedule failed', err));

  return {
    ok: true,
    summary: `${targetService.name} · ${fmt(newStartsAt)}`,
    previousSummary,
    serviceChanged: wantsServiceChange,
    priceCents: targetService.priceCents,
    paymentAvailable: appt.tenant.paymentProvider != null,
  };
}
