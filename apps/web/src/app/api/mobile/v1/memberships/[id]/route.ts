// GET /api/mobile/v1/memberships/[id] - uma assinatura + histórico de cobranças, pra tela
// "Gerenciar assinatura". Trava por customerAccountId (dono do pagamento) - 404 se não for dela.
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { getCustomerMembershipDetail } from '@/lib/memberships/customer';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const detail = await getCustomerMembershipDetail(account.id, id);
  if (!detail) return Response.json({ error: 'Assinatura não encontrada' }, { status: 404 });
  return Response.json(detail);
}
