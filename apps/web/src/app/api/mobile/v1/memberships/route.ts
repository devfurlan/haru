// GET /api/mobile/v1/memberships - assinaturas do Clube da conta logada (cross-tenant),
// pra tela "Meus créditos". Auth obrigatória: são dados do próprio cliente.
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { getCustomerMemberships } from '@/lib/memberships/customer';

export async function GET(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const memberships = await getCustomerMemberships(account.id);
  return Response.json({ memberships });
}
