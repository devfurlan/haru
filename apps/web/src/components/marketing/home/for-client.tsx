export function ForClient() {
  return (
    <section className="border-green-deep/10 border-b border-t bg-[#cfe7d5] pb-[clamp(56px,7vw,84px)] pt-[clamp(52px,7vw,84px)]">
      <div className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,40px)]">
        <div className="mx-auto mb-[clamp(32px,4vw,46px)] max-w-[700px] text-center">
          <div className="mb-3.5 inline-flex items-center gap-2">
            <span className="bg-coral h-0.5 w-5 rounded-[2px]"></span>
            <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
              Pro seu cliente
            </span>
          </div>
          <h2 className="text-green-deep mx-auto mb-3.5 max-w-[600px] font-serif text-[clamp(28px,4.6vw,42px)] font-normal leading-[1.08] tracking-[-.02em]">
            Ele escolhe onde marcar. Você não perde{' '}
            <span className="italic text-[#0C7E41]">nenhum</span>.
          </h2>
          <p className="text-ink-70 mx-auto max-w-[560px] font-sans text-[17px] font-normal leading-[1.55]">
            Ninguém fica preso a canal nenhum: quem gosta de app usa o app, quem veio do Instagram
            agenda pela web. O WhatsApp só avisa.
          </p>
        </div>

        {/* two real product mockups */}
        <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(310px,1fr))] gap-5">
          {/* CANAL 1 · APP */}
          <div className="border-line bg-paper flex flex-col rounded-[24px] border p-[clamp(22px,2.6vw,30px)] shadow-[var(--shadow-card)]">
            <span className="text-ink-50 font-sans text-[10px] font-bold uppercase leading-[normal] tracking-[.12em]">
              Canal 1 · App
            </span>
            <div className="text-green-deep mb-1.5 mt-2 font-serif text-[21px] font-medium leading-[normal]">
              No app Demandaê
            </div>
            <p className="text-ink-70 mb-5 max-w-[360px] font-sans text-[14.5px] font-normal leading-[1.55]">
              Histórico, favoritos e remarcação num toque. Pro cliente que volta todo mês.
            </p>
            {/* phone: home do app (histórico, favoritos, remarcação) */}
            <div className="mt-auto flex h-[clamp(380px,34vw,460px)] items-start justify-center overflow-hidden rounded-t-[20px] px-3.5 pt-9 [background:radial-gradient(130%_92%_at_50%_0,var(--green-tint),transparent_74%)]">
              <div className="bg-ink w-[min(340px,100%)] rounded-t-[46px] px-2 pt-2 shadow-[var(--shadow-phone)]">
                <div className="bg-cream overflow-hidden rounded-t-[39px]">
                  {/* status bar */}
                  <div className="bg-green-deep px-4.5 flex items-center justify-between pt-3">
                    <span className="text-on-emerald font-sans text-[11px] font-semibold leading-[normal]">
                      9:41
                    </span>
                    <div className="flex items-center gap-1.5">
                      <svg width="17" height="12" viewBox="0 0 18 12" fill="#FAF5EA">
                        <rect x="0" y="8" width="3" height="4" rx="1" />
                        <rect x="5" y="5" width="3" height="7" rx="1" />
                        <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
                        <rect x="15" y="0" width="3" height="12" rx="1" />
                      </svg>
                      <svg
                        width="16"
                        height="12"
                        viewBox="0 0 24 20"
                        fill="none"
                        stroke="#FAF5EA"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      >
                        <path d="M2 7a15 15 0 0 1 20 0" />
                        <path d="M5.5 11a10 10 0 0 1 13 0" />
                        <path d="M9 15a5 5 0 0 1 6 0" />
                      </svg>
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
                  {/* header + próximo */}
                  <div className="bg-green-deep relative px-4 pb-4 pt-3">
                    <div className="absolute inset-0 [background:radial-gradient(160px_110px_at_85%_0,rgba(47,211,122,.2),transparent),radial-gradient(150px_110px_at_4%_80%,rgba(255,90,54,.12),transparent)]"></div>
                    <div className="relative flex items-start justify-between">
                      <div>
                        <div className="text-on-emerald-mut font-sans text-[10.5px] font-medium leading-[normal]">
                          Boa tarde,
                        </div>
                        <div className="text-on-emerald mt-1 font-serif text-[17px] font-semibold leading-[1]">
                          Marina
                        </div>
                      </div>
                      <div className="h-7.5 w-7.5 border-on-emerald-mut/30 bg-paper/10 relative grid place-items-center rounded-[10px] border">
                        <svg
                          width="15"
                          height="15"
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
                        <span className="border-green-deep bg-coral absolute right-[7px] top-1.5 h-1.5 w-1.5 rounded-[50%] border-[1.5px]"></span>
                      </div>
                    </div>
                    <div className="relative mt-4">
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="bg-green-bright h-1.5 w-1.5 animate-[dmd-pulse_2s_infinite] rounded-[50%]"></span>
                        <span className="text-green-bright font-sans text-[8.5px] font-bold uppercase leading-[normal] tracking-[.12em]">
                          Próximo · em 2 dias
                        </span>
                      </div>
                      <div className="bg-green-card border-green-bright/30 rounded-[16px] border p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-green-bright h-8.5 w-8.5 border-green-bright/26 grid flex-none place-items-center rounded-[10px] border bg-[rgba(47,211,122,.14)] font-serif text-[15px] font-medium leading-[normal]">
                            A
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-paper font-serif text-[13px] font-semibold leading-[normal]">
                              Corte + barba
                            </div>
                            <div className="text-on-emerald-mut mt-[1px] font-sans text-[9.5px] font-medium leading-[normal]">
                              com Ana · Studio Aurora
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-on-emerald font-serif text-[13px] font-semibold leading-[1]">
                              15h30
                            </div>
                            <div className="text-on-emerald-mut mt-0.5 font-sans text-[8.5px] font-medium leading-[normal]">
                              Qua, 9 jul
                            </div>
                          </div>
                        </div>
                        <div className="my-2.5 h-[1px] [background:repeating-linear-gradient(90deg,rgba(143,191,164,.4)_0_5px,transparent_5px_10px)]"></div>
                        <div className="flex gap-2">
                          <span className="bg-coral flex-1 rounded-[10px] p-2 text-center font-sans text-[10.5px] font-bold leading-[normal] text-[#fff]">
                            Ver detalhes
                          </span>
                          <span className="text-on-emerald border-cream/26 flex-1 rounded-[10px] border p-2 text-center font-sans text-[10.5px] font-bold leading-[normal]">
                            Remarcar
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* histórico */}
                  <div className="px-3.5 pb-1 pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-ink-50 font-sans text-[8px] font-bold uppercase leading-[normal] tracking-[.12em]">
                        Seu histórico
                      </span>
                      <span className="text-green-deep font-sans text-[9.5px] font-semibold leading-[normal]">
                        Ver tudo
                      </span>
                    </div>
                    <div className="border-line bg-paper mb-2 flex items-center gap-2 rounded-[13px] border px-2.5 py-2">
                      <span className="bg-chip text-green-deep grid h-8 w-8 flex-none place-items-center rounded-[9px] font-serif text-[13px] font-medium leading-[normal]">
                        A
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-ink font-serif text-[11.5px] font-semibold leading-[normal]">
                          Corte + barba
                        </div>
                        <div className="text-ink-50 font-sans text-[9px] font-medium leading-[normal]">
                          Studio Aurora · 12 jun
                        </div>
                      </div>
                      <span className="bg-chip text-green-deep flex-none rounded-full border border-[rgba(15,126,65,.2)] px-2 py-1 font-sans text-[9px] font-bold leading-[normal]">
                        Repetir
                      </span>
                    </div>
                    <div className="border-line bg-paper flex items-center gap-2 rounded-[13px] border px-2.5 py-2">
                      <span className="bg-chip text-green-deep grid h-8 w-8 flex-none place-items-center rounded-[9px] font-serif text-[13px] font-medium leading-[normal]">
                        V
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-ink font-serif text-[11.5px] font-semibold leading-[normal]">
                          Sobrancelha
                        </div>
                        <div className="text-ink-50 font-sans text-[9px] font-medium leading-[normal]">
                          Studio Vila · 28 mai
                        </div>
                      </div>
                      <span className="bg-chip text-green-deep flex-none rounded-full border border-[rgba(15,126,65,.2)] px-2 py-1 font-sans text-[9px] font-bold leading-[normal]">
                        Repetir
                      </span>
                    </div>
                  </div>
                  {/* bottom nav */}
                  <div className="border-t-line bg-paper mt-3 flex items-start justify-around border-t px-1 pb-3 pt-2">
                    <div className="flex flex-col items-center gap-1">
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="var(--emerald)"
                        stroke="var(--emerald)"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      >
                        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
                      </svg>
                      <span className="text-green-deep font-sans text-[8.5px] font-semibold leading-[normal]">
                        Início
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--ink-30)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                      </svg>
                      <span className="text-ink-30 font-sans text-[8.5px] font-semibold leading-[normal]">
                        Buscar
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--ink-30)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2.5" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span className="text-ink-30 font-sans text-[8.5px] font-semibold leading-[normal]">
                        Agenda
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--ink-30)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="8" r="3.6" />
                        <path d="M5 20c.8-3.9 3.4-6 7-6s6.2 2.1 7 6" />
                      </svg>
                      <span className="text-ink-30 font-sans text-[8.5px] font-semibold leading-[normal]">
                        Perfil
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CANAL 2 · WEB */}
          <div className="border-line bg-paper flex flex-col rounded-[24px] border p-[clamp(22px,2.6vw,30px)] shadow-[var(--shadow-card)]">
            <span className="text-ink-50 font-sans text-[10px] font-bold uppercase leading-[normal] tracking-[.12em]">
              Canal 2 · Web
            </span>
            <div className="text-green-deep mb-1.5 mt-2 font-serif text-[21px] font-medium leading-[normal]">
              Na sua página pública
            </div>
            <p className="text-ink-70 mb-3 max-w-[380px] font-sans text-[14.5px] font-normal leading-[1.55]">
              Direto do navegador, sem baixar nada. O link que vai na bio do Instagram:
            </p>
            <span className="bg-chip mb-5 inline-flex items-center gap-2 self-start rounded-full border border-[rgba(15,126,65,.18)] px-3 py-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
              </svg>
              <span className="text-green-deep font-sans text-[12.5px] font-semibold leading-[normal]">
                demandae.com/seunegocio
              </span>
            </span>
            {/* browser: public booking page */}
            <div className="border-line bg-cream mt-auto overflow-hidden rounded-[16px] border shadow-[0_30px_60px_-38px_rgba(10,51,36,.5)]">
              <div className="border-b-line flex items-center gap-2 border-b bg-[#f2ebda] px-3 py-2.5">
                <span className="h-[9px] w-[9px] rounded-[50%] bg-[#e08a7a]"></span>
                <span className="h-[9px] w-[9px] rounded-[50%] bg-[#e6c15c]"></span>
                <span className="h-[9px] w-[9px] rounded-[50%] bg-[#7bbf8f]"></span>
                <div className="border-edge bg-paper text-ink-50 ml-1.5 flex flex-1 items-center gap-1.5 rounded-[7px] border px-2.5 py-1 font-sans text-[10.5px] font-medium leading-[normal]">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--ink-30)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="4" y="11" width="16" height="9" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  demandae.com/seunegocio
                </div>
              </div>
              {/* cover */}
              <div className="bg-green-deep relative overflow-hidden px-4 py-4">
                <div className="absolute inset-0 [background:radial-gradient(180px_120px_at_88%_0,rgba(47,211,122,.2),transparent),radial-gradient(160px_120px_at_0_100%,rgba(255,90,54,.12),transparent)]"></div>
                <div className="relative flex items-center gap-3">
                  <span className="text-green-bright border-green-bright/30 bg-green-bright/16 grid h-11 w-11 flex-none place-items-center rounded-[13px] border font-serif text-[18px] font-medium leading-[normal]">
                    A
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-on-emerald font-serif text-[16px] font-semibold leading-[1.1]">
                      Studio Aurora
                    </div>
                    <div className="text-on-emerald-mut mt-1 flex items-center gap-2 font-sans text-[10.5px] font-medium leading-[normal]">
                      <span className="text-green-bright inline-flex items-center gap-1">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="var(--green)"
                          stroke="none"
                        >
                          <path d="m12 2 2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
                        </svg>
                        4,9
                      </span>
                      <span>Atendimento com hora marcada</span>
                    </div>
                  </div>
                  <span className="bg-coral flex-none rounded-[11px] px-3 py-2 font-sans text-[11px] font-bold leading-[normal] text-[#fff]">
                    Agendar
                  </span>
                </div>
              </div>
              {/* services */}
              <div className="px-4 pb-4 pt-3">
                <div className="text-ink-50 mb-2 font-sans text-[9px] font-bold uppercase leading-[normal] tracking-[.12em]">
                  Serviços
                </div>
                <div className="border-b-line flex items-center gap-2.5 border-b py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-ink font-serif text-[13px] font-semibold leading-[normal]">
                      Corte + barba
                    </div>
                    <div className="text-ink-50 font-sans text-[10px] font-medium leading-[normal]">
                      45 min
                    </div>
                  </div>
                  <div className="text-green-deep font-serif text-[13px] font-semibold leading-[normal]">
                    R$ 70
                  </div>
                </div>
                <div className="flex items-center gap-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-ink font-serif text-[13px] font-semibold leading-[normal]">
                      Corte
                    </div>
                    <div className="text-ink-50 font-sans text-[10px] font-medium leading-[normal]">
                      30 min
                    </div>
                  </div>
                  <div className="text-green-deep font-serif text-[13px] font-semibold leading-[normal]">
                    R$ 45
                  </div>
                </div>
                <div className="text-ink-50 mb-2 mt-3 font-sans text-[9px] font-bold uppercase leading-[normal] tracking-[.12em]">
                  Horários de hoje
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-chip text-green-deep rounded-full border border-[rgba(15,126,65,.2)] px-3 py-1.5 font-sans text-[11.5px] font-semibold leading-[normal]">
                    09h00
                  </span>
                  <span className="border-line bg-paper text-ink-70 rounded-full border px-3 py-1.5 font-sans text-[11.5px] font-semibold leading-[normal]">
                    10h30
                  </span>
                  <span className="border-line bg-paper text-ink-70 rounded-full border px-3 py-1.5 font-sans text-[11.5px] font-semibold leading-[normal]">
                    14h00
                  </span>
                  <span className="border-line bg-paper text-ink-70 rounded-full border px-3 py-1.5 font-sans text-[11.5px] font-semibold leading-[normal]">
                    16h30
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WHATSAPP: só o aviso. Tratamento deliberadamente discreto - creme (recuado) e
            sem sombra (não elevado), contra os canais reais acima que são paper + shadow-card.
            O WhatsApp não é canal de agendamento, só notifica.
            Sem tracejado de propósito: nesta home dashed já significa "vazio/não preenchido"
            (slot livre no hero, horário vago no painel, carimbo não conquistado na fidelidade). */}
        <div className="border-edge bg-cream flex flex-wrap items-center gap-[clamp(14px,2vw,22px)] rounded-[24px] border px-[clamp(22px,2.6vw,30px)] py-[clamp(20px,2.4vw,26px)]">
          <span className="bg-chip h-11.5 w-11.5 grid flex-none place-items-center rounded-[var(--radius-icontile)]">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--emerald)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            </svg>
          </span>
          <div className="min-w-0 flex-[1_1_320px]">
            <span className="text-ink-50 font-sans text-[10px] font-bold uppercase leading-[normal] tracking-[.12em]">
              Só o aviso · WhatsApp
            </span>
            <div className="text-green-deep mb-1.5 mt-2 font-serif text-[21px] font-medium leading-[normal]">
              Confirmação e lembrete
            </div>
            <p className="text-ink-70 max-w-[470px] font-sans text-[14.5px] font-normal leading-[1.55]">
              Chegam sozinhos no WhatsApp do cliente. Ninguém precisa agendar por lá - e ninguém
              esquece o horário.
            </p>
          </div>
          <div className="flex flex-none flex-wrap items-center gap-2">
            <span className="text-ink-50 font-sans text-[11px] font-medium leading-[normal]">
              Também por
            </span>
            <span className="border-line bg-paper text-ink-70 rounded-full border px-3 py-1 font-sans text-[11px] font-semibold leading-[normal]">
              Email
            </span>
            <span className="border-line bg-paper text-ink-70 rounded-full border px-3 py-1 font-sans text-[11px] font-semibold leading-[normal]">
              Push do app
            </span>
          </div>
        </div>

        {/* closing: termina do mesmo jeito. Bilhete claro (paper + serrilha), o mesmo
            tratamento da home antiga - o fecho é a prova de que os 3 canais caem na
            mesma agenda, não um bloco de destaque. Direção/serrilha/rotação em .dmd-ticket. */}
        <div className="gap-4.5 mt-[clamp(30px,4vw,44px)] flex flex-col items-center">
          <p className="text-ink-50 text-center font-serif text-[17px] font-normal italic leading-[normal]">
            Seja qual for o caminho, termina do mesmo jeito:
          </p>
          <div className="dmd-ticket border-edge bg-paper overflow-hidden rounded-[18px] border shadow-[0_20px_44px_-18px_rgba(10,51,36,.25)]">
            <div className="py-4.5 flex items-center gap-3.5 px-6">
              <span className="bg-green-deep text-green-bright grid h-11 w-11 flex-none place-items-center rounded-[14px] font-serif text-[18px] font-semibold leading-[normal]">
                L
              </span>
              <div>
                <div className="text-ink font-serif text-[16.8px] font-semibold leading-[normal]">
                  Barbearia do Léo
                </div>
                <div className="text-ink-50 mt-0.5 font-sans text-[12px] font-medium leading-[normal]">
                  Corte + barba · agendado{' '}
                  <strong className="text-green-deep font-bold">via web</strong>
                </div>
              </div>
            </div>
            <div className="py-4.5 flex items-center gap-5 px-6">
              <div>
                <div className="text-ink-30 font-sans text-[10px] font-bold uppercase leading-[normal] tracking-[.12em]">
                  Qua, 9 jul
                </div>
                <div className="text-green-deep font-serif text-[21.6px] font-semibold leading-[normal]">
                  10h00
                </div>
              </div>
              <span className="bg-chip text-green-deep inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 font-sans text-[12px] font-semibold leading-[normal]">
                <span className="bg-green-bright h-1.5 w-1.5 flex-none animate-[pulse-ring_2s_infinite] rounded-[50%]"></span>
                na sua agenda
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
