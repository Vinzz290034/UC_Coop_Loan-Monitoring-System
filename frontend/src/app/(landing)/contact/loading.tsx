import { Skeleton } from '@/components/ui/Skeleton';

export default function ContactLoading() {
  return (
    <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-12 animate-in fade-in duration-300">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <Skeleton className="h-6 w-44 mx-auto rounded-full" />
        <Skeleton className="h-10 w-72 sm:w-96 mx-auto rounded-2xl" />
        <Skeleton className="h-4 w-80 sm:w-[480px] mx-auto rounded-full max-w-full opacity-70" />
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Office Information Skeletons */}
        <div className="lg:col-span-6 space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-40 rounded-full" />
            <Skeleton className="h-7 w-52 rounded-xl" />
            <Skeleton className="h-3.5 w-full rounded-full opacity-70" />
            <Skeleton className="h-3.5 w-3/4 rounded-full opacity-70" />
          </div>

          <div className="space-y-4">
            {/* Physical Address Skeleton */}
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-outline-variant/60 shadow-xs space-y-3">
              <div className="flex items-start gap-3.5">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-28 rounded-md" />
                  <Skeleton className="h-4 w-48 rounded-md" />
                  <Skeleton className="h-3 w-36 rounded-md opacity-70" />
                </div>
              </div>
              <div className="pt-2.5 border-t border-outline-variant/30 flex items-center gap-2">
                <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0" />
                <Skeleton className="h-3 w-52 rounded-md" />
              </div>
            </div>

            {/* Sub-cards: Phone & Email Skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-outline-variant/60 shadow-xs flex flex-col justify-between gap-3 h-32">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-2.5 w-24 rounded-md" />
                    <Skeleton className="h-3.5 w-28 rounded-md" />
                    <Skeleton className="h-2.5 w-20 rounded-md opacity-70" />
                  </div>
                </div>
                <Skeleton className="h-3 w-28 rounded-full" />
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-outline-variant/60 shadow-xs flex flex-col justify-between gap-3 h-32">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-2.5 w-24 rounded-md" />
                    <Skeleton className="h-3.5 w-32 rounded-md" />
                    <Skeleton className="h-2.5 w-20 rounded-md opacity-70" />
                  </div>
                </div>
                <Skeleton className="h-3 w-32 rounded-full" />
              </div>
            </div>

            {/* Walk-in Desk Banner Skeleton */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-outline-variant/60 shadow-xs flex items-center gap-3.5">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-36 rounded-md" />
                <Skeleton className="h-3 w-full rounded-md opacity-70" />
              </div>
            </div>

            {/* Preserved IT System Support Box Skeleton */}
            <div className="p-4 rounded-2xl border border-primary/20 dark:border-secondary/20 bg-primary/5 dark:bg-secondary/5 space-y-2">
              <Skeleton className="h-3.5 w-32 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md opacity-70" />
            </div>
          </div>
        </div>

        {/* Right Column: Message Form Skeleton */}
        <div className="lg:col-span-6">
          <div className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <div className="space-y-1">
                <Skeleton className="h-6 w-36 rounded-xl" />
                <Skeleton className="h-3 w-56 rounded-md opacity-70" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>

            {/* Name Field Skeleton */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md opacity-70" />
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            {/* Email Field Skeleton */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-md opacity-70" />
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            {/* Message Field Skeleton */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md opacity-70" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>

            {/* Notice Skeleton */}
            <Skeleton className="h-10 w-full rounded-xl" />

            {/* Button Skeleton */}
            <Skeleton className="h-11 w-full rounded-xl mt-2" />

            {/* Reassurance Footer Skeleton */}
            <Skeleton className="h-3 w-48 mx-auto rounded-full mt-2" />
          </div>
        </div>
      </div>
    </main>
  );
}
