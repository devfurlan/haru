'use server';

import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';
import { reconcilePendingSubscription } from '@/lib/billing/reconcile';

/**
 * Polling da tela do Pix ("já ativou?"). Barato por padrão: só lê o status (o webhook costuma
 * virar pra ACTIVE em segundos). Com `deep`, força a reconciliação contra o Asaas - fallback
 * pra quando o webhook demora. Escopo: SEMPRE a assinatura do próprio tenant logado.
 */
export async function checkSubscriptionActivation(deep = false): Promise<{ status: string }> {
  const { tenant } = await requireUserAndTenant();
  const sub = await prisma.subscription.findUnique({ where: { tenantId: tenant.id } });
  if (!sub) return { status: 'NONE' };
  if (sub.status !== 'PENDING' || !deep) return { status: sub.status };
  return { status: await reconcilePendingSubscription(sub) };
}
