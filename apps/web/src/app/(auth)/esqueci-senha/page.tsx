import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthTitle } from '@/components/auth-ui';
import { getCurrentUserAndTenant } from '@/lib/auth';

import { ForgotPasswordForm } from './forgot-password-form';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const current = await getCurrentUserAndTenant();
  if (current) redirect('/dashboard');

  const { email } = await searchParams;

  return (
    <>
      <AuthTitle plain="Recuperar" accent="senha" />
      <ForgotPasswordForm defaultEmail={email} />
      <p className="text-muted-foreground mt-5 text-center text-sm">
        Lembrou a senha?{' '}
        <Link href="/login" className="text-coral font-bold">
          Voltar ao login
        </Link>
      </p>
    </>
  );
}
