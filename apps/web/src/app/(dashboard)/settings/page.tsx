import { prisma } from '@haru/database';

import { requireAdmin } from '@/lib/auth';
import { getBaseUrl } from '@/lib/base-url';

import { NotificationsCard } from './notifications-card';
import { PaymentsCard } from './payments-card';
import { PlanCard } from './plan-card';
import { PublicBookingCard } from './public-booking-card';
import { TimezoneCard } from './timezone-card';
import { UsersCard, type UserRow } from './users-card';
import { WhatsappCard } from './whatsapp-card';

export default async function SettingsPage() {
  const { id: currentUserId, tenant } = await requireAdmin();
  const webhookBaseUrl = await getBaseUrl();

  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, email: true, phone: true, role: true, status: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">Usuários, integrações e notificações.</p>
      </div>

      <PlanCard tenant={tenant} />

      <UsersCard users={users as UserRow[]} currentUserId={currentUserId} />

      <WhatsappCard
        phoneNumberId={tenant.whatsappPhoneNumberId}
        businessAccountId={tenant.whatsappBusinessAccountId}
        displayPhone={tenant.whatsappDisplayPhone}
        hasAccessToken={Boolean(tenant.whatsappAccessToken)}
      />

      <PublicBookingCard
        slug={tenant.slug}
        publicBookingEnabled={tenant.publicBookingEnabled}
        publicBookingConfirmation={tenant.publicBookingConfirmation}
      />

      <TimezoneCard timezone={tenant.timezone} />

      <PaymentsCard
        provider={tenant.paymentProvider}
        sandbox={tenant.paymentSandbox}
        hasCredential={Boolean(
          tenant.paymentAsaasApiKeyEnc ||
            tenant.paymentMercadoPagoTokenEnc ||
            tenant.paymentPagBankTokenEnc ||
            tenant.paymentPagarmeApiKeyEnc,
        )}
        webhookBaseUrl={webhookBaseUrl}
      />

      <NotificationsCard
        notificationWebhookUrl={tenant.notificationWebhookUrl}
        reminderHoursBefore={tenant.reminderHoursBefore}
        reminderTemplateName={tenant.reminderTemplateName}
        reminderTemplateLanguage={tenant.reminderTemplateLanguage}
        cancelTemplateName={tenant.cancelTemplateName}
        cancelTemplateLanguage={tenant.cancelTemplateLanguage}
        rescheduleTemplateName={tenant.rescheduleTemplateName}
        rescheduleTemplateLanguage={tenant.rescheduleTemplateLanguage}
      />
    </div>
  );
}
