import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-4xl font-bold">haru</h1>
        <p className="text-muted-foreground">
          Agendamento e pagamentos pelo WhatsApp para barbearias, clínicas, podólogas e outros
          negócios de serviço.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/signup">Criar conta</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Entrar</Link>
        </Button>
      </div>
    </main>
  );
}
