import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      // Produto é light-only (sem tema escuro no globals.css); não usar classes
      // dark:, senão a variante segue prefers-color-scheme do SO e quebra o
      // contraste sobre o card creme claro.
      variant: {
        // Papel "Administrador" (OWNER)
        admin: 'bg-violet-200 text-violet-900 ring-violet-300',
        // Papel "Equipe" (STAFF) - neutro de propósito
        neutral: 'bg-slate-200 text-slate-800 ring-slate-300',
        // Status "Ativo"
        success: 'bg-emerald-200 text-emerald-900 ring-emerald-300',
        // Status "Convite pendente"
        pending: 'bg-amber-200 text-amber-900 ring-amber-400',
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
