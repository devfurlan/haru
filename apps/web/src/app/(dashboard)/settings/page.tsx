import { requireUserAndTenant } from '@/lib/auth';

import { NotificationsCard } from './notifications-card';
import { PasswordCard } from './password-card';
import { ProfileCard } from './profile-card';
import { TenantCard } from './tenant-card';
import { WhatsappCard } from './whatsapp-card';

export default async function SettingsPage() {
  const user = await requireUserAndTenant();
  const { tenant } = user;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Seu perfil, dados do estabelecimento e integrações.
        </p>
      </div>

      <ProfileCard name={user.name} email={user.email} />

      <PasswordCard />

      <TenantCard
        tenantId={tenant.id}
        name={tenant.name}
        slug={tenant.slug}
        timezone={tenant.timezone}
        address={tenant.address}
        logoUrl={tenant.logoUrl}
      />

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
