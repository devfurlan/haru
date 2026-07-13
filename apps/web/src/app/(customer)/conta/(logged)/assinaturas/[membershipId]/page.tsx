import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerMembershipDetail } from '@/lib/memberships/customer';

import { SubscriptionManage } from './subscription-manage';

export const dynamic = 'force-dynamic';

export default async function ManageSubscriptionPage({
  params,
}: {
  params: Promise<{ membershipId: string }>;
}) {
  const { membershipId } = await params;
  const account = await requireCustomerAccount();
  const detail = await getCustomerMembershipDetail(account.id, membershipId);

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-6 md:px-8 md:py-9">
      <Link
        href="/conta/assinaturas"
        className="border-line bg-paper hover:bg-cream-2 text-ink inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-bold transition-colors"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Suas assinaturas
      </Link>

      {detail ? (
        <SubscriptionManage detail={detail} />
      ) : (
        <div className="border-edge bg-paper mt-6 rounded-[22px] border border-dashed p-12 text-center">
          <div className="text-ink font-serif text-[22px]">
            Não encontramos essa <span className="text-green-deep italic">assinatura</span>
          </div>
          <p className="text-ink-50 mt-1.5 text-sm">
            Ela pode ter sido encerrada. Veja as suas assinaturas ativas.
          </p>
          <Link
            href="/conta/assinaturas"
            className="bg-coral mt-4 inline-block rounded-[14px] px-6 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            Ver minhas assinaturas
          </Link>
        </div>
      )}
    </div>
  );
}
