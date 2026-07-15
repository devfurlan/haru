import * as Sentry from '@sentry/nextjs';

// Igual ao sentry.server.config.ts, mas pro runtime edge (ver comentário sobre PII lá).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['Authorization'];
        delete event.request.headers['x-hub-signature-256'];
      }
      return event;
    },
  });
}
