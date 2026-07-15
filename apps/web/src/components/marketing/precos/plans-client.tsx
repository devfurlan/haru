'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

import { Btn } from '../home/btn';
import type { PrecosCard } from './plans-data';

const Check = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#2FD37A"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mt-[2px] flex-none"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function Segmented({ annual, setAnnual }: { annual: boolean; setAnnual: (v: boolean) => void }) {
  const seg = (active: boolean) =>
    cn(
      // `--radius-sm` só existe dentro do @theme inline (não é emitido como custom
      // property), então isto resolve para 0 - igual ao inline original. Não trocar por
      // `rounded-sm`: o utilitário inlina calc(var(--radius) - 4px) e arredondaria em 8px.
      'flex-1 cursor-pointer rounded-[var(--radius-sm)] border px-[10px] py-[11px] text-center font-sans text-[13.5px] leading-[normal] font-semibold [transition:background_200ms_ease,color_200ms_ease]',
      active ? 'border-green-deep bg-green-deep text-cream' : 'border-edge bg-paper text-ink',
    );
  return (
    <div className="flex w-[min(300px,100%)] gap-[8px]">
      <span className={seg(!annual)} onClick={() => setAnnual(false)}>
        Mensal
      </span>
      <span className={seg(annual)} onClick={() => setAnnual(true)}>
        Anual
      </span>
    </div>
  );
}

function PlanCard({ card, annual }: { card: PrecosCard; annual: boolean }) {
  const f = card.featured;
  const price = annual ? card.annualMonthly : card.monthly;
  const caption = annual ? `${card.annualTotal} por ano · 2 meses grátis` : 'cobrado mensalmente';
  const c = f
    ? {
        bg: 'bg-green-deep',
        border: 'border border-[rgba(143,191,164,.2)]',
        radius: 'rounded-[26px]',
        pad: 'pt-[42px] px-[26px] pb-[32px]',
        shadow: 'shadow-[var(--shadow-ondark)]',
        name: 'text-on-emerald',
        sub: 'text-on-emerald-mut',
        price: 'text-on-emerald',
        unit: 'text-on-emerald-mut',
        caption: 'text-on-emerald-mut',
        divider: 'bg-[rgba(143,191,164,.22)]',
        feat: 'text-on-emerald',
        head: 'text-green-bright',
      }
    : {
        bg: 'bg-paper',
        border: 'border border-line',
        radius: 'rounded-[24px]',
        pad: 'px-[24px] py-[32px]',
        shadow: 'shadow-[var(--shadow-card)]',
        name: 'text-green-deep',
        sub: 'text-ink-50',
        price: 'text-ink',
        unit: 'text-ink-50',
        caption: 'text-ink-50',
        divider: 'bg-line',
        feat: 'text-ink-70',
        head: 'text-ink',
      };
  return (
    <div
      className={cn(
        'relative flex flex-col',
        c.bg,
        c.border,
        c.radius,
        c.pad,
        c.shadow,
        f && 'z-[2]',
      )}
    >
      {f && (
        <div className="bg-coral absolute left-[50%] top-[-13px] whitespace-nowrap rounded-full px-[16px] py-[7px] font-sans text-[10px] font-bold uppercase leading-[normal] tracking-[.12em] text-[#fff] shadow-[0_8px_20px_-8px_rgba(255,90,54,.7)] [transform:translateX(-50%)]">
          Mais escolhido
        </div>
      )}
      <div className="mb-[16px]">
        <div className={cn('font-serif text-[22px] font-medium leading-[1]', c.name)}>
          {card.name}
        </div>
      </div>
      <div className={cn('mb-[18px] font-sans text-[13.5px] font-medium leading-[normal]', c.sub)}>
        {card.subtitle}
      </div>
      <div className="flex items-baseline gap-[6px]">
        <span
          className={cn(
            'whitespace-nowrap font-serif text-[clamp(34px,4.6vw,44px)] font-semibold leading-[1] tracking-[-.02em]',
            c.price,
          )}
        >
          {price}
        </span>
        <span className={cn('font-sans text-[16px] font-medium leading-[normal]', c.unit)}>
          /mês
        </span>
      </div>
      <div
        className={cn(
          'mb-[22px] mt-[9px] min-h-[16px] font-sans text-[12.5px] font-medium leading-[normal]',
          c.caption,
        )}
      >
        {caption}
      </div>
      <div className={cn('mb-[20px] h-[1px]', c.divider)} />
      <div className="flex-1">
        {card.feats.map((feat, i) =>
          feat.heading ? (
            <div
              key={i}
              className={cn(
                'pb-[4px] pt-[12px] font-sans text-[12px] font-bold leading-[normal] tracking-[.02em]',
                c.head,
              )}
            >
              {feat.t}
            </div>
          ) : (
            <div key={i} className="flex items-start gap-[11px] py-[6px]">
              <Check />
              <span className={cn('font-sans text-[14px] font-normal leading-[1.5]', c.feat)}>
                {feat.t}
              </span>
            </div>
          ),
        )}
      </div>
      <div className="mt-[26px]">
        <Btn
          variant={f ? 'primary' : 'secondary'}
          full
          href={`/signup?plano=${card.tier.toLowerCase()}`}
        >
          Começar agora
        </Btn>
      </div>
    </div>
  );
}

