'use client';

import { useActionState } from 'react';

import type { PlanTier } from '@haru/database';

import { Field, SaveRow } from '@/components/form-ui';
import { Select } from '@/components/ui/select';
import { TIER_LABEL } from '@/lib/billing-lite';

import { updatePlan } from '../actions';

const STATUSES: Array<{ value: string; label: string }> = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'ACTIVE', label: 'Ativa' },
  { value: 'PAST_DUE', label: 'Em atraso' },
  { value: 'SUSPENDED', label: 'Suspensa' },
  { value: 'CANCELED', label: 'Cancelada' },
];

export function PlanForm({
  tenantId,
  subscription,
  tiers,
}: {
  tenantId: string;
  subscription: {
    planTier: PlanTier;
    status: string;
    billingCycle: string;
    priceCents: number;
  } | null;
  tiers: PlanTier[];
}) {
  const [state, action, pending] = useActionState(updatePlan, undefined);

  if (!subscription) {
    return (
      <p className="text-sm text-muted-foreground">
        Este cliente não tem assinatura. Criar uma do zero está fora do escopo do admin por enquanto.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Plano" htmlFor="planTier">
          <Select id="planTier" name="planTier" defaultValue={subscription.planTier}>
            {tiers.map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={subscription.status}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ciclo" htmlFor="billingCycle">
          <Select id="billingCycle" name="billingCycle" defaultValue={subscription.billingCycle}>
            <option value="MONTHLY">Mensal</option>
            <option value="ANNUAL">Anual</option>
          </Select>
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Trocar o plano regrava o snapshot dos termos (preço, limites, features) a partir do catálogo.
      </p>
      <SaveRow state={state} pending={pending} />
    </form>
  );
}
