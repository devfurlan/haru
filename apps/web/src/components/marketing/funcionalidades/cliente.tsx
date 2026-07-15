export function Cliente() {
  return (
    <section id="cliente" className="scroll-mt-[78px]">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,40px)] py-[clamp(40px,6vw,72px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-[clamp(30px,5vw,64px)]">
          <div className="border-line bg-cream mx-auto w-full max-w-[460px] overflow-hidden rounded-[16px] border shadow-[var(--shadow-card)]">
            <div className="border-line flex items-center gap-[7px] border-b bg-[#f2ebda] px-[14px] py-[11px]">
              <span className="h-[11px] w-[11px] rounded-full bg-[#e08a7a]"></span>
              <span className="h-[11px] w-[11px] rounded-full bg-[#e6c15c]"></span>
              <span className="h-[11px] w-[11px] rounded-full bg-[#7bbf8f]"></span>
              <div className="border-edge bg-paper text-ink-50 ml-[8px] flex flex-1 items-center gap-[7px] rounded-[8px] border px-[11px] py-[6px] font-sans text-[11.5px] font-medium leading-[normal]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ink-30)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="11" width="16" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                demanda.ee/studio-lamina
              </div>
            </div>
            <div>
              <div className="relative h-[132px] bg-[linear-gradient(135deg,#e7c9a6,#c98f63)]">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_38%,rgba(10,51,36,.58))]"></div>
                <div className="absolute bottom-[12px] left-[16px] right-[16px]">
                  <div className="font-serif text-[21px] font-semibold leading-[normal] tracking-[-.01em] text-[#FFFDF8]">
                    Studio Lâmina
                  </div>
                  <div className="mt-[3px] font-sans text-[11.5px] font-semibold leading-[normal] text-[#f0e6d4]">
                    ★ 4,9 · Barbearia · Rua Aurora, 210
                  </div>
                </div>
              </div>
              <div className="px-[18px] pb-[18px] pt-[16px]">
                <div className="text-ink font-sans text-[12.5px] font-semibold leading-[normal]">
                  Escolha o serviço
                </div>
                <div className="mt-[11px] flex flex-col gap-[9px]">
                  <div className="border-green-deep bg-paper flex items-center gap-[12px] rounded-[13px] border-[1.5px] px-[13px] py-[11px]">
                    <div className="flex-1">
                      <div className="text-ink font-sans text-[14px] font-semibold leading-[normal]">
                        Corte masculino
                      </div>
                      <div className="text-ink-50 font-sans text-[11.5px] font-medium leading-[normal]">
                        45 min
                      </div>
                    </div>
                    <div className="text-green-deep mr-[4px] font-serif text-[15px] font-semibold leading-[normal]">
                      R$ 45
                    </div>
                    <span className="bg-green-deep grid h-[22px] w-[22px] place-items-center rounded-full">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  </div>
                  <div className="border-edge bg-paper flex items-center gap-[12px] rounded-[13px] border px-[13px] py-[11px]">
                    <div className="flex-1">
                      <div className="text-ink font-sans text-[14px] font-semibold leading-[normal]">
                        Corte + barba
                      </div>
                      <div className="text-ink-50 font-sans text-[11.5px] font-medium leading-[normal]">
                        1h10
                      </div>
                    </div>
                    <div className="text-green-deep mr-[4px] font-serif text-[15px] font-semibold leading-[normal]">
                      R$ 70
                    </div>
                    <span className="border-edge h-[22px] w-[22px] rounded-full border-2"></span>
                  </div>
                </div>
                <div className="bg-coral mt-[14px] rounded-[13px] p-[13px] text-center font-sans text-[14px] font-bold leading-[normal] text-[#fff]">
                  Agendar horário
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-[14px] inline-flex items-center gap-[9px]">
              <span className="bg-coral h-[2px] w-[20px] rounded-[2px]"></span>
              <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
                Pilar 02 · Cliente
              </span>
            </div>
            <h2 className="text-green-deep mb-[14px] max-w-[460px] font-serif text-[clamp(26px,3.6vw,38px)] font-normal leading-[1.12] tracking-[-.02em]">
              O cliente marca sozinho, com a <span className="italic text-[#0C7E41]">sua</span>{' '}
              cara.
            </h2>
            <p className="text-ink-70 mb-[22px] max-w-[460px] font-sans text-[16.5px] font-normal leading-[1.6]">
              App e página web com a sua marca - não um marketplace com o concorrente do lado. Ele
              acha o horário, agenda em segundos e volta sozinho.
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
                  Página pública e app com a sua marca
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
                  Agendamento em segundos, 24 horas por dia
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
                  Favoritos e reagendamento em um toque
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
                  Fidelidade que traz o cliente de volta
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
