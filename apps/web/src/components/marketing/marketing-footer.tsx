import Link from 'next/link';

import { Logo } from '@/components/logo';

const links = [
  { href: '/funcionalidades', label: 'Funcionalidades' },
  { href: '/precos', label: 'Preços' },
  { href: '/termos', label: 'Termos' },
];

export function MarketingFooter() {
  return (
    <footer style={{ background: 'var(--emerald)', padding: '38px 0' }}>
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 clamp(16px,4vw,40px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px 24px',
          flexWrap: 'wrap',
        }}
      >
        <Logo color="coral" className="text-cream" />
        <div style={{ font: '400 13px var(--font-ui)', color: 'var(--on-emerald-mut)' }}>
          A operação inteira para quem trabalha com hora marcada · © {new Date().getFullYear()}{' '}
          Demandaê
        </div>
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hv-onem"
              style={{ font: '500 13px var(--font-ui)', color: 'var(--on-emerald-mut)' }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
