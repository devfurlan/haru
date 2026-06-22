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
