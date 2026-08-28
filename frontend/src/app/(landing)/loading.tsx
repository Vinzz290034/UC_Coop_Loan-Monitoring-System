import { Skeleton } from '@/components/ui/Skeleton';

export default function LandingLoading() {
  return (
    <main className="pt-24 sm:pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 md:px-12 space-y-16 animate-in fade-in duration-300">
      {/* Hero section skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-8 sm:pt-16">
        {/* Left Copy */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <Skeleton className="h-7 w-72 rounded-full mx-auto lg:mx-0" />
          <div className="space-y-3">
            <Skeleton className="h-12 sm:h-16 w-full max-w-lg rounded-2xl mx-auto lg:mx-0" />
            <Skeleton className="h-10 sm:h-14 w-4/5 rounded-2xl mx-auto lg:mx-0" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto lg:mx-0">
            <Skeleton className="h-4 w-full rounded-full opacity-80" />
            <Skeleton className="h-4 w-5/6 rounded-full opacity-80" />
          </div>
          <div className="flex flex-wrap justify-center lg:justify-start gap-3 pt-2">
            <Skeleton className="h-7 w-44 rounded-full" />
            <Skeleton className="h-7 w-40 rounded-full" />
          </div>
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-4">
            <Skeleton className="h-12 w-44 rounded-full mx-auto sm:mx-0" />
            <Skeleton className="h-12 w-40 rounded-full mx-auto sm:mx-0" />
          </div>
        </div>

        {/* Right Passbook Card Mockup */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-[360px] p-6 bg-neutral-900 border border-white/10 rounded-3xl space-y-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <div className="p-4 rounded-2xl bg-white/5 space-y-3">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-7 w-40 rounded-lg" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* 3 Pillar Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-outline-variant/30">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 p-4">
            <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-36 rounded-xl" />
              <Skeleton className="h-3.5 w-full rounded-full opacity-70" />
              <Skeleton className="h-3.5 w-4/5 rounded-full opacity-70" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
