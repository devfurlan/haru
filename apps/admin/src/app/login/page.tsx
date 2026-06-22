import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminUser } from '@/lib/admin-auth';

import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getAdminUser();
  if (user) redirect('/');

  const { error } = await searchParams;
  const forbidden = error === 'forbidden';

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Admin · Demandaê</CardTitle>
          <CardDescription>Acesso restrito a operadores.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm forbidden={forbidden} />
        </CardContent>
      </Card>
    </main>
  );
}
