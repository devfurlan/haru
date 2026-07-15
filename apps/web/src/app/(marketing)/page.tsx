import { AiAddon } from '@/components/marketing/home/ai-addon';
import { Differentiators } from '@/components/marketing/home/differentiators';
import { Faq } from '@/components/marketing/home/faq';
import { FinalCta } from '@/components/marketing/home/final-cta';
import { ForClient } from '@/components/marketing/home/for-client';
import { ForOwner } from '@/components/marketing/home/for-owner';
import { Hero } from '@/components/marketing/home/hero';
import { HowItWorks } from '@/components/marketing/home/how-it-works';
import { Niches } from '@/components/marketing/home/niches';
import { PricingPreview } from '@/components/marketing/home/pricing-preview';
import { WhatsInside } from '@/components/marketing/home/whats-inside';

// Home pública redesenhada a partir do protótipo Claude Design ("Melhoria do layout de
// preços"). A vitrine de preços (PricingPreview) lê o catálogo dinâmico (tabela Plan),
// mesma fonte da /precos - por isso a rota é force-dynamic: repreçar/renomear no admin
// reflete aqui na hora, sem rebuild.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Niches />
      <HowItWorks />
      <ForClient />
      <ForOwner />
      <WhatsInside />
      <Differentiators />
      <PricingPreview />
      <AiAddon />
      <Faq />
      <FinalCta />
    </>
  );
}
