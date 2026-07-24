'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  /** Optional destination path. If not provided, it will trigger back navigation in history. */
  href?: string;
  /** Optional custom click handler. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  /** Optional custom text. Defaults to "Back". */
  children?: React.ReactNode;
  /** Additional CSS class names. */
  className?: string;
}

export default function BackButton({
  href,
  onClick,
  children = 'Back',
  className,
}: BackButtonProps) {
  const router = useRouter();

  const buttonClasses = cn(
    'inline-flex items-center justify-center gap-2 px-4 py-2 border-2 border-neutral-300 dark:border-neutral-700 rounded-full text-xs font-extrabold text-on-surface dark:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 hover:text-primary dark:hover:text-secondary transition-all active:scale-95 shadow-sm cursor-pointer select-none',
    className
  );

  const handleClick = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    } else if (!href) {
      e.preventDefault();
      // Safely check window history length or default back navigation
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      } else {
        router.push('/');
      }
    }
  };

  if (href) {
    return (
      <Link href={href} className={buttonClasses} onClick={handleClick}>
        <ArrowLeft className="w-4 h-4 flex-shrink-0" />
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={buttonClasses} onClick={handleClick}>
      <ArrowLeft className="w-4 h-4 flex-shrink-0" />
      {children}
    </button>
  );
}
