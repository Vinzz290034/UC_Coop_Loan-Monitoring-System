import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';

export default function AccountingLoading() {
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

      {/* 3 Accounting Ledger Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
        <Skeleton className="h-10 w-36 rounded-full" />
        <Skeleton className="h-10 w-36 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* Member Selector & Summary Balance Card */}
      <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="space-y-2 md:col-span-1">
          <Skeleton className="h-3 w-32 rounded-full" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
        <div className="space-y-2 md:col-span-1">
          <Skeleton className="h-3 w-28 rounded-full opacity-70" />
          <Skeleton className="h-8 w-44 rounded-xl" />
        </div>
        <div className="space-y-2 md:col-span-1">
          <Skeleton className="h-3 w-28 rounded-full opacity-70" />
          <Skeleton className="h-8 w-44 rounded-xl" />
        </div>
      </div>

      {/* Placement / Journal Ledger Table */}
      <SkeletonTable rows={6} cols={6} hasToolbar={true} />
    </div>
  );
}
