import { Sentry } from '../instrument.js';
import prisma from './prisma.js';
import { sendTemplateMessage } from './whatsapp/client.js';
import { sendTextSafely } from './whatsapp/safeSend.js';

const TICK_INTERVAL_MS = 5 * 60 * 1000;
// Janela ao redor do horário-alvo do lembrete. Tem que casar com TICK_INTERVAL_MS
// pra não pular ninguém — ±TICK/2 garante que TODO appointment cuja hora-alvo
// caia dentro do intervalo é capturado em algum tick.
const HALF_WINDOW_MS = TICK_INTERVAL_MS / 2;

function formatWhen(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

async function processReminders() {
  const now = new Date();

  const tenants = await prisma.tenant.findMany({
    where: {
      reminderHoursBefore: { gt: 0 },
      whatsappPhoneNumberId: { not: null },
    },
  });

  for (const tenant of tenants) {
    const targetTime = new Date(now.getTime() + tenant.reminderHoursBefore * 3_600_000);
    const start = new Date(targetTime.getTime() - HALF_WINDOW_MS);
    const end = new Date(targetTime.getTime() + HALF_WINDOW_MS);

    const appts = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        reminderSentAt: null,
        startsAt: { gte: start, lt: end },
      },
      include: { service: true, contact: true },
    });

    if (appts.length === 0) continue;

    for (const appt of appts) {
      const when = formatWhen(appt.startsAt, tenant.timezone);
      const name = appt.contact.name ?? 'cliente';

      let sent = false;

      if (tenant.reminderTemplateName) {
        // Caminho oficial: template aprovado pela Meta. Escapa da regra das 24h.
        try {
          await sendTemplateMessage(
            tenant.whatsappPhoneNumberId!,
            appt.contact.phone,
            tenant.reminderTemplateName,
            tenant.reminderTemplateLanguage ?? 'pt_BR',
            [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: name },
                  { type: 'text', text: when },
                  { type: 'text', text: appt.service.name },
                ],
              },
            ],
          );
          sent = true;
        } catch (err) {
          console.error('[reminders] template falhou', err);
          Sentry.captureException(err, {
            tags: { component: 'reminders', mode: 'template' },
            extra: {
              tenantId: tenant.id,
              appointmentId: appt.id,
              template: tenant.reminderTemplateName,
            },
          });
        }
      } else {
        // Fallback: freeform (só funciona se cliente mandou mensagem nas últimas 24h)
        const greeting = appt.contact.name ? `Oi, ${appt.contact.name}!` : 'Oi!';
        const text =
          `${greeting} Passando pra lembrar do seu agendamento na ${tenant.name}:\n\n` +
          `📅 ${when}\n` +
          `✂️ ${appt.service.name}\n\n` +
          `Se precisar remarcar ou cancelar, é só me chamar por aqui. Até lá!`;

        sent = await sendTextSafely(
          tenant.whatsappPhoneNumberId!,
          appt.contact.phone,
          text,
          {
            phone: appt.contact.phone,
            phoneNumberId: tenant.whatsappPhoneNumberId!,
            tenantId: tenant.id,
            flow: 'reminder',
          },
        );
      }

      if (sent) {
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderSentAt: new Date() },
        });
      }
    }
  }
}

/**
 * Inicia o loop de lembretes. Roda uma vez imediatamente e depois a cada 5 min.
 * Falhas individuais são logadas mas não derrubam o loop.
 */
export function startReminderLoop(): void {
  console.log(`[reminders] loop iniciado (tick a cada ${TICK_INTERVAL_MS / 1000}s)`);

  const tick = () => {
    processReminders().catch((err) => {
      console.error('[reminders] erro no tick', err);
      Sentry.captureException(err, { tags: { component: 'reminders' } });
    });
  };

  tick();
  setInterval(tick, TICK_INTERVAL_MS);
}
