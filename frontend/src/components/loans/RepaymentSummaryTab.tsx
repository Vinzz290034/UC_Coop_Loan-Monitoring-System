'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import * as XLSX from 'xlsx';
import {
  Calendar,
  Banknote,
  Percent,
  Users,
  TrendingUp,
  Download,
  RefreshCw,
  Search,
  ChevronRight,
  Loader2,
  Layers,
  CreditCard
} from 'lucide-react';

interface RepaymentSummaryData {
  period: 'day' | 'month' | 'year';
  filters: {
    date: string;
    month: string;
    year: number;
  };
  summary: {
    total_repayment: number;
    principal_paid: number;
    interest_paid: number;
    payment_count: number;
    unique_borrowers: number;
    avg_payment: number;
  };
  comparison: {
    today: { total_repayment: number; principal_paid: number; interest_paid: number; payment_count: number };
    month: { total_repayment: number; principal_paid: number; interest_paid: number; payment_count: number };
    year: { total_repayment: number; principal_paid: number; interest_paid: number; payment_count: number };
  };
  by_product: Array<{
    product_name: string;
    payment_count: number;
    total_repayment: number;
    principal_paid: number;
    interest_paid: number;
  }>;
  by_method: Array<{
    payment_method: string;
    payment_count: number;
    total_repayment: number;
    principal_paid: number;
    interest_paid: number;
  }>;
  timeline: Array<{
    label: string;
    period_key: string;
    payment_count: number;
    total_repayment: number;
    principal_paid: number;
    interest_paid: number;
  }>;
  transactions: Array<{
    id: string;
    loan_id: string;
    laf_no: string | null;
    member_name: string;
    member_no: string | null;
    product_name: string;
    payment_date: string;
    payment_method: string | null;
    reference_no: string | null;
    amount: number;
    principal_paid: number;
    interest_paid: number;
  }>;
}

