import Link from 'next/link';

import { Button } from '@/components/ui/button';

import { Logo } from '@/components/logo';

import { Container } from './container';

const links = [
  { href: '/#cliente', label: 'Como funciona' },
  { href: '/#recursos', label: 'Recursos' },
  { href: '/#planos', label: 'Planos' },
  { href: '/#faq', label: 'FAQ' },
];

export function MarketingNav() {
  return (
    <nav className="border-line bg-cream/90 sticky top-0 z-50 border-b backdrop-blur-md">
      <Container className="flex h-[70px] items-center justify-between">
        <Link href="/" aria-label="Demandaê">
          <Logo pulse />
        </Link>
        <div className="hidden items-center gap-1 text-sm font-semibold md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hover:bg-line rounded-full px-3.5 py-2 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="border-green-deep text-green-deep hover:bg-green-deep hover:text-cream hidden h-11 rounded-full border-[1.5px] px-5 font-semibold hover:translate-y-0 sm:inline-flex"
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
