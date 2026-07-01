import Link from 'next/link';

import { prisma } from '@haru/database';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUserAndTenant } from '@/lib/auth';
import { BOOKING_HORIZON_DAYS } from '@haru/shared';

import { NewAppointmentForm } from './new-appointment-form';

export default async function NewAppointmentPage() {
  const user = await requireUserAndTenant();
  const { tenant } = user;

  const [servicesRaw, professionals, blocks] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        priceCents: true,
        professionals: { select: { professionalId: true } },
      },
    }),
    prisma.user.findMany({
      where: { tenantId: tenant.id, isProfessional: true },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true },
    }),
    prisma.scheduleBlock.findMany({
      where: { tenantId: tenant.id },
      select: { weekday: true },
    }),
  ]);
  const services = servicesRaw.map(({ professionals: links, ...rest }) => ({
    ...rest,
    professionalIds: links.map((l) => l.professionalId),
  }));
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
              professionals={professionals}
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
