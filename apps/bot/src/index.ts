import { Sentry } from './instrument.js';
import Fastify from 'fastify';

import { webhookRoutes } from './routes/webhook.js';
import { startHeartbeat } from './lib/heartbeat.js';
import { startReminderLoop } from './lib/reminders.js';

const app = Fastify({ logger: true });

Sentry.setupFastifyErrorHandler(app);

// Webhook do WhatsApp precisa de raw body para validação de assinatura.
// Registrado como plugin encapsulado para não afetar outras rotas.
app.register(webhookRoutes);

app.get('/health', async () => ({ status: 'ok' }));

startHeartbeat(app.log);
startReminderLoop();

process.on('unhandledRejection', (err) => {
  app.log.error({ err }, 'unhandledRejection');
  Sentry.captureException(err);
});

process.on('uncaughtException', (err) => {
  app.log.error({ err }, 'uncaughtException');
  Sentry.captureException(err);
});

const port = Number(process.env.PORT) || 3001;

app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    Sentry.captureException(err);
    process.exit(1);
  }
});
