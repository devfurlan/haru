import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';

import { ServicesPanel } from './services-panel';

export default async function ServicesPage() {
  const { tenant } = await requireUserAndTenant();

  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Serviços</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre os serviços que você oferece. O bot usa essa lista pra conversar com o cliente.
        </p>
      </div>

      <ServicesPanel services={services} />
    </div>
  );
}
