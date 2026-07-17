import 'server-only';

import { prisma } from '@haru/database';
import { formatBRL } from '@haru/shared';

import { appUrl } from '@/lib/email';

import { createNotification } from './notifications';
import {
  notifyPreferOwnChannels,
  type ChannelPayload,
  type OwnChannelTarget,
} from './prefer-own-channels';

/**
 * Fan-out multi-canal dos eventos da ASSINATURA DE SERVIÇOS do cliente final ("Clube").
 * Separado de comms/events.ts (que é escopado ao billing DONO->Demandaê). Cada canal é
 * best-effort (Promise.allSettled): falha de um nunca derruba o webhook/cron.
 *
 * CLIENTE: own-channels-first (notifyPreferOwnChannels) - push+e-mail quando existem, WhatsApp
 * pela plataforma só como fallback (sem push nem e-mail) OU como garantia na falha de pagamento
 * (whatsappAlways, comms crítico de dinheiro). NÃO usa o model Notification (sino do DONO).
 * DONO: notificação in-app (createNotification). WhatsApp usa o número da PLATAFORMA Demandaê
 * (nunca o do tenant) - templates UTILITY aprovados na Meta (ver README). Cada envio registra o
 * canal primário em CommsDelivery (métrica de redução de WhatsApp).
 */

type MembershipCtx = NonNullable<Awaited<ReturnType<typeof loadCtx>>>;

function loadCtx(membershipId: string) {
  return prisma.membership.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      planName: true,
      creditsPerCycle: true,
      creditBalance: true,
      priceCents: true,
      currentPeriodEnd: true,
      creditsExpireAt: true,
      tenant: { select: { id: true, name: true, slug: true } },
      // Opt-out "PARAR" do WhatsApp é por-tenant (no Contact); só pesa quando o WhatsApp de
      // fato sairia (fallback sem canal próprio ou garantia da falha de pagamento).
      contact: { select: { remindersOptOutAt: true } },
      customerAccount: {
        select: {
          name: true,
          email: true,
          phone: true,
          pushDevices: { select: { expoPushToken: true } },
        },
      },
    },
  });
}

