import { Skeleton } from '@/components/ui/Skeleton';

export default function NotificationsLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with BackButton & Actions */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-44 rounded-full" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 sm:h-9 w-64 rounded-2xl" />
            <Skeleton className="h-3.5 w-80 rounded-full opacity-70" />
          </div>
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* Grouped Notifications */}
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-20 rounded-full opacity-60" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-2xl flex items-start gap-4 shadow-xs"
            >
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-48 rounded-md" />
                  <Skeleton className="h-3 w-16 rounded-full opacity-60" />
                </div>
                <Skeleton className="h-3 w-full rounded-full opacity-70" />
                <Skeleton className="h-3 w-4/5 rounded-full opacity-70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
