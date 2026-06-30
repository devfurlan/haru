'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { customerSignUp, type CustomerActionResult } from '@/app/(customer)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { maskPhoneBRInput } from '@/lib/format';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Criando…' : 'Criar conta'}
    </Button>
  );
}

export function CustomerSignupForm({ defaultPhone = '' }: { defaultPhone?: string }) {
  const [state, formAction] = useActionState<CustomerActionResult, FormData>(
    customerSignUp,
    undefined,
  );
  const [phone, setPhone] = useState(() => maskPhoneBRInput(defaultPhone));

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Seu nome</Label>
        <Input id="name" name="name" type="text" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">WhatsApp</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 91409-2346"
          value={phone}
          onChange={(e) => setPhone(maskPhoneBRInput(e.target.value))}
          required
        />
        <p className="text-muted-foreground text-xs">
          É por ele que ligamos sua conta aos seus agendamentos.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-muted-foreground text-xs">Mínimo de 8 caracteres.</p>
      </div>
      <div className="flex items-start gap-2">
        <input
          id="acceptTerms"
          name="acceptTerms"
          type="checkbox"
          value="on"
          required
          className="border-input accent-foreground mt-0.5 size-4 shrink-0 rounded"
        />
        <Label
          htmlFor="acceptTerms"
          className="text-muted-foreground text-xs font-normal leading-relaxed"
        >
          Li e concordo com os{' '}
          <Link href="/termos" target="_blank" className="font-medium underline underline-offset-4">
            Termos de Serviço
          </Link>{' '}
          e a{' '}
          <Link
            href="/privacidade"
            target="_blank"
            className="font-medium underline underline-offset-4"
          >
            Política de Privacidade
          </Link>
          .
        </Label>
      </div>
      {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
