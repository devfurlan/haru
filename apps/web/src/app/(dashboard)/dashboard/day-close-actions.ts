'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';
import { panelRole } from '@/lib/permissions';

/**
 * Fecha o dia: confirma presença em lote pelo card do cockpit. `attendedIds` viram COMPLETED,
 * `noShowIds` viram NO_SHOW, ambos com attendanceConfirmed=true. O where filtra por tenant +
 * endsAt<now + não-cancelado: defesa em profundidade contra id de outro tenant, futuro ou
 * cancelado (viram no-op). Profissional só fecha os PRÓPRIOS atendimentos. Idempotente.
 */
export async function closeDay(input: { attendedIds: string[]; noShowIds: string[] }) {
  const user = await requireUserAndTenant();
  const now = new Date();
  const proScope = panelRole(user) === 'PROFESSIONAL' ? { professionalId: user.id } : {};
  const scope = {
    tenantId: user.tenant.id,
    endsAt: { lt: now },
    status: { not: 'CANCELED' as const },
    ...proScope,
  };

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
