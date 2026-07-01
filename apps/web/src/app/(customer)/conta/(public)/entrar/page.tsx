import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCustomerAccount } from '@/lib/customer-auth';

import { GoogleAuthButton } from '../google-auth-button';
import { OrDivider } from '../or-divider';
import { CustomerLoginForm } from './login-form';

// Mensagens dos erros que o /auth/callback (OAuth) devolve por query.
const OAUTH_ERRORS: Record<string, string> = {
  'email-existente': 'Esse e-mail já tem uma conta com senha. Entre com e-mail e senha.',
  oauth: 'Não foi possível entrar com o Google. Tente novamente.',
};

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Já logado como cliente -> vai direto pra área.
  if (await getCustomerAccount()) redirect('/conta');

  const { error } = await searchParams;
  const errorMessage = error ? OAUTH_ERRORS[error] : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Entrar</CardTitle>
        <CardDescription>Acesse seus horários agendados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}
        <GoogleAuthButton />
        <OrDivider />
        <CustomerLoginForm />
        <p className="text-muted-foreground text-center text-sm">
          Ainda não tem conta?{' '}
          <Link
            href="/conta/criar"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Criar conta
          </Link>
        </p>
        <p className="text-muted-foreground border-t pt-3 text-center text-xs">
          Tem um negócio e quer receber agendamentos?{' '}
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Acessar o painel da empresa
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
