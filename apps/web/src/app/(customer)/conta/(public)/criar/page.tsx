import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCustomerAccount } from '@/lib/customer-auth';

import { CustomerSignupForm } from './signup-form';

interface PageProps {
  // `phone` pré-preenche o WhatsApp quando o cliente vem do fim de um agendamento.
  searchParams: Promise<{ phone?: string }>;
}

export default async function CustomerSignupPage({ searchParams }: PageProps) {
  if (await getCustomerAccount()) redirect('/conta');
  const { phone } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Criar conta</CardTitle>
        <CardDescription>
          Acompanhe, remarque e repita seus horários em um só lugar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CustomerSignupForm defaultPhone={phone ?? ''} />
        <p className="text-muted-foreground text-center text-sm">
          Já tem conta?{' '}
          <Link
            href="/conta/entrar"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
        <p className="text-muted-foreground border-t pt-3 text-center text-xs">
          Tem um negócio e quer receber agendamentos?{' '}
          <Link
            href="/signup"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Criar conta da empresa
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
