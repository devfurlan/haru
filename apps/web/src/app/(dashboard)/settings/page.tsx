import { requireAdmin } from '@/lib/auth';
import { getBaseUrl } from '@/lib/base-url';

import { NotificationsCard } from './notifications-card';
import { PaymentsCard } from './payments-card';
import { PlanCard } from './plan-card';
import { TimezoneCard } from './timezone-card';

export default async function SettingsPage() {
  const { tenant } = await requireAdmin();
  const webhookBaseUrl = await getBaseUrl();

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <div>
        <h1 className="font-serif text-[28px] tracking-tight text-ink">Configurações</h1>
        <p className="mt-1 text-sm text-ink-50">
          Plano, avisos e integrações. Equipe e página pública agora têm telas próprias.
        </p>
      </div>

      <PlanCard tenant={tenant} />

      <NotificationsCard
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

      <div
        className="flex flex-wrap items-center gap-3.5 rounded-2xl p-[18px] text-on-emerald"
        style={{
          background:
            'radial-gradient(420px 220px at 15% -20%, rgba(47,211,122,.14), transparent 60%), var(--emerald)',
        }}
      >
        <div className="min-w-[220px] flex-1">
          <div className="font-serif text-[17px]">
            Precisa de uma <em className="text-green-bright">mão</em>?
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-on-emerald-mut">
            Suporte de gente de verdade, em português - quem responde é o fundador. Use o balão de
            suporte no canto da tela, sem robô e sem fila.
          </p>
        </div>
      </div>

      <TimezoneCard timezone={tenant.timezone} />
    </div>
  );
}
