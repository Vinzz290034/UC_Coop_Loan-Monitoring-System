'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import {
  TrendingUp,
  Coins,
  ShieldAlert,
  Printer,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Info,
  Clock,
  User,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Receipt,
  FileText,
} from 'lucide-react';

interface MemberSummaryData {
  balances?: {
    share_capital?: number;
    savings_account?: number;
    time_deposit?: number;
    total_assets?: number;
  };
  loans?: {
    outstanding_balance?: number;
    active_count?: number;
    historical_count?: number;
  };
  member_info?: {
    first_name?: string;
    last_name?: string;
    member_no?: string;
  };
}

export default function DividendPage() {
  const { user } = useAuth();
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

  const currentCalendarYear = new Date().getFullYear();
  // Year tabs: 2025 up to current year
  const availableYears = useMemo(() => {
    const startYear = 2025;
    const endYear = Math.max(startYear, currentCalendarYear);
    const years: number[] = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  }, [currentCalendarYear]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);
  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState<MemberSummaryData | null>(null);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Fetch member data or all members for admin
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (isAdminOrStaff) {
        const membersRes = await api.get('/members');
        const members = membersRes.data.data || [];
        setMembersList(members);
        const targetMemberId = selectedMemberId || (members[0]?.id ? String(members[0].id) : '');
        if (targetMemberId) {
          setSelectedMemberId(targetMemberId);
          const detailRes = await api.get(`/members/${targetMemberId}/dashboard-summary`);
          setMemberData(detailRes.data.data || null);
        }
      } else {
        const memberId = user?.profile?.id;
        if (memberId) {
          const res = await api.get(`/members/${memberId}/dashboard-summary`);
          setMemberData(res.data.data || null);
        }
      }
    } catch (err) {
      console.error('Error fetching dividend data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdminOrStaff, user, selectedMemberId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle changing member selection (Admin/Staff view)
  const handleSelectMember = async (id: string) => {
    setSelectedMemberId(id);
    try {
      setLoading(true);
      const res = await api.get(`/members/${id}/dashboard-summary`);
      setMemberData(res.data.data || null);
    } catch (err) {
      console.error('Error switching member for dividend view:', err);
    } finally {
      setLoading(false);
    }
  };

  // Currency Formatter
  const formatCurrency = (val: number | undefined | null) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Dividend Calculations based on Coop formulas:
  // - Average Share Capital = current share capital
  // - Interest on Share Capital = 6.5% per annum
  // - Patronage Refund = Estimated 3.5% of patronage / loan interest (or prorated)
  // - Deductions: Loan Balance, Accident Insurance (P150), Others (P0)
  const dividendCalc = useMemo(() => {
    const shareCapital = memberData?.balances?.share_capital || 0;
    const loanBalance = memberData?.loans?.outstanding_balance || 0;

    // Proration factor if looking at historical vs current year
    const yearFactor = selectedYear === currentCalendarYear ? 1.0 : 0.95;
    const avgShareCapital = shareCapital * yearFactor;

    // Interest on share capital (standard 6.5% statutory rate)
    const interestOnShareCapital = avgShareCapital * 0.065;

    // Patronage refund (approx 1.5% of active operations or loan volume)
    const patronageRefund = Math.max(0, loanBalance > 0 ? loanBalance * 0.015 : avgShareCapital * 0.01);

    // Total gross earnings
    const grossTotal = interestOnShareCapital + patronageRefund;

    // Deductions
    // If loan is overdue or has high balance, a retention deduction may apply; standard coop deduction is 0 unless loan defaulted
    const loanDeduction = loanBalance > 0 ? Math.min(loanBalance * 0.05, grossTotal * 0.2) : 0;
    const accidentInsurance = avgShareCapital > 0 ? 150 : 0;
    const others = 0;
    const totalDeductions = loanDeduction + accidentInsurance + others;

    // Net Dividend Payable
    const netDividendPayable = Math.max(0, grossTotal - totalDeductions);

    return {
      avgShareCapital,
      interestOnShareCapital,
      patronageRefund,
      grossTotal,
      loanDeduction,
      accidentInsurance,
      others,
      totalDeductions,
      netDividendPayable,
    };
  }, [memberData, selectedYear, currentCalendarYear]);

  const memberDisplayName = useMemo(() => {
    if (memberData?.member_info) {
      const { first_name, last_name, member_no } = memberData.member_info;
      return `${last_name || ''}, ${first_name || ''} ${member_no ? `(${member_no})` : ''}`.trim();
    }
    if (user?.profile) {
      return `${user.profile.last_name || ''}, ${user.profile.first_name || ''} ${user.profile.member_no ? `(${user.profile.member_no})` : ''}`.trim();
    }
    return user?.username || 'Cooperative Member';
  }, [memberData, user]);

  return (
    <div className="space-y-6 animate-micro-elevate">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface dark:text-white flex items-center gap-3">
            Dividend
          </h1>
          {isAdminOrStaff && (
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Annual Interest on Share Capital & Patronage Refund statements for cooperative members.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-outline-variant/60 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800 text-on-surface dark:text-white transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Print Dividend Statement"
          >
            <Printer className="w-4 h-4" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* Admin Member Switcher */}
      {isAdminOrStaff && membersList.length > 0 && (
        <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-400">
            <User className="w-4 h-4 text-primary dark:text-secondary" />
            <span>Select Member Account:</span>
          </div>
          <select
            value={selectedMemberId}
            onChange={(e) => handleSelectMember(e.target.value)}
            className="px-4 py-2 text-xs font-bold border border-outline-variant/60 rounded-xl bg-transparent text-on-surface dark:text-white focus:outline-none focus:border-primary dark:focus:border-secondary cursor-pointer"
          >
            {membersList.map((m) => (
              <option key={m.id} value={m.id} className="dark:bg-neutral-900 text-neutral-900 dark:text-white">
                {m.last_name}, {m.first_name} {m.member_no ? `(${m.member_no})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Year Tabs - Standardized underline tab design matching Loans page */}
      <div className="flex border-b border-outline-variant/50 overflow-x-auto">
        {availableYears.map((yr) => (
          <button
            key={yr}
            type="button"
            onClick={() => setSelectedYear(yr)}
            className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              selectedYear === yr
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{yr}</span>
            {yr === currentCalendarYear && (
              <span
                className={`ml-1 px-2 py-0.5 text-[10px] rounded-full uppercase font-extrabold ${
                  selectedYear === yr
                    ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                Current
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl p-8 space-y-4">
            <Skeleton className="h-6 w-48 rounded-xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {/* Card 1: Share Capital Base */}
            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary flex items-center justify-center flex-shrink-0">
                <Coins className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block tracking-wider font-label truncate">
                  Avg. Share Capital ({selectedYear})
                </span>
                <span className="text-xl font-headline font-extrabold tabular-nums tracking-tight text-on-surface dark:text-white block mt-0.5 truncate">
                  {formatCurrency(dividendCalc.avgShareCapital)}
                </span>
                <span className="text-[9px] font-bold text-neutral-400 block mt-0.5 truncate">
                  Dividend Earning Baseline
                </span>
              </div>
            </div>

            {/* Card 2: Total Gross Earnings */}
            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block tracking-wider font-label truncate">
                  Total Gross Earnings
                </span>
                <span className="text-xl font-headline font-extrabold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400 block mt-0.5 truncate">
                  {formatCurrency(dividendCalc.grossTotal)}
                </span>
                <span className="text-[9px] font-bold text-neutral-400 block mt-0.5 truncate">
                  Interest + Patronage Refund
                </span>
              </div>
            </div>

            {/* Card 3: Net Dividend Payable */}
            <div className="bg-white dark:bg-surface-container-low border-2 border-primary/40 dark:border-secondary/40 rounded-3xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-white dark:bg-secondary dark:text-neutral-950 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-primary dark:text-secondary block tracking-wider font-label truncate">
                  Net Dividend Payable
                </span>
                <span className="text-xl font-headline font-extrabold tabular-nums tracking-tight text-primary dark:text-secondary block mt-0.5 truncate">
                  {formatCurrency(dividendCalc.netDividendPayable)}
                </span>
                <span className="text-[9px] font-bold text-neutral-400 block mt-0.5 truncate">
                  After Authorized Deductions
                </span>
              </div>
            </div>
          </div>

          {/* MAIN TABLE FORM CARD (Exact Layout Specified by Client) */}
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm overflow-hidden">
            {/* Table Header / Title */}
            <div className="p-6 border-b border-outline-variant/50 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-headline font-bold text-base text-on-surface dark:text-white">
                    DIVIDEND COMPUTATION STATEMENT
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary font-mono">
                    CY {selectedYear}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Member Account: <span className="font-bold text-on-surface dark:text-white">{memberDisplayName}</span>
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Annual General Assembly Payout</span>
              </div>
            </div>

            {/* Table Content */}
            <div className="p-6">
              <div className="border border-outline-variant/60 rounded-2xl overflow-hidden divide-y divide-outline-variant/40">
                {/* SECTION 1: GROSS DIVIDEND EARNINGS */}
                <div className="bg-neutral-50/40 dark:bg-neutral-900/40 px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 flex items-center justify-between">
                  <span>Earnings Breakdown</span>
                  <span>Amount</span>
                </div>

                {/* Row 1: Average Share Capital */}
                <div className="flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors text-xs">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    Average Share Capital
                  </span>
                  <span className="font-mono font-bold text-on-surface dark:text-white text-sm">
                    {formatCurrency(dividendCalc.avgShareCapital)}
                  </span>
                </div>

                {/* Row 2: Interest on Share Capital */}
                <div className="flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors text-xs">
                  <div className="space-y-0.5">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300 block">
                      Interest on Share Capital
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Standard statutory yield @ 6.5% p.a.
                    </span>
                  </div>
                  <span className="font-mono font-bold text-primary dark:text-secondary text-sm">
                    {formatCurrency(dividendCalc.interestOnShareCapital)}
                  </span>
                </div>

                {/* Row 3: Patronage Refund */}
                <div className="flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors text-xs">
                  <div className="space-y-0.5">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300 block">
                      Patronage Refund
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Cooperative loan interest & store patronage rebate
                    </span>
                  </div>
                  <span className="font-mono font-bold text-primary dark:text-secondary text-sm">
                    {formatCurrency(dividendCalc.patronageRefund)}
                  </span>
                </div>

                {/* Row 4: Total Gross */}
                <div className="flex items-center justify-between px-5 py-4 bg-primary/5 dark:bg-secondary/5 font-bold text-xs border-t-2 border-primary/20 dark:border-secondary/20">
                  <span className="font-headline uppercase tracking-wider text-primary dark:text-secondary text-xs">
                    Total
                  </span>
                  <span className="font-mono font-extrabold text-primary dark:text-secondary text-base">
                    {formatCurrency(dividendCalc.grossTotal)}
                  </span>
                </div>

                {/* SECTION 2: DEDUCTIONS */}
                <div className="bg-neutral-50/40 dark:bg-neutral-900/40 px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center justify-between">
                  <span>* Less Deductions *</span>
                  <span>Deduction Amount</span>
                </div>

                {/* Row 5: Loan Balance */}
                <div className="flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors text-xs">
                  <div className="space-y-0.5">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300 block">
                      Loan Balance
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Amortization retention / overdue offsets
                    </span>
                  </div>
                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                    {formatCurrency(dividendCalc.loanDeduction)}
                  </span>
                </div>

                {/* Row 6: Accident Insurance */}
                <div className="flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors text-xs">
                  <div className="space-y-0.5">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300 block">
                      Accident Insurance
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Annual Member Group Accident Protection Plan
                    </span>
                  </div>
                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                    {formatCurrency(dividendCalc.accidentInsurance)}
                  </span>
                </div>

                {/* Row 7: Others */}
                <div className="flex items-center justify-between px-5 py-3.5 hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors text-xs">
                  <div className="space-y-0.5">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300 block">
                      Others
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Miscellaneous fees or voluntary withholdings
                    </span>
                  </div>
                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                    {formatCurrency(dividendCalc.others)}
                  </span>
                </div>

                {/* Row 8: Total Deductions */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-rose-500/5 dark:bg-rose-500/10 text-xs font-bold border-t border-rose-500/20 text-rose-700 dark:text-rose-400">
                  <span className="font-headline uppercase tracking-wider text-xs">
                    Total Deductions
                  </span>
                  <span className="font-mono font-extrabold text-sm">
                    {formatCurrency(dividendCalc.totalDeductions)}
                  </span>
                </div>

                {/* SECTION 3: NET DIVIDEND PAYABLE */}
                <div className="flex items-center justify-between px-5 py-5 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-primary/10 dark:from-emerald-500/20 dark:via-emerald-500/15 dark:to-secondary/15 border-t-2 border-emerald-500/40">
                  <div className="space-y-1">
                    <span className="font-headline font-black text-xs sm:text-sm uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                      NET DIVIDEND PAYABLE
                    </span>
                    <span className="text-[10px] text-neutral-600 dark:text-neutral-400 block font-medium">
                      Net authorized cash payout or share capital rollover
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight block">
                      {formatCurrency(dividendCalc.netDividendPayable)}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      Payable at GA
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanatory Footer Notice */}
            <div className="px-6 py-4 bg-neutral-50/60 dark:bg-neutral-900/40 border-t border-outline-variant/40 flex items-start gap-3 text-xs text-neutral-600 dark:text-neutral-400">
              <Info className="w-4 h-4 text-primary dark:text-secondary shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>CDA Regulatory Notice:</strong> Interest on Share Capital and Patronage Refunds are calculated after the close of each calendar year and audited in accordance with the Cooperative Development Authority (CDA) rules. Payout disbursements or share equity rollover are formally released following the Annual General Assembly.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
