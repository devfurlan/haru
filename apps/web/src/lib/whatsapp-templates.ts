import { prisma } from '@haru/database';
import { decryptNullable } from '@haru/payments';

import { logCommsDelivery } from './comms/prefer-own-channels';
import { sendPlatformWhatsapp } from './comms/whatsapp';
import { GRAPH_API_URL as API_URL } from './whatsapp-graph';

type TemplateEvent = 'cancel' | 'reschedule' | 'reminder';

/**
 * Nome do template APROVADO na WABA da PLATAFORMA Demandaê por evento (env). É o fallback
 * do plano base - o tenant sem WABA própria (fora da variante OWN do addon) recebe a saída
 * transacional pelo número da plataforma. Sem a env setada vira no-op (base sem WhatsApp,
 * honesto com a arquitetura atual). Registrar/aprovar os templates na Meta ANTES de setar
 * (ver tabela de templates no README).
 */
const PLATFORM_TEMPLATE_ENV: Record<TemplateEvent, string> = {
  cancel: 'WHATSAPP_TEMPLATE_CANCEL',
  reschedule: 'WHATSAPP_TEMPLATE_RESCHEDULE',
  reminder: 'WHATSAPP_TEMPLATE_REMINDER',
};

/**
 * Envia o template de agendamento pro cliente (nome, data/hora, serviço), roteando pelo
 * canal certo: WABA PRÓPRIA do tenant (variante OWN do addon) quando configurada; senão o
 * número da PLATAFORMA (fallback do plano base, env-gated). Fire-and-forget - o caller não
 * espera sucesso. Retorna `true` se enviou, `false` se faltou config ou deu erro.
 *
 * Own-channels-first: se o cliente tem e-mail entregável (o sendAppointmentEmails, disparado
 * em paralelo pelo caller, cobre), NÃO gasta template de WhatsApp - ele fica só como fallback
 * pra quem não tem e-mail (ex.: walk-in sem conta). Registra o canal primário em CommsDelivery.
 */
export async function sendAppointmentTemplate(
  appointmentId: string,
  event: TemplateEvent,
): Promise<boolean> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: true,
        contact: {
          include: {
            customerAccount: { select: { email: true, appointmentEmailsEnabled: true } },
          },
        },
        tenant: true,
      },
    });
    if (!appt) return false;
    const commsType = `appointment_${event}`;

    // Own-first: e-mail entregável (conta com pref ligada, ou contact.email de walk-in) cobre
    // o comms - pula o WhatsApp. O e-mail em si sai pelo sendAppointmentEmails (mesma regra).
    const account = appt.contact.customerAccount;
    const emailTo = account?.email ?? appt.contact.email;
    const hasEmail = !!emailTo && (account?.appointmentEmailsEnabled ?? true);
    if (hasEmail) {
      await logCommsDelivery(appt.tenantId, commsType, 'EMAIL');
      return true;
    }

    // Cliente sem WhatsApp (agendou logado, sem número): nada pra enviar.
    if (!appt.contact.phone) {
      await logCommsDelivery(appt.tenantId, commsType, 'NONE');
      return false;
    }
    const tenant = appt.tenant;

    const when = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tenant.timezone,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(appt.startsAt);
    const params = [appt.contact.name ?? 'cliente', when, appt.service.name];

    // 1) WABA PRÓPRIA do tenant (variante OWN do addon), se configurada com o template dele.
    const token = decryptNullable(tenant.whatsappAccessToken);
    const nameKey =
      event === 'cancel'
        ? 'cancelTemplateName'
        : event === 'reschedule'
          ? 'rescheduleTemplateName'
          : 'reminderTemplateName';
    const langKey =
      event === 'cancel'
        ? 'cancelTemplateLanguage'
        : event === 'reschedule'
          ? 'rescheduleTemplateLanguage'
          : 'reminderTemplateLanguage';
    const ownTemplate = tenant[nameKey];
    const ownLanguage = tenant[langKey];

    let sent: boolean;
    if (tenant.whatsappPhoneNumberId && token && ownTemplate && ownLanguage) {
      const res = await fetch(`${API_URL}/${tenant.whatsappPhoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: appt.contact.phone,
          type: 'template',
          template: {
            name: ownTemplate,
            language: { code: ownLanguage },
            components: [
              { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) },
            ],
          },
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error(`[whatsapp-template] ${event} own ${res.status}: ${txt}`);
        sent = false;
      } else {
        sent = true;
      }
    } else {
      // 2) Fallback: número da PLATAFORMA Demandaê (plano base). Env-gated pelo template da
      //    plataforma - sem ele, sendPlatformWhatsapp vira no-op logado.
      sent = await sendPlatformWhatsapp(
        appt.contact.phone,
        process.env[PLATFORM_TEMPLATE_ENV[event]],
        params,
      );
    }
    await logCommsDelivery(appt.tenantId, commsType, sent ? 'WHATSAPP' : 'NONE');
    return sent;
  } catch (err) {
    console.error(`[whatsapp-template] ${event} falhou:`, err);
    return false;
  }
}
