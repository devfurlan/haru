const FEATURES = [
  'Pontos automáticos a cada visita concluída',
  'Recompensas e descontos que você define',
  'Cliente sumido volta com convite automático',
  'Já incluso em todos os planos, sem custo extra',
];

const Check = ({ size = 18, w = '2.6' }: { size?: number; w?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#2FD37A"
    strokeWidth={w}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flex: 'none', marginTop: '2px' }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function Fidelidade() {
  return (
    <section
      id="fidelidade"
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
          {/* text */}
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
              />
              <span
                style={{
                  font: '700 11px var(--font-ui)',
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  color: '#0C7E41',
                }}
              >
                Pilar 05 · Fidelidade
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
              O cliente <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>volta</span>{' '}
              sozinho.
            </h2>
            <p
              style={{
                font: '400 16.5px/1.6 var(--font-ui)',
                color: 'var(--ink-70)',
                margin: '0 0 22px',
                maxWidth: '460px',
              }}
            >
              Pontos a cada visita, recompensas que fazem sentido e um empurrãozinho na hora certa.
              Roda no automático - o cliente volta sem você precisar cobrar.
            </p>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '440px' }}
            >
              {FEATURES.map((t) => (
                <div
                  key={t}
                  style={{
                    display: 'flex',
                    gap: '11px',
                    alignItems: 'flex-start',
                    padding: '7px 0',
                  }}
                >
                  <Check />
                  <span style={{ font: '400 15.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* loyalty cards */}
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
            {/* stamp card */}
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '15px',
                }}
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
                      <circle cx="12" cy="8" r="6" />
                      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                    </svg>
                  </span>
                  <div>
                    <div style={{ font: '500 16px var(--font-display)', color: 'var(--emerald)' }}>
                      Cartão fidelidade
                    </div>
                    <div style={{ font: '500 11.5px var(--font-ui)', color: 'var(--ink-50)' }}>
                      Studio Lâmina
                    </div>
                  </div>
                </div>
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
                  7 de 10
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '9px' }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <span
                    key={`f${i}`}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '50%',
                      background: 'var(--green)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Check size={15} w="3" />
                  </span>
                ))}
                {Array.from({ length: 3 }).map((_, i) => (
                  <span
                    key={`e${i}`}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '50%',
                      background: 'var(--cream)',
                      border: '1.5px dashed var(--border)',
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  marginTop: '14px',
                  font: '500 13px var(--font-ui)',
                  color: 'var(--ink-70)',
                }}
              >
                Faltam <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>3 cortes</span>{' '}
                pro próximo grátis
              </div>
            </div>
            {/* retention metric */}
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
                  Clientes que voltam
                </span>
                <span style={{ font: '600 18px var(--font-display)', color: 'var(--emerald)' }}>
                  68%
                </span>
              </div>
              <div
                style={{
                  marginTop: '13px',
                  height: '8px',
                  borderRadius: '999px',
                  background: 'var(--green-tint)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '68%',
                    height: '100%',
                    background: 'var(--green)',
                    borderRadius: '999px',
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: '9px',
                  font: '500 11.5px var(--font-ui)',
                  color: 'var(--ink-50)',
                }}
              >
                +12% desde que ativou a fidelidade
              </div>
            </div>
            {/* win-back strip */}
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
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 14 4 9l5-5" />
                  <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
                </svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 13.5px var(--font-ui)', color: 'var(--ink)' }}>
                  Cliente de volta
                </div>
                <div style={{ font: '500 11.5px var(--font-ui)', color: 'var(--ink-50)' }}>
                  Rafa · convite automático enviado
                </div>
              </div>
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
                reativado
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
