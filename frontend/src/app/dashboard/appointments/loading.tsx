import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton';

export default function AppointmentsLoading() {
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
          <Skeleton className="h-10 w-44 rounded-full" />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* Appointments Data Table */}
      <SkeletonTable rows={6} cols={5} hasToolbar={true} />
    </div>
  );
}
