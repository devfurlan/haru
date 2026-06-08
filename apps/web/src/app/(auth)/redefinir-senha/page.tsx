import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { ResetPasswordForm } from './reset-password-form';

interface ResetPasswordPageProps {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token_hash: tokenHash } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Redefinir senha</CardTitle>
        <CardDescription>Escolha uma nova senha para acessar o painel.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResetPasswordForm tokenHash={tokenHash ?? null} />
      </CardContent>
    </Card>
  );
}
