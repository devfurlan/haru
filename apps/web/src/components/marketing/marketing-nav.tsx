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
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: 'rgba(250,245,234,.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--border-soft)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '15px clamp(16px,4vw,40px)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px 28px',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/"
          aria-label="Demandaê"
          style={{ display: 'flex', alignItems: 'center', flex: 'none' }}
        >
          <Logo />
        </Link>
        <nav
          style={{
            display: 'flex',
            gap: 26,
            alignItems: 'center',
            marginLeft: 10,
            flexWrap: 'wrap',
          }}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hv-emerald"
              style={{ font: '600 14px var(--font-ui)', color: 'var(--ink-50)' }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link
            href="/login"
            className="hv-coral"
            style={{ font: '600 14px var(--font-ui)', color: 'var(--ink-70)' }}
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
