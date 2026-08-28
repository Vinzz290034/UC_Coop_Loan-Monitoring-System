import { Skeleton } from '@/components/ui/Skeleton';

export default function HowItWorksLoading() {
  return (
    <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-16 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-4">
        <Skeleton className="h-10 w-96 mx-auto rounded-2xl max-w-full" />
        <Skeleton className="h-4 w-80 mx-auto rounded-full opacity-70" />
      </div>

      {/* 3 Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="relative p-6 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <Skeleton className="w-11 h-11 rounded-2xl" />
              <Skeleton className="h-8 w-10 rounded-lg opacity-40" />
            </div>
            <Skeleton className="h-5 w-36 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded-full opacity-70" />
              <Skeleton className="h-3 w-5/6 rounded-full opacity-70" />
              <Skeleton className="h-3 w-4/5 rounded-full opacity-70" />
            </div>
          </div>
        ))}
      </div>

      {/* Action Promo Card */}
      <div className="p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl text-center space-y-5 max-w-xl mx-auto shadow-sm">
        <Skeleton className="h-6 w-64 mx-auto rounded-xl" />
        <Skeleton className="h-3.5 w-80 mx-auto rounded-full opacity-70" />
        <div className="flex justify-center gap-3 pt-2">
          <Skeleton className="h-11 w-36 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      </div>
    </main>
  );
}
