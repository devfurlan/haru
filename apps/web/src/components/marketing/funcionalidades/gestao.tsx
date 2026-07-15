export function Gestao() {
  return (
    <section id="gestao" style={{ scrollMarginTop: '78px' }}>
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
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              margin: '0 auto',
              borderRadius: '18px',
              overflow: 'hidden',
              border: '1px solid var(--border-soft)',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              background: 'var(--cream)',
            }}
          >
            <div
              style={{
                width: '60px',
                flex: 'none',
                background: 'var(--emerald)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '7px',
                padding: '14px 0',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'var(--green)',
                  display: 'grid',
                  placeItems: 'center',
                  font: '600 16px var(--font-display)',
                  color: 'var(--emerald)',
                }}
              >
                d
              </div>
              <div style={{ height: '6px' }}></div>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'var(--green)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--emerald)"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                  <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
                  <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
                  <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
                </svg>
              </div>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-emerald-mut)"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="16" rx="3" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
              </div>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-emerald-mut)"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c.7-3.8 3.4-6 7-6s6.3 2.2 7 6" />
                </svg>
              </div>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-emerald-mut)"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, padding: '16px 18px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
              >
                <span style={{ font: '500 17px var(--font-display)', color: 'var(--ink)' }}>
                  Início
                </span>
                <span style={{ font: '500 11.5px var(--font-ui)', color: 'var(--ink-50)' }}>
                  Sáb, 5 jul
                </span>
              </div>
              <div
                style={{
                  marginTop: '14px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '9px',
                }}
              >
                <div
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '12px',
                    padding: '11px 12px',
                  }}
                >
                  <div
                    style={{
                      font: '700 9px var(--font-ui)',
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-50)',
                    }}
                  >
                    Faturamento
                  </div>
                  <div
                    style={{
                      font: '600 18px var(--font-display)',
                      color: 'var(--ink)',
                      marginTop: '3px',
                    }}
                  >
                    R$ 3.240
                  </div>
                  <div style={{ font: '600 10px var(--font-ui)', color: '#0C7E41' }}>
                    +12% na semana
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '12px',
                    padding: '11px 12px',
                  }}
                >
                  <div
                    style={{
                      font: '700 9px var(--font-ui)',
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-50)',
                    }}
                  >
                    Agendamentos
                  </div>
                  <div
                    style={{
                      font: '600 18px var(--font-display)',
                      color: 'var(--ink)',
                      marginTop: '3px',
                    }}
                  >
                    128
                  </div>
                  <div style={{ font: '600 10px var(--font-ui)', color: 'var(--ink-50)' }}>
                    esta semana
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '12px',
                    padding: '11px 12px',
                  }}
                >
                  <div
                    style={{
                      font: '700 9px var(--font-ui)',
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-50)',
                    }}
                  >
                    Novos clientes
                  </div>
                  <div
                    style={{
                      font: '600 18px var(--font-display)',
                      color: 'var(--ink)',
                      marginTop: '3px',
                    }}
                  >
                    34
                  </div>
                  <div style={{ font: '600 10px var(--font-ui)', color: '#0C7E41' }}>+6 hoje</div>
                </div>
                <div
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '12px',
                    padding: '11px 12px',
                  }}
                >
                  <div
                    style={{
                      font: '700 9px var(--font-ui)',
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-50)',
                    }}
                  >
                    Ocupação
                  </div>
                  <div
                    style={{
                      font: '600 18px var(--font-display)',
                      color: 'var(--ink)',
                      marginTop: '3px',
                    }}
                  >
                    86%
                  </div>
                  <div style={{ font: '600 10px var(--font-ui)', color: 'var(--ink-50)' }}>
                    das cadeiras
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'var(--coral-tint)',
                  borderRadius: '12px',
                  padding: '10px 12px',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--coral)',
                    flex: 'none',
                  }}
                ></span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    font: '600 12px var(--font-ui)',
                    color: 'var(--ink)',
                  }}
                >
                  3 clientes querem falar com você
                </span>
                <span style={{ font: '700 11px var(--font-ui)', color: 'var(--coral)' }}>
                  abrir
                </span>
              </div>
            </div>
          </div>
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
                Pilar 04 · Gestão
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
              O negócio inteiro numa{' '}
              <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>tela só</span>.
            </h2>
            <p
              style={{
                font: '400 16.5px/1.6 var(--font-ui)',
                color: 'var(--ink-70)',
                margin: '0 0 22px',
                maxWidth: '460px',
              }}
            >
              Agenda, conversas, clientes, serviços e relatórios no mesmo painel. Você abre de manhã
              e entende o dia num relance - no computador ou no celular.
            </p>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '440px' }}
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
                  Painel único, no computador e no celular
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
                  Conversas e atendimento num lugar só
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
                  Base de clientes com histórico completo
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
                  Relatórios de faturamento e retenção
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
