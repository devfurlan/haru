import type { ReactNode } from 'react';

import { Btn } from './btn';

/* Hero da home E das landings por nicho: um molde só. A cena (texto + selo de garantia à
   esquerda; painel do dono atrás e telefone do cliente na frente à direita) é fixa; o que
   muda por página é o `content` - copy e o mockup do produto. A home é o default.

   Mesmo padrão de `HowItWorks({ steps })` e `Faq({ items })`: a copy da página vira const
   default e o componente ganha prop. Forkar este arquivo pra um nicho novo é justamente o
   que não fazer - passe `content`. */

export type AgendaBlock = {
  /** 1-based sobre mock.pros (coluna do profissional). */
  pro: number;
  /** 1..4 = 09h..12h. */
  row: number;
  rowSpan?: number;
  variant: 'green' | 'paper' | 'live' | 'free';
  title?: string;
  who?: string;
};

export type HeroMock = {
  tenant: string;
  pros: string[];
  stats: { count: string; countLabel: string; revenue: string; occupancy: string };
  /** `icon` recebe só os paths (o <svg> com stroke/tamanho é do molde). */
  service: { name: string; meta: string; icon: ReactNode };
  blocks: AgendaBlock[];
};

export type HeroContent = {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  mock: HeroMock;
};

const STETHOSCOPE = (
  <>
    <path d="M6 3v5a4 4 0 0 0 8 0V3" />
    <path d="M6 3H4.7M14 3h1.3" />
    <path d="M10 12v1.5a4.5 4.5 0 0 0 4.5 4.5 3 3 0 0 0 3-3v-1" />
    <circle cx="18.5" cy="12" r="1.7" />
  </>
);

const HOME_HERO: HeroContent = {
  eyebrow: 'A operação inteira',
  title: (
    <>
      Sua agenda, seus clientes, seu dinheiro. Num sistema{' '}
      <span className="italic text-[#0C7E41]">só</span>.
    </>
  ),
  subtitle:
    'Agenda, app do cliente, pagamentos, fidelidade e clube de assinatura. Tudo junto, funcionando.',
  mock: {
    tenant: 'Studio Aurora',
    pros: ['Ana', 'Bruno', 'Duda'],
    stats: { count: '24', countLabel: 'atendimentos', revenue: 'R$ 3.240', occupancy: '86%' },
    service: {
      name: 'Sessão',
      meta: '45 min · R$ 70 · com qualquer profissional',
      icon: STETHOSCOPE,
    },
    blocks: [
      { pro: 1, row: 1, rowSpan: 2, variant: 'green', title: 'Sessão', who: 'Marina · 1h30' },
      { pro: 2, row: 1, variant: 'paper', title: 'Retorno', who: 'João' },
      { pro: 3, row: 1, variant: 'free' },
      { pro: 3, row: 2, variant: 'paper', title: 'Avaliação', who: 'Bia' },
      { pro: 2, row: 3, variant: 'live', title: 'Atendimento', who: 'Léo · agora' },
      { pro: 3, row: 3, rowSpan: 2, variant: 'green', title: 'Consulta', who: 'Rafa · 1h' },
    ],
  },
};

/** Inicial do último nome: "Dra. Marina" -> M, "Léo" -> L (o 1º token daria "D" nos dois). */
function initial(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1][0] ?? '').toUpperCase();
}

const HOURS = ['09h', '10h', '11h', '12h'];

