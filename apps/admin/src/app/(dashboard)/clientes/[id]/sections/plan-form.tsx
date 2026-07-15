'use client';

import { useActionState } from 'react';

import type { PlanTier } from '@haru/database';

import { Field, SaveRow } from '@/components/form-ui';
import { Select } from '@/components/ui/select';
import { TIER_LABEL } from '@/lib/billing-lite';

import { updatePlan } from '../actions';

/** Plano do catálogo oferecido no seletor (público ou personalizado). */
export type PlanChoice = {
  id: string;
  name: string;
  tier: PlanTier;
  /** true = público (vitrine/self-serve); false = personalizado. */
  active: boolean;
};

/**
 * Assinatura antiga (criada antes do `planId`) não sabe de qual plano veio: pré-seleciona o
 * plano público do tier contratado, ou o primeiro do catálogo como último recurso.
 */
function findByTier(plans: PlanChoice[], tier: PlanTier): string | undefined {
  return plans.find((p) => p.tier === tier && p.active)?.id ?? plans[0]?.id;
}

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
  plans,
}: {
  tenantId: string;
  subscription: {
    planTier: PlanTier;
    planId: string | null;
    status: string;
    billingCycle: string;
    priceCents: number;
  } | null;
  plans: PlanChoice[];
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
        <Field label="Plano" htmlFor="planId">
          <Select
            id="planId"
            name="planId"
            defaultValue={subscription.planId ?? findByTier(plans, subscription.planTier)}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {TIER_LABEL[p.tier]}
                {p.active ? '' : ' (personalizado)'}
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
        Trocar o plano regrava o snapshot dos termos (preço, limites, features) a partir do
        catálogo. Planos <strong>personalizados</strong> aparecem aqui e não na vitrine - o mesmo
        plano pode ser atribuído a vários estabelecimentos.
      </p>
      <SaveRow state={state} pending={pending} />
    </form>
  );
}
