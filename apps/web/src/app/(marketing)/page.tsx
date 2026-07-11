import { AiAddon } from '@/components/marketing/ai-addon';
import { ClientFlow } from '@/components/marketing/client-flow';
import { Differentiators } from '@/components/marketing/differentiators';
import { Faq } from '@/components/marketing/faq';
import { Features } from '@/components/marketing/features';
import { FinalCta } from '@/components/marketing/final-cta';
import { ForWho } from '@/components/marketing/for-who';
import { Hero } from '@/components/marketing/hero';
import { OwnerFlow } from '@/components/marketing/owner-flow';
import { Pricing } from '@/components/marketing/pricing';
import { SocialProof } from '@/components/marketing/social-proof';

// Sempre fresco do BD: a seção de planos lê a tabela Plan (catálogo dinâmico, editável
// no admin). Sem cache de rota pra renomear/repreçar refletir na hora.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ForWho />
      <ClientFlow />
      <OwnerFlow />
      <Features />
      <Differentiators />
      <AiAddon />
      <Pricing detailsHref="/precos" />
      <SocialProof />
      <Faq />
      <FinalCta />
    </>
  );
}
