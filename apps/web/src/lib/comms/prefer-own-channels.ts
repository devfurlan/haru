import 'server-only';

import { prisma } from '@haru/database';
import { pickChannels, type ChannelPlan, type CommsPrimary } from '@haru/shared';

import { brandedShell, sendEmail } from '@/lib/email';

import { sendPushSafe } from './push';
import { sendPlatformWhatsapp } from './whatsapp';

/**
 * Seletor de canal "own-channels-first" (lado WEB): prioriza os canais PRÓPRIOS (push +
 * email, sem custo de template e sem risco de plataforma) e usa WhatsApp só como ÚLTIMO
 * RECURSO - quando não há NEM push NEM email (fallback), ou como REFORÇO/garantia quando
 * `whatsappAlways` (comms crítico de dinheiro ou sensível a tempo real). A DECISÃO pura vive
 * em @haru/shared (pickChannels), compartilhada com o bot; aqui ficam os senders do web + o
 * log de canal pra métrica.
 *
 * Decisão por ELEGIBILIDADE, não por sucesso de envio: push é fire-and-forget (Expo) e o
 * email pode ter falha transitória do Resend - esperar falhar pra cair no WhatsApp mandaria
 * WhatsApp em toda instabilidade.
 */

/** Alvo do envio. Espelha o `account` do review-invite; email/phone podem vir do Contact. */
export type OwnChannelTarget = {
  email: string | null;
  phone: string | null;
  pushDevices: { expoPushToken: string }[];
};

export type ChannelPayload = {
  push?: { title: string; body: string; data: Record<string, unknown> };
  email?: { subject: string; body: string; cta: string; link: string };
  whatsapp?: { template: string | undefined; params: string[] };
};

/** Canal PRIMÁRIO pela hierarquia (pro log de métrica) + o que de fato foi tentado. */
export type SentChannels = ChannelPlan;

type ChannelOpts = {
  whatsappOptOut: boolean;
  /** WhatsApp sai JUNTO dos canais próprios (garantia/reforço), não só como fallback. */
  whatsappAlways?: boolean;
};

/** Log opcional de métrica: registra o canal primário em CommsDelivery. */
type LogRef = { tenantId: string; commsType: string };

/**
 * Decide os canais SEM enviar (pura, via pickChannels do shared). Exposta pra reivindicar o
 * canal primário antes do envio (dedup atômico do lembrete de retorno). notifyPreferOwnChannels
 * a reusa.
 */
export function channelDecision(
  t: OwnChannelTarget,
  p: ChannelPayload,
  opts: ChannelOpts,
): SentChannels {
  return pickChannels(
    {
      push: t.pushDevices.length > 0 && !!p.push,
      email: !!t.email && !!p.email,
      whatsapp: !!t.phone && !opts.whatsappOptOut && !!p.whatsapp,
    },
    { whatsappAlways: opts.whatsappAlways },
  );
}

/** Grava o canal primário do comms (fire-and-forget: nunca derruba o envio). */
export async function logCommsDelivery(
  tenantId: string,
  commsType: string,
  channel: CommsPrimary,
): Promise<void> {
  try {
    await prisma.commsDelivery.create({ data: { tenantId, commsType, channel } });
  } catch (err) {
    console.error('[comms] log de canal falhou', commsType, err);
  }
}

export async function notifyPreferOwnChannels(
  t: OwnChannelTarget,
  p: ChannelPayload,
  opts: ChannelOpts & { log?: LogRef },
): Promise<SentChannels> {
  const decision = channelDecision(t, p, opts);
  const { push, email, whatsapp } = decision;

  await Promise.allSettled([
    push
      ? sendPushSafe(
          t.pushDevices.map((d) => d.expoPushToken),
          p.push!,
        )
      : Promise.resolve(),
    email
      ? sendEmail(
          t.email!,
          p.email!.subject,
          brandedShell(p.email!.subject, p.email!.body, p.email!.cta, p.email!.link),
        )
      : Promise.resolve(),
    whatsapp
      ? sendPlatformWhatsapp(t.phone!, p.whatsapp!.template, p.whatsapp!.params)
      : Promise.resolve(),
  ]);

  if (opts.log) await logCommsDelivery(opts.log.tenantId, opts.log.commsType, decision.primary);

  return decision;
}
