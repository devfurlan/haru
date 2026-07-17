import 'server-only';

import { prisma } from '@haru/database';

import { appUrl } from '@/lib/email';

import {
  notifyPreferOwnChannels,
  type ChannelPayload,
  type OwnChannelTarget,
} from './prefer-own-channels';
import { reviewInviteWindow } from './review-invite-core';

export { REVIEW_INVITE_DELAY_HOURS } from './review-invite-core';

/**
 * Convite pós-atendimento pra avaliar. Disparado pelo cron /api/cron/review-invites (hourly).
 *
 * Gatilho = o MESMO heurístico do isReviewable com offset: `endsAt + delay < now` e status
 * não cancelado/falta. NÃO usa status=COMPLETED de propósito (só é setado pelo cron de fim de
 * dia às 04:00 UTC -> convite no dia errado). Quando o convite dispara, como `endsAt>startsAt`,
 * o gate de escrita (canReview, que só exige startsAt<now) já passa - todo convidado consegue
 * gravar. E canReview é re-checado no upsertReview, então um NO_SHOW marcado depois ainda
 * bloqueia a avaliação (backstop do offset curto).
 *
 * Canais (own-channels-first): push+e-mail quando existem; WhatsApp pela plataforma (template
 * UTILITY, respeitando opt-out) só como fallback pra quem não tem canal próprio. Comms de
 * relacionamento - WhatsApp é dispensável quando push/e-mail cobrem. Tudo best-effort.
 *
 * O núcleo puro (janela + elegibilidade) vive em review-invite-core.ts (testável sem IO).
 */

/**
 * Convida quem terminou o atendimento há `delay` horas (janela `[delay, delay+slack]`) e ainda
 * não foi convidado nem avaliou o estabelecimento. Carimba reviewInviteSentAt após despachar.
 */
export async function dispatchReviewInvites(now: Date): Promise<{ checked: number; sent: number }> {
  const { lower, upper } = reviewInviteWindow(now);

  const appts = await prisma.appointment.findMany({
    where: {
      endsAt: { gte: lower, lte: upper },
      status: { notIn: ['CANCELED', 'NO_SHOW'] },
      reviewInviteSentAt: null,
      // Precisa de conta de cliente E que ela não tenha desligado o convite no perfil.
      contact: { customerAccount: { is: { reviewInvitesEnabled: true } } },
    },
    select: {
      id: true,
      tenantId: true,
      service: { select: { name: true } },
      professional: { select: { name: true } },
      tenant: { select: { name: true, slug: true } },
      contact: {
        select: {
          remindersOptOutAt: true,
          customerAccount: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              pushDevices: { select: { expoPushToken: true } },
            },
          },
        },
      },
    },
  });

  let sent = 0;
  for (const appt of appts) {
    const acc = appt.contact.customerAccount;
    if (!acc) continue; // o filtro já garante, mas o tipo é nullable

    // ponytail: findUnique por linha (Review não é relação de Appointment). Ok no volume da
    // janela; se crescer, pré-carregar as reviews do lote num Set (customerAccountId+tenantId).
    const already = await prisma.review.findUnique({
      where: { customerAccountId_tenantId: { customerAccountId: acc.id, tenantId: appt.tenantId } },
      select: { customerAccountId: true },
    });
    if (already) {
      // Já avaliou este estabelecimento: nada a convidar. Carimba pra não reprocessar todo tick.
      await stamp(appt.id, now);
      continue;
    }

    try {
      await notifyReviewInvite({
        appointmentId: appt.id,
        tenantId: appt.tenantId,
        tenantName: appt.tenant.name,
        tenantSlug: appt.tenant.slug,
        serviceName: appt.service.name,
        professionalName: appt.professional.name,
        account: acc,
        optOut: appt.contact.remindersOptOutAt != null,
      });
    } catch (err) {
      // Sem carimbo -> retenta no próximo tick (enquanto estiver na janela).
      console.error('[review-invite] falha ao despachar', appt.id, err);
      continue;
    }
    await stamp(appt.id, now);
    sent += 1;
  }

  return { checked: appts.length, sent };
}

function stamp(appointmentId: string, now: Date): Promise<unknown> {
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { reviewInviteSentAt: now },
  });
}

async function notifyReviewInvite(args: {
  appointmentId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  serviceName: string;
  professionalName: string | null;
  account: {
    name: string | null;
    email: string | null;
    phone: string | null;
    pushDevices: { expoPushToken: string }[];
  };
  optOut: boolean;
}): Promise<void> {
  const { account } = args;
  const link = `${appUrl()}/conta/agendamentos/${args.appointmentId}/avaliar`;
  const withPro = args.professionalName ? ` com ${args.professionalName}` : '';
  const subject = `Como foi seu ${args.serviceName} em ${args.tenantName}?`;

  const target: OwnChannelTarget = {
    email: account.email,
    phone: account.phone,
    pushDevices: account.pushDevices,
  };
  const payload: ChannelPayload = {
    push: {
      title: `Como foi seu ${args.serviceName}?`,
      body: `Toca pra avaliar ${args.tenantName}${withPro}.`,
      data: { type: 'review_request', appointmentId: args.appointmentId, tenantSlug: args.tenantSlug },
    },
    email: {
      subject,
      body: `Seu atendimento${withPro} em <strong>${args.tenantName}</strong> já passou. Conta rapidinho como foi - leva 10 segundos e ajuda outras pessoas a escolher.`,
      cta: 'Avaliar atendimento',
      link,
    },
    whatsapp: {
      template: process.env.WHATSAPP_TEMPLATE_REVIEW_INVITE,
      params: [account.name ?? 'cliente', args.serviceName, args.tenantName, link],
    },
  };
  await notifyPreferOwnChannels(target, payload, {
    whatsappOptOut: args.optOut,
    log: { tenantId: args.tenantId, commsType: 'review_invite' },
  });
}
