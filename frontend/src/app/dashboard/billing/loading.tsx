import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

export default function BillingLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with BackButton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-44 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-9 w-64 sm:w-80 rounded-2xl" />
          <Skeleton className="h-3.5 w-72 sm:w-96 rounded-full opacity-70" />
        </div>
      </div>

      {/* 2 Billing Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
        <Skeleton className="h-10 w-48 rounded-full" />
        <Skeleton className="h-10 w-48 rounded-full" />
      </div>

      {/* Date Filter & Summary Toolbar */}
      <div className="p-5 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
          <Skeleton className="h-10 w-36 rounded-2xl" />
          <Skeleton className="h-10 w-36 rounded-2xl" />
          <Skeleton className="h-10 w-24 rounded-2xl" />
        </div>
        <Skeleton className="h-8 w-44 rounded-xl" />
      </div>

      {/* Billing Records Table */}
      <SkeletonTable rows={6} cols={6} hasToolbar={false} />
    </div>
  );
}
