import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireCustomerAccount } from '@/lib/customer-auth';
import { getRebookSource } from '@/lib/customer';
import { formatBRL, formatDuration } from '@/lib/format';

import { RebookForm } from './rebook-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function RebookPage({ searchParams }: PageProps) {
  const account = await requireCustomerAccount();
  const { from } = await searchParams;
  const source = from ? await getRebookSource(account, from) : null;

  if (!source) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Agendar de novo</h1>
        <p className="text-muted-foreground text-sm">
          Não foi possível repetir este agendamento. O serviço pode não estar mais disponível ou o
          estabelecimento desativou o agendamento online.
        </p>
        <Button asChild variant="outline">
          <Link href="/conta/agendamentos">Voltar aos agendamentos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/conta/agendamentos"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Meus agendamentos
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight">Agendar de novo</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{source.serviceName}</CardTitle>
          <CardDescription>
            {source.tenantName} · {source.professionalName ?? 'Profissional'} ·{' '}
            {formatDuration(source.durationMinutes)} · {formatBRL(source.priceCents)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RebookForm
            sourceAppointmentId={source.appointmentId}
            serviceId={source.serviceId}
            timezone={source.timezone}
            openWeekdays={source.openWeekdays}
          />
        </CardContent>
      </Card>
    </div>
  );
}
