import type { PlanTier } from '@haru/database';

/**
 * Chaves de feature controladas por plano. Esta é a única parte do catálogo que
 * vive em código (estrutural) - os VALORES (preços/limites/flags) ficam no banco
 * (model `Plan`) e são fotografados na `Subscription`.
 */
export type FeatureKey = 'onlinePayments' | 'webhooks' | 'team';

/** Nome amigável (PT-BR) de cada tier, para mensagens de upgrade. */
export const TIER_LABEL: Record<PlanTier, string> = {
  ESSENCIAL: 'Essencial',
  PROFISSIONAL: 'Profissional',
  NEGOCIO: 'Negócio',
  ENTERPRISE: 'Enterprise',
};

/** Tier mínimo que libera cada feature - usado em mensagens "Disponível no plano X". */
export const FEATURE_MIN_TIER: Record<FeatureKey, PlanTier> = {
  onlinePayments: 'PROFISSIONAL',
  webhooks: 'PROFISSIONAL',
  team: 'PROFISSIONAL',
};
