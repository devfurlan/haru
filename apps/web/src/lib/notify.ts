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
 * comportamento à do bot — duplicada pra evitar dependência cruzada entre
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
