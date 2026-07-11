import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';
import { getLoyaltyOverview } from '@/lib/loyalty';

import { LoyaltyPanel } from './loyalty-panel';

export default async function LoyaltyPage() {
  const { tenant } = await requireUserAndTenant();

  const [overview, services] = await Promise.all([
    getLoyaltyOverview(tenant.id, tenant.timezone),
    prisma.service.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return <LoyaltyPanel overview={overview} services={services} />;
}
