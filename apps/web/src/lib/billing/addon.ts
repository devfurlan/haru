import 'server-only';

import { prisma } from '@haru/database';
import type { BillingCycle, Subscription } from '@haru/database';
import { TIER_LABEL, getPublicPlan, prorataCents, snapshotPlan } from '@haru/billing';

import {
  createOneTimeCharge,
  findPendingChargeByReference,
  updateAsaasSubscription,
} from './asaas';

/**
 * Lógica de ativação do addon "Atendente IA" compartilhada entre a variante "número
 * Demandaê" (ativa na hora, na server action do painel) e a "número próprio" (o operador
 * conclui a WABA e ativa pelo app admin, via endpoint interno). Vive no web porque só ele
 * tem a chave Asaas da plataforma; o admin dispara por HTTP (ver /api/internal/addon/activate).
 */

/**
 * Link wa.me do número COMPARTILHADO do Demandaê, já com o texto que o bot usa pra
 * rotear a conversa pro tenant certo (vários tenants dividem 1 número, então o slug no
 * texto é a chave). Requer DEMANDAE_WA_NUMBER (E.164 sem +). null = número não configurado.
 */
export function demandaeWaLink(slug: string): string | null {
  const number = process.env.DEMANDAE_WA_NUMBER?.replace(/\D/g, '');
  if (!number) return null;
  const text = encodeURIComponent(`agendar na ${slug}`);
  return `https://wa.me/${number}?text=${text}`;
}

/**
 * Valor do PLANO BASE (centavos) + ciclo que a PRÓXIMA cobrança recorrente deve carregar.
 * Considera um downgrade agendado (`pendingPlanTier`): como o addon reescreve a recorrência
 * com updatePendingPayments=false (só vale do próximo ciclo em diante), a base tem que ser a
 * do plano pendente - senão ativar/desativar o addon apagaria o downgrade já agendado no
 * Asaas e a próxima cobrança viria com o plano antigo (mais caro). Sem downgrade, é o snapshot.
 */
export async function nextCycleBase(
  sub: Subscription,
): Promise<{ cents: number; cycle: BillingCycle }> {
  if (sub.pendingPlanTier) {
    // Downgrade agendado é sempre p/ plano público (só o self-serve agenda troca).
    const pending = await getPublicPlan(sub.pendingPlanTier);
    if (pending) {
      const cycle = sub.pendingBillingCycle ?? sub.billingCycle;
      return { cents: snapshotPlan(pending, cycle).priceCents, cycle };
    }
  }
  return { cents: sub.priceCents, cycle: sub.billingCycle };
}

/**
 * Efetiva a ativação: soma o addon à recorrência Asaas base (a partir do PRÓXIMO ciclo -
 * updatePendingPayments=false, o ciclo atual já foi cobrado só com o plano), cobra o
 * proporcional do 1º período como cobrança avulsa, e SÓ ENTÃO marca `addonActivatedAt`.
 * A ordem importa: o Asaas vem ANTES do flag, então se qualquer chamada de cobrança falhar o
 * addon NÃO fica marcado como ativo (bot liberado) sem a cobrança correspondente - a
 * re-execução (idempotente: value é setado, proporcional reusa a cobrança pendente) repara.
 * A ativação NÃO espera o pagamento do proporcional (é uma cobrança à parte). Pré-condição: o
 * snapshot do addon (addonTier/addonPriceCents/...) já está gravado na Subscription. Retorna o
 * invoiceUrl do proporcional (null se não houver o que cobrar).
 */
export async function effectuateAddonActivation(
  sub: Subscription,
  now = new Date(),
): Promise<{ invoiceUrl: string | null }> {
  const activatedAt = sub.addonActivatedAt ?? now;
  const base = await nextCycleBase(sub);

  if (sub.asaasSubscriptionId) {
    await updateAsaasSubscription(sub.asaasSubscriptionId, {
      amountCents: base.cents + (sub.addonPriceCents ?? 0),
      cycle: base.cycle,
      description: `Demandaê ${TIER_LABEL[sub.planTier]} + Atendente IA`,
      updatePendingPayments: false,
    });
  }

  let invoiceUrl: string | null = null;
  const prorata = prorataCents(sub, sub.addonPriceCents ?? 0, activatedAt);
  if (prorata > 0 && sub.asaasCustomerId) {
    // ponytail: dedup por referência reduz cobrança dupla, mas dois POSTs concorrentes
    // (duplo-clique do operador) ainda podem correr entre o findPending e o create. Aceito
    // (LOW): exige clique duplo exato; virar lock/escrita condicional se acontecer de fato.
    const ref = `addon-prorata:${sub.id}`;
    const existing = await findPendingChargeByReference(ref).catch(() => null);
    const charge =
      existing ??
      (await createOneTimeCharge({
        customerId: sub.asaasCustomerId,
        amountCents: prorata,
        description: 'Demandaê - Atendente IA (proporcional do 1º ciclo)',
        externalReference: ref,
      }));
    invoiceUrl = charge.invoiceUrl;
  }

  // Marca ativo só DEPOIS que o Asaas foi atualizado com sucesso (ver docstring).
  if (sub.addonActivatedAt == null) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { addonActivatedAt: activatedAt, addonCanceledAt: null },
    });
  }

  return { invoiceUrl };
}
