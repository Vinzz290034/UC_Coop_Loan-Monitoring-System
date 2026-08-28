import { Skeleton } from '@/components/ui/Skeleton';

export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-md space-y-6">
        {/* Top bar with back button & theme toggle placeholder */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="w-9 h-9 rounded-full" />
        </div>

        {/* Login glass card */}
        <div className="p-8 md:p-10 bg-white/95 dark:bg-neutral-900/95 border border-outline-variant/70 rounded-3xl shadow-2xl space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 rounded-2xl" />
            <Skeleton className="h-3.5 w-64 rounded-full opacity-70" />
          </div>

          {/* Form fields */}
          <div className="space-y-5 pt-2">
            {/* Username */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-full" />
              <div className="relative">
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <div className="relative">
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded-md" />
                <Skeleton className="h-3 w-24 rounded-full" />
              </div>
              <Skeleton className="h-3 w-28 rounded-full" />
            </div>

            {/* Submit button */}
            <Skeleton className="h-12 w-full rounded-full mt-6" />

            {/* Footer signup link */}
            <div className="flex justify-center pt-2">
              <Skeleton className="h-3.5 w-52 rounded-full opacity-80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
