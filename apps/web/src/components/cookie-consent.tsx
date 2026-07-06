'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

// Aviso de cookies (primeira camada, LGPD/ANPD). O site usa apenas cookies
// essenciais (sessão do Supabase), que não dependem de consentimento prévio -
// por isso é um aviso informativo com aceite, não um gerenciador com toggles de
// rejeição (não há cookie não essencial pra rejeitar). Se um dia entrar pixel/
// analytics, aí sim vira consentimento granular e o disparo passa a checar esta flag.
const CONSENT_KEY = 'demandae-cookie-consent';
const CONSENT_VALUE = 'v1';

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CONSENT_KEY) !== CONSENT_VALUE) setShow(true);
    } catch {
      // localStorage bloqueado (aba anônima/terceiros): não insiste
    }
  }, []);

  if (!show) return null;

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, CONSENT_VALUE);
    } catch {
      // sem persistência: fecha na sessão atual mesmo assim
    }
    setShow(false);
  }

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="border-border bg-ink text-cream shadow-soft animate-rise fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-md rounded-2xl border p-5 sm:left-6 sm:right-auto sm:mx-0"
    >
      <p className="text-cream/85 text-sm leading-relaxed">
        Usamos apenas <strong className="text-cream">cookies essenciais</strong> pra manter seu
        login e o site funcionando. Não usamos cookies de anúncio nem de rastreamento. Veja mais na{' '}
        <Link
          href="/cookies"
          className="text-green-bright font-semibold underline underline-offset-4"
        >
          Política de Cookies
        </Link>
        .
      </p>
      <div className="mt-4">
        <Button onClick={accept} variant="coral" className="h-10 rounded-full px-6">
          Aceitar
        </Button>
      </div>
    </div>
  );
}
