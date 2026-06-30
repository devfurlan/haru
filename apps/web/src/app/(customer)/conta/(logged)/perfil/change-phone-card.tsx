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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { maskPhoneBRInput } from '@/lib/format';

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
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, startSending] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);
  const [state, formAction] = useActionState<CustomerActionResult, FormData>(
    customerChangePhone,
    undefined,
  );

  function reset() {
    setOpen(false);
    setPhone('');
    setCode('');
    setCodeSent(false);
    setSendError(null);
  }

  // Sucesso: fecha e atualiza o número exibido (a página relê o perfil).
  useEffect(() => {
    if (state && 'ok' in state) {
      reset();
      router.refresh();
    }
  }, [state, router]);

  const phoneDigits = phone.replace(/\D/g, '');
  const canSend = phoneDigits.length >= 10 && !sending;

  function handleSendCode() {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Celular</CardTitle>
        <CardDescription>
          Número atual: {currentPhoneDisplay || 'não informado'}. É o que liga sua conta aos seus
          agendamentos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!open ? (
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            Trocar número
          </Button>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-phone">Novo número</Label>
              <Input
                id="new-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 91234-5678"
                value={phone}
                onChange={(e) => setPhone(maskPhoneBRInput(e.target.value))}
                readOnly={codeSent}
                required
              />
              <p className="text-muted-foreground text-xs">
                Enviamos um código por SMS para confirmar que o novo número é seu.
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
                <Label htmlFor="new-phone-code">Código recebido por SMS</Label>
                <Input
                  id="new-phone-code"
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
                    Corrigir número
                  </button>
                </div>
                {sendError && <p className="text-destructive text-sm">{sendError}</p>}
              </div>
            )}

            {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}

            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={reset}>
                Cancelar
              </Button>
              <SubmitButton disabled={!codeSent || code.length < 4} />
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
