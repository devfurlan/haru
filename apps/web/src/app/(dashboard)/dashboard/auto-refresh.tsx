'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// "Tempo real" do cockpit sem infra nova: revalida o server component em intervalo + ao voltar
// o foco pra aba. router.refresh() re-executa as queries do servidor (getDashboard etc.) sem
// full reload nem perder estado de client. ponytail: polling + revalidação é suficiente pra
// painel de barbearia; se um dia precisar de push instantâneo, o molde de Supabase Realtime das
// Conversas se aplica a Appointment/Payment.
export function AutoRefresh({ intervalMs = 45_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    // Não bate no banco com a aba escondida; ao reabrir/focar, atualiza na hora.
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    const id = setInterval(refreshIfVisible, intervalMs);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [router, intervalMs]);

  return null;
}
