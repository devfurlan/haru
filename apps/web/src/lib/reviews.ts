import 'server-only';

import { prisma } from '@haru/database';
import type { CustomerAccount } from '@haru/database';

// Avaliações do cliente ao estabelecimento. Gate: só quem já foi atendido no tenant
// (horário passado, sem cancelamento/falta - ver isReviewable) pode avaliar; NÃO depende
// de o dono marcar "Atendido" (COMPLETED). A média/contagem ficam denormalizadas em
// Tenant.ratingAvg/ratingCount, recomputadas na MESMA transação da escrita.

export interface CustomerReview {
  rating: number;
  comment: string | null;
}

export interface PublicReview {
  name: string | null;
  rating: number;
  comment: string;
  createdAt: Date;
}

/**
 * Avaliações com comentário pra vitrine pública (mais recentes primeiro). Só as que têm
 * texto - a média/contagem agregadas já vivem em Tenant.ratingAvg/ratingCount.
 */
export async function getPublicReviews(tenantId: string, limit = 6): Promise<PublicReview[]> {
  const rows = await prisma.review.findMany({
    where: { tenantId, comment: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      rating: true,
      comment: true,
      createdAt: true,
      customerAccount: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    name: r.customerAccount.name,
    rating: r.rating,
    comment: r.comment as string,
    createdAt: r.createdAt,
  }));
}

/** O cliente pode avaliar este tenant? Só depois de já ter sido atendido nele. */
export async function canReview(account: CustomerAccount, tenantId: string): Promise<boolean> {
  // Mesma regra do isReviewable (lib/appointment-status.ts), em SQL: horário passado e
  // não cancelado/falta. Mantê-las em sincronia se a regra mudar.
  const appt = await prisma.appointment.findFirst({
    where: {
      tenantId,
      startsAt: { lt: new Date() },
      status: { notIn: ['CANCELED', 'NO_SHOW'] },
      contact: { customerAccountId: account.id },
    },
    select: { id: true },
  });
  return appt != null;
}

/**
 * Notas do cliente por tenant (tenantId -> rating), numa consulta só. Alimenta o
 * histórico da agenda: cada linha concluída mostra "★ X · sua nota" ou o botão "Avaliar".
 */
export async function getCustomerReviewsMap(
  account: CustomerAccount,
): Promise<Map<string, number>> {
  const rows = await prisma.review.findMany({
    where: { customerAccountId: account.id },
    select: { tenantId: true, rating: true },
  });
  return new Map(rows.map((r) => [r.tenantId, r.rating]));
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
 * Cria/edita a avaliação (gate: já atendido, ver canReview) e recomputa ratingAvg/
 * ratingCount do tenant na MESMA transação. `rating` fora de 1..5 é rejeitado; comentário
 * é opcional (máx 500).
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
    return { error: 'Você só pode avaliar um estabelecimento onde já foi atendido.' };
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
