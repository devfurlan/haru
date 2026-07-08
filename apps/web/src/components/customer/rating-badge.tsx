import { cn } from '@/lib/utils';

// Selo de avaliação (★ 4,9). Não renderiza nada até existir avaliação (ratingCount>0),
// então as telas podem sempre montá-lo - some sozinho enquanto o tenant não tem nota.
export function RatingBadge({
  avg,
  count,
  showCount = false,
  className,
}: {
  avg: number | null;
  count: number;
  /** Mostra "(N)" ao lado da média (detalhe do estabelecimento). */
  showCount?: boolean;
  className?: string;
}) {
  if (avg == null || count <= 0) return null;
  return (
    <span
      className={cn(
        'bg-paper text-green-deep inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold',
        className,
      )}
    >
      <span className="text-coral" aria-hidden>
        ★
      </span>
      {avg.toFixed(1).replace('.', ',')}
      {showCount ? ` (${count})` : ''}
    </span>
  );
}
