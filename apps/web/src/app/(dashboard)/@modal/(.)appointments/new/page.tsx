import { Suspense } from 'react';

import Link from 'next/link';

import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';
import { BOOKING_HORIZON_DAYS } from '@/lib/booking-days';

import { NewAppointmentForm } from '@/app/(dashboard)/appointments/new/new-appointment-form';

import { RouteModal } from '../../route-modal';

function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-muted h-9 animate-pulse rounded-md" />
        <div className="bg-muted h-9 animate-pulse rounded-md" />
      </div>
      <div className="bg-muted h-9 animate-pulse rounded-md" />
      <div className="bg-muted h-9 animate-pulse rounded-md" />
      <div className="bg-muted h-9 w-40 animate-pulse rounded-md" />
    </div>
  );
}

// Componente async isolado: o `await` mora aqui, não no shell do modal.
// Assim o <Dialog> abre na hora (com o skeleton) e o conteúdo streama depois.
async function NewAppointmentBody() {
  const { tenant } = await requireUserAndTenant();

  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, durationMinutes: true, priceCents: true },
  });

  const blocks = await prisma.scheduleBlock.findMany({
    where: { tenantId: tenant.id },
    select: { weekday: true },
  });
  const openWeekdays = [...new Set(blocks.map((b) => b.weekday))];

  if (services.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Cadastre um serviço primeiro em{' '}
        <Link href="/services" className="underline underline-offset-4">
          /services
        </Link>
        .
      </p>
    );
  }

  return (
    <NewAppointmentForm
      services={services}
      timezone={tenant.timezone}
      openWeekdays={openWeekdays}
      horizonDays={BOOKING_HORIZON_DAYS}
    />
  );
}

export default function NewAppointmentModal() {
  return (
    <RouteModal title="Novo agendamento" description="Encaixe ou walk-in.">
      <Suspense fallback={<FormSkeleton />}>
        <NewAppointmentBody />
      </Suspense>
    </RouteModal>
  );
}
