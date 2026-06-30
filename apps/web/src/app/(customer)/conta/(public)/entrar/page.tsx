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
      </CardContent>
    </Card>
  );
}
