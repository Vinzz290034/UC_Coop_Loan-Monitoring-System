import { Skeleton } from '@/components/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with BackButton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-44 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-9 w-64 rounded-2xl" />
          <Skeleton className="h-3.5 w-80 rounded-full opacity-70" />
        </div>
      </div>

      {/* Theme / Appearance Settings Card */}
      <div className="p-6 sm:p-8 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-5 shadow-sm">
        <div className="space-y-1">
          <Skeleton className="h-6 w-44 rounded-xl" />
          <Skeleton className="h-3 w-64 rounded-full opacity-70" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl border border-outline-variant/50 flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-xl" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Notifications & System Preferences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Notification Preferences */}
        <div className="p-6 sm:p-8 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
          <Skeleton className="h-6 w-48 rounded-xl" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-outline-variant/20">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-2.5 w-48 rounded-full opacity-60" />
                </div>
                <Skeleton className="w-10 h-6 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* State of Calamity & Loan Policy */}
        <div className="p-6 sm:p-8 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
          <Skeleton className="h-6 w-48 rounded-xl" />
          <div className="space-y-3 pt-2">
            <Skeleton className="h-3.5 w-full rounded-full opacity-70" />
            <Skeleton className="h-3.5 w-4/5 rounded-full opacity-70" />
            <div className="pt-2 flex justify-end">
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
