import { Redirect, router, Stack, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { BrandSplash } from '@/components/brand-splash';
import { useAuth } from '@/lib/auth';
import { useBoot } from '@/lib/boot';
import { useOnboarded } from '@/lib/onboarding';
import { attachNotificationTap, registerForPush } from '@/lib/push';

// Piso do splash: mesmo com tudo pronto em ~300ms, segura até a animação inteira
// assentar (marca + wordmark + "ê" + tagline + pontos terminam ~2,65s) pra não piscar
// e sumir rápido demais. Depois disso sai assim que o conteúdo da home estiver pronto.
const SPLASH_FLOOR_MS = 2800;
// Teto de segurança: o fetch da home não tem timeout, então se a rede travar o
// splash não pode prender o usuário pra sempre. ponytail: 8s, sobe se a API for lenta.
const SPLASH_CAP_MS = 8000;

export default function AppLayout() {
  const { session, loading } = useAuth();
  const onboarded = useOnboarded();
  const { contentReady } = useBoot();
  // Se o conteúdo já estava pronto quando este layout montou, é remontagem (voltando
  // de /book, que vive fora do grupo (app)) - não é cold boot. Não mostra o splash de
  // novo; o piso só faz sentido na primeira carga. useState(lazy) captura o valor do 1º render.
  const [wasReadyAtMount] = useState(() => contentReady);
  const [floorElapsed, setFloorElapsed] = useState(false);
  const [capElapsed, setCapElapsed] = useState(false);

  useEffect(() => {
    const f = setTimeout(() => setFloorElapsed(true), SPLASH_FLOOR_MS);
    const c = setTimeout(() => setCapElapsed(true), SPLASH_CAP_MS);
    return () => {
      clearTimeout(f);
      clearTimeout(c);
    };
  }, []);

  // Registra o dispositivo pra push assim que houver sessão (best-effort).
  useEffect(() => {
    if (session) registerForPush();
  }, [session]);

  const booting = loading || onboarded === null;
  // O splash (overlay) sai quando a home tem conteúdo (e o piso passou), ou no teto.
  const splashGone = wasReadyAtMount || (contentReady && floorElapsed) || capElapsed;

  // Só liga o deep-link de toque quando a home está visível (senão o router.push do
  // cold start se perde atrás do splash).
  const navReady = !booting && onboarded === true && !!session && splashGone;
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

  // Uma instância só do BrandSplash, por cima de tudo, desde o boot até o conteúdo
  // da home carregar por baixo - some direto pro conteúdo, sem spinner intermediário.
  // (Nos redirects de login/onboarding, o próprio Redirect desmonta este layout e
  // leva o splash junto.) ponytail: cast do href até o typegen do expo-router rodar.
  return (
    <>
      {!booting &&
        (!onboarded ? (
          <Redirect href={'/onboarding' as Href} />
        ) : !session ? (
          <Redirect href="/login" />
        ) : (
          <Stack screenOptions={{ headerShown: false }} />
        ))}
      {!splashGone && <BrandSplash overlay />}
    </>
  );
}
