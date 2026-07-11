'use client';

import { useState } from 'react';

import { Container } from './container';

const faqs = [
  {
    q: 'Meu cliente precisa baixar o app?',
    a: 'Não. O app existe pra quem gosta, mas qualquer cliente agenda pela sua página web pública, direto do navegador, sem instalar nada.',
  },
  {
    q: 'Como divulgo pro meu cliente?',
    a: 'Você ganha um link único - demandae.com/seunegocio - pra colocar na bio do Instagram, no status do WhatsApp, no Google. Quem clica já cai na sua agenda.',
  },
  {
    q: 'Já uso outra ferramenta. E aí?',
    a: 'A gente te ajuda na migração: serviços, clientes e horários futuros. Você não recomeça do zero.',
  },
  {
    q: 'Preciso de WhatsApp Business API?',
    a: 'Não. As confirmações e lembretes do plano base já saem sem você configurar nada. API só seria assunto do addon de atendente IA, quando lançar - e aí a gente te guia.',
  },
  {
    q: 'Como eu cancelo?',
    a: 'Um clique no painel, sem multa e sem ligação de retenção. Seus dados ficam disponíveis pra exportar por 30 dias.',
  },
];

export function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="bg-cream">
      <Container className="max-w-[880px] py-24">
        <div className="mb-11 text-center">
          <div className="text-sub mb-4 text-[0.72rem] font-bold uppercase tracking-[0.15em]">
            Dúvidas rápidas
          </div>
          <h2 className="font-serif text-[clamp(2rem,4vw,2.6rem)] font-medium leading-[1.08] tracking-[-0.02em]">
            Perguntas que todo mundo faz
          </h2>
        </div>
        <div className="border-edge border-t">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-edge border-b">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="hover:bg-paper flex w-full items-center justify-between gap-6 px-2.5 py-6 text-left transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-ink font-serif text-[1.15rem] font-semibold">{f.q}</span>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-[1.5px] text-xl font-normal transition-transform duration-300 ${
                      isOpen
                        ? 'border-coral text-coral rotate-45'
                        : 'border-green-deep text-green-deep'
                    }`}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-ink-70 max-w-[680px] px-2.5 pb-6 text-[1rem] leading-[1.65]">
                      {f.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
