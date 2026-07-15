export function Selos() {
  return (
    // width:100% conserta o colapso do grid auto-fit (section é flex item do layout)
    <section className="mx-auto w-full max-w-[1200px] px-[clamp(16px,4vw,40px)] pb-[clamp(20px,3vw,32px)] pt-[clamp(40px,5vw,60px)]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-[20px]">
        <div className="flex items-start gap-[14px]">
          <span className="bg-chip flex h-[40px] w-[40px] flex-none items-center justify-center rounded-[var(--radius-icontile)]">
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
            <div className="text-ink font-sans text-[15px] font-semibold leading-[normal]">
              Sem taxa de setup
            </div>
            <div className="text-ink-50 mt-[3px] font-sans text-[13px] font-normal leading-[1.4]">
              Pague a mensalidade e comece a usar.
            </div>
          </div>
        </div>
        <div className="flex items-start gap-[14px]">
          <span className="bg-chip flex h-[40px] w-[40px] flex-none items-center justify-center rounded-[var(--radius-icontile)]">
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
            <div className="text-ink font-sans text-[15px] font-semibold leading-[normal]">
              Garantia de 30 dias
            </div>
            <div className="text-ink-50 mt-[3px] font-sans text-[13px] font-normal leading-[1.4]">
              Não gostou? Devolvemos o valor integral.
            </div>
          </div>
        </div>
        <div className="flex items-start gap-[14px]">
          <span className="bg-chip flex h-[40px] w-[40px] flex-none items-center justify-center rounded-[var(--radius-icontile)]">
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
            <div className="text-ink font-sans text-[15px] font-semibold leading-[normal]">
              Cancele quando quiser
            </div>
            <div className="text-ink-50 mt-[3px] font-sans text-[13px] font-normal leading-[1.4]">
              Sem multa, sem fidelidade.
            </div>
          </div>
        </div>
        <div className="flex items-start gap-[14px]">
          <span className="bg-chip flex h-[40px] w-[40px] flex-none items-center justify-center rounded-[var(--radius-icontile)]">
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
            <div className="text-ink font-sans text-[15px] font-semibold leading-[normal]">
              Migração inclusa
            </div>
            <div className="text-ink-50 mt-[3px] font-sans text-[13px] font-normal leading-[1.4]">
              Trazemos clientes, serviços e histórico.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
