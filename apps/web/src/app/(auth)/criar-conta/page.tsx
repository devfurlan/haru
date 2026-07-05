import { CalendarCheck, ChevronRight, Store } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthTitle } from '@/components/auth-ui';
import { getCurrentUserAndTenant } from '@/lib/auth';
import { getCustomerAccount } from '@/lib/customer-auth';

// Entrada única de cadastro: o usuário escolhe o tipo antes de ir pro formulário certo.
// Deep-links do pricing (/signup?plano=) e da página do negócio (/conta/criar) continuam
// indo direto pro form específico, sem passar por aqui.
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
    <>
      <AuthTitle plain="Criar" accent="conta" subtitle="O que você quer fazer no Demandaê?" />

      <div className="mt-[26px] space-y-3">
        {OPTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="border-line bg-paper flex items-center gap-4 rounded-[18px] border p-4 transition-transform active:scale-[0.99]"
          >
            <div className="bg-chip text-green-deep flex size-11 shrink-0 items-center justify-center rounded-full">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-ink font-semibold leading-tight">{title}</p>
              <p className="text-sub mt-0.5 text-sm">{description}</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-[#c3b79c]" />
          </Link>
        ))}
      </div>

      <p className="text-muted-foreground mt-5 text-center text-sm">
        Já tem conta?{' '}
        <Link href="/login" className="text-coral font-bold">
          Entrar
        </Link>
      </p>
    </>
  );
}
