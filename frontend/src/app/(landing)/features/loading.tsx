import { Skeleton } from '@/components/ui/Skeleton';

export default function FeaturesLoading() {
  return (
    <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-14 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-4">
        <Skeleton className="h-6 w-48 mx-auto rounded-full" />
        <Skeleton className="h-10 sm:h-12 w-96 mx-auto rounded-2xl max-w-full" />
        <Skeleton className="h-4 w-4/5 mx-auto rounded-full opacity-70" />
      </div>

      {/* 6 Capabilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-6 sm:p-7 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-5 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="w-12 h-12 rounded-2xl" />
                <Skeleton className="w-8 h-8 rounded-lg opacity-40" />
              </div>
              <Skeleton className="h-5 w-44 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full rounded-full opacity-70" />
                <Skeleton className="h-3 w-5/6 rounded-full opacity-70" />
                <Skeleton className="h-3 w-4/5 rounded-full opacity-70" />
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-md opacity-60" />
            </div>
          </div>
        ))}
      </div>

      {/* Auditable & Compliant Banner */}
      <div className="p-6 sm:p-7 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <Skeleton className="w-11 h-11 rounded-2xl flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48 rounded-lg" />
            <Skeleton className="h-3 w-full max-w-xl rounded-full opacity-70" />
          </div>
        </div>
        <Skeleton className="h-8 w-36 rounded-xl flex-shrink-0" />
      </div>

      {/* Actionable FAQ Section Skeleton */}
      <div className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-6 shadow-sm">
        <div className="space-y-2 pb-2 border-b border-outline-variant/30">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-7 w-56 rounded-xl" />
          <Skeleton className="h-3 w-80 rounded-full opacity-70" />
        </div>

        <div className="divide-y divide-outline-variant/20">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="py-4 flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="w-4 h-4 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
