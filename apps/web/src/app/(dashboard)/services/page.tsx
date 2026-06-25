import { prisma } from '@haru/database';

import { requireUserAndTenant } from '@/lib/auth';

import { ServicesPanel } from './services-panel';

export default async function ServicesPage() {
  const { tenant } = await requireUserAndTenant();

  const [services, professionals] = await Promise.all([
    prisma.service.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      include: { professionals: { select: { professionalId: true } } },
    }),
    prisma.user.findMany({
      where: { tenantId: tenant.id, isProfessional: true },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Serviços</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre os serviços que você oferece. O bot usa essa lista pra conversar com o cliente.
        </p>
      </div>

      <ServicesPanel
        services={services.map(({ professionals: links, ...rest }) => ({
          ...rest,
          professionalIds: links.map((l) => l.professionalId),
        }))}
        professionals={professionals}
      />
    </div>
  );
}
