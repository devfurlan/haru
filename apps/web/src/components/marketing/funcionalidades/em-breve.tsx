export function EmBreve() {
  return (
    <section
      id="em-breve"
      style={{
        scrollMarginTop: '78px',
        maxWidth: '1080px',
        margin: '0 auto',
        padding: 'clamp(44px,6vw,72px) clamp(20px,5vw,40px) clamp(20px,3vw,32px)',
      }}
    >
      <div
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--border-soft)',
          borderRadius: '24px',
          padding: 'clamp(24px,3vw,36px)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px 40px',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 240px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '9px',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--coral)',
                animation: 'dmd-pulse 1.8s infinite',
              }}
            ></span>
            <span
              style={{
                font: '700 11px var(--font-ui)',
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: 'var(--ink-50)',
              }}
            >
              No forno
            </span>
          </div>
          <h2
            style={{
              font: '400 clamp(22px,3vw,30px)/1.15 var(--font-display)',
              color: 'var(--emerald)',
              letterSpacing: '-.02em',
              margin: '0 0 8px',
            }}
          >
            O que vem por aí.
          </h2>
          <p
            style={{
              font: '400 15px/1.55 var(--font-ui)',
              color: 'var(--ink-70)',
              margin: 0,
              maxWidth: '400px',
            }}
          >
            Em desenvolvimento agora. Chega pra todos os planos, sem custo extra.
          </p>
        </div>
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '13px',
              background: 'var(--cream)',
              border: '1px solid var(--border-soft)',
              borderRadius: '14px',
              padding: '13px 15px',
            }}
          >
            <span
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                flex: 'none',
              }}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3.1-.4-4.4-1.2L3 20l1.2-5.1A8.5 8.5 0 1 1 21 11.5z" />
              </svg>
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ font: '600 14.5px var(--font-ui)', color: 'var(--ink)' }}>
                Atendente de IA no WhatsApp
              </div>
              <div style={{ font: '500 12px var(--font-ui)', color: 'var(--ink-50)' }}>
                responde e agenda sozinho, 24h
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '13px',
              background: 'var(--cream)',
              border: '1px solid var(--border-soft)',
              borderRadius: '14px',
              padding: '13px 15px',
            }}
          >
            <span
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                flex: 'none',
              }}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="5" y="2" width="14" height="20" rx="2.6" />
                <line x1="10" y1="18.5" x2="14" y2="18.5" />
              </svg>
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ font: '600 14.5px var(--font-ui)', color: 'var(--ink)' }}>
                App white-label
              </div>
              <div style={{ font: '500 12px var(--font-ui)', color: 'var(--ink-50)' }}>
                seu app na loja, com o seu nome
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '13px',
              background: 'var(--cream)',
              border: '1px solid var(--border-soft)',
              borderRadius: '14px',
              padding: '13px 15px',
            }}
          >
            <span
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                flex: 'none',
              }}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="m7 14 3-3 3 3 5-5" />
              </svg>
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ font: '600 14.5px var(--font-ui)', color: 'var(--ink)' }}>
                Relatórios com IA
              </div>
              <div style={{ font: '500 12px var(--font-ui)', color: 'var(--ink-50)' }}>
                o que puxar mais faturamento, explicado
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
