// POST /api/mobile/v1/me/phone/pending - grava o WhatsApp como PENDENTE (sem OTP), pro
// onboarding de quem entrou com Google e ainda não tem número. Espelha o cadastro por
// senha (pendingPhone): o agendamento passa a conhecer o telefone e nunca mais pede.
// A confirmação por SMS (claim do histórico) continua sendo o fluxo separado /me/phone.
import { setCustomerPendingPhone } from '@/lib/customer';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = typeof body?.phone === 'string' ? body.phone : '';

  const result = await setCustomerPendingPhone(account, phone);
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json({ ok: true });
}
