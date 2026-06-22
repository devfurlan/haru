'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { resetPassword, type ResetPasswordResult } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Salvando…' : 'Redefinir senha'}
    </Button>
  );
}

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
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirme a senha</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
