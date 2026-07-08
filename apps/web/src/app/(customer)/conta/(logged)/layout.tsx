import Link from 'next/link';

import { AccountNav } from '@/components/customer/account-nav';
import { Logo } from '@/components/logo';
import { requireCustomerAccount } from '@/lib/customer-auth';

import { CustomerSignOutButton } from './customer-sign-out-button';

// Subárvore LOGADA da área do cliente. O guard fica aqui (e não em conta/layout) para
// não cobrir as telas públicas entrar/criar - evita loop de redirect.
//
// Shell do painel v2: largura total. Cada tela é dona da própria largura (define seu
// container max-w-* e padding). O header vive no topo no desktop (logo + tabs + conta,
// numa linha só a 1280px) e a nav vive embaixo no mobile (bottom tab bar).
export default async function CustomerLoggedLayout({ children }: { children: React.ReactNode }) {
  const account = await requireCustomerAccount();
  const headerInitial = (account.name ?? account.email ?? '?').trim().charAt(0).toUpperCase();

  return (
    <div className="bg-cream min-h-screen">
      {/* Desktop: barra no topo (logo · tabs · conta). No mobile a nav vive embaixo. */}
      <header className="bg-paper border-line sticky top-0 z-20 hidden border-b md:block">
        <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-8 py-3">
          <Link href="/conta" aria-label="Demandaê" className="shrink-0">
            <Logo size="sm" />
          </Link>
          <div className="flex flex-1 justify-center">
            <AccountNav variant="top" />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/conta/perfil"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <span className="bg-green-deep flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-full">
                {account.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-green-bright font-serif text-sm">{headerInitial}</span>
                )}
              </span>
              <span className="text-foreground text-sm font-semibold">
                {account.name ?? account.email}
              </span>
            </Link>
            <CustomerSignOutButton />
          </div>
        </div>
      </header>

      {/* Cada tela cuida do próprio container/padding (hero full-bleed vs px-5). */}
      <main className="w-full pb-24 md:pb-10">{children}</main>

      {/* Mobile: bottom tab bar fixa (some no desktop). */}
      <div className="fixed inset-x-0 bottom-0 z-20 md:hidden">
        <div className="mx-auto max-w-md">
          <AccountNav variant="bottom" />
        </div>
      </div>
    </div>
  );
}
