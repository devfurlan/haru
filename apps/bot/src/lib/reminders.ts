import { cycleWindow, getMonthlyWhatsappReminderUsage, isSubscriptionActive } from '@haru/billing';
import { dueReminderMarks, LAST_REMINDER_MARK, pickChannels, reminderDueAt, REMINDER_MARKS } from '@haru/shared';

import { Sentry } from '../instrument.js';
import { emailAppointmentReminder } from './appointmentEmail.js';
import { emailNumberBanned, emailQualityDegraded } from './email.js';
import { sendExpoPush } from './expoPush.js';
import prisma from './prisma.js';
import { getPhoneNumberStatus, sendTemplateMessage } from './whatsapp/client.js';
import { sendTextSafely } from './whatsapp/safeSend.js';

// Tick curto (1 min) pra o lembrete cair perto da hora-alvo. Como o disparo é
// numa grade, o atraso máximo em relação ao alvo é ~1 tick: com 30 min de
// antecedência, o lembrete chega entre 30 e 29 min antes.
const TICK_INTERVAL_MS = 1 * 60 * 1000;

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
 * `whatsappBannedAt` (o loop passa a pular o CANAL WhatsApp do tenant nos próximos
 * ticks - e-mail e push seguem), avisa o operador por e-mail e retorna true. Como o
 * tenant já marcado nem entra no ramo de envio por WhatsApp, esta função não roda de
 * novo e o e-mail sai uma única vez por banimento.
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
      reminderMinutesBefore: { gt: 0 },
      // Sem filtro por whatsappPhoneNumberId nem por whatsappBannedAt: tenant SEM
      // WhatsApp (ou com o número banido pela Meta) ainda manda lembrete por e-mail e
      // push. A checagem do número é feita por agendamento, abaixo - o banimento derruba
      // só o canal WhatsApp (ver whatsappBlocked), não o lembrete inteiro.
    },
    // Assinatura p/ a cota de lembretes por WhatsApp (pausa o canal a 100%).
    include: { subscription: true },
  });

  for (const tenant of tenants) {
    // Horizonte do lote: o maior entre a antecedência do WhatsApp (config do dono) e o
    // primeiro marco de push (24h). Antes era só a config - com ela em 30 min, o appt só
    // aparecia 30 min antes e os marcos de 24h/1h nunca eram avaliados.
    const offsetMs = Math.max(tenant.reminderMinutesBefore, REMINDER_MARKS[0].minutes) * 60_000;
    // Hora-alvo do lembrete = startsAt - offset. Janela de startsAt = [agora, agora + offset]:
    //   startsAt <= agora + offset  ⇔  alvo <= agora        (já deu a hora, dispara)
    //   startsAt >= agora           ⇔  agendamento ainda não começou
    // O limite inferior `agora` recupera lembretes cuja hora-alvo passou enquanto o
    // bot estava fora do ar (o agendamento ainda está no futuro) e, ao mesmo tempo,
    // evita disparar lembrete de agendamento que já começou. reminderSentAt garante
    // envio único - sem risco de duplicar a cada tick.
    const earliestStart = now;
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

    // Número banido (já marcado, ou detectado no meio do tick): paramos o WhatsApp (todo
    // envio falharia) mas seguimos mandando os lembretes por e-mail e push.
    let whatsappBlocked = tenant.whatsappBannedAt != null;

    // Canal do lembrete por WhatsApp: WABA PRÓPRIA do tenant (variante OWN do addon) ou, no
    // plano base, o número da PLATAFORMA Demandaê (env-gated pelo template aprovado). Sem
    // nenhum → não sai por WhatsApp (só e-mail/push). O número da plataforma NUNCA usa
    // freeform: a janela de 24h exige que o cliente já tenha escrito pro número, o que não
    // acontece com o da plataforma - por isso o fallback base depende do template aprovado.
    const ownNumberId = tenant.whatsappPhoneNumberId;
    const platformNumberId = process.env.WHATSAPP_PLATFORM_PHONE_NUMBER_ID;
    const platformReminderTpl = process.env.WHATSAPP_TEMPLATE_REMINDER;
    const platformReady = Boolean(platformNumberId && platformReminderTpl);
    const waNumberId = ownNumberId ?? (platformReady ? platformNumberId : undefined);
    const waTemplateName = ownNumberId ? tenant.reminderTemplateName : platformReminderTpl;
    const waTemplateLang = ownNumberId ? (tenant.reminderTemplateLanguage ?? 'pt_BR') : 'pt_BR';
    const waAllowFreeform = Boolean(ownNumberId);

    // Cota de lembretes por WhatsApp (quota do plano base): ao chegar em 100% do ciclo, pausa
    // SÓ os disparos pelo número da PLATAFORMA. E-mail e push nunca pausam (ilimitados) e o
    // cliente final segue agendando. Own-number (variante OWN do addon) NÃO é cobrado: envia
    // pela WABA do próprio tenant, que paga a Meta direto - a cota do plano base não se aplica.
    // ponytail: se a cota tiver que valer para own-number também, remover o `!ownNumberId`.
    const remindersLimit =
      !ownNumberId && isSubscriptionActive(tenant.subscription)
        ? (tenant.subscription!.whatsappRemindersLimit ?? null)
        : null;
    let remindersUsed =
      remindersLimit != null
        ? await getMonthlyWhatsappReminderUsage(tenant.id, now, cycleWindow(tenant.subscription))
        : 0;

    for (const appt of appts) {
      // `armedAt` é updatedAt, não createdAt: a REMARCAÇÃO zera os carimbos e re-arma o
      // lembrete pro horário novo - com createdAt (antigo), remarcar pra daqui a 3h num
      // tenant de 24h disparava o lembrete no ato da remarcação e nada perto da hora.
      // ponytail: updatedAt sobe em qualquer update do appt; se algum campo passar a mudar
      // sem re-armar o lembrete, virar coluna própria (reminderArmedAt) no REMINDER_STAMPS_RESET.
      const armedAt = appt.updatedAt;

      // WhatsApp segue no marco ÚNICO que o dono configura (canal com quota). O gate era do
      // appt inteiro; agora é só deste canal - os marcos de push têm agenda própria.
      const waDueAt = reminderDueAt({
        startsAt: appt.startsAt,
        armedAt,
        minutesBefore: tenant.reminderMinutesBefore,
      });

      // Marcos de push vencidos (24h/1h/30min). Vazio = nada a fazer neste tick.
      const dueMarks = dueReminderMarks({
        startsAt: appt.startsAt,
        armedAt,
        now,
        sent: appt.reminderPushMarks,
      });
      if (now < waDueAt && dueMarks.length === 0) continue;
      /** Algo REALMENTE saiu neste tick - o log de canal primário depende disso. */
      let anySent = false;

      const when = formatWhen(appt.startsAt, tenant.timezone);
      const name = appt.contact.name ?? 'cliente';

      // Canais PRÓPRIOS do cliente (own-channels-first): push (tem app) e/ou e-mail (conta ou
      // walk-in com e-mail e a pref ligada). O WhatsApp vira o ÚLTIMO recurso - só sai quando
      // não há NENHUM canal próprio, reduzindo dependência do WhatsApp/Meta.
      const account = appt.contact.customerAccount;
      const emailTo = account?.email ?? appt.contact.email;
      const emailPrefOn = account?.appointmentEmailsEnabled ?? true;
      const hasEmail = !!emailTo && emailPrefOn;
      const devices = account?.pushDevices ?? [];
      const hasPush = devices.length > 0;
      const hasOwnChannel = hasPush || hasEmail;
      // Log do canal primário 1x por lembrete: só quando NADA saiu ainda (nenhum carimbo,
      // nenhum marco de push). Depois do primeiro envio ao menos um está setado -> não re-loga.
      const firstTouch =
        appt.reminderSentAt == null &&
        appt.reminderEmailSentAt == null &&
        appt.reminderPushSentAt == null &&
        appt.reminderPushMarks.length === 0;

      // --- Lembrete por WhatsApp: SÓ como fallback (sem push nem e-mail), se o cliente tem
      // número, o tenant tem número, o cliente não pediu pra sair, cota ok e ainda não enviou.
      // Cliente com app ou e-mail recebe pelos canais próprios - o WhatsApp não sai. ---
      if (
        now >= waDueAt &&
        !hasOwnChannel &&
        appt.contact.phone != null &&
        waNumberId &&
        !whatsappBlocked &&
        (remindersLimit == null || remindersUsed < remindersLimit) &&
        appt.reminderSentAt == null &&
        appt.contact.remindersOptOutAt == null
      ) {
        let sent = false;

        if (waTemplateName) {
          // Caminho oficial: template aprovado pela Meta. Escapa da regra das 24h.
          try {
            await sendTemplateMessage(
              waNumberId,
              appt.contact.phone,
              waTemplateName,
              waTemplateLang,
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
              extra: { tenantId: tenant.id, appointmentId: appt.id, template: waTemplateName },
            });
            // O erro da Meta é genérico (#135000) e não diz o motivo. Confirma na Graph API se
            // o número foi banido; se foi, marca o tenant e para o WhatsApp nos demais appts -
            // mas o e-mail continua. SÓ pro número PRÓPRIO: o da plataforma é compartilhado,
            // um ban dele é problema de plataforma, não deste tenant.
            if (ownNumberId && (await flagIfBanned(tenant))) whatsappBlocked = true;
          }
        } else if (waAllowFreeform) {
          // Fallback: freeform (só no número próprio, e só se o cliente escreveu nas últimas 24h)
          const greeting = appt.contact.name ? `Oi, ${appt.contact.name}!` : 'Oi!';
          const text =
            `${greeting} Passando pra lembrar do seu agendamento na ${tenant.name}:\n\n` +
            `📅 ${when}\n` +
            `✂️ ${appt.service.name}\n\n` +
            `Se precisar remarcar ou cancelar, é só me chamar por aqui. Até lá!`;

          sent = await sendTextSafely(waNumberId, appt.contact.phone, text, {
            phone: appt.contact.phone,
            phoneNumberId: waNumberId,
            tenantId: tenant.id,
            flow: 'reminder',
          });
        }

        if (sent) {
          remindersUsed++;
          anySent = true;
          await prisma.appointment.update({
            where: { id: appt.id },
            data: { reminderSentAt: new Date() },
          });
        }
      }

      // --- Lembrete por e-mail AO CLIENTE (canal próprio, independente do WhatsApp). Sai no
      // marco de 1h (REMINDER_MARKS), não na antecedência do WhatsApp: e-mail 24h antes é
      // cedo demais pra servir de lembrete. ---
      if (appt.reminderEmailSentAt == null && dueMarks.some((m) => m.email)) {
        // Só carimba quando o e-mail REALMENTE saiu (ou quando não há destinatário/opt-out).
        // Carimbar em falha - Resend fora do ar, env ausente - fazia o lembrete sumir de vez;
        // sem carimbo o appt volta no próximo tick e tenta de novo até a hora do atendimento.
        let done = true;
        if (hasEmail) {
          done = await emailAppointmentReminder({
            to: emailTo!,
            customerName: account?.name ?? appt.contact.name ?? null,
            tenantName: tenant.name,
            when,
            serviceName: appt.service.name,
          }).catch((err) => {
            console.error('[reminders] e-mail de lembrete falhou', err);
            Sentry.captureException(err, { tags: { component: 'reminders', mode: 'email' } });
            return false;
          });
        }
        // O carimbo é zerado na remarcação (REMINDER_STAMPS_RESET).
        if (done) {
          anySent = anySent || hasEmail;
          await prisma.appointment.update({
            where: { id: appt.id },
            data: { reminderEmailSentAt: new Date() },
          });
        }
      }

      // --- Lembrete por PUSH ao cliente (app). Vai pra qualquer aparelho registrado:
      // instalar o app e permitir notificações É o opt-in. ponytail: sem pref dedicada;
      // adicionar `pushEnabled` na conta se um dia precisar de controle granular. ---
      if (dueMarks.length > 0) {
        // Vários marcos vencidos = o loop ficou parado (downtime). Manda UM push (o do marco
        // mais perto do atendimento, que é o que ainda importa) e consome todos - a volta do
        // bot não pode virar rajada de três notificações iguais.
        const lead = Math.min(...dueMarks.map((m) => m.minutes));
        const title =
          lead >= 1440
            ? 'Seu agendamento é amanhã'
            : lead >= 60
              ? 'Seu agendamento é daqui a pouco'
              : 'Seu agendamento é já já';

        // Só carimba quando o push REALMENTE saiu. Carimbar em falha - Expo fora do ar,
        // credencial FCM recusada, todos os tokens mortos - fazia o lembrete sumir de vez;
        // sem carimbo o marco volta no próximo tick. Mesma regra do e-mail acima.
        let done = true;
        if (hasPush) {
          const { invalidTokens, sent } = await sendExpoPush(
            devices.map((d) => ({
              to: d.expoPushToken,
              title,
              body: `${appt.service.name} · ${when} na ${tenant.name}`,
              data: { appointmentId: appt.id },
            })),
          );
          done = sent > 0;
          // Remove tokens mortos que a Expo reportou (app desinstalado / permissão off).
          if (invalidTokens.length > 0) {
            await prisma.pushDevice.deleteMany({
              where: { expoPushToken: { in: invalidTokens } },
            });
          }
        }
        // O loop só logava em erro: "não recebi o lembrete" virava investigação às cegas
        // (aparelho registrado? o appt entrou na janela?). Uma linha por lembrete responde.
        console.log(
          `[reminders] push appt=${appt.id} marcos=${dueMarks.map((m) => m.minutes).join(',')} ` +
            `devices=${devices.length} enviado=${hasPush && done}`,
        );
        if (done) {
          anySent = anySent || hasPush;
          const minutes = dueMarks.map((m) => m.minutes);
          await prisma.appointment.update({
            where: { id: appt.id },
            data: {
              reminderPushMarks: { push: minutes },
              // Último marco = ciclo encerrado; é o carimbo que tira o appt do lote.
              ...(minutes.includes(LAST_REMINDER_MARK) ? { reminderPushSentAt: new Date() } : {}),
            },
          });
        }
      }

      // Métrica: registra o canal PRIMÁRIO deste lembrete (own-first) uma única vez.
      // whatsapp elegível = tem número/tenant-número/não optou por sair (a cota é edge do
      // envio, não muda o primário own-first). Fire-and-forget: nunca derruba o tick.
      if (firstTouch && anySent) {
        const waEligible =
          appt.contact.phone != null &&
          waNumberId != null &&
          appt.contact.remindersOptOutAt == null;
        const { primary } = pickChannels({ push: hasPush, email: hasEmail, whatsapp: waEligible });
        await prisma.commsDelivery
          .create({
            data: { tenantId: tenant.id, commsType: 'appointment_reminder', channel: primary },
          })
          .catch((err) => console.error('[reminders] log de canal falhou', err));
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
