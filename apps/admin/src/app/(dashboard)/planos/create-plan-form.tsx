'use client';

import { useActionState, useState } from 'react';

import { Button } from '@haru/ui/components/button';

import { Field, SaveRow } from '@/components/form-ui';
import { Select } from '@/components/ui/select';
import { TIER_LABEL } from '@/lib/billing-lite';
import type { PlanTier } from '@haru/database';

import { createPlan } from './actions';
import { PlanFields } from './plan-fields';

const EMPTY = {
  name: '',
  priceMonthlyCents: 0,
  priceAnnualCents: 0,
  whatsappRemindersPerMonth: null,
  maxProfessionals: null,
  maxReceptionists: null,
  onlinePayments: false,
  webhooks: false,
  team: false,
  waitlist: false,
  serviceSubscriptions: false,
  // Default = plano PERSONALIZADO: o catálogo público (Solo/Time/Multi) já vem do seed;
  // o que se cria aqui no dia a dia é deal sob medida, fora da vitrine.
  active: false,
  displayOrder: 0,
};

export function CreatePlanForm({ tiers }: { tiers: PlanTier[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createPlan, undefined);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Criar plano personalizado
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field
        label="Tier"
        htmlFor="tier"
        hint="Faixa comercial (rótulo e upsell). Quem decide as features é a lista de toggles abaixo, não o tier."
      >
        <Select id="tier" name="tier" defaultValue={tiers[0]}>
          {tiers.map((t) => (
            <option key={t} value={t}>
              {TIER_LABEL[t]}
            </option>
          ))}
        </Select>
      </Field>
      <PlanFields d={EMPTY} />
      <SaveRow state={state} pending={pending} />
    </form>
  );
}
