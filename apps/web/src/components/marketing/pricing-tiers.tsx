'use client';

import { Check, Minus, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { PLAN_INSTALLMENT_CENTS } from '@/lib/billing/pricing';
import { cn } from '@/lib/utils';

export interface PricingTier {
  tier: string;
  name: string;
  custom: boolean;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  appointmentsPerMonth: number | null;
  aiMessagesPerMonth: number | null;
  maxProfessionals: number | null;
  maxReceptionists: number | null;
  onlinePayments: boolean;
  webhooks: boolean;
  team: boolean;
  featured: boolean;
}

type Cycle = 'MONTHLY' | 'ANNUAL';

/** R$ sem centavos (ex.: 8900 -> "R$ 89"). */
function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

/** R$ com centavos (ex.: 7416.67 -> "R$ 74,17"). Usado no parcelamento 12x. */
function brlCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtLimit(n: number | null): string {
  return n === null ? 'ilimitado' : n.toLocaleString('pt-BR');
}

interface Feat {
  on: boolean;
  text: string;
  strong?: boolean;
}

/**
 * Lista incremental por tier ("Tudo do X" + o que o tier adiciona). Os números
 * (agendamentos, IA, profissionais) vêm do catálogo do banco; as bullets de copy
 * são curadas. Tiers fora dos 3 padrão caem no fallback dirigido por flags.
 */
function featuresFor(t: PricingTier, prevName: string | null): Feat[] {
  const appts = `${fmtLimit(t.appointmentsPerMonth)} agendamentos/mês`;

  switch (t.tier) {
    case 'ESSENCIAL':
      return [
        { on: true, text: 'App do cliente + agenda pública na web' },
        { on: true, text: 'Painel completo + histórico' },
        { on: true, text: 'Confirmações e lembretes automáticos no WhatsApp' },
        { on: true, text: appts },
        { on: true, text: '1 profissional' },
        { on: false, text: 'Pagamentos online' },
        { on: false, text: 'Webhooks' },
      ];
    case 'PROFISSIONAL':
      return [
        { on: true, strong: true, text: `Tudo do ${prevName ?? 'Solo'}` },
        { on: true, text: 'Pagamentos online (Pix + cartão no app e na web)' },
        { on: true, text: `Equipe: até ${fmtLimit(t.maxProfessionals)} profissionais` },
        { on: true, text: 'Webhooks (Discord, Slack, Zapier, n8n)' },
        { on: true, text: appts },
      ];
    case 'NEGOCIO':
      return [
        { on: true, strong: true, text: `Tudo do ${prevName ?? 'Time'}` },
        { on: true, text: 'Profissionais ilimitados' },
        { on: true, text: 'Suporte prioritário' },
        { on: true, text: appts },
      ];
    default:
      return [
        { on: true, text: 'App do cliente + agenda pública na web' },
        { on: true, text: 'Confirmações e lembretes no WhatsApp' },
        { on: true, text: appts },
        { on: t.onlinePayments, text: 'Pagamentos online (Pix/cartão)' },
        {
          on: t.team,
          text: t.team
            ? `Equipe: até ${fmtLimit(t.maxProfessionals)} profissionais`
            : '1 profissional',
        },
        { on: t.webhooks, text: 'Webhooks (Discord/Slack/n8n)' },
      ];
  }
}

function FeatureRow({ feat, featured }: { feat: Feat; featured: boolean }) {
  const { on, text, strong } = feat;
  return (
    <li className="flex gap-x-3">
      {on ? (
        <Check
          aria-hidden
          strokeWidth={3}
          className={cn(
            'mt-0.5 size-4 shrink-0',
            featured ? 'text-coral-soft' : 'text-green-bright',
          )}
        />
      ) : (
        <Minus
          aria-hidden
          strokeWidth={3}
          className={cn('mt-0.5 size-4 shrink-0', featured ? 'text-cream/30' : 'text-ink-soft/35')}
        />
      )}
      <span
        className={cn(
          strong && 'font-semibold',
          on
            ? featured
              ? 'text-cream/85'
              : 'text-ink-soft'
            : featured
              ? 'text-cream/40'
              : 'text-ink-soft/45',
        )}
      >
        {text}
      </span>
    </li>
  );
}

export function PricingTiers({ tiers }: { tiers: PricingTier[] }) {
  // Anual é o default: mostra a versão mais barata primeiro e ancora a expectativa pra baixo.
  const [cycle, setCycle] = useState<Cycle>('ANNUAL');
  const isAnnual = cycle === 'ANNUAL';

  return (
    <>
      {/* Toggle de frequência */}
      <div className="mt-12 flex justify-center">
        <div className="border-border bg-paper grid grid-cols-2 gap-1 rounded-full border p-1 text-sm font-semibold">
          {(['MONTHLY', 'ANNUAL'] as Cycle[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={cn(
                'rounded-full px-5 py-1.5 transition-colors',
                cycle === c
                  ? 'bg-foreground text-background'
                  : 'text-ink-soft hover:text-foreground',
              )}
            >
              {c === 'MONTHLY' ? 'Mensal' : 'Anual'}
            </button>
          ))}
        </div>
      </div>

      {/* Selo do anual: 2 meses grátis (à vista = 10× o mensal). */}
      <div className="mt-3 flex min-h-6 justify-center">
        {isAnnual ? (
          <span className="bg-green/10 text-green inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
            <Sparkles aria-hidden className="size-3.5" />2 meses grátis no plano anual
          </span>
        ) : (
          <span className="text-ink-soft/70 text-xs">
            No plano anual você ganha 2 meses grátis.
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="mx-auto mt-12 grid max-w-md grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
        {tiers.map((t, i) => {
          const featured = t.featured;
          const prevName = i > 0 ? tiers[i - 1].name : null;
          // No anual, o destaque é o equivalente por mês (pra comparar com o mensal).
          const headlineCents = isAnnual
            ? Math.round(t.priceAnnualCents / 12)
            : t.priceMonthlyCents;
          // Economia do anual vs mensal = 12 mensalidades - preço anual. (Setup fora: é
          // opcional, então não infla o número - vira uma linha à parte "grátis no anual".)
          const totalSavingsCents = t.priceMonthlyCents * 12 - t.priceAnnualCents;
          // Parcela do anual 12x com taxas (dado do gateway; ver PLAN_INSTALLMENT_CENTS).
          // ponytail: quando a coluna Plan.priceAnnualInstallmentCents estiver migrada,
          // trocar por t.priceAnnualInstallmentCents e aposentar a constante.
          const installmentCents = PLAN_INSTALLMENT_CENTS[t.tier];

          return (
            <div
              key={t.tier}
              className={cn(
                'relative flex flex-col rounded-3xl p-8 ring-1 transition-transform duration-300 hover:-translate-y-1',
                featured ? 'bg-ink text-cream ring-ink shadow-coral' : 'bg-paper ring-border',
              )}
            >
              {featured && (
                <span className="bg-coral shadow-coral absolute -top-3 left-8 rounded-full px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white">
                  Mais popular
                </span>
              )}

              <h3 className="font-serif text-xl font-semibold tracking-[-0.01em]">{t.name}</h3>

              <div className="mt-5 min-h-[9.5rem]">
                {t.custom ? (
                  <p className="font-serif text-4xl font-black leading-none">Sob consulta</p>
                ) : (
                  <>
                    {isAnnual && (
                      <p
                        className={cn(
                          'text-sm font-medium line-through',
                          featured ? 'text-cream/45' : 'text-ink-soft/45',
                        )}
                      >
                        {brl(t.priceMonthlyCents)}/mês
                      </p>
                    )}
                    <p className="flex items-baseline gap-x-1 font-serif leading-none">
                      <span className="text-4xl font-black">{brl(headlineCents)}</span>
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          featured ? 'text-cream/70' : 'text-ink-soft',
                        )}
                      >
                        {isAnnual ? '/mês (anual)' : '/mês'}
                      </span>
                    </p>

                    {isAnnual ? (
                      <div
                        className={cn(
                          'mt-2 space-y-1 text-xs',
                          featured ? 'text-cream/60' : 'text-ink-soft/70',
                        )}
                      >
                        <p className="font-medium">
                          cobrado {brl(t.priceAnnualCents)}/ano à vista
                        </p>
                        <span
                          className={cn(
                            'mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
                            featured
                              ? 'bg-green-bright/15 text-green-bright'
                              : 'bg-green/10 text-green',
                          )}
                        >
                          Economize {brl(totalSavingsCents)}/ano
                        </span>
                        {installmentCents && (
                          <p className="pt-0.5">
                            ou 12× de {brlCents(installmentCents)} no cartão (com juros)
                          </p>
                        )}
                        <p>Sem taxa de instalação.</p>
                      </div>
                    ) : (
                      <p
                        className={cn(
                          'mt-2 text-xs',
                          featured ? 'text-cream/60' : 'text-ink-soft/70',
                        )}
                      >
                        Comece agora, sem taxa de instalação.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* CTA único e com a mesma cor nos três (o badge "Mais popular" já ancora). */}
              <Button asChild variant="coral" className="mt-6 w-full rounded-full">
                <Link href={t.custom ? '/signup' : `/signup?plano=${t.tier.toLowerCase()}`}>
                  Começar
                </Link>
              </Button>

              <ul className="mt-8 flex flex-1 flex-col gap-3 text-[0.92rem] leading-snug">
                {featuresFor(t, prevName).map((feat) => (
                  <FeatureRow key={feat.text} feat={feat} featured={featured} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
