import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { Logo } from '@/components/logo';

import { Container } from './container';
import { InterestDialog } from './interest-dialog';

const links = [
  { href: '/#diferenciais', label: 'Diferenciais' },
  { href: '/#recursos', label: 'Recursos' },
  { href: '/#como', label: 'Como funciona' },
  { href: '/#breve', label: 'Em breve' },
];

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-cream/80 backdrop-blur-md">
      <Container className="flex h-[70px] items-center justify-between">
        <Link href="/" aria-label="Demandaê">
          <Logo pulse />
        </Link>
        <div className="hidden gap-8 text-[0.95rem] font-semibold md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="opacity-75 transition-opacity hover:opacity-100">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="h-11 rounded-full px-5 font-semibold">
            <Link href="/login">Entrar</Link>
          </Button>
          <InterestDialog>
            <Button variant="coral" className="h-11 rounded-full px-6">
              Começar agora
            </Button>
          </InterestDialog>
        </div>
      </Container>
    </nav>
  );
}
