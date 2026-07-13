import { Skeleton } from '@/components/ui/skeleton';

export default function AssinaturasLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-11 w-[330px] rounded-full" />
      <Skeleton className="h-36 w-full rounded-[20px]" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-[18px]" />
      ))}
    </div>
  );
}
