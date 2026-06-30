// Núcleo compartilhado das mutações de agendamento (remarcar / cancelar / criar),
// usado tanto pelo PAINEL DO DONO quanto pela ÁREA DO CLIENTE. As regras (revalidar
// slot, status permitidos, conflito, notificações) são idênticas nos dois mundos -
// só muda o GATE de ownership (tenantId p/ o dono, contact.customerAccountId p/ o
// cliente), que fica no CALLER. Estes cores recebem o `tenantId` já resolvido e NÃO
// fazem `revalidatePath`/`redirect` (cada caller conhece as próprias rotas).
//
// Não é `'use server'`: é lib puro chamado pelas server actions.

import { prisma, type AppointmentStatus } from '@haru/database';

import { sendAppointmentEmails } from '@/lib/appointment-email';
import { BOOKING_HORIZON_DAYS, isoDateInTz } from '@/lib/booking-days';
import {
  notifyAppointmentCanceled,
  notifyAppointmentCreated,
  notifyAppointmentRescheduled,
} from '@/lib/notify';
import { getServiceDaySlots } from '@/lib/professionals';
import { sendAppointmentTemplate } from '@/lib/whatsapp-templates';

/** Dia "YYYY-MM-DD" de hoje no fuso `tz`. */
function todayInTz(tz: string): string {
  return isoDateInTz(new Date(), tz);
}

export type CoreResult = { ok: true } | { error: string };

/**
 * Remarca um agendamento para `newStartsAt`, revalidando o slot no servidor
 * (mesmo profissional, excluindo o próprio agendamento da colisão) e mantendo as
 * regras de status. Zera `reminderSentAt` e dispara webhook + template ao cliente.
 *
 * O caller já garantiu o ownership ao descobrir o `tenantId` deste agendamento;
 * o `where: { id, tenantId }` aqui é defesa em profundidade.
 */
export async function rescheduleAppointmentCore(args: {
  appointmentId: string;
  tenantId: string;
  newStartsAt: Date;
  /** Avisar o cliente por e-mail. Default true; o painel (dono) avisa, a área do
   * cliente não (ele mesmo remarcou). */
  notifyCustomer?: boolean;
  /** Avisar o dono por e-mail. Default true; quando o próprio dono remarca, passa false. */
  notifyOwner?: boolean;
}): Promise<CoreResult> {
  const { appointmentId, tenantId, newStartsAt, notifyCustomer = true, notifyOwner = true } = args;

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: { service: true, tenant: { select: { timezone: true } } },
  });
  if (!appt) return { error: 'Agendamento não encontrado' };
  if (appt.status === 'CANCELED') {
    return { error: 'Agendamento cancelado - crie um novo em vez de remarcar' };
  }
  if (appt.status === 'COMPLETED' || appt.status === 'NO_SHOW') {
    return { error: 'Agendamento já realizado - não dá pra remarcar' };
  }

  const tz = appt.tenant.timezone;
  const newEndsAt = new Date(newStartsAt.getTime() + appt.service.durationMinutes * 60_000);

  // Janela permitida: nem no passado, nem além do horizonte de agendamento.
  const dateStr = isoDateInTz(newStartsAt, tz);
  if (dateStr < todayInTz(tz)) {
    return { error: 'Não dá pra remarcar pro passado' };
  }
  const maxDate = isoDateInTz(new Date(Date.now() + (BOOKING_HORIZON_DAYS - 1) * 86_400_000), tz);
  if (dateStr > maxDate) {
    return { error: 'Esse dia está fora do período de agendamento' };
  }

  // Revalida o slot: recalcula os horários livres do dia (excluindo o próprio
  // agendamento da colisão) e exige que o escolhido esteja entre eles. Mantém o
  // MESMO profissional - valida só contra a agenda dele.
  const slots = await getServiceDaySlots({
    tenantId,
    serviceId: appt.serviceId,
    tz,
    durationMinutes: appt.service.durationMinutes,
    dateStr,
    now: new Date(),
    professionalId: appt.professionalId,
    excludeAppointmentId: appt.id,
  });
  if (!slots.some((s) => s.startsAtIso === newStartsAt.toISOString())) {
    return { error: 'Esse horário não está disponível na agenda do profissional. Escolha outro.' };
  }

  await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      // Lembrete já foi enviado pro horário antigo - zera pra disparar de novo.
      reminderSentAt: null,
    },
  });

  // Fire-and-forget: webhook externo + template aprovado pro cliente.
  notifyAppointmentRescheduled(appt.id).catch((err) =>
    console.error('[appointment-mutations] notify reschedule failed', err),
  );
  sendAppointmentTemplate(appt.id, 'reschedule').catch((err) =>
    console.error('[appointment-mutations] template reschedule failed', err),
  );
  sendAppointmentEmails({
    appointmentId: appt.id,
    event: 'rescheduled',
    notifyCustomer,
    notifyOwner,
  }).catch((err) => console.error('[appointment-mutations] email reschedule failed', err));

  return { ok: true };
}

