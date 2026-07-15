export function Differentiators() {
  return (
    <section
      id="diferenciais"
      style={{
        scrollMarginTop: '60px',
        background: 'var(--emerald)',
        marginTop: '24px',
        padding: 'clamp(64px,8vw,96px) 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          left: '10%',
          width: '380px',
          height: '380px',
          background: 'radial-gradient(circle,rgba(47,211,122,.16),transparent 70%)',
          pointerEvents: 'none',
        }}
      ></div>
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          right: '6%',
          width: '440px',
          height: '440px',
          background: 'radial-gradient(circle,rgba(255,90,54,.1),transparent 70%)',
          pointerEvents: 'none',
        }}
      ></div>
      <div
        style={{
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '0 clamp(20px,5vw,40px)',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '640px', marginBottom: 'clamp(36px,5vw,56px)' }}>
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
            ></span>
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
              margin: 0,
            }}
          >
            O que os outros vendem à parte - ou{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--green)' }}>simplesmente não têm</span>
            .
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'clamp(56px,8vw,96px) 1fr',
              gap: 'clamp(16px,3vw,40px)',
              alignItems: 'baseline',
              padding: 'clamp(22px,3vw,30px) 0',
              borderTop: '1px solid rgba(143,191,164,.22)',
            }}
          >
            <div
              style={{
                font: '400 clamp(34px,5vw,58px)/1 var(--font-display)',
                color: 'var(--green)',
                letterSpacing: '-.02em',
              }}
            >
              01
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                gap: '8px 32px',
                alignItems: 'baseline',
              }}
            >
              <h3
                style={{
                  font: '500 clamp(20px,2.4vw,26px) var(--font-display)',
                  color: 'var(--on-emerald)',
                  margin: 0,
                }}
              >
                Não é marketplace
              </h3>
              <p
                style={{
                  font: '400 15.5px/1.6 var(--font-ui)',
                  color: 'var(--on-emerald-mut)',
                  margin: 0,
                }}
              >
                Sua página, sua marca, seus clientes. Ninguém vê a barbearia da esquina do lado da
                sua.
              </p>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'clamp(56px,8vw,96px) 1fr',
              gap: 'clamp(16px,3vw,40px)',
              alignItems: 'baseline',
              padding: 'clamp(22px,3vw,30px) 0',
              borderTop: '1px solid rgba(143,191,164,.22)',
            }}
          >
            <div
              style={{
                font: '400 clamp(34px,5vw,58px)/1 var(--font-display)',
                color: 'var(--green)',
                letterSpacing: '-.02em',
              }}
            >
              02
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                gap: '8px 32px',
                alignItems: 'baseline',
              }}
            >
              <h3
                style={{
                  font: '500 clamp(20px,2.4vw,26px) var(--font-display)',
                  color: 'var(--on-emerald)',
                  margin: 0,
                }}
              >
                Não depende do WhatsApp
              </h3>
              <p
                style={{
                  font: '400 15.5px/1.6 var(--font-ui)',
                  color: 'var(--on-emerald-mut)',
                  margin: 0,
                }}
              >
                Se a Meta cair lá fora, seu agendamento continua no ar. O WhatsApp é um extra, não a
                base.
              </p>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'clamp(56px,8vw,96px) 1fr',
              gap: 'clamp(16px,3vw,40px)',
              alignItems: 'baseline',
              padding: 'clamp(22px,3vw,30px) 0',
              borderTop: '1px solid rgba(143,191,164,.22)',
            }}
          >
            <div
              style={{
                font: '400 clamp(34px,5vw,58px)/1 var(--font-display)',
                color: 'var(--green)',
                letterSpacing: '-.02em',
              }}
            >
              03
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                gap: '8px 32px',
                alignItems: 'baseline',
              }}
            >
              <h3
                style={{
                  font: '500 clamp(20px,2.4vw,26px) var(--font-display)',
                  color: 'var(--on-emerald)',
                  margin: 0,
                }}
              >
                Tudo já vem junto
              </h3>
              <p
                style={{
                  font: '400 15.5px/1.6 var(--font-ui)',
                  color: 'var(--on-emerald-mut)',
                  margin: 0,
                }}
              >
                Fidelidade, assinatura e pagamento inclusos. Nada de módulo pago à parte pra
                desbloquear o básico.
              </p>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'clamp(56px,8vw,96px) 1fr',
              gap: 'clamp(16px,3vw,40px)',
              alignItems: 'baseline',
              padding: 'clamp(22px,3vw,30px) 0',
              borderTop: '1px solid rgba(143,191,164,.22)',
            }}
          >
            <div
              style={{
                font: '400 clamp(34px,5vw,58px)/1 var(--font-display)',
                color: 'var(--green)',
                letterSpacing: '-.02em',
              }}
            >
              04
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                gap: '8px 32px',
                alignItems: 'baseline',
              }}
            >
              <h3
                style={{
                  font: '500 clamp(20px,2.4vw,26px) var(--font-display)',
                  color: 'var(--on-emerald)',
                  margin: 0,
                }}
              >
                Sem cobrança por uso
              </h3>
              <p
                style={{
                  font: '400 15.5px/1.6 var(--font-ui)',
                  color: 'var(--on-emerald-mut)',
                  margin: 0,
                }}
              >
                Sua fatura é sempre o valor do plano. Sem taxa por mensagem, sem surpresa no fim do
                mês.
              </p>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'clamp(56px,8vw,96px) 1fr',
              gap: 'clamp(16px,3vw,40px)',
              alignItems: 'baseline',
              padding: 'clamp(22px,3vw,30px) 0',
              borderTop: '1px solid rgba(143,191,164,.22)',
              borderBottom: '1px solid rgba(143,191,164,.22)',
            }}
          >
            <div
              style={{
                font: '400 clamp(34px,5vw,58px)/1 var(--font-display)',
                color: 'var(--green)',
                letterSpacing: '-.02em',
              }}
            >
              05
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                gap: '8px 32px',
                alignItems: 'baseline',
              }}
            >
              <h3
                style={{
                  font: '500 clamp(20px,2.4vw,26px) var(--font-display)',
                  color: 'var(--on-emerald)',
                  margin: 0,
                }}
              >
                O fundador te responde
              </h3>
              <p
                style={{
                  font: '400 15.5px/1.6 var(--font-ui)',
                  color: 'var(--on-emerald-mut)',
                  margin: 0,
                }}
              >
                Suporte direto com quem faz o produto, no WhatsApp. Sem call center, sem número de
                protocolo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
