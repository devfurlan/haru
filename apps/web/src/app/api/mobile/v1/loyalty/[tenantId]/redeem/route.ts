import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { redeemCustomerLoyaltyPrize } from '@/lib/loyalty-customer';

// Resgate do prêmio pelo cliente: zera o cartão dele neste tenant (valida no servidor
// que está completo). Ver redeemCustomerLoyaltyPrize.
export async function POST(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const { tenantId } = await params;
  const result = await redeemCustomerLoyaltyPrize(account, tenantId);
  if ('error' in result) return Response.json({ error: result.error }, { status: 400 });

  return Response.json(result);
}
