import Link from 'next/link';

import { Logo } from '@/components/logo';

import { Btn } from './home/btn';

const links = [
  { href: '/funcionalidades', label: 'Funcionalidades' },
  { href: '/#diferenciais', label: 'Diferenciais' },
  { href: '/precos', label: 'Preços' },
  { href: '/funcionalidades#em-breve', label: 'Em breve' },
];

export function MarketingNav() {
  return (
    <header
      id="topo"
      className="border-b-line bg-cream/85 sticky top-0 z-[60] border-b backdrop-blur-[14px]"
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-7 gap-y-4 px-[clamp(16px,4vw,40px)] py-4">
        <Link href="/" aria-label="Demandaê" className="flex flex-none items-center">
          <Logo />
        </Link>
        <nav className="gap-6.5 ml-2.5 flex flex-wrap items-center">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              // `text-ink-50!`: `.dmd-home a { color: inherit }` mora fora de @layer no
              // globals.css, e regra sem layer vence qualquer utilitário (que fica em
              // @layer utilities). Sem o `!` o link herdaria --ink e mudaria de cor.
              className="hv-emerald text-ink-50! font-sans text-[14px] font-semibold leading-[normal]"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-5">
          <Link
            href="/login"
            className="hv-coral text-ink-70! font-sans text-[14px] font-semibold leading-[normal]"
          >
            Entrar
          </Link>
          <Btn variant="primary" size="md" href="/signup">
            Começar agora
          </Btn>
        </div>
      </div>
    </header>
  );
}
