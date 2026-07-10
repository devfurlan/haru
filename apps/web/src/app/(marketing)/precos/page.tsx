import { PrecosAddon } from '@/components/marketing/precos-addon';
import { PrecosComparison } from '@/components/marketing/precos-comparison';
import { PrecosFaq } from '@/components/marketing/precos-faq';
import { PrecosFounder } from '@/components/marketing/precos-founder';
import { Pricing } from '@/components/marketing/pricing';

export const metadata = {
  title: 'Preços · Demandaê',
  description:
    'Planos do Demandaê - app do cliente, agenda pública e painel completo em todos os planos. Confirmações e lembretes no WhatsApp, sem taxa de instalação.',
};

// Sempre fresco do BD (catálogo dinâmico, editável no admin) - sem cache de rota.
export const dynamic = 'force-dynamic';

export default function PrecosPage() {
  return (
    <>
      <Pricing />
      <PrecosAddon />
      {/* Prova social real (depoimentos dos primeiros clientes) entra aqui quando existir. */}
      <PrecosFounder />
      <PrecosFaq />
      <PrecosComparison />
    </>
  );
}
