'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * Toggle 52x32 (trilho esmeralda quando ligado, creme quando desligado; botão
 * branco). Controlado. Sem dependência nova - Radix Switch não está instalado e
 * um `role="switch"` nativo resolve. Usado em Serviços, Horários, Avisos, Página.
 */
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'relative inline-flex h-8 w-[52px] flex-none items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
        checked ? 'border-green-deep bg-green-deep' : 'border-edge bg-cream-2',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block size-6 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  ),
);
Switch.displayName = 'Switch';

export { Switch };
