'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { prisma, type AppointmentStatus } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';
import {
  notifyAppointmentCanceled,
  notifyAppointmentCreated,
  notifyAppointmentRescheduled,
} from '@/lib/notify';
import { sendAppointmentTemplate } from '@/lib/whatsapp-templates';

async function changeStatus(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<boolean> {
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
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => /^\d{10,15}$/.test(v), { message: 'Telefone inválido (E.164)' }),
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

  // Conflito com outro agendamento ativo
  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId: tenant.id,
      status: { in: ['PENDING', 'CONFIRMED'] },
      AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
    },
  });
  if (conflict) return { error: 'Já existe outro agendamento ativo nesse horário' };

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

  // Conflito com outros ativos (exclui self)
  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId: tenant.id,
      id: { not: appt.id },
      status: { in: ['PENDING', 'CONFIRMED'] },
      AND: [{ startsAt: { lt: newEndsAt } }, { endsAt: { gt: newStartsAt } }],
    },
  });
  if (conflict) return { error: 'Outro agendamento ocupa esse horário' };

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
