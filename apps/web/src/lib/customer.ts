import { prisma } from '@haru/database';
import type { AppointmentStatus, CustomerAccount, PaymentStatus } from '@haru/database';

import { isoDateInTz } from '@haru/shared';

// Leituras da ÁREA DO CLIENTE. Cross-tenant: parte dos Contacts vinculados à conta
// (customerAccountId) e busca os agendamentos por contactId. O gate de ownership é o
// próprio `customerAccountId` - nada vem de id do client.

export interface CustomerAppointmentItem {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceActive: boolean;
  durationMinutes: number;
  priceCents: number;
  professionalName: string | null;
  /** Instante UTC; formatar sempre no `tenant.timezone`. */
  startsAt: Date;
  /** Já formatado no fuso do tenant (a UI é cross-tenant, cada item num fuso). */
  whenLabel: string;
  status: AppointmentStatus;
  seriesId: string | null;
  tenant: { id: string; name: string; slug: string; timezone: string; logoUrl: string | null };
  /** Dias com expediente do profissional (pra remarcar / agendar de novo). */
  openWeekdays: number[];
  /** Dia atual do agendamento (YYYY-MM-DD no fuso do tenant) - pré-seleção. */
  currentDateStr: string;
  isPast: boolean;
  /** Futuro e ainda ativo (PENDING/CONFIRMED) - pode remarcar/cancelar. */
  isActive: boolean;
  payment: { status: PaymentStatus; amountCents: number } | null;
}

export interface CustomerAppointmentsData {
  upcoming: CustomerAppointmentItem[];
  past: CustomerAppointmentItem[];
}

function formatWhen(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Todos os agendamentos do cliente (em todos os estabelecimentos), separados em
 * futuros (asc) e passados (desc). Inclui serviço, profissional, tenant (com fuso),
 * o pagamento mais recente e os dias de expediente do profissional - tudo que as
 * telas e os modais de remarcar/agendar-de-novo precisam.
 */
export async function getCustomerAppointments(
  account: CustomerAccount,
): Promise<CustomerAppointmentsData> {
  const contacts = await prisma.contact.findMany({
    where: { customerAccountId: account.id },
    select: { id: true },
  });
  const contactIds = contacts.map((c) => c.id);
  if (contactIds.length === 0) return { upcoming: [], past: [] };

  const appts = await prisma.appointment.findMany({
    where: { contactId: { in: contactIds } },
    include: {
      service: { select: { name: true, durationMinutes: true, priceCents: true, active: true } },
      professional: { select: { name: true } },
      tenant: { select: { id: true, name: true, slug: true, timezone: true, logoUrl: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, amountCents: true },
      },
    },
    orderBy: { startsAt: 'desc' },
  });

  // Dias de expediente por profissional (pra remarcar / agendar de novo).
  const professionalIds = [...new Set(appts.map((a) => a.professionalId))];
  const blocks = professionalIds.length
    ? await prisma.scheduleBlock.findMany({
        where: { professionalId: { in: professionalIds } },
        select: { professionalId: true, weekday: true },
      })
    : [];
  const weekdaysByPro = new Map<string, number[]>();
  for (const b of blocks) {
    const arr = weekdaysByPro.get(b.professionalId) ?? [];
    if (!arr.includes(b.weekday)) arr.push(b.weekday);
    weekdaysByPro.set(b.professionalId, arr);
  }

  const now = new Date();
  const items: CustomerAppointmentItem[] = appts.map((a) => {
    const isPast = a.startsAt < now;
    return {
      id: a.id,
      serviceId: a.serviceId,
      serviceName: a.service.name,
      serviceActive: a.service.active,
      durationMinutes: a.service.durationMinutes,
      priceCents: a.service.priceCents,
      professionalName: a.professional.name,
      startsAt: a.startsAt,
      whenLabel: formatWhen(a.startsAt, a.tenant.timezone),
      status: a.status,
      seriesId: a.seriesId,
      tenant: a.tenant,
      openWeekdays: weekdaysByPro.get(a.professionalId) ?? [],
      currentDateStr: isoDateInTz(a.startsAt, a.tenant.timezone),
      isPast,
      isActive: !isPast && (a.status === 'PENDING' || a.status === 'CONFIRMED'),
      payment: a.payments[0] ?? null,
    };
  });

  const upcoming = items
    .filter((i) => !i.isPast)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = items.filter((i) => i.isPast); // já vem desc

  return { upcoming, past };
}

export interface RebookSource {
  appointmentId: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  priceCents: number;
  professionalName: string | null;
  tenantName: string;
  timezone: string;
  openWeekdays: number[];
}

/**
 * Dados-fonte pra "agendar de novo" a partir de um agendamento do cliente. Aplica o
 * gate de ownership (contact.customerAccountId). Retorna null se não for do cliente,
 * se o serviço foi desativado ou se o estabelecimento desligou o booking online.
 */
export async function getRebookSource(
  account: CustomerAccount,
  appointmentId: string,
): Promise<RebookSource | null> {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, contact: { customerAccountId: account.id } },
    select: {
      id: true,
      serviceId: true,
      professionalId: true,
      service: { select: { name: true, durationMinutes: true, priceCents: true, active: true } },
      professional: { select: { name: true } },
      tenant: { select: { name: true, timezone: true, publicBookingEnabled: true } },
    },
  });
  if (!appt) return null;
  if (!appt.service.active || !appt.tenant.publicBookingEnabled) return null;

  const blocks = await prisma.scheduleBlock.findMany({
    where: { professionalId: appt.professionalId },
    select: { weekday: true },
  });
  const openWeekdays = [...new Set(blocks.map((b) => b.weekday))];

  return {
    appointmentId: appt.id,
    serviceId: appt.serviceId,
    serviceName: appt.service.name,
    durationMinutes: appt.service.durationMinutes,
    priceCents: appt.service.priceCents,
    professionalName: appt.professional.name,
    tenantName: appt.tenant.name,
    timezone: appt.tenant.timezone,
    openWeekdays,
  };
}

export interface CustomerProfile {
  name: string | null;
  email: string;
  phone: string | null;
  document: string | null;
  birthDate: Date | null;
}

/**
 * Dados de cadastro do cliente. name/email/phone vêm da conta; document/birthDate
 * (que vivem nos Contacts) são lidos do Contact mais recente que os tenha.
 */
export async function getCustomerProfile(account: CustomerAccount): Promise<CustomerProfile> {
  const contact = await prisma.contact.findFirst({
    where: {
      customerAccountId: account.id,
      OR: [{ document: { not: null } }, { birthDate: { not: null } }],
    },
    orderBy: { updatedAt: 'desc' },
    select: { document: true, birthDate: true },
  });

  return {
    name: account.name,
    email: account.email,
    phone: account.phone,
    document: contact?.document ?? null,
    birthDate: contact?.birthDate ?? null,
  };
}
