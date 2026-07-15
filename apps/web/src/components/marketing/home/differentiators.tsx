export function Differentiators() {
  return (
    <section
      id="diferenciais"
      style={{
        scrollMarginTop: '70px',
        background: 'var(--emerald)',
        padding: 'clamp(64px,8vw,100px) 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-90px',
          left: '8%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle,rgba(47,211,122,.16),transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-110px',
          right: '5%',
          width: '460px',
          height: '460px',
          background: 'radial-gradient(circle,rgba(255,90,54,.11),transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '0 clamp(20px,5vw,40px)',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '660px', marginBottom: 'clamp(36px,5vw,52px)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '9px',
              marginBottom: '16px',
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
                color: 'var(--green)',
              }}
            >
              Por que Demandaê
            </span>
          </div>
          <h2
            style={{
              font: '400 clamp(30px,5vw,46px)/1.08 var(--font-display)',
              color: 'var(--on-emerald)',
              letterSpacing: '-.02em',
              margin: '0 0 14px',
            }}
          >
            Feito por quem já{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--green)' }}>apanhou</span> de sistema
            ruim.
          </h2>
          <p
            style={{
              font: '400 17px/1.55 var(--font-ui)',
              color: 'var(--on-emerald-mut)',
              margin: 0,
              maxWidth: '520px',
            }}
          >
            Cada coisa aqui existe porque um sistema te deixou na mão antes.
          </p>
        </div>

        <div
          style={{
            background: 'var(--surface-emerald-card)',
            border: '1px solid rgba(47,211,122,.22)',
            borderRadius: '24px',
            padding: 'clamp(26px,3.4vw,38px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
            gap: '26px 40px',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  font: '700 10px var(--font-ui)',
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: 'var(--coral)',
                  background: 'var(--coral-tint)',
                  borderRadius: '999px',
                  padding: '6px 12px',
                }}
              >
                A dor nº 1
              </span>
            </div>
            <h3
              style={{
                font: '400 clamp(26px,3.4vw,36px)/1.1 var(--font-display)',
                color: 'var(--on-emerald)',
                letterSpacing: '-.01em',
                margin: '0 0 12px',
              }}
            >
              Não trava.
            </h3>
            <p
              style={{
                font: '400 16px/1.6 var(--font-ui)',
                color: 'var(--on-emerald-mut)',
                margin: 0,
                maxWidth: '420px',
              }}
            >
              Sistema leve, abre entre um atendimento e outro. Sem tela branca, sem espera, sem
              perder o cliente.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span
              style={{
                width: 'clamp(84px,10vw,112px)',
                height: 'clamp(84px,10vw,112px)',
                borderRadius: '26px',
                background: 'rgba(47,211,122,.14)',
                border: '1px solid rgba(47,211,122,.28)',
                display: 'grid',
                placeItems: 'center',
                flex: 'none',
              }}
            >
              <svg
                width="52"
                height="52"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--green)"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
              </svg>
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
            gap: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--surface-emerald-card)',
              border: '1px solid rgba(143,191,164,.16)',
              borderRadius: '20px',
              padding: '26px 24px',
            }}
          >
            <span
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-icontile)',
                background: 'rgba(47,211,122,.13)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <svg
                width="24"
                height="24"
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
            <div
              style={{
                font: '500 19px var(--font-display)',
                color: 'var(--on-emerald)',
                marginBottom: '8px',
                lineHeight: '1.2',
              }}
            >
              Sua marca, não a nossa vitrine
            </div>
            <div
              style={{
                font: '400 14.5px/1.6 var(--font-ui)',
                color: 'var(--on-emerald-mut)',
              }}
            >
              Não somos marketplace. Seu cliente vê você, não a concorrência do lado.
            </div>
          </div>
          <div
            style={{
              background: 'var(--surface-emerald-card)',
              border: '1px solid rgba(143,191,164,.16)',
              borderRadius: '20px',
              padding: '26px 24px',
            }}
          >
            <span
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-icontile)',
                background: 'rgba(47,211,122,.13)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2FD37A"
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
                font: '500 19px var(--font-display)',
                color: 'var(--on-emerald)',
                marginBottom: '8px',
                lineHeight: '1.2',
              }}
            >
              Funciona mesmo se o WhatsApp cair
            </div>
            <div
              style={{
                font: '400 14.5px/1.6 var(--font-ui)',
                color: 'var(--on-emerald-mut)',
              }}
            >
              Sua operação não depende da Meta. Se cair lá fora, aqui continua rodando.
            </div>
          </div>
          <div
            style={{
              background: 'var(--surface-emerald-card)',
              border: '1px solid rgba(143,191,164,.16)',
              borderRadius: '20px',
              padding: '26px 24px',
            }}
          >
            <span
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-icontile)',
                background: 'rgba(47,211,122,.13)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2FD37A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
                <path d="m3 12 9 4.5L21 12" />
                <path d="m3 16.5 9 4.5 9-4.5" />
              </svg>
            </span>
            <div
              style={{
                font: '500 19px var(--font-display)',
                color: 'var(--on-emerald)',
                marginBottom: '8px',
                lineHeight: '1.2',
              }}
            >
              Simples de verdade
            </div>
            <div
              style={{
                font: '400 14.5px/1.6 var(--font-ui)',
                color: 'var(--on-emerald-mut)',
              }}
            >
              Configura em minutos, não em semanas. Sem manual, sem consultoria.
            </div>
          </div>
          <div
            style={{
              background: 'var(--surface-emerald-card)',
              border: '1px solid rgba(143,191,164,.16)',
              borderRadius: '20px',
              padding: '26px 24px',
            }}
          >
            <span
              style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-icontile)',
                background: 'rgba(47,211,122,.13)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2FD37A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 17 0Z" />
              </svg>
            </span>
            <div
              style={{
                font: '500 19px var(--font-display)',
                color: 'var(--on-emerald)',
                marginBottom: '8px',
                lineHeight: '1.2',
              }}
            >
              O fundador responde
            </div>
            <div
              style={{
                font: '400 14.5px/1.6 var(--font-ui)',
                color: 'var(--on-emerald-mut)',
              }}
            >
              Suporte no WhatsApp. Não é chatbot, não é ticket, não é fila.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
