export function Dinheiro() {
  return (
    <section
      id="dinheiro"
      className="border-t-line border-b-line bg-paper scroll-mt-[78px] border-b border-t"
    >
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,5vw,40px)] py-[clamp(40px,6vw,72px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-[clamp(30px,5vw,64px)]">
          <div>
            <div className="mb-[14px] inline-flex items-center gap-[9px]">
              <span className="bg-coral h-[2px] w-[20px] rounded-[2px]"></span>
              <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
                Pilar 03 · Dinheiro
              </span>
            </div>
            <h2 className="text-green-deep mb-[14px] max-w-[460px] font-serif text-[clamp(26px,3.6vw,38px)] font-normal leading-[1.12] tracking-[-.02em]">
              Receita que entra mesmo com a{' '}
              <span className="italic text-[#0C7E41]">agenda vazia</span>.
            </h2>
            <p className="text-ink-70 mb-[22px] max-w-[460px] font-sans text-[16.5px] font-normal leading-[1.6]">
              Clube de assinatura, pacotes e pagamento online. Cobre antes, reduza o no-show e crie
              receita recorrente todo mês.
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
                  Clube de assinatura e pacotes de sessões
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
                  Pagamento online e PIX, antecipado
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
                  Menos no-show com cobrança na reserva
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
                  Comissão por profissional calculada sozinha
                </span>
              </div>
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-[420px] flex-col gap-[12px]">
            <div className="border-line bg-paper rounded-[18px] border p-[18px] shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[11px]">
                  <span className="bg-chip grid h-[42px] w-[42px] place-items-center rounded-[13px]">
                    <svg
                      width="21"
                      height="21"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--emerald)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m17 2 4 4-4 4" />
                      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                      <path d="m7 22-4-4 4-4" />
                      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-green-deep font-serif text-[16px] font-medium leading-[normal]">
                      Clube de assinatura
                    </div>
                    <div className="text-ink-50 font-sans text-[11.5px] font-medium leading-[normal]">
                      Corte Ilimitado
                    </div>
                  </div>
                </div>
                <div className="text-ink whitespace-nowrap text-right font-serif text-[20px] font-semibold leading-[normal]">
                  R$ 99
                  <span className="text-ink-50 font-sans text-[12px] font-medium leading-[normal]">
                    /mês
                  </span>
                </div>
              </div>
              <div className="bg-line my-[14px] h-[1px]"></div>
              <div className="flex items-center justify-between">
                <span className="text-ink-70 font-sans text-[12.5px] font-medium leading-[normal]">
                  42 assinantes ativos
                </span>
                <span className="bg-chip text-green-deep rounded-full px-[10px] py-[5px] font-sans text-[10.5px] font-bold uppercase leading-[normal] tracking-[.04em]">
                  +8 este mês
                </span>
              </div>
            </div>
            <div className="border-line bg-paper rounded-[18px] border p-[18px] shadow-[var(--shadow-card)]">
              <div className="flex items-baseline justify-between">
                <span className="text-ink-50 font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.1em]">
                  Receita recorrente
                </span>
                <span className="text-green-deep whitespace-nowrap font-serif text-[18px] font-semibold leading-[normal]">
                  R$ 4.158
                  <span className="text-ink-50 font-sans text-[11px] font-medium leading-[normal]">
                    /mês
                  </span>
                </span>
              </div>
              <div className="mt-[15px] flex h-[64px] items-end gap-[8px]">
                <div className="h-[34px] flex-1 rounded-t-[6px] bg-[#cdeadb]"></div>
                <div className="h-[42px] flex-1 rounded-t-[6px] bg-[#cdeadb]"></div>
                <div className="h-[48px] flex-1 rounded-t-[6px] bg-[#a9dcc1]"></div>
                <div className="h-[54px] flex-1 rounded-t-[6px] bg-[#a9dcc1]"></div>
                <div className="h-[60px] flex-1 rounded-t-[6px] bg-[#7fcea6]"></div>
                <div className="bg-green-bright h-[64px] flex-1 rounded-t-[6px]"></div>
              </div>
            </div>
            <div className="border-line bg-paper flex items-center gap-[12px] rounded-[16px] border px-[15px] py-[13px] shadow-[var(--shadow-card)]">
              <span className="bg-green-bright grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px]">
                <svg
                  width="18"
                  height="18"
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
              <div className="min-w-0 flex-1">
                <div className="text-ink font-sans text-[13.5px] font-semibold leading-[normal]">
                  Pagamento confirmado
                </div>
                <div className="text-ink-50 font-sans text-[11.5px] font-medium leading-[normal]">
                  PIX · Corte masculino
                </div>
              </div>
              <span className="text-green-deep font-serif text-[15px] font-semibold leading-[normal]">
                R$ 45
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
