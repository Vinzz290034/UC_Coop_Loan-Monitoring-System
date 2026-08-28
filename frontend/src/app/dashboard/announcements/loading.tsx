import { Skeleton } from '@/components/ui/Skeleton';

export default function AnnouncementsLoading() {
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

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <Skeleton className="h-10 w-full sm:w-72 rounded-2xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>

      {/* Announcement Cards Feed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm flex flex-col justify-between"
          >
            {/* Image Placeholder */}
            {i % 2 === 0 && <Skeleton className="h-40 w-full rounded-2xl" />}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-3 w-16 rounded-full opacity-60" />
              </div>
              <Skeleton className="h-5 w-4/5 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-full rounded-full opacity-70" />
                <Skeleton className="h-3 w-5/6 rounded-full opacity-70" />
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-outline-variant/30">
              <Skeleton className="h-3.5 w-24 rounded-full opacity-60" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
