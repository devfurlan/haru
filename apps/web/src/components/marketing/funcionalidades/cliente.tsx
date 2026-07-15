export function Cliente() {
  return (
    <section id="cliente" style={{ scrollMarginTop: '78px' }}>
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
              maxWidth: '460px',
              margin: '0 auto',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid var(--border-soft)',
              background: 'var(--cream)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '11px 14px',
                background: '#f2ebda',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              <span
                style={{
                  width: '11px',
                  height: '11px',
                  borderRadius: '50%',
                  background: '#e08a7a',
                }}
              ></span>
              <span
                style={{
                  width: '11px',
                  height: '11px',
                  borderRadius: '50%',
                  background: '#e6c15c',
                }}
              ></span>
              <span
                style={{
                  width: '11px',
                  height: '11px',
                  borderRadius: '50%',
                  background: '#7bbf8f',
                }}
              ></span>
              <div
                style={{
                  flex: '1',
                  marginLeft: '8px',
                  background: 'var(--paper)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '6px 11px',
                  font: '500 11.5px var(--font-ui)',
                  color: 'var(--ink-50)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ink-30)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="11" width="16" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                demanda.ee/studio-lamina
              </div>
            </div>
            <div>
              <div
                style={{
                  position: 'relative',
                  height: '132px',
                  background: 'linear-gradient(135deg,#e7c9a6,#c98f63)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: '0',
                    background: 'linear-gradient(180deg,transparent 38%,rgba(10,51,36,.58))',
                  }}
                ></div>
                <div style={{ position: 'absolute', left: '16px', right: '16px', bottom: '12px' }}>
                  <div
                    style={{
                      font: '600 21px var(--font-display)',
                      color: '#FFFDF8',
                      letterSpacing: '-.01em',
                    }}
                  >
                    Studio Lâmina
                  </div>
                  <div
                    style={{
                      font: '600 11.5px var(--font-ui)',
                      color: '#f0e6d4',
                      marginTop: '3px',
                    }}
                  >
                    ★ 4,9 · Barbearia · Rua Aurora, 210
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px 18px 18px' }}>
                <div style={{ font: '600 12.5px var(--font-ui)', color: 'var(--ink)' }}>
                  Escolha o serviço
                </div>
                <div
                  style={{
                    marginTop: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'var(--paper)',
                      border: '1.5px solid var(--emerald)',
                      borderRadius: '13px',
                      padding: '11px 13px',
                    }}
                  >
                    <div style={{ flex: '1' }}>
                      <div style={{ font: '600 14px var(--font-ui)', color: 'var(--ink)' }}>
                        Corte masculino
                      </div>
                      <div style={{ font: '500 11.5px var(--font-ui)', color: 'var(--ink-50)' }}>
                        45 min
                      </div>
                    </div>
                    <div
                      style={{
                        font: '600 15px var(--font-display)',
                        color: 'var(--emerald)',
                        marginRight: '4px',
                      }}
                    >
                      R$ 45
                    </div>
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'var(--emerald)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'var(--paper)',
                      border: '1px solid var(--border)',
                      borderRadius: '13px',
                      padding: '11px 13px',
                    }}
                  >
                    <div style={{ flex: '1' }}>
                      <div style={{ font: '600 14px var(--font-ui)', color: 'var(--ink)' }}>
                        Corte + barba
                      </div>
                      <div style={{ font: '500 11.5px var(--font-ui)', color: 'var(--ink-50)' }}>
                        1h10
                      </div>
                    </div>
                    <div
                      style={{
                        font: '600 15px var(--font-display)',
                        color: 'var(--emerald)',
                        marginRight: '4px',
                      }}
                    >
                      R$ 70
                    </div>
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        border: '2px solid var(--border)',
                      }}
                    ></span>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: '14px',
                    background: 'var(--coral)',
                    color: '#fff',
                    textAlign: 'center',
                    font: '700 14px var(--font-ui)',
                    padding: '13px',
                    borderRadius: '13px',
                  }}
                >
                  Agendar horário
                </div>
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
                Pilar 02 · Cliente
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
              O cliente marca sozinho, com a{' '}
              <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>sua</span> cara.
            </h2>
            <p
              style={{
                font: '400 16.5px/1.6 var(--font-ui)',
                color: 'var(--ink-70)',
                margin: '0 0 22px',
                maxWidth: '460px',
              }}
            >
              App e página web com a sua marca - não um marketplace com o concorrente do lado. Ele
              acha o horário, agenda em segundos e volta sozinho.
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
                  Página pública e app com a sua marca
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
                  Agendamento em segundos, 24 horas por dia
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
                  Favoritos e reagendamento em um toque
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
                  Fidelidade que traz o cliente de volta
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
