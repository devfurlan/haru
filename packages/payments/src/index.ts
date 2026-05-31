/**
 * `@haru/payments` — gateways de pagamento + crypto de credenciais, compartilhado
 * entre `apps/web` (server actions, webhook) e `apps/bot` (cobrança no chat).
 *
 * Antes vivia em `apps/web/src/lib/{crypto,payments}`; foi extraído pra cá pra que o
 * bot também possa criar cobranças sem duplicar a lógica do Asaas.
 *
 * Requer `PAYMENTS_ENCRYPTION_KEY` no env de QUALQUER app que decifre credenciais
 * (web e bot) — o mesmo valor nos dois.
 */

export {
  getGatewayForTenant,
  webhookTokenForTenant,
  type TenantPaymentConfig,
} from './factory.js';

export { encryptSecret, decryptSecret, isEncrypted } from './crypto.js';

export {
  type ChargeMethod,
  type CreateChargeInput,
  type CreateChargeResult,
  type ParsedWebhook,
  type ParseWebhookArgs,
  type PaymentGateway,
  GatewayNotImplementedError,
  PaymentConfigError,
} from './types.js';
