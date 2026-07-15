import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ADDON_TIER_LABEL, TIER_LABEL } from '@/lib/billing-lite';
import { STATUS_LABEL, STATUS_VARIANT } from '@/lib/labels';
import { getTenantDetail, listPlans } from '@/lib/tenant-queries';

import { AddonSection } from './sections/addon-section';
import { LimitsForm } from './sections/limits-form';
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
  // Todos os planos do catálogo (públicos + personalizados): a atribuição é por plano
  // específico, não por tier. Públicos primeiro, depois os custom.
  const planChoices = [...plans]
    .sort((a, b) => Number(b.active) - Number(a.active) || a.displayOrder - b.displayOrder)
    .map((p) => ({ id: p.id, name: p.name, tier: p.tier, active: p.active }));

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
            reminderMinutesBefore: tenant.reminderMinutesBefore,
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
          plans={planChoices}
          subscription={
            sub
              ? {
                  planTier: sub.planTier,
                  planId: sub.planId,
                  status: sub.status,
                  billingCycle: sub.billingCycle,
                  priceCents: sub.priceCents,
                }
              : null
          }
        />
      </Section>

      <Section
        title="Atendente IA (addon)"
        description="Ativação do bot no número próprio (2º passo): ative depois de concluir a WABA na Meta."
      >
        <AddonSection
          tenantId={tenant.id}
          addonTierLabel={sub?.addonTier ? ADDON_TIER_LABEL[sub.addonTier] : null}
          channel={sub?.addonChannel ?? null}
          setupCharged={sub?.addonSetupChargedAt != null}
          activated={sub?.addonActivatedAt != null}
        />
      </Section>

      <Section
        title="Limites de equipe"
        description="Tetos de profissionais (com agenda) e recepcionistas (sem agenda). Override por cliente."
      >
        <LimitsForm
          tenantId={tenant.id}
          limits={
            sub
              ? { maxProfessionals: sub.maxProfessionals, maxReceptionists: sub.maxReceptionists }
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
            isProfessional: u.isProfessional,
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
