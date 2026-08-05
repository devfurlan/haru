'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

// "Tempo real" do painel sem perder estado de client: router.refresh() re-executa as queries do
// servidor (getDashboard, agenda etc.) e re-renderiza o server component, sem full reload.
//
// Dois gatilhos:
//  - `table`: Supabase Realtime. Revalida SÓ quando a tabela muda de verdade (RLS escopa por
//    tenant - ver migration 20260804230000_appointment_realtime). É o barato: sem mudança,
//    zero invocação e zero query.
//  - intervalo: rede de segurança pra websocket caído/evento perdido. Sem realtime é o gatilho
//    principal (45s); com realtime afrouxa pra 5 min.
//
// Nos dois casos: nunca bate no banco com a aba escondida, e atualiza na hora ao voltar o foco.
export function AutoRefresh({ table, intervalMs }: { table?: string; intervalMs?: number }) {
  const router = useRouter();
  const every = intervalMs ?? (table ? 300_000 : 45_000);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    const id = setInterval(refreshIfVisible, every);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [router, every]);

  useEffect(() => {
    if (!table) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    // Junta rajadas (criar uma série gera N inserts) num refresh só.
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const refreshSoon = () => {
      // Aba escondida não revalida: o listener de foco cuida disso na volta.
      if (document.visibilityState !== 'visible') return;
      clearTimeout(debounce);
      debounce = setTimeout(() => router.refresh(), 800);
    };

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      // Necessário pra o socket carregar o JWT e o RLS escopar por tenant.
      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel(`auto-refresh:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, refreshSoon)
        .subscribe();
    })();

    // Renova o token no socket quando o Supabase refaz a sessão (~1h), senão o realtime perde
    // autorização e os eventos filtrados por RLS param.
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        supabase.realtime.setAuth(session?.access_token ?? null).catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(debounce);
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [router, table]);

  return null;
}
