import { redirect } from 'next/navigation';

import { isAddonActive } from '@haru/billing';
import { prisma } from '@haru/database';

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

  // Onboarding não concluído → wizard de primeira execução. /onboarding é rota
  // top-level (fora deste grupo), então não há loop. Tenants antigos já vêm com
  // onboardingCompletedAt preenchido (backfill da migration).
  if (!tenant.onboardingCompletedAt) redirect('/onboarding');

  // Gate da aba Conversas: só com o addon "Atendente IA" ativo (o inbound do bot é
  // quem popula a caixa; sem addon fica vazia).
  const subscription = await prisma.subscription.findUnique({ where: { tenantId: tenant.id } });

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
        isProfessional={user.isProfessional}
        addonActive={isAddonActive(subscription)}
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
