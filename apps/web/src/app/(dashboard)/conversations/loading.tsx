import { Skeleton } from '@/components/ui/skeleton';

export default function ConversationsLoading() {
  return (
    <div className="-m-6 flex h-[calc(100vh-0px)]">
      <aside className="hidden w-80 shrink-0 flex-col border-r bg-card md:flex">
        <div className="space-y-2 border-b px-4 py-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex-1 space-y-px overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2 border-b px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
          ))}
        </div>
      </aside>
      <section className="flex flex-1 flex-col bg-muted/20">
        <header className="space-y-2 border-b bg-card px-6 py-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-28" />
        </header>
        <div className="flex-1 space-y-3 p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={i % 2 === 0 ? 'flex justify-start' : 'flex justify-end'}>
              <Skeleton className="h-12 w-[60%] rounded-2xl" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
