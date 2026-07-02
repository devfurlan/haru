import { prisma } from '@haru/database';

import { requireAdmin } from './admin-auth';

/** Linha da lista de clientes (tenants) com contadores e assinatura. */
export async function listTenants(search?: string) {
  await requireAdmin(); // defesa em profundidade: o banco é cross-tenant e sem RLS
  const q = search?.trim();
  return prisma.tenant.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      whatsappPhoneNumberId: true,
      subscription: {
        select: { planTier: true, status: true },
      },
      _count: {
        select: { appointments: true, users: true, contacts: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export type TenantListRow = Awaited<ReturnType<typeof listTenants>>[number];

/** Tenant completo (todos os campos) + assinatura + usuários, para a tela de config. */
export async function getTenantDetail(id: string) {
  await requireAdmin();
  return prisma.tenant.findUnique({
    where: { id },
    include: {
      subscription: true,
      users: { orderBy: [{ role: 'asc' }, { createdAt: 'asc' }] },
    },
  });
}

export type TenantDetail = NonNullable<Awaited<ReturnType<typeof getTenantDetail>>>;

/** Catálogo de planos (para o seletor de plano na tela de config). */
export async function listPlans() {
  await requireAdmin();
  return prisma.plan.findMany({ orderBy: { displayOrder: 'asc' } });
}
