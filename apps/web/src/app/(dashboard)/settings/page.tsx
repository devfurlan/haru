import { hasFeature, hasWaitlist } from '@haru/billing';

import { requireAdmin } from '@/lib/auth';
import { getBaseUrl } from '@/lib/base-url';

import { NotificationsCard } from './notifications-card';
import { PaymentsCard } from './payments-card';
import { PlanCard } from './plan-card';
import { ReturnReminderCard } from './return-reminder-card';
import { SupportCard } from './support-card';
import { TimezoneCard } from './timezone-card';
import { WaitlistCard } from './waitlist-card';
import { WeeklyReportCard } from './weekly-report-card';

export default async function SettingsPage() {
  const { tenant } = await requireAdmin();
  const webhookBaseUrl = await getBaseUrl();

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <div>
        <h1 className="text-ink font-serif text-[28px] tracking-tight">Configurações</h1>
        <p className="text-ink-50 mt-1 text-sm">
          Plano, avisos e integrações. Equipe e página pública agora têm telas próprias.
        </p>
      </div>

      <PlanCard tenant={tenant} />

      <NotificationsCard
        webhooksEnabled={hasFeature(tenant.subscription, 'webhooks')}
        notificationWebhookUrl={tenant.notificationWebhookUrl}
        reminderMinutesBefore={tenant.reminderMinutesBefore}
        handoffEmailEnabled={tenant.handoffEmailEnabled}
        ownerAppointmentEmailsEnabled={tenant.ownerAppointmentEmailsEnabled}
        ownerWhatsappAlertsEnabled={tenant.ownerWhatsappAlertsEnabled}
        reminderTemplateName={tenant.reminderTemplateName}
        reminderTemplateLanguage={tenant.reminderTemplateLanguage}
        cancelTemplateName={tenant.cancelTemplateName}
        cancelTemplateLanguage={tenant.cancelTemplateLanguage}
        rescheduleTemplateName={tenant.rescheduleTemplateName}
        rescheduleTemplateLanguage={tenant.rescheduleTemplateLanguage}
      />

      {/* Sem gate de plano: relatório é retenção pura, vale até no Solo. */}
      <WeeklyReportCard
        enabled={tenant.weeklyReportEnabled}
        channel={tenant.weeklyReportChannel}
        ownerWhatsappAlertsEnabled={tenant.ownerWhatsappAlertsEnabled}
      />

      {/* Sem gate de plano: retenção/receita pro dono, vale em todos os planos. */}
      <ReturnReminderCard enabled={tenant.returnRemindersEnabled} />

      {hasWaitlist(tenant.subscription) && (
        <WaitlistCard
          enabled={tenant.waitlistEnabled}
          windowMinutes={tenant.waitlistWindowMinutes}
          notifyAllAtOnce={tenant.waitlistNotifyAllAtOnce}
        />
      )}

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

      <SupportCard />

      <TimezoneCard timezone={tenant.timezone} />
    </div>
  );
}
