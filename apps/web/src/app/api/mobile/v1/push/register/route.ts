// POST /api/mobile/v1/push/register - registra o Expo push token do dispositivo para
// a conta autenticada. Upsert por token (único): o token sempre mapeia pro dono atual
// do aparelho, então re-registrar após um novo login re-associa corretamente.
import { prisma } from '@haru/database';

import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { expoPushToken?: unknown; platform?: unknown }
    | null;
  const token = typeof body?.expoPushToken === 'string' ? body.expoPushToken : '';
  const platform = typeof body?.platform === 'string' ? body.platform : null;

  if (!/^Expo(nent)?PushToken\[/.test(token)) {
    return Response.json({ error: 'Token inválido' }, { status: 400 });
  }

  await prisma.pushDevice.upsert({
    where: { expoPushToken: token },
    update: { customerAccountId: account.id, platform, lastSeenAt: new Date() },
    create: { expoPushToken: token, customerAccountId: account.id, platform },
  });

  return Response.json({ ok: true });
}
