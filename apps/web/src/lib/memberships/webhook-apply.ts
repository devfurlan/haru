import 'server-only';

import { type Membership, prisma } from '@haru/database';
import type { ParsedWebhook } from '@haru/payments';

import {
  notifyOwnerMemberCanceled,
  notifyOwnerMemberPaymentFailed,
  notifyOwnerNewMember,
  notifySubscriptionActivated,
  notifySubscriptionCanceled,
  notifySubscriptionPaymentFailed,
  notifySubscriptionRenewed,
} from '@/lib/comms/subscription-events';

import { computeGrant } from './credit-grant';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/**
 * VIA ÚNICA de aplicação de um evento de cobrança de assinatura de serviços ao nosso estado
 * (status da Membership, saldo de créditos, ledger, recibo MembershipCharge, notificações).
 * Chamada com o MESMO ParsedWebhook pelo webhook do gateway (evento real) E pela reconciliação
 * (evento sintético a partir de uma cobrança paga que o webhook não entregou).
 *
 * Idempotente: o grant de crédito é feito no MÁXIMO uma vez por cobrança (dedup pelo
 * MembershipCharge já PAID - o gateway manda CONFIRMED e RECEIVED pro mesmo pagamento). Espelha
 * apps/web/src/lib/billing/webhook-apply.ts, porém na conta do TENANT e com créditos no lugar
 * de acesso ao SaaS.
 */
export async function applyMembershipEvent(parsed: ParsedWebhook): Promise<void> {
  const subId = parsed.subscriptionExternalId;
  if (!subId) return; // não é cobrança de assinatura

  const membership = await prisma.membership.findUnique({
    where: { gatewaySubscriptionId: subId },
  });
  if (!membership) return; // outro ambiente/sandbox

  switch (parsed.status) {
    case 'PAID':
      return applyPaid(membership, parsed);
    case 'EXPIRED': // PAYMENT_OVERDUE (Pix/boleto não pago)
    case 'FAILED': // cartão recusado no fim do dunning
      return applyPastDue(membership, parsed);
    case 'REFUNDED':
    case 'CANCELED':
      return applyCanceledByGateway(membership, parsed);
    default:
      return; // PENDING / desconhecido -> no-op
  }
}

async function applyPaid(membership: Membership, parsed: ParsedWebhook): Promise<void> {
  const { provider } = membership;
  const externalId = parsed.externalId;

  // Fast-path: se já registramos esta cobrança como PAID, o crédito já foi concedido
  // (CONFIRMED e RECEIVED chegam pro mesmo pagamento). Evita abrir tx à toa - a garantia
  // real de exactly-once é o re-check DENTRO da tx, sob o lock.
  if (externalId) {
    const existing = await prisma.membershipCharge.findUnique({
      where: { provider_externalId: { provider, externalId } },
      select: { status: true },
    });
    if (existing?.status === 'PAID') return;
  }

  const now = parsed.paidAt ?? new Date();
  const wasPending = membership.status === 'PENDING';
  const wasActive = membership.status === 'ACTIVE';
  const wasPastDue = membership.status === 'PAST_DUE';
  const periodStart = now;
  const periodEnd = addMonths(now, 1);
  // Sem rollover, os créditos do ciclo vencem no fim dele (alimenta o aviso "vencendo").
  const creditsExpireAt = membership.creditRollover ? null : periodEnd;
  const amountCents = parsed.amountCents ?? membership.priceCents;

  const granted = await prisma.$transaction(async (tx) => {
    // Lock da linha: serializa com (a) um CONSUMO concorrente na hora da renovação e (b) uma
    // entrega DUPLA do mesmo pagamento. Sob o lock, o grant é calculado do saldo FRESCO e
    // deduplicado - exactly-once mesmo em corrida.
    await tx.$executeRaw`SELECT id FROM "Membership" WHERE id = ${membership.id} FOR UPDATE`;

    if (externalId) {
      const existing = await tx.membershipCharge.findUnique({
        where: { provider_externalId: { provider, externalId } },
        select: { status: true },
      });
      if (existing?.status === 'PAID') return false; // já concedido por uma entrega paralela
    }

    const fresh = await tx.membership.findUnique({
      where: { id: membership.id },
      select: { creditBalance: true },
    });
    const grant = computeGrant(
      fresh?.creditBalance ?? membership.creditBalance,
      membership.creditsPerCycle,
      membership.creditRollover,
      membership.rolloverCap,
    );

    let chargeId: string | null = null;
    if (externalId) {
      const charge = await tx.membershipCharge.upsert({
        where: { provider_externalId: { provider, externalId } },
        create: {
          tenantId: membership.tenantId,
          membershipId: membership.id,
          provider,
          method: 'CREDIT_CARD',
          status: 'PAID',
          amountCents,
          periodStart,
          periodEnd,
          externalId,
          paidAt: now,
        },
        update: { status: 'PAID', paidAt: now, periodStart, periodEnd },
        select: { id: true },
      });
      chargeId = charge.id;
    }

    // Ledger: expira o não-usado (planos sem rollover) e concede os créditos do ciclo. O cache
    // Membership.creditBalance = newBalance fecha com a soma do ledger (ver computeGrant).
    if (grant.expiredDelta !== 0) {
      await tx.membershipCreditLedger.create({
        data: { membershipId: membership.id, delta: grant.expiredDelta, reason: 'EXPIRE' },
      });
    }
    if (grant.grantDelta !== 0) {
      await tx.membershipCreditLedger.create({
        data: {
          membershipId: membership.id,
          delta: grant.grantDelta,
          reason: 'CYCLE_GRANT',
          chargeId,
          expiresAt: creditsExpireAt,
        },
      });
    }

    await tx.membership.update({
      where: { id: membership.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        creditBalance: grant.newBalance,
        creditsExpireAt,
        lowCreditsNotifiedAt: null, // novo ciclo: pode avisar "acabando" de novo
        canceledAt: null,
        ...(parsed.cardLast4 ? { cardLast4: parsed.cardLast4 } : {}),
        ...(parsed.cardBrand ? { cardBrand: parsed.cardBrand } : {}),
      },
    });
    return true;
  });

  if (!granted) return; // entrega duplicada: não re-notifica

  // Notificações (fire-and-forget). 1ª ativação = boas-vindas + avisa o dono (novo assinante);
  // renovação/recuperação = créditos renovados.
  if (wasPending) {
    notifySubscriptionActivated(membership.id).catch((err) =>
      console.error('[membership-webhook] notify activated failed', err),
    );
    notifyOwnerNewMember(membership.id).catch((err) =>
      console.error('[membership-webhook] notify owner new member failed', err),
    );
  } else if (wasActive || wasPastDue) {
    notifySubscriptionRenewed(membership.id, amountCents).catch((err) =>
      console.error('[membership-webhook] notify renewed failed', err),
    );
  }
}

