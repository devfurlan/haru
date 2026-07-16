import 'server-only';

import { prisma } from '@haru/database';
import type { CustomerAccount } from '@haru/database';

import { createNotification } from '@/lib/comms/notifications';

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
  ownerReply: string | null;
  ownerRepliedAt: Date | null;
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
      ownerReply: true,
      ownerRepliedAt: true,
      customerAccount: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    name: r.customerAccount.name,
    rating: r.rating,
    comment: r.comment as string,
    createdAt: r.createdAt,
    ownerReply: r.ownerReply,
    ownerRepliedAt: r.ownerRepliedAt,
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

// --- Painel do dono -----------------------------------------------------------

export interface TenantReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string | null;
  createdAt: Date;
  ownerReply: string | null;
  ownerRepliedAt: Date | null;
  /** Cliente (nota baixa) pediu que o dono entre em contato pra resolver. */
  contactRequested: boolean;
}

export interface TenantReviewsSummary {
  avg: number | null;
  count: number;
  /** Contagem por nota: distribution[0] = 1★ ... distribution[4] = 5★. */
  distribution: [number, number, number, number, number];
  /** Quantas já têm resposta do dono. */
  replied: number;
  /** Quantas têm pedido de contato aberto (nota baixa). */
  contactRequests: number;
  reviews: TenantReviewRow[];
}

/**
 * Todas as avaliações do tenant pro painel do dono (mais recentes primeiro), com o agregado
 * pronto (média, total, distribuição, respondidas, pedidos de contato). Ao contrário do
 * getPublicReviews, inclui as SEM comentário (o dono vê a nota mesmo sem texto).
 */
export async function getTenantReviews(tenantId: string): Promise<TenantReviewsSummary> {
  const rows = await prisma.review.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      ownerReply: true,
      ownerRepliedAt: true,
      contactRequestedAt: true,
      customerAccount: { select: { name: true } },
    },
  });

  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;
  let replied = 0;
  let contactRequests = 0;
  for (const r of rows) {
    distribution[r.rating - 1] += 1;
    sum += r.rating;
    if (r.ownerReply) replied += 1;
    if (r.contactRequestedAt) contactRequests += 1;
  }

  return {
    avg: rows.length ? sum / rows.length : null,
    count: rows.length,
    distribution,
    replied,
    contactRequests,
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      customerName: r.customerAccount.name,
      createdAt: r.createdAt,
      ownerReply: r.ownerReply,
      ownerRepliedAt: r.ownerRepliedAt,
      contactRequested: r.contactRequestedAt != null,
    })),
  };
}

/**
 * Resposta pública do dono a uma avaliação. Ownership por (id, tenantId) - nunca findUnique
 * só por id (IDOR entre tenants). Editável: texto vazio/null limpa a resposta. NÃO recomputa
 * ratingAvg/ratingCount (a média depende só da nota, não da resposta).
 */
export async function replyToReview(
  tenantId: string,
  reviewId: string,
  textRaw: string | null,
): Promise<{ ok: true } | { error: string }> {
  const review = await prisma.review.findFirst({
    where: { id: reviewId, tenantId },
    select: { id: true },
  });
  if (!review) return { error: 'Avaliação não encontrada.' };

  const text = (textRaw ?? '').trim().slice(0, 1000) || null;
  await prisma.review.update({
    where: { id: reviewId },
    data: { ownerReply: text, ownerRepliedAt: text ? new Date() : null },
  });
  return { ok: true };
}

/**
 * Cliente com nota baixa (1-2) pede que o dono entre em contato pra resolver. Marca a review
 * (contactRequestedAt) e acende o sino in-app do dono. A review segue pública. Precisa já ter
 * avaliado (a UI só oferece isto depois de salvar).
 */
export async function requestOwnerContact(
  account: CustomerAccount,
  tenantId: string,
): Promise<{ ok: true } | { error: string }> {
  const review = await prisma.review.findUnique({
    where: { customerAccountId_tenantId: { customerAccountId: account.id, tenantId } },
    select: { id: true, rating: true },
  });
  if (!review) return { error: 'Avalie primeiro.' };

  await prisma.review.update({
    where: { id: review.id },
    data: { contactRequestedAt: new Date() },
  });

  const nome = account.name ?? 'Um cliente';
  await createNotification(tenantId, 'ACCOUNT', 'review.contact_requested', {
    title: 'Cliente pediu contato',
    body: `${nome} deu nota ${review.rating} e quer que você resolva.`,
    ctaLabel: 'Ver avaliação',
    ctaHref: '/reviews',
  });
  return { ok: true };
}
