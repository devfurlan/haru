'use client';

import { useActionState } from 'react';

import { Input } from '@/components/ui/input';

import { Field, SaveRow } from '@/components/form-ui';

import { updateProfile } from '../actions';

export function ProfileForm({
  tenantId,
  values,
}: {
  tenantId: string;
  values: {
    name: string;
    slug: string;
    address: string | null;
    description: string | null;
    whatsappAbout: string | null;
    email: string | null;
  };
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="name">
          <Input id="name" name="name" defaultValue={values.name} required />
        </Field>
        <Field label="Slug (URL pública)" htmlFor="slug">
          <Input id="slug" name="slug" defaultValue={values.slug} required />
        </Field>
      </div>
      <Field label="Endereço" htmlFor="address">
        <Input id="address" name="address" defaultValue={values.address ?? ''} />
      </Field>
      <Field label="Descrição" htmlFor="description" hint="Máx. 256 caracteres.">
        <Input id="description" name="description" defaultValue={values.description ?? ''} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail de contato" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={values.email ?? ''} />
        </Field>
        <Field label="Status do WhatsApp (about)" htmlFor="whatsappAbout" hint="Máx. 139.">
          <Input id="whatsappAbout" name="whatsappAbout" defaultValue={values.whatsappAbout ?? ''} />
        </Field>
      </div>
      <SaveRow state={state} pending={pending} />
    </form>
  );
}
