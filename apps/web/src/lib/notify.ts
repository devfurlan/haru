import { prisma } from '@haru/database';

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
        `👤 ${appt.contact.name ?? appt.contact.phone}`,
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
