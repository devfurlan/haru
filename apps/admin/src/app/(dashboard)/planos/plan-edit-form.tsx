'use client';

import { useActionState } from 'react';

import { SaveRow } from '@/components/form-ui';

import { updatePlan } from './actions';
import { PlanFields, type PlanDefaults } from './plan-fields';

export function PlanEditForm({ id, defaults }: { id: string; defaults: PlanDefaults }) {
  const [state, action, pending] = useActionState(updatePlan, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <PlanFields d={defaults} />
      <SaveRow state={state} pending={pending} />
    </form>
  );
}
