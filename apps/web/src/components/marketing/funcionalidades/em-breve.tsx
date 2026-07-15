export function EmBreve() {
  return (
    <section
      id="em-breve"
      className="mx-auto max-w-[1080px] scroll-mt-[78px] px-[clamp(20px,5vw,40px)] pb-[clamp(20px,3vw,32px)] pt-[clamp(44px,6vw,72px)]"
    >
      <div className="border-line bg-paper flex flex-wrap items-center gap-x-[40px] gap-y-[24px] rounded-[24px] border p-[clamp(24px,3vw,36px)] shadow-[var(--shadow-card)]">
        <div className="flex-[1_1_240px]">
          <div className="mb-[12px] inline-flex items-center gap-[9px]">
            <span className="bg-coral h-[8px] w-[8px] animate-[dmd-pulse_1.8s_infinite] rounded-[50%]"></span>
            <span className="text-ink-50 font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em]">
              No forno
            </span>
          </div>
          <h2 className="text-green-deep mb-[8px] font-serif text-[clamp(22px,3vw,30px)] font-normal leading-[1.15] tracking-[-.02em]">
            O que vem por aí.
          </h2>
          <p className="text-ink-70 max-w-[400px] font-sans text-[15px] font-normal leading-[1.55]">
            Em desenvolvimento agora. Chega pra todos os planos, sem custo extra.
          </p>
        </div>
        <div className="flex flex-[1_1_300px] flex-col gap-[10px]">
          <div className="border-line bg-cream flex items-center gap-[13px] rounded-[14px] border px-[15px] py-[13px]">
            <span className="bg-chip grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px]">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.6 0-3.1-.4-4.4-1.2L3 20l1.2-5.1A8.5 8.5 0 1 1 21 11.5z" />
              </svg>
            </span>
            <div className="flex-1">
              <div className="text-ink font-sans text-[14.5px] font-semibold leading-[normal]">
                Atendente de IA no WhatsApp
              </div>
              <div className="text-ink-50 font-sans text-[12px] font-medium leading-[normal]">
                responde e agenda sozinho, 24h
              </div>
            </div>
          </div>
          <div className="border-line bg-cream flex items-center gap-[13px] rounded-[14px] border px-[15px] py-[13px]">
            <span className="bg-chip grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px]">
              <svg
                width="19"
                height="19"
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
            <div className="flex-1">
              <div className="text-ink font-sans text-[14.5px] font-semibold leading-[normal]">
                App white-label
              </div>
              <div className="text-ink-50 font-sans text-[12px] font-medium leading-[normal]">
                seu app na loja, com o seu nome
              </div>
            </div>
          </div>
          <div className="border-line bg-cream flex items-center gap-[13px] rounded-[14px] border px-[15px] py-[13px]">
            <span className="bg-chip grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px]">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="m7 14 3-3 3 3 5-5" />
              </svg>
            </span>
            <div className="flex-1">
              <div className="text-ink font-sans text-[14.5px] font-semibold leading-[normal]">
                Relatórios com IA
              </div>
              <div className="text-ink-50 font-sans text-[12px] font-medium leading-[normal]">
                o que puxar mais faturamento, explicado
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
