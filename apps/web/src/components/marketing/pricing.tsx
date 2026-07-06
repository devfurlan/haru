import {
  ArrowRight,
  Ban,
  Lock,
  MessageCircle,
  MessagesSquare,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { prisma } from '@haru/database';

import { Button } from '@/components/ui/button';

import { Eyebrow } from './eyebrow';
import { Container } from './container';
import { InterestDialog } from './interest-dialog';
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
    <section id="precos" className="bg-cream-2 py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Planos</Eyebrow>
          <h2 className="mt-4 font-serif text-[clamp(2rem,4vw,3.05rem)] font-semibold leading-[1.05] tracking-[-0.01em]">
            Planos simples, sem pegadinha.
          </h2>
          <p className="text-ink-soft mt-4 text-[1.1rem] leading-relaxed">
            App do cliente, agenda pública e painel completo em todos os planos - sem taxa de
            instalação. Garantia de 30 dias: se não curtir, devolvemos o valor.
          </p>
        </div>

        <PricingTiers tiers={tiers} />

        {/* Plano base entra sem taxa de entrada; o bot conversacional é o addon abaixo. */}
        <p className="text-ink-soft mx-auto mt-8 max-w-2xl text-center text-sm">
          Todos os planos incluem confirmações e lembretes automáticos no WhatsApp, sem taxa de
          instalação. Quer um atendente de IA que conversa e agenda pelo WhatsApp?{' '}
          <a href="#addon" className="text-foreground font-semibold underline underline-offset-2">
            Veja o addon Atendente IA
          </a>
          .
        </p>

        {detailsHref && (
          <div className="mt-6 flex justify-center">
            <Link
              href={detailsHref}
              className="text-foreground inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
            >
              Ver comparativo completo, o addon e as dúvidas frequentes
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        )}

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
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              Icon: ShieldCheck,
              title: 'Garantia de 30 dias',
              text: 'Teste sem risco - devolvemos 100% do valor.',
            },
            {
              Icon: Zap,
              title: 'Sem taxa de instalação',
              text: 'No plano base, você entra direto.',
            },
            {
              Icon: Ban,
              title: 'Cancele quando quiser',
              text: 'Sem multa, sem fidelidade.',
            },
            {
              Icon: MessageCircle,
              title: 'Suporte em português',
              text: 'Empresa brasileira, atende por WhatsApp.',
            },
            {
              Icon: Lock,
              title: 'Dados protegidos',
              text: 'LGPD e infraestrutura em nuvem.',
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
