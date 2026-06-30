import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerProfile } from '@/lib/customer';
import { formatPhoneBR, maskCpfCnpjInput } from '@/lib/format';

import { CustomerPasswordCard } from './password-card';
import { ProfileForm } from './profile-form';

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

export default async function CustomerProfilePage() {
  const account = await requireCustomerAccount();
  const profile = await getCustomerProfile(account);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Meu cadastro</h1>
        <p className="text-muted-foreground text-sm">Seus dados e senha de acesso.</p>
      </div>

      <ProfileForm
        name={profile.name ?? ''}
        email={profile.email}
        phoneDisplay={formatPhoneBR(profile.phone)}
        documentDefault={profile.document ? maskCpfCnpjInput(profile.document) : ''}
        birthDateDefault={profile.birthDate ? toYMD(profile.birthDate) : ''}
      />

      <CustomerPasswordCard />
    </div>
  );
}
