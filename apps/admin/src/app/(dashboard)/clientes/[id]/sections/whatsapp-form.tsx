'use client';

import { useActionState } from 'react';

import { Input } from '@/components/ui/input';

import { Field, SaveRow } from '@/components/form-ui';

import { updateWhatsapp } from '../actions';

export function WhatsappForm({
  tenantId,
  values,
}: {
  tenantId: string;
  values: {
    whatsappPhoneNumberId: string | null;
    whatsappBusinessAccountId: string | null;
    whatsappDisplayPhone: string | null;
    hasToken: boolean;
  };
}) {
  const [state, action, pending] = useActionState(updateWhatsapp, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="phone_number_id" htmlFor="phoneNumberId" hint="Vazio = desconectar.">
          <Input
            id="phoneNumberId"
            name="phoneNumberId"
            defaultValue={values.whatsappPhoneNumberId ?? ''}
          />
        </Field>
        <Field label="business_account_id (WABA)" htmlFor="businessAccountId">
          <Input
            id="businessAccountId"
            name="businessAccountId"
            defaultValue={values.whatsappBusinessAccountId ?? ''}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone de exibição (E.164)" htmlFor="displayPhone">
          <Input
            id="displayPhone"
            name="displayPhone"
            defaultValue={values.whatsappDisplayPhone ?? ''}
            placeholder="5511914092346"
          />
        </Field>
        <Field
          label="access_token"
          htmlFor="accessToken"
          hint={values.hasToken ? 'Já configurado. Deixe vazio para manter.' : 'Obrigatório na conexão.'}
        >
          <Input
            id="accessToken"
            name="accessToken"
            type="password"
            placeholder={values.hasToken ? '••••••••' : ''}
          />
        </Field>
      </div>
      <SaveRow state={state} pending={pending} />
    </form>
  );
}
