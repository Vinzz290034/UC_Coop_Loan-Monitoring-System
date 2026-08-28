import React from 'react';
import { cn } from '@/lib/utils';

// ─── Base Skeleton ────────────────────────────────────────────────────────────
// A single shimmer block. Use `className` to control size and shape.
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'animate-pulse rounded-xl',
        'bg-surface-container-high dark:bg-surface-container-high/60',
        className
      )}
      {...props}
    />
  );
}

// ─── Skeleton Card (KPI Card) ────────────────────────────────────────────────
// Mimics a KPI / summary metric card with icon container, label, large value, and sub-line.
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-5 sm:p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-2xl flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-2.5 w-16 rounded-full opacity-60" />
        </div>
      </div>
      <div className="space-y-2 mt-2">
        <Skeleton className="h-8 w-36 rounded-xl" />
        <Skeleton className="h-3 w-28 rounded-full opacity-70" />
      </div>
    </div>
  );
}

// ─── Skeleton Header (Page Header & Actions) ──────────────────────────────────
// Mimics standard dashboard/landing header with BackButton, title, subtitle, and action buttons.
export function SkeletonHeader({
  hasBack = true,
  hasActions = true,
  className,
}: {
  hasBack?: boolean;
  hasActions?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {hasBack && <Skeleton className="h-8 w-36 rounded-full" />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-9 w-64 sm:w-80 rounded-2xl" />
          <Skeleton className="h-3.5 w-72 sm:w-96 rounded-full opacity-70" />
        </div>
        {hasActions && (
          <div className="flex items-center gap-3 flex-wrap">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton Table ───────────────────────────────────────────────────────────
// Renders optional search/filters toolbar, table header row, and `rows` body rows.
interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  hasToolbar?: boolean;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  cols = 5,
  hasToolbar = true,
  className,
}: SkeletonTableProps) {
  const cellWidths = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16', 'w-36', 'w-24'];

  return (
    <div className={cn('space-y-4', className)}>
      {hasToolbar && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Skeleton className="h-10 w-full sm:w-72 rounded-2xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32 rounded-2xl" />
            <Skeleton className="h-10 w-28 rounded-2xl" />
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
        {/* Table Header shimmer */}
        <div className="px-6 py-4 border-b border-outline-variant/40 bg-surface-container-low dark:bg-surface-container-high/40 flex items-center justify-between gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn('h-3 rounded-full flex-shrink-0', cellWidths[i % cellWidths.length])}
            />
          ))}
        </div>

        {/* Table Body shimmer rows */}
        <div className="divide-y divide-outline-variant/30">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <div key={rowIdx} className="px-6 py-4 flex items-center justify-between gap-6">
              {Array.from({ length: cols }).map((_, colIdx) => (
                <Skeleton
                  key={colIdx}
                  className={cn(
                    'h-3.5 rounded-full flex-shrink-0',
                    cellWidths[(rowIdx + colIdx + 1) % cellWidths.length]
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Form ────────────────────────────────────────────────────────────
// Mimics a form card (like Auth / Profile) with field labels, inputs, and submit button.
export function SkeletonForm({
  fields = 3,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'p-6 sm:p-8 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm space-y-6',
        className
      )}
    >
      <div className="space-y-2">
        <Skeleton className="h-6 w-48 rounded-xl" />
        <Skeleton className="h-3 w-64 rounded-full opacity-70" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
        ))}
      </div>

      <Skeleton className="h-12 w-full rounded-full mt-4" />
    </div>
  );
}

// ─── Skeleton Profile Header ──────────────────────────────────────────────────
// Mimics a member/user profile hero banner with avatar, name, badges, and action buttons.
export function SkeletonProfileHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-6 sm:p-8 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6',
        className
      )}
    >
      <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex-shrink-0" />
      <div className="flex-1 space-y-3 text-center md:text-left w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48 sm:w-64 rounded-xl mx-auto md:mx-0" />
            <Skeleton className="h-3.5 w-36 rounded-full mx-auto md:mx-0 opacity-70" />
          </div>
          <div className="flex items-center justify-center md:justify-end gap-2.5">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Calendar Grid ───────────────────────────────────────────────────
// Mimics a monthly 7-column calendar grid with month navigation and side schedule cards.
export function SkeletonCalendarGrid({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-8', className)}>
      {/* Calendar Grid (8 cols) */}
      <div className="lg:col-span-8 p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm space-y-6">
        {/* Month Header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40 rounded-xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </div>

        {/* 7 Days Header */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-6 rounded-lg mx-auto w-10" />
          ))}
        </div>

        {/* 35 Days Grid */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="h-16 sm:h-20 p-2 rounded-2xl border border-outline-variant/30 dark:border-neutral-800 bg-surface-container-low/40 dark:bg-neutral-900/30 flex flex-col justify-between"
            >
              <Skeleton className="w-5 h-5 rounded-md" />
              {i % 4 === 0 && <Skeleton className="h-3 w-full rounded-md mt-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Side Schedule List (4 cols) */}
      <div className="lg:col-span-4 space-y-4">
        <Skeleton className="h-6 w-36 rounded-xl mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-2xl space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40 rounded-lg" />
            <Skeleton className="h-3 w-full rounded-full opacity-70" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton Master Detail (Messages / Inbox) ────────────────────────────────
// Mimics a 2-pane messaging layout (left list of threads, right message detail).
export function SkeletonMasterDetail({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm min-h-[600px]',
        className
      )}
    >
      {/* Left List Pane (5 cols) */}
      <div className="lg:col-span-5 p-5 border-r border-outline-variant/40 space-y-4">
        <Skeleton className="h-10 w-full rounded-2xl" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="space-y-3 divide-y divide-outline-variant/20 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="pt-3 flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3.5 w-28 rounded-full" />
                  <Skeleton className="h-2.5 w-12 rounded-full opacity-60" />
                </div>
                <Skeleton className="h-3 w-40 rounded-full" />
                <Skeleton className="h-2.5 w-full rounded-full opacity-70" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Detail Pane (7 cols) */}
      <div className="lg:col-span-7 p-6 space-y-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36 rounded-lg" />
                <Skeleton className="h-3 w-48 rounded-full opacity-70" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-5 w-56 rounded-xl" />
            <Skeleton className="h-3 w-full rounded-full opacity-80" />
            <Skeleton className="h-3 w-full rounded-full opacity-80" />
            <Skeleton className="h-3 w-3/4 rounded-full opacity-80" />
          </div>
        </div>

        <div className="pt-4 border-t border-outline-variant/40 space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="flex justify-end">
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Legal Layout (Terms / Privacy) ──────────────────────────────────
// Mimics a sticky Table of Contents sidebar on left + content section cards on right.
export function SkeletonLegalLayout({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-8 items-start', className)}>
      {/* Sticky ToC Sidebar (4 cols) */}
      <div className="lg:col-span-4 p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
        <Skeleton className="h-4 w-36 rounded-full mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl">
              <Skeleton className="w-5 h-5 rounded-lg flex-shrink-0" />
              <Skeleton className="h-3.5 w-32 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Content Sections (8 cols) */}
      <div className="lg:col-span-8 space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-6 sm:p-8 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-xl" />
              <Skeleton className="h-5 w-48 rounded-xl" />
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-3 w-full rounded-full opacity-80" />
              <Skeleton className="h-3 w-full rounded-full opacity-80" />
              <Skeleton className="h-3 w-4/5 rounded-full opacity-80" />
              <Skeleton className="h-3 w-2/3 rounded-full opacity-80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
