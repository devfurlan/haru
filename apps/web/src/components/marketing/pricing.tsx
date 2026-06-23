import { Check, Minus } from 'lucide-react';
import Link from 'next/link';

import { prisma } from '@haru/database';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { Container } from './container';
import { SectionHeading } from './section-heading';

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtLimit(n: number | null): string {
  return n === null ? 'ilimitado' : n.toLocaleString('pt-BR');
}

/** Uma linha de recurso do card: incluída (✓ verde) ou ausente (– apagado). */
function FeatureRow({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[0.92rem] leading-snug">
      {on ? (
        <Check className="mt-0.5 size-4 shrink-0 text-green-bright" strokeWidth={3} />
      ) : (
        <Minus className="mt-0.5 size-4 shrink-0 text-ink-soft/35" strokeWidth={3} />
      )}
      <span className={on ? 'text-ink-soft' : 'text-ink-soft/45'}>{children}</span>
    </li>
  );
}

/** Seção de planos da landing - lê o catálogo dinâmico (tabela Plan). */
export async function Pricing() {
  // Resiliente: se o catálogo não puder ser lido (ex.: DB fora no build), a seção
  // simplesmente não renderiza - não derruba o build/landing inteiro.
  let plans;
  try {
    plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });
  } catch (err) {
    console.error('[pricing] catálogo indisponível', err);
    return null;
  }

  if (plans.length === 0) return null;

  return (
    <section id="precos" className="py-24">
      <Container>
        <SectionHeading
          eyebrow="Planos"
          title="Planos simples, sem pegadinha."
        >
          Atendimento e agendamento por IA no WhatsApp em todos os planos. Garantia de 30 dias — se
          não curtir, devolvemos o valor.
        </SectionHeading>

        <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const custom = p.priceMonthlyCents <= 0;
            const popular = p.tier === 'PROFISSIONAL';
            return (
              <div
                key={p.tier}
                className={cn(
                  'relative flex flex-col rounded-[22px] border bg-paper p-7 transition-transform duration-300 hover:-translate-y-1',
                  popular ? 'border-coral shadow-coral' : 'border-border',
                )}
              >
                {popular && (
                  <span className="absolute -top-3 left-7 rounded-full bg-coral px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white shadow-coral">
                    Mais popular
                  </span>
                )}

                <h3 className="font-serif text-xl font-semibold tracking-[-0.01em]">{p.name}</h3>

                <div className="mt-3 min-h-[3.5rem]">
                  {custom ? (
                    <p className="font-serif text-3xl font-black">Sob consulta</p>
                  ) : (
                    <>
                      <p className="font-serif text-[2.4rem] font-black leading-none">
                        {fmtBRL(p.priceMonthlyCents)}
                        <span className="text-base font-semibold text-ink-soft">/mês</span>
                      </p>
                      <p className="mt-1.5 text-xs text-ink-soft/70">
                        ou {fmtBRL(p.priceAnnualCents)}/ano (~20% off)
                      </p>
                    </>
                  )}
                </div>

                <div className="my-6 h-px bg-border" />

                <ul className="flex flex-1 flex-col gap-3">
                  <FeatureRow on>Bot de IA no WhatsApp + lembretes</FeatureRow>
                  <FeatureRow on>{fmtLimit(p.appointmentsPerMonth)} agendamentos/mês</FeatureRow>
                  <FeatureRow on>{fmtLimit(p.aiMessagesPerMonth)} mensagens de IA/mês</FeatureRow>
                  <FeatureRow on={p.onlinePayments}>Pagamentos online (Pix/cartão)</FeatureRow>
                  <FeatureRow on={p.team}>
                    {p.team ? `Equipe (${fmtLimit(p.maxStaff)} usuários)` : '1 profissional'}
                  </FeatureRow>
                  <FeatureRow on={p.webhooks}>Webhooks (Discord/Slack/n8n)</FeatureRow>
                </ul>

                <Button
                  asChild
                  variant={popular ? 'coral' : 'ink'}
                  className="mt-7 w-full rounded-full"
                >
                  <Link href="/signup">{custom ? 'Falar com a gente' : 'Começar'}</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
