import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUserAndTenant } from '@/lib/auth';

import { ForgotPasswordForm } from './forgot-password-form';

export default async function ForgotPasswordPage() {
  const current = await getCurrentUserAndTenant();
  if (current) redirect('/dashboard');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Recuperar senha</CardTitle>
        <CardDescription>
          Informe seu email e enviaremos um link para você definir uma nova senha.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgotPasswordForm />
        <p className="text-muted-foreground text-center text-sm">
          Lembrou a senha?{' '}
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Voltar para o login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
