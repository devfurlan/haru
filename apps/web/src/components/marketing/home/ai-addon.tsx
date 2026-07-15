'use client';

import { useRef, useState } from 'react';

export function AiAddon() {
  const [subscribed, setSubscribed] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const onSubscribe = () => {
    const v = (emailRef.current?.value || '').trim();
    if (v.includes('@') && v.length > 4) setSubscribed(true);
  };

  return (
    <section
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: 'clamp(8px,2vw,20px) clamp(20px,5vw,40px) clamp(40px,5vw,60px)',
        paddingTop: 'clamp(40px,5vw,60px)',
      }}
    >
      <div
        style={{
          position: 'relative',
          background: 'var(--paper)',
          border: '1px solid var(--border)',
          borderRadius: '26px',
          padding: 'clamp(30px,4vw,48px)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(15,126,65,.09) 1.1px,transparent 1.1px)',
            backgroundSize: '16px 16px',
            opacity: '.7',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            maxWidth: '580px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              font: '700 10px var(--font-ui)',
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-50)',
              background: 'var(--cream)',
              border: '1px solid var(--border-soft)',
              borderRadius: '999px',
              padding: '7px 14px',
              marginBottom: '20px',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'var(--green)',
                animation: 'dmd-pulse 2s infinite',
              }}
            />
            Em desenvolvimento
          </span>
          <h2
            style={{
              font: '400 clamp(24px,3.7vw,34px)/1.12 var(--font-display)',
              color: 'var(--emerald)',
              letterSpacing: '-.02em',
              margin: '0 auto 14px',
              maxWidth: '480px',
            }}
          >
            Addon: atendente IA no WhatsApp
          </h2>
          <p
            style={{
              font: '400 15.5px/1.6 var(--font-ui)',
              color: 'var(--ink-70)',
              margin: '0 auto',
              maxWidth: '520px',
            }}
          >
            Pra quem quiser, um atendente virtual que conversa com o cliente e marca o horário
            direto no WhatsApp - usando a mesma agenda, sem virar um segundo sistema.
            <br />
            Tá no forno! Entra na lista que a gente te chama pra usar primeiro:
          </p>

          {!subscribed && (
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: '480px',
                margin: '24px auto 0',
              }}
            >
              <div
                style={{
                  flex: '1',
                  minWidth: '220px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'var(--paper)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '0 16px',
                }}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ink-30)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flex: 'none' }}
                >
                  <rect x="2" y="5" width="20" height="14" rx="2.5" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                <input
                  ref={emailRef}
                  type="email"
                  placeholder="seu@email.com.br"
                  style={{
                    flex: '1',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    font: '600 15px var(--font-ui)',
                    color: 'var(--ink)',
                    caretColor: 'var(--coral)',
                    minWidth: '0',
                    padding: '15px 0',
                  }}
                />
              </div>
              <button
                onClick={onSubscribe}
                style={{
                  flex: 'none',
                  background: 'var(--coral)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '15px 22px',
                  font: '700 14px var(--font-ui)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-cta)',
                  transition: 'transform 130ms ease',
                }}
              >
                Entrar na lista de espera
              </button>
            </div>
          )}
          {subscribed && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '11px',
                maxWidth: '480px',
                margin: '24px auto 0',
                background: 'var(--green-tint)',
                border: '1px solid rgba(15,126,65,.22)',
                borderRadius: '14px',
                padding: '16px',
              }}
            >
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--green)',
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#083020"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span
                style={{
                  font: '600 14.5px var(--font-ui)',
                  color: 'var(--emerald)',
                }}
              >
                Você tá na lista. A gente te chama pra testar primeiro.
              </span>
            </div>
          )}
          <div
            style={{
              font: '500 12.5px var(--font-ui)',
              color: 'var(--ink-50)',
              marginTop: '13px',
            }}
          >
            Sem spam. Só o aviso do lançamento.
          </div>
        </div>
      </div>
    </section>
  );
}
