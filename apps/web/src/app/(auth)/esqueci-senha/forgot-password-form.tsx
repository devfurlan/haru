'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { requestPasswordReset, type ForgotPasswordResult } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Enviando…' : 'Enviar link de recuperação'}
    </Button>
  );
}

export function ForgotPasswordForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction] = useActionState<ForgotPasswordResult, FormData>(
    requestPasswordReset,
    undefined,
  );

  // Mensagem neutra: não confirmamos se o email existe (evita enumeração).
  if (state && 'ok' in state) {
    return (
      <p className="text-sm text-emerald-600">
        Se houver uma conta com esse email, enviamos um link de recuperação. Verifique sua caixa de
        entrada (e o spam).
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
        />
      </div>
      {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
