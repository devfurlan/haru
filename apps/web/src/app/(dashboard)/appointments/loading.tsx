import { Skeleton } from '@/components/ui/skeleton';

export default function AppointmentsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-56 rounded-full" />
      </div>
      <Skeleton className="h-11 w-64 rounded-full" />
      <Skeleton className="h-10 w-72 rounded-full" />
      <div className="flex flex-wrap items-start gap-4">
        <Skeleton className="h-[40rem] min-w-0 flex-1 rounded-[18px]" />
        <div className="flex w-[320px] max-w-full flex-none flex-col gap-3.5">
          <Skeleton className="h-72 w-full rounded-[18px]" />
        </div>
      </div>
    </div>
  );
}
