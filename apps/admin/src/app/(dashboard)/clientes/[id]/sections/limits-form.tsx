'use client';

import { useActionState } from 'react';

import { Field, SaveRow } from '@/components/form-ui';
import { Input } from '@/components/ui/input';

import { updateSubscriptionLimits } from '../actions';

/**
 * Override manual dos tetos de equipe no snapshot da assinatura deste tenant.
 * Editar aqui libera/limita capacidade só para este cliente, sem mexer no plano.
 * Trocar o plano (seção acima) regrava estes valores a partir do catálogo.
 */
export function LimitsForm({
  tenantId,
  limits,
}: {
  tenantId: string;
  limits: { maxProfessionals: number | null; maxReceptionists: number | null } | null;
}) {
  const [state, action, pending] = useActionState(updateSubscriptionLimits, undefined);

  if (!limits) {
    return (
      <p className="text-sm text-muted-foreground">
        Este cliente não tem assinatura, então não há limites para editar.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Máx. profissionais"
          htmlFor="maxProfessionals"
          hint="Usuários com agenda própria. Vazio = ilimitado."
        >
          <Input
            id="maxProfessionals"
            name="maxProfessionals"
            type="number"
            min={0}
            defaultValue={limits.maxProfessionals ?? ''}
          />
        </Field>
        <Field
          label="Máx. recepcionistas"
          htmlFor="maxReceptionists"
          hint="Usuários de apoio, sem agenda. Vazio = ilimitado."
        >
          <Input
            id="maxReceptionists"
            name="maxReceptionists"
            type="number"
            min={0}
            defaultValue={limits.maxReceptionists ?? ''}
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Override manual: vale só para este cliente. Trocar o plano acima regrava estes limites a
        partir do catálogo.
      </p>
      <SaveRow state={state} pending={pending} />
    </form>
  );
}
