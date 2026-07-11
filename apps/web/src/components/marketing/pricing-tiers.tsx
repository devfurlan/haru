'use client';

import Link from 'next/link';
import { useState } from 'react';

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

const SUBTITLE: Record<string, string> = {
  ESSENCIAL: 'Pra quem toca tudo sozinho',
  PROFISSIONAL: 'Pra equipe no mesmo endereço',
  NEGOCIO: 'Pra quem tem mais de uma unidade',
};

interface Feat {
  text: string;
  strong?: boolean;
}

/** Só o que ESTÁ incluso (design lista incremental, sem linha de "não tem"). */
function featuresFor(t: PricingTier, prevName: string | null): Feat[] {
  const appts = `${fmtLimit(t.appointmentsPerMonth)} agendamentos/mês`;
  switch (t.tier) {
    case 'ESSENCIAL':
      return [
        { text: '1 profissional' },
        { text: 'Agenda + painel completo' },
        { text: 'Página pública com sua marca' },
        { text: 'App do cliente' },
        { text: 'Confirmação e lembrete no WhatsApp' },
      ];
    case 'PROFISSIONAL':
      return [
        { text: `Tudo do ${prevName ?? 'Solo'}, mais:`, strong: true },
        { text: 'Vários profissionais' },
        { text: 'Pagamento online · Pix e cartão' },
        { text: 'Webhooks - Discord, Slack, Zapier, n8n' },
      ];
    case 'NEGOCIO':
      return [
        { text: `Tudo do ${prevName ?? 'Time'}, mais:`, strong: true },
        { text: 'Várias unidades num painel' },
        { text: 'Visão consolidada do faturamento' },
        { text: 'Permissões por unidade' },
      ];
    default:
      return [
        { text: 'App do cliente + agenda pública na web' },
        { text: 'Confirmações e lembretes no WhatsApp' },
        { text: appts },
      ];
  }
}

export function PricingTiers({ tiers }: { tiers: PricingTier[] }) {
  // Anual é o default: ancora a expectativa no preço mais baixo.
  const [cycle, setCycle] = useState<Cycle>('ANNUAL');
  const isAnnual = cycle === 'ANNUAL';

  return (
    <>
      {/* Cabeçalho da seção + toggle de frequência */}
      <div className="mb-[52px] flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
        <div className="max-w-[560px]">
          <div className="text-sub mb-4 text-[0.72rem] font-bold uppercase tracking-[0.15em]">
            Planos
          </div>
          <h2 className="font-serif text-[clamp(2rem,4vw,2.6rem)] font-medium leading-[1.08] tracking-[-0.02em]">
            Planos simples, <em className="font-normal italic">sem pegadinha.</em>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-chip text-green-deep rounded-full px-3.5 py-1.5 text-xs font-semibold">
            {isAnnual ? '2 meses grátis no plano anual' : 'cobrado mês a mês'}
          </span>
          <div className="bg-paper border-edge flex rounded-full border p-1">
            {(['MONTHLY', 'ANNUAL'] as Cycle[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={cn(
                  'rounded-full px-5 py-2 text-[0.8rem] font-semibold transition-colors',
                  cycle === c ? 'bg-green-deep text-cream' : 'text-ink-70',
                )}
              >
                {c === 'MONTHLY' ? 'Mensal' : 'Anual'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {tiers.map((t, i) => {
          const featured = t.featured;
          const prevName = i > 0 ? tiers[i - 1].name : null;
          const headlineCents = isAnnual
            ? Math.round(t.priceAnnualCents / 12)
            : t.priceMonthlyCents;

          return (
            <div
              key={t.tier}
              className={cn(
                'relative rounded-[22px] p-[34px]',
                featured
                  ? 'bg-green-deep text-cream shadow-[0_24px_50px_-20px_rgba(10,51,36,.5)]'
                  : 'bg-paper border-edge hover:border-green-deep border transition-[border-color,box-shadow] hover:shadow-[0_16px_36px_-18px_rgba(10,51,36,.25)]',
              )}
              style={
                featured
                  ? {
                      backgroundImage:
                        'radial-gradient(320px 180px at 85% -15%, rgba(47,211,122,.15), transparent)',
                    }
                  : undefined
              }
            >
              {featured && (
                <span className="bg-coral text-paper absolute -top-3 left-[34px] rounded-full px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.08em]">
                  Pra equipes
                </span>
              )}

              <div className="mb-1 font-serif text-lg font-semibold">{t.name}</div>
              <div
                className={cn('mb-5 text-[0.88rem]', featured ? 'text-on-emerald-mut' : 'text-sub')}
              >
                {SUBTITLE[t.tier] ?? ''}
              </div>
              <div className="mb-5">
                {t.custom ? (
                  <span className="font-serif text-[2.75rem] font-semibold tracking-[-0.02em]">
                    Sob consulta
                  </span>
                ) : (
                  <>
                    <span className="font-serif text-[2.75rem] font-semibold tracking-[-0.02em]">
                      {brl(headlineCents)}
                    </span>
                    <span
                      className={cn(
                        'text-[0.95rem] font-medium',
                        featured ? 'text-on-emerald-mut' : 'text-sub',
                      )}
                    >
                      /mês
                    </span>
                  </>
                )}
              </div>

              <ul className="flex flex-col gap-2">
                {featuresFor(t, prevName).map((f) => (
                  <li
                    key={f.text}
                    className={cn(
                      'text-[0.9rem] leading-[1.4]',
                      f.strong && 'font-semibold',
                      featured
                        ? f.strong
                          ? 'text-cream'
                          : 'text-on-emerald-mut'
                        : f.strong
                          ? 'text-ink'
                          : 'text-ink-70',
                    )}
                  >
                    {f.text}
                  </li>
                ))}
              </ul>

              <Link
                href={t.custom ? '/signup' : `/signup?plano=${t.tier.toLowerCase()}`}
                className={cn(
                  'mt-6 block rounded-[14px] py-3.5 text-center text-[0.95rem] font-semibold transition-colors',
                  featured
                    ? 'bg-coral text-paper shadow-coral hover:brightness-[1.04]'
                    : 'border-green-deep text-green-deep hover:bg-green-deep hover:text-cream border-[1.5px]',
                )}
              >
                Começar com o {t.name}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
