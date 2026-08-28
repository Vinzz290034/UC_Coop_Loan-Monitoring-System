import { Skeleton, SkeletonProfileHeader } from '@/components/ui/Skeleton';

export default function ProfileLoading() {
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

      {/* Avatar Profile Hero Banner */}
      <SkeletonProfileHeader />

      {/* Personal Info Grid + Security Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Personal Details Form (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-8 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm space-y-6">
          <div className="space-y-2 pb-2 border-b border-outline-variant/40">
            <Skeleton className="h-6 w-44 rounded-xl" />
            <Skeleton className="h-3.5 w-64 rounded-full opacity-70" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Skeleton className="h-11 w-36 rounded-full" />
          </div>
        </div>

        {/* Password & Security Card (5 cols) */}
        <div className="lg:col-span-5 p-6 sm:p-8 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm space-y-5">
          <div className="space-y-2 pb-2 border-b border-outline-variant/40">
            <Skeleton className="h-6 w-40 rounded-xl" />
            <Skeleton className="h-3.5 w-52 rounded-full opacity-70" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
          </div>

          <Skeleton className="h-11 w-full rounded-full mt-2" />
        </div>
      </div>
    </div>
  );
}
