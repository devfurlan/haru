import { notFound, redirect } from 'next/navigation';

import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerAppointments } from '@/lib/customer';
import { isReviewable } from '@/lib/appointment-status';
import { getCustomerReview } from '@/lib/reviews';

export const dynamic = 'force-dynamic';

import { AvaliarClient } from './avaliar-client';

// Só atendimento já realizado pode ser avaliado (ver isReviewable). O gate de ownership é o
// próprio customerAccountId (o id vem da URL, mas o atendimento tem que estar na lista do
// cliente); o gate real da escrita continua no server (upsertReview -> canReview).
export default async function AvaliarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await requireCustomerAccount();
  const { upcoming, past } = await getCustomerAppointments(account);
  const item = [...upcoming, ...past].find((a) => a.id === id);
  if (!item) notFound();
  if (!isReviewable(item)) redirect(`/conta/agendamentos/${id}`);

  const review = await getCustomerReview(account, item.tenant.id);

  return (
    <AvaliarClient
      item={item}
      initialRating={review?.rating ?? 0}
      initialComment={review?.comment ?? ''}
    />
  );
}
