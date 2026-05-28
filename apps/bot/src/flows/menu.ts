import {
  formatInteractiveContent,
  sendInteractiveButtons,
} from '../lib/whatsapp/client.js';
import type { InteractiveButton } from '../lib/whatsapp/types.js';
import { setConversation } from '../lib/redis.js';
import { getOrCreateConversation, saveMessage } from '../services/chatHistoryService.js';

/**
 * Mensagem de boas-vindas com botões iniciais. Disparada na primeira
 * interação ou quando o cliente envia algo fora de um fluxo ativo.
 */
export async function sendMenu(
  tenantId: string,
  phoneNumberId: string,
  phone: string,
  contactName?: string,
) {
  const { conversationId, contactId } = await getOrCreateConversation(
    tenantId,
    phone,
    contactName,
  );

  await setConversation(phoneNumberId, phone, {
    tenantId,
    flow: 'menu',
    conversationId,
    contactId,
    createdAt: new Date().toISOString(),
  });

  const body = 'Olá! Como posso te ajudar?';
  const buttons: InteractiveButton[] = [
    { type: 'reply', reply: { id: 'schedule', title: 'Agendar horário' } },
    { type: 'reply', reply: { id: 'services', title: 'Ver serviços' } },
    { type: 'reply', reply: { id: 'support', title: 'Falar com atendente' } },
  ];

  await sendInteractiveButtons(phoneNumberId, phone, body, buttons);
  await saveMessage(conversationId, 'OUTBOUND', formatInteractiveContent(body, buttons));
}
