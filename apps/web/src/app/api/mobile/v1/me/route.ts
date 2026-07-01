// GET /api/mobile/v1/me - dados básicos da conta do cliente autenticado (app mobile).
// Serve pro app saber o estado de auth e se o telefone já foi verificado.
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function GET(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  return Response.json({
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    pendingPhone: account.pendingPhone,
    phoneVerified: account.phone != null,
  });
}
