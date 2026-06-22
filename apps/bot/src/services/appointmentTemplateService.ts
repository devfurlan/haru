import prisma from '../lib/prisma.js';
import { sendTemplateMessage } from '../lib/whatsapp/client.js';

type TemplateEvent = 'cancel' | 'reschedule';

/**
 * Manda o template aprovado correspondente ao evento pro cliente do
 * appointment. Fire-and-forget - o caller não deve esperar. Sem template
 * configurado, faz nada (não é erro).
 *
 * Espera 3 placeholders no body do template: nome, data/hora formatada, serviço.
 */
export async function sendAppointmentTemplate(
  appointmentId: string,
  event: TemplateEvent,
): Promise<void> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true, contact: true, tenant: true },
    });
    if (!appt || !appt.tenant.whatsappPhoneNumberId) return;

    const templateName =
      event === 'cancel' ? appt.tenant.cancelTemplateName : appt.tenant.rescheduleTemplateName;
    const templateLanguage =
      event === 'cancel'
        ? appt.tenant.cancelTemplateLanguage
        : appt.tenant.rescheduleTemplateLanguage;

    if (!templateName || !templateLanguage) return;

    const when = new Intl.DateTimeFormat('pt-BR', {
      timeZone: appt.tenant.timezone,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(appt.startsAt);

    await sendTemplateMessage(
      appt.tenant.whatsappPhoneNumberId,
      appt.contact.phone,
      templateName,
      templateLanguage,
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: appt.contact.name ?? 'cliente' },
            { type: 'text', text: when },
            { type: 'text', text: appt.service.name },
          ],
        },
      ],
    );
  } catch (err) {
    console.error(`[template] ${event} falhou:`, err);
  }
}
