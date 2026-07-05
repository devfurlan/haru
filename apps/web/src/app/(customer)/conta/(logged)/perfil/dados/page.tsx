import { ScreenHeader } from '@/components/customer/screen-header';
import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerProfile } from '@/lib/customer';
import { maskCpfCnpjInput } from '@haru/shared';

import { ProfileForm } from '../profile-form';

export const dynamic = 'force-dynamic';

/** "YYYY-MM-DD" de uma data guardada como meia-noite UTC (pro input type="date"). */
function toYMD(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export default async function DadosPage() {
  const account = await requireCustomerAccount();
  const profile = await getCustomerProfile(account);

  return (
    <div>
      <ScreenHeader title="Meus dados" eyebrow="Conta" backHref="/conta/perfil" />
      <div className="px-5 pb-8 pt-2">
        <ProfileForm
          name={profile.name ?? ''}
          email={profile.email}
          documentDefault={profile.document ? maskCpfCnpjInput(profile.document) : ''}
          birthDateDefault={profile.birthDate ? toYMD(profile.birthDate) : ''}
        />
      </div>
    </div>
  );
}
