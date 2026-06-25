/**
 * `@haru/billing` - planos/assinatura do SaaS, compartilhado entre `apps/web`
 * (gating nas server actions, banner de uso) e `apps/bot` (status da assinatura).
 *
 * O catálogo de planos é DINÂMICO (model `Plan` no banco). A `Subscription`
 * fotografa os termos na contratação; o gating sempre lê do snapshot, garantindo
 * que reprecificar um Plan não muda quem já assina (grandfather).
 */

export { type FeatureKey, TIER_LABEL, FEATURE_MIN_TIER } from './types';

export { type PlanSnapshot, snapshotPlan } from './snapshot';

export {
  type TenantWithSubscription,
  type UsageMetric,
  type UsageStatus,
  isSubscriptionActive,
  hasFeature,
  getProfessionalUsage,
  getReceptionistUsage,
  canAddProfessional,
  canAddReceptionist,
  getMonthlyAppointmentUsage,
  getMonthlyAiUsage,
  getUsageStatus,
  alertLevel,
} from './gating';
