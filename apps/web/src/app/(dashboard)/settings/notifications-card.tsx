'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { updateNotifications, type NotificationsActionResult } from './actions';

interface NotificationsCardProps {
  notificationWebhookUrl: string | null;
  reminderHoursBefore: number;
  handoffEmailEnabled: boolean;
  ownerAppointmentEmailsEnabled: boolean;
  reminderTemplateName: string | null;
  reminderTemplateLanguage: string | null;
  cancelTemplateName: string | null;
  cancelTemplateLanguage: string | null;
  rescheduleTemplateName: string | null;
  rescheduleTemplateLanguage: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}

interface TemplateInputsProps {
  title: string;
  description: string;
  fieldPrefix: 'reminder' | 'cancel' | 'reschedule';
  placeholder: string;
  defaultName: string | null;
  defaultLanguage: string | null;
}

function TemplateInputs({
  title,
  description,
  fieldPrefix,
  placeholder,
  defaultName,
  defaultLanguage,
}: TemplateInputsProps) {
  return (
    <div className="space-y-2 rounded-lg border border-dashed p-4">
      <div className="text-sm font-medium">{title}</div>
      <p className="text-muted-foreground text-xs">{description}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${fieldPrefix}TemplateName`}>Nome do template</Label>
          <Input
            id={`${fieldPrefix}TemplateName`}
            name={`${fieldPrefix}TemplateName`}
            defaultValue={defaultName ?? ''}
            placeholder={placeholder}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${fieldPrefix}TemplateLanguage`}>Idioma</Label>
          <Input
            id={`${fieldPrefix}TemplateLanguage`}
            name={`${fieldPrefix}TemplateLanguage`}
            defaultValue={defaultLanguage ?? 'pt_BR'}
            placeholder="pt_BR"
          />
        </div>
      </div>
    </div>
  );
}

export function NotificationsCard(props: NotificationsCardProps) {
  const [state, formAction] = useActionState<NotificationsActionResult | undefined, FormData>(
    updateNotifications,
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>
          Avisos pro dono + mensagens automáticas pros clientes (lembrete, cancelamento,
          remarcação).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notificationWebhookUrl">URL de webhook (opcional)</Label>
            <Input
              id="notificationWebhookUrl"
              name="notificationWebhookUrl"
              type="url"
              defaultValue={props.notificationWebhookUrl ?? ''}
              placeholder="https://discord.com/api/webhooks/..."
            />
            <p className="text-muted-foreground text-xs">
              POST a cada agendamento criado/cancelado/remarcado. Funciona com Discord, Slack,
              Zapier, n8n etc.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminderHoursBefore">Lembrete para o cliente (horas antes)</Label>
            <Input
              id="reminderHoursBefore"
              name="reminderHoursBefore"
              type="number"
              min={0}
              max={168}
              step={1}
              defaultValue={props.reminderHoursBefore}
              required
            />
            <p className="text-muted-foreground text-xs">
              <strong>0 desativa</strong> os lembretes. Padrão: 24h.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-dashed p-4">
            <label htmlFor="handoffEmailEnabled" className="flex items-start gap-3">
              <input
                id="handoffEmailEnabled"
                name="handoffEmailEnabled"
                type="checkbox"
                defaultChecked={props.handoffEmailEnabled}
                className="border-input mt-0.5 size-4 shrink-0 rounded"
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">
                  Aviso por e-mail de atendimento humano
                </span>
                <span className="text-muted-foreground block text-xs">
                  Recebe um e-mail quando um cliente pedir pra falar com uma pessoa no WhatsApp. O
                  aviso no painel acontece sempre, mesmo com isto desligado.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-2 rounded-lg border border-dashed p-4">
            <label htmlFor="ownerAppointmentEmailsEnabled" className="flex items-start gap-3">
              <input
                id="ownerAppointmentEmailsEnabled"
                name="ownerAppointmentEmailsEnabled"
                type="checkbox"
                defaultChecked={props.ownerAppointmentEmailsEnabled}
                className="border-input mt-0.5 size-4 shrink-0 rounded"
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">Aviso por e-mail de agendamentos</span>
                <span className="text-muted-foreground block text-xs">
                  Recebe um e-mail a cada novo agendamento e quando um cliente cancelar ou remarcar.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Templates aprovados na Meta</div>
            <p className="text-muted-foreground text-xs">
              Sem template, as mensagens só funcionam se o cliente conversou nas últimas 24h. Com
              template aprovado, elas disparam sempre. Todos esperam 3 variáveis no body:{' '}
              <code>{`{{1}}`}</code> nome, <code>{`{{2}}`}</code> data/hora, <code>{`{{3}}`}</code>{' '}
              serviço.
            </p>

            <TemplateInputs
              title="Lembrete"
              description="Disparado N horas antes do agendamento."
              fieldPrefix="reminder"
              placeholder="haru_appointment_reminder"
              defaultName={props.reminderTemplateName}
              defaultLanguage={props.reminderTemplateLanguage}
            />
            <TemplateInputs
              title="Cancelamento"
              description="Enviado quando dono ou bot cancela um agendamento."
              fieldPrefix="cancel"
              placeholder="haru_appointment_canceled"
              defaultName={props.cancelTemplateName}
              defaultLanguage={props.cancelTemplateLanguage}
            />
            <TemplateInputs
              title="Remarcação"
              description="Enviado quando dono ou bot move um agendamento para outro horário."
              fieldPrefix="reschedule"
              placeholder="haru_appointment_rescheduled"
              defaultName={props.rescheduleTemplateName}
              defaultLanguage={props.rescheduleTemplateLanguage}
            />
          </div>

          {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
          {state && 'ok' in state && <p className="text-sm text-emerald-600">Salvo.</p>}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
