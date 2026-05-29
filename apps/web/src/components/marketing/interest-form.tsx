'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { submitInterest, type InterestResult } from '@/app/(marketing)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="coral" className="w-full" disabled={pending}>
      {pending ? 'Enviando…' : 'Quero saber mais'}
    </Button>
  );
}

export function InterestForm() {
  const [state, formAction] = useActionState<InterestResult, FormData>(submitInterest, undefined);

  if (state?.ok) {
    return (
      <div className="space-y-2 rounded-xl border border-green-bright/30 bg-green-bright/10 p-6 text-center">
        <p className="font-serif text-xl font-semibold text-green-deep">Recebemos seu interesse!</p>
        <p className="text-sm text-muted-foreground">
          Em breve a gente entra em contato pelo WhatsApp para te ajudar a começar.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Seu nome</Label>
        <Input id="name" name="name" type="text" autoComplete="name" placeholder="João" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="businessName">Nome do seu negócio</Label>
        <Input
          id="businessName"
          name="businessName"
          type="text"
          autoComplete="organization"
          placeholder="Barbearia do João"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email (opcional)</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
        />
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
