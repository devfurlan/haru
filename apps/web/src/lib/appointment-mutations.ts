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
import { insertAppointmentGuarded } from '@/lib/appointment-insert';
import { notifyCreditsLowIfNeeded } from '@/lib/comms/subscription-events';
import { refundMembershipCredit } from '@/lib/memberships/credit-core';
import { resolveCoveredMembership } from '@/lib/memberships/credits';
import { BOOKING_HORIZON_DAYS, isoDateInTz } from '@haru/shared';
import {
  notifyAppointmentCanceled,
  notifyAppointmentCreated,
  notifyAppointmentRescheduled,
} from '@/lib/notify';
import { getServiceDaySlots } from '@/lib/professionals';
import { isSlotFrozenByWaitlist, triggerWaitlistMatch } from '@/lib/waitlist';
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

  // Não remarca por cima de um slot reservado pela fila de espera.
  if (await isSlotFrozenByWaitlist(tenantId, appt.professionalId, dateStr, new Date())) {
    return { error: 'Esse horário está reservado por instantes pela fila de espera. Tente já já.' };
  }

  // Horário ANTIGO que vai vagar (captura antes do update).
  const freedStartsAt = appt.startsAt;

  await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      // Lembretes já enviados pro horário antigo - zera pra disparar de novo no novo
      // horário (WhatsApp e push; o e-mail mantém o comportamento atual do código).
      reminderSentAt: null,
      reminderPushSentAt: null,
      // Atendimento moveu: re-arma o convite de avaliação pro novo horário.
      reviewInviteSentAt: null,
    },
  });

  // Slot antigo liberado (só se era futuro): dispara o match da fila. Fire-and-forget.
  if (freedStartsAt > new Date()) {
    triggerWaitlistMatch({
      tenantId,
      professionalId: appt.professionalId,
      freedDate: isoDateInTz(freedStartsAt, tz),
      now: new Date(),
    }).catch((err) =>
      console.error('[appointment-mutations] waitlist match (reschedule) failed', err),
    );
  }

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
  // Carrega antes de cancelar (professional/horário do slot que vai vagar) - o updateMany
  // não devolve esses campos.
  const freed = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    select: {
      professionalId: true,
      startsAt: true,
      status: true,
      tenant: { select: { timezone: true } },
    },
  });
  const result = await prisma.appointment.updateMany({
    where: { id: appointmentId, tenantId },
    data: { status: 'CANCELED' },
  });
  if (result.count === 0) return false;

  // Estorna o crédito de assinatura (se era coberto e o débito foi no ciclo vigente).
  // Idempotente e fail-soft: o cancelamento nunca trava por causa do estorno.
  await refundMembershipCredit(appointmentId).catch((err) =>
    console.error('[appointment-mutations] refund credit (cancel) failed', err),
  );

  // Slot liberado (só se era ativo e é futuro): dispara o match da fila. Fire-and-forget.
  if (
    freed &&
    (freed.status === 'PENDING' || freed.status === 'CONFIRMED') &&
    freed.startsAt > new Date()
  ) {
    triggerWaitlistMatch({
      tenantId,
      professionalId: freed.professionalId,
      freedDate: isoDateInTz(freed.startsAt, freed.tenant.timezone),
      now: new Date(),
    }).catch((err) => console.error('[appointment-mutations] waitlist match (cancel) failed', err));
  }

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
    select: { id: true, professionalId: true, startsAt: true },
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

  // Estorna o crédito de cada ocorrência coberta (idempotente, fail-soft).
  await Promise.all(
    futures.map((f) =>
      refundMembershipCredit(f.id).catch((err) =>
        console.error('[appointment-mutations] refund credit (series cancel) failed', err),
      ),
    ),
  );

  // Cada (profissional, dia) liberado dispara um match da fila (dedup). Fire-and-forget.
  const seriesTz = (
    await prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true } })
  )?.timezone;
  if (seriesTz) {
    const seen = new Set<string>();
    for (const f of futures) {
      const freedDate = isoDateInTz(f.startsAt, seriesTz);
      const key = `${f.professionalId}|${freedDate}`;
      if (seen.has(key)) continue;
      seen.add(key);
      triggerWaitlistMatch({
        tenantId,
        professionalId: f.professionalId,
        freedDate,
        now: new Date(),
      }).catch((err) =>
        console.error('[appointment-mutations] waitlist match (series cancel) failed', err),
      );
    }
  }

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

export type CreateBookingResult =
  | { appointmentId: string; coveredBySubscription: boolean }
  | { error: string };

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
  /** Marca o agendamento como recuperado pela fila de espera (métrica de receita). */
  fromWaitlist?: boolean;
  /** Presente = confirmação de fila; pula a guarda de reserva (o slot é DESTE episódio). */
  waitlistOfferId?: string;
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
    fromWaitlist = false,
    waitlistOfferId,
  } = args;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  // Reserva da fila: o fluxo normal não marca por cima de um slot congelado por um episódio
  // ativo. A confirmação da própria fila (waitlistOfferId) escapa - o slot é dela.
  if (!waitlistOfferId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    });
    if (tenant) {
      const dateStr = isoDateInTz(startsAt, tenant.timezone);
      if (await isSlotFrozenByWaitlist(tenantId, professionalId, dateStr, new Date())) {
        return {
          error: 'Esse horário está reservado por instantes pela fila de espera. Tente já já.',
        };
      }
    }
  }

  // Cobertura por assinatura de serviços: se o cliente tem crédito pra ESTE serviço, o insert
  // desconta 1 crédito na MESMA transação (guarda de concorrência própria) e o agendamento não
  // gera cobrança. Fail-soft: erro ao resolver nunca bloqueia o booking (cai pra avulso).
  let credit: { membershipId: string; creditCost: number } | undefined;
  try {
    credit = (await resolveCoveredMembership(tenantId, contactId, serviceId)) ?? undefined;
  } catch (err) {
    console.error('[appointment-mutations] resolveCoveredMembership failed', err);
  }

  // Cria sob guarda de corrida (advisory lock por profissional+horário dentro da transação):
  // duas confirmações concorrentes do mesmo slot não geram double-booking. Substitui o antigo
  // findFirst+create não-atômico (a constraint EXCLUDE de banco foi removida por causa do
  // Encaixe - ver appointment-insert.ts).
  const inserted = await insertAppointmentGuarded({
    tenantId,
    contactId,
    serviceId,
    professionalId,
    startsAt,
    endsAt,
    status,
    fromWaitlist,
    credit,
  });
  if ('conflict' in inserted) {
    return { error: 'Esse horário acabou de ser preenchido. Escolha outro.' };
  }
  const appointment = { id: inserted.appointmentId };

  // Consumiu crédito e o saldo ficou baixo: avisa "créditos acabando" (dedup por ciclo).
  if (inserted.coveredBySubscription && credit) {
    notifyCreditsLowIfNeeded(credit.membershipId).catch((err) =>
      console.error('[appointment-mutations] notify credits low failed', err),
    );
  }

  notifyAppointmentCreated(appointment.id).catch((err) =>
    console.error('[appointment-mutations] notify create failed', err),
  );
  sendAppointmentEmails({
    appointmentId: appointment.id,
    event: status === 'CONFIRMED' ? 'confirmed' : 'created',
    notifyOwner,
  }).catch((err) => console.error('[appointment-mutations] email create failed', err));

  return {
    appointmentId: appointment.id,
    coveredBySubscription: inserted.coveredBySubscription,
  };
}
