import { Ban, Lock, MessageCircle, MessagesSquare, ShieldCheck } from 'lucide-react';

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
    maxProfessionals: p.maxProfessionals,
    maxReceptionists: p.maxReceptionists,
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
          <p className="text-ink-soft mt-4 text-[1.1rem] leading-relaxed">
            Atendimento e agendamento por IA no WhatsApp em todos os planos. Garantia de 30 dias -
            se não curtir, devolvemos o valor.
          </p>
        </div>

        <PricingTiers tiers={tiers} />

        {/* Setup é opcional porque o WhatsApp é opcional (dica de conversão #9). */}
        <p className="text-ink-soft mx-auto mt-8 max-w-2xl text-center text-sm">
          O bot no WhatsApp é opcional - dá pra usar só a agenda pública, o painel e o app do
          cliente. Se quiser o bot, a configuração assistida sai por R$ 297{' '}
          <span className="text-foreground font-semibold">(grátis no plano anual)</span>.
        </p>

        {/* Banner Enterprise / plano sob medida */}
        <div className="border-border bg-paper mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border p-6 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <MessagesSquare className="text-coral size-6 shrink-0" />
            <div>
              <p className="font-semibold">Precisa de um plano customizado?</p>
              <p className="text-ink-soft text-sm">
                Fale com o time que a gente monta um plano sob medida pra sua operação.
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

        {/* Bloco de confiança - sempre visível abaixo dos planos. */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              Icon: ShieldCheck,
              title: 'Garantia de 30 dias',
              text: 'Teste sem risco - devolvemos 100% do valor.',
            },
            {
              Icon: Ban,
              title: 'Cancele quando quiser',
              text: 'Sem multa, sem fidelidade.',
            },
            {
              Icon: MessageCircle,
              title: 'Empresa brasileira',
              text: 'Suporte em português, por WhatsApp.',
            },
            {
              Icon: Lock,
              title: 'Dados protegidos',
              text: 'LGPD e WhatsApp oficial da Meta.',
            },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="text-green mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-ink-soft text-sm">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
