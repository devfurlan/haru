// POST /api/mobile/v1/me/avatar   - troca a foto de perfil do cliente (app mobile).
// DELETE /api/mobile/v1/me/avatar - remove a foto.
// O app redimensiona a imagem (128px) e manda os bytes em base64 no JSON - um avatar
// reduzido é pequeno, então base64 evita a fricção de multipart no RN. Upload/remoção
// server-side com service role; o arquivo antigo é apagado do bucket ao trocar.
import { prisma } from '@haru/database';

import { removeAvatar, uploadAvatar } from '@/lib/avatar-storage';
import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // avatar reduzido cabe folgado em 2 MB

/** Confere pela assinatura (magic bytes) que o blob é mesmo uma imagem, não bytes
 * arbitrários. O app manda JPEG; aceitamos também PNG/WebP por robustez. */
function isSupportedImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true; // PNG
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP')
    return true;
  return false;
}

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
  if (buffer.length === 0) return Response.json({ error: 'Imagem inválida' }, { status: 400 });
  if (buffer.length > MAX_AVATAR_BYTES) {
    return Response.json({ error: 'Imagem muito grande (máx. 2 MB).' }, { status: 413 });
  }
  if (!isSupportedImage(buffer)) {
    return Response.json({ error: 'Formato inválido (use JPEG, PNG ou WebP).' }, { status: 400 });
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
