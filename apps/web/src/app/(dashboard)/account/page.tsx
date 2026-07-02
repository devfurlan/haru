import { requireUserAndTenant } from '@/lib/auth';

import { PasswordCard } from './password-card';
import { ProfileCard } from './profile-card';

export default async function AccountPage() {
  const user = await requireUserAndTenant();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Minha conta</h1>
        <p className="text-sm text-muted-foreground">Seus dados de acesso e senha.</p>
      </div>

      <ProfileCard name={user.name} email={user.email} avatarUrl={user.avatarUrl} />

      <PasswordCard />
    </div>
  );
}
