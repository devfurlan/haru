'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { prisma, type AppointmentStatus } from '@haru/database';

import { createAppointmentSeries } from '@/lib/appointment-series';
import { type AvailableSlot, computeAvailableSlots, localWallTimeToUtc } from '@/lib/availability';
import { isAdmin, requireUserAndTenant } from '@/lib/auth';
import { BOOKING_HORIZON_DAYS, isoDateInTz } from '@/lib/booking-days';
import { normalizePhoneBR } from '@/lib/format';
import {
  notifyAppointmentCanceled,
  notifyAppointmentCreated,
  notifyAppointmentRescheduled,
} from '@/lib/notify';
import { sendAppointmentTemplate } from '@/lib/whatsapp-templates';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Dia "YYYY-MM-DD" de hoje no fuso `tz` (en-CA já entrega ISO). */
function todayInTz(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Dia "YYYY-MM-DD" de um instante UTC, lido no fuso `tz`. */
function dateStrInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Horários livres pra um serviço num dia, no painel (operador logado). Mesma
 * lógica do agendamento público (`computeAvailableSlots`): só slots alinhados à
 * grade, dentro do expediente (ScheduleBlock) e sem colisão com agendamento ativo.
 *
 * `excludeAppointmentId` exclui um agendamento da checagem de colisão — usado na
 * remarcação, pra que o próprio horário atual do agendamento não se conte como
 * "ocupado" e suma da lista de opções.
 */
export async function getTenantAvailableSlots(
  serviceId: string,
  dateStr: string,
  excludeAppointmentId?: string,
): Promise<AvailableSlot[]> {
  if (!DATE_RE.test(dateStr)) return [];

  const { tenant } = await requireUserAndTenant();

  // Janela permitida: nem no passado, nem além do horizonte de agendamento.
  if (dateStr < todayInTz(tenant.timezone)) return [];
  const maxDate = isoDateInTz(
    new Date(Date.now() + (BOOKING_HORIZON_DAYS - 1) * 86_400_000),
    tenant.timezone,
  );
  if (dateStr > maxDate) return [];

  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId: tenant.id, active: true },
    select: { durationMinutes: true },
  });
  if (!service) return [];

  const blocks = await prisma.scheduleBlock.findMany({
    where: { tenantId: tenant.id },
    select: { weekday: true, startMinute: true, endMinute: true },
  });

  // Agendamentos ativos que tocam a janela [00:00, 24:00) local do dia.
  const dayStart = localWallTimeToUtc(dateStr, 0, tenant.timezone);
  const dayEnd = localWallTimeToUtc(dateStr, 24 * 60, tenant.timezone);
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId: tenant.id,
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      status: { in: ['PENDING', 'CONFIRMED'] },
      AND: [{ startsAt: { lt: dayEnd } }, { endsAt: { gt: dayStart } }],
    },
    select: { startsAt: true, endsAt: true },
  });

  // Bloqueios pontuais da agenda que tocam a janela do dia.
  const exceptions = await prisma.scheduleException.findMany({
    where: {
      tenantId: tenant.id,
      AND: [{ startsAt: { lt: dayEnd } }, { endsAt: { gt: dayStart } }],
    },
    select: { startsAt: true, endsAt: true },
  });

  return computeAvailableSlots({
    tz: tenant.timezone,
    dateStr,
    durationMinutes: service.durationMinutes,
    blocks,
    appointments,
    exceptions,
    now: new Date(),
  });
}

async function changeStatus(appointmentId: string, status: AppointmentStatus): Promise<boolean> {
  const { tenant } = await requireUserAndTenant();
  const result = await prisma.appointment.updateMany({
    where: { id: appointmentId, tenantId: tenant.id },
    data: { status },
  });
  revalidatePath('/appointments');
  revalidatePath('/dashboard');
  // A tela de detalhe do cliente também lista esses agendamentos.
  revalidatePath('/clients/[id]', 'page');
  return result.count > 0;
}

