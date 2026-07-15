'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

import { Btn } from './btn';

export type PlanVM = {
  tier: string;
  name: string;
  subtitle: string;
  featured: boolean;
  custom: boolean;
  monthly: string; // "R$ 79" (ou "Sob consulta")
  annualMonthly: string; // "R$ 65,83"
  annualTotal: string; // "R$ 790"
  feats: { text: string; strong?: boolean }[];
};

const Check = () => (
  <svg
    width="16"
    height="16"
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

function PlanCard({ plan, annual }: { plan: PlanVM; annual: boolean }) {
  const f = plan.featured;
  const price = plan.custom ? plan.monthly : annual ? plan.annualMonthly : plan.monthly;
  const caption = plan.custom
    ? ''
    : annual
      ? `${plan.annualTotal}/ano · 2 meses grátis`
      : 'cobrado mensalmente';

  const c = f
    ? {
        bg: 'bg-green-deep',
        border: 'border border-[rgba(143,191,164,.2)]',
        radius: 'rounded-[24px]',
        pad: 'pt-[38px] pr-[24px] pb-[28px] pl-[24px]',
        shadow: 'shadow-[var(--shadow-ondark)]',
        name: 'text-on-emerald',
        sub: 'text-on-emerald-mut',
        price: 'text-on-emerald',
        unit: 'text-on-emerald-mut',
        caption: 'text-on-emerald-mut',
        divider: 'bg-[rgba(143,191,164,.22)]',
        feat: 'text-on-emerald',
        more: 'text-green-bright',
      }
    : {
        bg: 'bg-paper',
        border: 'border border-line',
        radius: 'rounded-[22px]',
        pad: 'py-[28px] px-[24px]',
        shadow: 'shadow-[var(--shadow-card)]',
        name: 'text-green-deep',
        sub: 'text-ink-50',
        price: 'text-ink',
        unit: 'text-ink-50',
        caption: 'text-ink-50',
        divider: 'bg-line',
        feat: 'text-ink-70',
        more: 'text-[#0C7E41]',
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
        <div className="bg-coral absolute left-[50%] top-[-12px] whitespace-nowrap rounded-full px-[15px] py-[6px] font-sans text-[10px] font-bold uppercase leading-[normal] tracking-[.12em] text-[#fff] shadow-[0_8px_20px_-8px_rgba(255,90,54,.7)] [transform:translateX(-50%)]">
          Mais escolhido
        </div>
      )}
      <div className={cn('font-serif text-[20px] font-medium leading-[1]', c.name)}>
        {plan.name}
      </div>
      <div
        className={cn(
          'mb-[16px] mt-[6px] font-sans text-[13px] font-medium leading-[normal]',
          c.sub,
        )}
      >
        {plan.subtitle}
      </div>
      <div className="flex items-baseline gap-[5px]">
        <span
          className={cn(
            'whitespace-nowrap font-serif text-[38px] font-semibold leading-[1] tracking-[-.02em]',
            c.price,
          )}
        >
          {price}
        </span>
        {!plan.custom && (
          <span className={cn('font-sans text-[15px] font-medium leading-[normal]', c.unit)}>
            /mês
          </span>
        )}
      </div>
      <div
        className={cn(
          'mt-[8px] min-h-[15px] font-sans text-[12px] font-medium leading-[normal]',
          c.caption,
        )}
      >
        {caption}
      </div>
      <div className={cn('my-[18px] h-[1px]', c.divider)} />
      <div className="flex flex-1 flex-col gap-[10px]">
        {plan.feats.map((feat, i) =>
          feat.strong ? (
            <div
              key={i}
              className={cn(
                'pt-[3px] font-sans text-[11px] font-bold leading-[normal] tracking-[.03em]',
                c.more,
              )}
            >
              {feat.text}
            </div>
          ) : (
            <div key={i} className="flex items-start gap-[10px]">
              <Check />
              <span className={cn('font-sans text-[13.5px] font-normal leading-[1.4]', c.feat)}>
                {feat.text}
              </span>
            </div>
          ),
        )}
      </div>
      <div className="mt-[22px]">
        <Btn
          variant={f ? 'primary' : 'secondary'}
          full
          href={`/signup?plano=${plan.tier.toLowerCase()}`}
        >
          Começar agora
        </Btn>
      </div>
    </div>
  );
}

export function PricingPreviewClient({ plans }: { plans: PlanVM[] }) {
  // Anual é o padrão: é o preço que a gente quer que apareça primeiro (2 meses grátis).
  const [annual, setAnnual] = useState(true);

  return (
    <>
      {/* billing toggle */}
      <div className="mb-[clamp(24px,3vw,34px)] flex justify-center">
        <div className="border-line bg-paper inline-flex items-center gap-[4px] rounded-full border p-[4px] shadow-[var(--shadow-card)]">
          <span
            onClick={() => setAnnual(false)}
            className={cn(
              'cursor-pointer px-[18px] py-[9px] font-sans text-[13px] font-bold leading-[normal]',
              !annual ? 'bg-green-deep rounded-full text-[#fff]' : 'text-ink-50',
            )}
          >
            Mensal
          </span>
          <span
            onClick={() => setAnnual(true)}
            className={cn(
              'inline-flex cursor-pointer items-center gap-[7px] px-[16px] py-[9px] font-sans text-[13px] font-bold leading-[normal]',
              annual ? 'bg-green-deep rounded-full text-[#fff]' : 'text-ink-50',
            )}
          >
            Anual{' '}
            <span
              className={cn(
                'rounded-full px-[7px] py-[2px] font-sans text-[9px] font-bold uppercase leading-[normal] tracking-[.05em]',
                annual ? 'bg-green-bright text-[#083020]' : 'bg-chip text-[#0C7E41]',
              )}
            >
              2 meses grátis
            </span>
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-[920px] grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-stretch gap-[16px]">
        {plans.map((plan) => (
          <PlanCard key={plan.tier} plan={plan} annual={annual} />
        ))}
      </div>
    </>
  );
}
