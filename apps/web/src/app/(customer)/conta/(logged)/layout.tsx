import Link from 'next/link';

import { Logo } from '@/components/logo';
import { requireCustomerAccount } from '@/lib/customer-auth';

import { ConfirmPhoneBar } from './confirm-phone-bar';
import { ContaNav } from './conta-nav';
import { CustomerSignOutButton } from './customer-sign-out-button';

// Subárvore LOGADA da área do cliente. O guard fica aqui (e não em conta/layout)
// para não cobrir as telas públicas entrar/criar - evita loop de redirect.
export default async function CustomerLoggedLayout({ children }: { children: React.ReactNode }) {
  const account = await requireCustomerAccount();

  return (
    <div className="bg-secondary/20 min-h-screen">
      <header className="bg-background sticky top-0 z-10 border-b">
        {/* Pede a confirmação do WhatsApp enquanto a conta não tem número confirmado. */}
        {!account.phone ? <ConfirmPhoneBar pendingPhone={account.pendingPhone} /> : null}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/conta" aria-label="Demandaê">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {account.name ?? account.email}
            </span>
            <CustomerSignOutButton />
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-2">
          <ContaNav />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
