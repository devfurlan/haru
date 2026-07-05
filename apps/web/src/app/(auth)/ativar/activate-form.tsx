'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { createClient } from '@/lib/supabase/client';

import { activateAccount, type ActivateActionResult } from './actions';

type VerifyState = 'verifying' | 'ready' | 'invalid';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Ativando…' : 'Ativar conta'}
    </Button>
  );
}

export function ActivateForm({ tokenHash }: { tokenHash: string | null }) {
  const router = useRouter();
  const [verify, setVerify] = useState<VerifyState>('verifying');
  const verifiedRef = useRef(false);
  const [state, formAction] = useActionState<ActivateActionResult | undefined, FormData>(
    activateAccount,
    undefined,
  );

  // Troca o token do link por uma sessão (cookie). Sem sessão, o servidor recusa
  // a definição de senha. O token é single-use: o `verifiedRef` evita a segunda
  // chamada do StrictMode em dev (que invalidaria o token na 2ª passada).
  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    if (!tokenHash) {
      setVerify('invalid');
      return;
    }
    const supabase = createClient();
    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      .then(({ error }) => setVerify(error ? 'invalid' : 'ready'));
  }, [tokenHash]);

  // Sucesso: já há sessão ativa - manda pro painel.
  useEffect(() => {
    if (state && 'ok' in state) {
      router.replace('/dashboard');
      router.refresh();
    }
  }, [state, router]);

  if (verify === 'verifying') {
    return <p className="text-sm text-muted-foreground">Validando seu convite…</p>;
  }

  if (verify === 'invalid') {
    return (
      <p className="text-sm text-destructive">
        Link de ativação inválido ou expirado. Peça um novo convite ao administrador do
        estabelecimento.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
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
        <Label htmlFor="confirm">Confirme a senha</Label>
        <PasswordInput
          id="confirm"
          name="confirm"
          strength={false}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state && 'error' in state && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
