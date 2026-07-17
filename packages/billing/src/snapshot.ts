import type { AddonPlan, BillingCycle, Plan } from '@haru/database';

/**
 * Valor de UMA cobrança no ciclo escolhido (é o que fica congelado no snapshot):
 * - MONTHLY: mensalidade.
 * - ANNUAL: total anual à vista (cobrado 1x).
 * - ANNUAL_INSTALLMENTS: valor de cada uma das 12 parcelas.
 */
function priceForCycle(
  monthly: number,
  annual: number,
  installment: number,
  cycle: BillingCycle,
): number {
  switch (cycle) {
    case 'ANNUAL':
      return annual;
    case 'ANNUAL_INSTALLMENTS':
      return installment;
    case 'MONTHLY':
      return monthly;
  }
}

/**
 * Campos de snapshot gravados na `Subscription` a partir de um `Plan` + ciclo.
 * Congelam os termos contratados (grandfather): editar o Plan depois NÃO altera
 * quem já assina, porque o gating lê estes campos da Subscription, não do Plan.
 */
export interface PlanSnapshot {
  priceCents: number;
  /** Cota mensal de lembretes por WhatsApp (única quota do plano base). null = ilimitado. */
  whatsappRemindersLimit: number | null;
  /** Máximo de profissionais (usuários com agenda própria). null = ilimitado. */
  maxProfessionals: number | null;
  /** Máximo de recepcionistas (usuários de apoio, sem agenda). null = ilimitado. */
  maxReceptionists: number | null;
  featOnlinePayments: boolean;
  featWebhooks: boolean;
  featTeam: boolean;
  /** Fila de espera. Vem do plano contratado (não do tier) - ver Plan.waitlist. */
  featWaitlist: boolean;
  /** Clube de assinatura + pacotes. Vem do plano contratado (não do tier). */
  featServiceSubscriptions: boolean;
  /** Comissões/financeiro por profissional. Vem do plano contratado (não do tier). */
  featCommissions: boolean;
}

/** Deriva o snapshot dos termos a partir do Plan vigente e do ciclo de cobrança. */
export function snapshotPlan(plan: Plan, cycle: BillingCycle): PlanSnapshot {
  return {
    priceCents: priceForCycle(
      plan.priceMonthlyCents,
      plan.priceAnnualCents,
      plan.priceAnnualInstallmentCents,
      cycle,
    ),
    whatsappRemindersLimit: plan.whatsappRemindersPerMonth,
    maxProfessionals: plan.maxProfessionals,
    maxReceptionists: plan.maxReceptionists,
    featOnlinePayments: plan.onlinePayments,
    featWebhooks: plan.webhooks,
    featTeam: plan.team,
    featWaitlist: plan.waitlist,
    featServiceSubscriptions: plan.serviceSubscriptions,
    featCommissions: plan.commissions,
  };
}

/**
 * Campos `addon*` gravados na `Subscription` na ativação do addon. Mesmo grandfather
 * do plano: congelam preço + teto de conversas + setup. O gating (isAddonActive,
 * uso de conversas) lê daqui, não do `AddonPlan` ao vivo. O caller ainda seta
 * `addonTier`, `addonBillingCycle`, `addonActivatedAt` e `addonSetupChargedAt`.
 */
export interface AddonSnapshot {
  addonPriceCents: number;
  addonSetupFeeCents: number;
  addonConversationsLimit: number | null;
}

/** Deriva o snapshot do addon a partir do AddonPlan vigente e do ciclo de cobrança. */
export function snapshotAddon(addon: AddonPlan, cycle: BillingCycle): AddonSnapshot {
  return {
    addonPriceCents: priceForCycle(
      addon.priceMonthlyCents,
      addon.priceAnnualCents,
      addon.priceAnnualInstallmentCents,
      cycle,
    ),
    addonSetupFeeCents: addon.setupFeeCents,
    addonConversationsLimit: addon.conversationsPerMonth,
  };
}
