'use client';

import { useActionState, useState } from 'react';

import { customerSaveWhatsapp, type CustomerActionResult } from '@/app/(customer)/actions';
import { AuthField, AuthSubmit, AuthTitle } from '@/components/auth-ui';
import { maskPhoneBRInput } from '@haru/shared';

/**
 * Onboarding de quem entrou com Google (que não informa telefone): captura o WhatsApp
 * uma vez, guardado como PENDENTE (sem SMS), pra a conta ficar completa. A partir daí o
 * agendamento pré-preenche e nunca mais pede "Seus dados". `next` = pra onde voltar.
 */
export function WhatsappForm({ next, firstName }: { next: string; firstName: string }) {
  const [phone, setPhone] = useState('');
  const [state, formAction] = useActionState<CustomerActionResult, FormData>(
    customerSaveWhatsapp,
    undefined,
  );

  return (
    <>
      <AuthTitle
        plain={firstName ? `Só falta, ${firstName},` : 'Só falta'}
        accent="seu WhatsApp"
        subtitle="É por ele que você recebe a confirmação e os lembretes dos seus agendamentos. Assim a gente não pede de novo a cada vez."
      />

      <form action={formAction} className="mt-6 space-y-3">
        <input type="hidden" name="next" value={next} />
        <AuthField
          label="WhatsApp"
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          value={phone}
          onChange={(e) => setPhone(maskPhoneBRInput(e.target.value))}
          autoFocus
          required
        />
        {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
        <div className="pt-1">
          <AuthSubmit label="Salvar e continuar" pendingLabel="Salvando…" />
        </div>
      </form>
    </>
  );
}
