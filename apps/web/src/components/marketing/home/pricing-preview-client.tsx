'use client';

import { useState } from 'react';

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
    style={{ flex: 'none', marginTop: '2px' }}
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
        bg: 'var(--emerald)',
        border: '1px solid rgba(143,191,164,.2)',
        radius: '24px',
        pad: '38px 24px 28px',
        shadow: 'var(--shadow-ondark)',
        name: 'var(--on-emerald)',
        sub: 'var(--on-emerald-mut)',
        price: 'var(--on-emerald)',
        unit: 'var(--on-emerald-mut)',
        caption: 'var(--on-emerald-mut)',
        divider: 'rgba(143,191,164,.22)',
        feat: 'var(--on-emerald)',
        more: 'var(--green)',
      }
    : {
        bg: 'var(--paper)',
        border: '1px solid var(--border-soft)',
        radius: '22px',
        pad: '28px 24px',
        shadow: 'var(--shadow-card)',
        name: 'var(--emerald)',
        sub: 'var(--ink-50)',
        price: 'var(--ink)',
        unit: 'var(--ink-50)',
        caption: 'var(--ink-50)',
        divider: 'var(--border-soft)',
        feat: 'var(--ink-70)',
        more: '#0C7E41',
      };

  return (
    <div
      style={{
        position: 'relative',
        background: c.bg,
        border: c.border,
        borderRadius: c.radius,
        padding: c.pad,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: c.shadow,
        ...(f ? { zIndex: 2 } : null),
      }}
    >
      {f && (
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--coral)',
            color: '#fff',
            font: '700 10px var(--font-ui)',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            padding: '6px 15px',
            borderRadius: '999px',
            boxShadow: '0 8px 20px -8px rgba(255,90,54,.7)',
            whiteSpace: 'nowrap',
          }}
        >
          Mais escolhido
        </div>
      )}
      <div style={{ font: '500 20px var(--font-display)', color: c.name, lineHeight: 1 }}>
        {plan.name}
      </div>
      <div style={{ font: '500 13px var(--font-ui)', color: c.sub, margin: '6px 0 16px' }}>
        {plan.subtitle}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
        <span
          style={{
            font: '600 38px/1 var(--font-display)',
            color: c.price,
            letterSpacing: '-.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {price}
        </span>
        {!plan.custom && (
          <span style={{ font: '500 15px var(--font-ui)', color: c.unit }}>/mês</span>
        )}
      </div>
      <div
        style={{
          font: '500 12px var(--font-ui)',
          color: c.caption,
          marginTop: '8px',
          minHeight: '15px',
        }}
      >
        {caption}
      </div>
      <div style={{ height: '1px', background: c.divider, margin: '18px 0' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {plan.feats.map((feat, i) =>
          feat.strong ? (
            <div
              key={i}
              style={{
                font: '700 11px var(--font-ui)',
                letterSpacing: '.03em',
                color: c.more,
                paddingTop: '3px',
              }}
            >
              {feat.text}
            </div>
          ) : (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <Check />
              <span style={{ font: '400 13.5px/1.4 var(--font-ui)', color: c.feat }}>
                {feat.text}
              </span>
            </div>
          ),
        )}
      </div>
      <div style={{ marginTop: '22px' }}>
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
  const [annual, setAnnual] = useState(false);

  return (
    <>
      {/* billing toggle */}
      <div
        style={{ display: 'flex', justifyContent: 'center', marginBottom: 'clamp(24px,3vw,34px)' }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '999px',
            padding: '4px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <span
            onClick={() => setAnnual(false)}
            style={
              !annual
                ? {
                    font: '700 13px var(--font-ui)',
                    color: '#fff',
                    background: 'var(--emerald)',
                    borderRadius: '999px',
                    padding: '9px 18px',
                    cursor: 'pointer',
                  }
                : {
                    font: '700 13px var(--font-ui)',
                    color: 'var(--ink-50)',
                    padding: '9px 18px',
                    cursor: 'pointer',
                  }
            }
          >
            Mensal
          </span>
          <span
            onClick={() => setAnnual(true)}
            style={
              annual
                ? {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    font: '700 13px var(--font-ui)',
                    color: '#fff',
                    background: 'var(--emerald)',
                    borderRadius: '999px',
                    padding: '9px 16px',
                    cursor: 'pointer',
                  }
                : {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    font: '700 13px var(--font-ui)',
                    color: 'var(--ink-50)',
                    padding: '9px 16px',
                    cursor: 'pointer',
                  }
            }
          >
            Anual{' '}
            <span
              style={
                annual
                  ? {
                      font: '700 9px var(--font-ui)',
                      letterSpacing: '.05em',
                      textTransform: 'uppercase',
                      color: '#083020',
                      background: 'var(--green)',
                      borderRadius: '999px',
                      padding: '2px 7px',
                    }
                  : {
                      font: '700 9px var(--font-ui)',
                      letterSpacing: '.05em',
                      textTransform: 'uppercase',
                      color: '#0C7E41',
                      background: 'var(--green-tint)',
                      borderRadius: '999px',
                      padding: '2px 7px',
                    }
              }
            >
              2 meses grátis
            </span>
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
          gap: '16px',
          alignItems: 'stretch',
          maxWidth: '920px',
          margin: '0 auto',
        }}
      >
        {plans.map((plan) => (
          <PlanCard key={plan.tier} plan={plan} annual={annual} />
        ))}
      </div>
    </>
  );
}
