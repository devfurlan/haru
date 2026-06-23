import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TIER_LABEL } from '@/lib/billing-lite';
import { formatInt } from '@/lib/format';
import { STATUS_LABEL, STATUS_VARIANT } from '@/lib/labels';
import { listTenants } from '@/lib/tenant-queries';

import { StatusToggle } from './status-toggle';

export const dynamic = 'force-dynamic';

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const tenants = await listTenants(q);

  const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {tenants.length} estabelecimento{tenants.length === 1 ? '' : 's'}.
          </p>
        </div>
        <form className="w-64">
          <Input name="q" defaultValue={q ?? ''} placeholder="Buscar por nome ou slug..." />
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          {tenants.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Estabelecimento</th>
                    <th className="px-4 py-2.5 font-medium">Plano</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Agend.</th>
                    <th className="px-4 py-2.5 text-right font-medium">Usuários</th>
                    <th className="px-4 py-2.5 font-medium">Criado</th>
                    <th className="px-4 py-2.5 text-right font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-2.5">
                        <Link href={`/clientes/${t.id}`} className="font-medium hover:underline">
                          {t.name}
                        </Link>
                        <span className="ml-1 text-xs text-muted-foreground">/{t.slug}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {t.subscription ? TIER_LABEL[t.subscription.planTier] : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {t.subscription ? (
                          <Badge variant={STATUS_VARIANT[t.subscription.status]}>
                            {STATUS_LABEL[t.subscription.status]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatInt(t._count.appointments)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatInt(t._count.users)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {dateFmt.format(t.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <StatusToggle tenantId={t.id} status={t.subscription?.status ?? null} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
