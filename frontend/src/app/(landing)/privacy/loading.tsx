import { Skeleton } from '@/components/ui/Skeleton';

export default function PrivacyLoading() {
  return (
    <main className="pt-28 pb-16 max-w-4xl mx-auto px-6 space-y-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-10 w-96 rounded-2xl max-w-full" />
        <Skeleton className="h-4 w-4/5 rounded-full opacity-70" />
      </div>

      {/* 4 Data Protection Principles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-3 shadow-sm">
            <Skeleton className="w-10 h-10 rounded-2xl" />
            <Skeleton className="h-5 w-40 rounded-lg" />
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3 w-full rounded-full opacity-70" />
              <Skeleton className="h-3 w-5/6 rounded-full opacity-70" />
            </div>
          </div>
        ))}
      </div>

      {/* Policy Content Sections */}
      <div className="space-y-6 pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
            <Skeleton className="h-6 w-56 rounded-xl" />
            <div className="space-y-2.5">
              <Skeleton className="h-3.5 w-full rounded-full opacity-80" />
              <Skeleton className="h-3.5 w-full rounded-full opacity-80" />
              <Skeleton className="h-3.5 w-3/4 rounded-full opacity-80" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