export async function confirmAppointment(appointmentId: string) {
  await changeStatus(appointmentId, 'CONFIRMED');
}

export async function cancelAppointment(appointmentId: string) {
  const changed = await changeStatus(appointmentId, 'CANCELED');
  if (changed) {
    // Fire-and-forget: avisa o webhook externo (Discord/Slack/etc.)
    notifyAppointmentCanceled(appointmentId).catch((err) =>
      console.error('[appointments] notify cancel failed', err),
    );
    // Fire-and-forget: manda template aprovado pro cliente (se configurado).
    // Funciona fora da janela de 24h da Meta.
    sendAppointmentTemplate(appointmentId, 'cancel').catch((err) =>
      console.error('[appointments] template cancel failed', err),
    );
  }
}

export async function completeAppointment(appointmentId: string) {
  await changeStatus(appointmentId, 'COMPLETED');
}

export async function markNoShow(appointmentId: string) {
  await changeStatus(appointmentId, 'NO_SHOW');
}

/**
 * Cancela TODAS as ocorrências futuras (PENDING/CONFIRMED) de uma série recorrente.
 * Não toca em ocorrências já passadas/realizadas. Notifica o cliente uma única vez
 * (não N) — é o mesmo contato em todas as ocorrências.
 */
export async function cancelAppointmentSeries(seriesId: string) {
  const { tenant } = await requireUserAndTenant();
  const now = new Date();
  const futures = await prisma.appointment.findMany({
    where: {
      tenantId: tenant.id,
      seriesId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: now },
    },
    select: { id: true },
    orderBy: { startsAt: 'asc' },
  });
  if (futures.length === 0) return;

  await prisma.appointment.updateMany({
    where: {
      tenantId: tenant.id,
      seriesId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: now },
    },
    data: { status: 'CANCELED' },
  });

  revalidatePath('/appointments');
  revalidatePath('/dashboard');
  revalidatePath('/clients/[id]', 'page');

  notifyAppointmentCanceled(futures[0].id).catch((err) =>
    console.error('[appointments] notify cancel (series) failed', err),
  );
  sendAppointmentTemplate(futures[0].id, 'cancel').catch((err) =>
    console.error('[appointments] template cancel (series) failed', err),
  );
}

const createSchema = z.object({
  serviceId: z.string().min(1, 'Selecione um serviço'),
  contactPhone: z
    .string()
    .min(8, 'Telefone obrigatório')
    // Normaliza pra E.164 (mesmo formato do banco/bot) — senão o agendamento manual
    // cria um contato divergente que o bot nunca reencontra.
    .transform(normalizePhoneBR)
    .refine((v) => /^55\d{10,11}$/.test(v), { message: 'Telefone inválido — use DDD + número' }),
  contactName: z
    .string()
    .max(80)
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  // Fluxo normal: ISO UTC do slot escolhido na grade.
  startsAtIso: z.string().optional(),
  // Encaixe (admin): data+hora crus no fuso do tenant, sem validação de agenda.
  encaixe: z.literal('on').optional(),
  encaixeDate: z.string().optional(),
  encaixeTime: z.string().optional(),
  // Recorrência (opcional). 'NONE'/ausente = agendamento avulso.
  frequency: z.enum(['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']).default('NONE'),
  occurrences: z.coerce.number().int().min(2).max(12).optional(),
});

export type CreateAppointmentResult =
  | { error: string }
  | { ok: true; createdCount: number; skipped: string[]; beyondHorizon: number }
  | undefined;