async function applyPastDue(membership: Membership, parsed: ParsedWebhook): Promise<void> {
  // Sem carência: pagamento falhou corta o consumo de crédito na hora (o consume exclui
  // PAST_DUE). Só marca/notifica na TRANSIÇÃO (não ressuscita um cancelamento).
  if (membership.status === 'ACTIVE' || membership.status === 'PENDING') {
    await prisma.membership.update({
      where: { id: membership.id },
      data: { status: 'PAST_DUE' },
    });
    notifySubscriptionPaymentFailed(membership.id).catch((err) =>
      console.error('[membership-webhook] notify payment failed', err),
    );
    notifyOwnerMemberPaymentFailed(membership.id).catch((err) =>
      console.error('[membership-webhook] notify owner payment failed', err),
    );
  }
  if (parsed.externalId) {
    await recordChargeStatus(membership, parsed, parsed.status === 'FAILED' ? 'FAILED' : 'EXPIRED');
  }
}

async function applyCanceledByGateway(membership: Membership, parsed: ParsedWebhook): Promise<void> {
  // Estorno/chargeback/exclusão da cobrança pelo lado do gateway: encerra a assinatura.
  if (membership.status !== 'CANCELED') {
    await prisma.membership.update({
      where: { id: membership.id },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });
    notifySubscriptionCanceled(membership.id).catch((err) =>
      console.error('[membership-webhook] notify canceled failed', err),
    );
    notifyOwnerMemberCanceled(membership.id).catch((err) =>
      console.error('[membership-webhook] notify owner canceled failed', err),
    );
  }
  if (parsed.externalId) {
    await recordChargeStatus(membership, parsed, parsed.status === 'REFUNDED' ? 'REFUNDED' : 'CANCELED');
  }
}

/** Registra/atualiza o recibo da cobrança com o status dado (idempotente por provider+externalId). */
async function recordChargeStatus(
  membership: Membership,
  parsed: ParsedWebhook,
  status: 'EXPIRED' | 'FAILED' | 'REFUNDED' | 'CANCELED',
): Promise<void> {
  const externalId = parsed.externalId;
  await prisma.membershipCharge.upsert({
    where: { provider_externalId: { provider: membership.provider, externalId } },
    create: {
      tenantId: membership.tenantId,
      membershipId: membership.id,
      provider: membership.provider,
      method: 'CREDIT_CARD',
      status,
      amountCents: parsed.amountCents ?? membership.priceCents,
      externalId,
    },
    update: { status },
  });
}
