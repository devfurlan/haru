import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/* Bento 5/7 · 7/5 · 4/4/4 · 4/4/4 (spans em .dmd-bento no globals.css). Os 4 primeiros
   cards são os pilares do produto e ganham slot largo + título maior; o resto vai em
   terços. Cada card é um link pro trecho correspondente da /funcionalidades. */

const card =
  'relative flex flex-col rounded-[20px] border border-line bg-paper p-[clamp(24px,2.4vw,30px)] shadow-[var(--shadow-card)]';

const tile =
  'grid h-[46px] w-[46px] place-items-center rounded-[var(--radius-icontile)] bg-green-deep mb-[18px]';

const badge =
  'absolute top-[22px] right-[22px] rounded-full bg-chip px-[12px] py-[4px] font-sans text-[11px] leading-[normal] font-bold tracking-[.06em] text-green-deep uppercase';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

type Card = {
  span: 4 | 5 | 7;
  title: string;
  body: ReactNode;
  icon: ReactNode;
  href: string;
  time?: boolean;
  /** classe de max-width do corpo (literal, pro scanner do Tailwind enxergar) */
  bodyMax?: string;
  extra?: ReactNode;
};

function SeeMore() {
  return (
    // mt-auto: gruda no rodapé quando o card estica pra altura da linha do bento.
    <div className="text-green-deep mt-auto flex items-center gap-[6px] pt-[18px] font-sans text-[12px] font-bold leading-[normal]">
      Ver mais
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    </div>
  );
}

const LINK_CHIP = (
  <div className="border-edge bg-cream mt-[8px] flex-none self-start rounded-[14px] border px-[18px] py-[14px]">
    <div className="text-ink-30 mb-[4px] font-sans text-[10px] font-bold uppercase leading-[normal] tracking-[.12em]">
      Seu link
    </div>
    <div className="text-green-deep font-sans text-[15px] font-semibold leading-[normal]">
      demandae.com/<span className="text-coral">seunegocio</span>
    </div>
  </div>
);

