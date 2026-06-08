import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuthUser } from '@/lib/auth';

import { ResetPasswordForm } from './reset-password-form';

export default async function ResetPasswordPage() {
  // A sessão de recovery já foi estabelecida pelo /auth/confirm. Sem ela, o link
  // é inválido/expirado (ou o usuário entrou direto).
  const user = await getAuthUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Redefinir senha</CardTitle>
        <CardDescription>Escolha uma nova senha para acessar o painel.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {user ? (
          <ResetPasswordForm />
        ) : (
          <div className="space-y-3">
            <p className="text-destructive text-sm">Link de recuperação inválido ou expirado.</p>
            <Link
              href="/esqueci-senha"
              className="text-foreground text-sm font-medium underline-offset-4 hover:underline"
            >
              Solicitar um novo link
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
