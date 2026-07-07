'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import { customerSaveWhatsapp, type CustomerActionResult } from '@/app/(customer)/actions';
import { AuthField, AuthSubmit, AuthTitle } from '@/components/auth-ui';
import { maskPhoneBRInput } from '@haru/shared';

/**
 * Onboarding OPCIONAL de quem entrou com Google (que não informa telefone): oferece
 * adicionar o WhatsApp uma vez, guardado como PENDENTE (sem SMS), pra receber lembretes
 * por lá. Não é obrigatório - dá pra "Pular por agora" e agendar normalmente (a
 * confirmação sai por e-mail + área logada). `next` = pra onde voltar (pular ou salvar).
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
        plain={firstName ? `${firstName}, quer lembretes no` : 'Quer lembretes no'}
        accent="WhatsApp?"
        subtitle="Opcional. Se adicionar, a gente te lembra dos seus agendamentos por lá - e não pede de novo a cada vez. Dá pra fazer depois na sua conta."
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

      <Link
        href={next}
        className="text-sub hover:text-foreground mt-4 block text-center text-sm underline-offset-2 transition-colors hover:underline"
      >
        Pular por agora
      </Link>
    </>
  );
}
