import 'server-only';

import { prisma } from '@haru/database';
import type { CustomerAccount } from '@haru/database';

// Avaliações do cliente ao estabelecimento. Gate: só quem teve um agendamento COMPLETED
// no tenant pode avaliar. A média/contagem ficam denormalizadas em Tenant.ratingAvg/
// ratingCount, recomputadas na MESMA transação da escrita (cards do diretório baratos).

export interface CustomerReview {
  rating: number;
  comment: string | null;
}

/** O cliente pode avaliar este tenant? Só depois de um atendimento concluído nele. */
export async function canReview(account: CustomerAccount, tenantId: string): Promise<boolean> {
  const appt = await prisma.appointment.findFirst({
    where: { tenantId, status: 'COMPLETED', contact: { customerAccountId: account.id } },
    select: { id: true },
  });
  return appt != null;
}

/** Avaliação atual do cliente pra este tenant (pré-preenche o form de edição); null se ainda não avaliou. */
export async function getCustomerReview(
  account: CustomerAccount,
  tenantId: string,
): Promise<CustomerReview | null> {
  return prisma.review.findUnique({
    where: { customerAccountId_tenantId: { customerAccountId: account.id, tenantId } },
    select: { rating: true, comment: true },
  });
}

/**
 * Cria/edita a avaliação (gate COMPLETED) e recomputa ratingAvg/ratingCount do tenant na
 * MESMA transação. `rating` fora de 1..5 é rejeitado; comentário é opcional (máx 500).
 */
export async function upsertReview(
  account: CustomerAccount,
  tenantId: string,
  rating: number,
  commentRaw: string | null,
): Promise<{ ok: true } | { error: string }> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return { error: 'Escolha de 1 a 5 estrelas.' };
  const comment = (commentRaw ?? '').trim().slice(0, 500) || null;

  if (!(await canReview(account, tenantId))) {
    return { error: 'Você só pode avaliar depois de um atendimento concluído.' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.upsert({
      where: { customerAccountId_tenantId: { customerAccountId: account.id, tenantId } },
      create: { customerAccountId: account.id, tenantId, rating, comment },
      update: { rating, comment },
    });
    const agg = await tx.review.aggregate({
      where: { tenantId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await tx.tenant.update({
      where: { id: tenantId },
      data: { ratingAvg: agg._avg.rating ?? null, ratingCount: agg._count._all },
    });
  });
  return { ok: true };
}
