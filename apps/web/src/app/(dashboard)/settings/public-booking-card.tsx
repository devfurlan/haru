'use client';

import { Check, Copy } from 'lucide-react';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

import { type PublicBookingActionResult, updatePublicBooking } from './actions';

interface PublicBookingCardProps {
  slug: string;
  publicBookingEnabled: boolean;
  publicBookingConfirmation: 'PENDING' | 'CONFIRMED';
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}

export function PublicBookingCard({
  slug,
  publicBookingEnabled,
  publicBookingConfirmation,
}: PublicBookingCardProps) {
  const [state, formAction] = useActionState<PublicBookingActionResult | undefined, FormData>(
    updatePublicBooking,
    undefined,
  );

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.demandae.com').replace(/\/$/, '');
  const publicUrl = `${baseUrl}/${slug}`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard pode falhar fora de https/localhost — ignora silenciosamente.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendamento online</CardTitle>
        <CardDescription>
          Deixe o cliente agendar direto pela sua página pública, sem abrir o WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label>Sua página pública</Label>
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 truncate rounded-md border px-3 py-2 text-sm">
                {publicUrl}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={copy} title="Copiar link">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={publicBookingEnabled}
              className="border-input mt-0.5 h-4 w-4 rounded"
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">Habilitar agendamento online</span>
              <span className="text-muted-foreground block text-xs">
                Desligado, a página só mostra serviços, horários e o botão de WhatsApp.
              </span>
            </span>
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Como os pedidos entram</legend>
            <label className="flex items-start gap-3 rounded-lg border p-3">
              <input
                type="radio"
                name="confirmation"
                value="PENDING"
                defaultChecked={publicBookingConfirmation === 'PENDING'}
                className="mt-0.5 h-4 w-4"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">Pendentes — você confirma</span>
                <span className="text-muted-foreground block text-xs">
                  O pedido entra como pendente e aparece em Agendamentos pra você aprovar.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border p-3">
              <input
                type="radio"
                name="confirmation"
                value="CONFIRMED"
                defaultChecked={publicBookingConfirmation === 'CONFIRMED'}
                className="mt-0.5 h-4 w-4"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">Confirmados na hora</span>
                <span className="text-muted-foreground block text-xs">
                  O horário já fica reservado assim que o cliente agenda.
                </span>
              </span>
            </label>
          </fieldset>

          {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
          {state && 'ok' in state && <p className="text-sm text-emerald-600">Salvo.</p>}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
