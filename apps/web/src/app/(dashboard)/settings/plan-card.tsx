import {
  getUsageStatus,
  TIER_LABEL,
  type TenantWithSubscription,
  type UsageMetric,
} from '@haru/billing';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativa',
  PAST_DUE: 'Pagamento pendente',
  PENDING: 'Aguardando pagamento',
  SUSPENDED: 'Suspensa',
  CANCELED: 'Cancelada',
};

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function usageText(m: UsageMetric): string {
  if (m.limit === null) return `${m.used} (ilimitado)`;
  return `${m.used} / ${m.limit}${m.pct !== null ? ` · ${m.pct}%` : ''}`;
}

/** Resumo da assinatura: tier, status, preço contratado (snapshot) e uso do mês. */
export async function PlanCard({ tenant }: { tenant: TenantWithSubscription }) {
  const sub = tenant.subscription ?? null;
  const usage = await getUsageStatus(tenant);

  const statusVariant = !sub
    ? 'pending'
    : sub.status === 'ACTIVE'
      ? 'success'
      : sub.status === 'PAST_DUE' || sub.status === 'PENDING'
        ? 'pending'
        : 'neutral';

  return (
    <Card id="plano">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Seu plano</CardTitle>
          <Badge variant={statusVariant}>{sub ? (STATUS_LABEL[sub.status] ?? sub.status) : 'Sem assinatura'}</Badge>
        </div>
        <CardDescription>
          {sub
            ? `${TIER_LABEL[sub.planTier]} · ${
                sub.priceCents > 0
                  ? `${fmtBRL(sub.priceCents)}/${sub.billingCycle === 'ANNUAL' ? 'ano' : 'mês'}`
                  : 'sob consulta'
              }`
            : 'Nenhum plano ativo no momento.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Agendamentos este mês</span>
          <span>{usageText(usage.appointments)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Mensagens de IA este mês</span>
          <span>{usageText(usage.aiMessages)}</span>
        </div>
        <Link
          href="/assinatura"
          className="bg-foreground text-background mt-2 inline-block rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
        >
          {sub ? 'Gerenciar assinatura' : 'Assinar'}
        </Link>
      </CardContent>
    </Card>
  );
}
