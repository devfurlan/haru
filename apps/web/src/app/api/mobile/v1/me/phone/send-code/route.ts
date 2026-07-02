// POST /api/mobile/v1/me/phone/send-code - envia o OTP por SMS pro NOVO número antes
// de trocar/confirmar o telefone. Body: { phone }.
import { sendPhoneChangeCode } from '@/lib/customer';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = typeof body?.phone === 'string' ? body.phone : '';

  const result = await sendPhoneChangeCode(account, phone);
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json({ ok: true });
}
