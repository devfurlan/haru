'use client';

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
import { Label } from '@/components/ui/label';
import { formatPhoneBR, maskPhoneBRInput } from '@haru/shared';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? 'Confirmando…' : 'Confirmar número'}
    </Button>
  );
}

/**
 * Barra fixa no topo da área logada que pede a confirmação do WhatsApp (só aparece
 * enquanto a conta não tem telefone confirmado). A verificação reusa o fluxo de OTP
 * já existente (sendCustomerPhoneChangeCode + customerChangePhone): ao confirmar, o
 * número vira o `phone` oficial e reivindica o histórico de agendamentos (claim).
 * Pré-preenche com o número informado no cadastro (pendingPhone).
 */
export function ConfirmPhoneBar({ pendingPhone }: { pendingPhone: string | null }) {
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

  // Sucesso: fecha e revalida o layout (a barra some quando `phone` passa a existir).
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
    <div className="bg-coral/10 border-coral/20 border-b">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
        <p className="text-foreground text-sm">
          <strong className="font-medium">Confirme seu WhatsApp</strong> para ver seus agendamentos
          aqui e receber lembretes.
        </p>
        <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : reset())}>
          <DialogTrigger asChild>
            <Button variant="coral" size="sm" className="shrink-0">
              Confirmar agora
            </Button>
          </DialogTrigger>
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
                  <Input
                    id="confirm-code"
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

                <input type="hidden" name="phone" value={phone} />

                {state && 'error' in state && (
                  <p className="text-destructive text-sm">{state.error}</p>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={reset}>
                    Agora não
                  </Button>
                  <SubmitButton disabled={code.length < 4} />
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
