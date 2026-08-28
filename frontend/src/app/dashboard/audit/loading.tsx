import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';

export default function AuditLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with BackButton & Action Buttons */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-44 rounded-full" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 sm:h-9 w-64 sm:w-80 rounded-2xl" />
            <Skeleton className="h-3.5 w-72 sm:w-96 rounded-full opacity-70" />
          </div>
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
      </div>

      {/* Audit Log Table with Search/Module Filter Toolbar */}
      <SkeletonTable rows={8} cols={6} hasToolbar={true} />

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-40 rounded-full opacity-70" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
