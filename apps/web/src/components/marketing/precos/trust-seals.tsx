const SEALS = [
  {
    title: 'Sem taxa de setup',
    desc: 'Pague a mensalidade e comece a usar.',
    icon: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />,
  },
  {
    title: 'Garantia de 30 dias',
    desc: 'Não gostou? Devolvemos o valor integral.',
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    title: 'Cancele quando quiser',
    desc: 'Sem multa, sem fidelidade.',
    icon: (
      <>
        <rect width="18" height="11" x="3" y="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </>
    ),
  },
  {
    title: 'Sem cobrança por uso',
    desc: 'Sua fatura é sempre o valor do plano.',
    icon: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2.5" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </>
    ),
  },
];

export function TrustSeals() {
  return (
    <section
      style={{
        // width:100% pra o grid auto-fit não colapsar (section é flex item do layout)
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '52px clamp(16px,4vw,40px) 24px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))',
          gap: '20px',
        }}
      >
        {SEALS.map((s) => (
          <div key={s.title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <span
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-icontile)',
                background: 'var(--green-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {s.icon}
              </svg>
            </span>
            <div>
              <div style={{ font: '600 15px var(--font-ui)', color: 'var(--ink)' }}>{s.title}</div>
              <div
                style={{
                  font: '400 13px/1.4 var(--font-ui)',
                  color: 'var(--ink-50)',
                  marginTop: '3px',
                }}
              >
                {s.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
