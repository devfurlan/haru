// POST /api/mobile/v1/me/phone/send-code - envia o OTP por SMS pro NOVO número antes
// de trocar/confirmar o telefone. Body: { phone }.
import { sendPhoneChangeCode } from '@/lib/customer';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';
import { withinRateLimit, withinRateLimitFor } from '@/lib/ratelimit';

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  // Cada chamada dispara um SMS pago (Twilio). Throttle por conta E por IP contra SMS
  // pumping (loop variando o número de destino esvaziaria o saldo Twilio).
  const tooMany =
    !(await withinRateLimitFor(account.id, 'send-code-acct', 3, 600)) ||
    !(await withinRateLimit(req, 'send-code-ip', 5, 600));
  if (tooMany)
    return Response.json(
      { error: 'Muitas tentativas de envio. Aguarde alguns minutos.' },
      { status: 429 },
    );

  const body = (await req.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = typeof body?.phone === 'string' ? body.phone : '';

  const result = await sendPhoneChangeCode(account, phone);
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json({ ok: true });
}
