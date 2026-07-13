/**
 * `@haru/billing` - planos/assinatura do SaaS, compartilhado entre `apps/web`
 * (gating nas server actions, banner de uso) e `apps/bot` (status da assinatura).
 *
 * O catálogo (planos base + addon) é DINÂMICO (models `Plan`/`AddonPlan` no banco).
 * A `Subscription` fotografa os termos na contratação (colunas do plano + colunas
 * `addon*`); o gating sempre lê do snapshot, garantindo que reprecificar não muda
 * quem já assina (grandfather). O addon "Atendente IA no WhatsApp" tem tier e teto
 * de conversas PRÓPRIOS, independentes do plano base.
 */

export {
  type FeatureKey,
  type PlanFeatureKey,
  TIER_LABEL,
  ADDON_TIER_LABEL,
  FEATURE_MIN_TIER,
} from './types';

export { type PlanSnapshot, type AddonSnapshot, snapshotPlan, snapshotAddon } from './snapshot';

export {
  type TenantWithSubscription,
  type UsageMetric,
  type UsageStatus,
  type UsageAlertMetric,
  type PendingUsageAlert,
  isSubscriptionActive,
  isAddonActive,
  canConnectOwnWhatsapp,
  recurringValueCents,
  prorataCents,
  hasFeature,
  hasWaitlist,
  getProfessionalUsage,
  getReceptionistUsage,
  canAddProfessional,
  canAddReceptionist,
  cycleWindow,
  getMonthlyAppointmentUsage,
  getMonthlyAiUsage,
  getMonthlyConversationUsage,
  getUsageStatus,
  getAddonUsageStatus,
  isOverLimit,
  alertLevel,
  isFairUse,
  isAppointmentLimitReached,
  nextUsageAlerts,
  markUsageAlertSent,
} from './gating';
