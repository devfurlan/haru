import { ScreenHeader } from '@/components/customer/screen-header';
import { requireCustomerAccount } from '@/lib/customer-auth';

import { CustomerNotificationsCard } from '../notifications-card';

export const dynamic = 'force-dynamic';

export default async function NotificacoesPage() {
  const account = await requireCustomerAccount();

  return (
    <div className="mx-auto max-w-[640px]">
      <ScreenHeader title="Notificações" eyebrow="Conta" backHref="/conta/perfil" />
      <div className="px-5 pb-8 pt-2">
        <CustomerNotificationsCard appointmentEmailsEnabled={account.appointmentEmailsEnabled} />
      </div>
    </div>
  );
}
