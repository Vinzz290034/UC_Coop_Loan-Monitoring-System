import { Skeleton, SkeletonCalendarGrid } from '@/components/ui/Skeleton';

export default function CalendarLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with BackButton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-44 rounded-full" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 sm:h-9 w-64 rounded-2xl" />
            <Skeleton className="h-3.5 w-80 rounded-full opacity-70" />
          </div>
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </div>

      {/* 7-Column Calendar Grid + Side Schedule */}
      <SkeletonCalendarGrid />
    </div>
  );
}
