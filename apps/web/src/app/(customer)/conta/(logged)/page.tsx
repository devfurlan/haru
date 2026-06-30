import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerAppointments } from '@/lib/customer';

import { AppointmentCard } from './appointment-card';

export const dynamic = 'force-dynamic';

export default async function CustomerHomePage() {
  const account = await requireCustomerAccount();
  const { upcoming, past } = await getCustomerAppointments(account);
  const next = upcoming[0] ?? null;
  const firstName = (account.name ?? '').trim().split(' ')[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Olá{firstName ? `, ${firstName}` : ''}!
        </h1>
        <p className="text-muted-foreground text-sm">Acompanhe e gerencie seus agendamentos.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Próximo agendamento</h2>
        {next ? (
          <AppointmentCard item={next} />
        ) : (
          <div className="bg-card text-muted-foreground rounded-xl border p-6 text-center text-sm">
            Você não tem agendamentos futuros.
          </div>
        )}
        {upcoming.length > 1 && (
          <Button asChild variant="link" size="sm" className="px-0">
            <Link href="/conta/agendamentos">Ver todos os {upcoming.length} próximos</Link>
          </Button>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Agendar de novo</h2>
            <Link
              href="/conta/agendamentos"
              className="text-muted-foreground text-xs underline-offset-4 hover:underline"
            >
              Ver histórico
            </Link>
          </div>
          <div className="space-y-3">
            {past.slice(0, 3).map((item) => (
              <AppointmentCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
