import { Differentiators } from '@/components/marketing/differentiators';
import { Features } from '@/components/marketing/features';
import { FinalCta } from '@/components/marketing/final-cta';
import { ForWho } from '@/components/marketing/for-who';
import { Hero } from '@/components/marketing/hero';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { Roadmap } from '@/components/marketing/roadmap';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ForWho />
      <Differentiators />
      <Features />
      <HowItWorks />
      <Roadmap />
      <FinalCta />
    </>
  );
}
