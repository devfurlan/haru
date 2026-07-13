// POST /api/mobile/v1/tenants/[slug]/subscribe - assina um plano do Clube (assinatura de
// serviços). Body: { planId, method: 'PIX'|'CREDIT_CARD', document? }. Reusa a engine
// (createServiceSubscription): cria a Membership PENDING + a assinatura recorrente no
// gateway do PRÓPRIO tenant e devolve o checkout hospedado (mesma forma do /pay). Sempre
// responde 200: o app inspeciona `ok`/`error`/`needsDocument` (fluxo de CPF). A ativação e
// os créditos são webhook-driven.
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { createServiceSubscription } from '@/lib/memberships/subscribe';
import { withinRateLimit } from '@/lib/ratelimit';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  // Cada chamada cria assinatura no gateway (custo real). Mesmo aperto do /pay.
  if (!(await withinRateLimit(req, 'subscribe', 6, 60)))
    return Response.json({ error: 'Muitas requisições. Tente em instantes.' }, { status: 429 });

  // Cobrança recorrente exige conta (o pagador). O app é login-gated aqui.
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const { slug } = await params;
  const body = (await req.json().catch(() => null)) as {
    planId?: unknown;
    method?: unknown;
    document?: unknown;
  } | null;

  const planId = typeof body?.planId === 'string' ? body.planId : '';
  const method =
    body?.method === 'PIX' || body?.method === 'CREDIT_CARD' ? body.method : 'CREDIT_CARD';
  const document = typeof body?.document === 'string' ? body.document : undefined;

  if (!planId) return Response.json({ error: 'Plano inválido' }, { status: 400 });

  const result = await createServiceSubscription({
    slug,
    planId,
    customerAccountId: account.id,
    method,
    document,
  });
  return Response.json(result);
}
