import { Skeleton } from '@/components/ui/Skeleton';

export default function ContactLoading() {
  return (
    <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-4">
        <Skeleton className="h-10 w-80 mx-auto rounded-2xl" />
        <Skeleton className="h-4 w-96 mx-auto rounded-full max-w-full opacity-70" />
      </div>

      {/* 2-Column Contact Info + Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Left: Office Information */}
        <div className="space-y-6">
          <Skeleton className="h-6 w-48 rounded-xl" />
          <Skeleton className="h-3.5 w-full rounded-full opacity-70" />

          <div className="space-y-4 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3.5 p-4 rounded-2xl border border-outline-variant/50 bg-white dark:bg-neutral-900 shadow-xs">
                <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-28 rounded-md" />
                  <Skeleton className="h-3 w-44 rounded-full opacity-70" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Message Form */}
        <div className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-5 shadow-sm">
          <Skeleton className="h-6 w-40 rounded-xl" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-12 w-full rounded-full mt-2" />
          </div>
        </div>
      </div>
    </main>
  );
}
