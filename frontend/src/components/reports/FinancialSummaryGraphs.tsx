'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  ShoppingBag,
  Percent,
  Briefcase,
  Layers,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';

interface FinancialSummaryGraphsProps {
  reportData: any;
  period: 'daily' | 'monthly' | 'annual';
  year: number;
  month: number;
  date: string;
  fmt: (val: any) => string;
}

const PALETTE = {
  emerald: '#059669',
  teal: '#0d9488',
  cyan: '#0891b2',
  blue: '#2563eb',
  indigo: '#4f46e5',
  violet: '#7c3aed',
  purple: '#9333ea',
  amber: '#d97706',
  orange: '#ea580c',
  rose: '#e11d48',
  slate: '#64748b',
};

const PIE_COLORS = [
  '#059669', // Emerald
  '#0284c7', // Sky blue
  '#d97706', // Amber
  '#7c3aed', // Violet
  '#0d9488', // Teal
  '#e11d48', // Rose
  '#ea580c', // Orange
  '#4f46e5', // Indigo
  '#64748b', // Slate
];

const formatCurrencyShort = (val: number) => {
  const num = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (num >= 1_000_000) return `${sign}₱${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${sign}₱${(num / 1_000).toFixed(1)}K`;
  return `${sign}₱${num.toFixed(0)}`;
};

