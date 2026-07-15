export function Selos() {
  return (
    <section
      style={{
        // width:100% conserta o colapso do grid auto-fit (section é flex item do layout)
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(40px,5vw,60px) clamp(16px,4vw,40px) clamp(20px,3vw,32px)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
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
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
            </svg>
          </span>
          <div>
            <div style={{ font: '600 15px var(--font-ui)', color: 'var(--ink)' }}>
              Sem taxa de setup
            </div>
            <div
              style={{
                font: '400 13px/1.4 var(--font-ui)',
                color: 'var(--ink-50)',
                marginTop: '3px',
              }}
            >
              Pague a mensalidade e comece a usar.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <div>
            <div style={{ font: '600 15px var(--font-ui)', color: 'var(--ink)' }}>
              Garantia de 30 dias
            </div>
            <div
              style={{
                font: '400 13px/1.4 var(--font-ui)',
                color: 'var(--ink-50)',
                marginTop: '3px',
              }}
            >
              Não gostou? Devolvemos o valor integral.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
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
              <rect width="18" height="11" x="3" y="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
          </span>
          <div>
            <div style={{ font: '600 15px var(--font-ui)', color: 'var(--ink)' }}>
              Cancele quando quiser
            </div>
            <div
              style={{
                font: '400 13px/1.4 var(--font-ui)',
                color: 'var(--ink-50)',
                marginTop: '3px',
              }}
            >
              Sem multa, sem fidelidade.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
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
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <div>
            <div style={{ font: '600 15px var(--font-ui)', color: 'var(--ink)' }}>
              Migração inclusa
            </div>
            <div
              style={{
                font: '400 13px/1.4 var(--font-ui)',
                color: 'var(--ink-50)',
                marginTop: '3px',
              }}
            >
              Trazemos clientes, serviços e histórico.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
