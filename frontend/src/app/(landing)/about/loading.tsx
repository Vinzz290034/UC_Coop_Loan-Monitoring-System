import { Skeleton } from '@/components/ui/Skeleton';

export default function AboutLoading() {
  return (
    <main className="pt-28 pb-16 max-w-4xl mx-auto px-6 space-y-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-4">
        <Skeleton className="h-10 w-96 mx-auto rounded-2xl max-w-full" />
        <Skeleton className="h-4 w-4/5 mx-auto rounded-full opacity-70" />
      </div>

      {/* Mission / Vision 2 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <div className="p-6 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
          <Skeleton className="w-10 h-10 rounded-2xl" />
          <Skeleton className="h-6 w-36 rounded-xl" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full rounded-full opacity-70" />
            <Skeleton className="h-3 w-5/6 rounded-full opacity-70" />
            <Skeleton className="h-3 w-4/5 rounded-full opacity-70" />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
          <Skeleton className="w-10 h-10 rounded-2xl" />
          <Skeleton className="h-6 w-36 rounded-xl" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full rounded-full opacity-70" />
            <Skeleton className="h-3 w-4/5 rounded-full opacity-70" />
            <Skeleton className="h-3 w-3/4 rounded-full opacity-70" />
          </div>
        </div>
      </div>

      {/* Core Values 3 Cards */}
      <div className="p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-6 shadow-sm">
        <Skeleton className="h-6 w-44 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 border border-outline-variant/40 rounded-2xl space-y-3">
              <Skeleton className="w-8 h-8 rounded-xl" />
              <Skeleton className="h-5 w-28 rounded-lg" />
              <Skeleton className="h-3 w-full rounded-full opacity-70" />
              <Skeleton className="h-3 w-4/5 rounded-full opacity-70" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
