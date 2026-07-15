'use client';

import { useState } from 'react';

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

export function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section
      style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: 'clamp(56px,7vw,88px) clamp(20px,5vw,40px) clamp(20px,3vw,28px)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '9px',
            marginBottom: '14px',
          }}
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
            margin: '0',
          }}
        >
          O que trava a decisão.
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {faqs.map((f, i) => (
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
              onClick={() => setOpen(open === i ? -1 : i)}
            >
              <span style={{ font: '600 16px var(--font-ui)', color: 'var(--ink)' }}>{f.q}</span>
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
            {open === i && (
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
        ))}
      </div>
    </section>
  );
}
