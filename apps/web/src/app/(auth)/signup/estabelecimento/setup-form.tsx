'use client';

import type { PlanTier } from '@haru/database';
import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { createOwnerFromOAuth, type ActionResult } from '../../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Criando…' : 'Criar estabelecimento'}
    </Button>
  );
}

export function OwnerSetupForm({ plano }: { plano?: PlanTier | null }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    createOwnerFromOAuth,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {plano && <input type="hidden" name="plano" value={plano} />}
      <div className="space-y-2">
        <Label htmlFor="businessName">Nome do estabelecimento</Label>
        <Input
          id="businessName"
          name="businessName"
          type="text"
          autoComplete="organization"
          placeholder="Barbearia do João"
          autoFocus
          required
        />
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
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
