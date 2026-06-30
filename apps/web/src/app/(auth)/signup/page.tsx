import { TIER_LABEL } from '@haru/billing';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Criar conta</CardTitle>
        <CardDescription>Cadastre seu estabelecimento e comece a usar o Demandaê.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {plano && (
          <div className="bg-muted/40 rounded-md border px-3 py-2 text-sm">
            Plano escolhido: <strong className="font-medium">{TIER_LABEL[plano]}</strong>. Você
            confirma e paga depois de criar a conta.
          </div>
        )}
        <SignupForm plano={plano} />
        <p className="text-muted-foreground text-center text-sm">
          Já tem conta?{' '}
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
        <p className="text-muted-foreground border-t pt-3 text-center text-xs">
          Quer agendar um horário?{' '}
          <Link
            href="/conta/criar"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Criar sua conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
