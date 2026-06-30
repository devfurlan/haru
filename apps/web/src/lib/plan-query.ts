import type { PlanTier } from '@haru/database';

/**
 * Tiers contratáveis no self-serve (Enterprise = sob consulta, fora do fluxo). A home
 * manda `?plano=<tier>` no link "Começar" dos cards; signup e /assinatura leem daqui
 * para pré-selecionar o plano escolhido. Tolerante: valor ausente/inválido vira null.
 */
const SELF_SERVE_TIERS = ['ESSENCIAL', 'PROFISSIONAL', 'NEGOCIO'] as const;

/** Normaliza o `?plano=` da URL (case-insensitive) num PlanTier self-serve, ou null. */
export function parsePlanParam(raw: string | string[] | null | undefined): PlanTier | null {
  const first = Array.isArray(raw) ? raw[0] : raw;
  const value = first?.trim().toUpperCase();
  return value && (SELF_SERVE_TIERS as readonly string[]).includes(value)
    ? (value as PlanTier)
    : null;
}
