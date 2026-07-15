import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Botão do design system Demandaê (protótipo Claude Design). Fiel ao Button.jsx do DS:
// primary = coral cheio; secondary = creme com borda + texto esmeralda; raio 14px;
// lg = padding 17/26, md = 14/24. Press-scale via `.dmd-btn:active` (globals.css).
const pads = { md: 'px-6 py-3.5', lg: 'px-6.5 py-4' } as const;
// `!` obrigatório na cor: `.dmd-home a { color: inherit }` (globals.css) é uma regra
// SEM camada, e CSS sem camada vence qualquer `@layer utilities`, independente de
// especificidade. Antes o texto vinha de `style` inline (que ganhava de tudo); como
// classe, `text-white` seria engolido e o botão herdaria o ink do body.
const palettes = {
  primary: 'bg-coral text-white!',
  secondary: 'bg-cream border border-edge text-green-deep!',
} as const;

export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  full = false,
  href = '/signup',
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  full?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'dmd-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans text-[15px] font-semibold leading-[1]',
        pads[size],
        palettes[variant],
        full && 'w-full',
      )}
    >
      {children}
    </Link>
  );
}
