// Booking público (agendar do zero num tenant) para o app mobile. Espelha o caminho
// AVULSO de createPublicBooking / getAvailableSlots em app/[slug]/actions.ts (que são
// 'use server' e acoplados a FormData/cookies). Aqui é lib pura, importável pelos route
// handlers. Se mudar a regra de booking no web, refletir aqui (e vice-versa).

import { type AppointmentStatus, type CustomerAccount, prisma } from '@haru/database';

import {
  BOOKING_HORIZON_DAYS,
  isoDateInTz,
  localWallTimeToUtc,
  normalizePhoneBR,
  type AvailableSlotWithProfessionals,
} from '@haru/shared';

import { loadPublicTenant } from '@/app/[slug]/_tenant';
import { createBookingCore } from '@/lib/appointment-mutations';
import { getServiceDaySlots, resolveBookingProfessional } from '@/lib/professionals';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^55\d{10,11}$/;

export type PublicTenantData = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  logoUrl: string | null;
  publicBookingEnabled: boolean;
  /** Até quantos dias adiante o agendamento é oferecido. */
  horizonDays: number;
  /** Dias-da-semana com expediente (0=dom..6=sáb), pro carrossel de datas. */
  openWeekdays: number[];
  services: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceCents: number;
    /** IDs dos profissionais que atendem este serviço. */
    professionalIds: string[];
  }[];
  professionals: { id: string; name: string | null }[];
};

/** Dados públicos do tenant pro app (serviços ativos, profissionais, dias de expediente). */
export async function getPublicTenantData(slug: string): Promise<PublicTenantData | null> {
  const tenant = await loadPublicTenant(slug);
  if (!tenant) return null;
  const openWeekdays = [...new Set(tenant.scheduleBlocks.map((b) => b.weekday))].sort(
    (a, b) => a - b,
  );
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    timezone: tenant.timezone,
    logoUrl: tenant.logoUrl,
    publicBookingEnabled: tenant.publicBookingEnabled,
    horizonDays: BOOKING_HORIZON_DAYS,
    openWeekdays,
    services: tenant.services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      professionalIds: s.professionals.map((p) => p.professionalId),
    })),
    professionals: tenant.users.map((u) => ({ id: u.id, name: u.name })),
  };
}

/** Horários livres pra um serviço num dia (mesma janela e gate do web). */
export async function getPublicSlots(
  slug: string,
  serviceId: string,
  dateStr: string,
  professionalId?: string,
): Promise<AvailableSlotWithProfessionals[]> {
  if (!DATE_RE.test(dateStr)) return [];
  const tenant = await loadPublicTenant(slug);
  if (!tenant || !tenant.publicBookingEnabled) return [];
  if (dateStr < isoDateInTz(new Date(), tenant.timezone)) return [];
  const maxDate = isoDateInTz(
    new Date(Date.now() + (BOOKING_HORIZON_DAYS - 1) * 86_400_000),
    tenant.timezone,
  );
  if (dateStr > maxDate) return [];
  const service = tenant.services.find((s) => s.id === serviceId && s.active);
  if (!service) return [];
  return getServiceDaySlots({
    tenantId: tenant.id,
    serviceId,
    tz: tenant.timezone,
    durationMinutes: service.durationMinutes,
    dateStr,
    now: new Date(),
    professionalId: professionalId || undefined,
    includeBusy: true, // app mostra horários ocupados riscados (design 10)
  });
}

export type PublicBookingResult =
  | { error: string }
  | {
      ok: true;
      status: AppointmentStatus;
      summary: string;
      appointmentId: string;
      paymentAvailable: boolean;
    };

/**
 * Cria um agendamento avulso a partir do app. Revalida o slot no servidor, resolve o
 * profissional, aplica o anti-spam por telefone/dia e faz o upsert do contato. Se
 * `account` estiver logado e com o MESMO telefone verificado, vincula o contato à conta.
 */
export async function createSinglePublicBooking(input: {
  slug: string;
  serviceId: string;
  professionalId?: string;
  startsAt: Date;
  name: string;
  phone: string;
  account: CustomerAccount | null;
}): Promise<PublicBookingResult> {
  const tenant = await loadPublicTenant(input.slug);
  if (!tenant || !tenant.publicBookingEnabled) {
    return { error: 'Agendamento online indisponível no momento' };
  }
  const service = tenant.services.find((s) => s.id === input.serviceId && s.active);
  if (!service) return { error: 'Serviço não encontrado' };

  const name = input.name.trim();
  if (name.length < 2) return { error: 'Informe seu nome' };
  const phone = normalizePhoneBR(input.phone);
  if (!PHONE_RE.test(phone)) return { error: 'WhatsApp inválido - confira o DDD' };

  const startsAt = input.startsAt;
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    return { error: 'Esse horário já passou' };
  }
  const dateStr = isoDateInTz(startsAt, tenant.timezone);

  const resolved = await resolveBookingProfessional({
    tenantId: tenant.id,
    serviceId: service.id,
    tz: tenant.timezone,
    durationMinutes: service.durationMinutes,
    startsAt,
    dateStr,
    now: new Date(),
    requestedProfessionalId: input.professionalId,
  });
  if (!resolved.ok) return { error: resolved.reason };
  const professionalId = resolved.professionalId;

  // Anti-spam leve: um mesmo telefone não acumula vários pedidos ativos no mesmo dia.
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

  // Upsert do contato preservando profileCompletedAt (gate do bot).
  const existing = await prisma.contact.findUnique({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
    select: { profileCompletedAt: true },
  });
  const contact = await prisma.contact.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone } },
    update: { name, profileCompletedAt: existing?.profileCompletedAt ?? new Date() },
    create: { tenantId: tenant.id, phone, name, profileCompletedAt: new Date() },
  });

  // Cliente logado agendando com o PRÓPRIO número verificado: vincula o contato à conta.
  if (input.account && input.account.phone === phone) {
    await prisma.contact.updateMany({
      where: { id: contact.id, customerAccountId: null },
      data: { customerAccountId: input.account.id },
    });
  }

  const status = tenant.publicBookingConfirmation as unknown as AppointmentStatus;
  const created = await createBookingCore({
    tenantId: tenant.id,
    contactId: contact.id,
    serviceId: service.id,
    professionalId,
    startsAt,
    durationMinutes: service.durationMinutes,
    status,
  });
  if ('error' in created) return { error: created.error };

  const when = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tenant.timezone,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(startsAt);
  const paymentAvailable = service.priceCents > 0 && tenant.paymentProvider !== null;

  return {
    ok: true,
    status,
    summary: `${service.name} · ${when}`,
    appointmentId: created.appointmentId,
    paymentAvailable,
  };
}
