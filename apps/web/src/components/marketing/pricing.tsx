import Link from 'next/link';

import { prisma } from '@haru/database';

import { InterestDialog } from './interest-dialog';
import { Container } from './container';
import { PricingTiers, type PricingTier } from './pricing-tiers';

/**
 * Seção de planos - lê o catálogo dinâmico (tabela Plan). Compartilhada entre a home
 * e /precos. Na home passamos `detailsHref="/precos"` pra oferecer o comparativo completo;
 * em /precos o link não aparece (já estamos na página).
 */
export async function Pricing({ detailsHref }: { detailsHref?: string } = {}) {
  // Resiliente: se o catálogo não puder ser lido (ex.: DB fora no build), a seção
  // simplesmente não renderiza - não derruba o build/landing inteiro.
  let plans;
  try {
    // Enterprise não é card: vira o banner de "plano customizado" abaixo dos planos.
    plans = await prisma.plan.findMany({
      where: { active: true, tier: { not: 'ENTERPRISE' } },
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
    maxProfessionals: p.maxProfessionals,
    maxReceptionists: p.maxReceptionists,
    onlinePayments: p.onlinePayments,
    webhooks: p.webhooks,
    team: p.team,
    featured: p.tier === 'PROFISSIONAL',
  }));

  return (
    <section id="planos" className="bg-cream">
      <Container className="py-24">
        <PricingTiers tiers={tiers} />

        {/* Enterprise / plano sob medida */}
        <div className="bg-paper border-edge mt-7 flex flex-col items-center justify-between gap-4 rounded-[18px] border px-6 py-[18px] sm:flex-row">
          <div className="text-ink-70 text-[0.97rem]">
            <strong className="text-ink">Operação maior?</strong> Rede, franquia ou fluxo próprio -
            a gente monta um Enterprise sob medida.
          </div>
          <InterestDialog
            title="Vamos montar seu plano sob medida"
            description="O Enterprise é pra quem precisa de mais do que o Multi. Deixe seus dados que nosso time monta um plano sob medida pra sua operação."
          >
            <button
              type="button"
              className="bg-green-deep text-cream hover:bg-ink shrink-0 rounded-full px-5 py-3 text-sm font-semibold transition-colors"
            >
              Falar com a gente
            </button>
          </InterestDialog>
        </div>

        {detailsHref && (
          <div className="mt-7 text-center">
            <Link
              href={detailsHref}
              className="text-green-deep text-base font-semibold underline underline-offset-4"
            >
              Ver planos completos e comparativo
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}
