import { signOut } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { requireUserAndTenant } from '@/lib/auth';

import { PasswordCard } from './password-card';
import { ProfileCard } from './profile-card';

export default async function AccountPage() {
  const user = await requireUserAndTenant();

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4">
      <div>
        <h1 className="font-serif text-[28px] tracking-tight text-ink">Minha conta</h1>
        <p className="mt-1 text-sm text-ink-50">Seus dados de acesso e senha - só seus.</p>
      </div>

      <ProfileCard name={user.name} email={user.email} avatarUrl={user.avatarUrl} />

      <PasswordCard />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper p-[18px] shadow-soft">
        <div className="flex-1">
          <div className="font-serif text-base text-ink">Sessão</div>
          <p className="mt-0.5 text-xs text-ink-50">Encerre o acesso neste navegador.</p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sair da conta
          </Button>
        </form>
      </div>
    </div>
  );
}
