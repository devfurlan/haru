'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';

import { signIn, type ActionResult } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Entrando…' : 'Entrar'}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<ActionResult, FormData>(signIn, undefined);
  const [email, setEmail] = useState('');

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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="relative space-y-2">
        <Label htmlFor="password">Senha</Label>
        <PasswordInput
          id="password"
          name="password"
          strength={false}
          autoComplete="current-password"
          required
        />
        <Link
          href={email ? `/esqueci-senha?email=${encodeURIComponent(email)}` : '/esqueci-senha'}
          className="text-muted-foreground hover:text-foreground absolute top-0 right-0 text-sm underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <SubmitButton />
      <p className="text-gray-400 text-center text-xs mb-7 leading-relaxed">
        Ao continuar, você concorda com os{' '}
        <Link href="/termos" target="_blank" className="font-medium underline underline-offset-4">
          Termos de Serviço
        </Link>{' '}
        e a{' '}
        <Link
          href="/privacidade"
          target="_blank"
          className="font-medium underline underline-offset-4"
        >
          Política de Privacidade
        </Link>
        .
      </p>
    </form>
  );
}
