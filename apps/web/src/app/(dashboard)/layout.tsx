import Link from 'next/link';

import { BillingBanner } from '@/components/billing-banner';
import { BusinessMenuLink } from '@/components/business-menu-link';
import { DashboardNav } from '@/components/dashboard-nav';
import { Logo } from '@/components/logo';
import { SignOutButton } from '@/components/sign-out-button';
import { UsageBanner } from '@/components/usage-banner';
import { SupportWidget } from '@/components/support/support-widget';
import { UserMenuLink } from '@/components/user-menu-link';
import { isAdmin, requireUserAndTenant } from '@/lib/auth';

export default async function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const user = await requireUserAndTenant();
  const { tenant, email, name, avatarUrl } = user;

  return (
    <div className="flex h-screen">
      <aside className="bg-muted/30 hidden h-screen w-64 shrink-0 flex-col border-r md:flex">
        <div className="border-b px-4 py-4">
          <Link href="/" aria-label="Demandaê" className="mb-3 block">
            <Logo pulse size="sm" />
          </Link>
          <div className="-mx-2 space-y-0.5">
            <BusinessMenuLink name={tenant.name} logoUrl={tenant.logoUrl} />
            <UserMenuLink name={name} email={email} avatarUrl={avatarUrl} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DashboardNav isAdmin={isAdmin(user)} />
        </div>
        <div className="border-t p-2">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <BillingBanner tenant={tenant} />
        <UsageBanner tenant={tenant} />
        <div className="p-6">{children}</div>
      </main>
      {modal}
      <SupportWidget />
    </div>
  );
}
