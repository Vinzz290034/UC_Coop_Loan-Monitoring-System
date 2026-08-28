import { Skeleton, SkeletonProfileHeader, SkeletonTable } from '@/components/ui/Skeleton';

export default function UserDetailLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Back button & Breadcrumbs */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-36 rounded-full" />
        <Skeleton className="h-4 w-24 rounded-full opacity-60" />
      </div>

      {/* User Hero Banner */}
      <SkeletonProfileHeader />

      {/* Account Details & Permissions Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
          <Skeleton className="h-6 w-40 rounded-xl pb-2 border-b border-outline-variant/40" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-outline-variant/20">
                <Skeleton className="h-3.5 w-24 rounded-md opacity-70" />
                <Skeleton className="h-3.5 w-32 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
          <Skeleton className="h-6 w-44 rounded-xl pb-2 border-b border-outline-variant/40" />
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-outline-variant/20">
                <Skeleton className="h-3.5 w-28 rounded-md opacity-70" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Activity History Table */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40 rounded-xl" />
        <SkeletonTable rows={5} cols={4} hasToolbar={false} />
      </div>
    </div>
  );
}
