import { Skeleton } from '@/components/ui/Skeleton';

export default function ForgotPasswordLoading() {
  return (
    <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-md space-y-6">
        {/* Top bar with back button & theme toggle */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="w-9 h-9 rounded-full" />
        </div>

        {/* Forgot password glass card */}
        <div className="p-8 md:p-10 bg-white/95 dark:bg-neutral-900/95 border border-outline-variant/70 rounded-3xl shadow-2xl space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 rounded-2xl" />
            <Skeleton className="h-3.5 w-72 rounded-full opacity-70" />
          </div>

          {/* 3-Step Wizard Indicator */}
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-3 w-16 rounded-full" />
            </div>
            <Skeleton className="w-6 h-0.5 rounded-full opacity-40" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-3 w-16 rounded-full" />
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32 rounded-full" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>

            {/* Submit button */}
            <Skeleton className="h-12 w-full rounded-full mt-4" />

            {/* Back to login link */}
            <div className="flex justify-center pt-2">
              <Skeleton className="h-3.5 w-40 rounded-full opacity-80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
