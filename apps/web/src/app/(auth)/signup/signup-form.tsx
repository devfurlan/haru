'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { signUp, type ActionResult } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Criando…' : 'Criar conta'}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState<ActionResult, FormData>(signUp, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="businessName">Nome do estabelecimento</Label>
        <Input
          id="businessName"
          name="businessName"
          type="text"
          autoComplete="organization"
          placeholder="Barbearia do João"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ownerName">Seu nome</Label>
        <Input id="ownerName" name="ownerName" type="text" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
