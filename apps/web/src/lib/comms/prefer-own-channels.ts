import 'server-only';

import { brandedShell, sendEmail } from '@/lib/email';

import { sendPushSafe } from './push';
import { sendPlatformWhatsapp } from './whatsapp';

/**
 * Seletor de canal "own-channels-first": prioriza os canais PRÓPRIOS (push + email, sem
 * custo de template e sem risco de plataforma) e usa WhatsApp só como ÚLTIMO RECURSO -
 * quando não há NEM push NEM email. É a generalização de notifyCustomer
 * (subscription-events.ts), que hoje manda WhatsApp sempre que não há push, mesmo com
 * email. Estabelecido aqui como padrão reutilizável; outros comms migram depois.
 *
 * Decisão por ELEGIBILIDADE, não por sucesso de envio: push é fire-and-forget (Expo) e o
 * email pode ter falha transitória do Resend - esperar falhar pra cair no WhatsApp mandaria
 * WhatsApp em toda instabilidade. Se existe canal próprio, o WhatsApp não sai.
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
export type SentChannels = {
  push: boolean;
  email: boolean;
  whatsapp: boolean;
  primary: 'PUSH' | 'EMAIL' | 'WHATSAPP' | 'NONE';
};

/**
 * Decide os canais SEM enviar (pura). Exposta pra reivindicar o canal primário antes do
 * envio (dedup atômico do lembrete de retorno). notifyPreferOwnChannels a reusa.
 */
export function channelDecision(
  t: OwnChannelTarget,
  p: ChannelPayload,
  opts: { whatsappOptOut: boolean },
): SentChannels {
  const push = t.pushDevices.length > 0 && !!p.push;
  const email = !!t.email && !!p.email;
  // WhatsApp só quando não há NENHUM canal próprio (e o cliente não pediu "PARAR").
  const whatsapp = !push && !email && !!t.phone && !opts.whatsappOptOut && !!p.whatsapp;
  return {
    push,
    email,
    whatsapp,
    primary: push ? 'PUSH' : email ? 'EMAIL' : whatsapp ? 'WHATSAPP' : 'NONE',
  };
}

export async function notifyPreferOwnChannels(
  t: OwnChannelTarget,
  p: ChannelPayload,
  opts: { whatsappOptOut: boolean },
): Promise<SentChannels> {
  const { push, email, whatsapp } = channelDecision(t, p, opts);

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

  return {
    push,
    email,
    whatsapp,
    primary: push ? 'PUSH' : email ? 'EMAIL' : whatsapp ? 'WHATSAPP' : 'NONE',
  };
}
