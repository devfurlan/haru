import { Redirect, router, Stack, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { BrandSplash } from '@/components/brand-splash';
import { useAuth } from '@/lib/auth';
import { useOnboarded } from '@/lib/onboarding';
import { attachNotificationTap, registerForPush } from '@/lib/push';

// Tempo mínimo de splash: a janela de boot pode resolver em ~300ms. A entrada
// da marca termina ~3,4s; seguramos a tela até 4,7s pra sobrar ~1,3s com tudo
// montado e parado, dando tempo de ler (não piscar nem parecer bug).
const SPLASH_MIN_MS = 4700;

export default function AppLayout() {
  const { session, loading } = useAuth();
  const onboarded = useOnboarded();
  const [minElapsed, setMinElapsed] = useState(false);

  // Registra o dispositivo pra push assim que houver sessão (best-effort).
  useEffect(() => {
    if (session) registerForPush();
  }, [session]);

  // Só liga o deep-link de toque quando o Stack está montado (senão o router.push
  // do cold start se perde atrás da splash).
  const navReady = !loading && onboarded === true && minElapsed && !!session;
  useEffect(() => {
    if (!navReady) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    attachNotificationTap((id) => router.push(`/appointment/${id}` as Href)).then((fn) => {
      if (cancelled) fn();
      else cleanup = fn;
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [navReady]);

  useEffect(() => {
    const id = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(id);
  }, []);

  // Splash brandada enquanto resolve sessão + primeiro acesso (janela real de boot).
  if (loading || onboarded === null || !minElapsed) return <BrandSplash />;
  // ponytail: cast até o expo-router regenerar os typed routes (a rota /onboarding
  // existe em app/onboarding.tsx; o typegen roda no próximo `expo start`).
  if (!onboarded) return <Redirect href={'/onboarding' as Href} />;
  if (!session) return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
