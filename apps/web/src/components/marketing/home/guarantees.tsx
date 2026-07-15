export function Guarantees() {
  return (
    <section
      style={{
        background: 'var(--paper)',
        borderTop: '1px solid var(--border-soft)',
        borderBottom: '1px solid var(--border-soft)',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,40px)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto clamp(34px,4vw,48px)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '9px',
              marginBottom: '14px',
            }}
          >
            <span
              style={{
                width: '20px',
                height: '2px',
                background: 'var(--coral)',
                borderRadius: '2px',
              }}
            />
            <span
              style={{
                font: '700 11px var(--font-ui)',
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: '#0C7E41',
              }}
            >
              Sem pegadinha
            </span>
          </div>
          <h2
            style={{
              font: '400 clamp(28px,4.6vw,40px)/1.1 var(--font-display)',
              color: 'var(--emerald)',
              letterSpacing: '-.02em',
              margin: '0 auto 12px',
            }}
          >
            Pode testar <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>sem medo</span>.
          </h2>
          <p
            style={{
              font: '400 16.5px/1.55 var(--font-ui)',
              color: 'var(--ink-70)',
              margin: '0 auto',
              maxWidth: '480px',
            }}
          >
            Trocar de sistema dá preguiça, a gente sabe. Por isso o risco fica todo do nosso lado.
          </p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(198px,1fr))',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '15px',
              }}
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <div
              style={{
                font: '500 17px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
                lineHeight: '1.2',
              }}
            >
              Garantia de 30 dias
            </div>
            <div
              style={{
                font: '400 13.5px/1.55 var(--font-ui)',
                color: 'var(--ink-70)',
              }}
            >
              Não curtiu? Devolução integral, sem perguntinha chata.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '15px',
              }}
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 14l6-6" />
                <circle cx="9.5" cy="8.5" r="1.2" />
                <circle cx="14.5" cy="13.5" r="1.2" />
                <path d="M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z" />
                <line x1="4" y1="4" x2="20" y2="20" />
              </svg>
            </span>
            <div
              style={{
                font: '500 17px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
                lineHeight: '1.2',
              }}
            >
              Sem taxa de instalação
            </div>
            <div
              style={{
                font: '400 13.5px/1.55 var(--font-ui)',
                color: 'var(--ink-70)',
              }}
            >
              Você paga a mensalidade e mais nada.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '15px',
              }}
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            <div
              style={{
                font: '500 17px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
                lineHeight: '1.2',
              }}
            >
              Cancele quando quiser
            </div>
            <div
              style={{
                font: '400 13.5px/1.55 var(--font-ui)',
                color: 'var(--ink-70)',
              }}
            >
              Um clique, sem multa, sem fidelidade escondida.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '15px',
              }}
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 17 0Z" />
                <path d="m9 11 2 2 4-4" />
              </svg>
            </span>
            <div
              style={{
                font: '500 17px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
                lineHeight: '1.2',
              }}
            >
              Suporte de gente, em português
            </div>
            <div
              style={{
                font: '400 13.5px/1.55 var(--font-ui)',
                color: 'var(--ink-70)',
              }}
            >
              Fala direto com o fundador pelo WhatsApp. Sem robô.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '15px',
              }}
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="10" width="16" height="11" rx="2.4" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                <circle cx="12" cy="15.5" r="1.3" />
              </svg>
            </span>
            <div
              style={{
                font: '500 17px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
                lineHeight: '1.2',
              }}
            >
              LGPD e nuvem
            </div>
            <div
              style={{
                font: '400 13.5px/1.55 var(--font-ui)',
                color: 'var(--ink-70)',
              }}
            >
              Dados dos seus clientes protegidos, infraestrutura com backup.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
