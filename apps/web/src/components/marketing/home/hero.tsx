import { Btn } from './btn';

export function Hero() {
  return (
    <section
      style={{
        // width:100% é necessário: a section é flex item do layout (coluna flex) e,
        // com só max-width, sua largura resolve como indefinida - o que faz o
        // `repeat(auto-fit,minmax(330px,1fr))` colapsar pra 1 coluna. Largura definida
        // conserta o cálculo de tracks (2 colunas no desktop, 1 no mobile).
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(40px,6vw,72px) clamp(20px,5vw,40px) clamp(28px,3.5vw,44px)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))',
          gap: 'clamp(34px,5vw,60px)',
          alignItems: 'center',
        }}
      >
        {/* text */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '18px' }}>
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
              A operação inteira
            </span>
          </div>
          <h1
            style={{
              font: '400 clamp(32px,5.4vw,52px)/1.06 var(--font-display)',
              color: 'var(--emerald)',
              letterSpacing: '-.025em',
              margin: '0 0 18px',
              maxWidth: '560px',
            }}
          >
            Sua agenda, seus clientes, seu dinheiro. Num sistema{' '}
            <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>só</span>.
          </h1>
          <p
            style={{
              font: '400 18px/1.55 var(--font-ui)',
              color: 'var(--ink-70)',
              margin: '0 0 28px',
              maxWidth: '490px',
            }}
          >
            Agenda, app do cliente, pagamentos, fidelidade e clube de assinatura. Tudo junto,
            funcionando.
          </p>
          <div style={{ display: 'flex', gap: '13px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Btn variant="primary" size="lg" href="/signup">
              Começar agora
            </Btn>
            <Btn variant="secondary" size="lg" href="/precos">
              Ver planos
            </Btn>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '26px',
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '999px',
              padding: '9px 16px 9px 11px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                flex: 'none',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <span style={{ font: '600 13.5px var(--font-ui)', color: 'var(--ink-70)' }}>
              <strong style={{ color: 'var(--ink)' }}>Garantia de 30 dias.</strong> Não gostou,
              devolvemos tudo.
            </span>
          </div>
        </div>

        {/* composed product scene: dashboard panel behind, client phone in front */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '560px',
            margin: '0 auto',
            paddingTop: '18px',
          }}
        >
          {/* OWNER PANEL (dashboard: agenda do dia) — dono acompanha */}
          <div
            style={{
              position: 'absolute',
              top: '52px',
              right: 0,
              width: '66%',
              zIndex: 1,
              background: 'var(--cream)',
              border: '1px solid var(--border-soft)',
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow:
                '0 34px 60px -32px rgba(10,51,36,.34),0 10px 20px -10px rgba(10,51,36,.14)',
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
              />
              <span
                style={{
                  width: '11px',
                  height: '11px',
                  borderRadius: '50%',
                  background: '#e6c15c',
                }}
              />
              <span
                style={{
                  width: '11px',
                  height: '11px',
                  borderRadius: '50%',
                  background: '#7bbf8f',
                }}
              />
              <div
                style={{
                  flex: 1,
                  marginLeft: '8px',
                  background: 'var(--paper)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '6px 11px',
                  font: '500 11px var(--font-ui)',
                  color: 'var(--ink-50)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                }}
              >
                <svg
                  width="11"
                  height="11"
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
                painel.demanda.ee/agenda
              </div>
            </div>
            <div style={{ padding: '14px 16px 16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '10px',
                  marginBottom: '13px',
                }}
              >
                <div>
                  <div
                    style={{
                      font: '500 18px var(--font-display)',
                      color: 'var(--ink)',
                      lineHeight: 1,
                    }}
                  >
                    Agenda
                  </div>
                  <div
                    style={{
                      font: '500 10.5px var(--font-ui)',
                      color: 'var(--ink-50)',
                      marginTop: '4px',
                    }}
                  >
                    Quarta, 9 jul · hoje
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '999px',
                    padding: '2px',
                  }}
                >
                  <span
                    style={{
                      font: '700 9.5px var(--font-ui)',
                      color: '#fff',
                      background: 'var(--emerald)',
                      borderRadius: '999px',
                      padding: '5px 11px',
                    }}
                  >
                    Dia
                  </span>
                  <span
                    style={{
                      font: '700 9.5px var(--font-ui)',
                      color: 'var(--ink-50)',
                      padding: '5px 10px',
                    }}
                  >
                    Semana
                  </span>
                  <span
                    style={{
                      font: '700 9.5px var(--font-ui)',
                      color: 'var(--ink-50)',
                      padding: '5px 9px',
                    }}
                  >
                    Mês
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '12px',
                    padding: '9px 11px',
                  }}
                >
                  <div
                    style={{
                      font: '700 7.5px var(--font-ui)',
                      letterSpacing: '.07em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-50)',
                    }}
                  >
                    Hoje
                  </div>
                  <div
                    style={{
                      font: '600 17px var(--font-display)',
                      color: 'var(--ink)',
                      marginTop: '2px',
                    }}
                  >
                    24
                  </div>
                  <div style={{ font: '600 8.5px var(--font-ui)', color: 'var(--ink-50)' }}>
                    atendimentos
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '12px',
                    padding: '9px 11px',
                  }}
                >
                  <div
                    style={{
                      font: '700 7.5px var(--font-ui)',
                      letterSpacing: '.07em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-50)',
                    }}
                  >
                    Faturamento
                  </div>
                  <div
                    style={{
                      font: '600 17px var(--font-display)',
                      color: 'var(--ink)',
                      marginTop: '2px',
                    }}
                  >
                    R$ 3.240
                  </div>
                  <div style={{ font: '600 8.5px var(--font-ui)', color: '#0C7E41' }}>
                    +12% na semana
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '12px',
                    padding: '9px 11px',
                  }}
                >
                  <div
                    style={{
                      font: '700 7.5px var(--font-ui)',
                      letterSpacing: '.07em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-50)',
                    }}
                  >
                    Ocupação
                  </div>
                  <div
                    style={{
                      font: '600 17px var(--font-display)',
                      color: 'var(--ink)',
                      marginTop: '2px',
                    }}
                  >
                    86%
                  </div>
                  <div style={{ font: '600 8.5px var(--font-ui)', color: 'var(--ink-50)' }}>
                    da agenda
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr 1fr 1fr',
                  gridAutoRows: '33px',
                  gap: '5px',
                }}
              >
                <div style={{ gridColumn: 1, gridRow: 1 }} />
                <div
                  style={{
                    gridColumn: 2,
                    gridRow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'var(--green-tint)',
                      display: 'grid',
                      placeItems: 'center',
                      font: '700 8px var(--font-ui)',
                      color: 'var(--emerald)',
                    }}
                  >
                    A
                  </span>
                  <span style={{ font: '600 9.5px var(--font-ui)', color: 'var(--ink-70)' }}>
                    Ana
                  </span>
                </div>
                <div
                  style={{
                    gridColumn: 3,
                    gridRow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'var(--green-tint)',
                      display: 'grid',
                      placeItems: 'center',
                      font: '700 8px var(--font-ui)',
                      color: 'var(--emerald)',
                    }}
                  >
                    B
                  </span>
                  <span style={{ font: '600 9.5px var(--font-ui)', color: 'var(--ink-70)' }}>
                    Bruno
                  </span>
                </div>
                <div
                  style={{
                    gridColumn: 4,
                    gridRow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'var(--green-tint)',
                      display: 'grid',
                      placeItems: 'center',
                      font: '700 8px var(--font-ui)',
                      color: 'var(--emerald)',
                    }}
                  >
                    D
                  </span>
                  <span style={{ font: '600 9.5px var(--font-ui)', color: 'var(--ink-70)' }}>
                    Duda
                  </span>
                </div>
                <div
                  style={{
                    gridColumn: 1,
                    gridRow: 2,
                    font: '600 8px var(--font-ui)',
                    color: 'var(--ink-30)',
                    textAlign: 'right',
                    paddingTop: '2px',
                  }}
                >
                  09h
                </div>
                <div
                  style={{
                    gridColumn: 1,
                    gridRow: 3,
                    font: '600 8px var(--font-ui)',
                    color: 'var(--ink-30)',
                    textAlign: 'right',
                    paddingTop: '2px',
                  }}
                >
                  10h
                </div>
                <div
                  style={{
                    gridColumn: 1,
                    gridRow: 4,
                    font: '600 8px var(--font-ui)',
                    color: 'var(--ink-30)',
                    textAlign: 'right',
                    paddingTop: '2px',
                  }}
                >
                  11h
                </div>
                <div
                  style={{
                    gridColumn: 1,
                    gridRow: 5,
                    font: '600 8px var(--font-ui)',
                    color: 'var(--ink-30)',
                    textAlign: 'right',
                    paddingTop: '2px',
                  }}
                >
                  12h
                </div>
                <div
                  style={{
                    gridColumn: 2,
                    gridRow: '2/4',
                    background: 'var(--green-tint)',
                    border: '1px solid rgba(15,126,65,.16)',
                    borderRadius: '9px',
                    padding: '6px 8px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ font: '600 9.5px var(--font-ui)', color: 'var(--emerald)' }}>
                    Sessão
                  </div>
                  <div
                    style={{ font: '500 8.5px var(--font-ui)', color: '#0C7E41', marginTop: '1px' }}
                  >
                    Marina · 1h30
                  </div>
                </div>
                <div
                  style={{
                    gridColumn: 3,
                    gridRow: 2,
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '9px',
                    padding: '5px 8px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ font: '600 9px var(--font-ui)', color: 'var(--ink)' }}>Retorno</div>
                  <div style={{ font: '500 8px var(--font-ui)', color: 'var(--ink-50)' }}>João</div>
                </div>
                <div
                  style={{
                    gridColumn: 4,
                    gridRow: 2,
                    border: '1px dashed var(--border)',
                    borderRadius: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ font: '600 8px var(--font-ui)', color: 'var(--ink-30)' }}>
                    livre
                  </span>
                </div>
                <div
                  style={{
                    gridColumn: 4,
                    gridRow: 3,
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '9px',
                    padding: '5px 8px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ font: '600 9px var(--font-ui)', color: 'var(--ink)' }}>
                    Avaliação
                  </div>
                  <div style={{ font: '500 8px var(--font-ui)', color: 'var(--ink-50)' }}>Bia</div>
                </div>
                <div
                  style={{
                    gridColumn: 3,
                    gridRow: 4,
                    background: 'var(--coral-tint)',
                    border: '1px solid rgba(255,90,54,.3)',
                    borderRadius: '9px',
                    padding: '5px 8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--coral)',
                      flex: 'none',
                      animation: 'dmd-pulse 2s infinite',
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: '600 9px var(--font-ui)', color: 'var(--ink)' }}>
                      Atendimento
                    </div>
                    <div style={{ font: '500 8px var(--font-ui)', color: 'var(--coral)' }}>
                      Léo · agora
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    gridColumn: 4,
                    gridRow: '4/6',
                    background: 'var(--green-tint)',
                    border: '1px solid rgba(15,126,65,.16)',
                    borderRadius: '9px',
                    padding: '6px 8px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ font: '600 9.5px var(--font-ui)', color: 'var(--emerald)' }}>
                    Consulta
                  </div>
                  <div
                    style={{ font: '500 8.5px var(--font-ui)', color: '#0C7E41', marginTop: '1px' }}
                  >
                    Rafa · 1h
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CLIENT PHONE (front): tela de agendamento — cliente agenda */}
          <div
            style={{
              position: 'relative',
              width: '62%',
              minWidth: '248px',
              maxWidth: '274px',
              margin: '0 0 0 -4px',
              zIndex: 3,
              animation: 'dmd-floaty 6s ease-in-out infinite',
            }}
          >
            <div
              style={{
                background: '#0F1F18',
                borderRadius: '44px',
                padding: '8px',
                boxShadow:
                  '0 34px 62px -26px rgba(10,51,36,.4),0 14px 28px -16px rgba(10,51,36,.22)',
              }}
            >
              <div style={{ borderRadius: '36px', overflow: 'hidden', background: 'var(--cream)' }}>
                <div
                  style={{
                    background: 'var(--emerald)',
                    padding: '11px 18px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ font: '600 12px var(--font-ui)', color: 'var(--on-emerald)' }}>
                    9:41
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="17" height="12" viewBox="0 0 18 12" fill="#FAF5EA">
                      <rect x="0" y="8" width="3" height="4" rx="1" />
                      <rect x="5" y="5" width="3" height="7" rx="1" />
                      <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
                      <rect x="15" y="0" width="3" height="12" rx="1" />
                    </svg>
                    <span style={{ font: '700 9px var(--font-ui)', color: 'var(--on-emerald)' }}>
                      5G
                    </span>
                    <svg width="22" height="12" viewBox="0 0 26 13" fill="none">
                      <rect
                        x="1"
                        y="1"
                        width="21"
                        height="11"
                        rx="3"
                        stroke="#FAF5EA"
                        strokeOpacity=".5"
                      />
                      <rect x="3" y="3" width="15" height="7" rx="1.5" fill="#FAF5EA" />
                      <rect
                        x="23.5"
                        y="4.5"
                        width="2"
                        height="4"
                        rx="1"
                        fill="#FAF5EA"
                        opacity=".5"
                      />
                    </svg>
                  </div>
                </div>
                <div
                  style={{
                    position: 'relative',
                    background: 'var(--emerald)',
                    padding: '13px 15px 16px',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'radial-gradient(160px 110px at 85% 2%,rgba(47,211,122,.22),transparent),radial-gradient(150px 110px at 4% 80%,rgba(255,90,54,.13),transparent)',
                    }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <span
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '9px',
                        background: 'rgba(255,253,248,.1)',
                        border: '1px solid rgba(143,191,164,.3)',
                        display: 'grid',
                        placeItems: 'center',
                        flex: 'none',
                      }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#FAF5EA"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          font: '600 15px var(--font-display)',
                          color: 'var(--on-emerald)',
                          lineHeight: 1.1,
                        }}
                      >
                        Studio Aurora
                      </div>
                      <div
                        style={{
                          font: '600 9px var(--font-ui)',
                          letterSpacing: '.1em',
                          textTransform: 'uppercase',
                          color: 'var(--on-emerald-mut)',
                          marginTop: '3px',
                        }}
                      >
                        Passo 2 de 2 · Dia e horário
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      height: '5px',
                      borderRadius: '999px',
                      background: 'rgba(250,245,234,.18)',
                      marginTop: '14px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: '0 8% 0 0',
                        background: 'var(--green)',
                        borderRadius: '999px',
                      }}
                    />
                  </div>
                </div>
                <div style={{ padding: '14px 14px 4px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: 'var(--paper)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '14px',
                      padding: '11px 12px',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <span
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '11px',
                        background: 'var(--green-tint)',
                        display: 'grid',
                        placeItems: 'center',
                        flex: 'none',
                      }}
                    >
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--emerald)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 3v5a4 4 0 0 0 8 0V3" />
                        <path d="M6 3H4.7M14 3h1.3" />
                        <path d="M10 12v1.5a4.5 4.5 0 0 0 4.5 4.5 3 3 0 0 0 3-3v-1" />
                        <circle cx="18.5" cy="12" r="1.7" />
                      </svg>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '600 13px var(--font-display)', color: 'var(--ink)' }}>
                        Sessão
                      </div>
                      <div
                        style={{
                          font: '500 10px/1.4 var(--font-ui)',
                          color: 'var(--ink-50)',
                          marginTop: '2px',
                        }}
                      >
                        45 min · R$ 70 · com qualquer profissional
                      </div>
                    </div>
                    <span
                      style={{
                        font: '700 11px var(--font-ui)',
                        color: 'var(--emerald)',
                        flex: 'none',
                      }}
                    >
                      Editar
                    </span>
                  </div>
                  <div
                    style={{
                      font: '700 11px var(--font-ui)',
                      color: 'var(--ink)',
                      margin: '16px 0 9px',
                    }}
                  >
                    Dia
                  </div>
                  <div style={{ display: 'flex', gap: '7px' }}>
                    <div
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '13px',
                        padding: '9px 0',
                      }}
                    >
                      <div
                        style={{
                          font: '700 8.5px var(--font-ui)',
                          letterSpacing: '.06em',
                          color: 'var(--ink-50)',
                        }}
                      >
                        QUA
                      </div>
                      <div
                        style={{
                          font: '600 17px var(--font-display)',
                          color: 'var(--ink)',
                          marginTop: '2px',
                        }}
                      >
                        9
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        background: 'var(--emerald)',
                        border: '1px solid var(--emerald)',
                        borderRadius: '13px',
                        padding: '9px 0',
                      }}
                    >
                      <div
                        style={{
                          font: '700 8.5px var(--font-ui)',
                          letterSpacing: '.06em',
                          color: 'var(--on-emerald-mut)',
                        }}
                      >
                        QUI
                      </div>
                      <div
                        style={{
                          font: '600 17px var(--font-display)',
                          color: 'var(--on-emerald)',
                          marginTop: '2px',
                        }}
                      >
                        10
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '13px',
                        padding: '9px 0',
                      }}
                    >
                      <div
                        style={{
                          font: '700 8.5px var(--font-ui)',
                          letterSpacing: '.06em',
                          color: 'var(--ink-50)',
                        }}
                      >
                        SEX
                      </div>
                      <div
                        style={{
                          font: '600 17px var(--font-display)',
                          color: 'var(--ink)',
                          marginTop: '2px',
                        }}
                      >
                        11
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '13px',
                        padding: '9px 0',
                      }}
                    >
                      <div
                        style={{
                          font: '700 8.5px var(--font-ui)',
                          letterSpacing: '.06em',
                          color: 'var(--ink-50)',
                        }}
                      >
                        SÁB
                      </div>
                      <div
                        style={{
                          font: '600 17px var(--font-display)',
                          color: 'var(--ink)',
                          marginTop: '2px',
                        }}
                      >
                        12
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '13px',
                        padding: '9px 0',
                        opacity: 0.4,
                      }}
                    >
                      <div
                        style={{
                          font: '700 8.5px var(--font-ui)',
                          letterSpacing: '.06em',
                          color: 'var(--ink-50)',
                        }}
                      >
                        DOM
                      </div>
                      <div
                        style={{
                          font: '600 17px var(--font-display)',
                          color: 'var(--ink)',
                          marginTop: '2px',
                          textDecoration: 'line-through',
                        }}
                      >
                        13
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      font: '700 11px var(--font-ui)',
                      color: 'var(--ink)',
                      margin: '16px 0 9px',
                    }}
                  >
                    Horário
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '7px',
                    }}
                  >
                    <span
                      style={{
                        textAlign: 'center',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '11px',
                        padding: '10px 0',
                        font: '600 12px var(--font-ui)',
                        color: 'var(--ink-30)',
                        textDecoration: 'line-through',
                      }}
                    >
                      09h
                    </span>
                    <span
                      style={{
                        textAlign: 'center',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '11px',
                        padding: '10px 0',
                        font: '600 12px var(--font-ui)',
                        color: 'var(--ink-70)',
                      }}
                    >
                      09h30
                    </span>
                    <span
                      style={{
                        textAlign: 'center',
                        background: 'var(--emerald)',
                        border: '1px solid var(--emerald)',
                        borderRadius: '11px',
                        padding: '10px 0',
                        font: '600 12px var(--font-ui)',
                        color: '#fff',
                      }}
                    >
                      10h
                    </span>
                    <span
                      style={{
                        textAlign: 'center',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '11px',
                        padding: '10px 0',
                        font: '600 12px var(--font-ui)',
                        color: 'var(--ink-70)',
                      }}
                    >
                      10h30
                    </span>
                    <span
                      style={{
                        textAlign: 'center',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '11px',
                        padding: '10px 0',
                        font: '600 12px var(--font-ui)',
                        color: 'var(--ink-70)',
                      }}
                    >
                      11h
                    </span>
                    <span
                      style={{
                        textAlign: 'center',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '11px',
                        padding: '10px 0',
                        font: '600 12px var(--font-ui)',
                        color: 'var(--ink-70)',
                      }}
                    >
                      14h
                    </span>
                  </div>
                  <button
                    style={{
                      width: '100%',
                      marginTop: '16px',
                      background: 'var(--coral)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '13px 0',
                      font: '600 13.5px var(--font-ui)',
                      boxShadow: '0 12px 24px -12px rgba(255,90,54,.5)',
                      cursor: 'pointer',
                    }}
                  >
                    Confirmar · qui 10 às 10h
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '11px 0 7px' }}>
                    <span
                      style={{
                        width: '112px',
                        height: '5px',
                        borderRadius: '999px',
                        background: 'var(--ink)',
                        opacity: 0.28,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* WHATSAPP NOTIFICATION: o cliente recebe o aviso */}
          <div
            style={{
              position: 'absolute',
              top: '-14px',
              right: '-6px',
              width: 'min(272px,58%)',
              zIndex: 5,
              animation: 'dmd-floaty 6s ease-in-out infinite',
              animationDelay: '-3s',
            }}
          >
            <div
              style={{
                background: '#FFFDF8',
                border: '1px solid var(--border-soft)',
                borderRadius: '16px',
                padding: '12px 13px',
                boxShadow: '0 26px 54px -18px rgba(10,51,36,.55),0 6px 16px rgba(10,51,36,.12)',
                display: 'flex',
                gap: '11px',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'var(--green-tint)',
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
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 17 0Z" />
                </svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span style={{ font: '700 12.5px var(--font-ui)', color: 'var(--ink)' }}>
                    WhatsApp
                  </span>
                  <span style={{ font: '500 10px var(--font-ui)', color: 'var(--ink-50)' }}>
                    agora
                  </span>
                </div>
                <div
                  style={{
                    font: '500 12px/1.45 var(--font-ui)',
                    color: 'var(--ink-70)',
                    marginTop: '3px',
                  }}
                >
                  Agendamento confirmado{' '}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0C7E41"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ verticalAlign: '-1px' }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>{' '}
                  Sessão, qui 10 jul às 10h · Studio Aurora
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
