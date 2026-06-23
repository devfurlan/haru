import { prisma } from '@haru/database';
import type { BillingCycle, PlanTier } from '@haru/database';

/**
 * Métricas de receita recorrente da plataforma. MRR = soma do valor mensal
 * normalizado das assinaturas ATIVAS (anual ÷ 12). CANCELED dentro do período não
 * entra (não renova = churn em curso, contado à parte).
 */

function monthlyCents(priceCents: number, cycle: BillingCycle): number {
  return cycle === 'ANNUAL' ? Math.round(priceCents / 12) : priceCents;
}

export interface MrrTierRow {
  tier: PlanTier;
  count: number;
  mrrCents: number;
}

export interface MrrReport {
  activeCount: number;
  mrrCents: number;
  arrCents: number;
  arpuCents: number;
  /** MRR de assinaturas com cobrança real no Asaas (exclui grandfather). */
  billedMrrCents: number;
  /** MRR de assinaturas ativas sem cobrança no Asaas (grandfather/manual). */
  grandfatherMrrCents: number;
  /** Canceladas mas ainda no período pago (vão sair na renovação). */
  churningCount: number;
  /** Pagamento vencido (sem acesso, aguardando regularização). */
  pastDueCount: number;
  byTier: MrrTierRow[];
}

export async function getMrr(): Promise<MrrReport> {
  const subs = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    select: { planTier: true, billingCycle: true, priceCents: true, asaasSubscriptionId: true },
  });

  let mrrCents = 0;
  let billedMrrCents = 0;
  const tierMap = new Map<PlanTier, { count: number; mrrCents: number }>();

  for (const s of subs) {
    const m = monthlyCents(s.priceCents, s.billingCycle);
    mrrCents += m;
    if (s.asaasSubscriptionId) billedMrrCents += m;
    const t = tierMap.get(s.planTier) ?? { count: 0, mrrCents: 0 };
    t.count += 1;
    t.mrrCents += m;
    tierMap.set(s.planTier, t);
  }

  const activeCount = subs.length;
  const [churningCount, pastDueCount] = await Promise.all([
    prisma.subscription.count({ where: { status: 'CANCELED', currentPeriodEnd: { gt: new Date() } } }),
    prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
  ]);

  return {
    activeCount,
    mrrCents,
    arrCents: mrrCents * 12,
    arpuCents: activeCount ? Math.round(mrrCents / activeCount) : 0,
    billedMrrCents,
    grandfatherMrrCents: mrrCents - billedMrrCents,
    churningCount,
    pastDueCount,
    byTier: [...tierMap.entries()]
      .map(([tier, v]) => ({ tier, ...v }))
      .sort((a, b) => b.mrrCents - a.mrrCents),
  };
}
