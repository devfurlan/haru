import { CalendarPlus } from 'lucide-react';
import Link from 'next/link';

import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerAppointments } from '@/lib/customer';

import { AppointmentCard } from '../appointment-card';
import { PendingPhoneNotice } from '../pending-phone-notice';

export const dynamic = 'force-dynamic';

export default async function CustomerAppointmentsPage() {
  const account = await requireCustomerAccount();
  const { upcoming, past } = await getCustomerAppointments(account);

  const isEmpty = upcoming.length === 0 && past.length === 0;
  // Vazio com telefone pendente = falta confirmar o WhatsApp, não "não tem nada".
  const phonePending = !account.phone;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Meus agendamentos</h1>
        <p className="text-muted-foreground text-sm">
          Tudo o que você agendou, em todos os estabelecimentos.
        </p>
      </div>

      {isEmpty ? (
        phonePending ? (
          <PendingPhoneNotice />
        ) : (
          <div className="bg-card rounded-xl border p-8 text-center">
            <p className="text-muted-foreground text-sm">
              Você ainda não tem agendamentos vinculados a esta conta.
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Quando agendar com o mesmo WhatsApp, eles aparecem aqui.
            </p>
          </div>
        )
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Próximos</h2>
            {upcoming.length === 0 ? (
              <div className="bg-card rounded-xl border border-dashed p-8 text-center">
                <CalendarPlus className="text-muted-foreground mx-auto h-6 w-6" aria-hidden="true" />
                <p className="text-foreground mt-2 text-sm font-medium">
                  Nenhum agendamento futuro
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Que tal marcar o próximo? Reserve de novo em um dos seus estabelecimentos.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((item) => (
                  <AppointmentCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium">Anteriores</h2>
              <div className="space-y-3">
                {past.map((item) => (
                  <AppointmentCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <p className="text-muted-foreground text-center text-xs">
        Quer agendar algo novo? Acesse a página do estabelecimento.{' '}
        <Link href="/conta" className="underline underline-offset-4">
          Voltar ao início
        </Link>
      </p>
    </div>
  );
}
