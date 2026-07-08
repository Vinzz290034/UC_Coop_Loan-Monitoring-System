'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { SkeletonCard } from '@/components/ui/Skeleton';
import KpiCard from '@/components/charts/KpiCard';
import ChartContainer from '@/components/charts/ChartContainer';
import LoanStatusChart from '@/components/charts/LoanStatusChart';
import MonthlyTrendsChart from '@/components/charts/MonthlyTrendsChart';
import MemberGrowthChart from '@/components/charts/MemberGrowthChart';
import RepaymentChart from '@/components/charts/RepaymentChart';
import FinancialSummaryChart from '@/components/charts/FinancialSummaryChart';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Coins,
  ShieldCheck,
  Building,
  PiggyBank,
  CheckCircle2,
  Percent,
  Users,
  UserCheck,
  UserX,
  Banknote,
  FileCheck,
  PlusCircle,
  CalendarCheck,
  User as UserIcon,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OverviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Member-specific data
  const [memberMetrics, setMemberMetrics] = useState<any>(null);

  // Admin/Manager analytics data
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [loanTrends, setLoanTrends] = useState<any[]>([]);
  const [repaymentTrends, setRepaymentTrends] = useState<any[]>([]);
  const [memberGrowth, setMemberGrowth] = useState<any[]>([]);
  const [loanDistribution, setLoanDistribution] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any[]>([]);

  const fetchDashboardData = async (isRefresh = false) => {
    if (!user) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      if (user.role === 'admin' || user.role === 'manager') {
        // Fetch all analytics endpoints in parallel
        const [summaryRes, trendsRes, repaymentRes, growthRes, distRes, finRes] = await Promise.all([
          api.get('/analytics/dashboard-summary'),
          api.get('/analytics/loan-trends'),
          api.get('/analytics/repayment-trends'),
          api.get('/analytics/member-growth'),
          api.get('/analytics/loan-status-distribution'),
          api.get('/analytics/financial-summary'),
        ]);

        setDashboardSummary(summaryRes.data.data);
        setLoanTrends(trendsRes.data.data);
        setRepaymentTrends(repaymentRes.data.data);
        setMemberGrowth(growthRes.data.data);
        setLoanDistribution(distRes.data.data);
        setFinancialSummary(finRes.data.data);
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
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Error loading dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-neutral/10 rounded-3xl animate-pulse"></div>
          <div className="h-80 bg-neutral/10 rounded-3xl animate-pulse"></div>
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
          <KpiCard label="Share Capital" value={formatCurrency(balances.share_capital)} icon={Building} description="Cumulative equity contributions" />
          <KpiCard label="Fixed Deposit" value={formatCurrency(balances.fixed_deposits)} icon={PiggyBank} description="High-yield timed placements" />
          <KpiCard label="Coop Investments" value={formatCurrency(balances.investments)} icon={Coins} description="Member-backed investment portfolios" />
          <KpiCard label="Total Net Assets" value={formatCurrency(balances.total_assets)} icon={ShieldCheck} variant="primary" description="Total non-loan asset valuation" />
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
  const ds = dashboardSummary || {};
  const recoveryRate = ds.total_capital_ever_deployed > 0
    ? ((ds.total_repayments_collected / ds.total_capital_ever_deployed) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface dark:text-white">
            System Overview
          </h1>
          <p className="font-body text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Cooperative Credit Monitoring & Portfolio Analytics
          </p>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface dark:bg-surface-container-high border border-outline-variant/50 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral/10 transition-colors active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Row 1: Financial KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard
          label="Total Capital Deployed"
          value={formatCurrency(ds.total_capital_ever_deployed)}
          icon={TrendingUp}
          description="Cumulative disbursed principal volume"
        />
        <KpiCard
          label="Outstanding Balance"
          value={formatCurrency(ds.total_outstanding_balance)}
          icon={TrendingDown}
          variant="danger"
          description="Remaining active credit exposure"
        />
        <KpiCard
          label="Interest Earned"
          value={formatCurrency(ds.total_interest_earned)}
          icon={Percent}
          variant="warning"
          description="Cumulative interest collected"
        />
        <KpiCard
          label="Recovery Rate"
          value={`${recoveryRate.toFixed(1)}%`}
          icon={ShieldCheck}
          variant="primary"
          description={`Recovered ${formatCurrency(ds.total_repayments_collected)}`}
        />
      </div>

      {/* Row 2: Member & Loan Count KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary dark:text-secondary" />
            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Total Members</span>
          </div>
          <div className="font-headline text-xl font-extrabold text-on-surface dark:text-white">{ds.total_member_profiles || 0}</div>
          <div className="flex items-center gap-2 mt-1.5 text-[10px]">
            <span className="flex items-center gap-0.5 text-green-600"><UserCheck className="w-3 h-3" />{ds.active_members || 0} active</span>
            <span className="flex items-center gap-0.5 text-neutral-500"><UserX className="w-3 h-3" />{ds.inactive_members || 0} inactive</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="w-4 h-4 text-primary dark:text-secondary" />
            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Active Loans</span>
          </div>
          <div className="font-headline text-xl font-extrabold text-on-surface dark:text-white">{ds.disbursed_loans || 0}</div>
        </div>

        <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Pending Approval</span>
          </div>
          <div className={`font-headline text-xl font-extrabold ${(ds.pending_loans || 0) > 0 ? 'text-amber-500' : 'text-on-surface dark:text-white'}`}>
            {ds.pending_loans || 0}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Fully Paid</span>
          </div>
          <div className="font-headline text-xl font-extrabold text-green-600 dark:text-green-400">{ds.fully_paid_loans || 0}</div>
        </div>

        <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Defaulted</span>
          </div>
          <div className={`font-headline text-xl font-extrabold ${(ds.defaulted_loans || 0) > 0 ? 'text-red-500' : 'text-on-surface dark:text-white'}`}>
            {ds.defaulted_loans || 0}
          </div>
        </div>
      </div>

      {/* Row 3: Financial Assets KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          label="Total Share Capital"
          value={formatCurrency(ds.total_share_capital)}
          icon={Building}
          description="Combined member equity contributions"
        />
        <KpiCard
          label="Active Fixed Deposits"
          value={formatCurrency(ds.total_active_fixed_deposits)}
          icon={PiggyBank}
          description="Timed deposit placements"
        />
        <KpiCard
          label="Active Investments"
          value={formatCurrency(ds.total_active_investments)}
          icon={Coins}
          description="Member-backed investment portfolios"
        />
      </div>

      {/* Row 4: Charts - Loan Trends + Loan Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartContainer
          title="Monthly Loan Activity"
          subtitle="Applications, disbursements & completions over the last 12 months"
          className="lg:col-span-2"
        >
          <MonthlyTrendsChart data={loanTrends} />
        </ChartContainer>

        <ChartContainer title="Loan Status Distribution" subtitle="Current loan portfolio by status">
          <LoanStatusChart data={loanDistribution} />
        </ChartContainer>
      </div>

      {/* Row 5: Repayment Trends + Member Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Monthly Repayments" subtitle="Payment collection amounts over the last 12 months">
          <RepaymentChart data={repaymentTrends} />
        </ChartContainer>

        <ChartContainer title="Member Growth" subtitle="New registrations and cumulative membership over time">
          <MemberGrowthChart data={memberGrowth} />
        </ChartContainer>
      </div>

      {/* Row 6: Financial Summary Chart */}
      <ChartContainer title="Financial Flow Analysis" subtitle="Share capital contributions vs loan disbursements over time">
        <FinancialSummaryChart data={financialSummary} />
      </ChartContainer>

      {/* Row 7: Quick Actions */}
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
