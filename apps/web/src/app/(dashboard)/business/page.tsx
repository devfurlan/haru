import { requireUserAndTenant } from '@/lib/auth';

import { TenantCard } from './tenant-card';

export default async function BusinessPage() {
  const { tenant } = await requireUserAndTenant();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Estabelecimento</h1>
        <p className="text-muted-foreground text-sm">
          Logo, nome, endereço e a URL pública que seus clientes acessam.
        </p>
      </div>

      <TenantCard
        name={tenant.name}
        slug={tenant.slug}
        address={tenant.address}
        logoUrl={tenant.logoUrl}
      />
    </div>
  );
}
