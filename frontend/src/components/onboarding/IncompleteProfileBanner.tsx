'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface IncompleteProfileBannerProps {
  onActionClick?: () => void;
  status?: string;
  isCompleted?: boolean;
}

export default function IncompleteProfileBanner({ onActionClick, status, isCompleted }: IncompleteProfileBannerProps) {
  const router = useRouter();

  const handleAction = () => {
    if (onActionClick) {
      onActionClick();
    } else {
      router.push('/dashboard/settings');
    }
  };

  if (status === 'approved' || status === 'active') {
    return null;
  }

  const isPendingReview = isCompleted && status === 'pending';
  const isDisapproved = status === 'disapproved';

  let title = 'Your personal information is incomplete.';
  let description = 'You must complete your profile before you can use loan or investment services.';
  let buttonText = 'Finish Now';

  if (isPendingReview) {
    title = 'Your information is currently under review.';
    description = 'Approval typically takes 24–48 hours. You will receive full access to transaction features once approved.';
    buttonText = 'View Profile';
  } else if (isDisapproved) {
    title = 'Profile submission requires revision.';
    description = 'Your profile submission was not approved. Please update your details as requested by management.';
    buttonText = 'Update Profile';
  }

  return (
    <div className="w-full p-4 md:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm mb-6">
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-headline text-sm font-bold text-on-surface dark:text-white">
            {title}
          </h4>
          <p className="font-body text-xs text-on-surface/70 dark:text-neutral-300 mt-0.5">
            {description}
          </p>
        </div>
      </div>

      <button
        onClick={handleAction}
        className="self-end sm:self-auto px-4 py-2 rounded-xl bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-400 text-white dark:text-neutral-950 font-bold text-xs transition-all flex items-center gap-1.5 flex-shrink-0 shadow-md shadow-amber-500/20"
      >
        <span>{buttonText}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