/** "31/07/2026" no fuso local (data de vencimento/renovação exibida ao cliente). */
function dateShort(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

/**
 * Dispara os canais do CLIENTE via seletor own-channels-first: push+e-mail quando existem,
 * WhatsApp só como fallback (sem canal próprio) OU como garantia quando `whatsappAlways`
 * (falha de pagamento). `link` é o destino do e-mail/WhatsApp (a área do cliente ainda não
 * existe - aponta pra página do tenant). Registra o canal primário em CommsDelivery.
 */
async function notifyCustomer(
  ctx: MembershipCtx,
  args: {
    push: { title: string; body: string };
    waTemplate: string | undefined;
    waParams: string[];
    email: { subject: string; body: string; cta: string };
    link: string;
    /** type do payload de push (deep-link no app). */
    pushType: string;
    /** identificador do comms pro log de canal (ex.: 'clubsub_activated'). */
    commsType: string;
    /** WhatsApp sai junto dos canais próprios (só na falha de pagamento - crítico de dinheiro). */
    whatsappAlways?: boolean;
  },
): Promise<void> {
  const acc = ctx.customerAccount;
  const target: OwnChannelTarget = {
    email: acc.email,
    phone: acc.phone,
    pushDevices: acc.pushDevices,
  };
  const payload: ChannelPayload = {
    push: {
      ...args.push,
      data: { type: args.pushType, membershipId: ctx.id, slug: ctx.tenant.slug },
    },
    email: { ...args.email, link: args.link },
    whatsapp: { template: args.waTemplate, params: args.waParams },
  };
  await notifyPreferOwnChannels(target, payload, {
    whatsappOptOut: ctx.contact?.remindersOptOutAt != null,
    whatsappAlways: args.whatsappAlways,
    log: { tenantId: ctx.tenant.id, commsType: args.commsType },
  });
}

/** Nome curto do cliente pro texto ("cliente" se não tiver). */
function who(ctx: MembershipCtx): string {
  return ctx.customerAccount.name ?? 'cliente';
}

// --- Eventos ao CLIENTE ------------------------------------------------------

/** Assinatura ativada (1º pagamento confirmado). */
export async function notifySubscriptionActivated(membershipId: string): Promise<void> {
  const ctx = await loadCtx(membershipId);
  if (!ctx) return;
  const link = `${appUrl()}/${ctx.tenant.slug}`;
  const n = ctx.creditsPerCycle;
  await notifyCustomer(ctx, {
    pushType: 'clubsub_activated',
    commsType: 'clubsub_activated',
    link,
    push: {
      title: `Seu ${ctx.planName} está ativo! 🎉`,
      body: `Você tem ${n} ${n === 1 ? 'crédito' : 'créditos'} este mês em ${ctx.tenant.name}.`,
    },
    waTemplate: process.env.WHATSAPP_TEMPLATE_CLUBSUB_ACTIVATED,
    waParams: [who(ctx), ctx.planName, ctx.tenant.name, String(n)],
    email: {
      subject: `Seu ${ctx.planName} está ativo`,
      body: `Deu tudo certo! Sua assinatura <strong>${ctx.planName}</strong> em <strong>${ctx.tenant.name}</strong> está ativa e você já tem <strong>${n} ${n === 1 ? 'crédito' : 'créditos'}</strong> pra usar este mês. É só agendar - o crédito desconta sozinho.`,
      cta: 'Agendar agora',
    },
  });
}

/** Ciclo renovado: cobrança feita + créditos recarregados (recibo folded aqui). */
export async function notifySubscriptionRenewed(
  membershipId: string,
  amountCents: number | null,
): Promise<void> {
  const ctx = await loadCtx(membershipId);
  if (!ctx) return;
  const link = `${appUrl()}/${ctx.tenant.slug}`;
  const n = ctx.creditsPerCycle;
  const valor = amountCents != null ? formatBRL(amountCents) : formatBRL(ctx.priceCents);
  await notifyCustomer(ctx, {
    pushType: 'clubsub_renewed',
    commsType: 'clubsub_renewed',
    link,
    push: {
      title: `Seus ${n} ${n === 1 ? 'crédito' : 'créditos'} chegaram`,
      body: `${ctx.planName} renovado. Bom pra mais um mês!`,
    },
    waTemplate: process.env.WHATSAPP_TEMPLATE_CLUBSUB_CREDITS_RENEWED,
    waParams: [who(ctx), String(n), ctx.planName],
    email: {
      subject: `Seus créditos de ${ctx.planName} renovaram`,
      body: `Cobramos <strong>${valor}</strong> e recarregamos seu <strong>${ctx.planName}</strong>: você tem <strong>${n} ${n === 1 ? 'crédito' : 'créditos'}</strong> novos pra usar este mês em ${ctx.tenant.name}.`,
      cta: 'Agendar',
    },
  });
}

/** Pagamento falhou (cartão recusado/vencido): créditos suspensos até regularizar. */
export async function notifySubscriptionPaymentFailed(membershipId: string): Promise<void> {
  const ctx = await loadCtx(membershipId);
  if (!ctx) return;
  // ponytail: CTA aponta pra página do tenant; o deep-link exato de "atualizar cartão"
  // (fatura hospedada do Asaas via getPendingInvoiceUrl) entra quando a área do cliente
  // existir (sessão de UI). Sem ela não há destino in-app pra mandar o cliente.
  const link = `${appUrl()}/${ctx.tenant.slug}`;
  await notifyCustomer(ctx, {
    pushType: 'clubsub_payment_failed',
    commsType: 'clubsub_payment_failed',
    // Crítico de dinheiro: a assinatura suspende se não regularizar. WhatsApp sai como
    // GARANTIA junto de push+e-mail (respeitando o opt-out "PARAR"), não só como fallback.
    whatsappAlways: true,
    link,
    push: {
      title: 'Não conseguimos cobrar seu Clube',
      body: `Atualize seu cartão pra manter o ${ctx.planName} ativo.`,
    },
    waTemplate: process.env.WHATSAPP_TEMPLATE_CLUBSUB_PAYMENT_FAILED,
    waParams: [who(ctx), ctx.planName, ctx.tenant.name, link],
    email: {
      subject: `Problema no pagamento do seu ${ctx.planName}`,
      body: `Não conseguimos cobrar a mensalidade do seu <strong>${ctx.planName}</strong> em ${ctx.tenant.name}. Seus créditos ficam pausados até regularizar. Atualize seu cartão pra reativar - vamos tentar de novo automaticamente.`,
      cta: 'Atualizar cartão',
    },
  });
}

/** Assinatura cancelada: créditos valem até o fim do ciclo pago. */
export async function notifySubscriptionCanceled(membershipId: string): Promise<void> {
  const ctx = await loadCtx(membershipId);
  if (!ctx) return;
  const link = `${appUrl()}/${ctx.tenant.slug}`;
  const until = ctx.currentPeriodEnd ? dateShort(ctx.currentPeriodEnd) : null;
  await notifyCustomer(ctx, {
    pushType: 'clubsub_canceled',
    commsType: 'clubsub_canceled',
    link,
    push: {
      title: `${ctx.planName} cancelado`,
      body: until ? `Seus créditos valem até ${until}.` : 'Assinatura encerrada.',
    },
    waTemplate: process.env.WHATSAPP_TEMPLATE_CLUBSUB_CANCELED,
    waParams: [who(ctx), ctx.planName, until ?? 'hoje'],
    email: {
      subject: `Seu ${ctx.planName} foi cancelado`,
      body: `Cancelamos seu <strong>${ctx.planName}</strong> em ${ctx.tenant.name}, como você pediu - você não será mais cobrado.${until ? ` Seus créditos continuam valendo até <strong>${until}</strong>, então dá pra usar o que sobrou.` : ''} Quando quiser voltar, é só assinar de novo.`,
      cta: 'Ver planos',
    },
  });
}

/** Créditos acabando (resta N). Disparado no consumo quando cruza o limiar baixo. */
export async function notifyCreditsLow(membershipId: string): Promise<void> {
  const ctx = await loadCtx(membershipId);
  if (!ctx) return;
  const link = `${appUrl()}/${ctx.tenant.slug}`;
  const left = ctx.creditBalance;
  await notifyCustomer(ctx, {
    pushType: 'clubsub_credits_low',
    commsType: 'clubsub_credits_low',
    link,
    push: {
      title: `Resta ${left} ${left === 1 ? 'crédito' : 'créditos'} este mês`,
      body: `Do seu ${ctx.planName} em ${ctx.tenant.name}.`,
    },
    waTemplate: process.env.WHATSAPP_TEMPLATE_CLUBSUB_CREDITS_LOW,
    waParams: [who(ctx), String(left), ctx.planName],
    email: {
      subject: `Resta ${left} ${left === 1 ? 'crédito' : 'créditos'} no seu ${ctx.planName}`,
      body: `Você já usou quase todos os créditos deste mês. Resta <strong>${left}</strong>. Eles renovam no próximo ciclo.`,
      cta: 'Agendar',
    },
  });
}

/**
 * Avisa "créditos acabando" SE o saldo caiu a <=1 e ainda não avisamos NESTE ciclo. Chamado
 * (fire-and-forget) após consumir um crédito no agendamento. Dedup por ciclo via
 * lowCreditsNotifiedAt vs currentPeriodStart, marcado antes de disparar (idempotente).
 */
export async function notifyCreditsLowIfNeeded(membershipId: string): Promise<void> {
  const m = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { creditBalance: true, currentPeriodStart: true, lowCreditsNotifiedAt: true },
  });
  if (!m || m.creditBalance > 1) return; // ainda tem folga
  const notifiedThisCycle =
    m.lowCreditsNotifiedAt != null &&
    m.currentPeriodStart != null &&
    m.lowCreditsNotifiedAt >= m.currentPeriodStart;
  if (notifiedThisCycle) return;
  // Marca ANTES de disparar (evita corrida de dois consumos avisarem duas vezes).
  await prisma.membership.update({
    where: { id: membershipId },
    data: { lowCreditsNotifiedAt: new Date() },
  });
  await notifyCreditsLow(membershipId);
}

