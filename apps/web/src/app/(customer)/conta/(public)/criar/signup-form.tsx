'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import {
  customerSignUp,
  sendCustomerSignupCode,
  type CustomerActionResult,
} from '@/app/(customer)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { maskPhoneBRInput } from '@/lib/format';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {pending ? 'Criando…' : 'Criar conta'}
    </Button>
  );
}

export function CustomerSignupForm({ defaultPhone = '' }: { defaultPhone?: string }) {
  const [state, formAction] = useActionState<CustomerActionResult, FormData>(
    customerSignUp,
    undefined,
  );
  const [phone, setPhone] = useState(() => maskPhoneBRInput(defaultPhone));
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, startSending] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);

  const phoneDigits = phone.replace(/\D/g, '');
  const canSend = phoneDigits.length >= 10 && !sending;

  function handleSendCode() {
    setSendError(null);
    startSending(async () => {
      const res = await sendCustomerSignupCode(phone);
      if (res && 'error' in res) {
        setSendError(res.error);
        return;
      }
      setCodeSent(true);
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Seu nome</Label>
        <Input id="name" name="name" type="text" autoComplete="name" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Celular</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 91409-2346"
          value={phone}
          onChange={(e) => setPhone(maskPhoneBRInput(e.target.value))}
          readOnly={codeSent}
          required
        />
        <p className="text-muted-foreground text-xs">
          Enviamos um código por SMS para confirmar que o número é seu - é o que liga sua conta aos
          seus agendamentos.
        </p>
      </div>

      {!codeSent ? (
        <div className="space-y-1">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleSendCode}
            disabled={!canSend}
          >
            {sending ? 'Enviando…' : 'Enviar código por SMS'}
          </Button>
          {sendError && <p className="text-destructive text-sm">{sendError}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="code">Código recebido por SMS</Label>
          <Input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending}
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline disabled:opacity-50"
            >
              {sending ? 'Reenviando…' : 'Reenviar código'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCodeSent(false);
                setCode('');
                setSendError(null);
              }}
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
            >
              Trocar número
            </button>
          </div>
          {sendError && <p className="text-destructive text-sm">{sendError}</p>}
        </div>
      )}

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
        <p className="text-muted-foreground text-xs">Mínimo de 8 caracteres.</p>
      </div>
      <div className="flex items-start gap-2">
        <input
          id="acceptTerms"
          name="acceptTerms"
          type="checkbox"
          value="on"
          required
          className="border-input accent-foreground mt-0.5 size-4 shrink-0 rounded"
        />
        <Label
          htmlFor="acceptTerms"
          className="text-muted-foreground text-xs font-normal leading-relaxed"
        >
          Li e concordo com os{' '}
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
        </Label>
      </div>
      {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
      <SubmitButton disabled={!codeSent || code.length < 4} />
    </form>
  );
}
