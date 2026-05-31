import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      variant: {
        // Papel "Administrador" (OWNER)
        admin:
          'bg-violet-100 text-violet-900 ring-violet-200 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-500/30',
        // Papel "Equipe" (STAFF) — neutro de propósito
        neutral:
          'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600',
        // Status "Ativo"
        success:
          'bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/30',
        // Status "Convite pendente"
        pending:
          'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-500/30',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
