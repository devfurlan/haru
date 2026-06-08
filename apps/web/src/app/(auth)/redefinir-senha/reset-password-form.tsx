'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

import { resetPassword, type ResetPasswordResult } from './actions';

type VerifyState = 'verifying' | 'ready' | 'invalid';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Salvando…' : 'Redefinir senha'}
    </Button>
  );
}

export function ResetPasswordForm({ tokenHash }: { tokenHash: string | null }) {
  const router = useRouter();
  const [verify, setVerify] = useState<VerifyState>('verifying');
  const verifiedRef = useRef(false);
  const [state, formAction] = useActionState<ResetPasswordResult | undefined, FormData>(
    resetPassword,
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

  // Sucesso: já há sessão ativa — manda pro painel.
  useEffect(() => {
    if (state && 'ok' in state) {
      router.replace('/dashboard');
      router.refresh();
    }
  }, [state, router]);

  if (verify === 'verifying') {
    return <p className="text-muted-foreground text-sm">Validando seu link…</p>;
  }

  if (verify === 'invalid') {
    return (
      <div className="space-y-3">
        <p className="text-destructive text-sm">Link de recuperação inválido ou expirado.</p>
        <Link
          href="/esqueci-senha"
          className="text-foreground text-sm font-medium underline-offset-4 hover:underline"
        >
          Solicitar um novo link
        </Link>
      </div>
    );
  }

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
