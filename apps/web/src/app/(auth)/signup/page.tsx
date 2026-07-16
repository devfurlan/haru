import { TIER_LABEL } from '@haru/billing';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { GoogleAuthButton } from '@/app/(customer)/conta/(public)/google-auth-button';
import { AuthDivider, AuthTitle } from '@/components/auth-ui';
import { getCurrentUserAndTenant } from '@/lib/auth';
import { parsePlanParam } from '@/lib/plan-query';

import { SignupForm } from './signup-form';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const current = await getCurrentUserAndTenant();
  if (current) redirect('/dashboard');

  const plano = parsePlanParam((await searchParams).plano);

  return (
    <>
      <AuthTitle
        plain="Criar"
        accent="conta"
        subtitle="Cadastre seu estabelecimento e comece a usar o Demandaê."
      />

      <div className="mt-[26px]">
        <GoogleAuthButton flow="owner" plano={plano ?? undefined} />
      </div>

      <AuthDivider label="ou com e-mail" />

      <div className="space-y-4">
        {plano && (
          <div className="border-line bg-chip text-ink rounded-[14px] border px-3.5 py-2.5 text-sm">
            Plano escolhido: <strong className="font-semibold">{TIER_LABEL[plano]}</strong>. Você
            confirma e paga depois de criar a conta.
          </div>
        )}
        <SignupForm plano={plano} />
      </div>

      <p className="text-sub mt-5 text-center text-[13px] font-medium">
        Já tem conta?{' '}
        <Link href="/login" className="text-coral font-bold">
          Entrar
        </Link>
      </p>
      <p className="text-muted-foreground border-edge mt-4 border-t pt-3 text-center text-xs">
        Quer agendar um horário?{' '}
        <Link
          href="/conta/criar"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Criar sua conta
        </Link>
      </p>
    </>
  );
}
