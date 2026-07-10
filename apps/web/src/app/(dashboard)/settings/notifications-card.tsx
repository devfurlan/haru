'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import {
  toggleOwnerNotification,
  updateNotifications,
  type NotificationsActionResult,
  type OwnerNotificationField,
} from './actions';

interface NotificationsCardProps {
  webhooksEnabled: boolean;
  notificationWebhookUrl: string | null;
  reminderMinutesBefore: number;
  handoffEmailEnabled: boolean;
  ownerAppointmentEmailsEnabled: boolean;
  ownerWhatsappAlertsEnabled: boolean;
  reminderTemplateName: string | null;
  reminderTemplateLanguage: string | null;
  cancelTemplateName: string | null;
  cancelTemplateLanguage: string | null;
  rescheduleTemplateName: string | null;
  rescheduleTemplateLanguage: string | null;
}

/** Linha de aviso pro dono: título + descrição + Switch que salva na hora. */
function ToggleRow({
  field,
  title,
  description,
  initial,
}: {
  field: OwnerNotificationField;
  title: string;
  description: string;
  initial: boolean;
}) {
  const [checked, setChecked] = useState(initial);
  const [, startTransition] = useTransition();

  function handle(next: boolean) {
    setChecked(next); // otimista
    startTransition(async () => {
      const res = await toggleOwnerNotification(field, next);
      if (res && 'error' in res) {
        setChecked(!next); // reverte
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="border-edge flex items-center gap-3 border-t border-dotted py-3">
      <div className="flex-1">
        <div className="text-ink text-[13.5px] font-semibold">{title}</div>
        <div className="text-ink-50 text-[11.5px] font-medium leading-snug">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={handle} />
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
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
    <div className="border-edge space-y-2 rounded-xl border border-dashed p-4">
      <div className="text-ink text-sm font-semibold">{title}</div>
      <p className="text-ink-50 text-xs">{description}</p>

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

/** Config avançada de mensagens pro cliente (lembrete, templates da Meta, webhook).
 *  Fica recolhida por padrão - o essencial pro dono são os toggles acima. */
function AdvancedMessaging(props: NotificationsCardProps) {
  const [state, formAction] = useActionState<NotificationsActionResult | undefined, FormData>(
    updateNotifications,
    undefined,
  );

  return (
    <details className="border-edge group mt-1 border-t border-dotted pt-3">
      <summary className="text-ink-70 flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold [&::-webkit-details-marker]:hidden">
        <span className="text-ink-30 transition-transform group-open:rotate-90">›</span>
        Mensagens pro cliente e templates da Meta
      </summary>

      <form action={formAction} className="mt-3 space-y-4">
        {props.webhooksEnabled && (
          <div className="space-y-2">
            <Label htmlFor="notificationWebhookUrl">URL de webhook (opcional)</Label>
            <Input
              id="notificationWebhookUrl"
              name="notificationWebhookUrl"
              type="url"
              defaultValue={props.notificationWebhookUrl ?? ''}
              placeholder="https://discord.com/api/webhooks/..."
            />
            <p className="text-ink-50 text-xs">
              POST a cada agendamento criado/cancelado/remarcado. Funciona com Discord, Slack,
              Zapier, n8n etc.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="reminderMinutesBefore">Lembrete para o cliente (minutos antes)</Label>
          <Input
            id="reminderMinutesBefore"
            name="reminderMinutesBefore"
            type="number"
            min={0}
            max={10080}
            step={5}
            defaultValue={props.reminderMinutesBefore}
            required
          />
          <p className="text-ink-50 text-xs">
            <strong>0 desativa</strong> os lembretes. Padrão: 30 min.
          </p>
        </div>

        <div className="space-y-3">
          <div className="text-ink text-sm font-semibold">Templates aprovados na Meta</div>
          <p className="text-ink-50 text-xs">
            Sem template, as mensagens só funcionam se o cliente conversou nas últimas 24h. Com
            template aprovado, elas disparam sempre. Todos esperam 3 variáveis no body:{' '}
            <code>{`{{1}}`}</code> nome, <code>{`{{2}}`}</code> data/hora, <code>{`{{3}}`}</code>{' '}
            serviço.
          </p>

          <TemplateInputs
            title="Lembrete"
            description="Disparado N minutos antes do agendamento."
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
        {state && 'ok' in state && <p className="text-green-emph text-sm">Salvo.</p>}

        <SubmitButton />
      </form>
    </details>
  );
}

export function NotificationsCard(props: NotificationsCardProps) {
  return (
    <div className="border-line bg-paper shadow-soft rounded-[18px] border p-[18px]">
      <div className="text-ink font-serif text-[16px] font-semibold">Avisos</div>
      <p className="text-ink-50 mb-1.5 mt-0.5 text-[12px] font-medium">
        O cliente sempre recebe confirmação e lembrete sozinho - isso aqui é pra você.
      </p>

      <ToggleRow
        field="handoffEmailEnabled"
        title="Mensagem de cliente"
        description="E-mail na hora quando alguém te escrever pelo app."
        initial={props.handoffEmailEnabled}
      />
      <ToggleRow
        field="ownerAppointmentEmailsEnabled"
        title="Movimentos da agenda"
        description="E-mail a cada agendamento novo, cancelado ou remarcado."
        initial={props.ownerAppointmentEmailsEnabled}
      />
      <ToggleRow
        field="ownerWhatsappAlertsEnabled"
        title="Alertas de uso e cobrança no WhatsApp"
        description="Só o essencial: perto do limite (90%) e cobrança que falhou."
        initial={props.ownerWhatsappAlertsEnabled}
      />

      <AdvancedMessaging {...props} />
    </div>
  );
}
