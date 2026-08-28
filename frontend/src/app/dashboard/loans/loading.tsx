import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

export default function LoansLoading() {
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
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-9 w-36 rounded-full" />
          </div>
        </div>
      </div>

      {/* 4 Loan KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 items-stretch">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-10 w-36 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>

      {/* Loans Data Table */}
      <SkeletonTable rows={6} cols={6} hasToolbar={true} />
    </div>
  );
}
