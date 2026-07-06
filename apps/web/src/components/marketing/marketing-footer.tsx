import Link from 'next/link';

import { Logo } from '@/components/logo';

import { Container } from './container';

export function MarketingFooter() {
  return (
    <footer className="bg-ink text-cream/60 py-10">
      <Container className="flex flex-wrap items-center justify-between gap-5">
        <Logo pulse className="text-cream text-xl" />
        <p className="text-[0.85rem]">
          Agendamento pelo app, pela web e pelo WhatsApp · © {new Date().getFullYear()} Demandaê
        </p>
        <nav className="flex gap-4 text-[0.85rem]">
          <Link href="/termos" className="hover:text-green-bright transition-colors">
            Termos
          </Link>
          <Link href="/privacidade" className="hover:text-green-bright transition-colors">
            Privacidade
          </Link>
          <Link href="/cookies" className="hover:text-green-bright transition-colors">
            Cookies
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
