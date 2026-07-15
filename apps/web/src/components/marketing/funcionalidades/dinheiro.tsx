export function Dinheiro() {
  return (
    <section
      id="dinheiro"
      style={{
        scrollMarginTop: '78px',
        background: 'var(--paper)',
        borderTop: '1px solid var(--border-soft)',
        borderBottom: '1px solid var(--border-soft)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: 'clamp(40px,6vw,72px) clamp(20px,5vw,40px)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
            gap: 'clamp(30px,5vw,64px)',
            alignItems: 'center',
          }}
        >
          <div>
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
              ></span>
              <span
                style={{
                  font: '700 11px var(--font-ui)',
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  color: '#0C7E41',
                }}
              >
                Pilar 03 · Dinheiro
              </span>
            </div>
            <h2
              style={{
                font: '400 clamp(26px,3.6vw,38px)/1.12 var(--font-display)',
                color: 'var(--emerald)',
                letterSpacing: '-.02em',
                margin: '0 0 14px',
                maxWidth: '460px',
              }}
            >
              Receita que entra mesmo com a{' '}
              <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>agenda vazia</span>.
            </h2>
            <p
              style={{
                font: '400 16.5px/1.6 var(--font-ui)',
                color: 'var(--ink-70)',
                margin: '0 0 22px',
                maxWidth: '460px',
              }}
            >
              Clube de assinatura, pacotes e pagamento online. Cobre antes, reduza o no-show e crie
              receita recorrente todo mês.
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                maxWidth: '440px',
              }}
            >
              <div
                style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', padding: '7px 0' }}
              >
                <svg
                  width="18"
                  height="18"
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
                <span style={{ font: '400 15.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
                  Clube de assinatura e pacotes de sessões
                </span>
              </div>
              <div
                style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', padding: '7px 0' }}
              >
                <svg
                  width="18"
                  height="18"
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
                <span style={{ font: '400 15.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
                  Pagamento online e PIX, antecipado
                </span>
              </div>
              <div
                style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', padding: '7px 0' }}
              >
                <svg
                  width="18"
                  height="18"
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
                <span style={{ font: '400 15.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
                  Menos no-show com cobrança na reserva
                </span>
              </div>
              <div
                style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', padding: '7px 0' }}
              >
                <svg
                  width="18"
                  height="18"
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
                <span style={{ font: '400 15.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
                  Comissão por profissional calculada sozinha
                </span>
              </div>
            </div>
          </div>
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--border-soft)',
                borderRadius: '18px',
                padding: '18px',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <span
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '13px',
                      background: 'var(--green-tint)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <svg
                      width="21"
                      height="21"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--emerald)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m17 2 4 4-4 4" />
                      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                      <path d="m7 22-4-4 4-4" />
                      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                    </svg>
                  </span>
                  <div>
                    <div style={{ font: '500 16px var(--font-display)', color: 'var(--emerald)' }}>
                      Clube de assinatura
                    </div>
                    <div style={{ font: '500 11.5px var(--font-ui)', color: 'var(--ink-50)' }}>
                      Corte Ilimitado
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    font: '600 20px var(--font-display)',
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  R$ 99
                  <span style={{ font: '500 12px var(--font-ui)', color: 'var(--ink-50)' }}>
                    /mês
                  </span>
                </div>
              </div>
              <div
                style={{ height: '1px', background: 'var(--border-soft)', margin: '14px 0' }}
              ></div>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span style={{ font: '500 12.5px var(--font-ui)', color: 'var(--ink-70)' }}>
                  42 assinantes ativos
                </span>
                <span
                  style={{
                    font: '700 10.5px var(--font-ui)',
                    letterSpacing: '.04em',
                    textTransform: 'uppercase',
                    color: 'var(--emerald)',
                    background: 'var(--green-tint)',
                    borderRadius: '999px',
                    padding: '5px 10px',
                  }}
                >
                  +8 este mês
                </span>
              </div>
            </div>
            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--border-soft)',
                borderRadius: '18px',
                padding: '18px',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
              >
                <span
                  style={{
                    font: '700 11px var(--font-ui)',
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-50)',
                  }}
                >
                  Receita recorrente
                </span>
                <span
                  style={{
                    font: '600 18px var(--font-display)',
                    color: 'var(--emerald)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  R$ 4.158
                  <span style={{ font: '500 11px var(--font-ui)', color: 'var(--ink-50)' }}>
                    /mês
                  </span>
                </span>
              </div>
              <div
                style={{
                  marginTop: '15px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '8px',
                  height: '64px',
                }}
              >
                <div
                  style={{
                    flex: '1',
                    height: '34px',
                    background: '#cdeadb',
                    borderRadius: '6px 6px 0 0',
                  }}
                ></div>
                <div
                  style={{
                    flex: '1',
                    height: '42px',
                    background: '#cdeadb',
                    borderRadius: '6px 6px 0 0',
                  }}
                ></div>
                <div
                  style={{
                    flex: '1',
                    height: '48px',
                    background: '#a9dcc1',
                    borderRadius: '6px 6px 0 0',
                  }}
                ></div>
                <div
                  style={{
                    flex: '1',
                    height: '54px',
                    background: '#a9dcc1',
                    borderRadius: '6px 6px 0 0',
                  }}
                ></div>
                <div
                  style={{
                    flex: '1',
                    height: '60px',
                    background: '#7fcea6',
                    borderRadius: '6px 6px 0 0',
                  }}
                ></div>
                <div
                  style={{
                    flex: '1',
                    height: '64px',
                    background: 'var(--green)',
                    borderRadius: '6px 6px 0 0',
                  }}
                ></div>
              </div>
            </div>
            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--border-soft)',
                borderRadius: '16px',
                padding: '13px 15px',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'var(--green)',
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--emerald)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div style={{ flex: '1', minWidth: '0' }}>
                <div style={{ font: '600 13.5px var(--font-ui)', color: 'var(--ink)' }}>
                  Pagamento confirmado
                </div>
                <div style={{ font: '500 11.5px var(--font-ui)', color: 'var(--ink-50)' }}>
                  PIX · Corte masculino
                </div>
              </div>
              <span style={{ font: '600 15px var(--font-display)', color: 'var(--emerald)' }}>
                R$ 45
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
