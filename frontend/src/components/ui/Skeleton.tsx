import React from 'react';
import { cn } from '@/lib/utils';

// ─── Base Skeleton ────────────────────────────────────────────────────────────
// A single shimmer block. Use `className` to control size and shape.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'animate-pulse rounded-lg',
        'bg-surface-container-high dark:bg-surface-container-high/60',
        className
      )}
      {...props}
    />
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
// Mimics a KPI / summary card with a title line, a large value, and a sub-line.
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm space-y-4',
        className
      )}
    >
      {/* Icon + label row */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-xl flex-shrink-0" />
        <Skeleton className="h-3 w-24 rounded-full" />
      </div>

      {/* Big value */}
      <Skeleton className="h-8 w-36 rounded-xl" />

      {/* Sub-line */}
      <Skeleton className="h-2.5 w-20 rounded-full" />
    </div>
  );
}

// ─── Skeleton Table ───────────────────────────────────────────────────────────
// Renders a header row + `rows` body rows each with `cols` cell shimmer bars.
interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

function SkeletonTable({ rows = 5, cols = 5, className }: SkeletonTableProps) {
  // Randomised-looking widths so it doesn't look like a grid of identical blocks
  const cellWidths = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16', 'w-36', 'w-24'];

  return (
    <div
      className={cn(
        'bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm',
        className
      )}
    >
      {/* Table header shimmer */}
      <div className="px-6 py-4 border-b border-outline-variant/40 bg-surface-container-low dark:bg-surface-container-high/40 flex items-center gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-3 rounded-full flex-shrink-0', cellWidths[i % cellWidths.length])}
          />
        ))}
      </div>

      {/* Table body shimmer rows */}
      <div className="divide-y divide-outline-variant/30">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-6 py-4 flex items-center gap-6">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className={cn(
                  'h-3.5 rounded-full flex-shrink-0',
                  // Stagger widths between rows to look more realistic
                  cellWidths[(rowIdx + colIdx + 1) % cellWidths.length]
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonTable };
