export function HowItWorks() {
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
          maxWidth: '1080px',
          margin: '0 auto',
          padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,40px)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto clamp(36px,4vw,52px)',
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
              Como funciona
            </span>
          </div>
          <h2
            style={{
              font: '400 clamp(28px,4.6vw,40px)/1.1 var(--font-display)',
              color: 'var(--emerald)',
              letterSpacing: '-.02em',
              margin: '0',
            }}
          >
            Três passos. <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>Pronto</span>.
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
            gap: 'clamp(20px,3vw,32px)',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--cream)',
                border: '1px solid var(--border-soft)',
                display: 'grid',
                placeItems: 'center',
                font: '400 30px var(--font-display)',
                color: '#0C7E41',
                marginBottom: '20px',
              }}
            >
              1
            </div>
            <h3
              style={{
                font: '500 20px var(--font-display)',
                color: 'var(--emerald)',
                margin: '0 0 9px',
              }}
            >
              Você cadastra
            </h3>
            <p
              style={{
                font: '400 15px/1.55 var(--font-ui)',
                color: 'var(--ink-70)',
                margin: '0',
                maxWidth: '280px',
              }}
            >
              Seus serviços, horários e equipe. Leva minutos, e a gente ajuda.
            </p>
          </div>
          <div
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--cream)',
                border: '1px solid var(--border-soft)',
                display: 'grid',
                placeItems: 'center',
                font: '400 30px var(--font-display)',
                color: '#0C7E41',
                marginBottom: '20px',
              }}
            >
              2
            </div>
            <h3
              style={{
                font: '500 20px var(--font-display)',
                color: 'var(--emerald)',
                margin: '0 0 9px',
              }}
            >
              O cliente agenda
            </h3>
            <p
              style={{
                font: '400 15px/1.55 var(--font-ui)',
                color: 'var(--ink-70)',
                margin: '0',
                maxWidth: '280px',
              }}
            >
              Sozinho, pelo app ou pela sua página. 24 horas por dia, sem você responder.
            </p>
          </div>
          <div
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--cream)',
                border: '1px solid var(--border-soft)',
                display: 'grid',
                placeItems: 'center',
                font: '400 30px var(--font-display)',
                color: '#0C7E41',
                marginBottom: '20px',
              }}
            >
              3
            </div>
            <h3
              style={{
                font: '500 20px var(--font-display)',
                color: 'var(--emerald)',
                margin: '0 0 9px',
              }}
            >
              Você fatura
            </h3>
            <p
              style={{
                font: '400 15px/1.55 var(--font-ui)',
                color: 'var(--ink-70)',
                margin: '0',
                maxWidth: '280px',
              }}
            >
              Recebe, cobra e fideliza. Tudo no mesmo lugar, do jeito que já devia ser.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
