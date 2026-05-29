import { formatBRL, formatDuration } from '../lib/format.js';
import prisma from '../lib/prisma.js';
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

/**
 * Lista os serviços ativos do tenant e oferece os próximos passos (agendar /
 * atendente). Mantém o estado em `menu` para que esses botões sigam roteando
 * pelo switch do webhook.
 */
export async function sendServices(
  tenantId: string,
  phoneNumberId: string,
  phone: string,
  contactName?: string,
) {
  const { conversationId } = await getOrCreateConversation(tenantId, phone, contactName);

  const services = await prisma.service.findMany({
    where: { tenantId, active: true },
    orderBy: { name: 'asc' },
  });

  if (services.length === 0) {
    const body = 'Ainda não temos serviços cadastrados. Se quiser, posso te passar pra um atendente.';
    const buttons: InteractiveButton[] = [
      { type: 'reply', reply: { id: 'support', title: 'Falar com atendente' } },
    ];
    await sendInteractiveButtons(phoneNumberId, phone, body, buttons);
    await saveMessage(conversationId, 'OUTBOUND', formatInteractiveContent(body, buttons));
    return;
  }

  const list = services
    .map((s) => {
      const desc = s.description ? `\n  ${s.description}` : '';
      return `*${s.name}* — ${formatDuration(s.durationMinutes)} · ${formatBRL(s.priceCents)}${desc}`;
    })
    .join('\n\n');

  const body = `Esses são os nossos serviços:\n\n${list}`;
  const buttons: InteractiveButton[] = [
    { type: 'reply', reply: { id: 'schedule', title: 'Agendar horário' } },
    { type: 'reply', reply: { id: 'support', title: 'Falar com atendente' } },
  ];

  await sendInteractiveButtons(phoneNumberId, phone, body, buttons);
  await saveMessage(conversationId, 'OUTBOUND', formatInteractiveContent(body, buttons));
}
