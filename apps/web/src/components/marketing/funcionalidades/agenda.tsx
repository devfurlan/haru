export function Agenda() {
  return (
    <section
      id="agenda"
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
                Pilar 01 · Agenda
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
              Uma agenda que <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>aguenta</span>{' '}
              o seu dia.
            </h2>
            <p
              style={{
                font: '400 16.5px/1.6 var(--font-ui)',
                color: 'var(--ink-70)',
                margin: '0 0 22px',
                maxWidth: '460px',
              }}
            >
              Abre rápido entre um cliente e outro. Bloqueio, encaixe, agenda por profissional e
              fila de espera - sem tela branca, sem travar.
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
                  Agenda por profissional, lado a lado
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
                  Encaixe e bloqueio em dois toques
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
                  Fila de espera que preenche cancelamentos
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
                  Lembrete automático por e-mail, push e WhatsApp
                </span>
              </div>
            </div>
          </div>
          <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto' }}>
            <div
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--border-soft)',
                borderRadius: '22px',
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '15px 18px',
                  borderBottom: '1px solid var(--border-soft)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ font: '500 16px var(--font-display)', color: 'var(--ink)' }}>
                    Sáb, 5 jul
                  </span>
                  <span
                    style={{
                      font: '700 10px var(--font-ui)',
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      color: 'var(--emerald)',
                      background: 'var(--green-tint)',
                      borderRadius: '999px',
                      padding: '4px 9px',
                    }}
                  >
                    Hoje
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '9px',
                      border: '1px solid var(--border)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7c8a80"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 5l-7 7 7 7" />
                    </svg>
                  </span>
                  <span
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '9px',
                      border: '1px solid var(--border)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7c8a80"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 1fr',
                  borderBottom: '1px solid var(--border-soft)',
                }}
              >
                <div></div>
                <div
                  style={{
                    padding: '9px',
                    textAlign: 'center',
                    font: '600 12px var(--font-ui)',
                    color: 'var(--ink-70)',
                    borderLeft: '1px solid var(--border-soft)',
                  }}
                >
                  Téo
                </div>
                <div
                  style={{
                    padding: '9px',
                    textAlign: 'center',
                    font: '600 12px var(--font-ui)',
                    color: 'var(--ink-70)',
                    borderLeft: '1px solid var(--border-soft)',
                  }}
                >
                  Ana
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr' }}>
                <div
                  style={{
                    padding: '5px 6px 0',
                    textAlign: 'right',
                    font: '500 10px var(--font-ui)',
                    color: 'var(--ink-30)',
                    borderTop: '1px solid var(--border-soft)',
                  }}
                >
                  09
                </div>
                <div
                  style={{
                    minHeight: '56px',
                    borderTop: '1px solid var(--border-soft)',
                    borderLeft: '1px solid var(--border-soft)',
                    padding: '4px',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--green-tint)',
                      borderLeft: '3px solid var(--green)',
                      borderRadius: '8px',
                      padding: '6px 8px',
                    }}
                  >
                    <div style={{ font: '600 11.5px var(--font-ui)', color: 'var(--emerald)' }}>
                      Corte
                    </div>
                    <div style={{ font: '500 10px var(--font-ui)', color: '#5a8f72' }}>
                      João · 45min
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    minHeight: '56px',
                    borderTop: '1px solid var(--border-soft)',
                    borderLeft: '1px solid var(--border-soft)',
                    padding: '4px',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--emerald)',
                      borderRadius: '8px',
                      padding: '6px 8px',
                    }}
                  >
                    <div style={{ font: '600 11.5px var(--font-ui)', color: 'var(--on-emerald)' }}>
                      Escova
                    </div>
                    <div
                      style={{ font: '500 10px var(--font-ui)', color: 'var(--on-emerald-mut)' }}
                    >
                      Bia · 40min
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: '5px 6px 0',
                    textAlign: 'right',
                    font: '500 10px var(--font-ui)',
                    color: 'var(--ink-30)',
                    borderTop: '1px solid var(--border-soft)',
                  }}
                >
                  10
                </div>
                <div
                  style={{
                    minHeight: '56px',
                    borderTop: '1px solid var(--border-soft)',
                    borderLeft: '1px solid var(--border-soft)',
                    padding: '4px',
                  }}
                ></div>
                <div
                  style={{
                    minHeight: '56px',
                    borderTop: '1px solid var(--border-soft)',
                    borderLeft: '1px solid var(--border-soft)',
                    padding: '4px',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--green-tint)',
                      borderLeft: '3px solid var(--green)',
                      borderRadius: '8px',
                      padding: '6px 8px',
                    }}
                  >
                    <div style={{ font: '600 11.5px var(--font-ui)', color: 'var(--emerald)' }}>
                      Manicure
                    </div>
                    <div style={{ font: '500 10px var(--font-ui)', color: '#5a8f72' }}>
                      Lu · 50min
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: '5px 6px 0',
                    textAlign: 'right',
                    font: '500 10px var(--font-ui)',
                    color: 'var(--ink-30)',
                    borderTop: '1px solid var(--border-soft)',
                  }}
                >
                  11
                </div>
                <div
                  style={{
                    minHeight: '56px',
                    borderTop: '1px solid var(--border-soft)',
                    borderLeft: '1px solid var(--border-soft)',
                    padding: '4px',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--coral-tint)',
                      borderLeft: '3px solid var(--coral)',
                      borderRadius: '8px',
                      padding: '6px 8px',
                    }}
                  >
                    <div style={{ font: '600 11.5px var(--font-ui)', color: 'var(--ink)' }}>
                      Corte + barba
                    </div>
                    <div style={{ font: '500 10px var(--font-ui)', color: 'var(--coral)' }}>
                      Rafa · 1h10
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    minHeight: '56px',
                    borderTop: '1px solid var(--border-soft)',
                    borderLeft: '1px solid var(--border-soft)',
                    padding: '4px',
                  }}
                ></div>
                <div
                  style={{
                    padding: '5px 6px 0',
                    textAlign: 'right',
                    font: '500 10px var(--font-ui)',
                    color: 'var(--ink-30)',
                    borderTop: '1px solid var(--border-soft)',
                  }}
                >
                  12
                </div>
                <div
                  style={{
                    minHeight: '56px',
                    borderTop: '1px solid var(--border-soft)',
                    borderLeft: '1px solid var(--border-soft)',
                    padding: '4px',
                  }}
                >
                  <div
                    style={{
                      background: 'repeating-linear-gradient(45deg,#f2ebda 0 6px,#f7f1e3 6px 12px)',
                      borderRadius: '8px',
                      padding: '6px 8px',
                    }}
                  >
                    <div style={{ font: '600 11px var(--font-ui)', color: '#b9ad93' }}>Almoço</div>
                  </div>
                </div>
                <div
                  style={{
                    minHeight: '56px',
                    borderTop: '1px solid var(--border-soft)',
                    borderLeft: '1px solid var(--border-soft)',
                    padding: '4px',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--emerald)',
                      borderRadius: '8px',
                      padding: '6px 8px',
                    }}
                  >
                    <div style={{ font: '600 11.5px var(--font-ui)', color: 'var(--on-emerald)' }}>
                      Coloração
                    </div>
                    <div
                      style={{ font: '500 10px var(--font-ui)', color: 'var(--on-emerald-mut)' }}
                    >
                      Sara · 1h30
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
