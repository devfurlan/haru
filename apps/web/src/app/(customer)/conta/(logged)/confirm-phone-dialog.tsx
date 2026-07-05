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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { formatPhoneBR, maskPhoneBRInput } from '@haru/shared';

import { ResendCodeButton } from './resend-code-button';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? 'Confirmando…' : 'Confirmar número'}
    </Button>
  );
}

/**
 * Fluxo de confirmação do WhatsApp (OTP) reusável: renderiza o `trigger` e, ao abrir,
 * roda o mesmo fluxo de verificação (sendCustomerPhoneChangeCode + customerChangePhone).
 * Ao confirmar, o número vira o `phone` oficial e reivindica o histórico de agendamentos
 * (claim). Pré-preenche com o número do cadastro (pendingPhone). Usado tanto na barra do
 * topo quanto no card de aviso da home.
 */
export function ConfirmPhoneDialog({
  pendingPhone,
  trigger,
}: {
  pendingPhone: string | null;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [phone, setPhone] = useState(() => (pendingPhone ? maskPhoneBRInput(pendingPhone) : ''));
  const [code, setCode] = useState('');
  const [sending, startSending] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);
  const [state, formAction] = useActionState<CustomerActionResult, FormData>(
    customerChangePhone,
    undefined,
  );

  // Sucesso: fecha e revalida o layout (barra e card somem quando `phone` passa a existir).
  useEffect(() => {
    if (state && 'ok' in state) {
      setOpen(false);
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

  function reset() {
    setOpen(false);
    setCodeSent(false);
    setCode('');
    setSendError(null);
    setPhone(pendingPhone ? maskPhoneBRInput(pendingPhone) : '');
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : reset())}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent dismissable={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar WhatsApp</DialogTitle>
          <DialogDescription>
            Enviamos um código pra confirmar que o número é seu. Assim você recebe lembretes e
            consegue ver e gerenciar seus agendamentos por aqui.
          </DialogDescription>
        </DialogHeader>

        {!codeSent ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-phone">Seu WhatsApp</Label>
              <Input
                id="confirm-phone"
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
                Enviaremos um código por SMS para confirmar que o número é seu.
              </p>
            </div>
            {sendError && <p className="text-destructive text-sm">{sendError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={reset}>
                Agora não
              </Button>
              <Button type="button" onClick={sendCode} disabled={!canSend}>
                {sending ? 'Enviando código…' : 'Enviar código'}
              </Button>
            </div>
          </div>
        ) : (
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
              <Label htmlFor="confirm-code">Código recebido por SMS</Label>
              <InputOTP
                id="confirm-code"
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

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={reset}>
                Agora não
              </Button>
              <SubmitButton disabled={code.length < 6} />
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
