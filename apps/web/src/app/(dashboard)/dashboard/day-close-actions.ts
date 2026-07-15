'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';

/**
 * Fecha o dia: confirma presença em lote pelo card do cockpit. `attendedIds` viram COMPLETED,
 * `noShowIds` viram NO_SHOW, ambos com attendanceConfirmed=true (foi o dono). O where filtra
 * por tenant + endsAt<now + não-cancelado: defesa em profundidade contra id de outro tenant,
 * futuro ou cancelado (viram no-op). Idempotente - refechar não muda nada.
 */
export async function closeDay(input: { attendedIds: string[]; noShowIds: string[] }) {
  const { tenant } = await requireUserAndTenant();
  const now = new Date();
  const scope = { tenantId: tenant.id, endsAt: { lt: now }, status: { not: 'CANCELED' as const } };

  if (input.attendedIds.length > 0) {
    await prisma.appointment.updateMany({
      where: { id: { in: input.attendedIds }, ...scope },
      data: { status: 'COMPLETED', attendanceConfirmed: true },
    });
  }
  if (input.noShowIds.length > 0) {
    await prisma.appointment.updateMany({
      where: { id: { in: input.noShowIds }, ...scope },
      data: { status: 'NO_SHOW', attendanceConfirmed: true },
    });
  }

  revalidatePath('/dashboard');
  revalidatePath('/appointments');
  revalidatePath('/clients/[id]', 'page');
}
