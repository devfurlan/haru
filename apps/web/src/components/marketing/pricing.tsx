import { prisma } from '@haru/database';

import { Eyebrow } from './eyebrow';
import { Container } from './container';
import { PricingTiers, type PricingTier } from './pricing-tiers';

/** Seção de planos da landing - lê o catálogo dinâmico (tabela Plan). */
export async function Pricing() {
  // Resiliente: se o catálogo não puder ser lido (ex.: DB fora no build), a seção
  // simplesmente não renderiza - não derruba o build/landing inteiro.
  let plans;
  try {
    // Essencial fica fora da vitrine (mas segue no BD); mostramos Profissional+.
    plans = await prisma.plan.findMany({
      where: { active: true, tier: { not: 'ESSENCIAL' } },
      orderBy: { displayOrder: 'asc' },
    });
  } catch (err) {
    console.error('[pricing] catálogo indisponível', err);
    return null;
  }

  if (plans.length === 0) return null;

  const tiers: PricingTier[] = plans.map((p) => ({
    tier: p.tier,
    name: p.name,
    custom: p.priceMonthlyCents <= 0,
    priceMonthlyCents: p.priceMonthlyCents,
    priceAnnualCents: p.priceAnnualCents,
    appointmentsPerMonth: p.appointmentsPerMonth,
    aiMessagesPerMonth: p.aiMessagesPerMonth,
    maxStaff: p.maxStaff,
    onlinePayments: p.onlinePayments,
    webhooks: p.webhooks,
    team: p.team,
    featured: p.tier === 'PROFISSIONAL',
  }));

  return (
    <section id="precos" className="bg-cream-2 py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Planos</Eyebrow>
          <h2 className="mt-4 font-serif text-[clamp(2rem,4vw,3.05rem)] font-semibold leading-[1.05] tracking-[-0.01em]">
            Planos simples, sem pegadinha.
          </h2>
          <p className="mt-4 text-[1.1rem] leading-relaxed text-ink-soft">
            Atendimento e agendamento por IA no WhatsApp em todos os planos. Garantia de 30 dias - se
            não curtir, devolvemos o valor.
          </p>
        </div>

        <PricingTiers tiers={tiers} />
      </Container>
    </section>
  );
}
