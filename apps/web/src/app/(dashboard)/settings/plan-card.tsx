import {
  getUsageStatus,
  TIER_LABEL,
  type TenantWithSubscription,
  type UsageMetric,
} from '@haru/billing';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';

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

/** Linha de uso com barra de progresso (esconde a barra quando o limite é ilimitado). */
function UsageBar({ label, metric }: { label: string; metric: UsageMetric }) {
  const pct = metric.pct === null ? null : Math.min(100, metric.pct);
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[12.5px] font-medium">
        <span className="text-ink-70">{label}</span>
        <span className="text-ink font-semibold">
          {metric.limit === null
            ? `${metric.used} · ilimitado`
            : `${metric.used} / ${metric.limit}`}
        </span>
      </div>
      {pct !== null && (
        <div className="bg-line h-1.5 overflow-hidden rounded-full">
          <div className="bg-green-bright h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
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

  const renewsAt =
    sub?.status === 'ACTIVE' && sub.currentPeriodEnd
      ? sub.currentPeriodEnd.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
      : null;

  return (
    <div id="plano" className="border-line bg-paper shadow-soft rounded-[18px] border p-[18px]">
      <div className="flex items-center gap-2.5">
        <div className="flex-1">
          <div className="text-ink font-serif text-[16px] font-semibold">Seu plano</div>
          <div className="text-ink-50 mt-0.5 text-[12.5px] font-medium">
            {sub ? (
              <>
                {TIER_LABEL[sub.planTier]} ·{' '}
                <span className="text-ink font-serif font-semibold">
                  {sub.priceCents > 0 ? fmtBRL(sub.priceCents) : 'sob consulta'}
                </span>
                {sub.priceCents > 0 && `/${sub.billingCycle === 'ANNUAL' ? 'ano' : 'mês'}`}
                {renewsAt && ` · renova em ${renewsAt}`}
              </>
            ) : (
              'Nenhum plano ativo no momento.'
            )}
          </div>
        </div>
        <Badge variant={statusVariant}>
          {statusVariant === 'success' && (
            <span className="bg-green-bright size-1.5 rounded-full" />
          )}
          {sub ? (STATUS_LABEL[sub.status] ?? sub.status) : 'Sem assinatura'}
        </Badge>
      </div>

      <div className="border-edge my-3.5 border-t border-dashed" />

      <div className="flex flex-col gap-3">
        <UsageBar label="Lembretes por WhatsApp este mês" metric={usage.whatsappReminders} />
      </div>

      <Link
        href="/assinatura"
        className="border-edge bg-cream-2 text-ink-70 mt-3.5 inline-flex h-11 items-center rounded-xl border px-4 text-[12.5px] font-semibold no-underline transition hover:bg-[#ebe1cc]"
      >
        {sub ? 'Gerenciar assinatura' : 'Assinar'}
      </Link>
    </div>
  );
}
