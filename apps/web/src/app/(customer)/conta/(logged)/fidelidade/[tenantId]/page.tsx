import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerLoyaltyCard } from '@/lib/loyalty-customer';

import { CardDetailView } from '../card-detail-view';

export const dynamic = 'force-dynamic';

export default async function CustomerLoyaltyCardPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const account = await requireCustomerAccount();
  const card = await getCustomerLoyaltyCard(account, tenantId);
  if (!card) notFound();

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-6 md:px-8 md:py-8">
      <Link
        href="/conta/fidelidade"
        className="border-edge bg-paper text-green-deep hover:bg-cream-2 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-bold transition-colors"
      >
        <ChevronLeft className="size-4" />
        Seus cartões
      </Link>

      <CardDetailView card={card} />
    </div>
  );
}
