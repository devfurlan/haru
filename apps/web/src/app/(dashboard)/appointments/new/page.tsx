import Link from 'next/link';

import { prisma } from '@haru/database';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUserAndTenant } from '@/lib/auth';

import { NewAppointmentForm } from './new-appointment-form';

export default async function NewAppointmentPage() {
  const { tenant } = await requireUserAndTenant();

  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, durationMinutes: true, priceCents: true },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/appointments"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Agendamentos
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Novo agendamento</h1>
        <p className="text-sm text-muted-foreground">
          Encaixe ou walk-in. Aparece no histórico do cliente quando ele mandar mensagem depois.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
          <CardDescription>O horário é interpretado no seu fuso ({tenant.timezone}).</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
