import { Repeat } from 'lucide-react';
import Link from 'next/link';

import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerMemberships } from '@/lib/memberships/customer';

import { MembershipsList } from './memberships-list';

export const dynamic = 'force-dynamic';

export default async function CustomerSubscriptionsPage() {
  const account = await requireCustomerAccount();
  const memberships = await getCustomerMemberships(account.id);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-9">
      <h1 className="text-ink font-serif text-[28px] tracking-tight md:text-[34px]">
        Suas assinaturas
      </h1>
      <p className="text-ink-50 mt-2 max-w-[560px] text-sm">
        Créditos, renovação e cobrança de cada plano que você assina - cancele quando quiser.
      </p>

      {memberships.length > 0 ? (
        <MembershipsList items={memberships} />
      ) : (
        <div className="border-edge bg-paper mt-6 rounded-[22px] border border-dashed p-12 text-center">
          <div className="bg-chip mx-auto grid size-14 place-items-center rounded-full">
            <Repeat className="text-green-deep size-[26px]" />
          </div>
          <div className="text-ink mt-4 font-serif text-[24px]">
            Nenhuma assinatura <span className="text-green-deep italic">ainda</span>
          </div>
          <p className="text-ink-50 mt-1.5 text-sm">
            Alguns lugares têm planos de assinatura - assine e agende usando créditos, sem pagar a
            cada visita.
          </p>
          <Link
            href="/conta/buscar"
            className="bg-coral mt-4 inline-block rounded-[14px] px-6 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            Buscar estabelecimento
          </Link>
        </div>
      )}
    </div>
  );
}