/**
 * Cancela um agendamento (PENDING/CONFIRMED -> CANCELED). Avisa o webhook externo
 * sempre; o template ao cliente é opcional (`notifyClient`, default true) - some
 * quando o cancelamento faz parte de uma remarcação. Retorna `true` se mudou.
 */
export async function cancelAppointmentCore(args: {
  appointmentId: string;
  tenantId: string;
  notifyClient?: boolean;
  /** Avisar o dono por e-mail. Default true; quando o próprio dono cancela, passa false. */
  notifyOwner?: boolean;
}): Promise<boolean> {
  const { appointmentId, tenantId, notifyClient = true, notifyOwner = true } = args;
  const result = await prisma.appointment.updateMany({
    where: { id: appointmentId, tenantId },
    data: { status: 'CANCELED' },
  });
  if (result.count === 0) return false;

  notifyAppointmentCanceled(appointmentId).catch((err) =>
    console.error('[appointment-mutations] notify cancel failed', err),
  );
  if (notifyClient) {
    sendAppointmentTemplate(appointmentId, 'cancel').catch((err) =>
      console.error('[appointment-mutations] template cancel failed', err),
    );
  }
  sendAppointmentEmails({
    appointmentId,
    event: 'canceled',
    notifyCustomer: notifyClient,
    notifyOwner,
  }).catch((err) => console.error('[appointment-mutations] email cancel failed', err));
  return true;
}

/**
 * Cancela TODAS as ocorrências futuras (PENDING/CONFIRMED) de uma série. Não toca
 * em ocorrências passadas/realizadas. Notifica o cliente uma única vez. Retorna a
 * quantidade cancelada.
 */
export async function cancelSeriesCore(args: {
  seriesId: string;
  tenantId: string;
  notifyClient?: boolean;
  notifyOwner?: boolean;
}): Promise<number> {
  const { seriesId, tenantId, notifyClient = true, notifyOwner = true } = args;
  const now = new Date();
  const futures = await prisma.appointment.findMany({
    where: {
      tenantId,
      seriesId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: now },
    },
    select: { id: true },
    orderBy: { startsAt: 'asc' },
  });
  if (futures.length === 0) return 0;

  await prisma.appointment.updateMany({
    where: {
      tenantId,
      seriesId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: now },
    },
    data: { status: 'CANCELED' },
  });

  notifyAppointmentCanceled(futures[0].id).catch((err) =>
    console.error('[appointment-mutations] notify cancel (series) failed', err),
  );
  if (notifyClient) {
    sendAppointmentTemplate(futures[0].id, 'cancel').catch((err) =>
      console.error('[appointment-mutations] template cancel (series) failed', err),
    );
  }
  sendAppointmentEmails({
    appointmentId: futures[0].id,
    event: 'canceled',
    notifyCustomer: notifyClient,
    notifyOwner,
  }).catch((err) => console.error('[appointment-mutations] email cancel (series) failed', err));
  return futures.length;
}

export type CreateBookingResult = { appointmentId: string } | { error: string };

/**
 * Cria um agendamento AVULSO já com profissional/contato resolvidos. Faz a checagem
 * final de conflito (defesa contra corrida) por profissional, cria o Appointment e
 * dispara o webhook de criação. O caller resolve antes: contato (upsert/claim),
 * profissional (resolveBookingProfessional) e anti-spam.
 */
export async function createBookingCore(args: {
  tenantId: string;
  contactId: string;
  serviceId: string;
  professionalId: string;
  startsAt: Date;
  durationMinutes: number;
  status: AppointmentStatus;
  /** Avisar o dono por e-mail (novo agendamento). Default true; criação manual pelo
   * próprio dono passa false. O cliente é sempre avisado. */
  notifyOwner?: boolean;
}): Promise<CreateBookingResult> {
  const {
    tenantId,
    contactId,
    serviceId,
    professionalId,
    startsAt,
    durationMinutes,
    status,
    notifyOwner = true,
  } = args;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  // Re-checa conflito imediatamente antes de criar (corrida) - por profissional.
  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId,
      professionalId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
    },
  });
  if (conflict) {
    return { error: 'Esse horário acabou de ser preenchido. Escolha outro.' };
  }

  const appointment = await prisma.appointment.create({
    data: { tenantId, contactId, serviceId, professionalId, startsAt, endsAt, status },
  });

  notifyAppointmentCreated(appointment.id).catch((err) =>
    console.error('[appointment-mutations] notify create failed', err),
  );
  sendAppointmentEmails({
    appointmentId: appointment.id,
    event: status === 'CONFIRMED' ? 'confirmed' : 'created',
    notifyOwner,
  }).catch((err) => console.error('[appointment-mutations] email create failed', err));

  return { appointmentId: appointment.id };
}
