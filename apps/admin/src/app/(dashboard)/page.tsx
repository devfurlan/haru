import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatInt, formatPct, formatUsd } from '@/lib/format';
import { getUsageByTenant, parsePeriod, PERIODS } from '@/lib/usage-queries';

export const dynamic = 'force-dynamic';

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodRaw } = await searchParams;
  const period = parsePeriod(periodRaw);
  const { rows, totals } = await getUsageByTenant(period);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Consumo de IA</h1>
          <p className="text-sm text-muted-foreground">
            Custo de OpenAI por estabelecimento (últimos {period} dias).
          </p>
        </div>
        <div className="flex gap-1 rounded-md border p-1">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/?period=${p}`}
              className={`rounded px-3 py-1 text-sm font-medium ${
                p === period
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {p}d
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Custo total" value={formatUsd(totals.costUsd)} />
        <StatCard label="Tokens" value={formatInt(totals.totalTokens)} />
        <StatCard label="Cache hit" value={formatPct(totals.cacheHit)} />
        <StatCard label="Turnos" value={formatInt(totals.requests)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por estabelecimento</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sem consumo registrado neste período.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Estabelecimento</th>
                    <th className="py-2 pr-4 text-right font-medium">Turnos</th>
                    <th className="py-2 pr-4 text-right font-medium">Tokens</th>
                    <th className="py-2 pr-4 text-right font-medium">Cache</th>
                    <th className="py-2 text-right font-medium">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.tenantId} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <span className="font-medium">{r.tenantName}</span>
                        {r.slug && (
                          <span className="ml-1 text-xs text-muted-foreground">/{r.slug}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {formatInt(r.requests)}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">
                        {formatInt(r.totalTokens)}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                        {formatPct(r.cacheHit)}
                      </td>
                      <td className="py-2.5 text-right font-medium tabular-nums">
                        {formatUsd(r.costUsd)}
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
