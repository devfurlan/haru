import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { getCustomerLoyaltyCard } from '@/lib/loyalty-customer';

// Detalhe de um cartão (grid de carimbos + últimas visitas). 404 se o cliente não tem
// esse cartão (sem Contact no tenant ou sem programa ativo).
export async function GET(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const { tenantId } = await params;
  const card = await getCustomerLoyaltyCard(account, tenantId);
  if (!card) return Response.json({ error: 'Cartão não encontrado' }, { status: 404 });

  return Response.json(card);
}
