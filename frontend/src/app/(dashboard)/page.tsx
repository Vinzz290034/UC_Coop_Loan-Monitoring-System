'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Coins,
  ShieldCheck,
  Building,
  UserPlus,
  FileCheck,
  PlusCircle,
  PiggyBank,
  CheckCircle2,
  CalendarCheck,
  Percent,
  User as UserIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OverviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [adminMetrics, setAdminMetrics] = useState<any>(null);
  const [memberMetrics, setMemberMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);
        if (user.role === 'admin' || user.role === 'manager') {
          const response = await api.get('/loans/metrics/summary');
          setAdminMetrics(response.data.data);
        } else if (user.role === 'member') {
          const memberId = user.profile?.id;
          if (memberId) {
            const response = await api.get(`/members/${memberId}/dashboard-summary`);
            setMemberMetrics(response.data.data);
          } else {
            setError('Could not associate authenticated session with member profile.');
          }
        }
      } catch (err: any) {
        console.error('Error fetching dashboard summary:', err);
        setError(err.response?.data?.message || 'Error loading dashboard metrics.');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-neutral/20 w-48 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl">
        <h4 className="font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Data Fetch Error
        </h4>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  // --- MEMBER VIEW ---
  if (user?.role === 'member') {
    const balances = memberMetrics?.balances || { share_capital: 0, fixed_deposits: 0, investments: 0, total_assets: 0 };
    const loans = memberMetrics?.loans || { active_count: 0, original_principal: 0, outstanding_balance: 0 };

    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface dark:text-white">
            Welcome back, {memberMetrics?.full_name || user.username}!
          </h1>
          <p className="font-body text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Cooperative Member Ledger Account Summary
          </p>
        </div>

        {/* Member Balances Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Share Capital</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary dark:text-secondary">
                <Building className="w-5 h-5" />
              </div>
            </div>
            <div className="font-headline text-2xl font-extrabold text-on-surface dark:text-white">
              {formatCurrency(balances.share_capital)}
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">Cumulative equity contributions</p>
          </div>

          <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Fixed Deposit</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary dark:text-secondary">
                <PiggyBank className="w-5 h-5" />
              </div>
            </div>
            <div className="font-headline text-2xl font-extrabold text-on-surface dark:text-white">
              {formatCurrency(balances.fixed_deposits)}
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">High-yield timed placement placements</p>
          </div>

          <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Coop Investments</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary dark:text-secondary">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="font-headline text-2xl font-extrabold text-on-surface dark:text-white">
              {formatCurrency(balances.investments)}
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">Member-backed investment portfolios</p>
          </div>

          <div className="p-6 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-3xl shadow-md border border-primary-container">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase font-label opacity-90">Total Net Assets</span>
              <div className="p-2 rounded-xl bg-white/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="font-headline text-3xl font-extrabold">
              {formatCurrency(balances.total_assets)}
            </div>
            <p className="text-[11px] opacity-80 mt-2">Total non-loan asset valuation</p>
          </div>
        </div>

        {/* Member Loan Summary card */}
        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-2">
            <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">Active Loan Account</h3>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
              Your ongoing active repayment obligations and outstanding balance matrix.
            </p>
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface dark:bg-surface-container-high border border-outline-variant text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
              {loans.active_count} Active Debt Contracts
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral/5 dark:bg-neutral/10 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Original Principal</span>
            <div className="font-headline text-lg font-extrabold text-on-surface dark:text-white mt-1">
              {formatCurrency(loans.original_principal)}
            </div>
            <span className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-1">Borrowed Loan volume</span>
          </div>

          <div className="p-4 rounded-2xl bg-tertiary/10 border border-tertiary/20 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-tertiary uppercase font-label">Outstanding Balance</span>
            <div className="font-headline text-2xl font-extrabold text-tertiary mt-1">
              {formatCurrency(loans.outstanding_balance)}
            </div>
            <span className="text-[10px] text-tertiary/85 mt-1">Remaining payment principal</span>
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN / MANAGER VIEW ---
  const health = adminMetrics?.portfolio_health || { active_loans: 0, defaulted_loans: 0, pending_applications: 0 };
  const aggregates = adminMetrics?.ledger_aggregates || { total_capital_deployed: 0, total_principal_recovered: 0, current_outstanding_balance: 0, total_interest_earned: 0 };
  const recoveryRate = aggregates.total_capital_deployed > 0 
    ? (aggregates.total_principal_recovered / aggregates.total_capital_deployed) * 100 
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-extrabold text-on-surface dark:text-white">
          System Overview
        </h1>
        <p className="font-body text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          Cooperative Credit Monitoring & Portfolio Metrics
        </p>
      </div>

      {/* Admin metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Deployed Capital</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary dark:text-secondary">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="font-headline text-2xl font-extrabold text-on-surface dark:text-white">
            {formatCurrency(aggregates.total_capital_deployed)}
          </div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">Cumulative disbursed principal volume</p>
        </div>

        <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Outstanding Principal</span>
            <div className="p-2 rounded-xl bg-tertiary/10 text-tertiary">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="font-headline text-2xl font-extrabold text-tertiary">
            {formatCurrency(aggregates.current_outstanding_balance)}
          </div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">Remaining active credit exposure</p>
        </div>

        <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Interest Earned</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary dark:text-secondary">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="font-headline text-2xl font-extrabold text-primary dark:text-secondary">
            {formatCurrency(aggregates.total_interest_earned)}
          </div>
          <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">Cumulative interest collected</p>
        </div>

        <div className="p-6 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-3xl shadow-md border border-primary-container">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase font-label opacity-90">Recovery Rate</span>
            <div className="p-2 rounded-xl bg-white/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="font-headline text-3xl font-extrabold">
            {recoveryRate.toFixed(1)}%
          </div>
          <p className="text-[11px] opacity-80 mt-2">
            Recovered {formatCurrency(aggregates.total_principal_recovered)}
          </p>
        </div>
      </div>

      {/* Portfolio Health & Alert states */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Disbursed Active Loans</span>
            <h3 className="font-headline text-3xl font-extrabold text-on-surface dark:text-white mt-2">
              {health.active_loans}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-neutral/5 flex items-center justify-center text-neutral-600 dark:text-neutral-400 font-headline text-lg font-bold">
            #
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Pending Approval Reviews</span>
            <h3 className={`font-headline text-3xl font-extrabold mt-2 ${health.pending_applications > 0 ? 'text-primary dark:text-secondary' : 'text-on-surface dark:text-white'}`}>
              {health.pending_applications}
            </h3>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${health.pending_applications > 0 ? 'bg-primary/10 text-primary dark:text-secondary' : 'bg-neutral/5 text-neutral-600 dark:text-neutral-400'}`}>
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Defaulted Risk Accounts</span>
            <h3 className={`font-headline text-3xl font-extrabold mt-2 ${health.defaulted_loans > 0 ? 'text-tertiary' : 'text-on-surface dark:text-white'}`}>
              {health.defaulted_loans}
            </h3>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${health.defaulted_loans > 0 ? 'bg-tertiary/10 text-tertiary' : 'bg-neutral/5 text-neutral-600 dark:text-neutral-400'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* System Actions & Navigation Shortcuts */}
      <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm space-y-4">
        <h3 className="font-headline text-base font-bold text-on-surface dark:text-white">Administrative Actions Quick-Desk</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/dashboard/members')}
            className="flex flex-col items-center gap-2 p-4 border border-outline-variant/50 hover:border-primary/50 dark:hover:border-secondary/50 rounded-2xl text-center hover:bg-neutral/5 transition-all group active:scale-95"
          >
            <UserIcon className="w-6 h-6 text-primary dark:text-secondary group-hover:scale-115 transition-transform" />
            <span className="font-body text-xs font-bold text-on-surface dark:text-white">Register Member</span>
          </button>

          <button
            onClick={() => router.push('/dashboard/loans')}
            className="flex flex-col items-center gap-2 p-4 border border-outline-variant/50 hover:border-primary/50 dark:hover:border-secondary/50 rounded-2xl text-center hover:bg-neutral/5 transition-all group active:scale-95"
          >
            <PlusCircle className="w-6 h-6 text-primary dark:text-secondary group-hover:scale-115 transition-transform" />
            <span className="font-body text-xs font-bold text-on-surface dark:text-white">Configure Loan Product</span>
          </button>

          <button
            onClick={() => router.push('/dashboard/billing')}
            className="flex flex-col items-center gap-2 p-4 border border-outline-variant/50 hover:border-primary/50 dark:hover:border-secondary/50 rounded-2xl text-center hover:bg-neutral/5 transition-all group active:scale-95"
          >
            <CalendarCheck className="w-6 h-6 text-primary dark:text-secondary group-hover:scale-115 transition-transform" />
            <span className="font-body text-xs font-bold text-on-surface dark:text-white">Billing Collection Queue</span>
          </button>

          <button
            onClick={() => router.push('/dashboard/reports')}
            className="flex flex-col items-center gap-2 p-4 border border-outline-variant/50 hover:border-primary/50 dark:hover:border-secondary/50 rounded-2xl text-center hover:bg-neutral/5 transition-all group active:scale-95"
          >
            <FileCheck className="w-6 h-6 text-primary dark:text-secondary group-hover:scale-115 transition-transform" />
            <span className="font-body text-xs font-bold text-on-surface dark:text-white">Extract Excel Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
}
