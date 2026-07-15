import * as Sentry from '@sentry/nextjs';

// O client NÃO lê env do bundle sozinho: o DSN precisa vir de NEXT_PUBLIC_* explicitamente.
//
// PII: NÃO declare `dataCollection` nem `sendDefaultPii` (ver sentry.server.config.ts).
//
// Session Replay fica DESLIGADO de propósito: o free tier dá 50 replays/mês e o replay do
// produto é o Microsoft Clarity. Não ligue replaysSessionSampleRate/replaysOnErrorSampleRate.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
  });
}

// Spans de navegação do App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
