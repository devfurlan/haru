import { Gift } from 'lucide-react';
import Link from 'next/link';

import { requireCustomerAccount } from '@/lib/customer-auth';
import { getCustomerLoyaltyCards } from '@/lib/loyalty-customer';

import { LoyaltyCards } from './loyalty-cards';

export const dynamic = 'force-dynamic';

export default async function CustomerLoyaltyPage() {
  const account = await requireCustomerAccount();
  const cards = await getCustomerLoyaltyCards(account);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-9">
      <h1 className="text-ink font-serif text-[28px] tracking-tight md:text-[34px]">
        Seus cartões
      </h1>
      <p className="text-ink-50 mt-2 max-w-[560px] text-sm">
        Carimbo automático a cada visita concluída - relaxa que a gente conta.
      </p>

      {cards.length > 0 ? (
        <>
          <LoyaltyCards cards={cards} />
          <p className="text-ink-30 mt-4 text-[12.5px]">
            Só aparecem os lugares com programa de fidelidade no ar.
          </p>
        </>
      ) : (
        <div className="border-edge bg-paper mt-6 rounded-[22px] border border-dashed p-12 text-center">
          <div className="bg-chip mx-auto grid size-14 place-items-center rounded-full">
            <Gift className="text-green-deep size-[26px]" />
          </div>
          <div className="text-ink mt-4 font-serif text-[24px]">
            Nenhum cartão <span className="text-green-deep italic">ainda</span>
          </div>
          <p className="text-ink-50 mt-1.5 text-sm">
            Agenda num lugar com programa de fidelidade que o cartão aparece aqui sozinho.
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
