'use client';

import type { PlanTier } from '@haru/database';
import { useRouter } from 'next/navigation';
import { useActionState, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

import { cancelSubscription, changePlan, updateCard, type ManageResult } from './actions';
import type { PlanOption } from './subscribe-form';

type Cycle = 'MONTHLY' | 'ANNUAL';

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ManageSubscription({
  plans,
  currentTier,
  currentCycle,
  periodEndISO,
}: {
  plans: PlanOption[];
  currentTier: PlanTier;
  currentCycle: Cycle;
  periodEndISO: string | null;
}) {
  const router = useRouter();
  const [tier, setTier] = useState<PlanTier>(currentTier);
  const [cycle, setCycle] = useState<Cycle>(currentCycle);

  const [changeState, changeAction, changing] = useActionState<ManageResult | undefined, FormData>(
    changePlan,
    undefined,
  );
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const periodEnd = periodEndISO
    ? new Date(periodEndISO).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  const isCurrent = tier === currentTier && cycle === currentCycle;
  const changeError = changeState && 'error' in changeState ? changeState.error : null;
  const changeOk = changeState && 'ok' in changeState;

  function handleUpdateCard() {
    setNotice(null);
    startTransition(async () => {
      const r = await updateCard();
      if ('error' in r) setNotice(r.error);
      else window.location.href = r.redirectUrl;
    });
  }

  function handleCancel() {
    if (!confirm('Cancelar a assinatura? O acesso continua até o fim do período já pago.')) return;
    setNotice(null);
    startTransition(async () => {
      const r = await cancelSubscription();
      if ('error' in r) setNotice(r.error);
      else {
        setNotice('Assinatura cancelada. Você mantém o acesso até o fim do período pago.');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border p-6 text-sm">
        <p className="text-muted-foreground">
          {periodEnd ? `Sua assinatura está ativa até ${periodEnd}.` : 'Sua assinatura está ativa.'}
        </p>
      </div>

      {/* Trocar de plano */}
      <form action={changeAction} className="bg-card space-y-4 rounded-xl border p-6">
        <h2 className="font-medium">Trocar de plano</h2>

        <div className="flex gap-2">
          {(['MONTHLY', 'ANNUAL'] as Cycle[]).map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCycle(c)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                cycle === c ? 'bg-foreground text-background' : 'bg-background'
              }`}
            >
              {c === 'MONTHLY' ? 'Mensal' : 'Anual (~20% off)'}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {plans.map((p) => {
            const price = cycle === 'ANNUAL' ? p.priceAnnualCents : p.priceMonthlyCents;
            return (
              <label
                key={p.tier}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${
                  tier === p.tier ? 'border-foreground ring-foreground ring-1' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" checked={tier === p.tier} onChange={() => setTier(p.tier)} />
                  <span className="font-medium">{p.name}</span>
                  {p.tier === currentTier && (
                    <span className="text-muted-foreground text-xs">(atual)</span>
                  )}
                </span>
                <span className="text-sm">
                  {fmtBRL(price)}
                  <span className="text-muted-foreground">
                    /{cycle === 'ANNUAL' ? 'ano' : 'mês'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <input type="hidden" name="tier" value={tier} />
        <input type="hidden" name="cycle" value={cycle} />

        <p className="text-muted-foreground text-xs">
          A mudança vale agora nos limites e recursos; o novo valor é cobrado no próximo ciclo (sem
          proração).
        </p>
        {changeError && <p className="text-sm text-red-600">{changeError}</p>}
        {changeOk && <p className="text-sm text-emerald-700">Plano atualizado!</p>}

        <Button type="submit" disabled={changing || isCurrent}>
          {changing ? 'Atualizando…' : isCurrent ? 'Plano atual' : 'Trocar plano'}
        </Button>
      </form>

      {/* Cartão + cancelamento */}
      <div className="bg-card space-y-3 rounded-xl border p-6">
        <h2 className="font-medium">Pagamento</h2>
        {notice && <p className="text-sm text-amber-800">{notice}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleUpdateCard} disabled={pending}>
            Atualizar cartão
          </Button>
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={pending} className="text-red-600">
            Cancelar assinatura
          </Button>
        </div>
      </div>
    </div>
  );
}