export async function createManualAppointment(
  _prev: CreateAppointmentResult,
  formData: FormData,
): Promise<CreateAppointmentResult> {
  const user = await requireUserAndTenant();
  const { tenant } = user;

  const parsed = createSchema.safeParse({
    serviceId: formData.get('serviceId'),
    contactPhone: formData.get('contactPhone'),
    contactName: formData.get('contactName'),
    startsAtIso: formData.get('startsAtIso'),
    encaixe: formData.get('encaixe') ?? undefined,
    encaixeDate: formData.get('encaixeDate') ?? undefined,
    encaixeTime: formData.get('encaixeTime') ?? undefined,
    frequency: formData.get('frequency') ?? 'NONE',
    occurrences: formData.get('occurrences') ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  // Encaixe libera as 24h e a sobreposição de agendamentos — é exclusivo do admin.
  // O toggle some da UI pra STAFF, mas a checagem TEM que ser no servidor: STAFF
  // poderia forjar o formData.
  const encaixe = parsed.data.encaixe === 'on';
  if (encaixe && !isAdmin(user)) {
    return { error: 'Encaixe é exclusivo do administrador.' };
  }

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, tenantId: tenant.id, active: true },
  });
  if (!service) return { error: 'Serviço não encontrado' };

  // Resolve o início. No encaixe vem data+hora crus, convertidos do fuso do tenant
  // pra UTC no servidor (sem trava de passado). No fluxo normal vem o ISO UTC do
  // slot escolhido na grade.
  let startsAt: Date;
  if (encaixe) {
    const d = parsed.data.encaixeDate ?? '';
    const t = parsed.data.encaixeTime ?? '';
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(t);
    if (!DATE_RE.test(d) || !timeMatch) {
      return { error: 'Informe a data e a hora do encaixe' };
    }
    const hh = Number(timeMatch[1]);
    const mm = Number(timeMatch[2]);
    if (hh > 23 || mm > 59) return { error: 'Hora inválida' };
    startsAt = localWallTimeToUtc(d, hh * 60 + mm, tenant.timezone);
  } else {
    const iso = parsed.data.startsAtIso ?? '';
    startsAt = new Date(iso);
    if (!iso || Number.isNaN(startsAt.getTime())) {
      return { error: 'Selecione data/hora' };
    }
    if (startsAt <= new Date()) {
      return { error: 'Não dá pra agendar no passado' };
    }
  }

  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

  // Fluxo normal revalida o slot no servidor: recalcula os horários livres do dia
  // e exige que o escolhido esteja entre eles (expediente + grade + sem-colisão),
  // sem confiar no client. No encaixe esse passo é DELIBERADAMENTE pulado — é o
  // bypass total da agenda pedido pelo admin.
  if (!encaixe) {
    const dateStr = dateStrInTz(startsAt, tenant.timezone);
    const slots = await getTenantAvailableSlots(service.id, dateStr);
    const slotOk = slots.some((s) => s.startsAtIso === startsAt.toISOString());
    if (!slotOk) {
      return { error: 'Esse horário não está disponível na sua agenda. Escolha outro.' };
    }
  }

  // Upsert do contato — não cria Conversation (não faz sentido sem mensagens)
  const contact = await prisma.contact.upsert({
    where: {
      tenantId_phone: { tenantId: tenant.id, phone: parsed.data.contactPhone },
    },
    update: parsed.data.contactName ? { name: parsed.data.contactName } : {},
    create: {
      tenantId: tenant.id,
      phone: parsed.data.contactPhone,
      name: parsed.data.contactName,
    },
  });

  const frequency = parsed.data.frequency;

  // --- Agendamento recorrente: cria a série (pula ocorrências ocupadas/fora do
  // expediente e avisa). Não redireciona — volta um resumo pra UI mostrar.
  // Encaixe é sempre avulso: a série pularia justamente os horários ocupados/fora
  // do expediente que o encaixe existe pra forçar, então não faz sentido combinar.
  if (!encaixe && frequency !== 'NONE') {
    if (!parsed.data.occurrences) {
      return { error: 'Escolha quantas vezes o agendamento se repete' };
    }
    const blocks = await prisma.scheduleBlock.findMany({
      where: { tenantId: tenant.id },
      select: { weekday: true, startMinute: true, endMinute: true },
    });
    const result = await createAppointmentSeries({
      tenantId: tenant.id,
      contactId: contact.id,
      serviceId: service.id,
      durationMinutes: service.durationMinutes,
      tz: tenant.timezone,
      frequency,
      occurrences: parsed.data.occurrences,
      firstStartsAtIso: startsAt.toISOString(),
      status: 'CONFIRMED',
      blocks,
    });

    if (result.createdIds.length === 0) {
      return { error: 'Nenhum horário da série está livre. Escolha outro horário inicial.' };
    }

    // Fire-and-forget: um único webhook (1ª ocorrência) — evita N notificações.
    notifyAppointmentCreated(result.createdIds[0]).catch((err) =>
      console.error('[appointments] notify create (series) failed', err),
    );

    revalidatePath('/appointments');
    revalidatePath('/dashboard');
    return {
      ok: true,
      createdCount: result.createdIds.length,
      skipped: result.skipped,
      beyondHorizon: result.beyondHorizon,
    };
  }

  const appointment = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      contactId: contact.id,
      serviceId: service.id,
      startsAt,
      endsAt,
      status: 'CONFIRMED',
    },
  });

  // Fire-and-forget: webhook externo. (Não mandamos template pro cliente aqui:
  // walk-in não justifica notificação WhatsApp; reminder cuida do lembrete.)
  notifyAppointmentCreated(appointment.id).catch((err) =>
    console.error('[appointments] notify create failed', err),
  );

  revalidatePath('/appointments');
  revalidatePath('/dashboard');
  redirect('/appointments');
}

