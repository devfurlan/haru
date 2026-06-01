'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { prisma, type AppointmentStatus } from '@haru/database';

import { type AvailableSlot, computeAvailableSlots, localWallTimeToUtc } from '@/lib/availability';
import { requireUserAndTenant } from '@/lib/auth';
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

  return computeAvailableSlots({
    tz: tenant.timezone,
    dateStr,
    durationMinutes: service.durationMinutes,
    blocks,
    appointments,
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
  startsAtIso: z
    .string()
    .min(1, 'Selecione data/hora')
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), { message: 'Data inválida' })
    .refine((d) => d > new Date(), { message: 'Não dá pra agendar no passado' }),
});

export type CreateAppointmentResult = { error: string } | undefined;

export async function createManualAppointment(
  _prev: CreateAppointmentResult,
  formData: FormData,
): Promise<CreateAppointmentResult> {
  const { tenant } = await requireUserAndTenant();

  const parsed = createSchema.safeParse({
    serviceId: formData.get('serviceId'),
    contactPhone: formData.get('contactPhone'),
    contactName: formData.get('contactName'),
    startsAtIso: formData.get('startsAtIso'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, tenantId: tenant.id, active: true },
  });
  if (!service) return { error: 'Serviço não encontrado' };

  const startsAt = parsed.data.startsAtIso;
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

  // Revalida o slot no servidor: recalcula os horários livres do dia e exige que
  // o escolhido esteja entre eles. Garante, de uma vez, que cai no expediente,
  // está alinhado à grade e não colide — sem confiar no que o client enviou.
  const dateStr = dateStrInTz(startsAt, tenant.timezone);
  const slots = await getTenantAvailableSlots(service.id, dateStr);
  const slotOk = slots.some((s) => s.startsAtIso === startsAt.toISOString());
  if (!slotOk) {
    return { error: 'Esse horário não está disponível na sua agenda. Escolha outro.' };
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
