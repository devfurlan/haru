import { prisma } from '@haru/database';
import { decryptNullable } from '@haru/payments';

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
 */
export async function sendAppointmentTemplate(
  appointmentId: string,
  event: TemplateEvent,
): Promise<boolean> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true, contact: true, tenant: true },
    });
    if (!appt) return false;
    // Cliente sem WhatsApp (agendou logado, sem número): nada pra enviar.
    if (!appt.contact.phone) return false;
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
        return false;
      }
      return true;
    }

    // 2) Fallback: número da PLATAFORMA Demandaê (plano base). Env-gated pelo template da
    //    plataforma - sem ele, sendPlatformWhatsapp vira no-op logado.
    return await sendPlatformWhatsapp(appt.contact.phone, process.env[PLATFORM_TEMPLATE_ENV[event]], params);
  } catch (err) {
    console.error(`[whatsapp-template] ${event} falhou:`, err);
    return false;
  }
}
