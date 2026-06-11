import { timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { Sentry } from '../instrument.js';
import { env } from '../lib/env.js';
import { formatBRL } from '../lib/format.js';
import prisma from '../lib/prisma.js';
import { sendTextMessage } from '../lib/whatsapp/client.js';
import { sendTextSafely } from '../lib/whatsapp/safeSend.js';
import { getOrCreateConversation, saveMessage } from '../services/chatHistoryService.js';

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

    const outcome = await sendManualMessage(conversationId, text);
    if (!outcome.delivered) {
      app.log.warn({ conversationId, reason: outcome.reason, waCode: outcome.waCode }, 'envio manual não entregue');
    }
    return reply.code(200).send({ ok: true, ...outcome });
  });
}

/// Motivo de uma falha no envio manual — o painel usa pra explicar ao dono.
/// `window_closed`: o Meta recusou por estar fora da janela de 24h (código 131047
/// e afins). `not_configured`: o tenant não tem WhatsApp conectado.
/// `send_failed`: qualquer outra falha da Cloud API.
type SendOutcome =
  | { delivered: true }
  | { delivered: false; reason: 'window_closed' | 'not_configured' | 'send_failed'; waCode?: number };

/// Códigos de erro da Cloud API que significam "fora da janela de 24h / precisa
/// de template pra reengajar". https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
const WINDOW_CLOSED_CODES = new Set([131047, 131051, 131026]);

/** Extrai o `error.code` numérico do erro lançado por `callApi` (texto JSON da Meta). */
function whatsappErrorCode(err: unknown): number | undefined {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/"code":\s*(\d+)/);
  return match ? Number(match[1]) : undefined;
}

/**
 * Manda uma mensagem de texto livre do dono ao cliente e persiste o OUTBOUND.
 * NÃO renova a janela do handoff — só mensagem do cliente reabre a janela de 24h
 * do WhatsApp; resposta do dono não conta. Classifica a falha pra UI explicar.
 */
async function sendManualMessage(conversationId: string, text: string): Promise<SendOutcome> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { tenant: true, contact: true },
  });
  if (!conversation) return { delivered: false, reason: 'send_failed' };

  const phoneNumberId = conversation.tenant.whatsappPhoneNumberId;
  if (!phoneNumberId) return { delivered: false, reason: 'not_configured' };

  try {
    await sendTextMessage(phoneNumberId, conversation.contact.phone, text);
  } catch (err) {
    const waCode = whatsappErrorCode(err);
    const reason = waCode && WINDOW_CLOSED_CODES.has(waCode) ? 'window_closed' : 'send_failed';
    Sentry.captureException(err, {
      tags: { component: 'internal', route: 'send-message', wa_code: String(waCode ?? '') },
      extra: { conversationId, tenantId: conversation.tenantId },
    });
    return { delivered: false, reason, waCode };
  }

  await saveMessage(conversationId, 'OUTBOUND', text);
  return { delivered: true };
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
