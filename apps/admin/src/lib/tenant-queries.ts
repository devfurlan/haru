import { prisma } from '@haru/database';
import { matchesSearch } from '@haru/shared';

import { requireAdmin } from './admin-auth';

/** Linha da lista de clientes (tenants) com contadores e assinatura. */
export async function listTenants(search?: string) {
  await requireAdmin(); // defesa em profundidade: o banco é cross-tenant e sem RLS
  const q = search?.trim();
  // Carrega todos e filtra em JS por nome+slug (sem acento, tokenizado) - mesmo matcher do
  // diretório do app, pra "st lima" achar "stlima-barber" aqui também. A tela já lista todos
  // os tenants sem paginar; filtrar o mesmo conjunto não custa fetch extra.
  const rows = await prisma.tenant.findMany({
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
  return q ? rows.filter((t) => matchesSearch(q, t.name, t.slug)) : rows;
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
