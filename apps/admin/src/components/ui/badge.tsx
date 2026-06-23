import * as React from 'react';

import { cn } from '@/lib/utils';

type Variant = 'neutral' | 'success' | 'warning' | 'danger';

const VARIANTS: Record<Variant, string> = {
  neutral: 'bg-secondary text-secondary-foreground',
  success: 'bg-accent text-accent-foreground',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-destructive/10 text-destructive',
};

export function Badge({
  variant = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
