'use client';

import React, { useMemo, useState } from 'react';
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

  const fs = reportData?.statement_of_operations;
  const bs = reportData?.balance_sheet;

  // Key Totals
  const totalAssets = Number(bs?.total_assets ?? 0);
  const totalLiabilities = Number(bs?.total_liabilities ?? 0);
  const totalEquity = Number(bs?.total_equity ?? 0);

  const merchandiseSales = Number(fs?.merchandise_sales ?? 0);
  const operatingRevenue = Number(fs?.operating_revenue ?? fs?.total_revenue ?? 0);
  const grossReceipts = merchandiseSales + operatingRevenue;
  const costOfSales = Number(fs?.cost_of_sales ?? 0);
  const grossProfit = Number(fs?.gross_profit ?? (grossReceipts - costOfSales));
  const operatingExpenses = Number(fs?.operating_expenses ?? 0);
  const incomeSubsidy = Number(fs?.income_subsidy ?? 0);
  const netSurplus = Number(fs?.net_surplus ?? (grossProfit - operatingExpenses + incomeSubsidy));

  // Financial Health Ratios
  const grossMarginPct = grossReceipts > 0 ? (grossProfit / grossReceipts) * 100 : 0;
  const netSurplusMarginPct = grossReceipts > 0 ? (netSurplus / grossReceipts) * 100 : 0;
  const returnOnEquityPct = totalEquity > 0 ? (netSurplus / totalEquity) * 100 : 0;
  const solvencyRatioPct = totalEquity > 0 ? (totalAssets / totalEquity) * 100 : 0;

  // 1. Operations Flow (Waterfall-style comparison)
  const operationsFlowData = useMemo(() => {
    return [
      { name: 'Merchandise Sales', amount: merchandiseSales, type: 'revenue', fill: '#059669' },
      { name: 'Operating Revenue', amount: operatingRevenue, type: 'revenue', fill: '#0d9488' },
      { name: 'Total Gross Revenue', amount: grossReceipts, type: 'subtotal', fill: '#0284c7' },
      { name: 'Cost of Sales (COGS)', amount: costOfSales, type: 'cost', fill: '#d97706' },
      { name: 'Gross Profit', amount: grossProfit, type: 'subtotal', fill: '#10b981' },
      { name: 'Operating Expenses', amount: operatingExpenses, type: 'cost', fill: '#ea580c' },
      { name: 'Net Surplus (Profit)', amount: netSurplus, type: 'result', fill: '#047857' },
    ];
  }, [merchandiseSales, operatingRevenue, grossReceipts, costOfSales, grossProfit, operatingExpenses, netSurplus]);

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
      {/* View Selector Controls & Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#064e3b] via-emerald-800 to-teal-800 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-700/60 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-300" />
              Visual Financial Analytics
            </span>
            <span className="text-xs text-emerald-200/90 font-medium">
              Period: {period.toUpperCase()} ({period === 'daily' ? date : period === 'monthly' ? `Month ${month}, ${year}` : `Year ${year}`})
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Financial Statement Summary & Visual Analysis
          </h2>
          <p className="text-xs text-emerald-100/80 mt-0.5">
            Graphical breakdown of certified balance sheet, revenues, merchandise collections, cost of sales, and surplus.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-emerald-950/70 p-1 rounded-xl border border-emerald-700/60 text-xs font-bold self-start md:self-auto">
          <button
            onClick={() => setActiveView('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeView === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            All Charts
          </button>
          <button
            onClick={() => setActiveView('operations')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeView === 'operations'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            Operations & P&L
          </button>
          <button
            onClick={() => setActiveView('balance_sheet')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeView === 'balance_sheet'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-200 hover:text-white'
            }`}
          >
            Balance Sheet
          </button>
        </div>
      </div>

      {/* Top Level Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-2xl border border-outline-variant/60 shadow-2xs">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
            Total Assets
          </div>
          <div className="font-mono text-base font-black text-neutral-900 dark:text-white">
            {fmt(totalAssets)}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Solvency {solvencyRatioPct.toFixed(1)}%
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-2xl border border-outline-variant/60 shadow-2xs">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
            Total Equity
          </div>
          <div className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400">
            {fmt(totalEquity)}
          </div>
          <div className="text-[10px] text-neutral-500 font-medium mt-1">
            Capital & Reserves
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-2xl border border-outline-variant/60 shadow-2xs">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
            Merchandise Sales
          </div>
          <div className="font-mono text-base font-black text-neutral-900 dark:text-white">
            {fmt(merchandiseSales)}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <ShoppingBag className="w-3 h-3" />
            Store & Supplies
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-2xl border border-outline-variant/60 shadow-2xs">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
            Operating Revenue
          </div>
          <div className="font-mono text-base font-black text-blue-700 dark:text-blue-400">
            {fmt(operatingRevenue)}
          </div>
          <div className="text-[10px] text-neutral-500 font-medium mt-1">
            Interest & Fees
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-2xl border border-outline-variant/60 shadow-2xs">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
            Gross Profit
          </div>
          <div className="font-mono text-base font-black text-teal-700 dark:text-teal-400">
            {fmt(grossProfit)}
          </div>
          <div className="text-[10px] text-teal-600 font-semibold mt-1 flex items-center gap-1">
            <Percent className="w-3 h-3" />
            Margin {grossMarginPct.toFixed(1)}%
          </div>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-2xs">
          <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1">
            Net Surplus (Profit)
          </div>
          <div className="font-mono text-base font-black text-emerald-800 dark:text-emerald-300">
            {fmt(netSurplus)}
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            ROE {returnOnEquityPct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* SECTION 1: OPERATIONS & PROFIT FLOW */}
      {(activeView === 'all' || activeView === 'operations') && (
        <div className="space-y-6">
          {/* Executive Flowchart / Bar Chart: Revenue vs Costs vs Surplus */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-outline-variant/60 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Statement of Operations Flow (Revenue, Expenses & Surplus)
                </h3>
                <p className="text-xs text-neutral-500">
                  Step-by-step financial ladder from gross sales down to certified net surplus.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Inflow / Profit
                </span>
                <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" /> Outflow / Cost
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={operationsFlowData} margin={{ top: 15, right: 15, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10.5, fill: '#64748b', fontWeight: 600 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10.5, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCurrencyShort}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(5, 150, 105, 0.05)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-lg text-xs space-y-1">
                          <div className="font-bold text-neutral-900 dark:text-white">{item.name}</div>
                          <div className="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                            {fmt(item.amount)}
                          </div>
                          <div className="text-[10px] text-neutral-400 capitalize">
                            Classification: {item.type}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {operationsFlowData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dual Visuals: Sales of Merchandise by Category & Operating Revenue Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales of Merchandise by Category */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-outline-variant/60 p-5 shadow-2xs space-y-4">
              <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" />
                    Sales of Merchandise by Category
                  </h3>
                  <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                    {fmt(merchandiseSales)}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Distribution of official uniforms, paraphernalia, accessories & retail sales.
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={merchandiseCategoryData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.5} />
                    <XAxis type="number" tickFormatter={formatCurrencyShort} tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 10.5, fill: '#64748b', fontWeight: 600 }}
                      width={130}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: any) => [fmt(val), 'Sales Revenue']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    />
                    <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                      {merchandiseCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown Table / Badges */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                {merchandiseCategoryData.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.fill }} />
                      <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">{cat.name}</span>
                    </div>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white shrink-0 ml-2">
                      {cat.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Operating Revenue Streams */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-outline-variant/60 p-5 shadow-2xs space-y-4">
              <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    Operating Revenue Streams
                  </h3>
                  <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400">
                    {fmt(operatingRevenue)}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Loan interest revenues, service fees, fines, commission & locker rentals.
                </p>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={operatingRevenueData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="amount"
                      nameKey="name"
                      stroke="none"
                    >
                      {operatingRevenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [fmt(val), 'Revenue']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend Badges */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                {operatingRevenueData.slice(0, 6).map((rev, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 text-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rev.fill }} />
                      <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">{rev.name}</span>
                    </div>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white shrink-0 ml-2">
                      {rev.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Operating Expenses Breakdown Chart */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-outline-variant/60 p-5 shadow-2xs space-y-4">
            <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  Operating Expenses (OPEX) by Department
                </h3>
                <p className="text-xs text-neutral-500">
                  Consolidated distribution across 36 statutory operating expense accounts.
                </p>
              </div>
              <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400">
                Total OPEX: {fmt(operatingExpenses)}
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={operatingExpensesData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10.5, fill: '#64748b', fontWeight: 600 }}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10.5, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCurrencyShort}
                  />
                  <Tooltip
                    formatter={(val: any) => [fmt(val), 'Expense']}
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {operatingExpensesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: BALANCE SHEET ALLOCATION & EQUITY */}
      {(activeView === 'all' || activeView === 'balance_sheet') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets Allocation Donut Chart */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-outline-variant/60 p-5 shadow-2xs space-y-4">
              <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-emerald-600" />
                    Asset Composition & Allocation
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Distribution of cooperative resources across cash, loans, and inventory.
                  </p>
                </div>
                <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                  {fmt(totalAssets)}
                </span>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetsAllocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="amount"
                      nameKey="name"
                      stroke="none"
                    >
                      {assetsAllocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [fmt(val), 'Asset Value']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Assets Legend Breakdown */}
              <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                {assetsAllocationData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {fmt(item.amount)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Equity & Liabilities Composition */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-outline-variant/60 p-5 shadow-2xs space-y-4">
              <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Capital & Equity Structure
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Breakdown of member share capital, undivided retained earnings & donations.
                  </p>
                </div>
                <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400">
                  {fmt(totalEquity)}
                </span>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={equityStructureData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="amount"
                      nameKey="name"
                      stroke="none"
                    >
                      {equityStructureData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [fmt(val), 'Equity Value']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Equity Legend Breakdown */}
              <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                {equityStructureData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {fmt(item.amount)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono text-[10px] font-bold">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cooperative Accounting Balance Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-emerald-300 dark:border-emerald-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Fundamental Cooperative Accounting Equation
              </span>
              <p className="font-mono text-sm font-black text-neutral-800 dark:text-neutral-200">
                Assets ({fmt(totalAssets)}) = Liabilities ({fmt(totalLiabilities)}) + Equity ({fmt(totalEquity)})
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="text-right">
                <span className="text-neutral-400 block text-[10px]">Net Solvency Ratio</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-black text-sm">
                  {solvencyRatioPct.toFixed(2)}%
                </span>
              </div>
              <div className="text-right border-l border-neutral-200 dark:border-neutral-700 pl-4">
                <span className="text-neutral-400 block text-[10px]">Surplus on Capital</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-black text-sm">
                  {returnOnEquityPct.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

