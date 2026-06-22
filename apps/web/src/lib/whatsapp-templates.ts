import { prisma } from '@haru/database';

const API_URL = 'https://graph.facebook.com/v21.0';

type TemplateEvent = 'cancel' | 'reschedule' | 'reminder';

/**
 * Envia o template aprovado do tenant pro cliente, com os 3 placeholders
 * padrão (nome, data/hora, serviço). Fire-and-forget - caller não deve esperar
 * sucesso. Retorna `true` se enviou, `false` se faltou config ou deu erro.
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
    const tenant = appt.tenant;

    if (!tenant.whatsappPhoneNumberId || !tenant.whatsappAccessToken) {
      return false;
    }

    const name = event === 'cancel' ? 'cancelTemplateName' : event === 'reschedule'
      ? 'rescheduleTemplateName'
      : 'reminderTemplateName';
    const lang = event === 'cancel' ? 'cancelTemplateLanguage' : event === 'reschedule'
      ? 'rescheduleTemplateLanguage'
      : 'reminderTemplateLanguage';

    const templateName = tenant[name];
    const templateLanguage = tenant[lang];
    if (!templateName || !templateLanguage) return false;

    const when = new Intl.DateTimeFormat('pt-BR', {
      timeZone: tenant.timezone,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(appt.startsAt);

    const body = {
      messaging_product: 'whatsapp',
      to: appt.contact.phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: appt.contact.name ?? 'cliente' },
              { type: 'text', text: when },
              { type: 'text', text: appt.service.name },
            ],
          },
        ],
      },
    };

    const res = await fetch(
      `${API_URL}/${tenant.whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tenant.whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`[whatsapp-template] ${event} ${res.status}: ${txt}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[whatsapp-template] ${event} falhou:`, err);
    return false;
  }
}
