import Link from 'next/link';

import { signOut } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { requireUserAndTenant } from '@/lib/auth';
import { getCustomerAccount } from '@/lib/customer-auth';

import { PasswordCard } from './password-card';
import { ProfileCard } from './profile-card';

export default async function AccountPage() {
  const [user, customer] = await Promise.all([requireUserAndTenant(), getCustomerAccount()]);

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4">
      <div>
        <h1 className="text-ink font-serif text-[28px] tracking-tight">Minha conta</h1>
        <p className="text-ink-50 mt-1 text-sm">Seus dados de acesso e senha - só seus.</p>
      </div>

      <ProfileCard name={user.name} email={user.email} avatarUrl={user.avatarUrl} />

      <PasswordCard />

      {/* Mesmo login pode ser dono E cliente (agenda em outros lugares). O login sempre
          cai no painel, então este é o caminho pra área de cliente. */}
      {customer ? (
        <div className="border-line bg-paper shadow-soft flex flex-wrap items-center gap-3 rounded-2xl border p-[18px]">
          <div className="flex-1">
            <div className="text-ink font-serif text-base">Conta de cliente</div>
            <p className="text-ink-50 mt-0.5 text-xs">
              Seus agendamentos como cliente, com este mesmo login.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/conta">Ver meus agendamentos</Link>
          </Button>
        </div>
      ) : null}

      <div className="border-line bg-paper shadow-soft flex flex-wrap items-center gap-3 rounded-2xl border p-[18px]">
        <div className="flex-1">
          <div className="text-ink font-serif text-base">Sessão</div>
          <p className="text-ink-50 mt-0.5 text-xs">Encerre o acesso neste navegador.</p>
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
