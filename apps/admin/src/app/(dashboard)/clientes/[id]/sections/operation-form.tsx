'use client';

import { useActionState } from 'react';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

import { Field, SaveRow } from '@/components/form-ui';

import { updateOperation } from '../actions';

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Bahia',
  'America/Fortaleza',
  'America/Recife',
  'America/Belem',
  'America/Manaus',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Noronha',
];

export function OperationForm({
  tenantId,
  values,
}: {
  tenantId: string;
  values: {
    timezone: string;
    publicBookingEnabled: boolean;
    publicBookingConfirmation: 'PENDING' | 'CONFIRMED';
    notificationWebhookUrl: string | null;
    reminderMinutesBefore: number;
    reminderTemplateName: string | null;
    reminderTemplateLanguage: string | null;
    cancelTemplateName: string | null;
    cancelTemplateLanguage: string | null;
    rescheduleTemplateName: string | null;
    rescheduleTemplateLanguage: string | null;
  };
}) {
  const [state, action, pending] = useActionState(updateOperation, undefined);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="tenantId" value={tenantId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fuso horário" htmlFor="timezone">
          <Select id="timezone" name="timezone" defaultValue={values.timezone}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lembrete (minutos antes)" htmlFor="reminderMinutesBefore" hint="0 desativa.">
          <Input
            id="reminderMinutesBefore"
            name="reminderMinutesBefore"
            type="number"
            min={0}
            max={10080}
            defaultValue={values.reminderMinutesBefore}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="publicBookingEnabled"
            defaultChecked={values.publicBookingEnabled}
            className="size-4"
          />
          Agendamento público habilitado
        </label>
        <Field label="Confirmação do agendamento público" htmlFor="publicBookingConfirmation">
          <Select
            id="publicBookingConfirmation"
            name="publicBookingConfirmation"
            defaultValue={values.publicBookingConfirmation}
          >
            <option value="PENDING">Pendente (dono confirma)</option>
            <option value="CONFIRMED">Confirmado na hora</option>
          </Select>
        </Field>
      </div>

      <Field label="Webhook de notificações" htmlFor="notificationWebhookUrl" hint="https:// (Discord, Slack, Zapier, n8n).">
        <Input
          id="notificationWebhookUrl"
          name="notificationWebhookUrl"
          defaultValue={values.notificationWebhookUrl ?? ''}
          placeholder="https://..."
        />
      </Field>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">Templates da Meta</p>
        <TemplateRow
          label="Lembrete"
          namePrefix="reminder"
          name={values.reminderTemplateName}
          lang={values.reminderTemplateLanguage}
        />
        <TemplateRow
          label="Cancelamento"
          namePrefix="cancel"
          name={values.cancelTemplateName}
          lang={values.cancelTemplateLanguage}
        />
        <TemplateRow
          label="Remarcação"
          namePrefix="reschedule"
          name={values.rescheduleTemplateName}
          lang={values.rescheduleTemplateLanguage}
        />
      </div>

      <SaveRow state={state} pending={pending} />
    </form>
  );
}

function TemplateRow({
  label,
  namePrefix,
  name,
  lang,
}: {
  label: string;
  namePrefix: string;
  name: string | null;
  lang: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px]">
      <Input
        name={`${namePrefix}TemplateName`}
        defaultValue={name ?? ''}
        placeholder={`${label} · template name`}
      />
      <Input
        name={`${namePrefix}TemplateLanguage`}
        defaultValue={lang ?? ''}
        placeholder="pt_BR"
      />
    </div>
  );
}
