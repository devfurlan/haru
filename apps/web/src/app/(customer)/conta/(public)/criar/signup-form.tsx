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
import { formatPhoneBR, maskPhoneBRInput } from '@/lib/format';

function CreateButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {pending ? 'Criando…' : 'Criar conta'}
    </Button>
  );
}

export function CustomerSignupForm({ defaultPhone = '' }: { defaultPhone?: string }) {
  const [step, setStep] = useState<'dados' | 'codigo'>('dados');

  // Campos coletados no passo 1 (a conta só é criada no passo 2, após o código).
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(() => maskPhoneBRInput(defaultPhone));
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [code, setCode] = useState('');

  const [sending, startSending] = useTransition();
  const [stepError, setStepError] = useState<string | null>(null);

  // Submit final (passo 2): cria a conta validando o código no servidor.
  const [state, formAction] = useActionState<CustomerActionResult, FormData>(
    customerSignUp,
    undefined,
  );

  function sendCode() {
    setStepError(null);
    startSending(async () => {
      const res = await sendCustomerSignupCode(phone);
      if (res && 'error' in res) {
        setStepError(res.error);
        return;
      }
      setStep('codigo');
    });
  }

  // Passo 1 -> valida localmente (só pra não disparar SMS à toa) e envia o código.
  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setStepError('Informe seu nome');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setStepError('E-mail inválido');
    if (password.length < 8) return setStepError('A senha deve ter ao menos 8 caracteres');
    if (phone.replace(/\D/g, '').length < 10)
      return setStepError('Celular inválido - confira o DDD');
    if (!acceptTerms)
      return setStepError('É preciso aceitar os Termos e a Política de Privacidade.');
    sendCode();
  }

  // -------------------------------------------------------------------------
  // Passo 2: confirmar o código recebido por SMS.
  // -------------------------------------------------------------------------
  if (step === 'codigo') {
    return (
      <form action={formAction} className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm">
            Enviamos um código por SMS para <strong>{formatPhoneBR(phone)}</strong>.
          </p>
          <button
            type="button"
            onClick={() => {
              setStep('dados');
              setCode('');
              setStepError(null);
            }}
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          >
            Voltar e corrigir os dados
          </button>
        </div>

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
            autoFocus
            required
          />
          <button
            type="button"
            onClick={sendCode}
            disabled={sending}
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline disabled:opacity-50"
          >
            {sending ? 'Reenviando…' : 'Reenviar código'}
          </button>
        </div>

        {/* Dados do passo 1, enviados junto na criação da conta. */}
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="password" value={password} />
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="acceptTerms" value="on" />

        {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
        {stepError && <p className="text-destructive text-sm">{stepError}</p>}

        <CreateButton disabled={code.length < 4} />
      </form>
    );
  }

  // -------------------------------------------------------------------------
  // Passo 1: dados da conta.
  // -------------------------------------------------------------------------
  return (
    <form onSubmit={handleContinue} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Seu nome</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <p className="text-muted-foreground text-xs">Mínimo de 8 caracteres.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Celular</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          value={phone}
          onChange={(e) => setPhone(maskPhoneBRInput(e.target.value))}
          required
        />
        <p className="text-muted-foreground text-xs">
          Enviaremos um código por SMS para confirmar que o número é seu.
        </p>
      </div>
      <div className="flex items-start gap-2">
        <input
          id="acceptTerms"
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
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

      {stepError && <p className="text-destructive text-sm">{stepError}</p>}

      <Button type="submit" className="w-full" disabled={sending}>
        {sending ? 'Enviando código…' : 'Continuar'}
      </Button>
    </form>
  );
}
