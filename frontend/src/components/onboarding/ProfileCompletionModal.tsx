'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileCompletionModal({ isOpen, onClose }: ProfileCompletionModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleCompleteNow = () => {
    onClose();
    router.push('/dashboard/profile');
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface dark:bg-neutral-900 rounded-3xl border border-outline-variant/60 shadow-2xl p-6 sm:p-8 space-y-6 relative z-[101]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-headline text-xl font-extrabold text-on-surface dark:text-white">
              Complete Your Personal Information
            </h3>
            <p className="font-label text-xs font-bold text-amber-600 dark:text-amber-400">
              Profile Verification Required
            </p>
          </div>
        </div>

        <p className="font-body text-sm text-on-surface/80 dark:text-neutral-300 leading-relaxed">
          Your account has been successfully created, but you must complete your personal information before you can apply for loans, investments, or access transaction-related features.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-center cursor-pointer"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleCompleteNow}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 dark:shadow-secondary/20 cursor-pointer"
          >
            <span>Complete Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
