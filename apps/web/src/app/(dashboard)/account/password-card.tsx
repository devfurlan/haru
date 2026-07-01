'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';

import { changePassword, type PasswordActionResult } from '../settings/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Alterando…' : 'Alterar senha'}
    </Button>
  );
}

export function PasswordCard() {
  const [state, formAction] = useActionState<PasswordActionResult | undefined, FormData>(
    changePassword,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Limpa os campos depois de trocar a senha com sucesso
  useEffect(() => {
    if (state && 'ok' in state) formRef.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Senha</CardTitle>
        <CardDescription>
          Altere a senha de acesso à sua conta. Mínimo de 8 caracteres.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar nova senha</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {state && 'error' in state && <p className="text-sm text-destructive">{state.error}</p>}
          {state && 'ok' in state && <p className="text-sm text-emerald-600">Senha alterada.</p>}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
