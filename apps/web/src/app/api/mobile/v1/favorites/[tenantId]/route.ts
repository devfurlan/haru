// DELETE /api/mobile/v1/favorites/[tenantId] - desfavorita. Idempotente (deleteMany
// não erra se já não existir). Sempre por Bearer.
import { prisma } from '@haru/database';

import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const { tenantId } = await params;
  await prisma.favorite.deleteMany({ where: { customerAccountId: account.id, tenantId } });
  return Response.json({ ok: true });
}
