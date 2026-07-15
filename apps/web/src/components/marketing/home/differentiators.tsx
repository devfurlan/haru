import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// Quatro diferenciais de mesmo peso num grid 2x2. "Não trava" é a dor nº 1 e só ganha
// destaque de selo + borda verde - não de tamanho, senão os outros três somem.
const ITEMS: { title: string; body: string; icon: ReactNode; flag?: boolean }[] = [
  {
    title: 'Não trava',
    body: 'Sistema leve, abre entre um atendimento e outro. Sem tela branca, sem espera, sem perder o cliente.',
    flag: true,
    icon: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />,
  },
  {
    title: 'Sua marca, não a nossa vitrine',
    body: 'Não somos marketplace. Seu cliente vê você, não a concorrência do lado.',
    icon: (
      <>
        <path d="M6 22V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v18" />
        <path d="M3 22h18" />
        <path d="M9.5 7h.01M14.5 7h.01M9.5 11h.01M14.5 11h.01M9.5 15h.01M14.5 15h.01" />
      </>
    ),
  },
  {
    title: 'Funciona mesmo se o WhatsApp cair',
    body: 'Sua operação não depende da Meta. Se cair lá fora, aqui continua rodando.',
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    title: 'Simples de verdade',
    body: 'Configura em minutos, não em semanas. Sem manual, sem consultoria.',
    icon: (
      <>
        <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
        <path d="m3 12 9 4.5L21 12" />
        <path d="m3 16.5 9 4.5 9-4.5" />
      </>
    ),
  },
];

export function Differentiators() {
  return (
    <section
      id="diferenciais"
      className="bg-green-deep scroll-mt-17.5 relative overflow-hidden py-[clamp(64px,8vw,100px)]"
    >
      <div className="pointer-events-none absolute left-[8%] top-[-90px] h-[400px] w-[400px] bg-[radial-gradient(circle,rgba(47,211,122,.16),transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-110px] right-[5%] h-[460px] w-[460px] bg-[radial-gradient(circle,rgba(255,90,54,.11),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1120px] px-[clamp(20px,5vw,40px)]">
        <div className="mb-[clamp(36px,5vw,52px)] max-w-[660px]">
          <div className="mb-4 inline-flex items-center gap-2">
            <span className="bg-coral h-0.5 w-5 rounded-[2px]" />
            <span className="text-green-bright font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em]">
              Por que Demandaê
            </span>
          </div>
          <h2 className="text-on-emerald mb-3.5 font-serif text-[clamp(30px,5vw,46px)] font-normal leading-[1.08] tracking-[-.02em]">
            Feito por quem já <span className="text-green-bright italic">apanhou</span> de sistema
            ruim.
          </h2>
          <p className="text-on-emerald-mut max-w-[520px] font-sans text-[17px] font-normal leading-[1.55]">
            Cada coisa aqui existe porque um sistema te deixou na mão antes.
          </p>
        </div>

        {/* minmax(min(100%,...)): trava o auto-fit em 2 colunas no desktop (2x2) e
            empilha no mobile sem media query. */}
        <div className="gap-4.5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))]">
          {ITEMS.map((it) => (
            <div
              key={it.title}
              className={cn(
                'bg-green-card relative rounded-[20px] border p-[clamp(24px,2.6vw,30px)]',
                it.flag ? 'border-green-bright/34' : 'border-on-emerald-mut/16',
              )}
            >
              {it.flag ? (
                <span className="bg-coral-tint text-coral absolute right-[clamp(24px,2.6vw,30px)] top-[clamp(24px,2.6vw,30px)] rounded-full px-3 py-1.5 font-sans text-[10px] font-bold uppercase leading-[normal] tracking-[.12em]">
                  A dor nº 1
                </span>
              ) : null}
              <span className="bg-green-bright/13 mb-4 grid h-12 w-12 place-items-center rounded-[var(--radius-icontile)]">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {it.icon}
                </svg>
              </span>
              <div className="text-on-emerald mb-2 font-serif text-[20px] font-medium leading-[1.2]">
                {it.title}
              </div>
              <p className="text-on-emerald-mut max-w-[380px] font-sans text-[14.5px] font-normal leading-[1.6]">
                {it.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
