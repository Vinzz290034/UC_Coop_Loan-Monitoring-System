import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'warning' | 'danger';
  href?: string;
  onClick?: () => void;
}

export default function KpiCard({
  label,
  value,
  icon: Icon,
  description,
  trend,
  variant = 'default',
  href,
  onClick
}: KpiCardProps) {
  const variants = {
    default: {
      card: 'bg-white dark:bg-surface-container-low border border-outline-variant/65 text-on-surface dark:text-white',
      icon: 'bg-primary/10 text-primary dark:text-secondary',
      value: 'text-on-surface dark:text-white',
    },
    primary: {
      card: 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border border-primary-container shadow-md',
      icon: 'bg-white/20 text-white dark:text-neutral-950',
      value: 'text-white dark:text-neutral-950',
    },
    warning: {
      card: 'bg-white dark:bg-surface-container-low border border-outline-variant/65 text-on-surface dark:text-white',
      icon: 'bg-primary/10 text-primary dark:text-secondary',
      value: 'text-primary dark:text-secondary',
    },
    danger: {
      card: 'bg-white dark:bg-surface-container-low border border-outline-variant/65 text-on-surface dark:text-white',
      icon: 'bg-tertiary/10 text-tertiary',
      value: 'text-tertiary',
    },
  };

  const v = variants[variant];
  const isInteractive = Boolean(href || onClick);
  const interactiveClasses = isInteractive
    ? 'hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]'
    : '';

  const valStr = String(value ?? '');

  // Dynamically scale font size based on value string length to prevent card overflow
  const getValueFontSize = (str: string) => {
    if (str.length >= 16) return 'text-sm sm:text-base lg:text-lg tracking-tight';
    if (str.length >= 13) return 'text-base sm:text-lg lg:text-xl tracking-tight';
    if (str.length >= 10) return 'text-lg sm:text-xl lg:text-2xl tracking-tight';
    return 'text-2xl';
  };

  const content = (
    <div className={`h-full flex flex-col justify-between p-4 sm:p-5 rounded-3xl shadow-xs min-w-0 overflow-hidden ${v.card} ${interactiveClasses}`}>
      {/* Header Row with Label & Badge aligned */}
      <div className="flex items-start justify-between gap-3 mb-2 min-h-[2.5rem]">
        <span className={`text-[11px] sm:text-xs font-bold uppercase font-label tracking-wider leading-snug line-clamp-2 ${variant === 'primary' ? 'opacity-90' : 'text-neutral-600 dark:text-neutral-400'}`} title={label}>
          {label}
        </span>
        <div className={`p-2 rounded-xl flex-shrink-0 ${v.icon} ${isInteractive ? 'group-hover:scale-110 transition-transform' : ''}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Main KPI Value Digit */}
      <div className="my-auto py-1">
        <div className={`font-headline font-extrabold tabular-nums tracking-tight leading-tight truncate ${getValueFontSize(valStr)} ${v.value}`} title={valStr}>
          {value}
        </div>
      </div>

      {/* Bottom Subtitle / Trend Description */}
      {(description || trend) && (
        <div className="mt-auto pt-2 space-y-1">
          {description && (
            <p className={`text-[11px] leading-relaxed line-clamp-2 ${variant === 'primary' ? 'opacity-85 font-medium' : 'text-neutral-600 dark:text-neutral-400'}`} title={description}>
              {description}
            </p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 text-[11px] font-bold ${
              trend.isPositive
                ? (variant === 'primary' ? 'text-emerald-100 dark:text-emerald-950 font-black' : 'text-green-600 dark:text-green-400')
                : (variant === 'primary' ? 'text-rose-100 dark:text-rose-950 font-black' : 'text-red-500')
            }`}>
              <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} prefetch={false} className="block h-full no-underline">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full h-full text-left focus:outline-none">
        {content}
      </button>
    );
  }

  return content;
}
