import { notFound } from 'next/navigation';

import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';
import { formatPhoneBR } from '@/lib/format';

import { RescheduleForm } from '@/app/(dashboard)/appointments/[id]/reschedule/reschedule-form';

import { RouteModal } from '../../../route-modal';

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

export default async function RescheduleModal({ params }: PageProps) {
  const { tenant } = await requireUserAndTenant();
  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({
    where: { id, tenantId: tenant.id },
    include: { service: true, contact: true },
  });
  if (!appointment) notFound();

  return (
    <RouteModal
      title="Remarcar"
      description={
        <>
          {appointment.service.name} ·{' '}
          {appointment.contact.name ?? formatPhoneBR(appointment.contact.phone)} ·{' '}
          {formatDuration(appointment.service.durationMinutes)}
        </>
      }
    >
      <div className="text-sm">
        <span className="text-muted-foreground">Horário atual: </span>
        {formatWhen(appointment.startsAt, tenant.timezone)}
      </div>

      <RescheduleForm
        appointmentId={appointment.id}
        currentStartsAtIso={appointment.startsAt.toISOString()}
      />
    </RouteModal>
  );
}
