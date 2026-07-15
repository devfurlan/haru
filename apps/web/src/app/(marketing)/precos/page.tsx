import { CompareTable } from '@/components/marketing/precos/compare-table';
import { Faq } from '@/components/marketing/precos/faq';
import { FinalCta } from '@/components/marketing/precos/final-cta';
import { Hero } from '@/components/marketing/precos/hero';
import { getPrecosData } from '@/components/marketing/precos/plans-data';
import { PrecosPlans } from '@/components/marketing/precos/plans-client';
import { Reminders } from '@/components/marketing/precos/reminders';
import { TrustSeals } from '@/components/marketing/precos/trust-seals';
import { WhatsIncluded } from '@/components/marketing/precos/whats-included';

export const metadata = {
  title: 'Preços · Demandaê',
  description:
    'Planos do Demandaê - app do cliente, agenda pública e painel completo em todos os planos. Sem taxa de setup, sem cobrança por uso, garantia de 30 dias.',
};

// Preços lidos do catálogo dinâmico (tabela Plan) - repreçar/renomear no admin reflete
// aqui na hora, por isso force-dynamic.
export const dynamic = 'force-dynamic';

export default async function PrecosPage() {
  const { cards, profCells, reminderCells } = await getPrecosData();
  return (
    <>
      <Hero />
      <PrecosPlans cards={cards} />
      <TrustSeals />
      <WhatsIncluded />
      <Reminders />
      <CompareTable profCells={profCells} reminderCells={reminderCells} />
      <Faq />
      <FinalCta />
    </>
  );
}
