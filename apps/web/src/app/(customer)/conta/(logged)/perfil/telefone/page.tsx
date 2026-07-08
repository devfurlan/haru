import { ScreenHeader } from '@/components/customer/screen-header';
import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerProfile } from '@/lib/customer';
import { formatPhoneBR } from '@haru/shared';

import { ChangePhoneCard } from '../change-phone-card';

export const dynamic = 'force-dynamic';

export default async function TelefonePage() {
  const account = await requireCustomerAccount();
  const profile = await getCustomerProfile(account);

  return (
    <div className="mx-auto max-w-[640px]">
      <ScreenHeader title="Telefone" eyebrow="Conta" backHref="/conta/perfil" />
      <div className="px-5 pb-8 pt-2">
        <ChangePhoneCard
          currentPhoneDisplay={formatPhoneBR(profile.phone)}
          pendingPhoneDisplay={profile.pendingPhone ? formatPhoneBR(profile.pendingPhone) : ''}
        />
      </div>
    </div>
  );
}
