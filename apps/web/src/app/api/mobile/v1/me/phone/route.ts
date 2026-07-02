// POST /api/mobile/v1/me/phone - confirma o OTP e passa o número a ser o telefone
// oficial da conta (reivindica os Contacts de mesmo telefone). Body: { phone, code }.
import { changeCustomerPhone } from '@/lib/customer';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    phone?: unknown;
    code?: unknown;
  } | null;
  const phone = typeof body?.phone === 'string' ? body.phone : '';
  const code = typeof body?.code === 'string' ? body.code : '';

  const result = await changeCustomerPhone(account, phone, code);
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json({ ok: true });
}
