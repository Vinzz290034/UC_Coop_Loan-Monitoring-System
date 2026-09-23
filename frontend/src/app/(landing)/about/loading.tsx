import { Skeleton } from '@/components/ui/Skeleton';

export default function AboutLoading() {
  return (
    <main className="pt-28 pb-16 max-w-4xl mx-auto px-6 space-y-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-4">
        <Skeleton className="h-6 w-52 mx-auto rounded-full" />
        <Skeleton className="h-10 sm:h-12 w-96 mx-auto rounded-2xl max-w-full" />
        <Skeleton className="h-4 w-4/5 mx-auto rounded-full opacity-70" />
      </div>

      {/* Mission / Vision 2 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
        <div className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
          <Skeleton className="w-10 h-10 rounded-2xl" />
          <Skeleton className="h-6 w-36 rounded-xl" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full rounded-full opacity-70" />
            <Skeleton className="h-3 w-5/6 rounded-full opacity-70" />
            <Skeleton className="h-3 w-4/5 rounded-full opacity-70" />
          </div>
        </div>

        <div className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
          <Skeleton className="w-10 h-10 rounded-2xl" />
          <Skeleton className="h-6 w-36 rounded-xl" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full rounded-full opacity-70" />
            <Skeleton className="h-3 w-4/5 rounded-full opacity-70" />
            <Skeleton className="h-3 w-3/4 rounded-full opacity-70" />
          </div>
        </div>
      </div>

      {/* Core Values Section — Vertical Typographic Layout Skeleton */}
      <div className="p-6 sm:p-10 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-outline-variant/30">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-32 rounded-full" />
            <Skeleton className="h-7 w-48 rounded-xl" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>

        <div className="space-y-2 sm:space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 sm:gap-6 p-3 sm:p-4">
              <Skeleton className="w-8 sm:w-10 h-8 sm:h-9 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-6 h-6 rounded-lg flex-shrink-0" />
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
                <Skeleton className="h-3 w-full max-w-md rounded-full opacity-70" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* History Section Skeleton */}
      <div className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-md" />
          <Skeleton className="h-6 w-60 rounded-xl" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-full rounded-full opacity-70" />
          <Skeleton className="h-3 w-11/12 rounded-full opacity-70" />
          <Skeleton className="h-3 w-4/5 rounded-full opacity-70" />
        </div>
      </div>
    </main>
  );
}