const TIME_RE = /^(\d{2}):(\d{2})$/;

/** Converte "HH:MM" em minutos desde a meia-noite, ou null se inválido. */
function parseTimeToMinutes(value: string): number | null {
  const m = TIME_RE.exec(value);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  return hh * 60 + mm;
}

const blockSchema = z
  .object({
    // Data inicial (e, no modo período, também a final). YYYY-MM-DD no fuso do tenant.
    startDate: z.string().regex(DATE_RE, 'Data inválida'),
    endDate: z.string().regex(DATE_RE, 'Data inválida').optional(),
    // Dia inteiro: ignora horários e bloqueia de 00:00 a 24:00.
    allDay: z.coerce.boolean().default(false),
    // Intervalo de horário (só quando não é dia inteiro). "HH:MM".
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    reason: z
      .string()
      .max(120)
      .optional()
      .transform((v) => (v && v.trim() ? v.trim() : null)),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: 'A data final não pode ser antes da inicial',
  });

export type CreateScheduleExceptionResult = { error: string } | { ok: true } | undefined;

/**
 * Cria um bloqueio pontual na agenda (folga, compromisso, férias). Três formas:
 * intervalo de horário num dia, dia inteiro, ou vários dias (allDay + endDate).
 * Recusa a criação se houver agendamento ativo (PENDING/CONFIRMED) no período —
 * o dono trata os agendamentos antes.
 */