/** Créditos vencendo (só planos sem rollover; cron, alguns dias antes do fim do ciclo). */
export async function notifyCreditsExpiring(membershipId: string): Promise<void> {
  const ctx = await loadCtx(membershipId);
  if (!ctx || ctx.creditBalance <= 0 || !ctx.creditsExpireAt) return;
  const link = `${appUrl()}/${ctx.tenant.slug}`;
  const when = dateShort(ctx.creditsExpireAt);
  const left = ctx.creditBalance;
  await notifyCustomer(ctx, {
    pushType: 'clubsub_credits_expiring',
    commsType: 'clubsub_credits_expiring',
    link,
    push: {
      title: `${left} ${left === 1 ? 'crédito vence' : 'créditos vencem'} em ${when}`,
      body: `Use antes que renove o ${ctx.planName}.`,
    },
    waTemplate: process.env.WHATSAPP_TEMPLATE_CLUBSUB_CREDITS_EXPIRING,
    waParams: [who(ctx), String(left), when],
    email: {
      subject: `Seus créditos vencem em ${when}`,
      body: `Você tem <strong>${left} ${left === 1 ? 'crédito' : 'créditos'}</strong> do <strong>${ctx.planName}</strong> que vencem em <strong>${when}</strong> (este plano não acumula). Aproveite antes que o ciclo renove.`,
      cta: 'Agendar',
    },
  });
}

