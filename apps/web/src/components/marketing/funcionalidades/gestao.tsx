export function Gestao() {
  return (
    <section id="gestao" className="scroll-mt-[78px]">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,40px)] py-[clamp(40px,6vw,72px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-[clamp(30px,5vw,64px)]">
          <div className="border-line bg-cream mx-auto flex w-full max-w-[480px] overflow-hidden rounded-[18px] border shadow-[var(--shadow-card)]">
            <div className="bg-green-deep flex w-[60px] flex-none flex-col items-center gap-[7px] py-[14px]">
              <div className="bg-green-bright text-green-deep grid h-[32px] w-[32px] place-items-center rounded-[10px] font-serif text-[16px] font-semibold leading-[normal]">
                d
              </div>
              <div className="h-[6px]"></div>
              <div className="bg-green-bright grid h-[34px] w-[34px] place-items-center rounded-[10px]">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--emerald)"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                  <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
                  <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
                  <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
                </svg>
              </div>
              <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px]">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-emerald-mut)"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="16" rx="3" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
              </div>
              <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px]">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-emerald-mut)"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c.7-3.8 3.4-6 7-6s6.3 2.2 7 6" />
                </svg>
              </div>
              <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px]">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-emerald-mut)"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
            </div>
            <div className="min-w-0 flex-1 px-[18px] py-[16px]">
              <div className="flex items-baseline justify-between">
                <span className="text-ink font-serif text-[17px] font-medium leading-[normal]">
                  Início
                </span>
                <span className="text-ink-50 font-sans text-[11.5px] font-medium leading-[normal]">
                  Sáb, 5 jul
                </span>
              </div>
              <div className="mt-[14px] grid grid-cols-[1fr_1fr] gap-[9px]">
                <div className="border-line bg-paper rounded-[12px] border px-[12px] py-[11px]">
                  <div className="text-ink-50 font-sans text-[9px] font-bold uppercase leading-[normal] tracking-[.08em]">
                    Faturamento
                  </div>
                  <div className="text-ink mt-[3px] font-serif text-[18px] font-semibold leading-[normal]">
                    R$ 3.240
                  </div>
                  <div className="font-sans text-[10px] font-semibold leading-[normal] text-[#0C7E41]">
                    +12% na semana
                  </div>
                </div>
                <div className="border-line bg-paper rounded-[12px] border px-[12px] py-[11px]">
                  <div className="text-ink-50 font-sans text-[9px] font-bold uppercase leading-[normal] tracking-[.08em]">
                    Agendamentos
                  </div>
                  <div className="text-ink mt-[3px] font-serif text-[18px] font-semibold leading-[normal]">
                    128
                  </div>
                  <div className="text-ink-50 font-sans text-[10px] font-semibold leading-[normal]">
                    esta semana
                  </div>
                </div>
                <div className="border-line bg-paper rounded-[12px] border px-[12px] py-[11px]">
                  <div className="text-ink-50 font-sans text-[9px] font-bold uppercase leading-[normal] tracking-[.08em]">
                    Novos clientes
                  </div>
                  <div className="text-ink mt-[3px] font-serif text-[18px] font-semibold leading-[normal]">
                    34
                  </div>
                  <div className="font-sans text-[10px] font-semibold leading-[normal] text-[#0C7E41]">
                    +6 hoje
                  </div>
                </div>
                <div className="border-line bg-paper rounded-[12px] border px-[12px] py-[11px]">
                  <div className="text-ink-50 font-sans text-[9px] font-bold uppercase leading-[normal] tracking-[.08em]">
                    Ocupação
                  </div>
                  <div className="text-ink mt-[3px] font-serif text-[18px] font-semibold leading-[normal]">
                    86%
                  </div>
                  <div className="text-ink-50 font-sans text-[10px] font-semibold leading-[normal]">
                    das cadeiras
                  </div>
                </div>
              </div>
              <div className="bg-coral-tint mt-[10px] flex items-center gap-[10px] rounded-[12px] px-[12px] py-[10px]">
                <span className="bg-coral h-[8px] w-[8px] flex-none rounded-[50%]"></span>
                <span className="text-ink min-w-0 flex-1 font-sans text-[12px] font-semibold leading-[normal]">
                  3 clientes querem falar com você
                </span>
                <span className="text-coral font-sans text-[11px] font-bold leading-[normal]">
                  abrir
                </span>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-[14px] inline-flex items-center gap-[9px]">
              <span className="bg-coral h-[2px] w-[20px] rounded-[2px]"></span>
              <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
                Pilar 04 · Gestão
              </span>
            </div>
            <h2 className="text-green-deep mb-[14px] max-w-[460px] font-serif text-[clamp(26px,3.6vw,38px)] font-normal leading-[1.12] tracking-[-.02em]">
              O negócio inteiro numa <span className="italic text-[#0C7E41]">tela só</span>.
            </h2>
            <p className="text-ink-70 mb-[22px] max-w-[460px] font-sans text-[16.5px] font-normal leading-[1.6]">
              Agenda, conversas, clientes, serviços e relatórios no mesmo painel. Você abre de manhã
              e entende o dia num relance - no computador ou no celular.
            </p>
            <div className="flex max-w-[440px] flex-col gap-[2px]">
              <div className="flex items-start gap-[11px] py-[7px]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2FD37A"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-[2px] flex-none"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-ink-70 font-sans text-[15.5px] font-normal leading-[1.5]">
                  Painel único, no computador e no celular
                </span>
              </div>
              <div className="flex items-start gap-[11px] py-[7px]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2FD37A"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-[2px] flex-none"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-ink-70 font-sans text-[15.5px] font-normal leading-[1.5]">
                  Conversas e atendimento num lugar só
                </span>
              </div>
              <div className="flex items-start gap-[11px] py-[7px]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2FD37A"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-[2px] flex-none"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-ink-70 font-sans text-[15.5px] font-normal leading-[1.5]">
                  Base de clientes com histórico completo
                </span>
              </div>
              <div className="flex items-start gap-[11px] py-[7px]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2FD37A"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-[2px] flex-none"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-ink-70 font-sans text-[15.5px] font-normal leading-[1.5]">
                  Relatórios de faturamento e retenção
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
