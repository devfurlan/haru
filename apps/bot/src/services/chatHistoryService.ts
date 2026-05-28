import prisma from '../lib/prisma.js';

export type MessageDirection = 'INBOUND' | 'OUTBOUND';

/**
 * Acha ou cria o Contact + Conversation pra um (tenant, telefone). Retorna
 * ambos pra que o caller possa popular o ConversationState do Redis.
 */
export async function getOrCreateConversation(
  tenantId: string,
  phone: string,
  contactName?: string,
): Promise<{ contactId: string; conversationId: string }> {
  const contact = await prisma.contact.upsert({
    where: { tenantId_phone: { tenantId, phone } },
    update: contactName ? { name: contactName } : {},
    create: { tenantId, phone, name: contactName ?? null },
  });

  // Para começar simples, mantemos uma conversation "aberta" por contato.
  // Quando precisarmos de threads/sessões dá pra evoluir.
  const conversation =
    (await prisma.conversation.findFirst({
      where: { contactId: contact.id },
      orderBy: { updatedAt: 'desc' },
    })) ??
    (await prisma.conversation.create({
      data: { tenantId, contactId: contact.id },
    }));

  return { contactId: contact.id, conversationId: conversation.id };
}

export async function saveMessage(
  conversationId: string,
  direction: MessageDirection,
  body: string,
  waMessageId?: string,
) {
  // Cria a mensagem e atualiza updatedAt da Conversation no mesmo turno —
  // assim a listagem em /conversations pode ordenar pela atividade real.
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        direction,
        body,
        waMessageId: waMessageId ?? null,
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {}, // no-op força refresh do @updatedAt
    }),
  ]);
  return message;
}
