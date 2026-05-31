import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { ActivateForm } from './activate-form';

interface ActivatePageProps {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}

export default async function ActivatePage({ searchParams }: ActivatePageProps) {
  const { token_hash: tokenHash } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Ativar sua conta</CardTitle>
        <CardDescription>Defina uma senha para acessar o painel do estabelecimento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ActivateForm tokenHash={tokenHash ?? null} />
      </CardContent>
    </Card>
  );
}
