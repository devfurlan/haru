import { cn } from '@/lib/utils';

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-green before:h-0.5 before:w-[22px] before:rounded-sm before:bg-coral before:content-['']",
        className,
      )}
    >
      {children}
    </span>
  );
}
