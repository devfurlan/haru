import { cn } from '@/lib/utils';

export function MarketingLogo({ className, dot = false }: { className?: string; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-serif text-2xl font-black tracking-[-0.02em]',
        className,
      )}
    >
      <span>
        Demanda<span className="text-coral">ê</span>
      </span>
      {dot && (
        <span className="h-3 w-3 rounded-full bg-coral shadow-[0_0_0_4px_rgba(255,90,54,0.18)]" />
      )}
    </span>
  );
}
