import type { BillingCycle, Plan, PlanTier } from '@haru/database';

/**
 * Helpers de billing reimplementados localmente (espelham `@haru/billing`).
 * Não importamos o pacote porque o turbopack do Next não resolve seus imports
 * `.js` multi-arquivo. São funções/constantes puras — manter em paridade com
 * `packages/billing/src/{types,snapshot}.ts`.
 */

export const TIER_LABEL: Record<PlanTier, string> = {
  ESSENCIAL: 'Solo',
  PROFISSIONAL: 'Time',
  NEGOCIO: 'Multi',
  ENTERPRISE: 'Custom',
};

export interface PlanSnapshot {
  priceCents: number;
  appointmentsLimit: number | null;
  aiMessagesLimit: number | null;
  maxProfessionals: number | null;
  maxReceptionists: number | null;
  featOnlinePayments: boolean;
  featWebhooks: boolean;
  featTeam: boolean;
}

/** Deriva o snapshot dos termos a partir do Plan vigente e do ciclo de cobrança. */
export function snapshotPlan(plan: Plan, cycle: BillingCycle): PlanSnapshot {
  return {
    priceCents: cycle === 'ANNUAL' ? plan.priceAnnualCents : plan.priceMonthlyCents,
    appointmentsLimit: plan.appointmentsPerMonth,
    aiMessagesLimit: plan.aiMessagesPerMonth,
    maxProfessionals: plan.maxProfessionals,
    maxReceptionists: plan.maxReceptionists,
    featOnlinePayments: plan.onlinePayments,
    featWebhooks: plan.webhooks,
    featTeam: plan.team,
  };
}
