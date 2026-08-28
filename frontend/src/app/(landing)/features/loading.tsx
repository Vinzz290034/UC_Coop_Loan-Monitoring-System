import { Skeleton } from '@/components/ui/Skeleton';

export default function FeaturesLoading() {
  return (
    <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-4">
        <Skeleton className="h-10 w-96 mx-auto rounded-2xl max-w-full" />
        <Skeleton className="h-4 w-4/5 mx-auto rounded-full opacity-70" />
      </div>

      {/* 6 Capabilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-6 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm"
          >
            <Skeleton className="w-11 h-11 rounded-2xl" />
            <Skeleton className="h-5 w-44 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded-full opacity-70" />
              <Skeleton className="h-3 w-5/6 rounded-full opacity-70" />
              <Skeleton className="h-3 w-3/4 rounded-full opacity-70" />
            </div>
          </div>
        ))}
      </div>

      {/* Technical Notice Banner */}
      <div className="p-6 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl flex items-center gap-6 shadow-sm">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-44 rounded-lg" />
          <Skeleton className="h-3 w-full rounded-full opacity-70" />
          <Skeleton className="h-3 w-4/5 rounded-full opacity-70" />
        </div>
      </div>
    </main>
  );
}
