/**
 * Self-check da lógica pura de NFS-e (parser do webhook + gate de config). Não há runner de
 * teste no repo; rode manualmente (o `import 'server-only'` exige a condição react-server):
 *
 *   NODE_OPTIONS="--conditions=react-server" \
 *     ./apps/mobile/node_modules/.bin/tsx apps/web/src/lib/billing/asaas.nf.check.ts
 *
 * Cobre o caminho fiscal/dinheiro: extração do objeto `invoice` dos eventos INVOICE_* e o
 * gate do `nfConfig()`. A idempotência do claim e o roteamento do webhook são DB-transacionais
 * e ficam pra fumaça manual (curl no endpoint) - ver o plano.
 */
import assert from 'node:assert';

import { nfConfig, parseBillingWebhook } from './asaas';

for (const k of Object.keys(process.env)) if (k.startsWith('ASAAS_NF_')) delete process.env[k];
process.env.ASAAS_PLATFORM_WEBHOOK_TOKEN = 'tok';
const hdr = () => new Headers({ 'asaas-access-token': 'tok' });

// 1. INVOICE_AUTHORIZED extrai o objeto invoice e NÃO afeta status da assinatura.
const a = parseBillingWebhook(
  Buffer.from(
    JSON.stringify({
      event: 'INVOICE_AUTHORIZED',
      invoice: { id: 'inv_1', payment: 'pay_1', status: 'AUTHORIZED', pdfUrl: 'https://x/p.pdf', number: '42' },
    }),
  ),
  hdr(),
);
assert.equal(a.event, 'INVOICE_AUTHORIZED');
assert.ok(a.invoice, 'invoice deve existir');
assert.equal(a.invoice.asaasInvoiceId, 'inv_1');
assert.equal(a.invoice.asaasPaymentId, 'pay_1');
assert.equal(a.invoice.pdfUrl, 'https://x/p.pdf');
assert.equal(a.invoice.number, '42');
assert.equal(a.effect, null, 'INVOICE_* não afeta status da assinatura');

// 2. INVOICE_ERROR pega a mensagem de erro (best-effort entre os campos possíveis).
const e = parseBillingWebhook(
  Buffer.from(JSON.stringify({ event: 'INVOICE_ERROR', invoice: { id: 'inv_2', errorMessage: 'ISS inválido' } })),
  hdr(),
);
assert.equal(e.invoice?.error, 'ISS inválido');

// 3. Evento de pagamento normal não traz invoice.
const p = parseBillingWebhook(
  Buffer.from(JSON.stringify({ event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_9', value: 69 } })),
  hdr(),
);
assert.equal(p.invoice, null);
assert.equal(p.effect, 'ACTIVE');

// 4. nfConfig() gate: sem env -> null (modo-marcador, não chama o Asaas).
assert.equal(nfConfig(), null, 'sem config fiscal deve retornar null');

// 5. nfConfig() configurado (via _CODE) -> objeto com defaults de imposto (Simples Nacional).
process.env.ASAAS_NF_SERVICE_DESCRIPTION = 'Assinatura Demandaê';
process.env.ASAAS_NF_MUNICIPAL_SERVICE_CODE = '1.05';
const cfg = nfConfig();
assert.ok(cfg, 'com config deve retornar objeto');
assert.equal(cfg.serviceDescription, 'Assinatura Demandaê');
assert.equal(cfg.municipalServiceCode, '1.05');
assert.equal(cfg.taxes.retainIss, false);
assert.equal(cfg.taxes.iss, 0);

console.log('ok: nf checks passaram');
