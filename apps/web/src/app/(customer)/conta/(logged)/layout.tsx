import Link from 'next/link';

import { AccountNav } from '@/components/customer/account-nav';
import { Logo } from '@/components/logo';
import { requireCustomerAccount } from '@/lib/customer-auth';

import { CustomerSignOutButton } from './customer-sign-out-button';

// Subárvore LOGADA da área do cliente. O guard fica aqui (e não em conta/layout) para
// não cobrir as telas públicas entrar/criar - evita loop de redirect.
//
// Shell mínimo espelhando o app: coluna estreita centrada. Cada tela renderiza o próprio
// header (a home tem hero esmeralda; agenda/buscar/perfil têm título Fraunces). A nav
// vive embaixo no mobile (bottom tab bar) e no topo no desktop.
export default async function CustomerLoggedLayout({ children }: { children: React.ReactNode }) {
  const account = await requireCustomerAccount();

  return (
    <div className="bg-cream min-h-screen">
      {/* Desktop: barra no topo (logo + tabs + conta). No mobile a nav vive embaixo. */}
      <header className="bg-background sticky top-0 z-20 hidden border-b md:block">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/conta" aria-label="Demandaê">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm">{account.name ?? account.email}</span>
            <CustomerSignOutButton />
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 pb-1">
          <AccountNav variant="top" />
        </div>
      </header>

      {/* Cada tela cuida do próprio padding horizontal (hero full-bleed vs px-5). */}
      <main className="mx-auto w-full max-w-md pb-24 md:max-w-2xl md:pb-10 md:pt-6">{children}</main>

      {/* Mobile: bottom tab bar fixa (some no desktop). */}
      <div className="fixed inset-x-0 bottom-0 z-20 md:hidden">
        <div className="mx-auto max-w-md">
          <AccountNav variant="bottom" />
        </div>
      </div>
    </div>
  );
}
