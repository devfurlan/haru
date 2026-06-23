'use client';

import { useActionState, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

import { Field, SaveRow } from '@/components/form-ui';

import { updatePayments } from '../actions';

const PROVIDERS = [
  { value: '', label: 'Nenhum (desativado)' },
  { value: 'ASAAS', label: 'Asaas' },
  { value: 'MERCADO_PAGO', label: 'Mercado Pago' },
  { value: 'PAGBANK', label: 'PagBank' },
  { value: 'PAGARME', label: 'Pagar.me' },
];

export function PaymentsForm({
  tenantId,
  values,
}: {
  tenantId: string;
  values: {
    paymentProvider: string | null;
    paymentSandbox: boolean;
    hasCredential: boolean;
    hasWebhookToken: boolean;
  };
}) {
  const [state, action, pending] = useActionState(updatePayments, undefined);
  const [provider, setProvider] = useState(values.paymentProvider ?? '');

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gateway" htmlFor="provider">
          <Select
            id="provider"
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="sandbox"
            defaultChecked={values.paymentSandbox}
            className="size-4"
          />
          Sandbox (testes)
        </label>
      </div>

      {provider && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Credencial (API key / token)"
            htmlFor="credential"
            hint={values.hasCredential ? 'Já configurada. Deixe vazio para manter.' : 'Obrigatória.'}
          >
            <Input
              id="credential"
              name="credential"
              type="password"
              placeholder={values.hasCredential ? '••••••••' : ''}
            />
          </Field>
          <Field
            label="Webhook token"
            htmlFor="webhookToken"
            hint={values.hasWebhookToken ? 'Já configurado. Deixe vazio para manter.' : 'Opcional.'}
          >
            <Input
              id="webhookToken"
              name="webhookToken"
              type="password"
              placeholder={values.hasWebhookToken ? '••••••••' : ''}
            />
          </Field>
        </div>
      )}

      <SaveRow state={state} pending={pending} />
    </form>
  );
}
