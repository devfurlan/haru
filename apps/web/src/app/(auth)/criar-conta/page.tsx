import { CalendarCheck, ChevronRight, Store } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { getCurrentUserAndTenant } from '@/lib/auth';
import { getCustomerAccount } from '@/lib/customer-auth';

// Entrada única de cadastro: o usuário escolhe o tipo antes de ir pro formulário
// certo. Deep-links do pricing (/signup?plano=) e da página do negócio (/conta/criar)
// continuam indo direto pro form específico, sem passar por aqui.
const OPTIONS = [
  {
    href: '/conta/criar',
    icon: CalendarCheck,
    title: 'Quero agendar horários',
    description: 'Sou cliente e quero marcar, remarcar e acompanhar meus horários.',
  },
  {
    href: '/signup',
    icon: Store,
    title: 'Tenho um negócio',
    description: 'Presto serviços e quero receber agendamentos pelo WhatsApp.',
  },
] as const;

export default async function CreateAccountChooser() {
  const [owner, customer] = await Promise.all([getCurrentUserAndTenant(), getCustomerAccount()]);
  if (owner) redirect('/dashboard');
  if (customer) redirect('/conta');

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h1 className="font-serif text-2xl font-semibold">Criar conta</h1>
        <p className="text-muted-foreground text-sm">O que você quer fazer no Demandaê?</p>
      </div>

      {OPTIONS.map(({ href, icon: Icon, title, description }) => (
        <Link key={href} href={href} className="group block">
          <Card className="hover:border-foreground/30 flex items-center gap-4 p-4 transition-colors">
            <div className="bg-secondary text-foreground flex size-11 shrink-0 items-center justify-center rounded-full">
              <Icon className="size-5" />
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="font-medium leading-tight">{title}</p>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            <ChevronRight className="text-muted-foreground group-hover:text-foreground size-5 shrink-0 transition-colors" />
          </Card>
        </Link>
      ))}

      <p className="text-muted-foreground text-center text-sm">
        Já tem conta?{' '}
        <Link
          href="/login"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
