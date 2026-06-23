import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TIER_LABEL } from '@/lib/billing-lite';
import { formatBRL, formatInt } from '@/lib/format';
import { getMrr } from '@/lib/mrr-queries';

export const dynamic = 'force-dynamic';

export default async function ReceitaPage() {
  const m = await getMrr();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Receita recorrente</h1>
        <p className="text-sm text-muted-foreground">
          MRR das assinaturas ativas (valor anual normalizado ÷ 12).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="MRR" value={formatBRL(m.mrrCents)} />
        <StatCard label="ARR" value={formatBRL(m.arrCents)} />
        <StatCard label="ARPU" value={formatBRL(m.arpuCents)} />
        <StatCard label="Assinaturas ativas" value={formatInt(m.activeCount)} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="MRR cobrado (Asaas)" value={formatBRL(m.billedMrrCents)} />
        <StatCard label="MRR grandfather" value={formatBRL(m.grandfatherMrrCents)} />
        <StatCard label="Cancelando" value={formatInt(m.churningCount)} />
        <StatCard label="Inadimplentes" value={formatInt(m.pastDueCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por plano</CardTitle>
        </CardHeader>
        <CardContent>
          {m.byTier.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma assinatura ativa ainda.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Plano</th>
                  <th className="py-2 pr-4 text-right font-medium">Assinaturas</th>
                  <th className="py-2 text-right font-medium">MRR</th>
                </tr>
              </thead>
              <tbody>
                {m.byTier.map((r) => (
                  <tr key={r.tier} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{TIER_LABEL[r.tier]}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{formatInt(r.count)}</td>
                    <td className="py-2.5 text-right font-medium tabular-nums">
                      {formatBRL(r.mrrCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
