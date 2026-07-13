import { BillingConfigError, parseBillingWebhook } from '@/lib/billing/asaas';
import { applyBillingEvent } from '@/lib/billing/webhook-apply';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook do Asaas da PLATAFORMA - confirma/atualiza a assinatura do SaaS e alimenta o
 * ledger de cobranças (Charge: rastreabilidade + gancho de NF). Separado do webhook de
 * pagamentos do tenant (/api/webhooks/payments/[gateway]). Valida o token via env
 * (ASAAS_PLATFORM_WEBHOOK_TOKEN). Responde 200 rápido pra evitar reenvios em loop.
 *
 * A aplicação do evento vive em applyBillingEvent (via ÚNICA, compartilhada com a
 * reconciliação de assinaturas presas em PENDING - lib/billing/reconcile.ts).
 */
export async function POST(req: Request) {
  const rawBody = Buffer.from(await req.arrayBuffer());

  let parsed;
  try {
    parsed = parseBillingWebhook(rawBody, req.headers);
  } catch (err) {
    if (err instanceof BillingConfigError) {
      console.warn(`[billing-webhook] 401: ${err.message}`);
      return new Response('Unauthorized', { status: 401 });
    }
    console.error('[billing-webhook] erro ao parsear', err);
    return new Response('Erro', { status: 400 });
  }

  await applyBillingEvent(parsed);
  return new Response('OK', { status: 200 });
}
