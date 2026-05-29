import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const logoVariants = cva('inline-flex items-center font-serif font-black tracking-[-0.02em]', {
  variants: {
    size: {
      sm: 'gap-1.5 text-lg',
      md: 'gap-2 text-2xl',
      lg: 'gap-2.5 text-4xl',
      xl: 'gap-3 text-5xl',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

// A bolinha sólida + o "halo" mais claro atrás. O halo pode pulsar (efeito
// notificação) via box-shadow animado.
const dotVariants = cva('rounded-full', {
  variants: {
    size: {
      sm: 'h-2.5 w-2.5',
      md: 'h-3 w-3',
      lg: 'h-4 w-4',
      xl: 'h-5 w-5',
    },
    color: {
      coral: 'bg-coral',
      cream: 'bg-cream',
      ink: 'bg-ink',
      currentColor: 'bg-current',
    },
    pulse: {
      true: '',
      false: '',
    },
  },
  compoundVariants: [
    // Estático: halo fixo (mesmo visual do logo original).
    { pulse: false, color: 'coral', class: 'shadow-[0_0_0_4px_rgba(255,90,54,0.18)]' },
    { pulse: false, color: 'cream', class: 'shadow-[0_0_0_4px_rgba(250,245,234,0.25)]' },
    { pulse: false, color: 'ink', class: 'shadow-[0_0_0_4px_rgba(15,31,24,0.18)]' },
    { pulse: false, color: 'currentColor', class: 'shadow-[0_0_0_4px_currentColor]' },
    // Pulsante: anima o halo como uma notificação.
    { pulse: true, color: 'coral', class: 'animate-pulse-ring-coral' },
    { pulse: true, color: 'cream', class: 'animate-pulse-ring' },
    { pulse: true, color: 'ink', class: 'animate-pulse-ring' },
    { pulse: true, color: 'currentColor', class: 'animate-pulse-ring' },
  ],
  defaultVariants: {
    size: 'md',
    color: 'coral',
    pulse: false,
  },
});

type DotColor = NonNullable<VariantProps<typeof dotVariants>['color']>;

export interface LogoProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof logoVariants> {
  /** `full` = texto + bolinha, `wordmark` = só texto, `mark` = só a bolinha. */
  variant?: 'full' | 'wordmark' | 'mark';
  /** Cor da bolinha e do "ê" destacado. */
  color?: DotColor;
  /** Anima o halo atrás da bolinha (efeito notificação). */
  pulse?: boolean;
}

const accentClass: Record<DotColor, string> = {
  coral: 'text-coral',
  cream: 'text-cream',
  ink: 'text-ink',
  currentColor: 'text-current',
};

export function Logo({
  className,
  size,
  variant = 'full',
  color = 'coral',
  pulse = false,
  ...props
}: LogoProps) {
  const dot = (variant === 'full' || variant === 'mark') && (
    <span className={dotVariants({ size, color, pulse })} aria-hidden />
  );

  if (variant === 'mark') {
    return (
      <span className={cn(logoVariants({ size }), className)} {...props}>
        {dot}
      </span>
    );
  }

  return (
    <span className={cn(logoVariants({ size }), className)} {...props}>
      <span>
        Demanda<span className={accentClass[color]}>ê</span>
      </span>
      {dot}
    </span>
  );
}
