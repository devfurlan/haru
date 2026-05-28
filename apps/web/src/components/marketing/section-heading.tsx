import { cn } from '@/lib/utils';

import { Eyebrow } from './eyebrow';

export function SectionHeading({
  eyebrow,
  title,
  children,
  dark = false,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('mb-14 max-w-[640px]', className)}>
      <Eyebrow className={dark ? 'text-green-bright' : undefined}>{eyebrow}</Eyebrow>
      <h2
        className={cn(
          'mb-4 mt-4 font-serif text-[clamp(2rem,4vw,3.05rem)] font-semibold leading-[1.05] tracking-[-0.01em]',
          dark ? 'text-cream' : 'text-foreground',
        )}
      >
        {title}
      </h2>
      {children && (
        <p className={cn('text-[1.1rem] leading-relaxed', dark ? 'text-cream/70' : 'text-ink-soft')}>
          {children}
        </p>
      )}
    </div>
  );
}
