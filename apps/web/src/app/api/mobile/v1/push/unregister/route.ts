// POST /api/mobile/v1/push/unregister - remove o token do dispositivo (chamado no
// logout, pra um aparelho deslogado parar de receber push da conta).
import { prisma } from '@haru/database';

import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { expoPushToken?: unknown } | null;
  const token = typeof body?.expoPushToken === 'string' ? body.expoPushToken : '';
  if (token) {
    await prisma.pushDevice.deleteMany({
      where: { expoPushToken: token, customerAccountId: account.id },
    });
  }

  return Response.json({ ok: true });
}
