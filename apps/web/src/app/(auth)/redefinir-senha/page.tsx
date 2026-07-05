import Link from 'next/link';

import { AuthTitle } from '@/components/auth-ui';
import { getAuthUser } from '@/lib/auth';

import { ResetPasswordForm } from './reset-password-form';

export default async function ResetPasswordPage() {
  // A sessão de recovery já foi estabelecida pelo /auth/confirm. Sem ela, o link
  // é inválido/expirado (ou o usuário entrou direto).
  const user = await getAuthUser();

  return (
    <>
      <AuthTitle plain="Nova" accent="senha" subtitle="Escolha uma nova senha para acessar sua conta." />
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="mt-[26px] space-y-3">
          <p className="text-destructive text-sm">Link de recuperação inválido ou expirado.</p>
          <Link href="/esqueci-senha" className="text-coral text-sm font-bold">
            Solicitar um novo link
          </Link>
        </div>
      )}
    </>
  );
}
