import { Skeleton, SkeletonCard, SkeletonProfileHeader } from '@/components/ui/Skeleton';

export default function MemberProfileDetailLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-36 rounded-full" />
        <Skeleton className="h-4 w-24 rounded-full opacity-60" />
      </div>

      {/* Member Profile Hero Banner */}
      <SkeletonProfileHeader />

      {/* 4 Balance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Personal Info Grid & History Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Demographic Info Card (5 cols) */}
        <div className="lg:col-span-5 p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
          <Skeleton className="h-6 w-48 rounded-xl pb-2 border-b border-outline-variant/40" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-outline-variant/20">
                <Skeleton className="h-3.5 w-24 rounded-md opacity-70" />
                <Skeleton className="h-3.5 w-32 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* History / Transactions Tabs & Records (7 cols) */}
        <div className="lg:col-span-7 p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-full" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-2xl border border-outline-variant/40 flex items-center justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-3 w-28 rounded-full opacity-60" />
                </div>
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
