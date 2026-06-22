import type { BillingCycle, Plan } from '@haru/database';

/**
 * Campos de snapshot gravados na `Subscription` a partir de um `Plan` + ciclo.
 * Congelam os termos contratados (grandfather): editar o Plan depois NÃO altera
 * quem já assina, porque o gating lê estes campos da Subscription, não do Plan.
 */
export interface PlanSnapshot {
  priceCents: number;
  appointmentsLimit: number | null;
  aiMessagesLimit: number | null;
  maxStaff: number | null;
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
    maxStaff: plan.maxStaff,
    featOnlinePayments: plan.onlinePayments,
    featWebhooks: plan.webhooks,
    featTeam: plan.team,
  };
}
