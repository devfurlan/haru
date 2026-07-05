import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthDivider, AuthTitle } from '@/components/auth-ui';
import { getCustomerAccount } from '@/lib/customer-auth';

import { GoogleAuthButton } from '../google-auth-button';
import { CustomerSignupForm } from './signup-form';

export default async function CustomerSignupPage() {
  if (await getCustomerAccount()) redirect('/conta');

  return (
    <>
      <AuthTitle plain="Criar sua" accent="conta" subtitle="Leva um minuto. Depois é só marcar." />

      <div className="mt-[22px]">
        <GoogleAuthButton />
      </div>

      <AuthDivider label="ou com e-mail" />

      <CustomerSignupForm />

      <p className="text-muted-foreground mt-5 text-center text-sm">
        Já tem conta?{' '}
        <Link href="/login" className="text-coral font-bold">
          Entrar
        </Link>
      </p>
      <p className="text-muted-foreground border-edge mt-4 border-t pt-3 text-center text-xs">
        Tem um negócio e quer receber agendamentos?{' '}
        <Link href="/signup" className="text-foreground font-medium underline-offset-4 hover:underline">
          Criar conta da empresa
        </Link>
      </p>
    </>
  );
}
