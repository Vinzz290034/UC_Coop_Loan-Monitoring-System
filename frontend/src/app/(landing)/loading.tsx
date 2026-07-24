import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Route-level loading UI for the (landing) route group.
 * Next.js automatically wraps this in a Suspense boundary and shows it
 * while the next page's component tree is preparing during navigation.
 */
export default function LandingLoading() {
  return (
    <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-12 animate-in fade-in duration-300">
      {/* Page header skeleton */}
      <div className="text-center space-y-4">
        <Skeleton className="h-10 w-80 mx-auto rounded-2xl" />
        <Skeleton className="h-4 w-96 mx-auto rounded-full max-w-full" />
      </div>

      {/* Content cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm"
          >
            <Skeleton className="w-11 h-11 rounded-2xl" />
            <Skeleton className="h-4 w-32 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-3/4 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
