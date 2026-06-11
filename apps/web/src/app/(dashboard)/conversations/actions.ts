'use server';

import { prisma } from '@haru/database';
import type { MessageDirection } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';
import { sendManualWhatsappMessage } from '@/lib/notify';

export interface ConversationListItem {
  id: string;
  contactName: string | null;
  contactPhone: string;
  lastMessageBody: string | null;
  lastMessageAt: string | null;
  lastMessageDirection: MessageDirection | null;
  /// Quando chegou a última mensagem INBOUND (do cliente). Base pra "não-lida".
  lastInboundAt: string | null;
  /// Quando o usuário atual leu esta conversa pela última vez (null = nunca).
  lastReadAt: string | null;
  /// Modo humano ativo: o dono assumiu e o bot está em silêncio nesta conversa.
  handoffActive: boolean;
  /// Nome de quem assumiu a conversa (null = bot ativo / sem atribuição).
  handoffByName: string | null;
  updatedAt: string;
}

export interface ThreadMessage {
  id: string;
  direction: MessageDirection;
  body: string;
  createdAt: string;
}

/**
 * Lista as conversas do tenant ordenadas pela atividade mais recente, já com
 * a marca de leitura do usuário atual e o instante da última mensagem do
 * cliente — o front usa esses dois pra decidir "não-lida". Computado sem N+1:
 * uma query pra conversas (com contact, última msg e read do usuário) e uma
 * `groupBy` pro último INBOUND de cada conversa.
 */
export async function getConversationList(): Promise<ConversationListItem[]> {
  const { id: userId, tenant } = await requireUserAndTenant();

  const conversations = await prisma.conversation.findMany({
    where: { tenantId: tenant.id },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      reads: { where: { userId }, take: 1 },
      handoffBy: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  const ids = conversations.map((c) => c.id);
  const lastInboundByConv = new Map<string, Date>();
  if (ids.length > 0) {
    const grouped = await prisma.message.groupBy({
      by: ['conversationId'],
      where: { conversationId: { in: ids }, direction: 'INBOUND' },
      _max: { createdAt: true },
    });
    for (const g of grouped) {
      if (g._max.createdAt) lastInboundByConv.set(g.conversationId, g._max.createdAt);
    }
  }

  const now = new Date();
  return conversations.map((c) => {
    const last = c.messages[0] ?? null;
    const lastInbound = lastInboundByConv.get(c.id) ?? null;
    const handoffActive = c.handoffExpiresAt != null && c.handoffExpiresAt > now;
    return {
      id: c.id,
      contactName: c.contact.name,
      contactPhone: c.contact.phone,
      lastMessageBody: last?.body ?? null,
      lastMessageAt: last ? last.createdAt.toISOString() : null,
      lastMessageDirection: last?.direction ?? null,
      lastInboundAt: lastInbound ? lastInbound.toISOString() : null,
      lastReadAt: c.reads[0] ? c.reads[0].lastReadAt.toISOString() : null,
      handoffActive,
      handoffByName: handoffActive ? (c.handoffBy?.name ?? null) : null,
      updatedAt: c.updatedAt.toISOString(),
    };
  });
}

/** Mensagens de uma conversa (mais antigas primeiro). Valida o tenant dono. */
export async function getThread(conversationId: string): Promise<ThreadMessage[]> {
  const { tenant } = await requireUserAndTenant();

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!conv) return [];

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 500,
  });

  return messages.map((m) => ({
    id: m.id,
    direction: m.direction,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  }));
}

/**
 * Marca a conversa como lida pelo usuário atual (upsert em ConversationRead).
 * Valida que a conversa é do tenant do usuário (defesa em profundidade — o
 * Prisma bypassa RLS).
 */
export async function markConversationRead(conversationId: string): Promise<void> {
  const { id: userId, tenant } = await requireUserAndTenant();

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!conv) return;

  await prisma.conversationRead.upsert({
    where: { userId_conversationId: { userId, conversationId } },
    update: { lastReadAt: new Date() },
    create: { userId, conversationId, lastReadAt: new Date() },
  });
}

/// Janela do handoff: 24h (espelha HANDOFF_WINDOW_MS do bot).
const HANDOFF_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * O dono assume a conversa: o bot entra em silêncio e o dono passa a responder
 * manualmente pelo painel. Marca `handoffExpiresAt` 24h à frente e registra quem
 * assumiu. Valida o tenant dono (defesa em profundidade — Prisma bypassa RLS).
 */
export async function assumeConversation(conversationId: string): Promise<void> {
  const { id: userId, tenant } = await requireUserAndTenant();

  await prisma.conversation.updateMany({
    where: { id: conversationId, tenantId: tenant.id },
    data: { handoffExpiresAt: new Date(Date.now() + HANDOFF_WINDOW_MS), handoffById: userId },
  });
}

/** Devolve a conversa ao bot: reativa o atendimento automático. */
export async function returnConversationToBot(conversationId: string): Promise<void> {
  const { tenant } = await requireUserAndTenant();

  await prisma.conversation.updateMany({
    where: { id: conversationId, tenantId: tenant.id },
    data: { handoffExpiresAt: null, handoffById: null },
  });
}

/**
 * Envia uma resposta manual do dono ao cliente. Exige que a conversa esteja em
 * modo humano (o dono precisa "assumir" antes — silêncio total). Retorna
 * `delivered: false` quando a janela de 24h do WhatsApp já fechou.
 */
export async function sendManualMessage(
  conversationId: string,
  text: string,
): Promise<{ delivered: boolean }> {
  const { tenant } = await requireUserAndTenant();

  const body = text.trim();
  if (!body) return { delivered: false };

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, tenantId: tenant.id },
    select: { handoffExpiresAt: true },
  });
  if (!conv) return { delivered: false };
  if (!conv.handoffExpiresAt || conv.handoffExpiresAt <= new Date()) {
    // Sem handoff ativo não enviamos — o front deve mandar "assumir" antes.
    return { delivered: false };
  }

  const result = await sendManualWhatsappMessage(conversationId, body);
  return { delivered: result?.delivered ?? false };
}
