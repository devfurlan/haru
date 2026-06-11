import { prisma } from '@haru/database';
import { Plus, Repeat } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { STATUS_LABEL, STATUS_STYLE } from '@/lib/appointment-status';
import { requireUserAndTenant } from '@/lib/auth';
import { formatPhoneBR } from '@/lib/format';
import { cn } from '@/lib/utils';

import { AppointmentActions } from './appointment-actions';
import { AppointmentsCalendar, type CalendarAppointment } from './appointments-calendar';

type Tab = 'upcoming' | 'past' | 'all';

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}min`;
}

function formatWhen(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default async function AppointmentsPage({ searchParams }: PageProps) {
  const { tenant } = await requireUserAndTenant();
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === 'past' || tabParam === 'all' ? tabParam : 'upcoming';

  const now = new Date();
  const whereByTab = {
    upcoming: { startsAt: { gte: now }, status: { notIn: ['CANCELED' as const] } },
    past: { startsAt: { lt: now } },
    all: {},
  }[tab];

  const appointments = await prisma.appointment.findMany({
    where: { tenantId: tenant.id, ...whereByTab },
    include: { service: true, contact: true },
    orderBy: { startsAt: tab === 'past' ? 'desc' : 'asc' },
    take: 200,
  });

  // Janela ampla (±12 meses) para o calendário ter dados ao navegar entre meses.
  const calendarFrom = new Date(now);
  calendarFrom.setMonth(calendarFrom.getMonth() - 12);
  const calendarTo = new Date(now);
  calendarTo.setMonth(calendarTo.getMonth() + 12);

  const calendarRows = await prisma.appointment.findMany({
    where: {
      tenantId: tenant.id,
      startsAt: { gte: calendarFrom, lte: calendarTo },
      status: { notIn: ['CANCELED'] },
    },
    include: {
      service: { select: { name: true } },
      contact: { select: { name: true, phone: true } },
    },
    orderBy: { startsAt: 'asc' },
  });

  const calendarAppointments: CalendarAppointment[] = calendarRows.map((appt) => ({
    id: appt.id,
    startsAt: appt.startsAt.toISOString(),
    endsAt: appt.endsAt.toISOString(),
    status: appt.status,
    serviceName: appt.service.name,
    contactName: appt.contact.name,
    contactPhone: appt.contact.phone,
  }));

  // "Hoje" no fuso do tenant (YYYY-MM-DD), para destacar o dia corrente.
  const todayLocal = new Intl.DateTimeFormat('en-CA', {
    timeZone: tenant.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Agendamentos</h1>
          <p className="text-muted-foreground text-sm">
            Tudo que o bot agendou e o histórico do estabelecimento.
          </p>
        </div>
        <Button asChild>
          <Link href="/appointments/new">
            <Plus className="h-4 w-4" />
            Novo
          </Link>
        </Button>
      </div>

      <AppointmentsCalendar
        appointments={calendarAppointments}
        timezone={tenant.timezone}
        today={todayLocal}
      />

      <div className="flex gap-2 border-b">
        <Tab href="/appointments" label="Próximos" active={tab === 'upcoming'} />
        <Tab href="/appointments?tab=past" label="Passados" active={tab === 'past'} />
        <Tab href="/appointments?tab=all" label="Todos" active={tab === 'all'} />
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {tab === 'upcoming'
              ? 'Nenhum agendamento próximo.'
              : tab === 'past'
                ? 'Sem histórico ainda.'
                : 'Nenhum agendamento.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="bg-card flex flex-col gap-3 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatWhen(appt.startsAt, tenant.timezone)}</span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-xs font-medium',
                      STATUS_STYLE[appt.status] ?? '',
                    )}
                  >
                    {STATUS_LABEL[appt.status] ?? appt.status}
                  </span>
                  {appt.seriesId && (
                    <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium">
                      <Repeat className="h-3 w-3" aria-hidden="true" />
                      Recorrente
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm">
                  {appt.service.name} · {formatDuration(appt.service.durationMinutes)} ·{' '}
                  {formatBRL(appt.service.priceCents)}
                </div>
                <div className="text-muted-foreground text-sm">
                  {appt.contact.name ? `${appt.contact.name} · ` : ''}
                  {formatPhoneBR(appt.contact.phone)}
                </div>
              </div>

              <AppointmentActions
                appointmentId={appt.id}
                status={appt.status}
                seriesId={appt.seriesId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
        active
          ? 'border-foreground text-foreground'
          : 'text-muted-foreground hover:text-foreground border-transparent',
      )}
    >
      {label}
    </Link>
  );
}
