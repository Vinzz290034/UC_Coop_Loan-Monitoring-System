'use client';

import React from 'react';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export default function ChartContainer({ title, subtitle, children, className = '', action }: ChartContainerProps) {
  return (
    <div className={`bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-6 shadow-sm ${className}`}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-headline text-base font-bold text-on-surface dark:text-white">{title}</h3>
          {subtitle && (
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}
