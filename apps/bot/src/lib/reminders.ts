import { Sentry } from '../instrument.js';
import { emailNumberBanned } from './email.js';
import prisma from './prisma.js';
import { getPhoneNumberStatus, sendTemplateMessage } from './whatsapp/client.js';
import { sendTextSafely } from './whatsapp/safeSend.js';

const TICK_INTERVAL_MS = 5 * 60 * 1000;
// Quanto de atraso ainda vale a pena recuperar. Se o bot ficou fora do ar (deploy,
// restart, plano dormindo) exatamente na hora-alvo de um lembrete, ele volta e
// dispara assim que subir - desde que o atraso seja menor que isto. Acima disso o
// lembrete chegaria perto/depois do horário e não faz mais sentido, então pulamos.
const MAX_LATE_MS = 6 * 60 * 60 * 1000;

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

/**
 * Confirma na Graph API se o número do tenant está BANIDO. Em caso positivo grava
 * `whatsappBannedAt` (o loop passa a pular o tenant nos próximos ticks), avisa o
 * operador por e-mail e retorna true. Como a query do loop filtra por
 * `whatsappBannedAt: null`, o e-mail é disparado uma única vez por banimento.
 * Best-effort: qualquer incerteza (status indisponível) retorna false.
 */
async function flagIfBanned(tenant: {
  id: string;
  name: string;
  whatsappPhoneNumberId: string | null;
  whatsappDisplayPhone: string | null;
}): Promise<boolean> {
  if (!tenant.whatsappPhoneNumberId) return false;

  const status = await getPhoneNumberStatus(tenant.whatsappPhoneNumberId);
  if (status?.status !== 'BANNED') return false;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { whatsappBannedAt: new Date() },
  });
  console.warn(
    `[reminders] número BANIDO pela Meta - tenant ${tenant.id} (${tenant.name}); ` +
      `pulando nos próximos ticks`,
  );

  await emailNumberBanned({
    tenantId: tenant.id,
    tenantName: tenant.name,
    displayPhone: tenant.whatsappDisplayPhone,
    status: status.status ?? null,
    nameStatus: status.name_status ?? null,
  }).catch((err) => {
    console.error('[reminders] e-mail de aviso de banimento falhou', err);
    Sentry.captureException(err, { tags: { component: 'reminders', mode: 'ban-alert' } });
  });

  return true;
}

async function processReminders() {
  const now = new Date();

  const tenants = await prisma.tenant.findMany({
    where: {
      reminderHoursBefore: { gt: 0 },
      whatsappPhoneNumberId: { not: null },
      // Número banido pela Meta recusa todo envio (#135000); não re-tentar.
      whatsappBannedAt: null,
    },
  });

  for (const tenant of tenants) {
    const offsetMs = tenant.reminderHoursBefore * 3_600_000;
    // Hora-alvo do lembrete = startsAt - offset. Buscamos por startsAt:
    //   alvo <= agora            ⇔  startsAt <= agora + offset   (já deu a hora, dispara)
    //   alvo >= agora - MAX_LATE ⇔  startsAt >= agora - MAX_LATE + offset (não atrasado demais)
    // Assim um lembrete cuja hora-alvo passou enquanto o bot estava fora do ar é
    // recuperado no próximo tick em vez de perdido pra sempre. O reminderSentAt
    // continua garantindo envio único - sem risco de duplicar a cada tick.
    const earliestStart = new Date(now.getTime() - MAX_LATE_MS + offsetMs);
    const latestStart = new Date(now.getTime() + offsetMs);

    const appts = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        reminderSentAt: null,
        startsAt: { gte: earliestStart, lte: latestStart },
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
          // O erro da Meta é genérico (#135000) e não diz o motivo. Confirma na
          // Graph API se o número foi banido; se foi, marca o tenant (o loop passa
          // a pulá-lo), avisa o operador por e-mail e abandona os demais appts -
          // nenhum vai entregar enquanto o número estiver banido.
          if (await flagIfBanned(tenant)) break;
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
