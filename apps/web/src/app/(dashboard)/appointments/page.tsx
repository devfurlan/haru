import { prisma } from '@haru/database';
import { formatPhoneBR } from '@haru/shared';

import { requireUserAndTenant } from '@/lib/auth';

import {
  AppointmentsDayView,
  type CalendarAppointment,
  type CalendarException,
  type PendingItem,
} from './appointments-day-view';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function AppointmentsPage() {
  const { tenant } = await requireUserAndTenant();
  const now = new Date();

  // Janela ampla (±12 meses) para o calendário ter dados ao navegar entre meses.
  const calendarFrom = new Date(now);
  calendarFrom.setMonth(calendarFrom.getMonth() - 12);
  const calendarTo = new Date(now);
  calendarTo.setMonth(calendarTo.getMonth() + 12);

  const [calendarRows, scheduleBlocks, exceptionRows, professionals, pendingRows] =
    await Promise.all([
      prisma.appointment.findMany({
        where: {
          tenantId: tenant.id,
          startsAt: { gte: calendarFrom, lte: calendarTo },
          status: { notIn: ['CANCELED'] },
        },
        include: {
          service: { select: { name: true, durationMinutes: true, priceCents: true } },
          contact: { select: { name: true, phone: true } },
        },
        orderBy: { startsAt: 'asc' },
      }),
      prisma.scheduleBlock.findMany({
        where: { tenantId: tenant.id },
        select: { weekday: true, startMinute: true, endMinute: true },
      }),
      prisma.scheduleException.findMany({
        where: { tenantId: tenant.id, startsAt: { lte: calendarTo }, endsAt: { gte: calendarFrom } },
        orderBy: { startsAt: 'asc' },
      }),
      prisma.user.findMany({
        where: { tenantId: tenant.id, isProfessional: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.appointment.findMany({
        where: { tenantId: tenant.id, status: 'PENDING', startsAt: { gte: now } },
        include: {
          service: { select: { name: true, priceCents: true } },
          contact: { select: { name: true, phone: true } },
          professional: { select: { name: true } },
        },
        orderBy: { startsAt: 'asc' },
        take: 8,
      }),
    ]);

  const multiProf = professionals.length > 1;

  const calendarAppointments: CalendarAppointment[] = calendarRows.map((a) => ({
    id: a.id,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    status: a.status,
    serviceName: a.service.name,
    durationMinutes: a.service.durationMinutes,
    priceCents: a.service.priceCents,
    contactName: a.contact.name,
    contactPhone: a.contact.phone,
    professionalId: a.professionalId,
    seriesId: a.seriesId,
  }));

  const calendarExceptions: CalendarException[] = exceptionRows.map((e) => ({
    id: e.id,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt.toISOString(),
    reason: e.reason,
  }));

  const hm = (d: Date) =>
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: tenant.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(d)
      .replace(':', 'h');

  const pending: PendingItem[] = pendingRows.map((a) => ({
    id: a.id,
    timeLabel: hm(a.startsAt),
    clientName: a.contact.name ?? (a.contact.phone ? formatPhoneBR(a.contact.phone) : 'Cliente'),
    serviceName: a.service.name,
    priceLabel: BRL.format(a.service.priceCents / 100),
    proName: multiProf ? (a.professional.name?.split(/\s+/)[0] ?? null) : null,
  }));

  const todayLocal = new Intl.DateTimeFormat('en-CA', {
    timeZone: tenant.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return (
    <AppointmentsDayView
      appointments={calendarAppointments}
      exceptions={calendarExceptions}
      scheduleBlocks={scheduleBlocks}
      professionals={professionals.map((p) => ({ id: p.id, name: p.name ?? 'Profissional' }))}
      pending={pending}
      timezone={tenant.timezone}
      today={todayLocal}
    />
  );
}
