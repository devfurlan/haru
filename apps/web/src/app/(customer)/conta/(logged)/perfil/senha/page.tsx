import { ScreenHeader } from '@/components/customer/screen-header';
import { requireCustomerAccount } from '@/lib/customer-auth';

import { CustomerPasswordCard } from '../password-card';

export const dynamic = 'force-dynamic';

export default async function SenhaPage() {
  await requireCustomerAccount();

  return (
    <div>
      <ScreenHeader title="Alterar senha" eyebrow="Conta" backHref="/conta/perfil" />
      <div className="px-5 pb-8 pt-2">
        <CustomerPasswordCard />
      </div>
    </div>
  );
}
