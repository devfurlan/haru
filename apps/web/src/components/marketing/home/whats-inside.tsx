export function WhatsInside() {
  return (
    <section
      style={{
        background: '#cfe7d5',
        borderTop: '1px solid rgba(10,51,36,.1)',
        borderBottom: '1px solid rgba(10,51,36,.1)',
        padding: 'clamp(56px,7vw,80px) 0',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        <div
          style={{ textAlign: 'center', maxWidth: '660px', margin: '0 auto clamp(30px,4vw,42px)' }}
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
              O que vem dentro
            </span>
          </div>
          <h2
            style={{
              font: '400 clamp(26px,4.4vw,38px)/1.12 var(--font-display)',
              color: 'var(--emerald)',
              letterSpacing: '-.02em',
              margin: '0 auto',
            }}
          >
            Tudo que a operação precisa,{' '}
            <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>nada</span> que atrapalha.
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(238px,1fr))',
            gap: '14px',
          }}
        >
          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '18px',
              padding: '20px 20px 22px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '14px',
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
                <rect x="5" y="2" width="14" height="20" rx="2.6" />
                <line x1="10" y1="18.5" x2="14" y2="18.5" />
              </svg>
            </span>
            <div
              style={{
                font: '500 16.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
              }}
            >
              App do seu cliente
            </div>
            <div style={{ font: '400 13.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
              Histórico, favoritos e "agendar de novo" num toque. iOS e Android.
            </div>
          </div>

          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '18px',
              padding: '20px 20px 22px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '14px',
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
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
              </svg>
            </span>
            <div
              style={{
                font: '500 16.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
              }}
            >
              Página pública do seu negócio
            </div>
            <div style={{ font: '400 13.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
              Com a sua marca, seus serviços e seus horários. Um link só pra divulgar:{' '}
              <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>
                demandae.com/seunegocio
              </span>
            </div>
          </div>

          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '18px',
              padding: '20px 20px 22px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '14px',
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
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
            </span>
            <div
              style={{
                font: '500 16.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
              }}
            >
              Painel completo
            </div>
            <div style={{ font: '400 13.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
              Dashboard do dia, agenda, cadastro de serviços e clientes.
            </div>
          </div>

          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '18px',
              padding: '20px 20px 22px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '14px',
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
                <path d="M8.2 13.2 7 22l5-3 5 3-1.2-8.8" />
              </svg>
            </span>
            <div
              style={{
                font: '500 16.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
              }}
            >
              Programa de fidelidade
            </div>
            <div style={{ font: '400 13.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
              Pontos e recompensas automáticos. Cliente volta sem você lembrar.
            </div>
          </div>

          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '18px',
              padding: '20px 20px 22px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'var(--green-tint)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: '14px',
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
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
            </span>
            <div
              style={{
                font: '500 16.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
              }}
            >
              Notificações em camadas
            </div>
            <div style={{ font: '400 13.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
              WhatsApp, email e push do app. A mensagem chega por onde o cliente tá.
            </div>
          </div>

          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '18px',
              padding: '20px 20px 22px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <span
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
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
                  <rect x="2" y="5" width="20" height="14" rx="2.5" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </span>
              <span
                style={{
                  font: '700 8.5px var(--font-ui)',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: 'var(--emerald)',
                  background: 'var(--green-tint)',
                  border: '1px solid rgba(15,126,65,.2)',
                  borderRadius: '999px',
                  padding: '3px 8px',
                }}
              >
                Time+
              </span>
            </div>
            <div
              style={{
                font: '500 16.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
              }}
            >
              Pagamento online
            </div>
            <div style={{ font: '400 13.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
              Pix e cartão na hora do agendamento. Menos furo, caixa antecipado.
            </div>
          </div>

          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '18px',
              padding: '20px 20px 22px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <span
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
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
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </span>
              <span
                style={{
                  font: '700 8.5px var(--font-ui)',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: 'var(--emerald)',
                  background: 'var(--green-tint)',
                  border: '1px solid rgba(15,126,65,.2)',
                  borderRadius: '999px',
                  padding: '3px 8px',
                }}
              >
                Time+
              </span>
            </div>
            <div
              style={{
                font: '500 16.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
              }}
            >
              Clube de assinatura
            </div>
            <div style={{ font: '400 13.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
              Receita recorrente todo mês. Seu cliente assina o serviço.
            </div>
          </div>

          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '18px',
              padding: '20px 20px 22px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <span
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
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
                  <path d="M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="3.2" />
                  <path d="M23 20v-2a4 4 0 0 0-3-3.8" />
                  <path d="M16 3.5a4 4 0 0 1 0 7" />
                </svg>
              </span>
              <span
                style={{
                  font: '700 8.5px var(--font-ui)',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: 'var(--emerald)',
                  background: 'var(--green-tint)',
                  border: '1px solid rgba(15,126,65,.2)',
                  borderRadius: '999px',
                  padding: '3px 8px',
                }}
              >
                Time+
              </span>
            </div>
            <div
              style={{
                font: '500 16.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
              }}
            >
              Vários profissionais
            </div>
            <div style={{ font: '400 13.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
              Cada um com sua agenda e seus serviços.
            </div>
          </div>

          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '18px',
              padding: '20px 20px 22px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <span
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
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
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <span
                style={{
                  font: '700 8.5px var(--font-ui)',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: 'var(--emerald)',
                  background: 'var(--green-tint)',
                  border: '1px solid rgba(15,126,65,.2)',
                  borderRadius: '999px',
                  padding: '3px 8px',
                }}
              >
                Time+
              </span>
            </div>
            <div
              style={{
                font: '500 16.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
              }}
            >
              Fila de espera
            </div>
            <div style={{ font: '400 13.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
              Vaga cancelada não fica vazia. O próximo é avisado sozinho.
            </div>
          </div>

          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border-soft)',
              borderRadius: '18px',
              padding: '20px 20px 22px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <span
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
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
                  <path d="M18 16.98h-5.99c-1.66 0-3.01-1.34-3.01-3s1.34-3 3.01-3H18" />
                  <path d="M6 8.02h6c1.66 0 3 1.34 3 3s-1.34 3-3 3H6" />
                  <circle cx="6" cy="8" r="2" />
                  <circle cx="18" cy="17" r="2" />
                </svg>
              </span>
              <span
                style={{
                  font: '700 8.5px var(--font-ui)',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: 'var(--emerald)',
                  background: 'var(--green-tint)',
                  border: '1px solid rgba(15,126,65,.2)',
                  borderRadius: '999px',
                  padding: '3px 8px',
                }}
              >
                Time+
              </span>
            </div>
            <div
              style={{
                font: '500 16.5px var(--font-display)',
                color: 'var(--emerald)',
                marginBottom: '7px',
              }}
            >
              Webhooks
            </div>
            <div style={{ font: '400 13.5px/1.5 var(--font-ui)', color: 'var(--ink-70)' }}>
              Discord, Slack, Zapier, n8n.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
