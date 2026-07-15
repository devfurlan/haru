import { prisma } from '@haru/database';
import {
  ADDON_TIER_LABEL,
  TIER_LABEL,
  getAddonUsageStatus,
  getUsageStatus,
  isAddonActive,
  isSubscriptionActive,
} from '@haru/billing';

import { requireAdmin } from '@/lib/auth';
import { parsePlanParam } from '@/lib/plan-query';

import { BillingDashboard, type AddonOffer } from './billing-dashboard';
import { BillingHistory } from './billing-history';
import { SubscribeForm, type PlanOption } from './subscribe-form';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativa',
  PAST_DUE: 'Pagamento em atraso',
  PENDING: 'Aguardando pagamento',
  SUSPENDED: 'Suspensa',
  CANCELED: 'Cancelada',
};

const CYCLE_LABEL: Record<string, string> = {
  MONTHLY: 'mensal',
  ANNUAL: 'anual à vista',
  ANNUAL_INSTALLMENTS: 'anual 12x',
};

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const { tenant } = await requireAdmin();
  const sub = tenant.subscription;
  const preselectedTier = parsePlanParam((await searchParams).plano);

  // Planos contratáveis no self-serve: ativos e com preço (Enterprise = sob consulta).
  const plans = await prisma.plan.findMany({
    where: { active: true, priceMonthlyCents: { gt: 0 } },
    orderBy: { displayOrder: 'asc' },
    select: {
      tier: true,
      name: true,
      priceMonthlyCents: true,
      priceAnnualCents: true,
      priceAnnualInstallmentCents: true,
    },
  });

  const options: PlanOption[] = plans.map((p) => ({
    tier: p.tier,
    name: p.name,
    priceMonthlyCents: p.priceMonthlyCents,
    priceAnnualCents: p.priceAnnualCents,
    priceAnnualInstallmentCents: p.priceAnnualInstallmentCents,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Assinatura</h1>
        {sub?.status !== 'ACTIVE' && (
          <p className="text-muted-foreground text-sm">
            {sub
              ? `Plano ${TIER_LABEL[sub.planTier]} · ${STATUS_LABEL[sub.status] ?? sub.status}.`
              : 'Escolha um plano para ativar o Demandaê.'}
          </p>
        )}
      </div>

      {/* Cancelada MAS com acesso até o fim do período pago também renderiza o painel (mostra
          "Cancelada · ativa até X" + Reativar). Só cai no formulário quando não há acesso. */}
      {sub && isSubscriptionActive(sub) ? (
        await renderDashboard(tenant, sub, options)
      ) : (
        <>
          {sub?.status === 'CANCELED' &&
            sub.currentPeriodEnd &&
            sub.currentPeriodEnd.getTime() > Date.now() && (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                Sua assinatura foi cancelada e o acesso vai até{' '}
                {sub.currentPeriodEnd.toLocaleDateString('pt-BR')}. Contrate de novo abaixo para
                reativar.
              </p>
            )}
          <SubscribeForm
            plans={options}
            currentTier={sub?.planTier ?? null}
            preselectedTier={preselectedTier}
            currentStatus={sub?.status ?? null}
          />
          <p className="text-muted-foreground text-xs">
            Garantia de 30 dias: se não curtir, devolvemos o valor integral. Pagamentos processados
            pelo Asaas - não armazenamos os dados do seu cartão.
          </p>
        </>
      )}

      <div id="faturas">
        {sub?.asaasSubscriptionId && (
          <BillingHistory asaasSubscriptionId={sub.asaasSubscriptionId} />
        )}
      </div>
    </div>
  );
}

/**
 * Monta os dados do dashboard de billing (plano, uso do ciclo, addon, downgrade agendado)
 * e renderiza a UI client. Isolado numa função para manter o corpo da página enxuto.
 */
async function renderDashboard(
  tenant: Parameters<typeof getUsageStatus>[0],
  sub: NonNullable<Awaited<ReturnType<typeof requireAdmin>>['tenant']['subscription']>,
  options: PlanOption[],
) {
  const addonActive = isAddonActive(sub);

  const [usage, conversations, addonPlans] = await Promise.all([
    getUsageStatus(tenant),
    addonActive ? getAddonUsageStatus(tenant) : Promise.resolve(null),
    prisma.addonPlan.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        name: true,
        priceMonthlyCents: true,
        conversationsPerMonth: true,
        setupFeeCents: true,
      },
    }),
  ]);

  const addonOffer: AddonOffer[] = addonPlans.map((a) => ({
    name: a.name,
    priceMonthlyCents: a.priceMonthlyCents,
    conversationsPerMonth: a.conversationsPerMonth,
    setupFeeCents: a.setupFeeCents,
  }));

  const pendingChange = sub.pendingPlanTier
    ? {
        planName:
          options.find((o) => o.tier === sub.pendingPlanTier)?.name ??
          TIER_LABEL[sub.pendingPlanTier],
        cycleLabel: CYCLE_LABEL[sub.pendingBillingCycle ?? sub.billingCycle],
      }
    : null;

  // Número próprio escolhido mas ainda não ativo: aguardando pagar o setup, ou aguardando a
  // config/verificação da WABA pela equipe (setup já pago). Só o canal OWN tem esse limbo.
  const addonPending: 'setup_payment' | 'verification' | null =
    !addonActive && sub.addonChannel === 'OWN' && sub.addonTier != null && sub.addonActivatedAt == null
      ? sub.addonSetupChargedAt != null
        ? 'verification'
        : 'setup_payment'
      : null;

  return (
    <BillingDashboard
      currentTier={sub.planTier}
      currentPlanName={TIER_LABEL[sub.planTier]}
      currentCycle={sub.billingCycle}
      status={sub.status}
      paymentMethod={sub.paymentMethod}
      cardLast4={sub.cardLast4}
      cardBrand={sub.cardBrand}
      priceCents={sub.priceCents}
      nextChargeISO={sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null}
      guaranteeUntilISO={sub.guaranteeUntil ? sub.guaranteeUntil.toISOString() : null}
      plans={options}
      whatsappReminders={usage.whatsappReminders}
      conversations={conversations}
      addonActive={addonActive}
      addonName={sub.addonTier ? ADDON_TIER_LABEL[sub.addonTier] : null}
      addonDeactivateScheduled={addonActive && sub.addonCanceledAt != null}
      addonPending={addonPending}
      addonOffer={addonOffer}
      pendingChange={pendingChange}
    />
  );
}
