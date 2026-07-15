import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Precisa ser importado ANTES de tudo no _layout.tsx: supabase.ts e api.ts fazem
// `throw` em escopo de módulo (env faltando), e esses throws rodam na resolução dos
// imports - um Sentry.init() no corpo do _layout nunca os veria.
if (dsn) {
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    enabled: !__DEV__,
    // ponytail: sem `integrations` - expoRouterIntegration/expoContext/expoUpdates já
    // entram por default. Sem `release`/`dist` - o fallback nativo resolve e casa com
    // o sourcemap (appVersionSource: remote); setar à mão QUEBRA o match.
  });
}

export { Sentry };
