import { Btn } from './btn';

export function Hero() {
  // width:100% é necessário: a section é flex item do layout (coluna flex) e,
  // com só max-width, sua largura resolve como indefinida - o que faz o
  // `repeat(auto-fit,minmax(330px,1fr))` colapsar pra 1 coluna. Largura definida
  // conserta o cálculo de tracks (2 colunas no desktop, 1 no mobile).
  return (
    <section className="mx-auto w-full max-w-[1200px] px-[clamp(20px,5vw,40px)] pb-[clamp(28px,3.5vw,44px)] pt-[clamp(40px,6vw,72px)]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(330px,1fr))] items-center gap-[clamp(34px,5vw,60px)]">
        {/* text */}
        <div>
          <div className="mb-[18px] flex items-center gap-[9px]">
            <span className="bg-coral h-[2px] w-[20px] rounded-[2px]" />
            <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
              A operação inteira
            </span>
          </div>
          <h1 className="text-green-deep mb-[18px] max-w-[560px] font-serif text-[clamp(32px,5.4vw,52px)] font-normal leading-[1.06] tracking-[-.025em]">
            Sua agenda, seus clientes, seu dinheiro. Num sistema{' '}
            <span className="italic text-[#0C7E41]">só</span>.
          </h1>
          <p className="text-ink-70 mb-[28px] max-w-[490px] font-sans text-[18px] font-normal leading-[1.55]">
            Agenda, app do cliente, pagamentos, fidelidade e clube de assinatura. Tudo junto,
            funcionando.
          </p>
          <div className="flex flex-wrap items-center gap-[13px]">
            <Btn variant="primary" size="lg" href="/signup">
              Começar agora
            </Btn>
            <Btn variant="secondary" size="lg" href="/precos">
              Ver planos
            </Btn>
          </div>
          <div className="border-line bg-paper mt-[26px] inline-flex items-center gap-[10px] rounded-full border py-[9px] pl-[11px] pr-[16px] shadow-[var(--shadow-card)]">
            <span className="bg-chip grid h-[28px] w-[28px] flex-none place-items-center rounded-[50%]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <span className="text-ink-70 font-sans text-[13.5px] font-semibold leading-[normal]">
              <strong className="text-ink">Garantia de 30 dias.</strong> Não gostou, devolvemos
              tudo.
            </span>
          </div>
        </div>

        {/* composed product scene: dashboard panel behind, client phone in front */}
        <div className="relative mx-auto w-full max-w-[560px] pt-[18px]">
          {/* OWNER PANEL (dashboard: agenda do dia) - dono acompanha */}
          <div className="border-line bg-cream absolute right-0 top-[52px] z-[1] w-[66%] overflow-hidden rounded-[18px] border shadow-[0_34px_60px_-32px_rgba(10,51,36,.34),0_10px_20px_-10px_rgba(10,51,36,.14)]">
            <div className="border-line flex items-center gap-[7px] border-b bg-[#f2ebda] px-[14px] py-[11px]">
              <span className="h-[11px] w-[11px] rounded-[50%] bg-[#e08a7a]" />
              <span className="h-[11px] w-[11px] rounded-[50%] bg-[#e6c15c]" />
              <span className="h-[11px] w-[11px] rounded-[50%] bg-[#7bbf8f]" />
              <div className="border-edge bg-paper text-ink-50 ml-[8px] flex flex-1 items-center gap-[7px] rounded-[8px] border px-[11px] py-[6px] font-sans text-[11px] font-medium leading-[normal]">
                <svg
                  width="11"
                  height="11"
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
                painel.demanda.ee/agenda
              </div>
            </div>
            <div className="px-[16px] pb-[16px] pt-[14px]">
              <div className="mb-[13px] flex items-start justify-between gap-[10px]">
                <div>
                  <div className="text-ink font-serif text-[18px] font-medium leading-[1]">
                    Agenda
                  </div>
                  <div className="text-ink-50 mt-[4px] font-sans text-[10.5px] font-medium leading-[normal]">
                    Quarta, 9 jul · hoje
                  </div>
                </div>
                <div className="border-line bg-paper flex rounded-full border p-[2px]">
                  <span className="bg-green-deep rounded-full px-[11px] py-[5px] font-sans text-[9.5px] font-bold leading-[normal] text-white">
                    Dia
                  </span>
                  <span className="text-ink-50 px-[10px] py-[5px] font-sans text-[9.5px] font-bold leading-[normal]">
                    Semana
                  </span>
                  <span className="text-ink-50 px-[9px] py-[5px] font-sans text-[9.5px] font-bold leading-[normal]">
                    Mês
                  </span>
                </div>
              </div>
              <div className="mb-[14px] grid grid-cols-[1fr_1fr_1fr] gap-[8px]">
                <div className="border-line bg-paper rounded-[12px] border px-[11px] py-[9px]">
                  <div className="text-ink-50 font-sans text-[7.5px] font-bold uppercase leading-[normal] tracking-[.07em]">
                    Hoje
                  </div>
                  <div className="text-ink mt-[2px] font-serif text-[17px] font-semibold leading-[normal]">
                    24
                  </div>
                  <div className="text-ink-50 font-sans text-[8.5px] font-semibold leading-[normal]">
                    atendimentos
                  </div>
                </div>
                <div className="border-line bg-paper rounded-[12px] border px-[11px] py-[9px]">
                  <div className="text-ink-50 font-sans text-[7.5px] font-bold uppercase leading-[normal] tracking-[.07em]">
                    Faturamento
                  </div>
                  <div className="text-ink mt-[2px] font-serif text-[17px] font-semibold leading-[normal]">
                    R$ 3.240
                  </div>
                  <div className="font-sans text-[8.5px] font-semibold leading-[normal] text-[#0C7E41]">
                    +12% na semana
                  </div>
                </div>
                <div className="border-line bg-paper rounded-[12px] border px-[11px] py-[9px]">
                  <div className="text-ink-50 font-sans text-[7.5px] font-bold uppercase leading-[normal] tracking-[.07em]">
                    Ocupação
                  </div>
                  <div className="text-ink mt-[2px] font-serif text-[17px] font-semibold leading-[normal]">
                    86%
                  </div>
                  <div className="text-ink-50 font-sans text-[8.5px] font-semibold leading-[normal]">
                    da agenda
                  </div>
                </div>
              </div>
              <div className="grid auto-rows-[33px] grid-cols-[24px_1fr_1fr_1fr] gap-[5px]">
                <div className="col-start-1 row-start-1" />
                <div className="col-start-2 row-start-1 flex items-center gap-[5px]">
                  <span className="bg-chip text-green-deep grid h-[16px] w-[16px] place-items-center rounded-[50%] font-sans text-[8px] font-bold leading-[normal]">
                    A
                  </span>
                  <span className="text-ink-70 font-sans text-[9.5px] font-semibold leading-[normal]">
                    Ana
                  </span>
                </div>
                <div className="col-start-3 row-start-1 flex items-center gap-[5px]">
                  <span className="bg-chip text-green-deep grid h-[16px] w-[16px] place-items-center rounded-[50%] font-sans text-[8px] font-bold leading-[normal]">
                    B
                  </span>
                  <span className="text-ink-70 font-sans text-[9.5px] font-semibold leading-[normal]">
                    Bruno
                  </span>
                </div>
                <div className="col-start-4 row-start-1 flex items-center gap-[5px]">
                  <span className="bg-chip text-green-deep grid h-[16px] w-[16px] place-items-center rounded-[50%] font-sans text-[8px] font-bold leading-[normal]">
                    D
                  </span>
                  <span className="text-ink-70 font-sans text-[9.5px] font-semibold leading-[normal]">
                    Duda
                  </span>
                </div>
                <div className="text-ink-30 col-start-1 row-start-2 pt-[2px] text-right font-sans text-[8px] font-semibold leading-[normal]">
                  09h
                </div>
                <div className="text-ink-30 col-start-1 row-start-3 pt-[2px] text-right font-sans text-[8px] font-semibold leading-[normal]">
                  10h
                </div>
                <div className="text-ink-30 col-start-1 row-start-4 pt-[2px] text-right font-sans text-[8px] font-semibold leading-[normal]">
                  11h
                </div>
                <div className="text-ink-30 col-start-1 row-start-5 pt-[2px] text-right font-sans text-[8px] font-semibold leading-[normal]">
                  12h
                </div>
                <div className="bg-chip col-start-2 row-start-2 row-end-4 overflow-hidden rounded-[9px] border border-[rgba(15,126,65,.16)] px-[8px] py-[6px]">
                  <div className="text-green-deep font-sans text-[9.5px] font-semibold leading-[normal]">
                    Sessão
                  </div>
                  <div className="mt-[1px] font-sans text-[8.5px] font-medium leading-[normal] text-[#0C7E41]">
                    Marina · 1h30
                  </div>
                </div>
                <div className="border-line bg-paper col-start-3 row-start-2 overflow-hidden rounded-[9px] border px-[8px] py-[5px]">
                  <div className="text-ink font-sans text-[9px] font-semibold leading-[normal]">
                    Retorno
                  </div>
                  <div className="text-ink-50 font-sans text-[8px] font-medium leading-[normal]">
                    João
                  </div>
                </div>
                <div className="border-edge col-start-4 row-start-2 flex items-center justify-center rounded-[9px] border border-dashed">
                  <span className="text-ink-30 font-sans text-[8px] font-semibold leading-[normal]">
                    livre
                  </span>
                </div>
                <div className="border-line bg-paper col-start-4 row-start-3 overflow-hidden rounded-[9px] border px-[8px] py-[5px]">
                  <div className="text-ink font-sans text-[9px] font-semibold leading-[normal]">
                    Avaliação
                  </div>
                  <div className="text-ink-50 font-sans text-[8px] font-medium leading-[normal]">
                    Bia
                  </div>
                </div>
                <div className="bg-coral-tint col-start-3 row-start-4 flex items-center gap-[5px] overflow-hidden rounded-[9px] border border-[rgba(255,90,54,.3)] px-[8px] py-[5px]">
                  <span className="bg-coral h-[6px] w-[6px] flex-none animate-[dmd-pulse_2s_infinite] rounded-[50%]" />
                  <div className="min-w-0">
                    <div className="text-ink font-sans text-[9px] font-semibold leading-[normal]">
                      Atendimento
                    </div>
                    <div className="text-coral font-sans text-[8px] font-medium leading-[normal]">
                      Léo · agora
                    </div>
                  </div>
                </div>
                <div className="bg-chip col-start-4 row-start-4 row-end-6 overflow-hidden rounded-[9px] border border-[rgba(15,126,65,.16)] px-[8px] py-[6px]">
                  <div className="text-green-deep font-sans text-[9.5px] font-semibold leading-[normal]">
                    Consulta
                  </div>
                  <div className="mt-[1px] font-sans text-[8.5px] font-medium leading-[normal] text-[#0C7E41]">
                    Rafa · 1h
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CLIENT PHONE (front): tela de agendamento - cliente agenda */}
          <div className="relative z-[3] ml-[-4px] w-[62%] min-w-[248px] max-w-[274px] animate-[dmd-floaty_6s_ease-in-out_infinite]">
            <div className="rounded-[44px] bg-[#0F1F18] p-[8px] shadow-[0_34px_62px_-26px_rgba(10,51,36,.4),0_14px_28px_-16px_rgba(10,51,36,.22)]">
              <div className="bg-cream overflow-hidden rounded-[36px]">
                <div className="bg-green-deep flex items-center justify-between px-[18px] pt-[11px]">
                  <span className="text-on-emerald font-sans text-[12px] font-semibold leading-[normal]">
                    9:41
                  </span>
                  <div className="flex items-center gap-[6px]">
                    <svg width="17" height="12" viewBox="0 0 18 12" fill="#FAF5EA">
                      <rect x="0" y="8" width="3" height="4" rx="1" />
                      <rect x="5" y="5" width="3" height="7" rx="1" />
                      <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
                      <rect x="15" y="0" width="3" height="12" rx="1" />
                    </svg>
                    <span className="text-on-emerald font-sans text-[9px] font-bold leading-[normal]">
                      5G
                    </span>
                    <svg width="22" height="12" viewBox="0 0 26 13" fill="none">
                      <rect
                        x="1"
                        y="1"
                        width="21"
                        height="11"
                        rx="3"
                        stroke="#FAF5EA"
                        strokeOpacity=".5"
                      />
                      <rect x="3" y="3" width="15" height="7" rx="1.5" fill="#FAF5EA" />
                      <rect
                        x="23.5"
                        y="4.5"
                        width="2"
                        height="4"
                        rx="1"
                        fill="#FAF5EA"
                        opacity=".5"
                      />
                    </svg>
                  </div>
                </div>
                <div className="bg-green-deep relative px-[15px] pb-[16px] pt-[13px]">
                  <div className="absolute inset-0 bg-[image:radial-gradient(160px_110px_at_85%_2%,rgba(47,211,122,.22),transparent),radial-gradient(150px_110px_at_4%_80%,rgba(255,90,54,.13),transparent)]" />
                  <div className="relative flex items-center gap-[10px]">
                    <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] border border-[rgba(143,191,164,.3)] bg-[rgba(255,253,248,.1)]">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#FAF5EA"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <div className="text-on-emerald font-serif text-[15px] font-semibold leading-[1.1]">
                        Studio Aurora
                      </div>
                      <div className="text-on-emerald-mut mt-[3px] font-sans text-[9px] font-semibold uppercase leading-[normal] tracking-[.1em]">
                        Passo 2 de 2 · Dia e horário
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-[14px] h-[5px] overflow-hidden rounded-full bg-[rgba(250,245,234,.18)]">
                    <div className="bg-green-bright absolute bottom-0 left-0 right-[8%] top-0 rounded-full" />
                  </div>
                </div>
                <div className="px-[14px] pb-[4px] pt-[14px]">
                  <div className="border-line bg-paper flex items-center gap-[10px] rounded-[14px] border px-[12px] py-[11px] shadow-[var(--shadow-card)]">
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
                        <path d="M6 3v5a4 4 0 0 0 8 0V3" />
                        <path d="M6 3H4.7M14 3h1.3" />
                        <path d="M10 12v1.5a4.5 4.5 0 0 0 4.5 4.5 3 3 0 0 0 3-3v-1" />
                        <circle cx="18.5" cy="12" r="1.7" />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-ink font-serif text-[13px] font-semibold leading-[normal]">
                        Sessão
                      </div>
                      <div className="text-ink-50 mt-[2px] font-sans text-[10px] font-medium leading-[1.4]">
                        45 min · R$ 70 · com qualquer profissional
                      </div>
                    </div>
                    <span className="text-green-deep flex-none font-sans text-[11px] font-bold leading-[normal]">
                      Editar
                    </span>
                  </div>
                  <div className="text-ink mb-[9px] mt-[16px] font-sans text-[11px] font-bold leading-[normal]">
                    Dia
                  </div>
                  <div className="flex gap-[7px]">
                    <div className="border-line flex-1 rounded-[13px] border py-[9px] text-center">
                      <div className="text-ink-50 font-sans text-[8.5px] font-bold leading-[normal] tracking-[.06em]">
                        QUA
                      </div>
                      <div className="text-ink mt-[2px] font-serif text-[17px] font-semibold leading-[normal]">
                        9
                      </div>
                    </div>
                    <div className="border-green-deep bg-green-deep flex-1 rounded-[13px] border py-[9px] text-center">
                      <div className="text-on-emerald-mut font-sans text-[8.5px] font-bold leading-[normal] tracking-[.06em]">
                        QUI
                      </div>
                      <div className="text-on-emerald mt-[2px] font-serif text-[17px] font-semibold leading-[normal]">
                        10
                      </div>
                    </div>
                    <div className="border-line flex-1 rounded-[13px] border py-[9px] text-center">
                      <div className="text-ink-50 font-sans text-[8.5px] font-bold leading-[normal] tracking-[.06em]">
                        SEX
                      </div>
                      <div className="text-ink mt-[2px] font-serif text-[17px] font-semibold leading-[normal]">
                        11
                      </div>
                    </div>
                    <div className="border-line flex-1 rounded-[13px] border py-[9px] text-center">
                      <div className="text-ink-50 font-sans text-[8.5px] font-bold leading-[normal] tracking-[.06em]">
                        SÁB
                      </div>
                      <div className="text-ink mt-[2px] font-serif text-[17px] font-semibold leading-[normal]">
                        12
                      </div>
                    </div>
                    <div className="border-line flex-1 rounded-[13px] border py-[9px] text-center opacity-40">
                      <div className="text-ink-50 font-sans text-[8.5px] font-bold leading-[normal] tracking-[.06em]">
                        DOM
                      </div>
                      <div className="text-ink mt-[2px] font-serif text-[17px] font-semibold leading-[normal] line-through">
                        13
                      </div>
                    </div>
                  </div>
                  <div className="text-ink mb-[9px] mt-[16px] font-sans text-[11px] font-bold leading-[normal]">
                    Horário
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_1fr] gap-[7px]">
                    <span className="border-line text-ink-30 rounded-[11px] border py-[10px] text-center font-sans text-[12px] font-semibold leading-[normal] line-through">
                      09h
                    </span>
                    <span className="border-line text-ink-70 rounded-[11px] border py-[10px] text-center font-sans text-[12px] font-semibold leading-[normal]">
                      09h30
                    </span>
                    <span className="border-green-deep bg-green-deep rounded-[11px] border py-[10px] text-center font-sans text-[12px] font-semibold leading-[normal] text-white">
                      10h
                    </span>
                    <span className="border-line text-ink-70 rounded-[11px] border py-[10px] text-center font-sans text-[12px] font-semibold leading-[normal]">
                      10h30
                    </span>
                    <span className="border-line text-ink-70 rounded-[11px] border py-[10px] text-center font-sans text-[12px] font-semibold leading-[normal]">
                      11h
                    </span>
                    <span className="border-line text-ink-70 rounded-[11px] border py-[10px] text-center font-sans text-[12px] font-semibold leading-[normal]">
                      14h
                    </span>
                  </div>
                  <button className="bg-coral mt-[16px] w-full cursor-pointer rounded-[14px] py-[13px] font-sans text-[13.5px] font-semibold leading-[normal] text-white shadow-[0_12px_24px_-12px_rgba(255,90,54,.5)]">
                    Confirmar · qui 10 às 10h
                  </button>
                  <div className="flex justify-center pb-[7px] pt-[11px]">
                    <span className="bg-ink h-[5px] w-[112px] rounded-full opacity-[.28]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* WHATSAPP NOTIFICATION: o cliente recebe o aviso */}
          <div className="absolute right-[-6px] top-[-14px] z-[5] w-[min(272px,58%)] animate-[dmd-floaty_6s_ease-in-out_infinite] [animation-delay:-3s]">
            <div className="border-line flex items-start gap-[11px] rounded-[16px] border bg-[#FFFDF8] px-[13px] py-[12px] shadow-[0_26px_54px_-18px_rgba(10,51,36,.55),0_6px_16px_rgba(10,51,36,.12)]">
              <span className="bg-chip grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--emerald)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 17 0Z" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-[8px]">
                  <span className="text-ink font-sans text-[12.5px] font-bold leading-[normal]">
                    WhatsApp
                  </span>
                  <span className="text-ink-50 font-sans text-[10px] font-medium leading-[normal]">
                    agora
                  </span>
                </div>
                <div className="text-ink-70 mt-[3px] font-sans text-[12px] font-medium leading-[1.45]">
                  Agendamento confirmado{' '}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0C7E41"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="align-[-1px]"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>{' '}
                  Sessão, qui 10 jul às 10h · Studio Aurora
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
