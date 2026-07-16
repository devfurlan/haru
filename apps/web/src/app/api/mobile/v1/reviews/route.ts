// GET  /api/mobile/v1/reviews?tenantId=  -> { rating, comment, canReview } do cliente logado.
// POST /api/mobile/v1/reviews            -> cria/edita a avaliação { tenantId, rating, comment }.
// Envelope fino sobre lib/reviews.ts (mesma engine e gate do web - zero regra nova).
import { canReview, getCustomerReview, upsertReview } from '@/lib/reviews';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function GET(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const tenantId = new URL(req.url).searchParams.get('tenantId');
  if (!tenantId) return Response.json({ error: 'tenantId ausente' }, { status: 400 });

  const [review, can] = await Promise.all([
    getCustomerReview(account, tenantId),
    canReview(account, tenantId),
  ]);
  return Response.json({
    rating: review?.rating ?? null,
    comment: review?.comment ?? null,
    canReview: can,
  });
}

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    tenantId?: string;
    rating?: number;
    comment?: string | null;
  } | null;
  if (!body?.tenantId || typeof body.rating !== 'number') {
    return Response.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const res = await upsertReview(account, body.tenantId, body.rating, body.comment ?? null);
  if ('error' in res) return Response.json(res, { status: 400 });
  return Response.json(res);
}
