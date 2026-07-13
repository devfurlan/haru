import 'server-only';

import { prisma, type Subscription, type SubscriptionStatus } from '@haru/database';

import {
  isPaidChargeStatus,
  listChargesByReference,
  listSubscriptionPayments,
  type BillingCharge,
  type ParsedBillingEvent,
} from '@/lib/billing/asaas';
import { applyBillingEvent } from '@/lib/billing/webhook-apply';

/**
 * Fallback pro webhook do Asaas que não chegou (perdido/atrasado): consulta o Asaas e, se a
 * assinatura ainda está PENDING mas já existe cobrança PAGA, ATIVA localmente pela MESMA via
 * do webhook (applyBillingEvent com um evento sintético) - nada de lógica de ativação
 * duplicada. Idempotente e seguro em corrida com o webhook (recordCharge é upsert; se já
 * virou ACTIVE, applyBillingEvent é no-op). Retorna o status resultante.
 *
 * Só age no caso "primeira ativação presa em PENDING". Renovação/downgrade/suspensão continuam
 * a cargo do webhook real (esses só chegam pra assinatura já ativa).
 */
export async function reconcilePendingSubscription(sub: Subscription): Promise<SubscriptionStatus> {
  if (sub.status !== 'PENDING') return sub.status;

  let charges: BillingCharge[];
  try {
    charges = sub.asaasSubscriptionId
      ? await listSubscriptionPayments(sub.asaasSubscriptionId)
      : await listChargesByReference(sub.id);
  } catch (err) {
    console.error('[billing] reconcile: consulta ao Asaas falhou', sub.id, err);
    return sub.status;
  }

  const paid = charges.find((c) => isPaidChargeStatus(c.status));
  if (!paid) return sub.status;

  // Evento sintético equivalente a um PAYMENT_CONFIRMED - alimenta a via única de ativação.
  const synthetic: ParsedBillingEvent = {
    event: 'PAYMENT_CONFIRMED',
    asaasSubscriptionId: sub.asaasSubscriptionId,
    asaasPaymentId: paid.id,
    externalReference: sub.asaasSubscriptionId ? null : sub.id,
    amountCents: paid.amountCents,
    billingType: paid.billingType,
    cardLast4: null,
    cardBrand: null,
    dueDate: paid.dueDate ? new Date(paid.dueDate) : null,
    effect: 'ACTIVE',
    paidAt: paid.paidAt ? new Date(paid.paidAt) : new Date(),
    invoice: null,
  };
  await applyBillingEvent(synthetic);

  const fresh = await prisma.subscription.findUnique({
    where: { id: sub.id },
    select: { status: true },
  });
  return fresh?.status ?? sub.status;
}
