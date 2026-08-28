import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';

export default function MembersLoading() {
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
          <div className="flex items-center gap-3 flex-wrap">
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-9 w-36 rounded-full" />
          </div>
        </div>
      </div>

      {/* Toolbar with Search, Status filter, Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm">
        <Skeleton className="h-10 w-full sm:w-72 rounded-2xl" />
        <div className="flex items-center gap-3 flex-wrap">
          <Skeleton className="h-10 w-36 rounded-2xl" />
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>
      </div>

      {/* Members Directory Table */}
      <SkeletonTable rows={7} cols={5} hasToolbar={false} />

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-40 rounded-full opacity-70" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
