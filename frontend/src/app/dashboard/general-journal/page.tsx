'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BackButton from '@/components/BackButton';
import GeneralJournalTab from '@/components/reports/GeneralJournalTab';

function GeneralJournalPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'staff') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (user && user.role !== 'admin' && user.role !== 'staff') {
    return null;
  }

  const yearParam = searchParams?.get('year');
  const initialYear = yearParam && !isNaN(Number(yearParam)) ? Number(yearParam) : 2026;

  return (
    <div className="space-y-6 animate-micro-elevate print:p-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <BackButton href="/dashboard">Back to Overview</BackButton>
          <div className="mt-2">
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              General Journal
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Daily double-entry book of original entry (Check Vouchers, Collections, RF Liquidations, Share Capital &amp; Adjusting JEVs).
            </p>
          </div>
        </div>
      </div>

      <GeneralJournalTab initialYear={initialYear} />
    </div>
  );
}

export default function GeneralJournalPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      }
    >
      <GeneralJournalPageContent />
    </Suspense>
  );
}
