'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import './globals.css';

/**
 * Último recurso: substitui o root layout inteiro, então precisa de <html>/<body> próprios
 * e não pode depender de nada do layout (por isso os estilos são inline-ish, sem componente).
 *
 * ponytail: sem next/font aqui - a fonte cai no fallback (Georgia/system-ui) do font-serif.
 * Tela que ninguém deveria ver não justifica duplicar o setup de fonte do layout.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-cream px-6 text-ink">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-3xl font-semibold">Algo deu errado</h1>
          <p className="mt-3 text-ink-70">
            Tivemos um problema inesperado. Já fomos avisados e estamos olhando.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90"
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
