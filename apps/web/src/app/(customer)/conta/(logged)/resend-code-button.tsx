'use client';

import { useEffect, useState } from 'react';

/**
 * Botão "Reenviar código" com cooldown. O SMS pode demorar a chegar, então
 * bloqueia o reenvio por alguns segundos para o usuário não disparar vários
 * envios à toa. Começa a contar na montagem (o código acabou de ser enviado) e
 * reinicia a cada clique.
 */
export function ResendCodeButton({
  onResend,
  sending,
  seconds = 30,
}: {
  onResend: () => void;
  sending: boolean;
  seconds?: number;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const waiting = remaining > 0;

  return (
    <button
      type="button"
      onClick={() => {
        onResend();
        setRemaining(seconds);
      }}
      disabled={sending || waiting}
      className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline disabled:opacity-50"
    >
      {sending ? 'Reenviando…' : waiting ? `Reenviar código em ${remaining}s` : 'Reenviar código'}
    </button>
  );
}
