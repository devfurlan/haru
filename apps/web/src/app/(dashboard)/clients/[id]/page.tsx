import { prisma } from '@haru/database';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppointmentActions } from '@/app/(dashboard)/appointments/appointment-actions';
import { Card, CardContent } from '@/components/ui/card';
import { STATUS_LABEL, STATUS_STYLE } from '@/lib/appointment-status';
import { requireUserAndTenant } from '@/lib/auth';
import { formatBRL, formatDateOnly, formatDuration, formatPhoneBR } from '@haru/shared';
import { formatFullDateTime } from '@/lib/relative-time';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
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

export default async function ClientDetailPage({ params }: PageProps) {
  const { tenant } = await requireUserAndTenant();
  const { id } = await params;

  const client = await prisma.contact.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      appointments: {
        include: { service: true },
        orderBy: { startsAt: 'desc' },
      },
    },
  });
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Clientes
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">
            {client.name ?? formatPhoneBR(client.phone)}
          </h1>
          <p className="text-sm text-muted-foreground">{formatPhoneBR(client.phone)}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
            client.profileCompletedAt
              ? 'bg-chip text-green-emph'
              : 'bg-[#fdf0d5] text-[#8a6116]',
          )}
        >
          {client.profileCompletedAt ? 'Cadastro confirmado' : 'Cadastro pendente'}
        </span>
      </div>

      <Card>
        <CardContent className="grid gap-x-6 gap-y-3 py-5 sm:grid-cols-2">
          <Field label="E-mail" value={client.email ?? '-'} />
          <Field
            label="Data de nascimento"
            value={client.birthDate ? formatDateOnly(client.birthDate) : '-'}
          />
          <Field label="Cadastrado em" value={formatFullDateTime(client.createdAt)} />
          <Field
            label="Total de agendamentos"
            value={String(client.appointments.length)}
          />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 font-serif text-lg font-semibold tracking-tight">Agendamentos</h2>
        {client.appointments.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Este cliente ainda não tem agendamentos.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {client.appointments.map((appt) => (
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
                        STATUS_STYLE[appt.status],
                      )}
                    >
                      {STATUS_LABEL[appt.status]}
                    </span>
                  </div>
                  <div className="mt-1 text-sm">
                    {appt.service.name} · {formatDuration(appt.service.durationMinutes)} ·{' '}
                    {formatBRL(appt.service.priceCents)}
                  </div>
                </div>

                <AppointmentActions appointmentId={appt.id} status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
