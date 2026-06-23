import { MessagesSquare } from 'lucide-react';

import { prisma } from '@haru/database';

import { Button } from '@/components/ui/button';

import { Eyebrow } from './eyebrow';
import { Container } from './container';
import { InterestDialog } from './interest-dialog';
import { PricingTiers, type PricingTier } from './pricing-tiers';

/** Seção de planos da landing - lê o catálogo dinâmico (tabela Plan). */
export async function Pricing() {
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

        {/* Banner Enterprise / plano sob medida */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-paper p-6 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <MessagesSquare className="size-6 shrink-0 text-coral" />
            <div>
              <p className="font-semibold">Precisa de um plano customizado?</p>
              <p className="text-sm text-ink-soft">
                Fale com o time que a gente monta um plano sob medida pra sua
                operação.
              </p>
            </div>
          </div>
          <InterestDialog
            title="Vamos montar seu plano sob medida"
            description="O Custom é pra quem precisa de mais do que o Multi. Deixe seus dados que nosso time monta um plano sob medida pra sua operação."
          >
            <Button variant="ink" className="shrink-0 rounded-full">
              Falar com a gente
            </Button>
          </InterestDialog>
        </div>
      </Container>
    </section>
  );
}
