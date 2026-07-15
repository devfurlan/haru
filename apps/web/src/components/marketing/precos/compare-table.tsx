import type { CSSProperties } from 'react';

// Tabela de comparação. Só as linhas "Profissionais" e "Lembretes por WhatsApp/mês" são
// dinâmicas (vêm do BD via props); o resto é copy/feature-flags da vitrine.

type Cell = 'c' | 'd' | string; // 'c' = check, 'd' = dash, senão texto

const Check = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#2FD37A"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const Dash = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#c9bfa8"
    strokeWidth="2.4"
    strokeLinecap="round"
  >
    <line x1="6" y1="12" x2="18" y2="12" />
  </svg>
);

const cellBox: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '14px 8px',
  borderTop: '1px solid var(--border-soft)',
};

function CellView({ v }: { v: Cell }) {
  if (v === 'c')
    return (
      <div style={cellBox}>
        <Check />
      </div>
    );
  if (v === 'd')
    return (
      <div style={cellBox}>
        <Dash />
      </div>
    );
  return (
    <div style={cellBox}>
      <span
        style={{
          font: '600 14px var(--font-display)',
          color: 'var(--ink)',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {v}
      </span>
    </div>
  );
}

export function CompareTable({
  profCells,
  reminderCells,
}: {
  profCells: string[];
  reminderCells: string[];
}) {
  const rows: { label: string; cells: Cell[] }[] = [
    { label: 'Profissionais', cells: profCells },
    { label: 'Agendamentos por mês', cells: ['Ilimitado', 'Ilimitado', 'Ilimitado', 'Ilimitado'] },
    {
      label: 'Lembretes por e-mail e push',
      cells: ['Ilimitado', 'Ilimitado', 'Ilimitado', 'Ilimitado'],
    },
    { label: 'Lembretes por WhatsApp/mês', cells: reminderCells },
    { label: 'App do cliente', cells: ['c', 'c', 'c', 'c'] },
    { label: 'Página com a sua marca', cells: ['c', 'c', 'c', 'c'] },
    { label: 'Painel de gestão', cells: ['c', 'c', 'c', 'c'] },
    { label: 'Programa de fidelidade', cells: ['c', 'c', 'c', 'c'] },
    { label: 'Pagamentos online', cells: ['d', 'c', 'c', 'c'] },
    { label: 'Clube de assinatura', cells: ['d', 'c', 'c', 'c'] },
    { label: 'Fila de espera', cells: ['d', 'c', 'c', 'c'] },
    { label: 'Agenda por profissional', cells: ['d', 'c', 'c', 'c'] },
    { label: 'Relatórios avançados', cells: ['d', 'd', 'c', 'c'] },
    { label: 'Comissões por profissional', cells: ['d', 'd', 'c', 'c'] },
    { label: 'Webhooks e integrações', cells: ['d', 'd', 'c', 'c'] },
    { label: 'Multi-unidade', cells: ['d', 'd', 'd', 'c'] },
    { label: 'App white-label', cells: ['d', 'd', 'd', 'c'] },
    { label: 'Suporte', cells: ['Fundador', 'Fundador', 'Prioritário', 'Gerente dedicado'] },
  ];

  return (
    <section
      style={{
        width: '100%',
        maxWidth: '1080px',
        margin: '0 auto',
        padding: 'clamp(56px,7vw,80px) clamp(20px,5vw,40px) 0',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div
          style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}
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
            Detalhes
          </span>
        </div>
        <h2
          style={{
            font: '400 clamp(24px,4vw,34px) var(--font-display)',
            color: 'var(--emerald)',
            letterSpacing: '-.02em',
            margin: 0,
          }}
        >
          Compare os planos.
        </h2>
      </div>

      <div
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--border-soft)',
          borderRadius: '24px',
          overflowX: 'auto',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.9fr 1fr 1fr 1fr 1fr',
            minWidth: '680px',
          }}
        >
          {/* header */}
          <div style={{ padding: '22px 24px 18px', display: 'flex', alignItems: 'flex-end' }}>
            <span
              style={{
                font: '700 11px var(--font-ui)',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: 'var(--ink-50)',
              }}
            >
              Recurso
            </span>
          </div>
          <div
            style={{
              padding: '22px 8px',
              textAlign: 'center',
              font: '500 17px var(--font-display)',
              color: 'var(--emerald)',
            }}
          >
            Solo
          </div>
          <div
            style={{
              padding: '16px 8px 22px',
              textAlign: 'center',
              background: 'rgba(47,211,122,.08)',
              position: 'relative',
            }}
          >
            <div
              style={{
                font: '700 8px var(--font-ui)',
                letterSpacing: '.1em',
                color: 'var(--coral)',
                marginBottom: '3px',
              }}
            >
              POPULAR
            </div>
            <div style={{ font: '500 17px var(--font-display)', color: 'var(--emerald)' }}>
              Time
            </div>
          </div>
          <div
            style={{
              padding: '22px 8px',
              textAlign: 'center',
              font: '500 17px var(--font-display)',
              color: 'var(--emerald)',
            }}
          >
            Multi
          </div>
          <div
            style={{
              padding: '22px 8px',
              textAlign: 'center',
              font: '500 17px var(--font-display)',
              color: 'var(--emerald)',
            }}
          >
            Enterprise
          </div>

          {/* rows */}
          {rows.map((row) => (
            <div key={row.label} style={{ display: 'contents' }}>
              <div
                style={{
                  padding: '14px 24px',
                  font: '500 14px var(--font-ui)',
                  color: 'var(--ink-70)',
                  borderTop: '1px solid var(--border-soft)',
                }}
              >
                {row.label}
              </div>
              {row.cells.map((cell, i) => (
                <CellView key={i} v={cell} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