export default function FinancialSummaryGraphs({
  reportData,
  period,
  year,
  month,
  date,
  fmt
}: FinancialSummaryGraphsProps) {
  const [activeView, setActiveView] = useState<'all' | 'operations' | 'balance_sheet'>('all');
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const fs = reportData?.statement_of_operations;
  const bs = reportData?.balance_sheet;
  const soo = reportData?.soo?.statement;

  // Compute live Statement of Operations figures (YTD & This Month) when available
  const sooMetrics = useMemo(() => {
    if (!soo) return null;
    const endMonthIdx = period === 'monthly'
      ? Math.max(0, Math.min(11, (month || 1) - 1))
      : (year === 2026 ? 10 : 11);

    const sumSection = (sec: any, idxEnd: number) =>
      (sec?.groups || []).reduce(
        (gAcc: number, g: any) =>
          gAcc +
          (g.lines || []).reduce(
            (lAcc: number, l: any) =>
              lAcc + (l.current || []).slice(0, idxEnd + 1).reduce((a: number, b: number) => a + (b || 0), 0),
            0
          ),
        0
      );

    const monthSection = (sec: any, mIdx: number) =>
      (sec?.groups || []).reduce(
        (gAcc: number, g: any) =>
          gAcc +
          (g.lines || []).reduce(
            (lAcc: number, l: any) => lAcc + ((l.current || [])[mIdx] || 0),
            0
          ),
        0
      );

    const activeMonthIdx = period === 'monthly'
      ? Math.max(0, Math.min(11, (month || 1) - 1))
      : new Date().getMonth();

    const revSections = soo.revenues || [];
    const expSections = soo.expenses || [];

    const totalRevYtd = revSections.reduce((acc: number, s: any) => acc + sumSection(s, endMonthIdx), 0);
    const totalRevMonth = revSections.reduce((acc: number, s: any) => acc + monthSection(s, activeMonthIdx), 0);

    const totalExpYtd = expSections.reduce((acc: number, s: any) => acc + sumSection(s, endMonthIdx), 0);
    const totalExpMonth = expSections.reduce((acc: number, s: any) => acc + monthSection(s, activeMonthIdx), 0);

    const merchSec = revSections.find((s: any) => s.key === 'merchandise');
    const svcSec = revSections.find((s: any) => s.key === 'services');
    const loanSec = revSections.find((s: any) => s.key === 'credit_operations' || s.key === 'loan_interest' || s.key === 'loans');

    const merchYtd = sumSection(merchSec, endMonthIdx);
    const merchMonth = monthSection(merchSec, activeMonthIdx);

    const svcYtd = sumSection(svcSec, endMonthIdx);
    const svcMonth = monthSection(svcSec, activeMonthIdx);

    const loanYtd = sumSection(loanSec, endMonthIdx);
    const loanMonth = monthSection(loanSec, activeMonthIdx);

    const costOfSalesSec = expSections.find((s: any) => s.key === 'cost_of_sales');
    const cosYtd = sumSection(costOfSalesSec, endMonthIdx);

    return {
      totalRevYtd,
      totalRevMonth,
      totalExpYtd,
      totalExpMonth,
      netSurplusYtd: totalRevYtd - totalExpYtd,
      netSurplusMonth: totalRevMonth - totalExpMonth,
      merchYtd,
      merchMonth,
      svcYtd,
      svcMonth,
      loanYtd,
      loanMonth,
      cosYtd,
      activeMonthIdx,
    };
  }, [soo, period, month, year]);

  // Key Totals
  const totalAssets = Number(bs?.total_assets ?? 0);
  const totalLiabilities = Number(bs?.total_liabilities ?? 0);
  const totalEquity = Number(bs?.total_equity ?? 0);

  const merchandiseSales = sooMetrics ? sooMetrics.merchYtd : Number(fs?.merchandise_sales ?? 0);
  const serviceIncome = sooMetrics ? sooMetrics.svcYtd : 0;
  const loanIncome = sooMetrics ? sooMetrics.loanYtd : Number(fs?.operating_revenue ?? fs?.total_revenue ?? 0);
  const operatingRevenue = sooMetrics ? sooMetrics.totalRevYtd : Number(fs?.operating_revenue ?? fs?.total_revenue ?? 0);
  const grossReceipts = sooMetrics ? sooMetrics.totalRevYtd : (merchandiseSales + operatingRevenue);
  const costOfSales = sooMetrics ? sooMetrics.cosYtd : Number(fs?.cost_of_sales ?? 0);
  const grossProfit = sooMetrics ? (sooMetrics.totalRevYtd - sooMetrics.cosYtd) : Number(fs?.gross_profit ?? (grossReceipts - costOfSales));
  const operatingExpenses = sooMetrics ? (sooMetrics.totalExpYtd - sooMetrics.cosYtd) : Number(fs?.operating_expenses ?? 0);
  const totalExpensesAll = sooMetrics ? sooMetrics.totalExpYtd : (costOfSales + operatingExpenses);
  const incomeSubsidy = Number(fs?.income_subsidy ?? 0);
  const netSurplus = sooMetrics ? sooMetrics.netSurplusYtd : Number(fs?.net_surplus ?? (grossProfit - operatingExpenses + incomeSubsidy));

  // Financial Health Ratios
  const grossMarginPct = grossReceipts > 0 ? (grossProfit / grossReceipts) * 100 : 0;
  const netSurplusMarginPct = grossReceipts > 0 ? (netSurplus / grossReceipts) * 100 : 0;
  const returnOnEquityPct = totalEquity > 0 ? (netSurplus / totalEquity) * 100 : 0;
  const solvencyRatioPct = totalEquity > 0 ? (totalAssets / totalEquity) * 100 : 0;

  // Monthly Statement of Operations Flow (Jan -> Nov/Dec)
  const monthlyFlowData = useMemo(() => {
    const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const endIdx = year === 2026 ? 10 : 11;
    const revSections = soo?.revenues || [];
    const expSections = soo?.expenses || [];

    const sumMonth = (sections: any[], mIdx: number) =>
      sections.reduce(
        (sAcc: number, s: any) =>
          sAcc +
          (s?.groups || []).reduce(
            (gAcc: number, g: any) =>
              gAcc +
              (g.lines || []).reduce(
                (lAcc: number, l: any) => lAcc + ((l.current || [])[mIdx] || 0),
                0
              ),
            0
          ),
        0
      );

    return MONTHS_SHORT.slice(0, endIdx + 1).map((label, mIdx) => {
      const revenue = Math.round(sumMonth(revSections, mIdx) * 100) / 100;
      const expenses = Math.round(sumMonth(expSections, mIdx) * 100) / 100;
      const surplus = Math.round((revenue - expenses) * 100) / 100;
      return { month: label, revenue, expenses, surplus };
    });
  }, [soo, year]);

  // 2. Merchandise Sales Breakdown (By Category)
  const merchandiseCategoryData = useMemo(() => {
    const rawList: any[] = fs?.merchandise_sales_breakdown || [];
    const catMap: Record<string, number> = {};
    rawList.forEach((item: any) => {
      const cat = item.category || 'Store Merchandise';
      const amt = Number(item.amount || 0);
      if (amt > 0) {
        catMap[cat] = (catMap[cat] || 0) + amt;
      }
    });

    return Object.entries(catMap)
      .map(([name, amount], idx) => ({
        name,
        amount,
        percentage: merchandiseSales > 0 ? ((amount / merchandiseSales) * 100).toFixed(1) : '0',
        fill: PIE_COLORS[idx % PIE_COLORS.length]
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [fs?.merchandise_sales_breakdown, merchandiseSales]);

  // 3. Operating Revenue Stream Breakdown
  const operatingRevenueData = useMemo(() => {
    const list: any[] = fs?.revenues_breakdown || [];
    let loanInterest = 0;
    let finesPenalties = 0;
    const others: any[] = [];

    list.forEach((item: any) => {
      const name = item.account || '';
      const amt = Number(item.amount || 0);
      if (amt <= 0) return;
      if (name.includes('Interest Received') || name.includes('Interest Income')) {
        loanInterest += amt;
      } else if (name.includes('Fines -') || name.includes('Fines and Penalties')) {
        finesPenalties += amt;
      } else {
        others.push({ name: name.replace('Commission income - ', 'Commission: '), amount: amt });
      }
    });

    const combined = [
      ...(loanInterest > 0 ? [{ name: 'Interest on Loans', amount: loanInterest }] : []),
      ...(finesPenalties > 0 ? [{ name: 'Fines & Late Charges', amount: finesPenalties }] : []),
      ...others
    ].sort((a, b) => b.amount - a.amount);

    return combined.map((item, idx) => ({
      ...item,
      percentage: operatingRevenue > 0 ? ((item.amount / operatingRevenue) * 100).toFixed(1) : '0',
      fill: PIE_COLORS[idx % PIE_COLORS.length]
    }));
  }, [fs?.revenues_breakdown, operatingRevenue]);

  // 4. Operating Expenses (Categorized Breakdown)
  const operatingExpensesData = useMemo(() => {
    const list: any[] = fs?.operating_expenses_breakdown || [];
    const catMap: Record<string, number> = {};

    list.forEach((item: any) => {
      const cat = item.category || 'General Administration';
      const amt = Number(item.amount || 0);
      if (amt > 0) {
        catMap[cat] = (catMap[cat] || 0) + amt;
      }
    });

    return Object.entries(catMap)
      .map(([name, amount], idx) => ({
        name,
        amount,
        percentage: operatingExpenses > 0 ? ((amount / operatingExpenses) * 100).toFixed(1) : '0',
        fill: PIE_COLORS[idx % PIE_COLORS.length]
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [fs?.operating_expenses_breakdown, operatingExpenses]);

  // 5. Balance Sheet Assets Allocation
  const assetsAllocationData = useMemo(() => {
    const list: any[] = bs?.assets || [];
    let cash = 0;
    let loans = 0;
    let inventory = 0;
    let fixedAssets = 0;
    let receivablesOther = 0;

    list.forEach((item: any) => {
      const acc = item.account || '';
      const amt = Number(item.amount || 0);
      if (amt <= 0) return;
      if (acc.includes('Cash')) cash += amt;
      else if (acc.includes('Loans Receivable')) loans += amt;
      else if (acc.includes('Inventory')) inventory += amt;
      else if (acc.includes('Fixed assets')) fixedAssets += amt;
      else receivablesOther += amt;
    });

    const segments = [
      { name: 'Cash & Equivalents', amount: cash, fill: '#059669' },
      { name: 'Loans Receivable', amount: loans, fill: '#0284c7' },
      { name: 'Merchandise Inventory', amount: inventory, fill: '#d97706' },
      { name: 'Fixed Assets (at cost)', amount: fixedAssets, fill: '#7c3aed' },
      { name: 'Receivables & Other', amount: receivablesOther, fill: '#64748b' },
    ].filter(s => s.amount > 0);

    return segments.map(seg => ({
      ...seg,
      percentage: totalAssets > 0 ? ((seg.amount / totalAssets) * 100).toFixed(1) : '0'
    }));
  }, [bs?.assets, totalAssets]);

  // 6. Balance Sheet Equity & Liabilities Structure
  const equityStructureData = useMemo(() => {
    const list: any[] = bs?.equity || [];
    let shareCapital = 0;
    let retainedEarnings = 0;
    let donationsGrants = 0;
    let statutoryFunds = 0;

    list.forEach((item: any) => {
      const acc = item.account || '';
      const amt = Number(item.amount || 0);
      if (amt <= 0) return;
      if (acc.includes('Capital Accounts')) shareCapital += amt;
      else if (acc.includes('Retained earnings')) retainedEarnings += amt;
      else if (acc.includes('Donations / Grants')) donationsGrants += amt;
      else statutoryFunds += amt;
    });

    return [
      { name: 'Share Capital (Member Shares)', amount: shareCapital, fill: '#059669' },
      { name: 'Retained Earnings (Undivided Surplus)', amount: retainedEarnings, fill: '#0284c7' },
      { name: 'Donated Capital & Grants', amount: donationsGrants, fill: '#7c3aed' },
      { name: 'Statutory & Community Funds', amount: Math.abs(statutoryFunds), fill: '#ea580c' },
    ].filter(s => s.amount > 0).map(item => ({
      ...item,
      percentage: totalEquity > 0 ? ((item.amount / totalEquity) * 100).toFixed(1) : '0'
    }));
  }, [bs?.equity, totalEquity]);

  return (
    <div className="space-y-6">
      {/* ================= RELICS-STYLE COOPERATIVE PROGRESS HUD ================= */}
      <div
        className={`relative overflow-hidden rounded-3xl border border-outline-variant/60 dark:border-emerald-800/50 bg-gradient-to-br from-white via-emerald-50/40 to-amber-50/30 dark:from-neutral-900 dark:via-emerald-950/25 dark:to-neutral-900 text-neutral-900 dark:text-white shadow-sm transition-all duration-500 ease-out ${
          entered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-[0.99]'
        }`}
      >
        {/* Subtle ambient radial glow */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/15 dark:bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-amber-400/15 dark:bg-amber-500/10 blur-3xl" />

        {/* Top Bar with View Toggle */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5 border-b border-outline-variant/50 dark:border-neutral-800 bg-emerald-50/60 dark:bg-neutral-950/40">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-emerald-600 to-teal-600 dark:from-amber-400 dark:to-amber-600 text-white dark:text-neutral-950 font-black text-xs shadow-xs">
              +
            </span>
            <span className="text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-emerald-950 dark:text-amber-100">
              Cooperative Daily &amp; YTD Progress
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700/50 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
              <Calendar className="w-3 h-3" />
              {period === 'daily' ? date : period === 'monthly' ? `Month ${month}, ${year}` : `FY ${year} (YTD)`}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-white/80 dark:bg-neutral-950/60 px-3 py-1 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 self-start sm:self-auto">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Operations &amp; Monthly Flow</span>
          </div>
        </div>

        {/* Main 2-Column HUD Body (Emblem Left + 2x3 Progress Grid Right) */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 sm:p-7 items-center">
          {/* Left Hero Emblem Panel */}
          <div
            className={`lg:col-span-4 flex flex-col items-center text-center justify-center p-5 rounded-2xl bg-white/80 dark:bg-neutral-950/50 border border-emerald-200/80 dark:border-emerald-800/50 shadow-xs transition-all duration-500 ease-out delay-75 ${
              entered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div className="relative mb-4 flex items-center justify-center">
              <div className="p-1 rounded-full ring-2 ring-emerald-500/60 dark:ring-amber-400/60 bg-white dark:bg-neutral-900 shadow-md">
                <img
                  src="/Coop.jpeg"
                  alt="UC-METC Multipurpose Cooperative Logo"
                  className="h-20 w-20 rounded-full object-cover"
                />
              </div>
            </div>

            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800 dark:text-amber-300/90">
              UC-METC Multipurpose Cooperative
            </span>
            <div className={`mt-1 text-2xl sm:text-3xl font-black font-mono tabular-nums ${
              netSurplus >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {fmt(netSurplus)}
            </div>
            <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
              Certified Net Surplus ({year})
            </div>

            <div className="mt-4 w-full grid grid-cols-2 gap-2 pt-3 border-t border-outline-variant/50 dark:border-white/10 text-left">
              <div className="p-2.5 rounded-xl bg-neutral-50/90 dark:bg-black/30 border border-outline-variant/40 dark:border-white/5">
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total Assets</div>
                <div className="font-mono text-xs sm:text-sm font-black text-neutral-900 dark:text-white mt-0.5 truncate">{fmt(totalAssets)}</div>
                <div className="text-[9.5px] text-emerald-700 dark:text-emerald-400 font-semibold">Solvency {solvencyRatioPct.toFixed(1)}%</div>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-50/90 dark:bg-black/30 border border-outline-variant/40 dark:border-white/5">
                <div className="text-[9.5px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total Equity</div>
                <div className="font-mono text-xs sm:text-sm font-black text-amber-700 dark:text-amber-300 mt-0.5 truncate">{fmt(totalEquity)}</div>
                <div className="text-[9.5px] text-amber-700/80 dark:text-amber-200/80 font-semibold">ROE {returnOnEquityPct.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Right 2x3 Relics-Style Stat Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {[
              {
                label: 'TOTAL REVENUE (YTD)',
                value: grossReceipts,
                delta: sooMetrics?.totalRevMonth ?? 0,
                deltaLabel: 'this mo',
                icon: TrendingUp,
                gemBg: 'border-emerald-400/80 dark:border-emerald-400/60 from-emerald-50 to-emerald-100 dark:from-emerald-500/25 dark:to-emerald-900/70',
                iconColor: 'text-emerald-700 dark:text-emerald-300',
              },
              {
                label: 'MERCHANDISE PROFIT',
                value: merchandiseSales,
                delta: sooMetrics?.merchMonth ?? 0,
                deltaLabel: 'this mo',
                icon: ShoppingBag,
                gemBg: 'border-lime-500/70 dark:border-lime-400/60 from-lime-50 to-emerald-100 dark:from-lime-500/25 dark:to-emerald-900/70',
                iconColor: 'text-lime-700 dark:text-lime-300',
              },
              {
                label: 'SERVICE INCOME',
                value: serviceIncome,
                delta: sooMetrics?.svcMonth ?? 0,
                deltaLabel: 'this mo',
                icon: Sparkles,
                gemBg: 'border-teal-400/80 dark:border-teal-400/60 from-teal-50 to-teal-100 dark:from-teal-500/25 dark:to-teal-900/70',
                iconColor: 'text-teal-700 dark:text-teal-300',
              },
              {
                label: 'LOAN INTEREST & FINES',
                value: loanIncome,
                delta: sooMetrics?.loanMonth ?? 0,
                deltaLabel: 'this mo',
                icon: Percent,
                gemBg: 'border-sky-400/80 dark:border-sky-400/60 from-sky-50 to-sky-100 dark:from-sky-500/25 dark:to-sky-900/70',
                iconColor: 'text-sky-700 dark:text-sky-300',
              },
              {
                label: 'TOTAL EXPENSES',
                value: totalExpensesAll,
                delta: sooMetrics?.totalExpMonth ?? 0,
                deltaLabel: 'this mo',
                icon: DollarSign,
                gemBg: 'border-amber-400/80 dark:border-amber-400/60 from-amber-50 to-amber-100 dark:from-amber-500/25 dark:to-amber-900/70',
                iconColor: 'text-amber-700 dark:text-amber-300',
              },
              {
                label: 'NET SURPLUS (PROFIT)',
                value: netSurplus,
                delta: sooMetrics?.netSurplusMonth ?? 0,
                deltaLabel: 'this mo',
                icon: ArrowUpRight,
                gemBg: 'border-yellow-500/80 dark:border-yellow-400/70 from-yellow-50 to-emerald-100 dark:from-yellow-500/25 dark:to-emerald-900/70',
                iconColor: 'text-emerald-700 dark:text-yellow-300',
              },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  style={{ transitionDelay: `${160 + idx * 110}ms` }}
                  className={`flex items-center gap-4 group transition-all duration-700 ease-out ${
                    entered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                  }`}
                >
                  {/* Diamond Relic Badge */}
                  <div className={`shrink-0 h-11 w-11 rotate-45 rounded-xl border bg-gradient-to-br ${stat.gemBg} shadow-xs flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}>
                    <Icon className={`-rotate-45 w-5 h-5 ${stat.iconColor}`} />
                  </div>

                  {/* Value + Delta + Divider + Label */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-mono text-lg sm:text-xl font-black tabular-nums text-neutral-900 dark:text-white tracking-tight">
                        {fmt(stat.value)}
                      </span>
                      {stat.delta !== 0 && (
                        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-amber-300">
                          {stat.delta > 0 ? `+${formatCurrencyShort(stat.delta)}` : formatCurrencyShort(stat.delta)}{' '}
                          <span className="text-[10px] font-normal text-neutral-500 dark:text-amber-200/70">{stat.deltaLabel}</span>
                        </span>
                      )}
                    </div>
                    <div className="my-1.5 h-px w-full bg-gradient-to-r from-emerald-500/40 via-amber-400/30 to-transparent dark:from-amber-400/45 dark:via-emerald-400/25" />
                    <div className="text-[10.5px] font-black uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-300/90 truncate">
                      {stat.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STATEMENT OF OPERATIONS FLOW BY MONTH */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-outline-variant/60 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Statement of Operations Flow by Month
            </h3>
            <p className="text-xs text-neutral-500">
              Monthly progression of total revenue, expenses, and net surplus across the fiscal year.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Revenue
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Expenses
            </span>
            <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Net Surplus
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyFlowData} margin={{ top: 15, right: 15, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                tick={{ fontSize: 10.5, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCurrencyShort}
              />
              <Tooltip
                cursor={{ fill: "rgba(5, 150, 105, 0.05)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-lg text-xs space-y-1.5 min-w-[180px]">
                      <div className="font-bold text-neutral-900 dark:text-white border-b border-neutral-100 dark:border-neutral-700 pb-1">
                        {item.month} {year}
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-neutral-500 dark:text-neutral-400">Revenue:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmt(item.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-neutral-500 dark:text-neutral-400">Expenses:</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{fmt(item.expenses)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-neutral-100 dark:border-neutral-700 pt-1">
                        <span className="text-neutral-600 dark:text-neutral-300 font-semibold">Net Surplus:</span>
                        <span className={`font-mono font-bold ${item.surplus >= 0 ? "text-sky-600 dark:text-sky-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {fmt(item.surplus)}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="surplus" name="Net Surplus" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

