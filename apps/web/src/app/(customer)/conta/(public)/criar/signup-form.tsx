'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState } from 'react';

import { customerSignUp, type CustomerActionResult } from '@/app/(customer)/actions';
import { AuthField, AuthPassword, AuthSubmit } from '@/components/auth-ui';
import { maskPhoneBRInput } from '@haru/shared';

/**
 * Cadastro do cliente em um passo só: nome, e-mail, senha, celular e termos. O celular
 * NÃO é verificado aqui (sem SMS no cadastro) - entra como pendente e a confirmação por
 * código é pedida depois do login. Usada na página /conta/criar (redireciona pra /conta)
 * e como modal dentro do agendamento (`inline` + `onSuccess`), com nome/celular já
 * pré-preenchidos do booking.
 */
export function CustomerSignupForm({
  inline = false,
  defaultName = '',
  defaultPhone = '',
  onSuccess,
}: {
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

  // Inline: ao criar a conta o servidor devolve ok (sem redirect). Avisa uma vez pro pai.
  const firedRef = useRef(false);
  useEffect(() => {
    if (state && 'ok' in state && !firedRef.current) {
      firedRef.current = true;
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-3">
      {inline ? <input type="hidden" name="inline" value="1" /> : null}
      <AuthField
        label="Nome"
        id="name"
        name="name"
        type="text"
        autoComplete="name"
        defaultValue={defaultName}
        required
        placeholder="Seu nome"
      />
      <AuthField
        label="E-mail"
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="seu@email.com"
      />
      <AuthField
        label="WhatsApp"
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
      <AuthPassword
        label="Senha"
        id="password"
        name="password"
        autoComplete="new-password"
        minLength={8}
        required
        placeholder="mínimo 8 caracteres"
      />

      <label className="flex items-start gap-2.5 pt-1">
        <input
          id="acceptTerms"
          name="acceptTerms"
          type="checkbox"
          required
          className="accent-green-deep mt-0.5 size-[18px] shrink-0 rounded"
        />
        <span className="text-sub text-[13px] leading-relaxed">
          Aceito os{' '}
          <Link href="/termos" target="_blank" className="text-coral font-semibold underline">
            Termos de Uso
          </Link>{' '}
          e a{' '}
          <Link href="/privacidade" target="_blank" className="text-coral font-semibold underline">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>

      {state && 'error' in state && <p className="text-destructive text-sm">{state.error}</p>}
      <div className="pt-1">
        <AuthSubmit label="Criar conta" pendingLabel="Criando…" />
      </div>
    </form>
  );
}
