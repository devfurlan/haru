import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { Logo } from '@/components/logo';

import { Container } from './container';

const links = [
  { href: '/#como-cliente', label: 'Como funciona' },
  { href: '/#recursos', label: 'Recursos' },
  { href: '/#app', label: 'App' },
  { href: '/#addon', label: 'Atendente IA' },
  { href: '/precos', label: 'Preços' },
];

export function MarketingNav() {
  return (
    <nav className="border-border bg-cream/80 sticky top-0 z-50 border-b backdrop-blur-md">
      <Container className="flex h-[70px] items-center justify-between">
        <Link href="/" aria-label="Demandaê">
          <Logo pulse />
        </Link>
        <div className="hidden gap-8 text-[0.95rem] font-semibold md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="opacity-75 transition-opacity hover:opacity-100"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            className="hidden h-11 rounded-full px-5 font-semibold sm:inline-flex"
          >
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild variant="coral" className="h-11 rounded-full px-6">
            <Link href="/signup">Começar agora</Link>
          </Button>
        </div>
      </Container>
    </nav>
  );
}
