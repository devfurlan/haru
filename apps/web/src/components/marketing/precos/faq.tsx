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
    <section
      style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: 'clamp(56px,7vw,84px) clamp(20px,5vw,40px) 20px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div
          style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}
        >
          <span
            style={{
              width: '20px',
              height: '2px',
              background: 'var(--coral)',
              borderRadius: '2px',
            }}
          />
          <span
            style={{
              font: '700 11px var(--font-ui)',
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: '#0C7E41',
            }}
          >
            Dúvidas
          </span>
        </div>
        <h2
          style={{
            font: '400 clamp(28px,4.6vw,38px) var(--font-display)',
            color: 'var(--emerald)',
            letterSpacing: '-.02em',
            margin: 0,
          }}
        >
          Perguntas frequentes.
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--border-soft)',
                borderRadius: '16px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '20px 24px',
                  cursor: 'pointer',
                }}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span style={{ font: '600 16px var(--font-ui)', color: 'var(--ink)' }}>{f.q}</span>
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
                    style={{ flex: 'none' }}
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
                    style={{ flex: 'none' }}
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
              </div>
              {isOpen && (
                <div
                  style={{
                    padding: '0 24px 22px',
                    font: '400 15px/1.6 var(--font-ui)',
                    color: 'var(--ink-70)',
                    animation: 'dmd-fade .28s ease',
                  }}
                >
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
