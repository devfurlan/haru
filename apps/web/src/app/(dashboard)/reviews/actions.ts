'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/auth';
import { replyToReview } from '@/lib/reviews';

/**
 * Resposta pública do dono a uma avaliação (cria, edita ou remove passando texto vazio).
 * Ownership é validado no replyToReview (findFirst por id+tenantId, anti-IDOR).
 */
export async function replyToReviewAction(input: {
  reviewId: string;
  text: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const { tenant } = await requireAdmin();
  const res = await replyToReview(tenant.id, input.reviewId, input.text);
  if ('error' in res) return res;

  revalidatePath('/reviews');
  revalidatePath(`/${tenant.slug}`); // vitrine pública mostra a resposta
  return res;
}
