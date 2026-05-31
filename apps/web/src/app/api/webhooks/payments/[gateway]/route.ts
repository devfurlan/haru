import { type PaymentProvider, type PaymentStatus, prisma } from '@haru/database';

import { getGatewayForTenant, webhookTokenForTenant } from '@/lib/payments/factory';
import { PaymentConfigError } from '@/lib/payments/types';
import { notifyPaymentConfirmed } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SLUG_TO_PROVIDER: Record<string, PaymentProvider> = {
  asaas: 'ASAAS',
  mercado_pago: 'MERCADO_PAGO',
  mercadopago: 'MERCADO_PAGO',
  pagbank: 'PAGBANK',
  pagseguro: 'PAGBANK',
  pagarme: 'PAGARME',
};

/** Status já finalizados — não reescrevemos (idempotência contra reenvios). */
const FINAL: ReadonlySet<PaymentStatus> = new Set(['PAID', 'REFUNDED', 'CANCELED', 'FAILED']);

/** Status simplificado do parseWebhook → PaymentStatus do banco. */
function toPaymentStatus(s: string): PaymentStatus | null {
  switch (s) {
    case 'PAID':
    case 'FAILED':
    case 'EXPIRED':
    case 'REFUNDED':
    case 'CANCELED':
      return s;
    default:
      return null; // PENDING / desconhecido → no-op
  }
}

/**
 * Recebe confirmações de pagamento dos gateways. Idempotente; NÃO altera o status do
 * Appointment (pagamento é opcional e independente da agenda). Responde 200 rápido
 * sempre que possível pra evitar reenvios em loop.
 */
export async function POST(req: Request, { params }: { params: Promise<{ gateway: string }> }) {
  const { gateway } = await params;
  const provider = SLUG_TO_PROVIDER[gateway.toLowerCase()];
  if (!provider) {
    return new Response('Gateway desconhecido', { status: 404 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());

  // Extrai os identificadores sem confiar no payload pra autenticidade ainda — só pra
  // achar o Payment (e portanto o tenant, dono do token de validação).
  let externalId: string | null = null;
  let externalReference: string | null = null;
  try {
    const body = JSON.parse(rawBody.toString('utf8')) as {
      payment?: { id?: string; externalReference?: string };
    };
    externalId = body.payment?.id ?? null;
    externalReference = body.payment?.externalReference ?? null;
  } catch {
    return new Response('Corpo inválido', { status: 400 });
  }

  // Resolve o Payment por (provider, externalId); fallback por externalReference (nosso id).
  const payment =
    (externalId
      ? await prisma.payment.findUnique({
          where: { provider_externalId: { provider, externalId } },
          include: { tenant: true },
        })
      : null) ??
    (externalReference
      ? await prisma.payment.findUnique({
          where: { id: externalReference },
          include: { tenant: true },
        })
      : null);

  // Não achou: pode ser de outro ambiente/sandbox. Responde 200 pra não reenfileirar.
  if (!payment) {
    return new Response('OK', { status: 200 });
  }

  // Valida autenticidade com o adapter (header/token do tenant).
  try {
    const webhookToken = webhookTokenForTenant(payment.tenant);
    const gw = getGatewayForTenant(payment.tenant);
    const parsed = gw.parseWebhook({ rawBody, headers: req.headers, webhookToken });

    const nextStatus = toPaymentStatus(parsed.status);
    if (!nextStatus) {
      return new Response('OK', { status: 200 });
    }

    // Idempotência: se já está num status final igual ao recebido, não reescreve.
    if (payment.status === nextStatus || FINAL.has(payment.status)) {
      return new Response('OK', { status: 200 });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        paidAt: nextStatus === 'PAID' ? (parsed.paidAt ?? new Date()) : payment.paidAt,
      },
    });

    if (nextStatus === 'PAID') {
      notifyPaymentConfirmed(payment.id).catch((err) =>
        console.error('[payments-webhook] notify falhou', err),
      );
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    if (err instanceof PaymentConfigError) {
      return new Response('Unauthorized', { status: 401 });
    }
    console.error('[payments-webhook] erro', err);
    return new Response('Erro', { status: 500 });
  }
}