export async function createScheduleException(
  _prev: CreateScheduleExceptionResult,
  formData: FormData,
): Promise<CreateScheduleExceptionResult> {
  const { tenant } = await requireUserAndTenant();
  const tz = tenant.timezone;

  const parsed = blockSchema.safeParse({
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate') ?? undefined,
    allDay: formData.get('allDay') ?? false,
    startTime: formData.get('startTime') ?? undefined,
    endTime: formData.get('endTime') ?? undefined,
    reason: formData.get('reason') ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const { startDate, endDate, allDay, reason } = parsed.data;

  let startsAt: Date;
  let endsAt: Date;
  if (allDay) {
    // 00:00 do primeiro dia → 00:00 do dia seguinte ao último (fim exclusivo).
    startsAt = localWallTimeToUtc(startDate, 0, tz);
    const lastDate = endDate ?? startDate;
    endsAt = new Date(localWallTimeToUtc(lastDate, 0, tz).getTime() + 24 * 60 * 60_000);
  } else {
    const startMin = parseTimeToMinutes(parsed.data.startTime ?? '');
    const endMin = parseTimeToMinutes(parsed.data.endTime ?? '');
    if (startMin === null || endMin === null) {
      return { error: 'Informe o horário de início e fim' };
    }
    if (endMin <= startMin) {
      return { error: 'O horário final tem que ser depois do inicial' };
    }
    startsAt = localWallTimeToUtc(startDate, startMin, tz);
    endsAt = localWallTimeToUtc(startDate, endMin, tz);
  }

  // Conflito: barra a criação se houver agendamento ativo dentro do período.
  const conflicts = await prisma.appointment.count({
    where: {
      tenantId: tenant.id,
      status: { in: ['PENDING', 'CONFIRMED'] },
      AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
    },
  });
  if (conflicts > 0) {
    return {
      error: `Existe${conflicts > 1 ? 'm' : ''} ${conflicts} agendamento${
        conflicts > 1 ? 's' : ''
      } nesse período. Remarque ou cancele antes de bloquear.`,
    };
  }

  await prisma.scheduleException.create({
    data: { tenantId: tenant.id, startsAt, endsAt, reason },
  });

  revalidatePath('/appointments');
  revalidatePath('/dashboard');
  return { ok: true };
}

/** Remove um bloqueio da agenda (escopado ao tenant do usuário). */
export async function deleteScheduleException(id: string) {
  const { tenant } = await requireUserAndTenant();
  await prisma.scheduleException.deleteMany({
    where: { id, tenantId: tenant.id },
  });
  revalidatePath('/appointments');
  revalidatePath('/dashboard');
}

const rescheduleSchema = z.object({
  newStartsAtIso: z
    .string()
    .min(1, 'Selecione data/hora')
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), { message: 'Data inválida' })
    .refine((d) => d > new Date(), { message: 'Não dá pra remarcar pro passado' }),
});

export type RescheduleResult = { error: string } | undefined;

export async function rescheduleAppointment(
  appointmentId: string,
  _prev: RescheduleResult,
  formData: FormData,
): Promise<RescheduleResult> {
  const { tenant } = await requireUserAndTenant();

  const parsed = rescheduleSchema.safeParse({
    newStartsAtIso: formData.get('newStartsAtIso'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId: tenant.id },
    include: { service: true },
  });
  if (!appt) return { error: 'Agendamento não encontrado' };
  if (appt.status === 'CANCELED') {
    return { error: 'Agendamento cancelado — crie um novo em vez de remarcar' };
  }
  if (appt.status === 'COMPLETED' || appt.status === 'NO_SHOW') {
    return { error: 'Agendamento já realizado — não dá pra remarcar' };
  }

  const newStartsAt = parsed.data.newStartsAtIso;
  const newEndsAt = new Date(newStartsAt.getTime() + appt.service.durationMinutes * 60_000);

  // Revalida o slot no servidor: recalcula os horários livres do dia (excluindo o
  // próprio agendamento da checagem de colisão) e exige que o escolhido esteja
  // entre eles. Garante de uma vez expediente + grade + sem-colisão, sem confiar
  // no que o client enviou.
  const dateStr = dateStrInTz(newStartsAt, tenant.timezone);
  const slots = await getTenantAvailableSlots(appt.serviceId, dateStr, appt.id);
  const slotOk = slots.some((s) => s.startsAtIso === newStartsAt.toISOString());
  if (!slotOk) {
    return { error: 'Esse horário não está disponível na sua agenda. Escolha outro.' };
  }

  await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      startsAt: newStartsAt,
      endsAt: newEndsAt,
      // Lembrete já foi enviado pro horário antigo — zera pra disparar de novo.
      reminderSentAt: null,
    },
  });

  // Fire-and-forget: webhook externo + template aprovado pro cliente
  notifyAppointmentRescheduled(appt.id).catch((err) =>
    console.error('[appointments] notify reschedule failed', err),
  );
  sendAppointmentTemplate(appt.id, 'reschedule').catch((err) =>
    console.error('[appointments] template reschedule failed', err),
  );

  revalidatePath('/appointments');
  revalidatePath('/dashboard');
  redirect('/appointments');
}