const CARDS: Card[] = [
  {
    span: 5,
    title: 'App do seu cliente',
    href: '/funcionalidades#cliente',
    body: 'Histórico, favoritos e "agendar de novo" num toque. Seu negócio na mão de quem volta sempre - iOS e Android.',
    icon: (
      <Icon>
        <rect x="5" y="2" width="14" height="20" rx="2.6" />
        <line x1="10" y1="18.5" x2="14" y2="18.5" />
      </Icon>
    ),
  },
  {
    span: 7,
    title: 'Página pública do seu negócio',
    href: '/funcionalidades#cliente',
    body: 'Com a sua marca, seus serviços e seus horários. Um link só pra divulgar onde quiser.',
    bodyMax: 'max-w-[330px]',
    extra: LINK_CHIP,
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
      </Icon>
    ),
  },
  {
    span: 7,
    title: 'Painel completo',
    href: '/funcionalidades#gestao',
    body: 'Dashboard do dia, agenda, cadastro de serviços e clientes. Tudo que você gerencia, num lugar só.',
    bodyMax: 'max-w-[420px]',
    icon: (
      <Icon>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </Icon>
    ),
  },
  {
    span: 5,
    title: 'Pagamento online',
    href: '/funcionalidades#dinheiro',
    body: 'Pix e cartão na hora do agendamento. Menos furo, caixa antecipado.',
    time: true,
    icon: (
      <Icon>
        <rect x="2" y="5" width="20" height="14" rx="2.5" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </Icon>
    ),
  },
  {
    span: 4,
    title: 'Programa de fidelidade',
    href: '/funcionalidades#fidelidade',
    body: 'Pontos e recompensas automáticos. Cliente volta sem você lembrar.',
    icon: (
      <Icon>
        <circle cx="12" cy="8" r="6" />
        <path d="M8.2 13.2 7 22l5-3 5 3-1.2-8.8" />
      </Icon>
    ),
  },
  {
    span: 4,
    title: 'Clube de assinatura',
    href: '/funcionalidades#dinheiro',
    body: 'Receita recorrente todo mês. Seu cliente assina o serviço.',
    time: true,
    icon: (
      <Icon>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        <path d="M3 21v-5h5" />
      </Icon>
    ),
  },
  {
    span: 4,
    title: 'Fila de espera',
    href: '/funcionalidades#agenda',
    body: 'Vaga cancelada não fica vazia. O próximo é avisado sozinho.',
    time: true,
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </Icon>
    ),
  },
  {
    span: 4,
    title: 'Vários profissionais',
    href: '/funcionalidades#gestao',
    body: 'Cada um com sua agenda e seus serviços.',
    time: true,
    icon: (
      <Icon>
        <path d="M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3.2" />
        <path d="M23 20v-2a4 4 0 0 0-3-3.8" />
        <path d="M16 3.5a4 4 0 0 1 0 7" />
      </Icon>
    ),
  },
  {
    span: 4,
    title: 'Webhooks',
    href: '/funcionalidades#gestao',
    body: 'Discord, Slack, Zapier, n8n - sua agenda avisa onde você já trabalha.',
    time: true,
    icon: (
      <Icon>
        <path d="M18 16.98h-5.99c-1.66 0-3.01-1.34-3.01-3s1.34-3 3.01-3H18" />
        <path d="M6 8.02h6c1.66 0 3 1.34 3 3s-1.34 3-3 3H6" />
        <circle cx="6" cy="8" r="2" />
        <circle cx="18" cy="17" r="2" />
      </Icon>
    ),
  },
  {
    span: 4,
    title: 'Notificações em camadas',
    href: '/funcionalidades#agenda',
    body: 'WhatsApp, e-mail e push do app. A mensagem chega por onde o cliente tá.',
    icon: (
      <Icon>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Z" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </Icon>
    ),
  },
];

export function WhatsInside() {
  return (
    <section className="border-b border-t border-[rgba(10,51,36,.1)] bg-[#cfe7d5] py-[clamp(56px,7vw,80px)]">
      <div className="mx-auto max-w-[1200px] px-[clamp(16px,4vw,40px)]">
        <div className="mx-auto mb-[clamp(30px,4vw,42px)] max-w-[660px] text-center">
          <div className="mb-[14px] inline-flex items-center gap-[9px]">
            <span className="bg-coral h-[2px] w-[20px] rounded-[2px]" />
            <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
              O que vem dentro
            </span>
          </div>
          <h2 className="text-green-deep mx-auto font-serif text-[clamp(26px,4.4vw,38px)] font-normal leading-[1.12] tracking-[-.02em]">
            Tudo que a operação precisa, <span className="italic text-[#0C7E41]">nada</span> que
            atrapalha.
          </h2>
        </div>
        <div className="dmd-bento">
          {CARDS.map((c) => (
            <a key={c.title} href={c.href} className={cn('hv-bd-green', card)} data-span={c.span}>
              {c.time ? <span className={badge}>Time+</span> : null}
              <div className="flex flex-wrap items-start justify-between gap-[24px]">
                <div className="min-w-0 flex-[1_1_240px]">
                  <span className={tile}>{c.icon}</span>
                  <div
                    className={cn(
                      'text-green-deep mb-[7px] font-serif font-medium',
                      c.span === 4 ? 'text-[18px]' : 'text-[20px]',
                      // depois do text-[..]: tailwind-merge trata font-size como
                      // conflitante com leading e descartaria o leading anterior.
                      'leading-[normal]',
                    )}
                  >
                    {c.title}
                  </div>
                  <p
                    className={cn(
                      'text-ink-70 font-sans text-[15px] font-normal leading-[1.55]',
                      c.bodyMax,
                    )}
                  >
                    {c.body}
                  </p>
                </div>
                {c.extra}
              </div>
              <SeeMore />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