function Block({ block }: { block: AgendaBlock }) {
  // row 1..4 = 09h..12h; a linha 1 do grid é o cabeçalho com os profissionais.
  const style = {
    gridColumn: block.pro + 1,
    gridRow: `${block.row + 1} / span ${block.rowSpan ?? 1}`,
  };

  if (block.variant === 'free') {
    return (
      <div
        style={style}
        className="border-edge flex items-center justify-center rounded-[9px] border border-dashed"
      >
        <span className="text-ink-30 font-sans text-[8px] font-semibold leading-[normal]">
          livre
        </span>
      </div>
    );
  }

  if (block.variant === 'green') {
    return (
      <div
        style={style}
        className="bg-chip overflow-hidden rounded-[9px] border border-[rgba(15,126,65,.16)] px-2 py-1.5"
      >
        <div className="text-green-deep font-sans text-[9.5px] font-semibold leading-[normal]">
          {block.title}
        </div>
        <div className="mt-[1px] font-sans text-[8.5px] font-medium leading-[normal] text-[#0C7E41]">
          {block.who}
        </div>
      </div>
    );
  }

  if (block.variant === 'live') {
    return (
      <div
        style={style}
        className="bg-coral-tint border-coral/30 flex items-center gap-1 overflow-hidden rounded-[9px] border px-2 py-1"
      >
        <span className="bg-coral h-1.5 w-1.5 flex-none animate-[dmd-pulse_2s_infinite] rounded-[50%]" />
        <div className="min-w-0">
          <div className="text-ink font-sans text-[9px] font-semibold leading-[normal]">
            {block.title}
          </div>
          <div className="text-coral font-sans text-[8px] font-medium leading-[normal]">
            {block.who}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={style}
      className="border-line bg-paper overflow-hidden rounded-[9px] border px-2 py-1"
    >
      <div className="text-ink font-sans text-[9px] font-semibold leading-[normal]">
        {block.title}
      </div>
      <div className="text-ink-50 font-sans text-[8px] font-medium leading-[normal]">
        {block.who}
      </div>
    </div>
  );
}

export function Hero({ content = HOME_HERO }: { content?: HeroContent }) {
  const { mock } = content;

  // width:100% é necessário: a section é flex item do layout (coluna flex) e,
  // com só max-width, sua largura resolve como indefinida - o que faz o
  // `repeat(auto-fit,minmax(330px,1fr))` colapsar pra 1 coluna. Largura definida
  // conserta o cálculo de tracks (2 colunas no desktop, 1 no mobile).
  return (
    <section className="mx-auto w-full max-w-[1200px] px-[clamp(20px,5vw,40px)] pb-[clamp(28px,3.5vw,44px)] pt-[clamp(40px,6vw,72px)]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(330px,1fr))] items-center gap-[clamp(34px,5vw,60px)]">
        {/* text */}
        <div>
          <div className="mb-4.5 flex items-center gap-2">
            <span className="bg-coral h-0.5 w-5 rounded-[2px]" />
            <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
              {content.eyebrow}
            </span>
          </div>
          <h1 className="text-green-deep mb-4.5 max-w-[560px] font-serif text-[clamp(32px,5.4vw,52px)] font-normal leading-[1.06] tracking-[-.025em]">
            {content.title}
          </h1>
          <p className="text-ink-70 mb-7 max-w-[490px] font-sans text-[18px] font-normal leading-[1.55]">
            {content.subtitle}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Btn variant="primary" size="lg" href="/signup">
              Começar agora
            </Btn>
            <Btn variant="secondary" size="lg" href="/precos">
              Ver planos
            </Btn>
          </div>
          <div className="border-line bg-paper mt-6.5 inline-flex items-center gap-2.5 rounded-full border py-2 pl-3 pr-4 shadow-[var(--shadow-card)]">
            <span className="bg-chip grid h-7 w-7 flex-none place-items-center rounded-[50%]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--emerald)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
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
        <div className="pt-4.5 relative mx-auto w-full max-w-[560px]">
          {/* OWNER PANEL (dashboard: agenda do dia) - dono acompanha */}
          <div className="border-line bg-cream top-13 absolute right-0 z-[1] w-[66%] overflow-hidden rounded-[18px] border shadow-[0_34px_60px_-32px_rgba(10,51,36,.34),0_10px_20px_-10px_rgba(10,51,36,.14)]">
            <div className="border-line flex items-center gap-2 border-b bg-[#f2ebda] px-3.5 py-3">
              <span className="h-[11px] w-[11px] rounded-[50%] bg-[#e08a7a]" />
              <span className="h-[11px] w-[11px] rounded-[50%] bg-[#e6c15c]" />
              <span className="h-[11px] w-[11px] rounded-[50%] bg-[#7bbf8f]" />
              <div className="border-edge bg-paper text-ink-50 ml-2 flex flex-1 items-center gap-2 rounded-[8px] border px-3 py-1.5 font-sans text-[11px] font-medium leading-[normal]">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ink-30)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="4" y="11" width="16" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                painel.demanda.ee/agenda
              </div>
            </div>
            <div className="px-4 pb-4 pt-3.5">
              <div className="mb-3 flex items-start justify-between gap-2.5">
                <div>
                  <div className="text-ink font-serif text-[18px] font-medium leading-[1]">
                    Agenda
                  </div>
                  <div className="text-ink-50 mt-1 font-sans text-[10.5px] font-medium leading-[normal]">
                    Quarta, 9 jul · hoje
                  </div>
                </div>
                <div className="border-line bg-paper flex rounded-full border p-0.5">
                  <span className="bg-green-deep rounded-full px-3 py-1 font-sans text-[9.5px] font-bold leading-[normal] text-white">
                    Dia
                  </span>
                  <span className="text-ink-50 px-2.5 py-1 font-sans text-[9.5px] font-bold leading-[normal]">
                    Semana
                  </span>
                  <span className="text-ink-50 px-2 py-1 font-sans text-[9.5px] font-bold leading-[normal]">
                    Mês
                  </span>
                </div>
              </div>
              <div className="mb-3.5 grid grid-cols-[1fr_1fr_1fr] gap-2">
                <div className="border-line bg-paper rounded-[12px] border px-3 py-2">
                  <div className="text-ink-50 font-sans text-[7.5px] font-bold uppercase leading-[normal] tracking-[.07em]">
                    Hoje
                  </div>
                  <div className="text-ink mt-0.5 font-serif text-[17px] font-semibold leading-[normal]">
                    {mock.stats.count}
                  </div>
                  <div className="text-ink-50 font-sans text-[8.5px] font-semibold leading-[normal]">
                    {mock.stats.countLabel}
                  </div>
                </div>
                <div className="border-line bg-paper rounded-[12px] border px-3 py-2">
                  <div className="text-ink-50 font-sans text-[7.5px] font-bold uppercase leading-[normal] tracking-[.07em]">
                    Faturamento
                  </div>
                  <div className="text-ink mt-0.5 font-serif text-[17px] font-semibold leading-[normal]">
                    {mock.stats.revenue}
                  </div>
                  <div className="font-sans text-[8.5px] font-semibold leading-[normal] text-[#0C7E41]">
                    +12% na semana
                  </div>
                </div>
                <div className="border-line bg-paper rounded-[12px] border px-3 py-2">
                  <div className="text-ink-50 font-sans text-[7.5px] font-bold uppercase leading-[normal] tracking-[.07em]">
                    Ocupação
                  </div>
                  <div className="text-ink mt-0.5 font-serif text-[17px] font-semibold leading-[normal]">
                    {mock.stats.occupancy}
                  </div>
                  <div className="text-ink-50 font-sans text-[8.5px] font-semibold leading-[normal]">
                    da agenda
                  </div>
                </div>
              </div>
              {/* colunas = gutter das horas + 1 por profissional (a página define quantos) */}
              <div
                className="grid auto-rows-[33px] gap-1"
                style={{ gridTemplateColumns: `24px repeat(${mock.pros.length}, 1fr)` }}
              >
                {mock.pros.map((p, i) => (
                  <div
                    key={p}
                    className="flex items-center gap-1"
                    style={{ gridColumn: i + 2, gridRow: 1 }}
                  >
                    <span className="bg-chip text-green-deep grid h-4 w-4 flex-none place-items-center rounded-[50%] font-sans text-[8px] font-bold leading-[normal]">
                      {initial(p)}
                    </span>
                    <span className="text-ink-70 truncate font-sans text-[9.5px] font-semibold leading-[normal]">
                      {p}
                    </span>
                  </div>
                ))}
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    className="text-ink-30 pt-0.5 text-right font-sans text-[8px] font-semibold leading-[normal]"
                    style={{ gridColumn: 1, gridRow: i + 2 }}
                  >
                    {h}
                  </div>
                ))}
                {mock.blocks.map((b, i) => (
                  <Block key={i} block={b} />
                ))}
              </div>
            </div>
          </div>

          {/* CLIENT PHONE (front): tela de agendamento - cliente agenda */}
          <div className="relative z-[3] ml-[-4px] w-[62%] min-w-[248px] max-w-[274px] animate-[dmd-floaty_6s_ease-in-out_infinite]">
            <div className="bg-ink rounded-[44px] p-2 shadow-[0_34px_62px_-26px_rgba(10,51,36,.4),0_14px_28px_-16px_rgba(10,51,36,.22)]">
              <div className="bg-cream overflow-hidden rounded-[36px]">
                <div className="bg-green-deep px-4.5 flex items-center justify-between pt-3">
                  <span className="text-on-emerald font-sans text-[12px] font-semibold leading-[normal]">
                    9:41
                  </span>
                  <div className="flex items-center gap-1.5">
                    <svg width="17" height="12" viewBox="0 0 18 12" fill="#FAF5EA" aria-hidden>
                      <rect x="0" y="8" width="3" height="4" rx="1" />
                      <rect x="5" y="5" width="3" height="7" rx="1" />
                      <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
                      <rect x="15" y="0" width="3" height="12" rx="1" />
                    </svg>
                    <span className="text-on-emerald font-sans text-[9px] font-bold leading-[normal]">
                      5G
                    </span>
                    <svg width="22" height="12" viewBox="0 0 26 13" fill="none" aria-hidden>
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
                <div className="bg-green-deep relative px-4 pb-4 pt-3">
                  <div className="absolute inset-0 bg-[image:radial-gradient(160px_110px_at_85%_2%,rgba(47,211,122,.22),transparent),radial-gradient(150px_110px_at_4%_80%,rgba(255,90,54,.13),transparent)]" />
                  <div className="relative flex items-center gap-2.5">
                    <span className="h-7.5 w-7.5 border-on-emerald-mut/30 bg-paper/10 grid flex-none place-items-center rounded-[9px] border">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#FAF5EA"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <div className="text-on-emerald truncate font-serif text-[15px] font-semibold leading-[1.1]">
                        {mock.tenant}
                      </div>
                      <div className="text-on-emerald-mut mt-1 font-sans text-[9px] font-semibold uppercase leading-[normal] tracking-[.1em]">
                        Passo 2 de 2 · Dia e horário
                      </div>
                    </div>
                  </div>
                  <div className="bg-cream/18 relative mt-3.5 h-[5px] overflow-hidden rounded-full">
                    <div className="bg-green-bright absolute bottom-0 left-0 right-[8%] top-0 rounded-full" />
                  </div>
                </div>
                <div className="px-3.5 pb-1 pt-3.5">
                  <div className="border-line bg-paper flex items-center gap-2.5 rounded-[14px] border px-3 py-3 shadow-[var(--shadow-card)]">
                    <span className="bg-chip h-9.5 w-9.5 grid flex-none place-items-center rounded-[11px]">
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--emerald)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        {mock.service.icon}
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-ink font-serif text-[13px] font-semibold leading-[normal]">
                        {mock.service.name}
                      </div>
                      <div className="text-ink-50 mt-0.5 font-sans text-[10px] font-medium leading-[1.4]">
                        {mock.service.meta}
                      </div>
                    </div>
                    <span className="text-green-deep flex-none font-sans text-[11px] font-bold leading-[normal]">
                      Editar
                    </span>
                  </div>
                  <div className="text-ink mb-2 mt-4 font-sans text-[11px] font-bold leading-[normal]">
                    Dia
                  </div>
                  <div className="flex gap-2">
                    <div className="border-line flex-1 rounded-[13px] border py-2 text-center">
                      <div className="text-ink-50 font-sans text-[8.5px] font-bold leading-[normal] tracking-[.06em]">
                        QUA
                      </div>
                      <div className="text-ink mt-0.5 font-serif text-[17px] font-semibold leading-[normal]">
                        9
                      </div>
                    </div>
                    <div className="border-green-deep bg-green-deep flex-1 rounded-[13px] border py-2 text-center">
                      <div className="text-on-emerald-mut font-sans text-[8.5px] font-bold leading-[normal] tracking-[.06em]">
                        QUI
                      </div>
                      <div className="text-on-emerald mt-0.5 font-serif text-[17px] font-semibold leading-[normal]">
                        10
                      </div>
                    </div>
                    <div className="border-line flex-1 rounded-[13px] border py-2 text-center">
                      <div className="text-ink-50 font-sans text-[8.5px] font-bold leading-[normal] tracking-[.06em]">
                        SEX
                      </div>
                      <div className="text-ink mt-0.5 font-serif text-[17px] font-semibold leading-[normal]">
                        11
                      </div>
                    </div>
                    <div className="border-line flex-1 rounded-[13px] border py-2 text-center">
                      <div className="text-ink-50 font-sans text-[8.5px] font-bold leading-[normal] tracking-[.06em]">
                        SÁB
                      </div>
                      <div className="text-ink mt-0.5 font-serif text-[17px] font-semibold leading-[normal]">
                        12
                      </div>
                    </div>
                    <div className="border-line flex-1 rounded-[13px] border py-2 text-center opacity-40">
                      <div className="text-ink-50 font-sans text-[8.5px] font-bold leading-[normal] tracking-[.06em]">
                        DOM
                      </div>
                      <div className="text-ink mt-0.5 font-serif text-[17px] font-semibold leading-[normal] line-through">
                        13
                      </div>
                    </div>
                  </div>
                  <div className="text-ink mb-2 mt-4 font-sans text-[11px] font-bold leading-[normal]">
                    Horário
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
                    <span className="border-line text-ink-30 rounded-[11px] border py-2.5 text-center font-sans text-[12px] font-semibold leading-[normal] line-through">
                      09h
                    </span>
                    <span className="border-line text-ink-70 rounded-[11px] border py-2.5 text-center font-sans text-[12px] font-semibold leading-[normal]">
                      09h30
                    </span>
                    <span className="border-green-deep bg-green-deep rounded-[11px] border py-2.5 text-center font-sans text-[12px] font-semibold leading-[normal] text-white">
                      10h
                    </span>
                    <span className="border-line text-ink-70 rounded-[11px] border py-2.5 text-center font-sans text-[12px] font-semibold leading-[normal]">
                      10h30
                    </span>
                    <span className="border-line text-ink-70 rounded-[11px] border py-2.5 text-center font-sans text-[12px] font-semibold leading-[normal]">
                      11h
                    </span>
                    <span className="border-line text-ink-70 rounded-[11px] border py-2.5 text-center font-sans text-[12px] font-semibold leading-[normal]">
                      14h
                    </span>
                  </div>
                  <button className="bg-coral mt-4 w-full cursor-pointer rounded-[14px] py-3 font-sans text-[13.5px] font-semibold leading-[normal] text-white shadow-[0_12px_24px_-12px_rgba(255,90,54,.5)]">
                    Confirmar · qui 10 às 10h
                  </button>
                  <div className="flex justify-center pb-2 pt-3">
                    <span className="bg-ink h-[5px] w-[112px] rounded-full opacity-[.28]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* NOTIFICAÇÃO: o WhatsApp é canal de aviso, não de agendamento */}
          <div className="absolute right-[-6px] top-[-14px] z-[5] w-[min(272px,58%)] animate-[dmd-floaty_6s_ease-in-out_infinite] [animation-delay:-3s]">
            <div className="border-line bg-paper flex items-start gap-3 rounded-[16px] border px-3 py-3 shadow-[0_26px_54px_-18px_rgba(10,51,36,.55),0_6px_16px_rgba(10,51,36,.12)]">
              <span className="bg-chip h-8.5 w-8.5 grid flex-none place-items-center rounded-[10px]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--emerald)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 17 0Z" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink font-sans text-[12.5px] font-bold leading-[normal]">
                    WhatsApp
                  </span>
                  <span className="text-ink-50 font-sans text-[10px] font-medium leading-[normal]">
                    agora
                  </span>
                </div>
                <div className="text-ink-70 mt-1 font-sans text-[12px] font-medium leading-[1.45]">
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
                    aria-hidden
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>{' '}
                  {mock.service.name}, qui 10 jul às 10h · {mock.tenant}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
