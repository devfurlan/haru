import { AlertTriangle, ChevronRight, CreditCard, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { TenantAvatar } from '@/components/customer/tenant-avatar';
import type { CustomerMembership } from '@/lib/memberships/customer';
import { cn } from '@/lib/utils';

/** Selo de status da assinatura (canto do card). */
function StatusBadge({ m }: { m: CustomerMembership }) {
  const map =
    m.status === 'ACTIVE'
      ? { label: 'Ativa', cls: 'bg-green/10 text-green' }
      : m.status === 'PAST_DUE'
        ? { label: 'Pagamento pendente', cls: 'bg-amber-100 text-amber-700' }
        : m.status === 'PENDING'
          ? { label: 'Ativando', cls: 'bg-muted text-sub' }
          : { label: 'Cancelada', cls: 'text-ink-50 bg-[#f2ecdd]' };
  return (
    <span className={cn('shrink-0 rounded-full px-3 py-1 text-[11.5px] font-semibold', map.cls)}>
      {map.label}
    </span>
  );
}

/** Card-resumo de UMA assinatura. O card inteiro leva pra "Gerenciar" (créditos + cobranças + cancelar). */
function MembershipCard({ m }: { m: CustomerMembership }) {
  const pct = m.creditsPerCycle > 0 ? Math.round((m.creditBalance / m.creditsPerCycle) * 100) : 0;

  return (
    <Link
      href={`/conta/assinaturas/${m.membershipId}`}
      className="group border-line bg-paper block rounded-[20px] border p-5 shadow-[0_2px_10px_rgba(10,51,36,.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-22px_rgba(10,51,36,.45)]"
    >
      {/* cabeçalho: estabelecimento + status */}
      <div className="flex items-start gap-3">
        <TenantAvatar name={m.tenantName} logoUrl={m.logoUrl} size={48} radius={14} />
        <div className="min-w-0 flex-1">
          <p className="text-ink truncate font-serif text-[17px] font-semibold leading-tight">
            {m.tenantName}
          </p>
          <p className="text-ink-50 mt-0.5 truncate text-[12.5px] font-medium">
            {m.planName} · {m.serviceLabel}
          </p>
        </div>
        <StatusBadge m={m} />
      </div>

      {/* créditos: saldo grande + barra + regra em destaque */}
      <div className="border-edge bg-cream mt-4 rounded-[16px] border p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-ink-50 text-[11.5px] font-semibold uppercase tracking-[0.1em]">
              Créditos
            </p>
            <p className="text-ink font-serif text-[26px] font-semibold leading-none">
              {m.creditBalance}
              <span className="text-ink-50 text-[15px]"> de {m.creditsPerCycle}</span>
            </p>
          </div>
          {m.creditsExpireLabel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              {m.creditsExpireLabel}
            </span>
          ) : null}
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#e6dcc6]">
          <div
            className="bg-green-bright h-full rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </div>
        <p className="text-ink-50 mt-2 flex items-start gap-1.5 text-[12px] leading-[1.5]">
          <Sparkles className="text-green-deep mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {m.ruleLong}
        </p>
      </div>

      {/* estado da cobrança + affordance de gerenciar */}
      <div className="mt-3 flex items-center justify-between gap-3">
        {m.payFailed ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Cobrança falhou - créditos pausados
          </span>
        ) : m.canceled ? (
          <span className="text-ink-50 text-[12.5px]">
            Cancelada{m.periodEndLabel ? ` · créditos até ${m.periodEndLabel}` : ''}
          </span>
        ) : m.nextChargeLabel ? (
          <span className="text-ink-70 inline-flex items-center gap-1.5 text-[12.5px] font-medium">
            <CreditCard className="text-ink-50 h-3.5 w-3.5" aria-hidden />
            Próxima cobrança {m.nextChargeLabel}
          </span>
        ) : (
          <span className="text-ink-50 text-[12.5px]">Ativando…</span>
        )}
        <span className="text-green-deep inline-flex shrink-0 items-center gap-0.5 text-[12.5px] font-semibold">
          Gerenciar
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function MembershipsList({ items }: { items: CustomerMembership[] }) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      {items.map((m) => (
        <MembershipCard key={m.membershipId} m={m} />
      ))}
    </div>
  );
}
