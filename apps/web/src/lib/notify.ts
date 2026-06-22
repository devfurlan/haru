import { prisma } from '@haru/database';

import { formatBRL, formatPhoneBR } from '@/lib/format';

type AppointmentEventName =
  | 'appointment.created'
  | 'appointment.canceled'
  | 'appointment.rescheduled';

interface AppointmentEventData {
  tenant: { id: string; name: string; slug: string };
  appointment: { id: string; startsAt: string; endsAt: string; status: string };
  contact: { name: string | null; phone: string };
  service: { name: string; durationMinutes: number; priceCents: number };
}

interface WebhookBody {
  event: AppointmentEventName;
  data: AppointmentEventData;
  content: string;
}

const HEADER: Record<AppointmentEventName, (tenantName: string) => string> = {
  'appointment.created': (n) => `🆕 Novo agendamento em **${n}**`,
  'appointment.canceled': (n) => `❌ Agendamento cancelado em **${n}**`,
  'appointment.rescheduled': (n) => `📅 Agendamento remarcado em **${n}**`,
};

/**
 * Versão server-side (Next.js) do dispatcher de webhook. Idêntica em
 * comportamento à do bot - duplicada pra evitar dependência cruzada entre
 * apps/web e apps/bot. Se evoluir, vale extrair pra `@haru/notifications`.
 */
async function dispatchAppointmentEvent(appointmentId: string, event: AppointmentEventName) {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true, contact: true, tenant: true },
    });
    if (!appt || !appt.tenant.notificationWebhookUrl) return;

    const when = new Intl.DateTimeFormat('pt-BR', {
      timeZone: appt.tenant.timezone,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(appt.startsAt);

    const body: WebhookBody = {
      event,
      data: {
        tenant: { id: appt.tenant.id, name: appt.tenant.name, slug: appt.tenant.slug },
        appointment: {
          id: appt.id,
          startsAt: appt.startsAt.toISOString(),
          endsAt: appt.endsAt.toISOString(),
          status: appt.status,
        },
        contact: { name: appt.contact.name, phone: appt.contact.phone },
        service: {
          name: appt.service.name,
          durationMinutes: appt.service.durationMinutes,
          priceCents: appt.service.priceCents,
        },
      },
      content:
        `${HEADER[event](appt.tenant.name)}\n` +
        `📅 ${when}\n` +
        `✂️ ${appt.service.name}\n` +
        `👤 ${appt.contact.name ?? formatPhoneBR(appt.contact.phone)}`,
    };

    const res = await fetch(appt.tenant.notificationWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`[notify] webhook ${res.status}: ${await res.text().catch(() => '')}`);
    }
  } catch (err) {
    console.error('[notify] falhou', err);
  }
}

export const notifyAppointmentCreated = (id: string) =>
  dispatchAppointmentEvent(id, 'appointment.created');
export const notifyAppointmentCanceled = (id: string) =>
  dispatchAppointmentEvent(id, 'appointment.canceled');
export const notifyAppointmentRescheduled = (id: string) =>
  dispatchAppointmentEvent(id, 'appointment.rescheduled');

/**
 * Notifica o dono (via webhook configurado) que um pagamento foi confirmado. Evento
 * separado dos de agendamento porque carrega o valor pago. Fire-and-forget.
 */
