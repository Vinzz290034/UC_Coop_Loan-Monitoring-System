'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BackButton from '@/components/BackButton';
import BankReconTab from '@/components/reports/BankReconTab';
import TAccountsTab from '@/components/reports/TAccountsTab';
import TrialBalanceTab from '@/components/reports/TrialBalanceTab';
import { Layers, Scale, Landmark } from 'lucide-react';

type GlTab = 't_accounts' | 'trial_balance' | 'bank_recon';

function BankReconPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') as GlTab | null;
  const [activeTab, setActiveTab] = useState<GlTab>(
    tabParam && ['t_accounts', 'trial_balance', 'bank_recon'].includes(tabParam)
      ? tabParam
      : 'trial_balance'
  );

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'staff') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const yearParam = searchParams?.get('year');
  const initialYear = yearParam && !isNaN(Number(yearParam)) ? Number(yearParam) : 2026;

  return (
    <div className="space-y-6 animate-micro-elevate print:p-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <BackButton href="/dashboard">Back to Overview</BackButton>
          <div className="mt-2">
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              General Ledger
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              T-Accounts, Trial Balance &amp; General Ledger, and Cash-in-Bank Reconciliation (BDO, MBTC &amp; Vault).
            </p>
          </div>
        </div>
      </div>

      {/* Accounting Cycle Tabs */}
      <div className="flex items-center gap-2 flex-wrap border-b border-outline-variant/60 pb-3 print:hidden">
        {[
          { key: 'trial_balance' as GlTab, label: 'Trial Balance & GL', icon: Scale },
          { key: 't_accounts' as GlTab, label: 'T-Accounts', icon: Layers },
          { key: 'bank_recon' as GlTab, label: 'Bank Reconciliation', icon: Landmark },
        ].map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#064e3b] text-white shadow-xs'
                  : 'bg-white dark:bg-surface-container-low border border-outline-variant/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-surface-container'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 't_accounts' && <TAccountsTab initialYear={initialYear} />}
      {activeTab === 'trial_balance' && <TrialBalanceTab initialYear={initialYear} />}
      {activeTab === 'bank_recon' && <BankReconTab initialYear={initialYear} />}
    </div>
  );
}

export default function BankReconPage() {
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
      <BankReconPageContent />
    </Suspense>
  );
}
