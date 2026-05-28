import { prisma } from '@haru/database';
import { Plus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { requireUserAndTenant } from '@/lib/auth';
import { cn } from '@/lib/utils';

import { AppointmentActions } from './appointment-actions';

type Tab = 'upcoming' | 'past' | 'all';

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  CANCELED: 'Cancelado',
  COMPLETED: 'Atendido',
  NO_SHOW: 'Não compareceu',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-900',
  CONFIRMED: 'bg-emerald-100 text-emerald-900',
  CANCELED: 'bg-zinc-100 text-zinc-600 line-through',
  COMPLETED: 'bg-blue-100 text-blue-900',
  NO_SHOW: 'bg-rose-100 text-rose-900',
};

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">
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

      <div className="flex gap-2 border-b">
        <Tab href="/appointments" label="Próximos" active={tab === 'upcoming'} />
        <Tab href="/appointments?tab=past" label="Passados" active={tab === 'past'} />
        <Tab href="/appointments?tab=all" label="Todos" active={tab === 'all'} />
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
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
              className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
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
                </div>
                <div className="mt-1 text-sm">
                  {appt.service.name} · {formatDuration(appt.service.durationMinutes)} ·{' '}
                  {formatBRL(appt.service.priceCents)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {appt.contact.name ? `${appt.contact.name} · ` : ''}
                  {appt.contact.phone}
                </div>
              </div>

              <AppointmentActions appointmentId={appt.id} status={appt.status} />
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
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );
}
