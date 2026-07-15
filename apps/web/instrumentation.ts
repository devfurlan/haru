import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captura erro não tratado de route handler / server component / server action.
// É o que cobre os crons (/api/cron/*) sem precisar de try/catch em cada um.
export const onRequestError = Sentry.captureRequestError;
