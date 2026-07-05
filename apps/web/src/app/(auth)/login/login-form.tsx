'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import { AuthField, AuthPassword, AuthSubmit } from '@/components/auth-ui';

import { signIn, type ActionResult } from '../actions';

export function LoginForm() {
  const [state, formAction] = useActionState<ActionResult, FormData>(signIn, undefined);
  const [email, setEmail] = useState('');

  return (
    <form action={formAction} className="space-y-[13px]">
      <AuthField
        label="E-mail"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="voce@email.com"
      />
      <AuthPassword
        label="Senha"
        id="password"
        name="password"
        autoComplete="current-password"
        required
        placeholder="Sua senha"
      />
      <div className="flex justify-end">
        <Link
          href={email ? `/esqueci-senha?email=${encodeURIComponent(email)}` : '/esqueci-senha'}
          className="text-green-deep text-[12.5px] font-semibold"
        >
          Esqueci a senha
        </Link>
      </div>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <div className="pt-1">
        <AuthSubmit label="Entrar" pendingLabel="Entrando…" />
      </div>
    </form>
  );
}
