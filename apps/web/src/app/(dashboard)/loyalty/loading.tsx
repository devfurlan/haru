import { Skeleton } from '@/components/ui/skeleton';

export default function LoyaltyLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
      <Skeleton className="h-9 w-40" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-[20px]" />
      <Skeleton className="h-48 w-full rounded-[20px]" />
    </div>
  );
}
