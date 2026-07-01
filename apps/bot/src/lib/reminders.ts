import { Sentry } from '../instrument.js';
import { emailAppointmentReminder } from './appointmentEmail.js';
import { emailNumberBanned, emailQualityDegraded } from './email.js';
import { sendExpoPush } from './expoPush.js';
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
      // Sem filtro por whatsappPhoneNumberId: tenants SEM WhatsApp ainda mandam
      // lembrete por e-mail. A checagem do número é feita por agendamento, abaixo.
      // Número banido pela Meta recusa todo envio WhatsApp (#135000); o e-mail segue.
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
        // Pendente em ao menos um canal (WhatsApp, e-mail OU push). Cada canal tem seu
        // próprio carimbo e é enviado no máximo uma vez.
        OR: [{ reminderSentAt: null }, { reminderEmailSentAt: null }, { reminderPushSentAt: null }],
        startsAt: { gte: earliestStart, lte: latestStart },
      },
      include: {
        service: true,
        contact: { include: { customerAccount: { include: { pushDevices: true } } } },
      },
    });

    if (appts.length === 0) continue;

    // Se o número for detectado banido no meio do tick, paramos o WhatsApp (todo
    // envio falharia) mas seguimos mandando os lembretes por e-mail.
    let whatsappBlocked = false;

    for (const appt of appts) {
      const when = formatWhen(appt.startsAt, tenant.timezone);
      const name = appt.contact.name ?? 'cliente';

      // --- Lembrete por WhatsApp (só se o tenant tem número, o cliente não pediu
      // pra sair e ainda não enviou) ---
      if (
        tenant.whatsappPhoneNumberId &&
        !whatsappBlocked &&
        appt.reminderSentAt == null &&
        appt.contact.remindersOptOutAt == null
      ) {
        let sent = false;

        if (tenant.reminderTemplateName) {
          // Caminho oficial: template aprovado pela Meta. Escapa da regra das 24h.
          try {
            await sendTemplateMessage(
              tenant.whatsappPhoneNumberId,
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
            // a pulá-lo) e para o WhatsApp nos demais appts - mas o e-mail continua.
            if (await flagIfBanned(tenant)) whatsappBlocked = true;
          }
        } else {
          // Fallback: freeform (só funciona se cliente mandou mensagem nas últimas 24h)
          const greeting = appt.contact.name ? `Oi, ${appt.contact.name}!` : 'Oi!';
          const text =
            `${greeting} Passando pra lembrar do seu agendamento na ${tenant.name}:\n\n` +
            `📅 ${when}\n` +
            `✂️ ${appt.service.name}\n\n` +
            `Se precisar remarcar ou cancelar, é só me chamar por aqui. Até lá!`;

          sent = await sendTextSafely(tenant.whatsappPhoneNumberId, appt.contact.phone, text, {
            phone: appt.contact.phone,
            phoneNumberId: tenant.whatsappPhoneNumberId,
            tenantId: tenant.id,
            flow: 'reminder',
          });
        }

        if (sent) {
          await prisma.appointment.update({
            where: { id: appt.id },
            data: { reminderSentAt: new Date() },
          });
        }
      }

      // --- Lembrete por e-mail AO CLIENTE (independente do WhatsApp) ---
      if (appt.reminderEmailSentAt == null) {
        const account = appt.contact.customerAccount;
        const to = account?.email ?? appt.contact.email;
        const prefOn = account?.appointmentEmailsEnabled ?? true;
        if (to && prefOn) {
          await emailAppointmentReminder({
            to,
            customerName: account?.name ?? appt.contact.name ?? null,
            tenantName: tenant.name,
            when,
            serviceName: appt.service.name,
          }).catch((err) => {
            console.error('[reminders] e-mail de lembrete falhou', err);
            Sentry.captureException(err, { tags: { component: 'reminders', mode: 'email' } });
          });
        }
        // Carimba o e-mail como processado (enviado, sem destinatário ou opt-out) pra
        // não reavaliar todo tick - o carimbo é zerado na remarcação.
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderEmailSentAt: new Date() },
        });
      }

      // --- Lembrete por PUSH ao cliente (app). Vai pra qualquer aparelho registrado:
      // instalar o app e permitir notificações É o opt-in. ponytail: sem pref dedicada;
      // adicionar `pushEnabled` na conta se um dia precisar de controle granular. ---
      if (appt.reminderPushSentAt == null) {
        const devices = appt.contact.customerAccount?.pushDevices ?? [];
        if (devices.length > 0) {
          const { invalidTokens } = await sendExpoPush(
            devices.map((d) => ({
              to: d.expoPushToken,
              title: 'Lembrete de agendamento',
              body: `${appt.service.name} · ${when} na ${tenant.name}`,
              data: { appointmentId: appt.id },
            })),
          );
          // Remove tokens mortos que a Expo reportou (app desinstalado / permissão off).
          if (invalidTokens.length > 0) {
            await prisma.pushDevice.deleteMany({
              where: { expoPushToken: { in: invalidTokens } },
            });
          }
        }
        // Carimba como processado (mesmo sem aparelho) pra não reavaliar todo tick.
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderPushSentAt: new Date() },
        });
      }
    }
  }
}

