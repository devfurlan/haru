'use client';

import { useState } from 'react';

const FAQS = [
  {
    q: 'Tem plano grátis ou período de teste?',
    a: 'Não temos plano grátis. Temos algo melhor: garantia de 30 dias com devolução integral. Você contrata, usa o produto inteiro sem nenhuma limitação, e se não gostar devolvemos tudo. Sem pergunta, sem burocracia.',
  },
  { q: 'Tem limite de agendamentos?', a: 'Não. Nenhum plano tem. Agende quanto quiser.' },
  {
    q: 'Vocês cobram por mensagem enviada?',
    a: 'Não. Sua fatura é sempre o valor do plano, todo mês.',
  },
  {
    q: 'E se eu passar da cota de lembretes por WhatsApp?',
    a: 'Os lembretes por WhatsApp pausam até o próximo ciclo. Seus clientes continuam recebendo confirmação e lembrete por e-mail e push, normalmente. Avisamos em 80% da cota, e você pode subir de plano a qualquer momento.',
  },
  { q: 'Tem taxa de setup?', a: 'Não. Você paga a mensalidade e começa a usar.' },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Sem multa, sem fidelidade, sem precisar ligar pra ninguém. Cancela pelo painel.',
  },
  {
    q: 'Meu estabelecimento aparece junto com concorrentes?',
    a: 'Não. Cada cliente tem a própria página, com a própria marca. Não somos marketplace.',
  },
  {
    q: 'E se minha equipe crescer?',
    a: 'Enquanto couber na faixa do seu plano, a mensalidade não muda. Se passar, é só subir de plano.',
  },
  {
    q: 'Já uso outro sistema. Dá pra migrar?',
    a: 'Dá. A gente migra seus clientes, serviços e histórico pra você. Sem custo.',
  },
  {
    q: 'Como funciona o pagamento anual?',
    a: 'Você paga 10 meses e usa 12. À vista ou parcelado em até 12x no cartão.',
  },
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="mx-auto max-w-[820px] px-[clamp(20px,5vw,40px)] pb-[20px] pt-[clamp(56px,7vw,84px)]">
      <div className="mb-[36px] text-center">
        <div className="mb-[14px] inline-flex items-center gap-[9px]">
          <span className="bg-coral h-[2px] w-[20px] rounded-[2px]" />
          <span className="font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.16em] text-[#0C7E41]">
            Dúvidas
          </span>
        </div>
        <h2 className="text-green-deep font-serif text-[clamp(28px,4.6vw,38px)] font-normal leading-[normal] tracking-[-.02em]">
          Perguntas frequentes.
        </h2>
      </div>
      <div className="flex flex-col gap-[12px]">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="bg-paper border-line overflow-hidden rounded-[16px] border">
              <div
                className="flex cursor-pointer items-center justify-between gap-[16px] px-[24px] py-[20px]"
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span className="text-ink font-sans text-[16px] font-semibold leading-[normal]">
                  {f.q}
                </span>
                {isOpen ? (
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
              {isOpen && (
                <div className="text-ink-70 animate-[dmd-fade_.28s_ease] px-[24px] pb-[22px] font-sans text-[15px] font-normal leading-[1.6]">
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
