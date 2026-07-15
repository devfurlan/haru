const CARDS = [
  {
    title: 'Agenda que não trava',
    desc: 'Rápida, leve, feita pra abrir no meio do corte. Sem tela branca, sem esperar carregar.',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2.5" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m8.5 16 2 2 4-4" />
      </>
    ),
  },
  {
    title: 'App do cliente com a sua marca',
    desc: 'Seu cliente agenda pelo app ou pela página web. Nada de marketplace com a barbearia da esquina do lado.',
    icon: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2.6" />
        <line x1="10" y1="18.5" x2="14" y2="18.5" />
      </>
    ),
  },
  {
    title: 'Programa de fidelidade',
    desc: 'Pontos, recompensas e retorno automático. Já incluso, em todos os planos.',
    icon: (
      <>
        <circle cx="12" cy="8" r="6" />
        <path d="M8.2 13.2 7 22l5-3 5 3-1.2-8.8" />
      </>
    ),
  },
  {
    title: 'Clube de assinatura',
    desc: 'Receita recorrente todo mês. Seu cliente assina o corte, você para de depender de agenda cheia.',
    icon: (
      <>
        <path d="m17 2 4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="m7 22-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </>
    ),
  },
  {
    title: 'Pagamentos online',
    desc: 'Cobre antes, reduza no-show. Tudo dentro da plataforma.',
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2.5" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </>
    ),
  },
  {
    title: 'Funciona mesmo se o WhatsApp cair',
    desc: 'Seu agendamento não depende da Meta. Se der problema lá fora, aqui continua rodando.',
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
];

export function WhatsIncluded() {
  return (
    <section
      id="recursos"
      style={{
        background: 'var(--emerald)',
        marginTop: '60px',
        padding: '88px 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          left: '12%',
          width: '360px',
          height: '360px',
          background: 'radial-gradient(circle,rgba(47,211,122,.16),transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          right: '8%',
          width: '420px',
          height: '420px',
          background: 'radial-gradient(circle,rgba(255,90,54,.1),transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '0 clamp(20px,5vw,40px)',
          position: 'relative',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '52px' }}>
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
                color: 'var(--green)',
              }}
            >
              O que vem junto
            </span>
          </div>
          <h2
            style={{
              font: '400 clamp(28px,5vw,42px)/1.1 var(--font-display)',
              color: 'var(--on-emerald)',
              letterSpacing: '-.02em',
              margin: '0 auto 14px',
              maxWidth: '720px',
            }}
          >
            Não é só agenda. É a{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--green)' }}>operação inteira</span>.
          </h2>
          <p
            style={{
              font: '400 17px/1.55 var(--font-ui)',
              color: 'var(--on-emerald-mut)',
              margin: '0 auto',
              maxWidth: '620px',
            }}
          >
            Recursos que outros sistemas vendem separado, cobram à parte ou simplesmente não têm.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
            gap: '20px',
          }}
        >
          {CARDS.map((c) => (
            <div
              key={c.title}
              style={{
                background: 'var(--surface-emerald-card)',
                border: '1px solid rgba(143,191,164,.16)',
                borderRadius: '22px',
                padding: '30px 28px',
              }}
            >
              <span
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: 'var(--radius-icontile)',
                  background: 'rgba(47,211,122,.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px',
                }}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2FD37A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {c.icon}
                </svg>
              </span>
              <div
                style={{
                  font: '500 20px var(--font-display)',
                  color: 'var(--on-emerald)',
                  marginBottom: '9px',
                  lineHeight: 1.2,
                }}
              >
                {c.title}
              </div>
              <div
                style={{ font: '400 14.5px/1.6 var(--font-ui)', color: 'var(--on-emerald-mut)' }}
              >
                {c.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
