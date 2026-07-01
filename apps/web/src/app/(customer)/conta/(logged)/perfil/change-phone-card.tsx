'use client';

import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';

import {
  customerChangePhone,
  sendCustomerPhoneChangeCode,
  type CustomerActionResult,
} from '@/app/(customer)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { formatPhoneBR, maskPhoneBRInput } from '@haru/shared';

import { ResendCodeButton } from '../resend-code-button';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? 'Salvando…' : 'Confirmar novo número'}
    </Button>
  );
}

export function ChangePhoneCard({ currentPhoneDisplay }: { currentPhoneDisplay: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, startSending] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);
  const [state, formAction] = useActionState<CustomerActionResult, FormData>(
    customerChangePhone,
    undefined,
  );

  function reset() {
    setOpen(false);
    setCodeSent(false);
    setPhone('');
    setCode('');
    setSendError(null);
  }

  // Sucesso: fecha e atualiza o número exibido (a página relê o perfil).
  useEffect(() => {
    if (state && 'ok' in state) {
      reset();
      router.refresh();
    }
  }, [state, router]);

  const canSend = phone.replace(/\D/g, '').length >= 10 && !sending;

  function sendCode() {
    setSendError(null);
    startSending(async () => {
      const res = await sendCustomerPhoneChangeCode(phone);
      if (res && 'error' in res) {
        setSendError(res.error);
        return;
      }
      setCodeSent(true);
    });
  }

  const hasPhone = currentPhoneDisplay.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hasPhone ? 'Celular' : 'Conectar WhatsApp'}</CardTitle>
        <CardDescription>
          {hasPhone
            ? `Número atual: ${currentPhoneDisplay}. É o que liga sua conta aos seus agendamentos.`
            : 'Confirme seu WhatsApp para ver e gerenciar aqui os agendamentos que você fez em qualquer estabelecimento.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!open ? (
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            {hasPhone ? 'Trocar número' : 'Conectar meu WhatsApp'}
          </Button>
        ) : !codeSent ? (
          // Passo 1: novo número.
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-phone">Novo número</Label>
              <Input
                id="new-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 91234-5678"
                value={phone}
                onChange={(e) => setPhone(maskPhoneBRInput(e.target.value))}
                autoFocus
                required
              />
              <p className="text-muted-foreground text-xs">
                Enviaremos um código por SMS para confirmar que o novo número é seu.
              </p>
            </div>
            {sendError && <p className="text-destructive text-sm">{sendError}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={reset}>
                Cancelar
              </Button>
              <Button type="button" onClick={sendCode} disabled={!canSend}>
                {sending ? 'Enviando código…' : 'Enviar código por SMS'}
              </Button>
            </div>
          </div>
        ) : (
          // Passo 2: confirmar o código.
          <form action={formAction} className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm">
                Enviamos um código por SMS para <strong>{formatPhoneBR(phone)}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode('');
                  setSendError(null);
                }}
                className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
              >
                Corrigir número
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-phone-code">Código recebido por SMS</Label>
              <InputOTP
                id="new-phone-code"
                name="code"
                maxLength={6}
                pattern={REGEXP_ONLY_DIGITS}
                value={code}
                onChange={setCode}
                autoFocus
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <ResendCodeButton onResend={sendCode} sending={sending} />
            </div>

            <input type="hidden" name="phone" value={phone} />

            {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}

            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={reset}>
                Cancelar
              </Button>
              <SubmitButton disabled={code.length < 6} />
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
