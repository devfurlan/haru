'use server';

import { prisma } from '@haru/database';
import type { SubscriptionStatus } from '@haru/database';
import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/admin-auth';

const VALID_STATUS: SubscriptionStatus[] = [
  'PENDING',
  'ACTIVE',
  'PAST_DUE',
  'SUSPENDED',
  'CANCELED',
];

export type StatusActionResult = { error: string } | { ok: true };

/** Muda o status da assinatura de um tenant (ex.: ACTIVE ⇄ SUSPENDED). */
export async function setSubscriptionStatus(
  tenantId: string,
  status: SubscriptionStatus,
): Promise<StatusActionResult> {
  await requireAdmin();

  if (!VALID_STATUS.includes(status)) return { error: 'Status inválido' };

  const sub = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!sub) return { error: 'Este cliente não tem assinatura' };

  await prisma.subscription.update({
    where: { tenantId },
    data: {
      status,
      canceledAt: status === 'CANCELED' ? new Date() : null,
    },
  });

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${tenantId}`);
  return { ok: true };
}
