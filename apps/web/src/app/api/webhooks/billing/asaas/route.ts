import { prisma } from '@haru/database';

import { BillingConfigError, parseBillingWebhook } from '@/lib/billing/asaas';
import {
  emailPaymentFailed,
  emailPaymentReceipt,
  emailSubscriptionActivated,
  emailSubscriptionSuspended,
} from '@/lib/billing/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/**
 * Webhook do Asaas da PLATAFORMA - confirma/atualiza a assinatura do SaaS. Separado do
 * webhook de pagamentos do tenant (/api/webhooks/payments/[gateway]). Valida o token via
 * env (ASAAS_PLATFORM_WEBHOOK_TOKEN). Responde 200 rápido pra evitar reenvios em loop.
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

  // Evento sem efeito (ex.: PAYMENT_CREATED) ou sem subscription → no-op.
  if (!parsed.effect || !parsed.asaasSubscriptionId) {
    return new Response('OK', { status: 200 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { asaasSubscriptionId: parsed.asaasSubscriptionId },
  });
  // Não achou: pode ser de outro ambiente/sandbox. 200 pra não reenfileirar.
  if (!sub) {
    return new Response('OK', { status: 200 });
  }

  if (parsed.effect === 'ACTIVE') {
    const now = parsed.paidAt ?? new Date();
    const wasActive = sub.status === 'ACTIVE';
    // Dedup: o Asaas manda CONFIRMED e RECEIVED para a MESMA cobrança. Só age (e envia
    // e-mail) na primeira vez que vê este paymentId; a 2ª passa direto (idempotente).
    const alreadyBilled =
      parsed.asaasPaymentId != null && sub.lastBilledPaymentId === parsed.asaasPaymentId;

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: sub.billingCycle === 'ANNUAL' ? addMonths(now, 12) : addMonths(now, 1),
        canceledAt: null,
        lastBilledPaymentId: parsed.asaasPaymentId ?? sub.lastBilledPaymentId,
      },
    });

    if (!alreadyBilled) {
      // 1ª confirmação desta cobrança: ativação (se não estava ativa) ou recibo de renovação.
      const send = wasActive
        ? emailPaymentReceipt(sub.tenantId, parsed.amountCents)
        : emailSubscriptionActivated(sub.tenantId);
      send.catch((err) => console.error('[billing-webhook] email (active) falhou', err));
    }
  } else if (parsed.effect === 'PAST_DUE') {
    // Sem carência: pagamento vencido corta o acesso na hora (PAST_DUE não é ativo).
    // Só marca se já não estiver suspensa/cancelada (não "ressuscita" um cancelamento).
    if (sub.status === 'ACTIVE' || sub.status === 'PENDING') {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'PAST_DUE' },
      });
      emailPaymentFailed(sub.tenantId).catch((err) =>
        console.error('[billing-webhook] email falha de pagamento falhou', err),
      );
    }
  } else if (parsed.effect === 'SUSPENDED') {
    if (sub.status !== 'SUSPENDED') {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'SUSPENDED', canceledAt: new Date() },
      });
      emailSubscriptionSuspended(sub.tenantId).catch((err) =>
        console.error('[billing-webhook] email suspensão falhou', err),
      );
    }
  }

  return new Response('OK', { status: 200 });
}
