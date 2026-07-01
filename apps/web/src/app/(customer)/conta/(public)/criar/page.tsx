import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCustomerAccount } from '@/lib/customer-auth';

import { GoogleAuthButton } from '../google-auth-button';
import { OrDivider } from '../or-divider';
import { CustomerSignupForm } from './signup-form';

export default async function CustomerSignupPage() {
  if (await getCustomerAccount()) redirect('/conta');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Criar conta</CardTitle>
        <CardDescription>
          Acompanhe, remarque e repita seus horários em um só lugar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleAuthButton />
        <OrDivider />
        <CustomerSignupForm />
        <p className="text-muted-foreground text-center text-sm">
          Já tem conta?{' '}
          <Link
            href="/conta/entrar"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
        <p className="text-muted-foreground border-t pt-3 text-center text-xs">
          Tem um negócio e quer receber agendamentos?{' '}
          <Link
            href="/signup"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Criar conta da empresa
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
