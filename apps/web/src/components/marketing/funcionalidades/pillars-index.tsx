export function PillarsIndex() {
  return (
    // width:100% conserta o colapso do grid auto-fit (section é flex item do layout)
    <section className="mx-auto w-full max-w-[1200px] px-[clamp(16px,4vw,40px)] pb-[clamp(24px,4vw,44px)] pt-3.5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        <a
          href="#agenda"
          className="hv-bd-green border-line bg-paper py-5.5 block rounded-[20px] border px-5 shadow-[var(--shadow-card)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="bg-chip flex h-11 w-11 items-center justify-center rounded-[var(--radius-icontile)]">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2.5" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <span className="text-ink-30 font-sans text-[12px] font-bold leading-[normal] tracking-[.14em]">
              01
            </span>
          </div>
          <div className="text-green-deep font-serif text-[19px] font-medium leading-[normal]">
            Agenda
          </div>
          <div className="text-ink-50 mt-1.5 font-sans text-[13.5px] font-normal leading-[1.5]">
            Rápida, por profissional, com fila de espera.
          </div>
        </a>
        <a
          href="#cliente"
          className="hv-bd-green border-line bg-paper py-5.5 block rounded-[20px] border px-5 shadow-[var(--shadow-card)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="bg-chip flex h-11 w-11 items-center justify-center rounded-[var(--radius-icontile)]">
              <svg
                width="22"
                height="22"
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
            <span className="text-ink-30 font-sans text-[12px] font-bold leading-[normal] tracking-[.14em]">
              02
            </span>
          </div>
          <div className="text-green-deep font-serif text-[19px] font-medium leading-[normal]">
            Cliente
          </div>
          <div className="text-ink-50 mt-1.5 font-sans text-[13.5px] font-normal leading-[1.5]">
            App e página com a sua marca. Sem marketplace.
          </div>
        </a>
        <a
          href="#dinheiro"
          className="hv-bd-green border-line bg-paper py-5.5 block rounded-[20px] border px-5 shadow-[var(--shadow-card)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="bg-chip flex h-11 w-11 items-center justify-center rounded-[var(--radius-icontile)]">
              <svg
                width="22"
                height="22"
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
            <span className="text-ink-30 font-sans text-[12px] font-bold leading-[normal] tracking-[.14em]">
              03
            </span>
          </div>
          <div className="text-green-deep font-serif text-[19px] font-medium leading-[normal]">
            Dinheiro
          </div>
          <div className="text-ink-50 mt-1.5 font-sans text-[13.5px] font-normal leading-[1.5]">
            Assinatura, pacotes e pagamento antecipado.
          </div>
        </a>
        <a
          href="#gestao"
          className="hv-bd-green border-line bg-paper py-5.5 block rounded-[20px] border px-5 shadow-[var(--shadow-card)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="bg-chip flex h-11 w-11 items-center justify-center rounded-[var(--radius-icontile)]">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
              </svg>
            </span>
            <span className="text-ink-30 font-sans text-[12px] font-bold leading-[normal] tracking-[.14em]">
              04
            </span>
          </div>
          <div className="text-green-deep font-serif text-[19px] font-medium leading-[normal]">
            Gestão
          </div>
          <div className="text-ink-50 mt-1.5 font-sans text-[13.5px] font-normal leading-[1.5]">
            O negócio inteiro numa tela, no PC e no celular.
          </div>
        </a>
        <a
          href="#fidelidade"
          className="hv-bd-green border-line bg-paper py-5.5 block rounded-[20px] border px-5 shadow-[var(--shadow-card)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="bg-chip flex h-11 w-11 items-center justify-center rounded-[var(--radius-icontile)]">
              <svg
                width="22"
                height="22"
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
            <span className="text-ink-30 font-sans text-[12px] font-bold leading-[normal] tracking-[.14em]">
              05
            </span>
          </div>
          <div className="text-green-deep font-serif text-[19px] font-medium leading-[normal]">
            Fidelidade
          </div>
          <div className="text-ink-50 mt-1.5 font-sans text-[13.5px] font-normal leading-[1.5]">
            Pontos, recompensas e retorno automático.
          </div>
        </a>
      </div>
    </section>
  );
}
