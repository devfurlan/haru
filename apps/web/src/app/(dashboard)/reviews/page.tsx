import { requireUserAndTenant } from '@/lib/auth';
import { getTenantReviews } from '@/lib/reviews';

import { ReviewsList, type ReviewRow } from './reviews-list';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const { tenant } = await requireUserAndTenant();
  const summary = await getTenantReviews(tenant.id);

  const dateFmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tenant.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const reviews: ReviewRow[] = summary.reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    customerName: r.customerName,
    whenLabel: dateFmt.format(r.createdAt),
    ownerReply: r.ownerReply,
    contactRequested: r.contactRequested,
  }));

  return (
    <ReviewsList
      tenantName={tenant.name}
      avg={summary.avg}
      count={summary.count}
      distribution={summary.distribution}
      replied={summary.replied}
      contactRequests={summary.contactRequests}
      reviews={reviews}
    />
  );
}
