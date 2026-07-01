'use client';

import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ponytail: heurística simples (comprimento + variedade de caracteres); trocar por zxcvbn se precisar de força real
function scorePassword(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/\d/.test(pw)) variety++;
  if (/[^A-Za-z0-9]/.test(pw)) variety++;
  if (pw.length < 8) return 1;
  if (pw.length >= 12 && variety >= 3) return 3;
  if (variety >= 3 || (pw.length >= 10 && variety >= 2)) return 2;
  return 1;
}

const LEVELS = [
  { label: '', bar: '' },
  { label: 'Fraca', bar: 'bg-red-500' },
  { label: 'Média', bar: 'bg-orange-500' },
  { label: 'Forte', bar: 'bg-green-600' },
] as const;

const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ onChange, ...props }, ref) => {
  const [score, setScore] = React.useState(0);
  const level = LEVELS[score];

  return (
    <>
      <Input
        ref={ref}
        type="password"
        onChange={(e) => {
          setScore(scorePassword(e.target.value));
          onChange?.(e);
        }}
        {...props}
      />
      {score > 0 && (
        <div className="flex items-center gap-2" aria-live="polite">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3].map((seg) => (
              <div
                key={seg}
                className={cn('h-1 flex-1 rounded-full', seg <= score ? level.bar : 'bg-muted')}
              />
            ))}
          </div>
          <span className="text-muted-foreground w-10 text-xs">{level.label}</span>
        </div>
      )}
    </>
  );
});
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
