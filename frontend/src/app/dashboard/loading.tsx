import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Greeting Shimmer */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-44 rounded-full" />
        <Skeleton className="h-9 sm:h-10 w-72 sm:w-96 rounded-2xl" />
        <Skeleton className="h-4 w-60 rounded-full opacity-70" />
      </div>

      {/* 4 KPI Balances / Portfolio Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* 2 Big Charts / Financial breakdown containers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
            <Skeleton className="h-6 w-48 rounded-xl" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
          <Skeleton className="h-64 sm:h-72 w-full rounded-2xl" />
        </div>

        <div className="lg:col-span-4 p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm space-y-4">
          <Skeleton className="h-6 w-36 rounded-xl" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3.5 rounded-2xl border border-outline-variant/40 space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                  <Skeleton className="h-3.5 w-16 rounded-md" />
                </div>
                <Skeleton className="h-2 w-full rounded-full opacity-60" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Records / Activity Table */}
      <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-44 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="divide-y divide-outline-variant/30">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                  <Skeleton className="h-2.5 w-24 rounded-full opacity-60" />
                </div>
              </div>
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
