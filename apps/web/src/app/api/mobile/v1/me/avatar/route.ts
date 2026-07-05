// POST /api/mobile/v1/me/avatar   - troca a foto de perfil do cliente (app mobile).
// DELETE /api/mobile/v1/me/avatar - remove a foto.
// O app redimensiona a imagem (128px) e manda os bytes em base64 no JSON - um avatar
// reduzido é pequeno, então base64 evita a fricção de multipart no RN. Upload/remoção
// server-side com service role; o arquivo antigo é apagado do bucket ao trocar.
import { prisma } from '@haru/database';

import { removeAvatar, uploadAvatar, validateAvatarBuffer } from '@/lib/avatar-storage';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const dataBase64 = (body as { dataBase64?: unknown })?.dataBase64;
  if (typeof dataBase64 !== 'string' || !dataBase64) {
    return Response.json({ error: 'Imagem ausente' }, { status: 400 });
  }

  const buffer = Buffer.from(dataBase64, 'base64');
  const invalid = validateAvatarBuffer(buffer);
  if (invalid) {
    const status = invalid.includes('2 MB') ? 413 : 400;
    return Response.json({ error: invalid }, { status });
  }

  const uploaded = await uploadAvatar(
    `customers/${account.id}`,
    buffer,
    'jpg',
    'image/jpeg',
    account.avatarUrl,
  );
  if ('error' in uploaded) return Response.json({ error: uploaded.error }, { status: 500 });

  await prisma.customerAccount.update({
    where: { id: account.id },
    data: { avatarUrl: uploaded.url },
  });

  return Response.json({ ok: true, avatarUrl: uploaded.url });
}

export async function DELETE(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  await removeAvatar(account.avatarUrl);
  await prisma.customerAccount.update({ where: { id: account.id }, data: { avatarUrl: null } });

  return Response.json({ ok: true });
}
