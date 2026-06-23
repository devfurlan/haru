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

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  // Saudação calorosa e em linguagem simples. Usa o primeiro nome de quem
  // escreveu (quando o WhatsApp manda) pra soar como gente, não como robô.
  const firstName = contactName?.trim().split(/\s+/)[0];
  const hello = firstName ? `Oi, ${firstName}! 😊` : 'Oi! 😊';
  const place = tenant?.name ? ` Aqui é da *${tenant.name}*.` : '';
  const body =
    `${hello}${place} Que bom falar com você!\n\n` +
    'É bem fácil: toca num dos botões aqui embaixo 👇 que eu te ajudo.';
  const buttons: InteractiveButton[] = [
    { type: 'reply', reply: { id: 'schedule', title: 'Marcar horário' } },
    { type: 'reply', reply: { id: 'services', title: 'Ver serviços' } },
  ];

  await sendInteractiveButtons(phoneNumberId, phone, body, buttons);
  await saveMessage(conversationId, 'OUTBOUND', formatInteractiveContent(body, buttons));
}

/**
 * Lista os serviços ativos do tenant e oferece o próximo passo (agendar).
 * Mantém o estado em `menu` para que esses botões sigam roteando pelo switch
 * do webhook.
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
    const body =
      'Pode deixar! 😊 Ainda estou organizando a lista de serviços por aqui.\n\n' +
      'Mas relaxa: é só tocar no botão que eu já te ajudo a marcar seu horário.';
    const buttons: InteractiveButton[] = [
      { type: 'reply', reply: { id: 'schedule', title: 'Marcar horário' } },
    ];
    await sendInteractiveButtons(phoneNumberId, phone, body, buttons);
    await saveMessage(conversationId, 'OUTBOUND', formatInteractiveContent(body, buttons));
    return;
  }

  const list = services
    .map((s) => {
      const desc = s.description ? `\n  ${s.description}` : '';
      return `*${s.name}* - ${formatDuration(s.durationMinutes)} · ${formatBRL(s.priceCents)}${desc}`;
    })
    .join('\n\n');

  const body = `Olha o que a gente faz pra você 😊\n\n${list}\n\nGostou? É só tocar no botão aqui embaixo que eu marco seu horário 👇`;
  const buttons: InteractiveButton[] = [
    { type: 'reply', reply: { id: 'schedule', title: 'Marcar horário' } },
  ];

  await sendInteractiveButtons(phoneNumberId, phone, body, buttons);
  await saveMessage(conversationId, 'OUTBOUND', formatInteractiveContent(body, buttons));
}
