import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerAppointments } from '@/lib/customer';

import { PendingPhoneNotice } from '../pending-phone-notice';
import { AgendaClient } from './agenda-client';

export const dynamic = 'force-dynamic';

export default async function CustomerAppointmentsPage() {
  const account = await requireCustomerAccount();
  const { upcoming, past } = await getCustomerAppointments(account);

  // Vazio com telefone pendente = falta confirmar o WhatsApp, não "não tem nada".
  if (upcoming.length === 0 && past.length === 0 && !account.phone) {
    return (
      <div className="px-5 pt-6">
        <h1 className="text-ink font-serif text-[28px] tracking-tight">Sua agenda</h1>
        <div className="pt-6">
          <PendingPhoneNotice pendingPhone={account.pendingPhone} />
        </div>
      </div>
    );
  }

  return <AgendaClient upcoming={upcoming} past={past} />;
}
