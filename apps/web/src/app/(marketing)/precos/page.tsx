import { Pricing } from '@/components/marketing/pricing';

export const metadata = {
  title: 'Preços · Demandaê',
  description: 'Planos do Demandaê — agendamento e atendimento por IA no WhatsApp.',
};

// Catálogo dinâmico (tabela Plan): revalida periodicamente em vez de fixar no build.
export const revalidate = 600;

export default function PrecosPage() {
  return <Pricing />;
}
