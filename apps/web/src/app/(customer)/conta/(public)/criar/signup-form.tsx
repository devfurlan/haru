'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { customerSignUp, type CustomerActionResult } from '@/app/(customer)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { maskPhoneBRInput } from '@/lib/format';

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Criando…' : 'Criar conta'}
    </Button>
  );
}

/**
 * Cadastro do cliente em um passo só: nome, e-mail, senha, celular e termos. O
 * celular NÃO é verificado aqui (sem SMS no cadastro) - entra como pendente e a
 * confirmação por código é pedida depois do login, na barra fixa no topo da área
 * logada. Só após confirmar é que o número vira oficial e conecta a conta ao
 * histórico de agendamentos (claim).
 *
 * Usada em dois lugares: na página /conta/criar (redireciona pra /conta ao criar)
 * e como modal dentro do agendamento (`inline` + `onSuccess`) - aí não navega pra
 * fora e chega com nome/celular já digitados no booking pré-preenchidos.
 */
export function CustomerSignupForm({
  inline = false,
  defaultName = '',
  defaultPhone = '',
  onSuccess,
}: {
  /** Modal dentro do agendamento: não redireciona; chama onSuccess ao criar. */
  inline?: boolean;
  defaultName?: string;
  defaultPhone?: string;
  onSuccess?: () => void;
} = {}) {
  const [phone, setPhone] = useState(() => maskPhoneBRInput(defaultPhone));
  const [state, formAction] = useActionState<CustomerActionResult, FormData>(
    customerSignUp,
    undefined,
  );

  // Inline: ao criar a conta o servidor devolve ok (sem redirect). Avisa uma vez
  // pro pai fechar o modal e seguir o agendamento.
  const firedRef = useRef(false);
  useEffect(() => {
    if (state && 'ok' in state && !firedRef.current) {
      firedRef.current = true;
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {inline ? <input type="hidden" name="inline" value="1" /> : null}
      <div className="space-y-2">
        <Label htmlFor="name">Seu nome</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={defaultName}
          required
        />
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
      <div className="space-y-2">
        <Label htmlFor="phone">Celular</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 91234-5678"
          value={phone}
          onChange={(e) => setPhone(maskPhoneBRInput(e.target.value))}
          required
        />
      </div>
      <div className="flex items-start gap-2">
        <input
          id="acceptTerms"
          name="acceptTerms"
          type="checkbox"
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

      <CreateButton />
    </form>
  );
}
