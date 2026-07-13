/**
 * Self-check das partes NÃO-triviais do @haru/payments SEM rede: o parse do webhook do
 * Asaas (validação do token + extração dos campos de recorrência) e o mapa evento→status.
 * createCharge/createSubscription batem na API do Asaas e ficam de fora (precisam de rede).
 *
 *   npx tsx packages/payments/src/selfcheck.ts
 */
import assert from 'node:assert/strict';

import { AsaasGateway } from './asaas';
import { PaymentConfigError } from './types';

const gw = new AsaasGateway({ apiKey: 'x', sandbox: true });
const TOKEN = 'webhook-token-123';

/** Monta os args do parseWebhook com o token correto (a menos que `token` seja passado). */
function parse(body: unknown, token: string = TOKEN) {
  return gw.parseWebhook({
    rawBody: Buffer.from(JSON.stringify(body)),
    headers: new Headers({ 'asaas-access-token': token }),
    webhookToken: TOKEN,
  });
}

// --- Cobrança RECORRENTE de assinatura (o caso novo) -------------------------
const recurring = parse({
  event: 'PAYMENT_RECEIVED',
  payment: {
    id: 'pay_ciclo1',
    subscription: 'sub_abc',
    externalReference: 'membership_xyz',
    billingType: 'CREDIT_CARD',
    value: 150.0,
    dueDate: '2026-08-01',
    paymentDate: '2026-08-01',
    creditCard: { creditCardNumber: '4242', creditCardBrand: 'VISA' },
  },
});
assert.equal(recurring.status, 'PAID', 'PAYMENT_RECEIVED -> PAID');
assert.equal(recurring.subscriptionExternalId, 'sub_abc', 'extrai payment.subscription');
assert.equal(recurring.externalReference, 'membership_xyz', 'extrai externalReference');
assert.equal(recurring.amountCents, 15000, 'value em reais -> centavos');
assert.equal(recurring.cardLast4, '4242');
assert.equal(recurring.cardBrand, 'VISA');
assert.equal(recurring.event, 'PAYMENT_RECEIVED');
assert.ok(recurring.paidAt instanceof Date, 'paidAt setado no PAID');

// --- Cartão recusado no fim do dunning: FAILED (gap que faltava mapear) -------
const refused = parse({
  event: 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  payment: { id: 'pay_x', subscription: 'sub_abc', value: 150.0 },
});
assert.equal(refused.status, 'FAILED', 'CAPTURE_REFUSED -> FAILED');
assert.equal(refused.paidAt, null, 'sem paidAt quando não pago');

// --- Vencido (dunning em curso) -> EXPIRED -----------------------------------
assert.equal(parse({ event: 'PAYMENT_OVERDUE', payment: { id: 'p' } }).status, 'EXPIRED');

// --- Cobrança AVULSA (sem assinatura): campos de recorrência ficam null -------
const avulso = parse({
  event: 'PAYMENT_CONFIRMED',
  payment: { id: 'pay_avulso', value: 80.0 },
});
assert.equal(avulso.status, 'PAID');
assert.equal(avulso.subscriptionExternalId, null, 'avulso não tem subscription');
assert.equal(avulso.externalReference, null);

// --- Segurança: token do webhook errado é recusado (fail-closed) --------------
assert.throws(
  () => parse({ event: 'PAYMENT_RECEIVED', payment: { id: 'p' } }, 'token-errado'),
  PaymentConfigError,
  'token inválido deve lançar PaymentConfigError',
);

// --- Sem payment.id: recusa (não dá pra reconciliar) --------------------------
assert.throws(() => parse({ event: 'SUBSCRIPTION_DELETED', subscription: { id: 's' } }), PaymentConfigError);

console.log('✓ payments selfcheck: parse de webhook recorrente/avulso, status e token OK');
