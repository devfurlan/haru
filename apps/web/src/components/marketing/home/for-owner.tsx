export function ForOwner() {
  return (
    <section className="border-line bg-paper border-b border-t py-[clamp(56px,7vw,88px)]">
      <div className="mx-auto max-w-[1160px] px-[clamp(16px,4vw,40px)]">
        <div className="mx-auto mb-[clamp(32px,4vw,44px)] max-w-[700px] text-center">
          <div className="mb-3.5 inline-flex items-center gap-2">
            <span className="bg-coral h-0.5 w-5 rounded-[2px]" />
            <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
              Pro dono
            </span>
          </div>
          <h2 className="text-green-deep mx-auto mb-3.5 max-w-[620px] font-serif text-[clamp(28px,4.6vw,42px)] font-normal leading-[1.08] tracking-[-.02em]">
            Agendou em qualquer canal, entra tudo{' '}
            <span className="italic text-[rgb(12,126,65)]">aqui</span>.
          </h2>
          <p className="text-ink-70 mx-auto max-w-[560px] font-sans text-[17px] font-normal leading-[1.55]">
            Um painel só pra ver o dia, cadastrar serviços, cuidar da equipe e receber. Sem
            planilha, sem caderninho, sem "me manda um zap".
          </p>
        </div>

        {/* THE daily panel */}
        <div className="border-line bg-cream mx-auto max-w-[1000px] overflow-hidden rounded-[20px] border shadow-[0_54px_104px_-46px_rgba(10,51,36,.6),0_14px_32px_rgba(10,51,36,.11)]">
          {/* window bar */}
          <div className="border-line flex items-center gap-2 border-b bg-[#f2ebda] px-4 py-3">
            <span className="h-[11px] w-[11px] rounded-[50%] bg-[#e08a7a]" />
            <span className="h-[11px] w-[11px] rounded-[50%] bg-[#e6c15c]" />
            <span className="h-[11px] w-[11px] rounded-[50%] bg-[#7bbf8f]" />
            <div className="border-edge bg-paper text-ink-50 ml-2 flex max-w-[320px] flex-1 items-center gap-2 rounded-[8px] border px-3 py-1.5 font-sans text-[11px] font-medium leading-[normal]">
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
              painel.demandae.com
            </div>
          </div>
          {/* rail + main */}
          <div className="flex">
            {/* icon rail */}
            <div className="bg-green-deep w-15 flex flex-none flex-col items-center gap-1.5 py-4">
              <span className="bg-coral h-7.5 w-7.5 mb-2 grid place-items-center rounded-[9px]">
                <span className="font-serif text-[15px] font-semibold leading-[normal] text-[#fff]">
                  D
                </span>
              </span>
              <span className="h-9.5 w-9.5 bg-green-bright/16 grid place-items-center rounded-[11px]">
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
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
              <span className="h-9.5 w-9.5 grid place-items-center rounded-[11px]">
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-emerald-faint)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="8" r="3.2" />
                  <path d="M3 20c.6-3 2.8-4.6 6-4.6s5.4 1.6 6 4.6" />
                  <circle cx="17.5" cy="9" r="2.4" />
                </svg>
              </span>
              <span className="h-9.5 w-9.5 grid place-items-center rounded-[11px]">
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-emerald-faint)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2.5" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </span>
              <span className="h-9.5 w-9.5 grid place-items-center rounded-[11px]">
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--on-emerald-faint)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
                </svg>
              </span>
            </div>
            {/* main */}
            <div className="min-w-0 flex-1 p-[clamp(16px,2.4vw,26px)]">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-ink font-serif text-[clamp(20px,2.4vw,26px)] font-medium leading-[1.02]">
                    Hoje, quarta
                  </div>
                  <div className="text-ink-50 mt-1 font-sans text-[12.5px] font-medium leading-[normal]">
                    9 de julho · 8 agendamentos
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="border-line bg-paper flex rounded-full border p-1">
                    <span className="bg-green-deep rounded-full px-3 py-1.5 font-sans text-[10.5px] font-bold leading-[normal] text-[#fff]">
                      Dia
                    </span>
                    <span className="text-ink-50 px-3 py-1.5 font-sans text-[10.5px] font-bold leading-[normal]">
                      Semana
                    </span>
                    <span className="text-ink-50 px-3 py-1.5 font-sans text-[10.5px] font-bold leading-[normal]">
                      Mês
                    </span>
                  </div>
                  <span className="bg-chip text-green-deep h-8.5 w-8.5 grid flex-none place-items-center rounded-[50%] font-serif text-[13px] font-semibold leading-[normal]">
                    V
                  </span>
                </div>
              </div>
              {/* stat cards */}
              <div className="mb-4 grid grid-cols-[repeat(3,1fr)] gap-2.5">
                <div className="border-line bg-paper rounded-[14px] border px-4 py-3">
                  <div className="text-ink-50 font-sans text-[8.5px] font-bold uppercase leading-[normal] tracking-[.09em]">
                    Faturamento hoje
                  </div>
                  <div className="text-ink mt-1 font-serif text-[clamp(20px,2.4vw,26px)] font-semibold leading-[normal]">
                    R$ 560
                  </div>
                  <div className="mt-0.5 font-sans text-[10px] font-semibold leading-[normal] text-[#0C7E41]">
                    recebido no app
                  </div>
                </div>
                <div className="border-line bg-paper rounded-[14px] border px-4 py-3">
                  <div className="text-ink-50 font-sans text-[8.5px] font-bold uppercase leading-[normal] tracking-[.09em]">
                    Confirmados
                  </div>
                  <div className="text-ink mt-1 font-serif text-[clamp(20px,2.4vw,26px)] font-semibold leading-[normal]">
                    7 de 8
                  </div>
                  <div className="text-ink-50 mt-0.5 font-sans text-[10px] font-semibold leading-[normal]">
                    1 aguardando
                  </div>
                </div>
                <div className="border-line bg-paper rounded-[14px] border px-4 py-3">
                  <div className="text-ink-50 font-sans text-[8.5px] font-bold uppercase leading-[normal] tracking-[.09em]">
                    Próximo livre
                  </div>
                  <div className="text-ink mt-1 font-serif text-[clamp(20px,2.4vw,26px)] font-semibold leading-[normal]">
                    14h30
                  </div>
                  <div className="text-ink-50 mt-0.5 font-sans text-[10px] font-semibold leading-[normal]">
                    encaixe possível
                  </div>
                </div>
              </div>
              {/* agenda list */}
              <div className="flex flex-col gap-2">
                <div className="border-line bg-paper flex items-center gap-3 rounded-[14px] border px-3.5 py-3">
                  <div className="text-green-deep w-11 flex-none font-serif text-[14px] font-semibold leading-[normal]">
                    9h00
                  </div>
                  <span className="bg-chip text-green-deep h-8.5 w-8.5 grid flex-none place-items-center rounded-[10px] font-serif text-[13px] font-semibold leading-[normal]">
                    M
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-ink font-serif text-[14px] font-semibold leading-[normal]">
                      Marcos A.
                    </div>
                    <div className="text-ink-50 font-sans text-[11.5px] font-medium leading-[normal]">
                      Corte + barba
                    </div>
                  </div>
                  <span className="bg-chip text-green-deep inline-flex flex-none items-center gap-1 rounded-full px-2.5 py-1 font-sans text-[10px] font-bold leading-[normal]">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--emerald)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Confirmado
                  </span>
                </div>
                <div className="border-line bg-paper flex items-center gap-3 rounded-[14px] border px-3.5 py-3">
                  <div className="text-green-deep w-11 flex-none font-serif text-[14px] font-semibold leading-[normal]">
                    10h00
                  </div>
                  <span className="bg-chip text-green-deep h-8.5 w-8.5 grid flex-none place-items-center rounded-[10px] font-serif text-[13px] font-semibold leading-[normal]">
                    R
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-ink font-serif text-[14px] font-semibold leading-[normal]">
                      Renata C.
                    </div>
                    <div className="text-ink-50 font-sans text-[11.5px] font-medium leading-[normal]">
                      Sobrancelha
                    </div>
                  </div>
                  <span className="bg-chip text-green-deep inline-flex flex-none items-center gap-1 rounded-full px-2.5 py-1 font-sans text-[10px] font-bold leading-[normal]">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--emerald)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Confirmado
                  </span>
                </div>
                <div className="border-line bg-paper flex items-center gap-3 rounded-[14px] border px-3.5 py-3">
                  <div className="text-green-deep w-11 flex-none font-serif text-[14px] font-semibold leading-[normal]">
                    11h30
                  </div>
                  <span className="bg-chip text-green-deep h-8.5 w-8.5 grid flex-none place-items-center rounded-[10px] font-serif text-[13px] font-semibold leading-[normal]">
                    J
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-ink font-serif text-[14px] font-semibold leading-[normal]">
                      João P.
                    </div>
                    <div className="text-ink-50 font-sans text-[11.5px] font-medium leading-[normal]">
                      Corte
                    </div>
                  </div>
                  <span className="border-edge bg-cream text-ink-70 inline-flex flex-none items-center gap-1 rounded-full border px-2.5 py-1 font-sans text-[10px] font-bold leading-[normal]">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--ink-50)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
                      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                    </svg>
                    Lembrete às 9h30
                  </span>
                </div>
                <div className="border-edge flex items-center gap-3 rounded-[14px] border border-dashed px-3.5 py-3">
                  <div className="text-ink-30 w-11 flex-none font-serif text-[14px] font-semibold leading-[normal]">
                    14h30
                  </div>
                  <div className="text-ink-50 min-w-0 flex-1 font-sans text-[12.5px] font-medium leading-[normal]">
                    Horário livre
                  </div>
                  <span className="text-green-deep flex-none font-sans text-[10.5px] font-bold leading-[normal]">
                    + Encaixar
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 supporting blocks */}
        <div className="mt-[clamp(28px,3.5vw,40px)] grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
          <div className="border-line bg-cream rounded-[20px] border p-6">
            <span className="bg-chip h-11.5 w-11.5 mb-4 flex items-center justify-center rounded-[var(--radius-icontile)]">
              <svg
                width="23"
                height="23"
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
                <path d="m9 15 2 2 4-4" />
              </svg>
            </span>
            <div className="text-green-deep mb-2 font-serif text-[18.5px] font-medium leading-[1.2]">
              Agenda inteligente
            </div>
            <div className="text-ink-70 font-sans text-[14px] font-normal leading-[1.55]">
              Respeita seu expediente e evita dois no mesmo horário. E marca horário fixo - semanal,
              quinzenal ou mensal - de uma vez.
            </div>
          </div>
          <div className="border-line bg-cream rounded-[20px] border p-6">
            <span className="bg-chip h-11.5 w-11.5 mb-4 flex items-center justify-center rounded-[var(--radius-icontile)]">
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
            </span>
            <div className="text-green-deep mb-2 font-serif text-[18.5px] font-medium leading-[1.2]">
              Confirmação e lembrete automáticos
            </div>
            <div className="text-ink-70 font-sans text-[14px] font-normal leading-[1.55]">
              Já no plano base. O cliente é avisado sem você digitar nada.
            </div>
          </div>
          <div className="border-line bg-cream rounded-[20px] border p-6">
            <span className="bg-chip h-11.5 w-11.5 mb-4 flex items-center justify-center rounded-[var(--radius-icontile)]">
              <svg
                width="23"
                height="23"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 7h-9M14 17H5" />
                <circle cx="17" cy="17" r="3" />
                <circle cx="7" cy="7" r="3" />
              </svg>
            </span>
            <div className="text-green-deep mb-2 font-serif text-[18.5px] font-medium leading-[1.2]">
              Serviços, equipe e pagamentos
            </div>
            <div className="text-ink-70 font-sans text-[14px] font-normal leading-[1.55]">
              Cadastra uma vez e pronto: preços, profissionais e recebimento no mesmo lugar.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
