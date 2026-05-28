import Link from 'next/link';

import { Container } from './container';
import { MarketingLogo } from './marketing-logo';

export function MarketingFooter() {
  return (
    <footer className="bg-ink py-10 text-cream/60">
      <Container className="flex flex-wrap items-center justify-between gap-5">
        <MarketingLogo className="text-xl text-cream" />
        <p className="text-[0.85rem]">
          Agendamento por WhatsApp com atendente de IA · © {new Date().getFullYear()} Demandaê
        </p>
        <nav className="flex gap-4 text-[0.85rem]">
          <Link href="/termos" className="transition-colors hover:text-green-bright">
            Termos
          </Link>
          <Link href="/privacidade" className="transition-colors hover:text-green-bright">
            Privacidade
          </Link>
          <Link href="/cookies" className="transition-colors hover:text-green-bright">
            Cookies
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
