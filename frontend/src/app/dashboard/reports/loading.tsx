import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';

export default function ReportsLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with BackButton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-44 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-9 w-64 rounded-2xl" />
          <Skeleton className="h-3.5 w-80 rounded-full opacity-70" />
        </div>
      </div>

      {/* 4 Report Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Skeleton className="h-10 w-36 rounded-full" />
        <Skeleton className="h-10 w-36 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>

      {/* Filter Toolbar */}
      <div className="p-5 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
          <Skeleton className="h-10 w-36 rounded-2xl" />
          <Skeleton className="h-10 w-36 rounded-2xl" />
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>

      {/* Generated Report Table */}
      <SkeletonTable rows={7} cols={6} hasToolbar={false} />
    </div>
  );
}
