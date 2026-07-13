// GET /api/mobile/v1/waitlist - "Meus interesses": as filas WAITING da conta logada, com
// posição e (quando há vaga aberta) o offer. Auth: Bearer da conta.
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { getCustomerWaitlistEntries } from '@/lib/waitlist';

export async function GET(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });
  const entries = await getCustomerWaitlistEntries(account.id, new Date());
  return Response.json({ entries });
}
