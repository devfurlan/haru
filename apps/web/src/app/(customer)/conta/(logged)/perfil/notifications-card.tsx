'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { customerUpdateNotifications, type CustomerActionResult } from '@/app/(customer)/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CustomerNotificationsCardProps {
  appointmentEmailsEnabled: boolean;
  reviewInvitesEnabled: boolean;
  returnRemindersEnabled: boolean;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}

export function CustomerNotificationsCard({
  appointmentEmailsEnabled,
  reviewInvitesEnabled,
  returnRemindersEnabled,
}: CustomerNotificationsCardProps) {
  const [state, formAction] = useActionState<CustomerActionResult, FormData>(
    customerUpdateNotifications,
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>O que você recebe sobre seus agendamentos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2 rounded-lg border border-dashed p-4">
            <label htmlFor="appointmentEmailsEnabled" className="flex items-start gap-3">
              <input
                id="appointmentEmailsEnabled"
                name="appointmentEmailsEnabled"
                type="checkbox"
                defaultChecked={appointmentEmailsEnabled}
                className="border-input mt-0.5 size-4 shrink-0 rounded"
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">Receber e-mails de agendamento</span>
                <span className="text-muted-foreground block text-xs">
                  Confirmação, lembrete, remarcação e cancelamento dos seus agendamentos. Os avisos
                  pelo WhatsApp do estabelecimento continuam normalmente.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-2 rounded-lg border border-dashed p-4">
            <label htmlFor="reviewInvitesEnabled" className="flex items-start gap-3">
              <input
                id="reviewInvitesEnabled"
                name="reviewInvitesEnabled"
                type="checkbox"
                defaultChecked={reviewInvitesEnabled}
                className="border-input mt-0.5 size-4 shrink-0 rounded"
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">Convites para avaliar</span>
                <span className="text-muted-foreground block text-xs">
                  Um lembrete pra avaliar o atendimento pouco depois dele (e-mail e app). Desligar
                  vale pra todos os canais.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-2 rounded-lg border border-dashed p-4">
            <label htmlFor="returnRemindersEnabled" className="flex items-start gap-3">
              <input
                id="returnRemindersEnabled"
                name="returnRemindersEnabled"
                type="checkbox"
                defaultChecked={returnRemindersEnabled}
                className="border-input mt-0.5 size-4 shrink-0 rounded"
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">Lembrete de retorno</span>
                <span className="text-muted-foreground block text-xs">
                  Um empurrãozinho quando chega a hora de voltar (com horários livres pra marcar).
                  Desligar vale pra todos os canais.
                </span>
              </span>
            </label>
          </div>

          {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
          {state && 'ok' in state && (
            <p className="text-sm text-emerald-600">Preferências salvas.</p>
          )}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
