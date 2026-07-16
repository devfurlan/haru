// POST /api/mobile/v1/reviews/contact { tenantId } - cliente com nota baixa pede que o dono
// entre em contato (acende o sino in-app dele). Envelope sobre lib/reviews.ts:requestOwnerContact.
import { requestOwnerContact } from '@/lib/reviews';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { tenantId?: string } | null;
  if (!body?.tenantId) return Response.json({ error: 'tenantId ausente' }, { status: 400 });

  const res = await requestOwnerContact(account, body.tenantId);
  if ('error' in res) return Response.json(res, { status: 400 });
  return Response.json(res);
}
