'use client';

import { GoogleTagManager } from '@next/third-parties/google';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  applyConsent,
  DENY_ALL,
  GRANT_ALL,
  OPEN_CONSENT_EVENT,
  readConsent,
  type ConsentState,
} from '@/lib/consent';

// Banner de consentimento (LGPD/ANPD) + o único ponto onde o GTM entra no site.
//
// O acoplamento é de propósito: o GTM só existe se houver consentimento. Quem
// rejeita não carrega o container - o Google não recebe nem uma requisição. Ver
// lib/consent.ts pro resto do raciocínio.
//
// GA4, Pixel da Meta, Google Ads e Clarity NÃO têm script próprio aqui: todos
// entram COMO TAG DENTRO DO GTM. Um script solto seria um segundo lugar pra olhar
// quando o rastreio quebrar.

export function CookieConsent() {
  // null = ainda não leu o localStorage (SSR/1o render). Sem isto o banner
  // pisca pra quem já escolheu.
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);

  // ANPD p.32/33: categoria não essencial começa DESLIGADA. Nada de pré-marcado.
  const [draft, setDraft] = useState<ConsentState>(DENY_ALL);

  useEffect(() => {
    const stored = readConsent();
    setConsent(stored);
    setReady(true);
    if (!stored) setOpen(true);

    // Reabre pelo link "Gerenciar cookies" (ver cookie-preferences-button.tsx).
    const reopen = () => {
      setDraft(readConsent() ?? DENY_ALL);
      setCustomizing(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  function choose(next: ConsentState) {
    applyConsent(consent, next); // pode recarregar a página, se for revogação
    setConsent(next);
    setOpen(false);
    setCustomizing(false);
  }

  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const loadGtm = ready && consent && (consent.analytics || consent.marketing);

  return (
    <>
      {loadGtm && gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}

      {ready && open ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Preferências de cookies"
          className="border-border bg-ink text-cream shadow-soft animate-rise fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-md rounded-2xl border p-5 sm:left-6 sm:right-auto sm:mx-0"
        >
          {customizing ? (
            <>
              <h2 className="text-cream text-base font-semibold">Preferências de cookies</h2>
              <div className="mt-4 space-y-4">
                <Category
                  checked
                  disabled
                  title="Essenciais"
                  description="Mantêm seu login e o site funcionando. Sempre ativos - sem eles não há serviço."
                />
                <Category
                  checked={draft.analytics}
                  onChange={(v) => setDraft((d) => ({ ...d, analytics: v }))}
                  title="Análise de uso"
                  description="Nos mostram quais telas você usa e onde trava, pra melhorar o produto."
                />
                <Category
                  checked={draft.marketing}
                  onChange={(v) => setDraft((d) => ({ ...d, marketing: v }))}
                  title="Publicidade"
                  description="Medem se nossos anúncios funcionam. Envolvem Meta e Google."
                />
              </div>
              <div className="mt-5 flex gap-2">
                <Button
                  onClick={() => choose(draft)}
                  variant="coral"
                  className="h-10 flex-1 rounded-full px-4"
                >
                  Salvar escolhas
                </Button>
                <Button
                  onClick={() => setCustomizing(false)}
                  variant="ghost"
                  className="text-cream/70 hover:text-cream h-10 rounded-full px-4 hover:bg-white/10"
                >
                  Voltar
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-cream/85 text-sm leading-relaxed">
                Usamos <strong className="text-cream">cookies essenciais</strong> pra manter seu
                login e o site funcionando. Com a sua autorização, usamos também cookies de{' '}
                <strong className="text-cream">análise</strong> e de{' '}
                <strong className="text-cream">publicidade</strong>. Você escolhe, e pode mudar
                quando quiser na{' '}
                <Link
                  href="/cookies"
                  className="text-green-bright font-semibold underline underline-offset-4"
                >
                  Política de Cookies
                </Link>
                .
              </p>
              {/* ANPD p.33: dar destaque só ao aceite é dark pattern. Rejeitar e
                  aceitar saem sólidos, no mesmo tamanho e lado a lado. */}
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => choose(DENY_ALL)}
                  variant="secondary"
                  className="bg-cream text-ink hover:bg-cream/90 h-10 flex-1 rounded-full px-4"
                >
                  Rejeitar não essenciais
                </Button>
                <Button
                  onClick={() => choose(GRANT_ALL)}
                  variant="coral"
                  className="h-10 flex-1 rounded-full px-4"
                >
                  Aceitar todos
                </Button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraft(consent ?? DENY_ALL);
                  setCustomizing(true);
                }}
                className="text-cream/70 hover:text-cream mt-3 w-full text-center text-xs font-semibold underline underline-offset-4"
              >
                Personalizar
              </button>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}

// ponytail: checkbox nativo. Não vale um Switch do Radix (dep nova) pra 2 toggles.
function Category({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    // Só o checkbox esmaece quando é fixo - o texto mantém o contraste. Esmaecer o
    // label inteiro multiplicaria com o text-cream/70 da descrição (~49% efetivo) e
    // deixaria justamente a categoria essencial ilegível.
    <label className={`flex gap-3 ${disabled ? '' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="accent-coral mt-0.5 h-4 w-4 shrink-0 disabled:opacity-60"
      />
      <span className="text-sm leading-snug">
        <span className="text-cream block font-semibold">{title}</span>
        <span className="text-cream/70 block text-xs">{description}</span>
      </span>
    </label>
  );
}
