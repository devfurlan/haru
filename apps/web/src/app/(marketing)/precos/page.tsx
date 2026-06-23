import { Pricing } from '@/components/marketing/pricing';

export const metadata = {
  title: 'Preços · Demandaê',
  description: 'Planos do Demandaê — agendamento e atendimento por IA no WhatsApp.',
};

// Sempre fresco do BD (catálogo dinâmico, editável no admin) - sem cache de rota.
export const dynamic = 'force-dynamic';

export default function PrecosPage() {
  return <Pricing />;
}
