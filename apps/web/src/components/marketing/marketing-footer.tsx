import Link from 'next/link';

import { Logo } from '@/components/logo';

import { Container } from './container';

const columns = [
  {
    title: 'Produto',
    links: [
      { href: '/#cliente', label: 'Como funciona' },
      { href: '/#recursos', label: 'Recursos' },
      { href: '/#planos', label: 'Planos' },
    ],
  },
  {
    title: 'Conta',
    links: [
      { href: '/login', label: 'Entrar' },
      { href: '/signup', label: 'Criar conta' },
      { href: '/#faq', label: 'Dúvidas frequentes' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/termos', label: 'Termos de uso' },
      { href: '/privacidade', label: 'Privacidade' },
      { href: '/cookies', label: 'Cookies' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="bg-[#04120c]">
      <Container className="pb-10 pt-16">
        <div className="flex flex-col gap-12 border-b border-[rgba(143,191,164,.15)] pb-12 md:flex-row md:justify-between">
          <div className="max-w-[280px]">
            <Logo color="cream" className="text-cream mb-3.5 text-xl" />
            <p className="text-on-emerald-faint text-sm leading-[1.5]">
              Sua agenda, sem enrolação. Plataforma brasileira de agendamento pra negócios de
              serviço.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-16 gap-y-8">
            {columns.map((col) => (
              <div key={col.title} className="flex flex-col gap-2.5">
                <div className="text-on-emerald-faint mb-1 text-[0.68rem] font-bold uppercase tracking-[0.14em]">
                  {col.title}
                </div>
                {col.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-cream hover:text-green-bright text-sm font-medium transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="text-on-emerald-faint flex flex-col justify-between gap-2 pt-6 text-[0.78rem] sm:flex-row">
          <span>© {new Date().getFullYear()} Demandaê · Sua agenda, sem enrolação.</span>
          <span>Feito no Brasil · Dados protegidos pela LGPD · Infraestrutura em nuvem</span>
        </div>
      </Container>
    </footer>
  );
}
