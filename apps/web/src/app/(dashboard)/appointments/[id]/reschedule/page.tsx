import Link from 'next/link';
import { notFound } from 'next/navigation';

import { prisma } from '@haru/database';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUserAndTenant } from '@/lib/auth';

import { RescheduleForm } from './reschedule-form';

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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}min`;
}

export default async function ReschedulePage({ params }: PageProps) {
  const { tenant } = await requireUserAndTenant();
  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({
    where: { id, tenantId: tenant.id },
    include: { service: true, contact: true },
  });
  if (!appointment) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/appointments"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Agendamentos
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Remarcar</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{appointment.service.name}</CardTitle>
          <CardDescription>
            {appointment.contact.name ?? appointment.contact.phone} ·{' '}
            {formatDuration(appointment.service.durationMinutes)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Horário atual: </span>
            {formatWhen(appointment.startsAt, tenant.timezone)}
          </div>

          <RescheduleForm
            appointmentId={appointment.id}
            currentStartsAtIso={appointment.startsAt.toISOString()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
