import { Btn } from '../home/btn';

export function Hero() {
  return (
    // width:100% (w-full) conserta o colapso do grid auto-fit (section é flex item do layout)
    <section className="mx-auto w-full max-w-[1200px] px-[clamp(20px,5vw,40px)] pb-[clamp(30px,4vw,48px)] pt-[clamp(44px,6vw,72px)]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-[clamp(30px,5vw,64px)]">
        <div>
          <div className="mb-4.5 flex items-center gap-2">
            <span className="bg-coral h-0.5 w-5 rounded-[2px]"></span>
            <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
              Funcionalidades
            </span>
          </div>
          <h1 className="text-green-deep mb-4.5 max-w-[560px] font-serif text-[clamp(32px,5.4vw,52px)] font-normal leading-[1.06] tracking-[-.025em]">
            Tudo que a sua agenda precisa. <span className="italic text-[#0C7E41]">Nada</span> que
            ela não precisa.
          </h1>
          <p className="text-ink-70 mb-6.5 max-w-[500px] font-sans text-[18px] font-normal leading-[1.55]">
            Do primeiro toque do cliente ao fechamento do caixa: agendamento, app com a sua marca,
            pagamento e gestão - no mesmo lugar, sem gambiarra.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Btn variant="primary" size="lg" href="/signup">
              Começar agora
            </Btn>
            <Btn variant="secondary" size="lg" href="/precos">
              Ver planos
            </Btn>
          </div>
          <div className="border-line bg-paper mt-6.5 inline-flex items-center gap-2 rounded-full border py-2 pl-3 pr-4 shadow-[var(--shadow-card)]">
            <span className="bg-green-bright h-2 w-2 animate-[dmd-pulse_1.8s_ease-in-out_infinite] rounded-[50%]"></span>
            <span className="text-ink-70 font-sans text-[13px] font-semibold leading-[normal]">
              Agendamentos ilimitados em todos os planos
            </span>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="relative">
            <div className="bg-ink w-[300px] rounded-[42px] p-1.5 shadow-[0_44px_90px_-38px_rgba(10,51,36,.6),0_10px_26px_rgba(10,51,36,.16)]">
              <div className="bg-cream flex flex-col overflow-hidden rounded-[36px]">
                <div className="bg-green-deep px-4.5 pb-5.5 relative pt-5">
                  <div className="absolute inset-0 [background:radial-gradient(180px_130px_at_85%_4%,rgba(47,211,122,.2),transparent),radial-gradient(160px_120px_at_6%_60%,rgba(255,90,54,.12),transparent)]"></div>
                  <div className="relative flex items-start justify-between">
                    <div>
                      <div className="text-on-emerald-mut font-sans text-[12px] font-medium leading-[normal]">
                        Boa tarde,
                      </div>
                      <div className="text-on-emerald mt-1 font-serif text-[21px] font-semibold leading-[1]">
                        Marina Alves
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8.5 w-8.5 border-on-emerald-mut/30 bg-paper/10 relative grid place-items-center rounded-[11px] border">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#FAF5EA"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
                          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                        </svg>
                        <span className="border-green-deep bg-coral absolute right-2 top-[7px] h-[7px] w-[7px] rounded-[50%] border-2"></span>
                      </div>
                      <div className="bg-green-bright text-green-deep h-8.5 w-8.5 grid place-items-center rounded-[11px] font-serif text-[14px] font-semibold leading-[normal]">
                        M
                      </div>
                    </div>
                  </div>
                  <div className="mt-4.5 relative">
                    <div className="mb-2.5 flex items-center gap-1.5">
                      <span className="bg-green-bright h-[7px] w-[7px] animate-[dmd-pulse_2s_infinite] rounded-[50%]"></span>
                      <span className="text-green-bright font-sans text-[9.5px] font-bold uppercase leading-[normal] tracking-[.13em]">
                        Próximo · em 2 dias
                      </span>
                    </div>
                    <div className="bg-green-card border-green-bright/30 rounded-[18px] border p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="text-green-deep h-10.5 w-10.5 grid place-items-center rounded-[13px] font-serif text-[18px] font-semibold leading-[normal] [background:linear-gradient(135deg,#2FD37A,#1c9a5a)]">
                          T
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-paper font-serif text-[14px] font-semibold leading-[normal]">
                            Barbearia do Téo
                          </div>
                          <div className="text-on-emerald-mut font-sans text-[11px] font-medium leading-[normal]">
                            Corte · com Téo
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-on-emerald font-sans text-[13px] font-bold leading-[normal]">
                            15h30
                          </div>
                          <div className="text-on-emerald-mut font-sans text-[11px] font-medium leading-[normal]">
                            Sáb
                          </div>
                        </div>
                      </div>
                      <div className="my-3 h-[1px] [background:repeating-linear-gradient(90deg,rgba(143,191,164,.4)_0_6px,transparent_6px_12px)]"></div>
                      <div className="flex gap-2">
                        <span className="bg-coral flex-1 rounded-[11px] p-2 text-center font-sans text-[12px] font-bold leading-[normal] text-[#fff]">
                          Ver detalhes
                        </span>
                        <span className="text-on-emerald border-cream/26 flex-1 rounded-[11px] border p-2 text-center font-sans text-[12px] font-bold leading-[normal]">
                          Remarcar
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 px-4 pt-4">
                  <div className="border-line bg-paper flex-1 rounded-[15px] border p-3">
                    <div className="bg-chip grid h-8 w-8 place-items-center rounded-[10px]">
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--emerald)"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                      </svg>
                    </div>
                    <div className="text-ink mt-2 font-sans text-[13px] font-semibold leading-[normal]">
                      Buscar perto
                    </div>
                    <div className="text-ink-50 font-sans text-[10.5px] font-medium leading-[normal]">
                      barbearias, salões…
                    </div>
                  </div>
                  <div className="border-line bg-paper flex-1 rounded-[15px] border p-3">
                    <div className="bg-coral-tint grid h-8 w-8 place-items-center rounded-[10px]">
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--coral)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path
                          d="M12 20s-7-4.6-7-9.6A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7 3.4C19 15.4 12 20 12 20Z"
                          fill="var(--coral)"
                        />
                      </svg>
                    </div>
                    <div className="text-ink mt-2 font-sans text-[13px] font-semibold leading-[normal]">
                      Favoritos
                    </div>
                    <div className="text-ink-50 font-sans text-[10.5px] font-medium leading-[normal]">
                      6 lugares
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline justify-between px-4 pt-4">
                  <span className="text-ink font-serif text-[15px] font-semibold leading-[normal]">
                    Volte pra…
                  </span>
                  <span className="text-coral font-sans text-[11.5px] font-semibold leading-[normal]">
                    ver tudo
                  </span>
                </div>
                <div className="flex gap-2.5 overflow-hidden pb-5 pl-4 pt-2.5">
                  <div className="w-[132px] flex-none">
                    <div className="h-21 relative rounded-[15px] [background:linear-gradient(135deg,#e7c9a6,#c98f63)]">
                      <span className="bg-paper text-green-deep absolute left-[7px] top-[7px] rounded-full px-2 py-1 font-sans text-[10px] font-bold leading-[normal]">
                        ★ 4,9
                      </span>
                    </div>
                    <div className="text-ink mt-2 font-sans text-[12.5px] font-semibold leading-[normal]">
                      Studio Lâmina
                    </div>
                    <div className="text-ink-50 font-sans text-[10.5px] font-medium leading-[normal]">
                      Barbearia · 900 m
                    </div>
                  </div>
                  <div className="w-[132px] flex-none">
                    <div className="h-21 relative rounded-[15px] [background:linear-gradient(135deg,#b9d8c4,#5a9c7a)]">
                      <span className="bg-paper text-green-deep absolute left-[7px] top-[7px] rounded-full px-2 py-1 font-sans text-[10px] font-bold leading-[normal]">
                        ★ 4,8
                      </span>
                    </div>
                    <div className="text-ink mt-2 font-sans text-[12.5px] font-semibold leading-[normal]">
                      Bella Unhas
                    </div>
                    <div className="text-ink-50 font-sans text-[10.5px] font-medium leading-[normal]">
                      Salão · 2,1 km
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-line bg-paper absolute left-[-24px] top-[372px] flex items-center gap-2 rounded-[15px] border px-3 py-3 shadow-[0_20px_40px_-18px_rgba(10,51,36,.4)] backdrop-blur-[6px]">
              <span className="bg-green-bright h-7.5 w-7.5 grid place-items-center rounded-[9px]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--emerald)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <div className="text-ink font-sans text-[12px] font-semibold leading-[normal]">
                  Agendado!
                </div>
                <div className="text-ink-50 font-sans text-[10.5px] font-medium leading-[normal]">
                  confirmação enviada
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
