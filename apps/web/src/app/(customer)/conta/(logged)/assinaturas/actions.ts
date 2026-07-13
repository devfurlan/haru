'use server';

import { revalidatePath } from 'next/cache';

import { getCustomerAccount } from '@/lib/customer-auth';
import { cancelServiceSubscription } from '@/lib/memberships/subscribe';

/**
 * Cancela a assinatura do Clube pelo próprio cliente (self-service). Para as cobranças
 * futuras, mas os créditos já pagos valem até o fim do ciclo (a engine trava por
 * customerAccountId e é idempotente). "Cancelar fácil de achar" - fica aqui na área do cliente.
 */
export async function cancelMembership(
  membershipId: string,
): Promise<{ ok: true } | { error: string }> {
  const account = await getCustomerAccount();
  if (!account) return { error: 'Sua sessão expirou. Entre de novo pra cancelar.' };

  const result = await cancelServiceSubscription({ membershipId, customerAccountId: account.id });
  if ('error' in result) return result;

  revalidatePath('/conta/assinaturas');
  return { ok: true };
}