const fmt = (val: number) =>
  `₱${(Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RepaymentSummaryTab() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const currentMonthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const currentYearStr = String(now.getFullYear());

  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('month');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [data, setData] = useState<RepaymentSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [txSearch, setTxSearch] = useState('');

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/loans/repayments/summary', {
        params: {
          period,
          date: selectedDate,
          month: selectedMonth,
          year: selectedYear
        }
      });
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load repayment summary:', err);
    } finally {
      setLoading(false);
    }
  }, [period, selectedDate, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const filteredTx = useMemo(() => {
    const list = data?.transactions || [];
    const q = txSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(tx =>
      `${tx.member_name} ${tx.member_no || ''} ${tx.laf_no || ''} ${tx.product_name} ${tx.reference_no || ''} ${tx.payment_method || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [data?.transactions, txSearch]);

  const handleExportExcel = () => {
    if (!data) return;
    const rows = filteredTx.map(tx => ({
      'Payment Date': tx.payment_date ? new Date(tx.payment_date).toLocaleDateString('en-US') : '',
      'Reference / OR No.': tx.reference_no || '—',
      'LAF No.': tx.laf_no || '—',
      'Member ID': tx.member_no || '—',
      'Borrower Name': tx.member_name,
      'Loan Product': tx.product_name,
      'Method': tx.payment_method || '—',
      'Principal Paid': tx.principal_paid,
      'Interest Paid': tx.interest_paid,
      'Total Repayment': tx.amount
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Repayment Summary');
    const suffix = period === 'day' ? selectedDate : period === 'month' ? selectedMonth : selectedYear;
    XLSX.writeFile(wb, `Loan_Repayment_Summary_${period}_${suffix}.xlsx`);
  };

  const summary = data?.summary;
  const principalShare = summary && summary.total_repayment > 0
    ? ((summary.principal_paid / summary.total_repayment) * 100).toFixed(1)
    : '0.0';
  const interestShare = summary && summary.total_repayment > 0
    ? ((summary.interest_paid / summary.total_repayment) * 100).toFixed(1)
    : '0.0';

  const yearOptions = Array.from({ length: 6 }, (_, i) => String(now.getFullYear() - i));

  return (
    <div className="space-y-6">
      {/* Header & Period Controls */}
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h3 className="font-headline font-bold text-base text-on-surface dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary dark:text-secondary" />
            <span>Loan Repayment &amp; Interest Summary</span>
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Track total repayments, principal recovered, and interest paid by day, month, or year.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Toggle */}
          <div className="inline-flex rounded-2xl bg-neutral-100 dark:bg-neutral-900 p-1 border border-outline-variant/40">
            {(['day', 'month', 'year'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  period === p
                    ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
                }`}
              >
                {p === 'day' ? 'Daily' : p === 'month' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>

          {/* Date / Month / Year Selector */}
          {period === 'day' && (
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-xs font-semibold text-on-surface dark:text-white"
            />
          )}
          {period === 'month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-xs font-semibold text-on-surface dark:text-white"
            />
          )}
          {period === 'year' && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-xs font-semibold text-on-surface dark:text-white cursor-pointer"
            >
              {yearOptions.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={fetchSummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-bold text-on-surface dark:text-white cursor-pointer"
            title="Refresh summary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!data || filteredTx.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary dark:bg-secondary text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Quick Today / This Month / This Year Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            key: 'today' as const,
            title: 'Today',
            sub: todayStr,
            stats: data?.comparison.today,
            onClick: () => { setPeriod('day'); setSelectedDate(todayStr); }
          },
          {
            key: 'month' as const,
            title: 'This Month',
            sub: currentMonthStr,
            stats: data?.comparison.month,
            onClick: () => { setPeriod('month'); setSelectedMonth(currentMonthStr); }
          },
          {
            key: 'year' as const,
            title: 'This Year',
            sub: currentYearStr,
            stats: data?.comparison.year,
            onClick: () => { setPeriod('year'); setSelectedYear(currentYearStr); }
          }
        ].map(card => (
          <button
            key={card.key}
            type="button"
            onClick={card.onClick}
            className="text-left bg-white dark:bg-surface-container-low border border-outline-variant/65 hover:border-primary/50 dark:hover:border-secondary/50 rounded-3xl p-4 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                {card.title} ({card.sub})
              </span>
              <span className="text-[10px] font-bold text-primary dark:text-secondary opacity-75 group-hover:opacity-100 flex items-center gap-0.5">
                View <ChevronRight className="w-3 h-3" />
              </span>
            </div>
            <div className="mt-1.5 text-lg font-headline font-extrabold tabular-nums text-on-surface dark:text-white">
              {fmt(card.stats?.total_repayment || 0)}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500">
              <span>Principal: <strong className="text-neutral-700 dark:text-neutral-300">{fmt(card.stats?.principal_paid || 0)}</strong></span>
              <span>Interest: <strong className="text-emerald-600 dark:text-emerald-400">{fmt(card.stats?.interest_paid || 0)}</strong></span>
              <span>({card.stats?.payment_count || 0} tx)</span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Period KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-neutral-500 block tracking-wider">Total Repayment</span>
            <span className="text-xl font-headline font-extrabold tabular-nums text-on-surface dark:text-white block mt-0.5 truncate">
              {fmt(summary?.total_repayment || 0)}
            </span>
            <span className="text-[10px] font-semibold text-neutral-500 block mt-0.5">
              {summary?.payment_count || 0} payments · {summary?.unique_borrowers || 0} borrowers
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-neutral-500 block tracking-wider">Principal Paid</span>
            <span className="text-xl font-headline font-extrabold tabular-nums text-on-surface dark:text-white block mt-0.5 truncate">
              {fmt(summary?.principal_paid || 0)}
            </span>
            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block mt-0.5">
              {principalShare}% of total repayment
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-neutral-500 block tracking-wider">Interest Paid</span>
            <span className="text-xl font-headline font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 block mt-0.5 truncate">
              {fmt(summary?.interest_paid || 0)}
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              {interestShare}% of total repayment
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-neutral-500 block tracking-wider">Average Payment</span>
            <span className="text-xl font-headline font-extrabold tabular-nums text-on-surface dark:text-white block mt-0.5 truncate">
              {fmt(summary?.avg_payment || 0)}
            </span>
            <span className="text-[10px] font-semibold text-neutral-500 block mt-0.5">
              Per receipt / remittance
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Grids: Timeline + By Product & Payment Method */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Timeline Breakdown (shown for Month or Year) */}
        {period !== 'day' && (
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5">
            <h4 className="font-headline font-bold text-sm text-on-surface dark:text-white flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary dark:text-secondary" />
              <span>{period === 'year' ? 'Monthly Breakdown' : 'Daily Breakdown'}</span>
            </h4>
            {loading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : !data?.timeline?.length ? (
              <p className="text-xs text-neutral-500 py-6 text-center">No repayments recorded in this period.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {data.timeline.map(row => (
                  <button
                    key={row.period_key}
                    type="button"
                    onClick={() => {
                      if (period === 'year') {
                        setPeriod('month');
                        setSelectedMonth(row.period_key);
                      } else if (period === 'month') {
                        setPeriod('day');
                        setSelectedDate(row.period_key);
                      }
                    }}
                    className="w-full text-left p-2.5 rounded-2xl border border-outline-variant/40 hover:border-primary/40 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-on-surface dark:text-white">
                      <span>{row.label}</span>
                      <span className="font-mono">{fmt(row.total_repayment)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1">
                      <span>Principal: {fmt(row.principal_paid)}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Interest: {fmt(row.interest_paid)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* By Loan Product */}
        <div className={`bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 ${period === 'day' ? 'lg:col-span-2' : ''}`}>
          <h4 className="font-headline font-bold text-sm text-on-surface dark:text-white flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-primary dark:text-secondary" />
            <span>By Loan Product</span>
          </h4>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : !data?.by_product?.length ? (
            <p className="text-xs text-neutral-500 py-6 text-center">No repayments recorded in this period.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {data.by_product.map(row => (
                <div key={row.product_name} className="p-2.5 rounded-2xl border border-outline-variant/40">
                  <div className="flex items-center justify-between text-xs font-bold text-on-surface dark:text-white">
                    <span className="truncate pr-2">{row.product_name}</span>
                    <span className="font-mono shrink-0">{fmt(row.total_repayment)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1">
                    <span>{row.payment_count} payments · Principal: {fmt(row.principal_paid)}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Interest: {fmt(row.interest_paid)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Payment Method */}
        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5">
          <h4 className="font-headline font-bold text-sm text-on-surface dark:text-white flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-primary dark:text-secondary" />
            <span>By Payment Method</span>
          </h4>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : !data?.by_method?.length ? (
            <p className="text-xs text-neutral-500 py-6 text-center">No repayments recorded in this period.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {data.by_method.map(row => (
                <div key={row.payment_method} className="p-2.5 rounded-2xl border border-outline-variant/40">
                  <div className="flex items-center justify-between text-xs font-bold text-on-surface dark:text-white">
                    <span>{row.payment_method}</span>
                    <span className="font-mono">{fmt(row.total_repayment)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1">
                    <span>{row.payment_count} payments · Principal: {fmt(row.principal_paid)}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Interest: {fmt(row.interest_paid)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Itemized Repayments Table */}
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-outline-variant/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="font-headline font-bold text-sm text-on-surface dark:text-white">
              Repayment Transactions ({filteredTx.length})
            </h4>
            <p className="text-[11px] text-neutral-500">
              Showing itemized principal &amp; interest allocations for the selected period.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={txSearch}
              onChange={e => setTxSearch(e.target.value)}
              placeholder="Filter borrower, LAF, OR#..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-outline-variant/60 bg-transparent text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-[10px] uppercase tracking-wider text-neutral-500 border-b border-outline-variant/40">
              <tr>
                <th className="text-left py-3 px-4 font-bold">Date</th>
                <th className="text-left py-3 px-3 font-bold">OR / Ref #</th>
                <th className="text-left py-3 px-3 font-bold">LAF No.</th>
                <th className="text-left py-3 px-3 font-bold">Borrower</th>
                <th className="text-left py-3 px-3 font-bold">Loan Product</th>
                <th className="text-left py-3 px-3 font-bold">Method</th>
                <th className="text-right py-3 px-3 font-bold">Principal</th>
                <th className="text-right py-3 px-3 font-bold">Interest</th>
                <th className="text-right py-3 px-4 font-bold">Total Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-neutral-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-neutral-500">
                    No repayment transactions found for this period.
                  </td>
                </tr>
              ) : (
                filteredTx.map(tx => (
                  <tr key={tx.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40">
                    <td className="py-2.5 px-4 font-mono whitespace-nowrap">
                      {tx.payment_date ? new Date(tx.payment_date).toLocaleDateString('en-US') : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{tx.reference_no || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-primary dark:text-secondary font-bold">{tx.laf_no || '—'}</td>
                    <td className="py-2.5 px-3 font-semibold text-on-surface dark:text-white">{tx.member_name}</td>
                    <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400">{tx.product_name}</td>
                    <td className="py-2.5 px-3">{tx.payment_method || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{fmt(tx.principal_paid)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(tx.interest_paid)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-on-surface dark:text-white">{fmt(tx.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
