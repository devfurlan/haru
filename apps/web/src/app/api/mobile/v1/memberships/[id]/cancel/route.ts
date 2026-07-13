// POST /api/mobile/v1/memberships/[id]/cancel - cancela a assinatura do Clube (self-service).
// Para as cobranças futuras, mas os créditos valem até o fim do período já pago. A engine
// (cancelServiceSubscription) trava por customerAccountId. Idempotente: já cancelada = ok.
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { cancelServiceSubscription } from '@/lib/memberships/subscribe';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const result = await cancelServiceSubscription({
    membershipId: id,
    customerAccountId: account.id,
  });
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json(result);
}
