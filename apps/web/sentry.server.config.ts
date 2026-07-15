import * as Sentry from '@sentry/nextjs';

// Mesma política do bot (apps/bot/src/instrument.ts): só liga em produção e com DSN presente.
// O DSN do server é lido automaticamente de SENTRY_DSN pelo SDK, mas deixamos explícito
// pra poder gatear o init.
//
// PII: NÃO declare `dataCollection` nem `sendDefaultPii` aqui. O default do SDK já é sem PII
// (userInfo: false). `dataCollection: {}` vazio cai em defaults MAIS permissivos que
// `sendDefaultPii: false` - declarar "pra ficar explícito" LIGA coleta de PII sem querer.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
    beforeSend(event) {
      // Headers com segredo: webhook do Asaas manda token em header.
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['Authorization'];
        delete event.request.headers['x-hub-signature-256'];
      }
      return event;
    },
  });
}