export function PrecosPlans({ cards }: { cards: PrecosCard[] }) {
  // Anual é o padrão: é o preço que a gente quer que apareça primeiro (2 meses grátis).
  const [annual, setAnnual] = useState(true);
  return (
    <>
      {/* toggle de cobrança - continua o hero (centralizado) */}
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,40px)] pb-[34px] text-center">
        <div className="flex flex-col items-center gap-[12px]">
          <div className="flex flex-wrap items-center justify-center gap-[12px]">
            <Segmented annual={annual} setAnnual={setAnnual} />
            <span className="bg-chip inline-flex items-center whitespace-nowrap rounded-full px-[13px] py-[8px] font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.06em] text-[#0C7E41]">
              2 meses grátis
            </span>
          </div>
          <span className="text-ink-50 font-sans text-[13px] font-medium leading-[normal]">
            No anual você paga 10 meses e usa 12.
          </span>
        </div>
      </div>

      {/* cards + enterprise */}
      <section className="mx-auto w-full max-w-[1200px] px-[clamp(16px,4vw,40px)] pt-[16px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] items-stretch gap-[18px]">
          {cards.map((card) => (
            <PlanCard key={card.tier} card={card} annual={annual} />
          ))}
        </div>

        {/* Enterprise banner */}
        <div className="border-line bg-paper relative mt-[24px] flex flex-wrap items-center gap-x-[36px] gap-y-[28px] overflow-hidden rounded-[24px] border px-[clamp(22px,3vw,34px)] py-[clamp(24px,3vw,32px)] shadow-[var(--shadow-card)]">
          <div className="bg-green-deep absolute bottom-0 left-0 top-0 w-[5px]" />
          <div className="flex flex-[1_1_240px] items-center gap-[16px]">
            <span className="bg-green-deep flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[var(--radius-icontile)]">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2FD37A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 22V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v18" />
                <path d="M3 22h18" />
                <path d="M9.5 7h.01M14.5 7h.01M9.5 11h.01M14.5 11h.01M9.5 15h.01M14.5 15h.01" />
              </svg>
            </span>
            <div>
              <div className="text-green-deep font-serif text-[24px] font-medium leading-[1.1]">
                Enterprise
              </div>
              <div className="text-ink-50 mt-[5px] font-sans text-[13.5px] font-medium leading-[normal]">
                Redes, franquias e multi-unidade
              </div>
              <div className="text-ink mt-[10px] font-serif text-[20px] font-semibold leading-[normal]">
                Sob consulta
              </div>
            </div>
          </div>
          <div className="grid flex-[2_1_300px] grid-cols-[1fr_1fr] gap-x-[22px] gap-y-[8px]">
            {[
              'Acima de 15 profissionais',
              'Multi-unidade',
              'App white-label',
              'Lembretes sob medida',
              'Gerente de conta dedicado',
            ].map((t) => (
              <div key={t} className="flex items-center gap-[10px]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2FD37A"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-none"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-ink-70 font-sans text-[14px] font-normal leading-[normal]">
                  {t}
                </span>
              </div>
            ))}
          </div>
          <div className="flex-none">
            <Btn variant="secondary" size="lg" href="/signup">
              Falar com o time
            </Btn>
          </div>
        </div>
      </section>
    </>
  );
}
