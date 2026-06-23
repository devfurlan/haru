import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TIER_LABEL } from '@/lib/billing-lite';
import { STATUS_LABEL, STATUS_VARIANT } from '@/lib/labels';
import { getTenantDetail, listPlans } from '@/lib/tenant-queries';

import { OperationForm } from './sections/operation-form';
import { PaymentsForm } from './sections/payments-form';
import { PlanForm } from './sections/plan-form';
import { ProfileForm } from './sections/profile-form';
import { TeamSection } from './sections/team-section';
import { WhatsappForm } from './sections/whatsapp-form';

export const dynamic = 'force-dynamic';

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tenant, plans] = await Promise.all([getTenantDetail(id), listPlans()]);
  if (!tenant) notFound();

  const sub = tenant.subscription;
  const tiers = plans.length > 0 ? plans.map((p) => p.tier) : (['ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO', 'ENTERPRISE'] as const);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Clientes
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold">{tenant.name}</h1>
          {sub && <Badge variant={STATUS_VARIANT[sub.status]}>{STATUS_LABEL[sub.status]}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          /{tenant.slug}
          {sub && <> · {TIER_LABEL[sub.planTier]}</>}
        </p>
      </div>

      <Section title="Perfil do negócio">
        <ProfileForm
          tenantId={tenant.id}
          values={{
            name: tenant.name,
            slug: tenant.slug,
            address: tenant.address,
            description: tenant.description,
            whatsappAbout: tenant.whatsappAbout,
            email: tenant.email,
          }}
        />
      </Section>

      <Section title="Operação" description="Fuso, agendamento público, notificações e templates.">
        <OperationForm
          tenantId={tenant.id}
          values={{
            timezone: tenant.timezone,
            publicBookingEnabled: tenant.publicBookingEnabled,
            publicBookingConfirmation: tenant.publicBookingConfirmation,
            notificationWebhookUrl: tenant.notificationWebhookUrl,
            reminderHoursBefore: tenant.reminderHoursBefore,
            reminderTemplateName: tenant.reminderTemplateName,
            reminderTemplateLanguage: tenant.reminderTemplateLanguage,
            cancelTemplateName: tenant.cancelTemplateName,
            cancelTemplateLanguage: tenant.cancelTemplateLanguage,
            rescheduleTemplateName: tenant.rescheduleTemplateName,
            rescheduleTemplateLanguage: tenant.rescheduleTemplateLanguage,
          }}
        />
      </Section>

      <Section title="WhatsApp" description="Credenciais da Cloud API (Embedded Signup).">
        <WhatsappForm
          tenantId={tenant.id}
          values={{
            whatsappPhoneNumberId: tenant.whatsappPhoneNumberId,
            whatsappBusinessAccountId: tenant.whatsappBusinessAccountId,
            whatsappDisplayPhone: tenant.whatsappDisplayPhone,
            hasToken: Boolean(tenant.whatsappAccessToken),
          }}
        />
      </Section>

      <Section title="Pagamentos" description="Gateway e credenciais (criptografadas at rest).">
        <PaymentsForm
          tenantId={tenant.id}
          values={{
            paymentProvider: tenant.paymentProvider,
            paymentSandbox: tenant.paymentSandbox,
            hasCredential: Boolean(
              tenant.paymentAsaasApiKeyEnc ||
                tenant.paymentMercadoPagoTokenEnc ||
                tenant.paymentPagBankTokenEnc ||
                tenant.paymentPagarmeApiKeyEnc,
            ),
            hasWebhookToken: Boolean(tenant.paymentWebhookTokenEnc),
          }}
        />
      </Section>

      <Section title="Plano / assinatura">
        <PlanForm
          tenantId={tenant.id}
          tiers={[...tiers]}
          subscription={
            sub
              ? {
                  planTier: sub.planTier,
                  status: sub.status,
                  billingCycle: sub.billingCycle,
                  priceCents: sub.priceCents,
                }
              : null
          }
        />
      </Section>

      <Section title="Equipe">
        <TeamSection
          tenantId={tenant.id}
          users={tenant.users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
          }))}
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
