export function Pillars() {
  return (
    <section
      style={{
        // width:100% definido (mesma correção do hero): sem ele, a section (flex item do
        // layout) tem largura indefinida e o grid auto-fit colapsa (2 colunas em vez de 4).
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(56px,7vw,88px) clamp(16px,4vw,40px) clamp(20px,3vw,28px)',
        paddingBottom: 'clamp(56px,7vw,88px)',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '640px',
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
            Quatro pilares
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
          Quatro coisas resolvidas.{' '}
          <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>Uma</span> só conta.
        </h2>
        <p
          style={{
            font: '400 16.5px/1.55 var(--font-ui)',
            color: 'var(--ink-70)',
            margin: '0 auto',
            maxWidth: '480px',
          }}
        >
          O que outros sistemas vendem separado, aqui já vem junto.
        </p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))',
          gap: '16px',
        }}
      >
        <a
          href="/funcionalidades#agenda"
          className="hv-bd-green"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '22px',
            padding: '26px 24px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              width: '50px',
              height: '50px',
              borderRadius: 'var(--radius-icontile)',
              background: 'var(--green-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
            }}
          >
            <svg
              width="25"
              height="25"
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
          <div
            style={{
              font: '500 21px var(--font-display)',
              color: 'var(--emerald)',
              marginBottom: '8px',
            }}
          >
            Agenda
          </div>
          <div style={{ font: '400 14.5px/1.55 var(--font-ui)', color: 'var(--ink-70)', flex: 1 }}>
            Seu cliente marca sozinho, pelo app ou pela web. Você para de responder mensagem.
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '16px',
              font: '700 12px var(--font-ui)',
              color: 'var(--emerald)',
            }}
          >
            Ver{' '}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </div>
        </a>
        <a
          href="/funcionalidades#cliente"
          className="hv-bd-green"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '22px',
            padding: '26px 24px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              width: '50px',
              height: '50px',
              borderRadius: 'var(--radius-icontile)',
              background: 'var(--green-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
            }}
          >
            <svg
              width="25"
              height="25"
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
          <div
            style={{
              font: '500 21px var(--font-display)',
              color: 'var(--emerald)',
              marginBottom: '8px',
            }}
          >
            App do cliente
          </div>
          <div style={{ font: '400 14.5px/1.55 var(--font-ui)', color: 'var(--ink-70)', flex: 1 }}>
            Com a sua marca. Sem marketplace, sem concorrente aparecendo do seu lado.
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '16px',
              font: '700 12px var(--font-ui)',
              color: 'var(--emerald)',
            }}
          >
            Ver{' '}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </div>
        </a>
        <a
          href="/funcionalidades#dinheiro"
          className="hv-bd-green"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '22px',
            padding: '26px 24px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              width: '50px',
              height: '50px',
              borderRadius: 'var(--radius-icontile)',
              background: 'var(--green-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
            }}
          >
            <svg
              width="25"
              height="25"
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
          <div
            style={{
              font: '500 21px var(--font-display)',
              color: 'var(--emerald)',
              marginBottom: '8px',
            }}
          >
            Pagamentos e recorrência
          </div>
          <div style={{ font: '400 14.5px/1.55 var(--font-ui)', color: 'var(--ink-70)', flex: 1 }}>
            Cobre online, venda pacotes e assinaturas. Receita previsível todo mês.
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '16px',
              font: '700 12px var(--font-ui)',
              color: 'var(--emerald)',
            }}
          >
            Ver{' '}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </div>
        </a>
        <a
          href="/funcionalidades#fidelidade"
          className="hv-bd-green"
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '22px',
            padding: '26px 24px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <span
            style={{
              width: '50px',
              height: '50px',
              borderRadius: 'var(--radius-icontile)',
              background: 'var(--green-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
            }}
          >
            <svg
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="6" />
              <path d="M8.2 13.2 7 22l5-3 5 3-1.2-8.8" />
            </svg>
          </span>
          <div
            style={{
              font: '500 21px var(--font-display)',
              color: 'var(--emerald)',
              marginBottom: '8px',
            }}
          >
            Fidelidade
          </div>
          <div style={{ font: '400 14.5px/1.55 var(--font-ui)', color: 'var(--ink-70)', flex: 1 }}>
            Pontos e recompensas automáticos. Cliente volta sem você precisar lembrar.
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '16px',
              font: '700 12px var(--font-ui)',
              color: 'var(--emerald)',
            }}
          >
            Ver{' '}
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </div>
        </a>
      </div>
    </section>
  );
}
