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
        // Papel "Administrador" (OWNER) - esmeralda preenchido (como no protótipo)
        admin: 'bg-green-deep text-cream ring-green-deep',
        // Papel "Equipe" (STAFF) - creme neutro
        neutral: 'bg-cream-2 text-ink-70 ring-edge',
        // Status "Ativo"
        success: 'bg-chip text-green-emph ring-green-bright/30',
        // Status "Convite pendente" - âmbar quente
        pending: 'bg-[#fdf0d5] text-[#8a6116] ring-[#f0dca8]',
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
