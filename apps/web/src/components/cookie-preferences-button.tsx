'use client';

import { OPEN_CONSENT_EVENT } from '@/lib/consent';

// Reabre o banner pra rever a escolha. Sem isto o consentimento é uma via de mão
// única: o localStorage persiste e o usuário nunca mais mudaria de ideia - o que a
// LGPD não permite (art. 8º, §5º: revogável a qualquer momento).
//
// Ainda NÃO está montado em lugar nenhum: entra na Política de Cookies e/ou no
// rodapé junto com a revisão do texto legal.
export function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className={className ?? 'font-medium underline underline-offset-4'}
    >
      Gerenciar cookies
    </button>
  );
}
