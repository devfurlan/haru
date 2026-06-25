import { Suspense } from 'react';

import { notFound } from 'next/navigation';

import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';
import { BOOKING_HORIZON_DAYS, isoDateInTz } from '@/lib/booking-days';
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

function RescheduleSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-muted h-4 w-48 animate-pulse rounded" />
      <div className="bg-muted h-9 animate-pulse rounded-md" />
      <div className="flex gap-2">
        <div className="bg-muted h-9 w-40 animate-pulse rounded-md" />
        <div className="bg-muted h-9 w-24 animate-pulse rounded-md" />
      </div>
    </div>
  );
}

// O `await` mora aqui, não no shell - o <Dialog> abre na hora com o skeleton.
async function RescheduleBody({ id }: { id: string }) {
  const { tenant } = await requireUserAndTenant();

  const appointment = await prisma.appointment.findFirst({
    where: { id, tenantId: tenant.id },
    include: { service: true, contact: true },
  });
  if (!appointment) notFound();

  // Dias com expediente do PROFISSIONAL do agendamento (a remarcação mantém ele).
  const blocks = await prisma.scheduleBlock.findMany({
    where: { tenantId: tenant.id, professionalId: appointment.professionalId },
    select: { weekday: true },
  });
  const openWeekdays = [...new Set(blocks.map((b) => b.weekday))];
  const currentDateStr = isoDateInTz(appointment.startsAt, tenant.timezone);

  return (
    <>
      <p className="text-muted-foreground text-sm">
        {appointment.service.name} ·{' '}
        {appointment.contact.name ?? formatPhoneBR(appointment.contact.phone)} ·{' '}
        {formatDuration(appointment.service.durationMinutes)}
      </p>

      <div className="text-sm">
        <span className="text-muted-foreground">Horário atual: </span>
        {formatWhen(appointment.startsAt, tenant.timezone)}
      </div>

      <RescheduleForm
        appointmentId={appointment.id}
        serviceId={appointment.serviceId}
        professionalId={appointment.professionalId}
        currentDateStr={currentDateStr}
        timezone={tenant.timezone}
        openWeekdays={openWeekdays}
        horizonDays={BOOKING_HORIZON_DAYS}
      />
    </>
  );
}

export default async function RescheduleModal({ params }: PageProps) {
  const { id } = await params;

  return (
    <RouteModal title="Remarcar">
      <Suspense fallback={<RescheduleSkeleton />}>
        <RescheduleBody id={id} />
      </Suspense>
    </RouteModal>
  );
}
