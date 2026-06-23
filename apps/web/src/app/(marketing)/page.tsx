import { Differentiators } from '@/components/marketing/differentiators';
import { Features } from '@/components/marketing/features';
import { FinalCta } from '@/components/marketing/final-cta';
import { ForWho } from '@/components/marketing/for-who';
import { Hero } from '@/components/marketing/hero';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { Pricing } from '@/components/marketing/pricing';
import { Roadmap } from '@/components/marketing/roadmap';

// Sempre fresco do BD: a seção de planos lê a tabela Plan (catálogo dinâmico, editável
// no admin). Sem cache de rota pra renomear/repreçar refletir na hora.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ForWho />
      <Differentiators />
      <Features />
      <HowItWorks />
      <Pricing />
      <Roadmap />
      <FinalCta />
    </>
  );
}
