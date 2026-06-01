import Link from 'next/link';

import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';

import { NewAppointmentForm } from '@/app/(dashboard)/appointments/new/new-appointment-form';

import { RouteModal } from '../../route-modal';

export default async function NewAppointmentModal() {
  const { tenant } = await requireUserAndTenant();

  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, durationMinutes: true, priceCents: true },
  });

  return (
    <RouteModal
      title="Novo agendamento"
      description={`Encaixe ou walk-in. O horário é interpretado no seu fuso (${tenant.timezone}).`}
    >
      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre um serviço primeiro em{' '}
          <Link href="/services" className="underline underline-offset-4">
            /services
          </Link>
          .
        </p>
      ) : (
        <NewAppointmentForm services={services} />
      )}
    </RouteModal>
  );
}
