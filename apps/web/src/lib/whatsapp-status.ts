// URL pública do webhook do bot (Railway). Não é segredo - é o endpoint que a
// Meta chama. Usada no guia de conexão em /settings.
export const BOT_WEBHOOK_URL = 'https://demandae-bot.up.railway.app/webhook';

/**
 * Um tenant só recebe mensagens do bot quando tem phone_number_id E access_token.
 * Sem os dois, o webhook é descartado (sem token não dá pra responder; sem
 * phone_number_id o roteador não acha o tenant).
 */
export function isWhatsappConnected(tenant: {
  whatsappPhoneNumberId: string | null;
  whatsappAccessToken: string | null;
}): boolean {
  return Boolean(tenant.whatsappPhoneNumberId && tenant.whatsappAccessToken);
}
