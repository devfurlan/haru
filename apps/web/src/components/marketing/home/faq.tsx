'use client';

import { useState } from 'react';

export type FaqItem = { q: string; a: string };

// Copy da home. As landings de nicho passam as objeções do nicho (`items`) no mesmo
// acordeão - só muda o conteúdo.
const HOME_FAQS: FaqItem[] = [
  {
    q: 'Meu cliente precisa baixar o app?',
    a: 'Não. O app existe pra quem gosta, mas qualquer cliente agenda pela sua página web pública, direto do navegador, sem instalar nada.',
  },
  {
    q: 'Como divulgo pro meu cliente?',
    a: 'Você ganha um link único - demandae.com/seunegocio - pra colocar na bio do Instagram, no status do WhatsApp, no Google. Quem clica já cai na sua agenda.',
  },
  {
    q: 'Tem limite de agendamentos?',
    a: 'Não. Nenhum plano tem. Agende quanto quiser.',
  },
  {
    q: 'Já uso outra ferramenta. E aí?',
    a: 'A gente te ajuda na migração: serviços, clientes e horários futuros. Você não recomeça do zero.',
  },
  {
    q: 'Serve pro meu tipo de negócio?',
    a: 'Se você trabalha com hora marcada, serve. Barbearia, salão, clínica, estética, podologia, tatuagem, fisioterapia, nutrição, psicologia, estúdio.',
  },
  {
    q: 'Como eu cancelo?',
    a: 'Um clique no painel, sem multa e sem ligação de retenção. Seus dados ficam disponíveis pra exportar por 30 dias.',
  },
];

export function Faq({ items = HOME_FAQS }: { items?: FaqItem[] }) {
  const [open, setOpen] = useState(0);

  return (
    <section
      id="faq"
      className="scroll-mt-17.5 mx-auto max-w-[820px] px-[clamp(20px,5vw,40px)] py-[clamp(56px,7vw,88px)]"
    >
      <div className="mb-9 text-center">
        <div className="mb-3.5 inline-flex items-center gap-2">
          <span className="bg-coral h-0.5 w-5 rounded-[2px]" />
          <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
            Dúvidas
          </span>
        </div>
        <h2 className="text-green-deep font-serif text-[clamp(28px,4.6vw,38px)] font-normal leading-[normal] tracking-[-.02em]">
          O que trava a decisão.
        </h2>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((f, i) => (
          <div key={i} className="border-line bg-paper overflow-hidden rounded-[16px] border">
            <div
              className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5"
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              <span className="text-ink font-sans text-[16px] font-semibold leading-[normal]">
                {f.q}
              </span>
              {open === i ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-none"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ink-50)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-none"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </div>
            {open === i && (
              <div className="text-ink-70 pb-5.5 animate-[dmd-fade_.28s_ease] px-6 font-sans text-[15px] font-normal leading-[1.6]">
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
