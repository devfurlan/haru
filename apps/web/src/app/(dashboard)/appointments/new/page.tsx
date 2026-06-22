import Link from 'next/link';

import { prisma } from '@haru/database';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUserAndTenant } from '@/lib/auth';
import { BOOKING_HORIZON_DAYS } from '@/lib/booking-days';

import { NewAppointmentForm } from './new-appointment-form';

export default async function NewAppointmentPage() {
  const user = await requireUserAndTenant();
  const { tenant } = user;

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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/appointments"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Agendamentos
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight">Novo agendamento</h1>
        <p className="text-muted-foreground text-sm">
          Encaixe ou walk-in. Aparece no histórico do cliente quando ele mandar mensagem depois.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
          <CardDescription>
            O horário é interpretado no seu fuso ({tenant.timezone}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Cadastre um serviço primeiro em{' '}
              <Link href="/services" className="underline underline-offset-4">
                /services
              </Link>
              .
            </p>
          ) : (
            <NewAppointmentForm
              services={services}
              timezone={tenant.timezone}
              openWeekdays={openWeekdays}
              horizonDays={BOOKING_HORIZON_DAYS}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
