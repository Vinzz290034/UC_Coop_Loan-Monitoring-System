import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

/**
 * Route-level loading UI for dashboard routes.
 * Shown automatically by Next.js during route transitions within /dashboard/*.
 * Uses the existing SkeletonCard and SkeletonTable components.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* KPI cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Data table */}
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
