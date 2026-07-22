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
      card: 'bg-white dark:bg-surface-container-low border border-outline-variant/65',
      icon: 'bg-primary/10 text-primary dark:text-secondary',
      value: 'text-on-surface dark:text-white',
    },
    primary: {
      card: 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border border-primary-container shadow-md',
      icon: 'bg-white/20',
      value: '',
    },
    warning: {
      card: 'bg-white dark:bg-surface-container-low border border-outline-variant/65',
      icon: 'bg-primary/10 text-primary dark:text-secondary',
      value: 'text-primary dark:text-secondary',
    },
    danger: {
      card: 'bg-white dark:bg-surface-container-low border border-outline-variant/65',
      icon: 'bg-tertiary/10 text-tertiary',
      value: 'text-tertiary',
    },
  };

  const v = variants[variant];
  const isInteractive = Boolean(href || onClick);
  const interactiveClasses = isInteractive
    ? 'hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]'
    : '';

  const content = (
    <div className={`p-6 rounded-3xl shadow-sm ${v.card} ${interactiveClasses}`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-bold uppercase font-label ${variant === 'primary' ? 'opacity-90' : 'text-neutral-600 dark:text-neutral-400'}`}>
          {label}
        </span>
        <div className={`p-2 rounded-xl ${v.icon} ${isInteractive ? 'group-hover:scale-110 transition-transform' : ''}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className={`font-headline text-2xl font-extrabold ${v.value}`}>
        {value}
      </div>
      {description && (
        <p className={`text-[11px] mt-2 ${variant === 'primary' ? 'opacity-80' : 'text-neutral-600 dark:text-neutral-400'}`}>
          {description}
        </p>
      )}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-[11px] font-bold ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
          <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} prefetch={false} className="block no-underline">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left focus:outline-none">
        {content}
      </button>
    );
  }

  return content;
}
