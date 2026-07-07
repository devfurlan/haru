import { Sentry } from '../instrument.js';
import { formatPhoneBR } from '../lib/format.js';
import prisma from '../lib/prisma.js';
import { isPublicWebhookUrl } from '../lib/safe-url.js';

interface AppointmentEventData {
  tenant: { id: string; name: string; slug: string };
  appointment: {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
  };
  contact: { name: string | null; phone: string | null };
  service: { name: string; durationMinutes: number; priceCents: number };
}

type AppointmentEventName =
  | 'appointment.created'
  | 'appointment.canceled'
  | 'appointment.rescheduled';

interface WebhookBody {
  event: AppointmentEventName;
  data: AppointmentEventData;
  /** Texto formatado - Discord renderiza este campo como mensagem visível. */
  content: string;
}

/**
 * POSTa um evento de appointment no `notificationWebhookUrl` do tenant.
 * Fire-and-forget - falhas são logadas/Sentry mas não bloqueiam o fluxo.
 */
async function dispatchAppointmentEvent(appointmentId: string, event: AppointmentEventName) {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true, contact: true, tenant: true },
    });
    if (!appt || !appt.tenant.notificationWebhookUrl) return;
    const webhookUrl = appt.tenant.notificationWebhookUrl;
    // Anti-SSRF (defesa em profundidade + DNS rebinding): revalida o destino a cada envio.
    if (!(await isPublicWebhookUrl(webhookUrl))) {
      console.warn('[notify] webhook bloqueado (host não público)');
      return;
    }

    const when = new Intl.DateTimeFormat('pt-BR', {
      timeZone: appt.tenant.timezone,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(appt.startsAt);

    const header =
      event === 'appointment.created'
        ? `🆕 Novo agendamento em **${appt.tenant.name}**`
        : event === 'appointment.canceled'
          ? `❌ Agendamento cancelado em **${appt.tenant.name}**`
          : `📅 Agendamento remarcado em **${appt.tenant.name}**`;

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
        `${header}\n` +
        `📅 ${when}\n` +
        `✂️ ${appt.service.name}\n` +
        `👤 ${appt.contact.name ?? formatPhoneBR(appt.contact.phone)}`,
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[notify] webhook ${res.status}: ${text}`);
      Sentry.captureMessage('notification webhook non-2xx', {
        level: 'warning',
        tags: { component: 'notify', event, status: String(res.status) },
        extra: { tenantId: appt.tenantId, appointmentId },
      });
    }
  } catch (err) {
    console.error('[notify] falhou', err);
    Sentry.captureException(err, { tags: { component: 'notify', event } });
  }
}

export function notifyAppointmentCreated(appointmentId: string) {
  return dispatchAppointmentEvent(appointmentId, 'appointment.created');
}

export function notifyAppointmentCanceled(appointmentId: string) {
  return dispatchAppointmentEvent(appointmentId, 'appointment.canceled');
}

export function notifyAppointmentRescheduled(appointmentId: string) {
  return dispatchAppointmentEvent(appointmentId, 'appointment.rescheduled');
}
