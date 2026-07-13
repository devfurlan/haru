'use server';

import { getCustomerAccount } from '@/lib/customer-auth';
import { createServiceSubscription, type SubscribeResult } from '@/lib/memberships/subscribe';

/**
 * Assina um plano do Clube (assinatura de serviços) a partir da página pública do
 * estabelecimento. Reusa a engine (createServiceSubscription): cria a Membership PENDING +
 * a assinatura recorrente no gateway do PRÓPRIO tenant e devolve o checkout hospedado (o
 * cartão é digitado na fatura do gateway, como no pagamento avulso). A ativação e os
 * créditos são webhook-driven.
 *
 * Cobrança recorrente EXIGE conta (o pagador). O modal já mostra o gate de conta antes de
 * chegar aqui; este `needsAuth` é a rede de segurança server-side.
 */
export type SubscribeActionResult = SubscribeResult | { error: string; needsAuth: true };

export async function subscribeToPlan(
  slug: string,
  planId: string,
  method: 'CREDIT_CARD' | 'PIX',
  /** CPF/CNPJ do pagador quando a conta ainda não tem documento salvo. */
  document?: string,
): Promise<SubscribeActionResult> {
  const account = await getCustomerAccount();
  if (!account) return { error: 'Entre na sua conta pra assinar.', needsAuth: true };

  return createServiceSubscription({
    slug,
    planId,
    customerAccountId: account.id,
    method,
    document,
  });
}
