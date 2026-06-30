import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCustomerAccount } from '@/lib/customer-auth';

import { CustomerLoginForm } from './login-form';

export default async function CustomerLoginPage() {
  // Já logado como cliente -> vai direto pra área.
  if (await getCustomerAccount()) redirect('/conta');

  return (
    <Card>
      <CardHeader>
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Área do cliente
        </p>
        <CardTitle className="font-serif text-2xl">Entrar</CardTitle>
        <CardDescription>Acesse seus agendamentos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          É um estabelecimento?{' '}
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Acessar o painel
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