export async function notifyPaymentConfirmed(paymentId: string) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        tenant: true,
        appointment: { include: { service: true, contact: true } },
      },
    });
    if (!payment) return;
    const { tenant, appointment } = payment;
    const webhookUrl = tenant.notificationWebhookUrl;
    if (!webhookUrl) return;
    const when = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tenant.timezone,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(appointment.startsAt);

    const amount = formatBRL(payment.amountCents);
    const body = {
      event: 'payment.confirmed' as const,
      data: {
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        payment: {
          id: payment.id,
          amountCents: payment.amountCents,
          provider: payment.provider,
          method: payment.method,
        },
        appointment: {
          id: appointment.id,
          startsAt: appointment.startsAt.toISOString(),
          status: appointment.status,
        },
        contact: { name: appointment.contact.name, phone: appointment.contact.phone },
        service: { name: appointment.service.name },
      },
      content:
        `💰 Pagamento confirmado em **${tenant.name}**\n` +
        `💵 ${amount}\n` +
        `📅 ${when}\n` +
        `✂️ ${appointment.service.name}\n` +
        `👤 ${appointment.contact.name ?? formatPhoneBR(appointment.contact.phone)}`,
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[notify] payment webhook ${res.status}: ${await res.text().catch(() => '')}`);
    }
  } catch (err) {
    console.error('[notify] payment falhou', err);
  }
}

/**
 * Avisa o CLIENTE (no WhatsApp, via bot) que o pagamento foi confirmado. O webhook do
 * gateway chega aqui no apps/web, mas quem fala com o cliente é o bot - então fazemos
 * um POST autenticado na rota interna do bot, que monta e envia a mensagem.
 *
 * Fire-and-forget e fail-soft: se BOT_INTERNAL_URL/BOT_INTERNAL_TOKEN não estiverem
 * configurados (ex.: ambiente sem bot), apenas loga e segue - não quebra o webhook.
 */
export async function notifyCustomerPaymentConfirmed(paymentId: string) {
  const baseUrl = process.env.BOT_INTERNAL_URL;
  const token = process.env.BOT_INTERNAL_TOKEN;
  if (!baseUrl || !token) {
    console.warn('[notify] BOT_INTERNAL_URL/TOKEN ausentes - pulo aviso ao cliente');
    return;
  }
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/internal/payment-confirmed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-token': token },
      body: JSON.stringify({ paymentId }),
    });
    if (!res.ok) {
      console.error(
        `[notify] bot payment-confirmed ${res.status}: ${await res.text().catch(() => '')}`,
      );
    }
  } catch (err) {
    console.error('[notify] aviso ao cliente falhou', err);
  }
}

/// `unreachable`: o web não conseguiu falar com o bot (envs BOT_INTERNAL_* ausentes,
/// bot fora do ar, 404/500). Problema de infra - não é o WhatsApp do tenant.
export type SendFailureReason = 'window_closed' | 'not_configured' | 'unreachable' | 'send_failed';
export interface ManualSendResult {
  delivered: boolean;
  reason?: SendFailureReason;
  /// Código de erro da Cloud API do Meta (quando houver) - ajuda a diagnosticar.
  waCode?: number;
  /// Status HTTP da resposta do bot quando reason='unreachable' (401 token, 404
  /// URL/rota, etc). Ausente = bot não respondeu (host inalcançável / DNS).
  httpStatus?: number;
}

/**
 * Envio manual do dono (handoff humano): pede ao bot pra mandar `text` ao cliente
 * da conversa. Quem fala com o WhatsApp é o bot, então o painel faz um POST
 * autenticado na rota interna. Retorna `delivered` + `reason` da falha (o bot
 * classifica: janela fechada / WhatsApp não conectado / falha genérica).
 */
export async function sendManualWhatsappMessage(
  conversationId: string,
  text: string,
): Promise<ManualSendResult> {
  const baseUrl = process.env.BOT_INTERNAL_URL;
  const token = process.env.BOT_INTERNAL_TOKEN;
  if (!baseUrl || !token) {
    console.warn(
      '[notify] BOT_INTERNAL_URL/BOT_INTERNAL_TOKEN ausentes no web - não dá pra chamar o bot. ' +
        'Configure-as no ambiente do web (Vercel) apontando pro bot.',
    );
    return { delivered: false, reason: 'unreachable' };
  }
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/internal/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-token': token },
      body: JSON.stringify({ conversationId, text }),
    });
    if (!res.ok) {
      console.error(`[notify] bot send-message ${res.status}: ${await res.text().catch(() => '')}`);
      return { delivered: false, reason: 'unreachable', httpStatus: res.status };
    }
    const data = (await res.json().catch(() => null)) as ManualSendResult | null;
    if (data && !data.delivered) {
      console.error(`[notify] envio manual não entregue - reason=${data.reason} waCode=${data.waCode}`);
    }
    return {
      delivered: data?.delivered ?? false,
      reason: data?.reason,
      waCode: data?.waCode,
      httpStatus: res.status,
    };
  } catch (err) {
    console.error('[notify] envio manual falhou', err);
    return { delivered: false, reason: 'unreachable' };
  }
}
