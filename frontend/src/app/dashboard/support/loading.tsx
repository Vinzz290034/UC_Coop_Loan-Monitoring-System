import { Skeleton } from '@/components/ui/Skeleton';

export default function SupportLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with BackButton & Action Buttons */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-44 rounded-full" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 sm:h-9 w-64 sm:w-80 rounded-2xl" />
            <Skeleton className="h-3.5 w-72 sm:w-96 rounded-full opacity-70" />
          </div>
          <Skeleton className="h-10 w-44 rounded-full" />
        </div>
      </div>

      {/* 2 Support Desk Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
        <Skeleton className="h-10 w-36 rounded-full" />
        <Skeleton className="h-10 w-40 rounded-full" />
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <Skeleton className="h-10 w-full sm:w-72 rounded-2xl" />
        <Skeleton className="h-10 w-36 rounded-2xl" />
      </div>

      {/* Tickets / FAQ Items List */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-md opacity-60" />
              </div>
              <Skeleton className="h-4 w-24 rounded-full opacity-60" />
            </div>
            <Skeleton className="h-5 w-72 sm:w-96 rounded-xl" />
            <Skeleton className="h-3.5 w-full rounded-full opacity-70" />
          </div>
        ))}
      </div>
    </div>
  );
}
