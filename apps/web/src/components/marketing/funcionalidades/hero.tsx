import { Btn } from '../home/btn';

export function Hero() {
  return (
    <section
      style={{
        // width:100% conserta o colapso do grid auto-fit (section é flex item do layout)
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(44px,6vw,72px) clamp(20px,5vw,40px) clamp(30px,4vw,48px)',
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
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              marginBottom: '18px',
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
              Funcionalidades
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
            Tudo que a sua agenda precisa.{' '}
            <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>Nada</span> que ela não precisa.
          </h1>
          <p
            style={{
              font: '400 18px/1.55 var(--font-ui)',
              color: 'var(--ink-70)',
              margin: '0 0 26px',
              maxWidth: '500px',
            }}
          >
            Do primeiro toque do cliente ao fechamento do caixa: agendamento, app com a sua marca,
            pagamento e gestão - no mesmo lugar, sem gambiarra.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '13px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
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
              gap: '9px',
              marginTop: '26px',
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '999px',
              padding: '8px 15px 8px 11px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--green)',
                animation: 'dmd-pulse 1.8s ease-in-out infinite',
              }}
            ></span>
            <span
              style={{
                font: '600 13px var(--font-ui)',
                color: 'var(--ink-70)',
              }}
            >
              Agendamentos ilimitados em todos os planos
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '300px',
                background: '#0F1F18',
                borderRadius: '42px',
                padding: '6px',
                boxShadow: '0 44px 90px -38px rgba(10,51,36,.6),0 10px 26px rgba(10,51,36,.16)',
              }}
            >
              <div
                style={{
                  borderRadius: '36px',
                  overflow: 'hidden',
                  background: 'var(--cream)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    background: 'var(--emerald)',
                    padding: '20px 18px 22px',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'radial-gradient(180px 130px at 85% 4%,rgba(47,211,122,.2),transparent),radial-gradient(160px 120px at 6% 60%,rgba(255,90,54,.12),transparent)',
                    }}
                  ></div>
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          font: '500 12px var(--font-ui)',
                          color: 'var(--on-emerald-mut)',
                        }}
                      >
                        Boa tarde,
                      </div>
                      <div
                        style={{
                          font: '600 21px/1 var(--font-display)',
                          color: 'var(--on-emerald)',
                          marginTop: '3px',
                        }}
                      >
                        Marina Alves
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '11px',
                          background: 'rgba(255,253,248,.1)',
                          border: '1px solid rgba(143,191,164,.3)',
                          display: 'grid',
                          placeItems: 'center',
                          position: 'relative',
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#FAF5EA"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
                          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                        </svg>
                        <span
                          style={{
                            position: 'absolute',
                            top: '7px',
                            right: '8px',
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: 'var(--coral)',
                            border: '2px solid var(--emerald)',
                          }}
                        ></span>
                      </div>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '11px',
                          background: 'var(--green)',
                          color: 'var(--emerald)',
                          display: 'grid',
                          placeItems: 'center',
                          font: '600 14px var(--font-display)',
                        }}
                      >
                        M
                      </div>
                    </div>
                  </div>
                  <div style={{ position: 'relative', marginTop: '18px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '10px',
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: 'var(--green)',
                          animation: 'dmd-pulse 2s infinite',
                        }}
                      ></span>
                      <span
                        style={{
                          font: '700 9.5px var(--font-ui)',
                          letterSpacing: '.13em',
                          textTransform: 'uppercase',
                          color: 'var(--green)',
                        }}
                      >
                        Próximo · em 2 dias
                      </span>
                    </div>
                    <div
                      style={{
                        background: 'var(--surface-emerald-card)',
                        border: '1px solid rgba(47,211,122,.3)',
                        borderRadius: '18px',
                        padding: '13px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '13px',
                            background: 'linear-gradient(135deg,#2FD37A,#1c9a5a)',
                            display: 'grid',
                            placeItems: 'center',
                            font: '600 18px var(--font-display)',
                            color: 'var(--emerald)',
                          }}
                        >
                          T
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              font: '600 14px var(--font-display)',
                              color: '#FFFDF8',
                            }}
                          >
                            Barbearia do Téo
                          </div>
                          <div
                            style={{
                              font: '500 11px var(--font-ui)',
                              color: 'var(--on-emerald-mut)',
                            }}
                          >
                            Corte · com Téo
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              font: '700 13px var(--font-ui)',
                              color: 'var(--on-emerald)',
                            }}
                          >
                            15h30
                          </div>
                          <div
                            style={{
                              font: '500 11px var(--font-ui)',
                              color: 'var(--on-emerald-mut)',
                            }}
                          >
                            Sáb
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          height: '1px',
                          background:
                            'repeating-linear-gradient(90deg,rgba(143,191,164,.4) 0 6px,transparent 6px 12px)',
                          margin: '12px 0',
                        }}
                      ></div>
                      <div style={{ display: 'flex', gap: '7px' }}>
                        <span
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            background: 'var(--coral)',
                            color: '#fff',
                            font: '700 12px var(--font-ui)',
                            padding: '9px',
                            borderRadius: '11px',
                          }}
                        >
                          Ver detalhes
                        </span>
                        <span
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            border: '1px solid rgba(250,245,234,.26)',
                            color: 'var(--on-emerald)',
                            font: '700 12px var(--font-ui)',
                            padding: '9px',
                            borderRadius: '11px',
                          }}
                        >
                          Remarcar
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: '15px 15px 0',
                    display: 'flex',
                    gap: '9px',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      background: 'var(--paper)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '15px',
                      padding: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'var(--green-tint)',
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
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                      </svg>
                    </div>
                    <div
                      style={{
                        font: '600 13px var(--font-ui)',
                        color: 'var(--ink)',
                        marginTop: '9px',
                      }}
                    >
                      Buscar perto
                    </div>
                    <div
                      style={{
                        font: '500 10.5px var(--font-ui)',
                        color: 'var(--ink-50)',
                      }}
                    >
                      barbearias, salões…
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      background: 'var(--paper)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '15px',
                      padding: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'var(--coral-tint)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--coral)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path
                          d="M12 20s-7-4.6-7-9.6A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7 3.4C19 15.4 12 20 12 20Z"
                          fill="var(--coral)"
                        />
                      </svg>
                    </div>
                    <div
                      style={{
                        font: '600 13px var(--font-ui)',
                        color: 'var(--ink)',
                        marginTop: '9px',
                      }}
                    >
                      Favoritos
                    </div>
                    <div
                      style={{
                        font: '500 10.5px var(--font-ui)',
                        color: 'var(--ink-50)',
                      }}
                    >
                      6 lugares
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: '15px 15px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      font: '600 15px var(--font-display)',
                      color: 'var(--ink)',
                    }}
                  >
                    Volte pra…
                  </span>
                  <span
                    style={{
                      font: '600 11.5px var(--font-ui)',
                      color: 'var(--coral)',
                    }}
                  >
                    ver tudo
                  </span>
                </div>
                <div
                  style={{
                    padding: '10px 0 20px 15px',
                    display: 'flex',
                    gap: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ flex: 'none', width: '132px' }}>
                    <div
                      style={{
                        height: '84px',
                        borderRadius: '15px',
                        background: 'linear-gradient(135deg,#e7c9a6,#c98f63)',
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '7px',
                          left: '7px',
                          background: 'var(--paper)',
                          borderRadius: '999px',
                          padding: '3px 7px',
                          font: '700 10px var(--font-ui)',
                          color: 'var(--emerald)',
                        }}
                      >
                        ★ 4,9
                      </span>
                    </div>
                    <div
                      style={{
                        font: '600 12.5px var(--font-ui)',
                        color: 'var(--ink)',
                        marginTop: '7px',
                      }}
                    >
                      Studio Lâmina
                    </div>
                    <div
                      style={{
                        font: '500 10.5px var(--font-ui)',
                        color: 'var(--ink-50)',
                      }}
                    >
                      Barbearia · 900 m
                    </div>
                  </div>
                  <div style={{ flex: 'none', width: '132px' }}>
                    <div
                      style={{
                        height: '84px',
                        borderRadius: '15px',
                        background: 'linear-gradient(135deg,#b9d8c4,#5a9c7a)',
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '7px',
                          left: '7px',
                          background: 'var(--paper)',
                          borderRadius: '999px',
                          padding: '3px 7px',
                          font: '700 10px var(--font-ui)',
                          color: 'var(--emerald)',
                        }}
                      >
                        ★ 4,8
                      </span>
                    </div>
                    <div
                      style={{
                        font: '600 12.5px var(--font-ui)',
                        color: 'var(--ink)',
                        marginTop: '7px',
                      }}
                    >
                      Bella Unhas
                    </div>
                    <div
                      style={{
                        font: '500 10.5px var(--font-ui)',
                        color: 'var(--ink-50)',
                      }}
                    >
                      Salão · 2,1 km
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                WebkitBackdropFilter: 'blur(6px)',
                backdropFilter: 'blur(6px)',
                left: '-24px',
                top: '372px',
                background: 'var(--paper)',
                border: '1px solid var(--border-soft)',
                borderRadius: '15px',
                padding: '11px 13px',
                boxShadow: '0 20px 40px -18px rgba(10,51,36,.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
              }}
            >
              <span
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '9px',
                  background: 'var(--green)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <svg
                  width="16"
                  height="16"
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
              <div>
                <div
                  style={{
                    font: '600 12px var(--font-ui)',
                    color: 'var(--ink)',
                  }}
                >
                  Agendado!
                </div>
                <div
                  style={{
                    font: '500 10.5px var(--font-ui)',
                    color: 'var(--ink-50)',
                  }}
                >
                  confirmação enviada
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
