export function ForClient() {
  return (
    <section
      style={{
        background: '#cfe7d5',
        borderTop: '1px solid rgba(10,51,36,.1)',
        borderBottom: '1px solid rgba(10,51,36,.1)',
        padding: 'clamp(52px,7vw,84px) 0 clamp(56px,7vw,84px)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        <div
          style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto clamp(32px,4vw,46px)' }}
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
            ></span>
            <span
              style={{
                font: '700 11px var(--font-ui)',
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: '#0C7E41',
              }}
            >
              Pro seu cliente
            </span>
          </div>
          <h2
            style={{
              font: '400 clamp(28px,4.6vw,42px)/1.08 var(--font-display)',
              color: 'var(--emerald)',
              letterSpacing: '-.02em',
              margin: '0 auto 14px',
              maxWidth: '600px',
            }}
          >
            Ele escolhe onde marcar. Você não perde{' '}
            <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>nenhum</span>.
          </h2>
          <p
            style={{
              font: '400 17px/1.55 var(--font-ui)',
              color: 'var(--ink-70)',
              margin: '0 auto',
              maxWidth: '560px',
            }}
          >
            Ninguém fica preso a canal nenhum: quem gosta de app usa o app, quem veio do Instagram
            agenda pela web. O WhatsApp só avisa.
          </p>
        </div>

        {/* two real product mockups */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))',
            gap: '20px',
            marginBottom: '20px',
          }}
        >
          {/* CANAL 1 · APP */}
          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '24px',
              padding: 'clamp(22px,2.6vw,30px)',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                font: '700 10px var(--font-ui)',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: 'var(--ink-50)',
              }}
            >
              Canal 1 · App
            </span>
            <div
              style={{
                font: '500 21px var(--font-display)',
                color: 'var(--emerald)',
                margin: '7px 0 6px',
              }}
            >
              No app Demandaê
            </div>
            <p
              style={{
                font: '400 14.5px/1.55 var(--font-ui)',
                color: 'var(--ink-70)',
                margin: '0 0 20px',
                maxWidth: '360px',
              }}
            >
              Histórico, favoritos e remarcação num toque. Pro cliente que volta todo mês.
            </p>
            {/* phone: home do app (histórico, favoritos, remarcação) */}
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                background: 'radial-gradient(130% 92% at 50% 0,var(--green-tint),transparent 74%)',
                borderRadius: '20px 20px 0 0',
                padding: '36px 14px 0',
                height: 'clamp(380px,34vw,460px)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: 'min(340px,100%)',
                  background: '#0F1F18',
                  borderRadius: '46px 46px 0 0',
                  padding: '7px 7px 0',
                  boxShadow: 'var(--shadow-phone)',
                }}
              >
                <div
                  style={{
                    borderRadius: '39px 39px 0 0',
                    overflow: 'hidden',
                    background: 'var(--cream)',
                  }}
                >
                  {/* status bar */}
                  <div
                    style={{
                      background: 'var(--emerald)',
                      padding: '11px 18px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ font: '600 11px var(--font-ui)', color: 'var(--on-emerald)' }}>
                      9:41
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="17" height="12" viewBox="0 0 18 12" fill="#FAF5EA">
                        <rect x="0" y="8" width="3" height="4" rx="1" />
                        <rect x="5" y="5" width="3" height="7" rx="1" />
                        <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
                        <rect x="15" y="0" width="3" height="12" rx="1" />
                      </svg>
                      <svg
                        width="16"
                        height="12"
                        viewBox="0 0 24 20"
                        fill="none"
                        stroke="#FAF5EA"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      >
                        <path d="M2 7a15 15 0 0 1 20 0" />
                        <path d="M5.5 11a10 10 0 0 1 13 0" />
                        <path d="M9 15a5 5 0 0 1 6 0" />
                      </svg>
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
                  {/* header + próximo */}
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
                          'radial-gradient(160px 110px at 85% 0,rgba(47,211,122,.2),transparent),radial-gradient(150px 110px at 4% 80%,rgba(255,90,54,.12),transparent)',
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
                            font: '500 10.5px var(--font-ui)',
                            color: 'var(--on-emerald-mut)',
                          }}
                        >
                          Boa tarde,
                        </div>
                        <div
                          style={{
                            font: '600 17px/1 var(--font-display)',
                            color: 'var(--on-emerald)',
                            marginTop: '3px',
                          }}
                        >
                          Marina
                        </div>
                      </div>
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '10px',
                          background: 'rgba(255,253,248,.1)',
                          border: '1px solid rgba(143,191,164,.3)',
                          display: 'grid',
                          placeItems: 'center',
                          position: 'relative',
                        }}
                      >
                        <svg
                          width="15"
                          height="15"
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
                            top: '6px',
                            right: '7px',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--coral)',
                            border: '1.5px solid var(--emerald)',
                          }}
                        ></span>
                      </div>
                    </div>
                    <div style={{ position: 'relative', marginTop: '15px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '9px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--green)',
                            animation: 'dmd-pulse 2s infinite',
                          }}
                        ></span>
                        <span
                          style={{
                            font: '700 8.5px var(--font-ui)',
                            letterSpacing: '.12em',
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
                          borderRadius: '16px',
                          padding: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <span
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '10px',
                              background: 'rgba(47,211,122,.14)',
                              border: '1px solid rgba(47,211,122,.26)',
                              display: 'grid',
                              placeItems: 'center',
                              flex: 'none',
                              font: '500 15px var(--font-display)',
                              color: 'var(--green)',
                            }}
                          >
                            A
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ font: '600 13px var(--font-display)', color: '#FFFDF8' }}>
                              Corte + barba
                            </div>
                            <div
                              style={{
                                font: '500 9.5px var(--font-ui)',
                                color: 'var(--on-emerald-mut)',
                                marginTop: '1px',
                              }}
                            >
                              com Ana · Studio Aurora
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                font: '600 13px var(--font-display)',
                                color: 'var(--on-emerald)',
                                lineHeight: 1,
                              }}
                            >
                              15h30
                            </div>
                            <div
                              style={{
                                font: '500 8.5px var(--font-ui)',
                                color: 'var(--on-emerald-mut)',
                                marginTop: '2px',
                              }}
                            >
                              Qua, 9 jul
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            height: '1px',
                            background:
                              'repeating-linear-gradient(90deg,rgba(143,191,164,.4) 0 5px,transparent 5px 10px)',
                            margin: '10px 0',
                          }}
                        ></div>
                        <div style={{ display: 'flex', gap: '7px' }}>
                          <span
                            style={{
                              flex: 1,
                              textAlign: 'center',
                              background: 'var(--coral)',
                              color: '#fff',
                              font: '700 10.5px var(--font-ui)',
                              padding: '8px',
                              borderRadius: '10px',
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
                              font: '700 10.5px var(--font-ui)',
                              padding: '8px',
                              borderRadius: '10px',
                            }}
                          >
                            Remarcar
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* histórico */}
                  <div style={{ padding: '13px 14px 4px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '9px',
                      }}
                    >
                      <span
                        style={{
                          font: '700 8px var(--font-ui)',
                          letterSpacing: '.12em',
                          textTransform: 'uppercase',
                          color: 'var(--ink-50)',
                        }}
                      >
                        Seu histórico
                      </span>
                      <span style={{ font: '600 9.5px var(--font-ui)', color: 'var(--emerald)' }}>
                        Ver tudo
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        padding: '9px 10px',
                        background: 'var(--paper)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '13px',
                        marginBottom: '7px',
                      }}
                    >
                      <span
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '9px',
                          background: 'var(--green-tint)',
                          display: 'grid',
                          placeItems: 'center',
                          flex: 'none',
                          font: '500 13px var(--font-display)',
                          color: 'var(--emerald)',
                        }}
                      >
                        A
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{ font: '600 11.5px var(--font-display)', color: 'var(--ink)' }}
                        >
                          Corte + barba
                        </div>
                        <div style={{ font: '500 9px var(--font-ui)', color: 'var(--ink-50)' }}>
                          Studio Aurora · 12 jun
                        </div>
                      </div>
                      <span
                        style={{
                          font: '700 9px var(--font-ui)',
                          color: 'var(--emerald)',
                          background: 'var(--green-tint)',
                          border: '1px solid rgba(15,126,65,.2)',
                          borderRadius: '999px',
                          padding: '5px 9px',
                          flex: 'none',
                        }}
                      >
                        Repetir
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '9px',
                        padding: '9px 10px',
                        background: 'var(--paper)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '13px',
                      }}
                    >
                      <span
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '9px',
                          background: 'var(--green-tint)',
                          display: 'grid',
                          placeItems: 'center',
                          flex: 'none',
                          font: '500 13px var(--font-display)',
                          color: 'var(--emerald)',
                        }}
                      >
                        V
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{ font: '600 11.5px var(--font-display)', color: 'var(--ink)' }}
                        >
                          Sobrancelha
                        </div>
                        <div style={{ font: '500 9px var(--font-ui)', color: 'var(--ink-50)' }}>
                          Studio Vila · 28 mai
                        </div>
                      </div>
                      <span
                        style={{
                          font: '700 9px var(--font-ui)',
                          color: 'var(--emerald)',
                          background: 'var(--green-tint)',
                          border: '1px solid rgba(15,126,65,.2)',
                          borderRadius: '999px',
                          padding: '5px 9px',
                          flex: 'none',
                        }}
                      >
                        Repetir
                      </span>
                    </div>
                  </div>
                  {/* bottom nav */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-around',
                      alignItems: 'flex-start',
                      padding: '9px 4px 12px',
                      borderTop: '1px solid var(--border-soft)',
                      background: 'var(--paper)',
                      marginTop: '11px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="var(--emerald)"
                        stroke="var(--emerald)"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      >
                        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
                      </svg>
                      <span style={{ font: '600 8.5px var(--font-ui)', color: 'var(--emerald)' }}>
                        Início
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--ink-30)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                      </svg>
                      <span style={{ font: '600 8.5px var(--font-ui)', color: 'var(--ink-30)' }}>
                        Buscar
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--ink-30)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2.5" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span style={{ font: '600 8.5px var(--font-ui)', color: 'var(--ink-30)' }}>
                        Agenda
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--ink-30)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="8" r="3.6" />
                        <path d="M5 20c.8-3.9 3.4-6 7-6s6.2 2.1 7 6" />
                      </svg>
                      <span style={{ font: '600 8.5px var(--font-ui)', color: 'var(--ink-30)' }}>
                        Perfil
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CANAL 2 · WEB */}
          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '24px',
              padding: 'clamp(22px,2.6vw,30px)',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                font: '700 10px var(--font-ui)',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: 'var(--ink-50)',
              }}
            >
              Canal 2 · Web
            </span>
            <div
              style={{
                font: '500 21px var(--font-display)',
                color: 'var(--emerald)',
                margin: '7px 0 6px',
              }}
            >
              Na sua página pública
            </div>
            <p
              style={{
                font: '400 14.5px/1.55 var(--font-ui)',
                color: 'var(--ink-70)',
                margin: '0 0 12px',
                maxWidth: '380px',
              }}
            >
              Direto do navegador, sem baixar nada. O link que vai na bio do Instagram:
            </p>
            <span
              style={{
                display: 'inline-flex',
                alignSelf: 'flex-start',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--green-tint)',
                border: '1px solid rgba(15,126,65,.18)',
                borderRadius: '999px',
                padding: '7px 13px',
                marginBottom: '20px',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
              </svg>
              <span style={{ font: '600 12.5px var(--font-ui)', color: 'var(--emerald)' }}>
                demandae.com/seunegocio
              </span>
            </span>
            {/* browser: public booking page */}
            <div
              style={{
                marginTop: 'auto',
                background: 'var(--cream)',
                border: '1px solid var(--border-soft)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 30px 60px -38px rgba(10,51,36,.5)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '10px 12px',
                  background: '#f2ebda',
                  borderBottom: '1px solid var(--border-soft)',
                }}
              >
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: '#e08a7a',
                  }}
                ></span>
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: '#e6c15c',
                  }}
                ></span>
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: '#7bbf8f',
                  }}
                ></span>
                <div
                  style={{
                    flex: 1,
                    marginLeft: '6px',
                    background: 'var(--paper)',
                    border: '1px solid var(--border)',
                    borderRadius: '7px',
                    padding: '5px 10px',
                    font: '500 10.5px var(--font-ui)',
                    color: 'var(--ink-50)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--ink-30)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="4" y="11" width="16" height="9" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  demandae.com/seunegocio
                </div>
              </div>
              {/* cover */}
              <div
                style={{
                  position: 'relative',
                  background: 'var(--emerald)',
                  padding: '16px 15px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(180px 120px at 88% 0,rgba(47,211,122,.2),transparent),radial-gradient(160px 120px at 0 100%,rgba(255,90,54,.12),transparent)',
                  }}
                ></div>
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                  }}
                >
                  <span
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '13px',
                      background: 'rgba(47,211,122,.16)',
                      border: '1px solid rgba(47,211,122,.3)',
                      display: 'grid',
                      placeItems: 'center',
                      flex: 'none',
                      font: '500 18px var(--font-display)',
                      color: 'var(--green)',
                    }}
                  >
                    A
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        font: '600 16px var(--font-display)',
                        color: 'var(--on-emerald)',
                        lineHeight: 1.1,
                      }}
                    >
                      Studio Aurora
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        marginTop: '4px',
                        font: '500 10.5px var(--font-ui)',
                        color: 'var(--on-emerald-mut)',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: 'var(--green)',
                        }}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="var(--green)"
                          stroke="none"
                        >
                          <path d="m12 2 2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
                        </svg>
                        4,9
                      </span>
                      <span>Atendimento com hora marcada</span>
                    </div>
                  </div>
                  <span
                    style={{
                      flex: 'none',
                      background: 'var(--coral)',
                      color: '#fff',
                      font: '700 11px var(--font-ui)',
                      padding: '9px 13px',
                      borderRadius: '11px',
                    }}
                  >
                    Agendar
                  </span>
                </div>
              </div>
              {/* services */}
              <div style={{ padding: '13px 15px 15px' }}>
                <div
                  style={{
                    font: '700 9px var(--font-ui)',
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-50)',
                    marginBottom: '9px',
                  }}
                >
                  Serviços
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 0',
                    borderBottom: '1px solid var(--border-soft)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 13px var(--font-display)', color: 'var(--ink)' }}>
                      Corte + barba
                    </div>
                    <div style={{ font: '500 10px var(--font-ui)', color: 'var(--ink-50)' }}>
                      45 min
                    </div>
                  </div>
                  <div style={{ font: '600 13px var(--font-display)', color: 'var(--emerald)' }}>
                    R$ 70
                  </div>
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 13px var(--font-display)', color: 'var(--ink)' }}>
                      Corte
                    </div>
                    <div style={{ font: '500 10px var(--font-ui)', color: 'var(--ink-50)' }}>
                      30 min
                    </div>
                  </div>
                  <div style={{ font: '600 13px var(--font-display)', color: 'var(--emerald)' }}>
                    R$ 45
                  </div>
                </div>
                <div
                  style={{
                    font: '700 9px var(--font-ui)',
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-50)',
                    margin: '12px 0 9px',
                  }}
                >
                  Horários de hoje
                </div>
                <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      font: '600 11.5px var(--font-ui)',
                      color: 'var(--emerald)',
                      background: 'var(--green-tint)',
                      border: '1px solid rgba(15,126,65,.2)',
                      borderRadius: '999px',
                      padding: '6px 12px',
                    }}
                  >
                    09h00
                  </span>
                  <span
                    style={{
                      font: '600 11.5px var(--font-ui)',
                      color: 'var(--ink-70)',
                      background: 'var(--paper)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '999px',
                      padding: '6px 12px',
                    }}
                  >
                    10h30
                  </span>
                  <span
                    style={{
                      font: '600 11.5px var(--font-ui)',
                      color: 'var(--ink-70)',
                      background: 'var(--paper)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '999px',
                      padding: '6px 12px',
                    }}
                  >
                    14h00
                  </span>
                  <span
                    style={{
                      font: '600 11.5px var(--font-ui)',
                      color: 'var(--ink-70)',
                      background: 'var(--paper)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '999px',
                      padding: '6px 12px',
                    }}
                  >
                    16h30
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WHATSAPP: só o aviso */}
        <div
          style={{
            position: 'relative',
            background: 'var(--emerald)',
            borderRadius: '24px',
            padding: 'clamp(24px,3vw,38px)',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(258px,1fr))',
            gap: '24px 40px',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-70px',
              right: '6%',
              width: '320px',
              height: '320px',
              background: 'radial-gradient(circle,rgba(47,211,122,.13),transparent 70%)',
              pointerEvents: 'none',
            }}
          ></div>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                font: '700 10px var(--font-ui)',
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: 'var(--coral)',
              }}
            >
              Só o aviso · WhatsApp
            </span>
            <h3
              style={{
                font: '400 clamp(22px,2.9vw,30px)/1.12 var(--font-display)',
                color: 'var(--on-emerald)',
                letterSpacing: '-.01em',
                margin: '12px 0 12px',
              }}
            >
              Confirmação e lembrete
            </h3>
            <p
              style={{
                font: '400 15.5px/1.6 var(--font-ui)',
                color: 'var(--on-emerald-mut)',
                margin: 0,
                maxWidth: '400px',
              }}
            >
              Chegam sozinhos no WhatsApp do cliente. Ninguém precisa agendar por lá - e ninguém
              esquece o horário.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '18px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ font: '600 11px var(--font-ui)', color: 'var(--on-emerald-mut)' }}>
                Também por
              </span>
              <span
                style={{
                  font: '700 11px var(--font-ui)',
                  color: 'var(--green)',
                  background: 'rgba(47,211,122,.13)',
                  border: '1px solid rgba(47,211,122,.24)',
                  borderRadius: '999px',
                  padding: '4px 11px',
                }}
              >
                Email
              </span>
              <span
                style={{
                  font: '700 11px var(--font-ui)',
                  color: 'var(--green)',
                  background: 'rgba(47,211,122,.13)',
                  border: '1px solid rgba(47,211,122,.24)',
                  borderRadius: '999px',
                  padding: '4px 11px',
                }}
              >
                Push do app
              </span>
            </div>
          </div>
          {/* chat bubbles (notification only) */}
          <div
            style={{
              position: 'relative',
              background: 'var(--surface-emerald-card)',
              border: '1px solid rgba(143,191,164,.18)',
              borderRadius: '20px',
              padding: '16px',
              maxWidth: '380px',
              width: '100%',
              justifySelf: 'end',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '13px' }}
            >
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--green-tint)',
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none',
                }}
              >
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    border: '2px solid var(--emerald)',
                    position: 'relative',
                  }}
                ></span>
              </span>
              <span style={{ font: '600 12.5px var(--font-ui)', color: 'var(--on-emerald)' }}>
                Demanda<span style={{ color: 'var(--coral)' }}>ê</span>
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  font: '500 10px var(--font-ui)',
                  color: 'var(--on-emerald-faint)',
                }}
              >
                agora
              </span>
            </div>
            <div
              style={{
                background: 'rgba(250,245,234,.94)',
                borderRadius: '4px 15px 15px 15px',
                padding: '11px 13px',
                marginBottom: '9px',
                maxWidth: '92%',
              }}
            >
              <div style={{ font: '500 12.5px/1.5 var(--font-ui)', color: 'var(--ink)' }}>
                Oi Marina! Seu horário tá confirmado: <strong>qua, 9 jul às 15h30</strong>. Precisa
                mudar? É só remarcar no app.
              </div>
            </div>
            <div
              style={{
                background: 'rgba(250,245,234,.94)',
                borderRadius: '4px 15px 15px 15px',
                padding: '11px 13px',
                maxWidth: '92%',
              }}
            >
              <div style={{ font: '500 12.5px/1.5 var(--font-ui)', color: 'var(--ink)' }}>
                Lembrete: seu horário é hoje às 15h30. Até logo!
              </div>
              <div
                style={{ font: '500 9px var(--font-ui)', color: 'var(--ink-50)', marginTop: '5px' }}
              >
                enviado 2h antes, automático
              </div>
            </div>
          </div>
        </div>

        {/* closing: termina do mesmo jeito */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(30px,4vw,44px)' }}>
          <p
            style={{
              font: '400 italic clamp(18px,2.4vw,22px) var(--font-display)',
              color: 'var(--ink)',
              margin: '0 0 20px',
            }}
          >
            Seja qual for o caminho, termina do mesmo jeito:
          </p>
          <div
            style={{
              maxWidth: '440px',
              margin: '0 auto',
              background: 'var(--surface-emerald-card)',
              border: '1px solid rgba(47,211,122,.3)',
              borderRadius: '22px',
              padding: '20px 22px',
              boxShadow: 'var(--shadow-ondark)',
              textAlign: 'left',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '15px' }}
            >
              <span
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'var(--green)',
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none',
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#083020"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span
                style={{
                  font: '700 10px var(--font-ui)',
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  color: 'var(--green)',
                }}
              >
                Agendamento confirmado
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(47,211,122,.14)',
                  border: '1px solid rgba(47,211,122,.26)',
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none',
                  font: '500 16px var(--font-display)',
                  color: 'var(--green)',
                }}
              >
                A
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 15px var(--font-display)', color: '#FFFDF8' }}>
                  Sessão · 45 min
                </div>
                <div style={{ font: '500 11px var(--font-ui)', color: 'var(--on-emerald-mut)' }}>
                  com Ana · Studio Aurora
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    font: '600 15px var(--font-display)',
                    color: 'var(--on-emerald)',
                    lineHeight: 1.1,
                  }}
                >
                  15h30
                </div>
                <div
                  style={{
                    font: '500 10px var(--font-ui)',
                    color: 'var(--on-emerald-mut)',
                    marginTop: '2px',
                  }}
                >
                  Qua, 9 jul
                </div>
              </div>
            </div>
            <div
              style={{
                height: '1px',
                background:
                  'repeating-linear-gradient(90deg,rgba(143,191,164,.4) 0 5px,transparent 5px 10px)',
                margin: '14px 0',
              }}
            ></div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <span style={{ font: '500 11px var(--font-ui)', color: 'var(--on-emerald-mut)' }}>
                Confirmação e lembrete no WhatsApp
              </span>
              <span style={{ font: '600 15px var(--font-display)', color: 'var(--green)' }}>
                R$ 70
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
