import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Route-level loading UI for auth routes (login, register, forgot-password).
 * Shown automatically by Next.js during route transitions within /(auth)/*.
 */
export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-background dark:bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Logo placeholder */}
        <div className="text-center space-y-3">
          <Skeleton className="w-14 h-14 rounded-2xl mx-auto" />
          <Skeleton className="h-6 w-32 mx-auto rounded-full" />
        </div>

        {/* Form card skeleton */}
        <div className="p-8 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm space-y-5">
          <Skeleton className="h-5 w-40 rounded-full" />

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          </div>

          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-3 w-48 mx-auto rounded-full" />
        </div>
      </div>
    </div>
  );
}
