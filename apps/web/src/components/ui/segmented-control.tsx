'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string = string> {
  label: string;
  value: T;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange?: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}

/**
 * Controle segmentado (ex.: ordenação em Clientes). Segmento ativo = esmeralda +
 * creme; ocioso = ink-70. Container em paper com hairline creme.
 */
function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-edge bg-paper p-1',
        className,
      )}
      {...props}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(opt.value)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              active ? 'bg-green-deep text-cream' : 'text-ink-70 hover:bg-cream-2',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
SegmentedControl.displayName = 'SegmentedControl';

export { SegmentedControl };
