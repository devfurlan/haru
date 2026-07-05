'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import { AuthPassword, AuthSubmit } from '@/components/auth-ui';

import { resetPassword, type ResetPasswordResult } from './actions';

export function ResetPasswordForm() {
  const router = useRouter();
  const [state, formAction] = useActionState<ResetPasswordResult | undefined, FormData>(
    resetPassword,
    undefined,
  );

  // Sucesso: a sessão de recovery já deixa o usuário logado - manda pro painel.
  useEffect(() => {
    if (state && 'ok' in state) {
      router.replace('/dashboard');
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="mt-[26px] space-y-4">
      <AuthPassword
        label="Nova senha"
        id="password"
        name="password"
        autoComplete="new-password"
        minLength={8}
        required
        placeholder="mínimo 8 caracteres"
      />
      <AuthPassword
        label="Confirme a senha"
        id="confirm"
        name="confirm"
        autoComplete="new-password"
        minLength={8}
        required
        placeholder="repita a senha"
      />
      {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
      <AuthSubmit label="Redefinir senha" pendingLabel="Salvando…" />
    </form>
  );
}
