export function ForOwner() {
  return (
    <section
      style={{
        background: 'var(--paper)',
        borderTop: '1px solid var(--border-soft)',
        borderBottom: '1px solid var(--border-soft)',
        padding: 'clamp(56px,7vw,88px) 0',
      }}
    >
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        <div
          style={{
            textAlign: 'center',
            maxWidth: '700px',
            margin: '0 auto clamp(32px,4vw,44px)',
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
              Pro dono
            </span>
          </div>
          <h2
            style={{
              font: '400 clamp(28px,4.6vw,42px)/1.08 var(--font-display)',
              color: 'var(--emerald)',
              letterSpacing: '-.02em',
              margin: '0 auto 14px',
              maxWidth: '620px',
            }}
          >
            Agendou em qualquer canal, entra tudo{' '}
            <span style={{ fontStyle: 'italic', color: 'rgb(12, 126, 65)' }}>aqui</span>.
          </h2>
          <p
            style={{
              font: '400 17px/1.55 var(--font-ui)',
              color: 'var(--ink-70)',
              margin: '0 auto',
              maxWidth: '560px',
            }}
          >
            Um painel só pra ver o dia, cadastrar serviços, cuidar da equipe e receber. Sem
            planilha, sem caderninho, sem "me manda um zap".
          </p>
        </div>

        {/* THE daily panel */}
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            background: 'var(--cream)',
            border: '1px solid var(--border-soft)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 54px 104px -46px rgba(10,51,36,.6),0 14px 32px rgba(10,51,36,.11)',
          }}
        >
          {/* window bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: '#f2ebda',
              borderBottom: '1px solid var(--border-soft)',
            }}
          >
            <span
              style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#e08a7a' }}
            />
            <span
              style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#e6c15c' }}
            />
            <span
              style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#7bbf8f' }}
            />
            <div
              style={{
                flex: '1',
                maxWidth: '320px',
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
              painel.demandae.com
            </div>
          </div>
          {/* rail + main */}
          <div style={{ display: 'flex' }}>
            {/* icon rail */}
            <div
              style={{
                width: '60px',
                flex: 'none',
                background: 'var(--emerald)',
                padding: '16px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '9px',
                  background: 'var(--coral)',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span style={{ font: '600 15px var(--font-display)', color: '#fff' }}>D</span>
              </span>
              <span
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: 'rgba(47,211,122,.16)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2.5" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <span
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-emerald-faint)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M3 20c.6-3 2.8-4.6 6-4.6s5.4 1.6 6 4.6" />
                  <circle cx="17.5" cy="9" r="2.4" />
                </svg>
              </span>
              <span
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-emerald-faint)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2.5" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </span>
              <span
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-emerald-faint)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
                </svg>
              </span>
            </div>
            {/* main */}
            <div style={{ flex: '1', minWidth: '0', padding: 'clamp(16px,2.4vw,26px)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <div
                    style={{
                      font: '500 clamp(20px,2.4vw,26px) var(--font-display)',
                      color: 'var(--ink)',
                      lineHeight: '1.02',
                    }}
                  >
                    Hoje, quarta
                  </div>
                  <div
                    style={{
                      font: '500 12.5px var(--font-ui)',
                      color: 'var(--ink-50)',
                      marginTop: '5px',
                    }}
                  >
                    9 de julho · 8 agendamentos
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      display: 'flex',
                      background: 'var(--paper)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '999px',
                      padding: '3px',
                    }}
                  >
                    <span
                      style={{
                        font: '700 10.5px var(--font-ui)',
                        color: '#fff',
                        background: 'var(--emerald)',
                        borderRadius: '999px',
                        padding: '6px 13px',
                      }}
                    >
                      Dia
                    </span>
                    <span
                      style={{
                        font: '700 10.5px var(--font-ui)',
                        color: 'var(--ink-50)',
                        padding: '6px 12px',
                      }}
                    >
                      Semana
                    </span>
                    <span
                      style={{
                        font: '700 10.5px var(--font-ui)',
                        color: 'var(--ink-50)',
                        padding: '6px 11px',
                      }}
                    >
                      Mês
                    </span>
                  </div>
                  <span
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: 'var(--green-tint)',
                      display: 'grid',
                      placeItems: 'center',
                      flex: 'none',
                      font: '600 13px var(--font-display)',
                      color: 'var(--emerald)',
                    }}
                  >
                    V
                  </span>
                </div>
              </div>
              {/* stat cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3,1fr)',
                  gap: '10px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '14px',
                    padding: '13px 15px',
                  }}
                >
                  <div
                    style={{
                      font: '700 8.5px var(--font-ui)',
                      letterSpacing: '.09em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-50)',
                    }}
                  >
                    Faturamento hoje
                  </div>
                  <div
                    style={{
                      font: '600 clamp(20px,2.4vw,26px) var(--font-display)',
                      color: 'var(--ink)',
                      marginTop: '4px',
                    }}
                  >
                    R$ 560
                  </div>
                  <div
                    style={{ font: '600 10px var(--font-ui)', color: '#0C7E41', marginTop: '2px' }}
                  >
                    recebido no app
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '14px',
                    padding: '13px 15px',
                  }}
                >
                  <div
                    style={{
                      font: '700 8.5px var(--font-ui)',
                      letterSpacing: '.09em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-50)',
                    }}
                  >
                    Confirmados
                  </div>
                  <div
                    style={{
                      font: '600 clamp(20px,2.4vw,26px) var(--font-display)',
                      color: 'var(--ink)',
                      marginTop: '4px',
                    }}
                  >
                    7 de 8
                  </div>
                  <div
                    style={{
                      font: '600 10px var(--font-ui)',
                      color: 'var(--ink-50)',
                      marginTop: '2px',
                    }}
                  >
                    1 aguardando
                  </div>
                </div>
                <div
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '14px',
                    padding: '13px 15px',
                  }}
                >
                  <div
                    style={{
                      font: '700 8.5px var(--font-ui)',
                      letterSpacing: '.09em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-50)',
                    }}
                  >
                    Próximo livre
                  </div>
                  <div
                    style={{
                      font: '600 clamp(20px,2.4vw,26px) var(--font-display)',
                      color: 'var(--ink)',
                      marginTop: '4px',
                    }}
                  >
                    14h30
                  </div>
                  <div
                    style={{
                      font: '600 10px var(--font-ui)',
                      color: 'var(--ink-50)',
                      marginTop: '2px',
                    }}
                  >
                    encaixe possível
                  </div>
                </div>
              </div>
              {/* agenda list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '13px',
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '14px',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      font: '600 14px var(--font-display)',
                      color: 'var(--emerald)',
                      width: '44px',
                      flex: 'none',
                    }}
                  >
                    9h00
                  </div>
                  <span
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: 'var(--green-tint)',
                      display: 'grid',
                      placeItems: 'center',
                      flex: 'none',
                      font: '600 13px var(--font-display)',
                      color: 'var(--emerald)',
                    }}
                  >
                    M
                  </span>
                  <div style={{ flex: '1', minWidth: '0' }}>
                    <div style={{ font: '600 14px var(--font-display)', color: 'var(--ink)' }}>
                      Marcos A.
                    </div>
                    <div style={{ font: '500 11.5px var(--font-ui)', color: 'var(--ink-50)' }}>
                      Corte + barba
                    </div>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      font: '700 10px var(--font-ui)',
                      color: 'var(--emerald)',
                      background: 'var(--green-tint)',
                      borderRadius: '999px',
                      padding: '5px 10px',
                      flex: 'none',
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--emerald)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Confirmado
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '13px',
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '14px',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      font: '600 14px var(--font-display)',
                      color: 'var(--emerald)',
                      width: '44px',
                      flex: 'none',
                    }}
                  >
                    10h00
                  </div>
                  <span
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: 'var(--green-tint)',
                      display: 'grid',
                      placeItems: 'center',
                      flex: 'none',
                      font: '600 13px var(--font-display)',
                      color: 'var(--emerald)',
                    }}
                  >
                    R
                  </span>
                  <div style={{ flex: '1', minWidth: '0' }}>
                    <div style={{ font: '600 14px var(--font-display)', color: 'var(--ink)' }}>
                      Renata C.
                    </div>
                    <div style={{ font: '500 11.5px var(--font-ui)', color: 'var(--ink-50)' }}>
                      Sobrancelha
                    </div>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      font: '700 10px var(--font-ui)',
                      color: 'var(--emerald)',
                      background: 'var(--green-tint)',
                      borderRadius: '999px',
                      padding: '5px 10px',
                      flex: 'none',
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--emerald)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Confirmado
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '13px',
                    background: 'var(--paper)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '14px',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      font: '600 14px var(--font-display)',
                      color: 'var(--emerald)',
                      width: '44px',
                      flex: 'none',
                    }}
                  >
                    11h30
                  </div>
                  <span
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: 'var(--green-tint)',
                      display: 'grid',
                      placeItems: 'center',
                      flex: 'none',
                      font: '600 13px var(--font-display)',
                      color: 'var(--emerald)',
                    }}
                  >
                    J
                  </span>
                  <div style={{ flex: '1', minWidth: '0' }}>
                    <div style={{ font: '600 14px var(--font-display)', color: 'var(--ink)' }}>
                      João P.
                    </div>
                    <div style={{ font: '500 11.5px var(--font-ui)', color: 'var(--ink-50)' }}>
                      Corte
                    </div>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      font: '700 10px var(--font-ui)',
                      color: 'var(--ink-70)',
                      background: 'var(--cream)',
                      border: '1px solid var(--border)',
                      borderRadius: '999px',
                      padding: '5px 10px',
                      flex: 'none',
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--ink-50)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
                      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                    </svg>
                    Lembrete às 9h30
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '13px',
                    border: '1px dashed var(--border)',
                    borderRadius: '14px',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      font: '600 14px var(--font-display)',
                      color: 'var(--ink-30)',
                      width: '44px',
                      flex: 'none',
                    }}
                  >
                    14h30
                  </div>
                  <div
                    style={{
                      flex: '1',
                      minWidth: '0',
                      font: '500 12.5px var(--font-ui)',
                      color: 'var(--ink-50)',
                    }}
                  >
                    Horário livre
                  </div>
                  <span
                    style={{
                      font: '700 10.5px var(--font-ui)',
                      color: 'var(--emerald)',
                      flex: 'none',
                    }}
                  >
                    + Encaixar
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 supporting blocks */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
            gap: '16px',
            marginTop: 'clamp(28px,3.5vw,40px)',
          }}
        >
          <div
            style={{
              background: 'var(--cream)',
              border: '1px solid var(--border-soft)',
              borderRadius: '20px',
              padding: '24px',
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
                marginBottom: '15px',
              }}
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2.5" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="m9 15 2 2 4-4" />
              </svg>
            </span>
            <div
              style={{
                font: '500 18.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '8px',
                lineHeight: '1.2',
              }}
            >
              Agenda inteligente
            </div>
            <div style={{ font: '400 14px/1.55 var(--font-ui)', color: 'var(--ink-70)' }}>
              Respeita seu expediente e evita dois no mesmo horário. E marca horário fixo - semanal,
              quinzenal ou mensal - de uma vez.
            </div>
          </div>
          <div
            style={{
              background: 'var(--cream)',
              border: '1px solid var(--border-soft)',
              borderRadius: '20px',
              padding: '24px',
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
                marginBottom: '15px',
              }}
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
            </span>
            <div
              style={{
                font: '500 18.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '8px',
                lineHeight: '1.2',
              }}
            >
              Confirmação e lembrete automáticos
            </div>
            <div style={{ font: '400 14px/1.55 var(--font-ui)', color: 'var(--ink-70)' }}>
              Já no plano base. O cliente é avisado sem você digitar nada.
            </div>
          </div>
          <div
            style={{
              background: 'var(--cream)',
              border: '1px solid var(--border-soft)',
              borderRadius: '20px',
              padding: '24px',
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
                marginBottom: '15px',
              }}
            >
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 7h-9M14 17H5" />
                <circle cx="17" cy="17" r="3" />
                <circle cx="7" cy="7" r="3" />
              </svg>
            </span>
            <div
              style={{
                font: '500 18.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '8px',
                lineHeight: '1.2',
              }}
            >
              Serviços, equipe e pagamentos
            </div>
            <div style={{ font: '400 14px/1.55 var(--font-ui)', color: 'var(--ink-70)' }}>
              Cadastra uma vez e pronto: preços, profissionais e recebimento no mesmo lugar.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
