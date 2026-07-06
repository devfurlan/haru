import type { AddonTier, PlanTier } from '@haru/database';

/**
 * Features booleanas do PLANO base (flags gravadas no snapshot da Subscription).
 * Os VALORES (preços/limites/flags) ficam no banco (`Plan`) e são fotografados na
 * `Subscription`; só as CHAVES (estrutura) vivem em código.
 */
export type PlanFeatureKey = 'onlinePayments' | 'webhooks' | 'team';

/**
 * Chaves de feature controladas por assinatura. `aiAttendant` (o addon do bot) NÃO é
 * liberado por tier de plano e sim por uma assinatura de addon ativa - por isso não
 * aparece em FEATURE_MIN_TIER. `team` = capacidade de múltiplos profissionais.
 */
export type FeatureKey = PlanFeatureKey | 'aiAttendant';

/** Nome amigável (PT-BR) de cada tier de plano, para mensagens de upgrade. */
export const TIER_LABEL: Record<PlanTier, string> = {
  ESSENCIAL: 'Solo',
  PROFISSIONAL: 'Time',
  NEGOCIO: 'Multi',
  ENTERPRISE: 'Custom',
};

/** Nome amigável (PT-BR) de cada tier do addon "Atendente IA no WhatsApp". */
export const ADDON_TIER_LABEL: Record<AddonTier, string> = {
  BOT_SOLO: 'Bot Solo',
  BOT_TIME: 'Bot Time',
  BOT_MULTI: 'Bot Multi',
};

/** Tier mínimo que libera cada feature de plano - p/ mensagens "Disponível no plano X". */
export const FEATURE_MIN_TIER: Record<PlanFeatureKey, PlanTier> = {
  onlinePayments: 'PROFISSIONAL',
  webhooks: 'PROFISSIONAL',
  team: 'PROFISSIONAL',
};
