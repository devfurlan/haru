import { emailHandoffRequested } from '../lib/email.js';
import prisma from '../lib/prisma.js';

/// Janela do handoff humano: 24h de inatividade do cliente. Cada mensagem que
/// chega durante o handoff renova a janela; depois disso o bot volta sozinho.
/// Alinha com a própria janela de 24h de texto livre do WhatsApp.
const HANDOFF_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Retorna a conversa em modo humano para um (tenant, telefone), ou null se o bot
 * está ativo. Modo humano = `handoffExpiresAt` no futuro. Contato novo nunca está
 * em handoff, então isto não cria contact/conversation - é só uma leitura leve.
 */
export async function getHandoffStatus(
  tenantId: string,
  phone: string,
): Promise<{ conversationId: string } | null> {
  const conv = await prisma.conversation.findFirst({
    where: {
      tenantId,
      contact: { phone },
      handoffExpiresAt: { gt: new Date() },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  return conv ? { conversationId: conv.id } : null;
}

/** Renova a janela do handoff (24h a partir de agora). */
export async function refreshHandoffWindow(conversationId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { handoffExpiresAt: new Date(Date.now() + HANDOFF_WINDOW_MS) },
  });
}

/**
 * Inicia o handoff humano a pedido do cliente: silencia o bot por 24h (o gate em
 * webhook.ts passa a engolir as mensagens) e avisa o dono por e-mail (best-effort,
 * respeitando o opt-out). `handoffById` fica null - nenhum humano assumiu ainda; o
 * painel mostra o estado "cliente pediu atendente" até alguém assumir.
 *
 * Idempotente: se já houver handoff ativo, só renova a janela e não re-notifica,
 * pra não floodar o dono com e-mails em uma rajada de mensagens.
 */
export async function initiateHandoff(params: {
  tenantId: string;
  contactId: string;
  conversationId?: string;
  reason?: string | null;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { tenantId, contactId, reason } = params;

  const conv =
    (params.conversationId
      ? await prisma.conversation.findUnique({
          where: { id: params.conversationId },
          select: {
            id: true,
            handoffExpiresAt: true,
            contact: { select: { name: true, phone: true } },
          },
        })
      : null) ??
    (await prisma.conversation.findFirst({
      where: { tenantId, contactId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        handoffExpiresAt: true,
        contact: { select: { name: true, phone: true } },
      },
    }));

  if (!conv) return { ok: false, reason: 'conversa não encontrada' };

  const alreadyActive = conv.handoffExpiresAt != null && conv.handoffExpiresAt > new Date();

  await prisma.conversation.update({
    where: { id: conv.id },
    data: { handoffExpiresAt: new Date(Date.now() + HANDOFF_WINDOW_MS) },
  });

  // Já estava em handoff: só renovamos a janela, sem re-notificar o dono.
  if (!alreadyActive) {
    await emailHandoffRequested(tenantId, {
      contactName: conv.contact.name,
      contactPhone: conv.contact.phone,
      reason,
    }).catch((err) => console.error('[handoff] e-mail falhou', err));
  }

  return { ok: true };
}
