export function Reminders() {
  return (
    <section
      id="lembretes"
      style={{
        // width:100% pra o grid auto-fit não colapsar (section é flex item do layout)
        width: '100%',
        maxWidth: '1080px',
        margin: '0 auto',
        padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,40px) 20px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div
          style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}
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
            Lembretes
          </span>
        </div>
        <h2
          style={{
            font: '400 clamp(26px,4.6vw,38px)/1.14 var(--font-display)',
            color: 'var(--emerald)',
            letterSpacing: '-.02em',
            margin: '0 auto',
            maxWidth: '760px',
          }}
        >
          Seu cliente é <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>sempre</span>{' '}
          avisado. O WhatsApp é opcional.
        </h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: 'var(--shadow-card)',
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
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </span>
            <span
              style={{
                font: '700 10px var(--font-ui)',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: '#0C7E41',
                background: 'var(--green-tint)',
                borderRadius: '999px',
                padding: '6px 12px',
              }}
            >
              Sempre ligado
            </span>
          </div>
          <div
            style={{
              font: '500 19px var(--font-display)',
              color: 'var(--emerald)',
              marginBottom: '8px',
            }}
          >
            E-mail e push no app
          </div>
          <div style={{ font: '400 14.5px/1.55 var(--font-ui)', color: 'var(--ink-70)' }}>
            Toda confirmação e todo lembrete saem por e-mail e push -{' '}
            <strong style={{ color: 'var(--ink)' }}>
              ilimitado, em todos os planos, sem custo extra.
            </strong>
          </div>
        </div>
        <div
          style={{
            background: 'var(--paper)',
            border: '1px solid var(--border-soft)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: 'var(--shadow-card)',
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
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 17 0Z" />
              </svg>
            </span>
            <span
              style={{
                font: '700 10px var(--font-ui)',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-50)',
                background: 'var(--cream)',
                border: '1px solid var(--border-soft)',
                borderRadius: '999px',
                padding: '6px 12px',
              }}
            >
              Opcional
            </span>
          </div>
          <div
            style={{
              font: '500 19px var(--font-display)',
              color: 'var(--emerald)',
              marginBottom: '8px',
            }}
          >
            Lembrete por WhatsApp
          </div>
          <div style={{ font: '400 14.5px/1.55 var(--font-ui)', color: 'var(--ink-70)' }}>
            Um canal <strong style={{ color: 'var(--ink)' }}>adicional</strong>, para clientes que
            preferem não usar o app. Cada plano já vem com uma cota mensal inclusa.
          </div>
        </div>
      </div>
    </section>
  );
}
