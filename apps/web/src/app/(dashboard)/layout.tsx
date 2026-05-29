import Link from 'next/link';

import { DashboardNav } from '@/components/dashboard-nav';
import { Logo } from '@/components/logo';
import { SignOutButton } from '@/components/sign-out-button';
import { requireUserAndTenant } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { tenant, email, name } = await requireUserAndTenant();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="border-b px-4 py-4">
          <Link href="/" aria-label="Demandaê" className="mb-3 block">
            <Logo pulse size="sm" />
          </Link>
          <div className="text-sm font-semibold">{tenant.name}</div>
          <div className="truncate text-xs text-muted-foreground">{name ?? email}</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DashboardNav />
        </div>
        <div className="border-t p-2">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
