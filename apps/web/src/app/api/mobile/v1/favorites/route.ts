// /api/mobile/v1/favorites - estabelecimentos favoritados pelo cliente (cross-tenant).
// GET lista; POST {tenantId} adiciona (idempotente). Sempre por Bearer.
import { Prisma, prisma } from '@haru/database';

import { requireCustomerAccountFromBearer } from '@/lib/customer-auth';

export async function GET(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const rows = await prisma.favorite.findMany({
    where: { customerAccountId: account.id },
    include: { tenant: { select: { id: true, name: true, slug: true, logoUrl: true, address: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const favorites = rows.map((f) => ({
    tenantId: f.tenant.id,
    name: f.tenant.name,
    slug: f.tenant.slug,
    logoUrl: f.tenant.logoUrl,
    address: f.tenant.address,
  }));
  return Response.json({ favorites });
}

export async function POST(req: Request) {
  const account = await requireCustomerAccountFromBearer(req);
  if (!account) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const tenantId = (await req.json().catch(() => null))?.tenantId;
  if (typeof tenantId !== 'string' || !tenantId) {
    return Response.json({ error: 'tenantId obrigatório' }, { status: 400 });
  }

  try {
    await prisma.favorite.create({ data: { customerAccountId: account.id, tenantId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') return Response.json({ ok: true }); // já era favorito
      if (err.code === 'P2003') return Response.json({ error: 'Estabelecimento inválido' }, { status: 400 });
    }
    throw err;
  }
  return Response.json({ ok: true });
}
