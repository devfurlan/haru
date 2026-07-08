import { BillingBanner } from '@/components/billing-banner';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { NotificationBell } from '@/components/notification-bell';
import { SupportWidget } from '@/components/support/support-widget';
import { UsageBanner } from '@/components/usage-banner';
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
    <>
      <DashboardShell
        tenantName={tenant.name}
        tenantLogoUrl={tenant.logoUrl}
        live={tenant.publicBookingEnabled}
        userName={name}
        userEmail={email}
        userAvatarUrl={avatarUrl}
        isAdmin={isAdmin(user)}
        notification={<NotificationBell tenantId={tenant.id} />}
        banners={
          <>
            <BillingBanner tenant={tenant} />
            <UsageBanner tenant={tenant} />
          </>
        }
      >
        {children}
      </DashboardShell>
      {modal}
      <SupportWidget />
    </>
  );
}
