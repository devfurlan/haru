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

const cellBox = 'flex justify-center items-center py-3.5 px-2 border-t border-line';

function CellView({ v }: { v: Cell }) {
  if (v === 'c')
    return (
      <div className={cellBox}>
        <Check />
      </div>
    );
  if (v === 'd')
    return (
      <div className={cellBox}>
        <Dash />
      </div>
    );
  return (
    <div className={cellBox}>
      <span className="text-ink whitespace-nowrap text-center font-serif text-[14px] font-semibold leading-[normal]">
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
    <section className="mx-auto w-full max-w-[1080px] px-[clamp(20px,5vw,40px)] pt-[clamp(56px,7vw,80px)]">
      <div className="mb-7 text-center">
        <div className="mb-3.5 inline-flex items-center gap-2">
          <span className="bg-coral h-0.5 w-5 rounded-[2px]" />
          <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
            Detalhes
          </span>
        </div>
        <h2 className="text-green-deep font-serif text-[clamp(24px,4vw,34px)] font-normal leading-[normal] tracking-[-.02em]">
          Compare os planos.
        </h2>
      </div>

      <div className="bg-paper border-line overflow-x-auto rounded-[24px] border shadow-[var(--shadow-card)]">
        <div className="grid min-w-[680px] grid-cols-[1.9fr_1fr_1fr_1fr_1fr]">
          {/* header */}
          <div className="pb-4.5 pt-5.5 flex items-end px-6">
            <span className="text-ink-50 font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.12em]">
              Recurso
            </span>
          </div>
          <div className="text-green-deep py-5.5 px-2 text-center font-serif text-[17px] font-medium leading-[normal]">
            Solo
          </div>
          <div className="bg-green-bright/8 pb-5.5 relative px-2 pt-4 text-center">
            <div className="text-coral mb-1 font-sans text-[8px] font-bold leading-[normal] tracking-[.1em]">
              POPULAR
            </div>
            <div className="text-green-deep font-serif text-[17px] font-medium leading-[normal]">
              Time
            </div>
          </div>
          <div className="text-green-deep py-5.5 px-2 text-center font-serif text-[17px] font-medium leading-[normal]">
            Multi
          </div>
          <div className="text-green-deep py-5.5 px-2 text-center font-serif text-[17px] font-medium leading-[normal]">
            Enterprise
          </div>

          {/* rows */}
          {rows.map((row) => (
            <div key={row.label} className="contents">
              <div className="text-ink-70 border-line border-t px-6 py-3.5 font-sans text-[14px] font-medium leading-[normal]">
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
