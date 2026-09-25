import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

export default function DividendLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top BackButton & Header */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-44 rounded-full" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-60 rounded-2xl" />
            <Skeleton className="h-4 w-80 rounded-full opacity-70" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>
      </div>

      {/* Year Tabs Skeleton */}
      <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
        <Skeleton className="h-10 w-24 rounded-2xl" />
        <Skeleton className="h-10 w-24 rounded-2xl" />
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Table Form Card */}
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl p-6 space-y-4">
        <Skeleton className="h-6 w-48 rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
