import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUserAndTenant } from '@/lib/auth';

import { SignupForm } from './signup-form';

export default async function SignupPage() {
  const current = await getCurrentUserAndTenant();
  if (current) redirect('/dashboard');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Criar conta</CardTitle>
        <CardDescription>
          Cadastre seu estabelecimento e comece a usar o Demandaê.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignupForm />
        <p className="text-muted-foreground text-center text-sm">
          Já tem conta?{' '}
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
