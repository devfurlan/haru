import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { getCustomerLoyaltyCards } from '@/lib/loyalty-customer';

// Cartões de fidelidade do cliente (um por estabelecimento com programa ativo onde ele
// já tem carimbo). Cross-tenant, derivado do histórico - ver lib/loyalty-customer.ts.
export async function GET(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const cards = await getCustomerLoyaltyCards(account);
  return Response.json({ cards });
}
