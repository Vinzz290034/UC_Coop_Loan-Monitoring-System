import { Skeleton, SkeletonLegalLayout } from '@/components/ui/Skeleton';

export default function TermsLoading() {
  return (
    <main className="pt-28 pb-16 max-w-6xl mx-auto px-6 space-y-10 animate-in fade-in duration-300">
      {/* Header with BackButton */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-28 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-36 rounded-full" />
          <Skeleton className="h-10 w-96 rounded-2xl max-w-full" />
          <Skeleton className="h-4 w-80 rounded-full opacity-70" />
        </div>
      </div>

      {/* Sticky ToC Sidebar + Multi-Section Article Cards */}
      <SkeletonLegalLayout />
    </main>
  );
}
