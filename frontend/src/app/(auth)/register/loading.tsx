import { Skeleton } from '@/components/ui/Skeleton';

export default function RegisterLoading() {
  return (
    <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-xl space-y-6">
        {/* Top bar with back button & theme toggle */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="w-9 h-9 rounded-full" />
        </div>

        {/* Register glass card */}
        <div className="p-8 md:p-10 bg-white/95 dark:bg-neutral-900/95 border border-outline-variant/70 rounded-3xl shadow-2xl space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-60 rounded-2xl" />
            <Skeleton className="h-3.5 w-72 rounded-full opacity-70" />
          </div>

          {/* 3-Step Wizard Indicator */}
          <div className="flex items-center justify-center gap-3 py-2">
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-full" />
            </div>
            <Skeleton className="w-8 h-0.5 rounded-full opacity-40" />
            <div className="flex items-center gap-2">
              <Skeleton className="w-7 h-7 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-full" />
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-11 w-full rounded-2xl" />
              <Skeleton className="h-1.5 w-full rounded-full opacity-50 mt-1" />
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-center gap-2.5 pt-2">
            <Skeleton className="w-4 h-4 rounded-md flex-shrink-0" />
            <Skeleton className="h-3 w-64 rounded-full opacity-70" />
          </div>

          {/* Register Button */}
          <Skeleton className="h-12 w-full rounded-full mt-4" />

          {/* Footer Login Link */}
          <div className="flex justify-center pt-2">
            <Skeleton className="h-3.5 w-48 rounded-full opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
}
