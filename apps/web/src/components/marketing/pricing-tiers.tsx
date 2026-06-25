'use client';

import { Check, Minus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
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

/** R$ sem centavos (ex.: 6900 -> "R$ 69"). */
function brl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function fmtLimit(n: number | null): string {
  return n === null ? 'ilimitado' : n.toLocaleString('pt-BR');
}

function FeatureRow({
  on,
  featured,
  children,
}: {
  on: boolean;
  featured: boolean;
  children: React.ReactNode;
}) {
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
          on
            ? featured
              ? 'text-cream/85'
              : 'text-ink-soft'
            : featured
              ? 'text-cream/40'
              : 'text-ink-soft/45',
        )}
      >
        {children}
      </span>
    </li>
  );
}

export function PricingTiers({ tiers }: { tiers: PricingTier[] }) {
  const [cycle, setCycle] = useState<Cycle>('MONTHLY');

  return (
    <>
      {/* Toggle de frequência */}
      <div className="mt-12 flex justify-center">
        <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-paper p-1 text-sm font-semibold">
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
      <p className="mt-3 text-center text-xs text-ink-soft/70">
        No plano anual você economiza ~20% (2 meses grátis).
      </p>

      {/* Cards */}
      <div className="mx-auto mt-12 grid max-w-md grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
        {tiers.map((t) => {
          const featured = t.featured;
          const isAnnual = cycle === 'ANNUAL';
          // No anual, destacamos o equivalente por mês para comparar com o mensal.
          const headlineCents = isAnnual
            ? Math.round(t.priceAnnualCents / 12)
            : t.priceMonthlyCents;
          return (
            <div
              key={t.tier}
              className={cn(
                'relative flex flex-col rounded-3xl p-8 ring-1 transition-transform duration-300 hover:-translate-y-1',
                featured ? 'bg-ink text-cream ring-ink shadow-coral' : 'bg-paper ring-border',
              )}
            >
              {featured && (
                <span className="absolute -top-3 left-8 rounded-full bg-coral px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white shadow-coral">
                  Mais popular
                </span>
              )}

              <h3 className="font-serif text-xl font-semibold tracking-[-0.01em]">{t.name}</h3>

              <div className="mt-5 min-h-[3.75rem]">
                {t.custom ? (
                  <p className="font-serif text-4xl font-black leading-none">Sob consulta</p>
                ) : (
                  <>
                    <p className="flex items-baseline gap-x-1 font-serif leading-none">
                      <span className="text-4xl font-black">{brl(headlineCents)}</span>
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          featured ? 'text-cream/70' : 'text-ink-soft',
                        )}
                      >
                        /mês
                      </span>
                    </p>
                    {isAnnual && (
                      <p
                        className={cn(
                          'mt-1.5 text-xs font-medium',
                          featured ? 'text-cream/60' : 'text-ink-soft/70',
                        )}
                      >
                        {brl(t.priceAnnualCents)}/ano cobrado de uma vez
                      </p>
                    )}
                  </>
                )}
              </div>

              <Button
                asChild
                variant={featured ? 'coral' : 'ink'}
                className="mt-6 w-full rounded-full"
              >
                <Link href="/signup">Começar</Link>
              </Button>

              <ul className="mt-8 flex flex-1 flex-col gap-3 text-[0.92rem] leading-snug">
                <FeatureRow on featured={featured}>
                  Bot de IA no WhatsApp + lembretes
                </FeatureRow>
                <FeatureRow on featured={featured}>
                  {fmtLimit(t.appointmentsPerMonth)} agendamentos/mês
                </FeatureRow>
                <FeatureRow on featured={featured}>
                  {fmtLimit(t.aiMessagesPerMonth)} mensagens de IA/mês
                </FeatureRow>
                <FeatureRow on={t.onlinePayments} featured={featured}>
                  Pagamentos online (Pix/cartão)
                </FeatureRow>
                <FeatureRow on={t.team} featured={featured}>
                  {t.team
                    ? `Equipe: até ${fmtLimit(t.maxProfessionals)} profissionais`
                    : '1 profissional'}
                </FeatureRow>
                <FeatureRow on={t.webhooks} featured={featured}>
                  Webhooks (Discord/Slack/n8n)
                </FeatureRow>
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
