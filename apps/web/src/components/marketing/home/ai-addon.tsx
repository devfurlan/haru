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
    // Faixa bege full-bleed (mesma cor da hairline do DS), entre a HowItWorks (paper) e a
    // Faq (cream): dá banda própria ao addon sem virar caixa centralizada. Literal como os
    // outros bands da home (#cfe7d5 na for-client/whats-inside).
    <section id="addon" className="border-edge bg-line border-b border-t">
      {/* Sidebar do Every Layout: texto manda no espaço livre (grow 999) e o card fica nos
          400px de base. Quando o texto não couber em 420px, os dois quebram pra 100% - por
          isso não precisa de media query. */}
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-[clamp(32px,5vw,64px)] px-[clamp(16px,4vw,40px)] py-[clamp(56px,7vw,88px)]">
        <div className="min-w-[min(100%,420px)] flex-[999_1_0]">
          <span className="border-edge bg-paper text-ink-70 mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 font-sans text-[11px] font-bold uppercase leading-[normal] tracking-[.14em]">
            <span className="bg-green-bright h-1.5 w-1.5 flex-none animate-[pulse-ring_2s_infinite] rounded-[50%]" />
            Em desenvolvimento
          </span>
          <h2 className="text-green-deep mb-3.5 font-serif text-[clamp(30px,3.4vw,36px)] font-medium leading-[1.1] tracking-[-.02em]">
            Addon: atendente IA <span className="font-normal italic">no WhatsApp</span>
          </h2>
          <p className="text-ink-70 max-w-[520px] font-sans text-[16px] font-normal leading-[1.6]">
            Pra quem quiser, um atendente que conversa com o cliente e marca o horário direto no
            WhatsApp - em cima da mesma agenda, sem virar um segundo sistema. Tá no forno; entra na
            lista que a gente te chama pra testar primeiro.
          </p>
        </div>

        <div className="border-edge bg-paper flex-[1_1_400px] rounded-[18px] border p-7">
          <div className="text-ink mb-1 font-serif text-[18.5px] font-semibold leading-[normal]">
            Quer testar primeiro?
          </div>
          <p className="text-ink-70 mb-5 font-sans text-[14.5px] font-normal leading-[1.5]">
            Entre na lista de espera e a gente te avisa assim que abrir.
          </p>

          {subscribed ? (
            <div className="bg-chip flex items-center gap-3 rounded-[14px] border border-[rgba(15,126,65,.22)] p-4">
              <span className="bg-green-bright h-6.5 w-6.5 grid flex-none place-items-center rounded-[50%]">
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
              <span className="text-green-deep font-sans text-[14px] font-semibold leading-[1.4]">
                Você tá na lista. A gente te chama pra testar primeiro.
              </span>
            </div>
          ) : (
            <>
              <div className="border-edge bg-cream mb-2.5 flex items-center gap-2.5 rounded-[14px] border px-3.5">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--ink-30)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-none"
                  aria-hidden
                >
                  <rect x="2" y="5" width="20" height="14" rx="2.5" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                <input
                  ref={emailRef}
                  type="email"
                  aria-label="Seu email"
                  placeholder="seu@email.com.br"
                  className="text-ink caret-coral min-w-0 flex-1 bg-transparent py-3.5 font-sans text-[15px] font-semibold leading-[normal] outline-none"
                />
              </div>
              <button
                onClick={onSubscribe}
                className="dmd-btn bg-coral h-12 w-full cursor-pointer rounded-[14px] font-sans text-[16px] font-bold leading-[normal] text-white shadow-[var(--shadow-cta)]"
              >
                Entrar na lista de espera
              </button>
            </>
          )}

          <div className="text-ink-30 mt-3 text-center font-sans text-[12px] font-medium leading-[normal]">
            Sem spam. Só o aviso do lançamento.
          </div>
        </div>
      </div>
    </section>
  );
}
