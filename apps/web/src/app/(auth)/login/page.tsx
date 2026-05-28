import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUserAndTenant } from '@/lib/auth';

import { LoginForm } from './login-form';

export default async function LoginPage() {
  const current = await getCurrentUserAndTenant();
  if (current) redirect('/dashboard');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Entrar</CardTitle>
        <CardDescription>Acesse o painel do seu estabelecimento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Criar agora
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
