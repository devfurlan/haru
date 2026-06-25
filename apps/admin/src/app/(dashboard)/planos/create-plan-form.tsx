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
  appointmentsPerMonth: null,
  aiMessagesPerMonth: null,
  maxProfessionals: null,
  maxReceptionists: null,
  onlinePayments: false,
  webhooks: false,
  team: false,
  active: true,
  displayOrder: 0,
};

export function CreatePlanForm({ availableTiers }: { availableTiers: PlanTier[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createPlan, undefined);

  if (availableTiers.length === 0) return null;

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Criar plano faltante
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Tier" htmlFor="tier">
        <Select id="tier" name="tier" defaultValue={availableTiers[0]}>
          {availableTiers.map((t) => (
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
