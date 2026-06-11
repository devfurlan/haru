import { timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { Sentry } from '../instrument.js';
import { env } from '../lib/env.js';
import { formatBRL } from '../lib/format.js';
import prisma from '../lib/prisma.js';
import { sendTextSafely } from '../lib/whatsapp/safeSend.js';
import { getOrCreateConversation, saveMessage } from '../services/chatHistoryService.js';
import { refreshHandoffWindow } from '../services/handoffService.js';

/** Compara dois tokens em tempo constante (evita timing attack). */
function tokenMatches(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Rotas internas chamadas pelo apps/web (não pela Meta). Autenticadas por um
 * segredo compartilhado (`BOT_INTERNAL_TOKEN`, o mesmo nos dois apps), enviado
 * no header `x-internal-token`. Não passam pela validação HMAC do webhook da Meta.
 */
export async function internalRoutes(app: FastifyInstance) {
  // Body é JSON pequeno — usa o parser default do Fastify (este plugin é
  // encapsulado, então não interfere no parser raw-buffer do /webhook).
  app.post('/internal/payment-confirmed', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers['x-internal-token'];
    if (typeof token !== 'string' || !tokenMatches(token, env.BOT_INTERNAL_TOKEN)) {
      return reply.code(401).send({ ok: false, error: 'unauthorized' });
    }

    const body = request.body as { paymentId?: unknown } | undefined;
    const paymentId = typeof body?.paymentId === 'string' ? body.paymentId : '';
    if (!paymentId) {
      return reply.code(400).send({ ok: false, error: 'paymentId obrigatório' });
    }

    // Responde rápido; envia a mensagem em background (fail-soft).
    reply.code(200).send({ ok: true });

    notifyCustomerPaid(paymentId).catch((err) => {
      app.log.error({ err, paymentId }, 'falha ao avisar cliente do pagamento');
      Sentry.captureException(err, { tags: { component: 'internal', route: 'payment-confirmed' } });
    });
  });

  // Envio manual do dono (handoff humano): o painel /conversations chama aqui pra
  // o bot mandar uma mensagem de texto livre ao cliente. Responde SÍNCRONO com
  // `delivered` porque o painel precisa saber se a janela de 24h do WhatsApp
  // estava aberta — fora dela, texto livre é recusado pela Meta.
  app.post('/internal/send-message', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.headers['x-internal-token'];
    if (typeof token !== 'string' || !tokenMatches(token, env.BOT_INTERNAL_TOKEN)) {
      return reply.code(401).send({ ok: false, error: 'unauthorized' });
    }

    const body = request.body as { conversationId?: unknown; text?: unknown } | undefined;
    const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : '';
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!conversationId || !text) {
      return reply.code(400).send({ ok: false, error: 'conversationId e text obrigatórios' });
    }

    try {
      const delivered = await sendManualMessage(conversationId, text);
      return reply.code(200).send({ ok: true, delivered });
    } catch (err) {
      app.log.error({ err, conversationId }, 'falha no envio manual');
      Sentry.captureException(err, { tags: { component: 'internal', route: 'send-message' } });
      return reply.code(500).send({ ok: false, error: 'send_failed' });
    }
  });
}

/**
 * Manda uma mensagem de texto livre do dono ao cliente e persiste o OUTBOUND.
 * Retorna `true` se entregue. Também renova a janela do handoff — a resposta do
 * dono mantém a conversa em modo humano por mais 24h.
 */
async function sendManualMessage(conversationId: string, text: string): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { tenant: true, contact: true },
  });
  if (!conversation) return false;

  const phoneNumberId = conversation.tenant.whatsappPhoneNumberId;
  if (!phoneNumberId) return false;

  const sent = await sendTextSafely(phoneNumberId, conversation.contact.phone, text, {
    phone: conversation.contact.phone,
    phoneNumberId,
    tenantId: conversation.tenantId,
    conversationId,
    flow: 'handoff',
  });

  if (sent) {
    await saveMessage(conversationId, 'OUTBOUND', text);
    await refreshHandoffWindow(conversationId).catch(() => {});
  }

  return sent;
}

/**
 * Envia a confirmação "pagamento recebido" ao cliente no WhatsApp. Só envia se o
 * Payment está PAID (o webhook do web já garante isso antes de chamar). Texto livre
 * — funciona dentro da janela de 24h do WhatsApp; se o cliente pagou logo após
 * agendar (caso comum), está dentro da janela. Fora dela o envio falha e é logado;
 * um template de confirmação fora-de-janela fica como evolução futura.
 */
async function notifyCustomerPaid(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      tenant: true,
      appointment: { include: { service: true, contact: true } },
    },
  });

  if (!payment || payment.status !== 'PAID') return;

  const { tenant, appointment } = payment;
  const phoneNumberId = tenant.whatsappPhoneNumberId;
  if (!phoneNumberId) return;

  // Conversation é única por contactId — resolve (ou cria) pra registrar o OUTBOUND
  // no histórico, igual aos outros fluxos do bot.
  const { conversationId } = await getOrCreateConversation(
    tenant.id,
    appointment.contact.phone,
    appointment.contact.name ?? undefined,
  );

  const when = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tenant.timezone,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(appointment.startsAt);

  const greeting = appointment.contact.name ? `Show, ${appointment.contact.name}! ` : 'Show! ';
  const text =
    `${greeting}Recebi seu pagamento de ${formatBRL(payment.amountCents)} ✅\n\n` +
    `📅 ${when}\n` +
    `✂️ ${appointment.service.name}\n\n` +
    `Tá tudo certo, seu horário está garantido. Até lá!`;

  const sent = await sendTextSafely(phoneNumberId, appointment.contact.phone, text, {
    phone: appointment.contact.phone,
    phoneNumberId,
    tenantId: tenant.id,
    conversationId,
    flow: 'payment-confirmed',
  });

  if (sent) {
    saveMessage(conversationId, 'OUTBOUND', text).catch(console.error);
  }
}