const QUALITY_TICK_INTERVAL_MS = 30 * 60 * 1000;

// Ranqueia os ratings pra detectar PIORA (transição pra pior). null/desconhecido = 0.
const QUALITY_RANK: Record<string, number> = { GREEN: 0, YELLOW: 1, RED: 2 };
function qualityRank(rating: string | null | undefined): number {
  return rating ? (QUALITY_RANK[rating] ?? 0) : 0;
}

/**
 * Poll da quality_rating de cada número na Graph API. Alerta o operador por e-mail
 * só na PIORA (ex.: GREEN→YELLOW, YELLOW→RED), gravando o novo rating pra não
 * re-alertar a cada tick. RED costuma preceder restrição/ban - este é o aviso ANTES
 * do bloqueio, não a detecção depois (o `flagIfBanned` cobre o pós). Best-effort:
 * número indisponível ou sem rating é pulado sem apagar o que já sabíamos.
 */
async function processQualityCheck() {
  const tenants = await prisma.tenant.findMany({
    where: { whatsappPhoneNumberId: { not: null }, whatsappBannedAt: null },
    select: {
      id: true,
      name: true,
      whatsappPhoneNumberId: true,
      whatsappDisplayPhone: true,
      whatsappQualityRating: true,
    },
  });

  for (const tenant of tenants) {
    if (!tenant.whatsappPhoneNumberId) continue;

    const status = await getPhoneNumberStatus(tenant.whatsappPhoneNumberId);
    const current = status?.quality_rating ?? null;
    if (!current) continue; // rating indisponível: não mexe no registro anterior
    const previous = tenant.whatsappQualityRating ?? null;
    if (current === previous) continue;

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { whatsappQualityRating: current },
    });

    // Só alerta quando piora; melhora (ex.: RED→GREEN) só atualiza o registro.
    if (qualityRank(current) > qualityRank(previous)) {
      console.warn(
        `[quality] rating piorou - tenant ${tenant.id} (${tenant.name}): ${previous ?? '?'} → ${current}`,
      );
      await emailQualityDegraded({
        tenantId: tenant.id,
        tenantName: tenant.name,
        displayPhone: tenant.whatsappDisplayPhone,
        previous,
        current,
      }).catch((err) => {
        console.error('[quality] e-mail de alerta falhou', err);
        Sentry.captureException(err, { tags: { component: 'quality', mode: 'degraded-alert' } });
      });
    }
  }
}

/**
 * Inicia o loop de monitoramento de qualidade do número. Roda uma vez ao subir e
 * depois a cada 30 min. Falhas individuais são logadas mas não derrubam o loop.
 */
export function startQualityMonitorLoop(): void {
  console.log(`[quality] loop iniciado (tick a cada ${QUALITY_TICK_INTERVAL_MS / 1000}s)`);

  const tick = () => {
    processQualityCheck().catch((err) => {
      console.error('[quality] erro no tick', err);
      Sentry.captureException(err, { tags: { component: 'quality' } });
    });
  };

  tick();
  setInterval(tick, QUALITY_TICK_INTERVAL_MS);
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
