import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

// Botão do design system Demandaê (protótipo Claude Design). Fiel ao Button.jsx do DS:
// primary = coral cheio; secondary = creme com borda + texto esmeralda; raio 14px;
// lg = padding 17/26, md = 14/24. Press-scale via `.dmd-btn:active` (globals.css).
const pads = { md: '14px 24px', lg: '17px 26px' } as const;
const palettes = {
  primary: { background: 'var(--coral)', color: '#fff', border: 'none' },
  secondary: {
    background: 'var(--cream)',
    color: 'var(--emerald)',
    border: '1px solid var(--border)',
  },
} as const;

export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  full = false,
  href = '/signup',
  style,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  full?: boolean;
  href?: string;
  style?: CSSProperties;
}) {
  const s: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    width: full ? '100%' : undefined,
    padding: pads[size],
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-ui)',
    fontWeight: 600,
    fontSize: 15,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    ...palettes[variant],
    ...style,
  };
  return (
    <Link href={href} className="dmd-btn" style={s}>
      {children}
    </Link>
  );
}
