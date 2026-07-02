import { prisma } from '@haru/database';
import { TIER_LABEL } from '@haru/billing';

import { requireAdmin } from '@/lib/auth';
import { parsePlanParam } from '@/lib/plan-query';

import { BillingHistory } from './billing-history';
import { ManageSubscription } from './manage-subscription';
import { SubscribeForm, type PlanOption } from './subscribe-form';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativa',
  PAST_DUE: 'Pagamento pendente',
  PENDING: 'Aguardando pagamento',
  SUSPENDED: 'Suspensa',
  CANCELED: 'Cancelada',
};

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const { tenant } = await requireAdmin();
  const sub = tenant.subscription;
  const preselectedTier = parsePlanParam((await searchParams).plano);

  // Planos contratáveis no self-serve: ativos e com preço (Enterprise = sob consulta,
  // fora do self-serve; contato pelo banner da landing).
  const plans = await prisma.plan.findMany({
    where: { active: true, priceMonthlyCents: { gt: 0 } },
    orderBy: { displayOrder: 'asc' },
    select: { tier: true, name: true, priceMonthlyCents: true, priceAnnualCents: true },
  });

  const options: PlanOption[] = plans.map((p) => ({
    tier: p.tier,
    name: p.name,
    priceMonthlyCents: p.priceMonthlyCents,
    priceAnnualCents: p.priceAnnualCents,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Assinatura</h1>
        <p className="text-muted-foreground text-sm">
          {sub
            ? `Plano atual: ${TIER_LABEL[sub.planTier]} · ${STATUS_LABEL[sub.status] ?? sub.status}.`
            : 'Escolha um plano para ativar o Demandaê.'}
        </p>
      </div>

      {sub?.status === 'ACTIVE' ? (
        <ManageSubscription
          plans={options}
          currentTier={sub.planTier}
          currentCycle={sub.billingCycle}
          periodEndISO={sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null}
        />
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
            setupAlreadyCharged={Boolean(sub?.setupChargedAt)}
          />
          <p className="text-muted-foreground text-xs">
            Garantia de 30 dias: se não curtir, devolvemos o valor integral. Pagamentos processados
            pelo Asaas - não armazenamos os dados do seu cartão.
          </p>
        </>
      )}

      {sub?.asaasSubscriptionId && <BillingHistory asaasSubscriptionId={sub.asaasSubscriptionId} />}
    </div>
  );
}
