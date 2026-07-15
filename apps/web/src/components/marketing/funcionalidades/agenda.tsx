export function Agenda() {
  return (
    <section id="agenda" className="border-line bg-paper scroll-mt-[78px] border-b border-t">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,40px)] py-[clamp(40px,6vw,72px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-[clamp(30px,5vw,64px)]">
          <div>
            <div className="mb-[14px] inline-flex items-center gap-[9px]">
              <span className="bg-coral h-[2px] w-[20px] rounded-[2px]"></span>
              <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
                Pilar 01 · Agenda
              </span>
            </div>
            <h2 className="text-green-deep mb-[14px] max-w-[460px] font-serif text-[clamp(26px,3.6vw,38px)] font-normal leading-[1.12] tracking-[-.02em]">
              Uma agenda que <span className="italic text-[#0C7E41]">aguenta</span> o seu dia.
            </h2>
            <p className="text-ink-70 mb-[22px] max-w-[460px] font-sans text-[16.5px] font-normal leading-[1.6]">
              Abre rápido entre um cliente e outro. Bloqueio, encaixe, agenda por profissional e
              fila de espera - sem tela branca, sem travar.
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
                  Agenda por profissional, lado a lado
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
                  Encaixe e bloqueio em dois toques
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
                  Fila de espera que preenche cancelamentos
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
                  Lembrete automático por e-mail, push e WhatsApp
                </span>
              </div>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[440px]">
            <div className="border-line bg-paper overflow-hidden rounded-[22px] border shadow-[var(--shadow-card)]">
              <div className="border-line flex items-center justify-between border-b px-[18px] py-[15px]">
                <div className="flex items-center gap-[10px]">
                  <span className="text-ink font-serif text-[16px] font-medium leading-[normal]">
                    Sáb, 5 jul
                  </span>
                  <span className="bg-chip text-green-deep rounded-full px-[9px] py-[4px] font-sans text-[10px] font-bold uppercase leading-[normal] tracking-[.06em]">
                    Hoje
                  </span>
                </div>
                <div className="flex gap-[6px]">
                  <span className="border-edge grid h-[30px] w-[30px] place-items-center rounded-[9px] border">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7c8a80"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 5l-7 7 7 7" />
                    </svg>
                  </span>
                  <span className="border-edge grid h-[30px] w-[30px] place-items-center rounded-[9px] border">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#7c8a80"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
              <div className="border-line grid grid-cols-[40px_1fr_1fr] border-b">
                <div></div>
                <div className="border-line text-ink-70 border-l p-[9px] text-center font-sans text-[12px] font-semibold leading-[normal]">
                  Téo
                </div>
                <div className="border-line text-ink-70 border-l p-[9px] text-center font-sans text-[12px] font-semibold leading-[normal]">
                  Ana
                </div>
              </div>
              <div className="grid grid-cols-[40px_1fr_1fr]">
                <div className="border-line text-ink-30 border-t px-[6px] pt-[5px] text-right font-sans text-[10px] font-medium leading-[normal]">
                  09
                </div>
                <div className="border-line min-h-[56px] border-l border-t p-[4px]">
                  <div className="border-l-green-bright bg-chip rounded-[8px] border-l-[3px] px-[8px] py-[6px]">
                    <div className="text-green-deep font-sans text-[11.5px] font-semibold leading-[normal]">
                      Corte
                    </div>
                    <div className="font-sans text-[10px] font-medium leading-[normal] text-[#5a8f72]">
                      João · 45min
                    </div>
                  </div>
                </div>
                <div className="border-line min-h-[56px] border-l border-t p-[4px]">
                  <div className="bg-green-deep rounded-[8px] px-[8px] py-[6px]">
                    <div className="text-on-emerald font-sans text-[11.5px] font-semibold leading-[normal]">
                      Escova
                    </div>
                    <div className="text-on-emerald-mut font-sans text-[10px] font-medium leading-[normal]">
                      Bia · 40min
                    </div>
                  </div>
                </div>
                <div className="border-line text-ink-30 border-t px-[6px] pt-[5px] text-right font-sans text-[10px] font-medium leading-[normal]">
                  10
                </div>
                <div className="border-line min-h-[56px] border-l border-t p-[4px]"></div>
                <div className="border-line min-h-[56px] border-l border-t p-[4px]">
                  <div className="border-l-green-bright bg-chip rounded-[8px] border-l-[3px] px-[8px] py-[6px]">
                    <div className="text-green-deep font-sans text-[11.5px] font-semibold leading-[normal]">
                      Manicure
                    </div>
                    <div className="font-sans text-[10px] font-medium leading-[normal] text-[#5a8f72]">
                      Lu · 50min
                    </div>
                  </div>
                </div>
                <div className="border-line text-ink-30 border-t px-[6px] pt-[5px] text-right font-sans text-[10px] font-medium leading-[normal]">
                  11
                </div>
                <div className="border-line min-h-[56px] border-l border-t p-[4px]">
                  <div className="border-l-coral bg-coral-tint rounded-[8px] border-l-[3px] px-[8px] py-[6px]">
                    <div className="text-ink font-sans text-[11.5px] font-semibold leading-[normal]">
                      Corte + barba
                    </div>
                    <div className="text-coral font-sans text-[10px] font-medium leading-[normal]">
                      Rafa · 1h10
                    </div>
                  </div>
                </div>
                <div className="border-line min-h-[56px] border-l border-t p-[4px]"></div>
                <div className="border-line text-ink-30 border-t px-[6px] pt-[5px] text-right font-sans text-[10px] font-medium leading-[normal]">
                  12
                </div>
                <div className="border-line min-h-[56px] border-l border-t p-[4px]">
                  <div className="rounded-[8px] px-[8px] py-[6px] [background:repeating-linear-gradient(45deg,#f2ebda_0_6px,#f7f1e3_6px_12px)]">
                    <div className="font-sans text-[11px] font-semibold leading-[normal] text-[#b9ad93]">
                      Almoço
                    </div>
                  </div>
                </div>
                <div className="border-line min-h-[56px] border-l border-t p-[4px]">
                  <div className="bg-green-deep rounded-[8px] px-[8px] py-[6px]">
                    <div className="text-on-emerald font-sans text-[11.5px] font-semibold leading-[normal]">
                      Coloração
                    </div>
                    <div className="text-on-emerald-mut font-sans text-[10px] font-medium leading-[normal]">
                      Sara · 1h30
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
