import Link from 'next/link';
import { BarChart3, CreditCard, TrendingUp, Users } from 'lucide-react';

import { SignOutButton } from '@/components/sign-out-button';
import { requireAdmin } from '@/lib/admin-auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-paper">
        <div className="border-b px-5 py-4">
          <p className="font-semibold">Demandaê</p>
          <p className="text-xs text-muted-foreground">Admin global</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <BarChart3 className="size-4" />
            Consumo de IA
          </Link>
          <Link
            href="/receita"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <TrendingUp className="size-4" />
            Receita (MRR)
          </Link>
          <Link
            href="/clientes"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <Users className="size-4" />
            Clientes
          </Link>
          <Link
            href="/planos"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            <CreditCard className="size-4" />
            Planos
          </Link>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <SignOutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