// --- Eventos ao DONO (in-app, sino do painel) --------------------------------

async function ownerNotif(
  membershipId: string,
  kind: string,
  copy: (planName: string, customerName: string) => { title: string; body: string },
): Promise<void> {
  const ctx = await loadCtx(membershipId);
  if (!ctx) return;
  const c = copy(ctx.planName, who(ctx));
  await createNotification(ctx.tenant.id, 'ACCOUNT', kind, {
    title: c.title,
    body: c.body,
    ctaLabel: 'Ver assinaturas',
    ctaHref: '/assinaturas-clientes',
  });
}

/** Novo assinante do clube. */
export function notifyOwnerNewMember(membershipId: string): Promise<void> {
  return ownerNotif(membershipId, 'clubsub.new_member', (plan, name) => ({
    title: 'Novo assinante 🎉',
    body: `${name} assinou o ${plan}. Receita recorrente na conta.`,
  }));
}

/** Assinante cancelou. */
export function notifyOwnerMemberCanceled(membershipId: string): Promise<void> {
  return ownerNotif(membershipId, 'clubsub.member_canceled', (plan, name) => ({
    title: 'Assinante cancelou',
    body: `${name} cancelou o ${plan}. Os créditos valem até o fim do ciclo pago.`,
  }));
}

/** Pagamento de um assinante falhou. */
export function notifyOwnerMemberPaymentFailed(membershipId: string): Promise<void> {
  return ownerNotif(membershipId, 'clubsub.member_payment_failed', (plan, name) => ({
    title: 'Pagamento de assinante falhou',
    body: `A cobrança do ${plan} de ${name} não passou. Os créditos ficam suspensos até regularizar.`,
  }));
}
