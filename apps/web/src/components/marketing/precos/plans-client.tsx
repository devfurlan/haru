'use client';

import { useState } from 'react';

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
    style={{ flex: 'none', marginTop: '2px' }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function Segmented({ annual, setAnnual }: { annual: boolean; setAnnual: (v: boolean) => void }) {
  const seg = (active: boolean): React.CSSProperties => ({
    flex: 1,
    textAlign: 'center',
    padding: '11px 10px',
    borderRadius: 'var(--radius-sm)',
    font: '600 13.5px var(--font-ui)',
    cursor: 'pointer',
    transition: 'background 200ms ease, color 200ms ease',
    background: active ? 'var(--emerald)' : 'var(--paper)',
    color: active ? 'var(--cream)' : 'var(--ink)',
    border: active ? '1px solid var(--emerald)' : '1px solid var(--border)',
  });
  return (
    <div style={{ display: 'flex', gap: '8px', width: 'min(300px,100%)' }}>
      <span style={seg(!annual)} onClick={() => setAnnual(false)}>
        Mensal
      </span>
      <span style={seg(annual)} onClick={() => setAnnual(true)}>
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
        bg: 'var(--emerald)',
        border: '1px solid rgba(143,191,164,.2)',
        radius: '26px',
        pad: '42px 26px 32px',
        shadow: 'var(--shadow-ondark)',
        name: 'var(--on-emerald)',
        sub: 'var(--on-emerald-mut)',
        price: 'var(--on-emerald)',
        unit: 'var(--on-emerald-mut)',
        caption: 'var(--on-emerald-mut)',
        divider: 'rgba(143,191,164,.22)',
        feat: 'var(--on-emerald)',
        head: 'var(--green)',
      }
    : {
        bg: 'var(--paper)',
        border: '1px solid var(--border-soft)',
        radius: '24px',
        pad: '32px 24px',
        shadow: 'var(--shadow-card)',
        name: 'var(--emerald)',
        sub: 'var(--ink-50)',
        price: 'var(--ink)',
        unit: 'var(--ink-50)',
        caption: 'var(--ink-50)',
        divider: 'var(--border-soft)',
        feat: 'var(--ink-70)',
        head: 'var(--ink)',
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
            top: '-13px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--coral)',
            color: '#fff',
            font: '700 10px var(--font-ui)',
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            padding: '7px 16px',
            borderRadius: '999px',
            boxShadow: '0 8px 20px -8px rgba(255,90,54,.7)',
            whiteSpace: 'nowrap',
          }}
        >
          Mais escolhido
        </div>
      )}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ font: '500 22px var(--font-display)', color: c.name, lineHeight: 1 }}>
          {card.name}
        </div>
      </div>
      <div style={{ font: '500 13.5px var(--font-ui)', color: c.sub, marginBottom: '18px' }}>
        {card.subtitle}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span
          style={{
            font: '600 clamp(34px,4.6vw,44px)/1 var(--font-display)',
            color: c.price,
            letterSpacing: '-.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {price}
        </span>
        <span style={{ font: '500 16px var(--font-ui)', color: c.unit }}>/mês</span>
      </div>
      <div
        style={{
          font: '500 12.5px var(--font-ui)',
          color: c.caption,
          margin: '9px 0 22px',
          minHeight: '16px',
        }}
      >
        {caption}
      </div>
      <div style={{ height: '1px', background: c.divider, marginBottom: '20px' }} />
      <div style={{ flex: 1 }}>
        {card.feats.map((feat, i) =>
          feat.heading ? (
            <div
              key={i}
              style={{
                font: '700 12px var(--font-ui)',
                letterSpacing: '.02em',
                color: c.head,
                padding: '12px 0 4px',
              }}
            >
              {feat.t}
            </div>
          ) : (
            <div
              key={i}
              style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', padding: '6px 0' }}
            >
              <Check />
              <span style={{ font: '400 14px/1.5 var(--font-ui)', color: c.feat }}>{feat.t}</span>
            </div>
          ),
        )}
      </div>
      <div style={{ marginTop: '26px' }}>
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
  const [annual, setAnnual] = useState(false);
  return (
    <>
      {/* toggle de cobrança - continua o hero (centralizado) */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 clamp(20px,5vw,40px) 34px',
          textAlign: 'center',
        }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <Segmented annual={annual} setAnnual={setAnnual} />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                font: '700 11px var(--font-ui)',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: '#0C7E41',
                background: 'var(--green-tint)',
                borderRadius: '999px',
                padding: '8px 13px',
                whiteSpace: 'nowrap',
              }}
            >
              2 meses grátis
            </span>
          </div>
          <span style={{ font: '500 13px var(--font-ui)', color: 'var(--ink-50)' }}>
            No anual você paga 10 meses e usa 12.
          </span>
        </div>
      </div>

      {/* cards + enterprise */}
      <section
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px clamp(16px,4vw,40px) 0',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
            gap: '18px',
            alignItems: 'stretch',
          }}
        >
          {cards.map((card) => (
            <PlanCard key={card.tier} card={card} annual={annual} />
          ))}
        </div>

        {/* Enterprise banner */}
        <div
          style={{
            marginTop: '24px',
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '24px',
            padding: 'clamp(24px,3vw,32px) clamp(22px,3vw,34px)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '28px 36px',
            alignItems: 'center',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '5px',
              background: 'var(--emerald)',
            }}
          />
          <div style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span
              style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
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
              <div
                style={{
                  font: '500 24px var(--font-display)',
                  color: 'var(--emerald)',
                  lineHeight: 1.1,
                }}
              >
                Enterprise
              </div>
              <div
                style={{
                  font: '500 13.5px var(--font-ui)',
                  color: 'var(--ink-50)',
                  marginTop: '5px',
                }}
              >
                Redes, franquias e multi-unidade
              </div>
              <div
                style={{
                  font: '600 20px var(--font-display)',
                  color: 'var(--ink)',
                  marginTop: '10px',
                }}
              >
                Sob consulta
              </div>
            </div>
          </div>
          <div
            style={{
              flex: '2 1 300px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px 22px',
            }}
          >
            {[
              'Acima de 15 profissionais',
              'Multi-unidade',
              'App white-label',
              'Lembretes sob medida',
              'Gerente de conta dedicado',
            ].map((t) => (
              <div key={t} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2FD37A"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flex: 'none' }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ font: '400 14px var(--font-ui)', color: 'var(--ink-70)' }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 'none' }}>
            <Btn variant="secondary" size="lg" href="/signup">
              Falar com o time
            </Btn>
          </div>
        </div>
      </section>
    </>
  );
}
