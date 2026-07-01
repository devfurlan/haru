/**
 * Constantes de precificação compartilhadas entre a LP (client) e o checkout (server).
 * Vive aqui (não em @haru/billing) porque aquele barrel puxa o prisma e não é
 * client-safe, e este valor é consumido tanto na página de preços quanto na cobrança.
 */

/**
 * Setup único (configuração assistida do WhatsApp): cobrado uma vez na 1ª fatura do
 * plano MENSAL e grátis no ANUAL. Fixo e igual em todos os planos.
 * ponytail: constante única; vira Plan.setupFeeCents só se variar por tier.
 */
export const SETUP_FEE_CENTS = 29700;
