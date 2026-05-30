'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { type AppointmentStatus, prisma } from '@haru/database';

import {
  type AvailableSlot,
  computeAvailableSlots,
  localWallTimeToUtc,
} from '@/lib/availability';
import { notifyAppointmentCreated } from '@/lib/notify';

import { loadPublicTenant } from './_tenant';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Dia "YYYY-MM-DD" de hoje no fuso `tz` (pra rejeitar datas no passado). */
function todayInTz(tz: string): string {
  // en-CA dá direto o formato ISO YYYY-MM-DD.
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
 * Horários livres pra um serviço num dia — chamado sob demanda pelo client quando
 * o cliente escolhe serviço + dia. Rota pública: NÃO usa requireUserAndTenant.
 */
export async function getAvailableSlots(
  slug: string,
  serviceId: string,
  dateStr: string,
): Promise<AvailableSlot[]> {
  if (!DATE_RE.test(dateStr)) return [];

  const tenant = await loadPublicTenant(slug);
  if (!tenant || !tenant.publicBookingEnabled) return [];

  // Não oferece dias passados.
  if (dateStr < todayInTz(tenant.timezone)) return [];

  const service = tenant.services.find((s) => s.id === serviceId && s.active);
  if (!service) return [];

  // Agendamentos ativos que tocam a janela [00:00, 24:00) local do dia.
  const dayStart = localWallTimeToUtc(dateStr, 0, tenant.timezone);
  const dayEnd = localWallTimeToUtc(dateStr, 24 * 60, tenant.timezone);
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId: tenant.id,
      status: { in: ['PENDING', 'CONFIRMED'] },
      AND: [{ startsAt: { lt: dayEnd } }, { endsAt: { gt: dayStart } }],
    },
    select: { startsAt: true, endsAt: true },
  });

  return computeAvailableSlots({
    tz: tenant.timezone,
    dateStr,
    durationMinutes: service.durationMinutes,
    blocks: tenant.scheduleBlocks,
    appointments,
    now: new Date(),
  });
}

const bookingSchema = z.object({
  slug: z.string().min(1),
  serviceId: z.string().min(1, 'Selecione um serviço'),
  slotIso: z
    .string()
    .min(1, 'Selecione um horário')
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), { message: 'Horário inválido' })
    .refine((d) => d > new Date(), { message: 'Esse horário já passou' }),
  name: z
    .string()
    .min(2, 'Informe seu nome')
    .max(80, 'Nome muito longo')
    .transform((v) => v.trim()),
  phone: z
    .string()
    .min(8, 'Informe seu WhatsApp')
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => /^\d{10,15}$/.test(v), { message: 'WhatsApp inválido — confira o DDD' }),
});

export type CreatePublicBookingResult =
  | { error: string }
  | { ok: true; status: AppointmentStatus; summary: string }
  | undefined;

/**
 * Cria um agendamento a partir do formulário público. Rota pública (sem auth):
 * toda a confiança vem da revalidação server-side — o slot é recalculado e o
 * conflito re-checado, então não confiamos no que o client mandou.
 */
export async function createPublicBooking(
  _prev: CreatePublicBookingResult,
  formData: FormData,
): Promise<CreatePublicBookingResult> {
  const parsed = bookingSchema.safeParse({
    slug: formData.get('slug'),
    serviceId: formData.get('serviceId'),
    slotIso: formData.get('slotIso'),
    name: formData.get('name'),
    phone: formData.get('phone'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }
  const { slug, serviceId, slotIso, name, phone } = parsed.data;

  const tenant = await loadPublicTenant(slug);
  if (!tenant || !tenant.publicBookingEnabled) {
    return { error: 'Agendamento online indisponível no momento' };
  }

  const service = tenant.services.find((s) => s.id === serviceId && s.active);
  if (!service) return { error: 'Serviço não encontrado' };

  const startsAt = slotIso;
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

  // Revalida o slot no servidor: deriva o dia no fuso do tenant e exige que o
  // horário escolhido esteja entre os slots livres calculados. Isso garante,
  // de uma vez, que o horário cai no expediente, está alinhado à grade e não
  // colide — sem confiar no que o client enviou.
  const dateStr = dateStrInTz(startsAt, tenant.timezone);
  const slots = await getAvailableSlots(slug, serviceId, dateStr);
  const slotOk = slots.some((s) => s.startsAtIso === startsAt.toISOString());
  if (!slotOk) {
    return { error: 'Esse horário não está mais disponível. Escolha outro.' };
  }

  // Mitigação leve de spam: um mesmo telefone não acumula vários pedidos ativos
  // no mesmo dia (sem rate-limit por IP, que exigiria Redis).
  const sameDayStart = localWallTimeToUtc(dateStr, 0, tenant.timezone);
  const sameDayEnd = localWallTimeToUtc(dateStr, 24 * 60, tenant.timezone);
  const existingSameDay = await prisma.appointment.findFirst({
    where: {
      tenantId: tenant.id,
      contact: { phone },
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: sameDayStart, lt: sameDayEnd },
    },
  });
  if (existingSameDay) {
    return { error: 'Você já tem um agendamento ativo nesse dia. Fale conosco pra ajustar.' };
  }

  // Re-checa conflito imediatamente antes de criar (defesa extra contra corrida).
  const conflict = await prisma.appointment.findFirst({
    where: {
      tenantId: tenant.id,
      status: { in: ['PENDING', 'CONFIRMED'] },
      AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
    },
  });
  if (conflict) {
    return { error: 'Esse horário acabou de ser preenchido. Escolha outro.' };
  }

  // Upsert do contato preservando profileCompletedAt já existente (gate do bot).
  const existing = await prisma.contact.findUnique({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
    select: { profileCompletedAt: true },
  });
  const contact = await prisma.contact.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
    update: { name, profileCompletedAt: existing?.profileCompletedAt ?? new Date() },
    create: { tenantId: tenant.id, phone, name, profileCompletedAt: new Date() },
  });

  // publicBookingConfirmation (PENDING|CONFIRMED) é subconjunto de AppointmentStatus.
  const status = tenant.publicBookingConfirmation as unknown as AppointmentStatus;

  const appointment = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      contactId: contact.id,
      serviceId: service.id,
      startsAt,
      endsAt,
      status,
    },
  });

  // Fire-and-forget: webhook externo (Discord/Slack/etc.) se configurado.
  notifyAppointmentCreated(appointment.id).catch((err) =>
    console.error('[public-booking] notify create failed', err),
  );

  // Revalida a página pública (e o painel, ainda que o dono possa não estar logado).
  revalidatePath(`/${slug}`);
  revalidatePath('/appointments');
  revalidatePath('/dashboard');

  const when = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tenant.timezone,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(startsAt);

  return { ok: true, status, summary: `${service.name} · ${when}` };
}
