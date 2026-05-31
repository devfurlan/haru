import { prisma } from '@haru/database';

import { requireAdmin } from '@/lib/auth';

import { NotificationsCard } from './notifications-card';
import { PublicBookingCard } from './public-booking-card';
import { UsersCard, type UserRow } from './users-card';
import { WhatsappCard } from './whatsapp-card';

export default async function SettingsPage() {
  const { id: currentUserId, tenant } = await requireAdmin();

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
