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
        <p className="text-muted-foreground text-center text-sm">
          Ainda não usa o Demandaê?{' '}
          <Link href="/" className="text-foreground font-medium underline-offset-4 hover:underline">
            Quero conhecer
          </Link>
        </p>
        <p className="text-muted-foreground border-t pt-3 text-center text-xs">
          Quer agendar um horário?{' '}
          <Link
            href="/conta/entrar"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Acesse seus agendamentos
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
