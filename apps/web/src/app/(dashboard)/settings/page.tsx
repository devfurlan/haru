import { requireUserAndTenant } from '@/lib/auth';

import { NotificationsCard } from './notifications-card';
import { WhatsappCard } from './whatsapp-card';

export default async function SettingsPage() {
  const { tenant } = await requireUserAndTenant();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">Integrações e notificações.</p>
      </div>

      <WhatsappCard
        phoneNumberId={tenant.whatsappPhoneNumberId}
        businessAccountId={tenant.whatsappBusinessAccountId}
        displayPhone={tenant.whatsappDisplayPhone}
        hasAccessToken={Boolean(tenant.whatsappAccessToken)}
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
