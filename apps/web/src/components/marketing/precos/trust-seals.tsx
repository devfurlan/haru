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
    // width:100% pra o grid auto-fit não colapsar (section é flex item do layout)
    <section className="pt-13 mx-auto w-full max-w-[1200px] px-[clamp(16px,4vw,40px)] pb-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-5">
        {SEALS.map((s) => (
          <div key={s.title} className="flex items-start gap-3.5">
            <span className="bg-chip flex h-10 w-10 flex-none items-center justify-center rounded-[var(--radius-icontile)]">
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
              <div className="text-ink font-sans text-[15px] font-semibold leading-[normal]">
                {s.title}
              </div>
              <div className="text-ink-50 mt-1 font-sans text-[13px] font-normal leading-[1.4]">
                {s.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
