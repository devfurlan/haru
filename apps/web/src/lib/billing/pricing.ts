/**
 * Constantes de precificação compartilhadas entre a LP (client) e o checkout (server).
 * Vive aqui (não em @haru/billing) porque aquele barrel puxa o prisma e não é
 * client-safe, e este valor é consumido tanto na página de preços quanto na cobrança.
 */

/**
 * Addon "Atendente IA no WhatsApp" - fonte de verdade dos preços (doc canônico jul/2026,
 * "modelo consolidado"). Não há tabela no banco pra isso ainda; são 3 tiers fixos.
 * ponytail: constante em código; vira model Addon no Prisma só quando precisar editar
 * sem deploy / fazer gating por addon.
 */
export interface AiAddonTier {
  key: string;
  name: string;
  priceMonthlyCents: number;
  conversationsPerMonth: number;
}

export const AI_ADDON_TIERS: AiAddonTier[] = [
  { key: 'solo', name: 'Bot Solo', priceMonthlyCents: 9900, conversationsPerMonth: 500 },
  { key: 'time', name: 'Bot Time', priceMonthlyCents: 24900, conversationsPerMonth: 2000 },
  { key: 'multi', name: 'Bot Multi', priceMonthlyCents: 59900, conversationsPerMonth: 5000 },
];

/**
 * Setup do addon: cobrado SEMPRE (inclusive no plano anual) - paga o trabalho real de
 * configuração da WABA. Nunca é perdoado.
 */
export const AI_ADDON_SETUP_CENTS = 149700;

/**
 * Parcela do "anual 12x no cartão" (à vista com as taxas de gateway repassadas), por tier.
 * Vem da tabela de parcelamento do gateway - NÃO deriva de fórmula limpa sobre o anual
 * (juros por parcela variam), por isso é dado, não cálculo. Valores do doc jul/2026.
 * ponytail: mapa fixo por tier; vira Plan.priceAnnualInstallmentCents se precisar editar
 * sem deploy.
 */
export const PLAN_INSTALLMENT_CENTS: Record<string, number> = {
  ESSENCIAL: 6115,
  PROFISSIONAL: 19508,
  NEGOCIO: 48770,
};
