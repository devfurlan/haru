import Link from 'next/link';
import { redirect } from 'next/navigation';

import { GoogleAuthButton } from '@/app/(customer)/conta/(public)/google-auth-button';
import { AuthDivider, AuthTitle } from '@/components/auth-ui';
import { getCurrentUserAndTenant } from '@/lib/auth';
import { getCustomerAccount } from '@/lib/customer-auth';

import { LoginForm } from './login-form';

// Mensagens dos erros que o /auth/callback (OAuth) devolve por query.
const OAUTH_ERRORS: Record<string, string> = {
  'email-existente': 'Esse e-mail já tem uma conta com senha. Entre com e-mail e senha.',
  oauth: 'Não foi possível entrar com o Google. Tente novamente.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Login único: seja dono (User+Tenant) ou cliente (CustomerAccount), a mesma tela
  // autentica; a action de signIn faz o cross-route pro lugar certo. Aqui só desviamos
  // quem já está logado.
  const [owner, customer] = await Promise.all([getCurrentUserAndTenant(), getCustomerAccount()]);
  if (owner) redirect('/dashboard');
  if (customer) redirect('/conta');

  const { error } = await searchParams;
  const errorMessage = error ? OAUTH_ERRORS[error] : undefined;

  return (
    <>
      <AuthTitle plain="Que bom" accent="te ver" subtitle="Entre na sua conta pra continuar." />

      {errorMessage ? <p className="text-destructive mt-4 text-sm">{errorMessage}</p> : null}

      <div className="mt-[26px]">
        <LoginForm />
      </div>

      <AuthDivider />

      <GoogleAuthButton />

      <p className="text-sub mt-5 text-center text-[13px] font-medium">
        Novo por aqui?{' '}
        <Link href="/criar-conta" className="text-coral font-bold">
          Criar conta
        </Link>
      </p>
      <p className="text-muted-foreground border-edge mt-4 border-t pt-3 text-center text-xs">
        Tem um negócio e quer receber agendamentos?{' '}
        <Link href="/" className="text-foreground font-medium underline-offset-4 hover:underline">
          Conhecer o Demandaê
        </Link>
      </p>
    </>
  );
}
