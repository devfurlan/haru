export function PillarsIndex() {
  return (
    <section
      style={{
        // width:100% conserta o colapso do grid auto-fit (section é flex item do layout)
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '14px clamp(16px,4vw,40px) clamp(24px,4vw,44px)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))',
          gap: '16px',
        }}
      >
        <a
          href="#agenda"
          className="hv-bd-green"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '20px',
            padding: '22px 20px',
            boxShadow: 'var(--shadow-card)',
            display: 'block',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2.5" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span
              style={{
                font: '700 12px var(--font-ui)',
                letterSpacing: '.14em',
                color: 'var(--ink-30)',
              }}
            >
              01
            </span>
          </div>
          <div style={{ font: '500 19px var(--font-display)', color: 'var(--emerald)' }}>
            Agenda
          </div>
          <div
            style={{
              font: '400 13.5px/1.5 var(--font-ui)',
              color: 'var(--ink-50)',
              marginTop: '6px',
            }}
          >
            Rápida, por profissional, com fila de espera.
          </div>
        </a>
        <a
          href="#cliente"
          className="hv-bd-green"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '20px',
            padding: '22px 20px',
            boxShadow: 'var(--shadow-card)',
            display: 'block',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="22"
                height="22"
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
            <span
              style={{
                font: '700 12px var(--font-ui)',
                letterSpacing: '.14em',
                color: 'var(--ink-30)',
              }}
            >
              02
            </span>
          </div>
          <div style={{ font: '500 19px var(--font-display)', color: 'var(--emerald)' }}>
            Cliente
          </div>
          <div
            style={{
              font: '400 13.5px/1.5 var(--font-ui)',
              color: 'var(--ink-50)',
              marginTop: '6px',
            }}
          >
            App e página com a sua marca. Sem marketplace.
          </div>
        </a>
        <a
          href="#dinheiro"
          className="hv-bd-green"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '20px',
            padding: '22px 20px',
            boxShadow: 'var(--shadow-card)',
            display: 'block',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="5" width="20" height="14" rx="2.5" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </span>
            <span
              style={{
                font: '700 12px var(--font-ui)',
                letterSpacing: '.14em',
                color: 'var(--ink-30)',
              }}
            >
              03
            </span>
          </div>
          <div style={{ font: '500 19px var(--font-display)', color: 'var(--emerald)' }}>
            Dinheiro
          </div>
          <div
            style={{
              font: '400 13.5px/1.5 var(--font-ui)',
              color: 'var(--ink-50)',
              marginTop: '6px',
            }}
          >
            Assinatura, pacotes e pagamento antecipado.
          </div>
        </a>
        <a
          href="#gestao"
          className="hv-bd-green"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '20px',
            padding: '22px 20px',
            boxShadow: 'var(--shadow-card)',
            display: 'block',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
              </svg>
            </span>
            <span
              style={{
                font: '700 12px var(--font-ui)',
                letterSpacing: '.14em',
                color: 'var(--ink-30)',
              }}
            >
              04
            </span>
          </div>
          <div style={{ font: '500 19px var(--font-display)', color: 'var(--emerald)' }}>
            Gestão
          </div>
          <div
            style={{
              font: '400 13.5px/1.5 var(--font-ui)',
              color: 'var(--ink-50)',
              marginTop: '6px',
            }}
          >
            O negócio inteiro numa tela, no PC e no celular.
          </div>
        </a>
        <a
          href="#fidelidade"
          className="hv-bd-green"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '20px',
            padding: '22px 20px',
            boxShadow: 'var(--shadow-card)',
            display: 'block',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="6" />
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
              </svg>
            </span>
            <span
              style={{
                font: '700 12px var(--font-ui)',
                letterSpacing: '.14em',
                color: 'var(--ink-30)',
              }}
            >
              05
            </span>
          </div>
          <div style={{ font: '500 19px var(--font-display)', color: 'var(--emerald)' }}>
            Fidelidade
          </div>
          <div
            style={{
              font: '400 13.5px/1.5 var(--font-ui)',
              color: 'var(--ink-50)',
              marginTop: '6px',
            }}
          >
            Pontos, recompensas e retorno automático.
          </div>
        </a>
      </div>
    </section>
  );
}
