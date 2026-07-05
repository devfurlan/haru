'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { AuthField, AuthSubmit } from '@/components/auth-ui';

import { requestPasswordReset, type ForgotPasswordResult } from '../actions';

export function ForgotPasswordForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction] = useActionState<ForgotPasswordResult, FormData>(
    requestPasswordReset,
    undefined,
  );

  // Mensagem neutra: não confirmamos se o e-mail existe (evita enumeração).
  if (state && 'ok' in state) {
    return (
      <div className="mt-[26px]">
        <p className="text-muted-foreground text-[15px] leading-6">
          Se houver uma conta com esse e-mail, enviamos um link pra você definir uma nova senha.
          Confira sua caixa de entrada (e o spam).
        </p>
        <Link
          href="/login"
          className="bg-coral mt-6 block w-full rounded-2xl py-4 text-center text-base font-bold text-white transition-transform active:scale-[0.98]"
        >
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-[26px] space-y-4">
      <p className="text-muted-foreground text-[15px] leading-6">
        Informe seu e-mail e enviamos um link pra você criar uma nova senha.
      </p>
      <AuthField
        label="E-mail"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={defaultEmail}
        placeholder="voce@email.com"
      />
      {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
      <AuthSubmit label="Enviar link" pendingLabel="Enviando…" />
    </form>
  );
}
