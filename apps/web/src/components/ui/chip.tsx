'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Estado selecionado: pílula esmeralda preenchida. */
  selected?: boolean;
  /** Mostra um ponto colorido à esquerda (ex.: cor do profissional). */
  dot?: boolean;
  /** Cor do ponto quando `dot`. Default: verde vivo (selecionado) / muted. */
  dotColor?: string;
}

/**
 * Pílula selecionável (filtros de profissional, escolhas em modais, chips de
 * onboarding). Selecionado = esmeralda + creme; ocioso = paper + ink-70 + hairline
 * creme. Espelha a lógica de cor do protótipo (selected = --emerald / --on-emerald).
 */
const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, selected = false, dot = false, dotColor, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
        selected
          ? 'border-green-deep bg-green-deep text-cream'
          : 'border-edge bg-paper text-ink-70 hover:bg-cream-2',
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className="size-[7px] flex-none rounded-full"
          style={{
            background: dotColor ?? (selected ? 'var(--brand-green-bright)' : 'var(--brand-sub)'),
          }}
        />
      )}
      {children}
    </button>
  ),
);
Chip.displayName = 'Chip';

export { Chip };
