import prisma from '../lib/prisma.js';
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

export async function bookAppointment(
  args: BookAppointmentArgs,
): Promise<BookAppointmentResult> {
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
        'cadastro incompleto — confirme o nome (e ofereça email e data de nascimento, que são ' +
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

export interface CancelAppointmentArgs {
  tenantId: string;
  contactId: string;
  appointmentId: string;
}

export type CancelAppointmentResult =
  | { ok: true; summary: string }
  | { ok: false; reason: string };

/**
 * Cancela um agendamento, com scope obrigatório por contactId — o cliente só
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
 * (e portanto a mesma duração — endsAt é recalculado). Reseta `reminderSentAt`
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
    return { ok: false, reason: 'agendamento está cancelado — peça pra criar um novo' };
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

  await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      // Lembrete já foi enviado pro horário antigo — zera pra disparar de novo
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
