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
import { getCurrentUserAndTenant } from '@/lib/auth';
import { getCustomerAccount } from '@/lib/customer-auth';
import { redirect } from 'next/navigation';

// Home pública redesenhada a partir do protótipo Claude Design ("Melhoria do layout de
// preços"). A vitrine de preços (PricingPreview) lê o catálogo dinâmico (tabela Plan),
// mesma fonte da /precos - por isso a rota é force-dynamic: repreçar/renomear no admin
// reflete aqui na hora, sem rebuild.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Logado não vê a vitrine: vai direto pra área dele (mesma regra do /login).
  const [owner, customer] = await Promise.all([getCurrentUserAndTenant(), getCustomerAccount()]);
  if (owner) redirect('/dashboard');
  if (customer) redirect('/conta');

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
