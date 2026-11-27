'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import AnimatedSelect from '@/components/ui/AnimatedSelect';
import { Search, RefreshCw, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';

interface TrialBalanceRow {
  account_name: string;
  account_type: string;
  debit_total: number;
  credit_total: number;
  trial_debit: number;
  trial_credit: number;
}

const fmt = (n: number) =>
  `₱${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TrialBalanceTab({ initialYear = 2026 }: { initialYear?: number }) {
  const [year, setYear] = useState(initialYear);
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [totals, setTotals] = useState({ total_debit: 0, total_credit: 0, variance: 0, is_balanced: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrialBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reports/trial-balance', { params: { year } });
      setRows(res.data.rows || []);
      setTotals({
        total_debit: res.data.total_debit || 0,
        total_credit: res.data.total_credit || 0,
        variance: res.data.variance || 0,
        is_balanced: res.data.is_balanced ?? true,
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load Trial Balance.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadTrialBalance();
  }, [loadTrialBalance]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== 'All' && r.account_type !== typeFilter) return false;
      if (!q) return true;
      return r.account_name.toLowerCase().includes(q) || r.account_type.toLowerCase().includes(q);
    });
  }, [rows, typeFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, year, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Trial Balance Debit</div>
          <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">{fmt(totals.total_debit)}</div>
        </div>
        <div className="p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Trial Balance Credit</div>
          <div className="text-2xl font-black font-mono text-sky-700 dark:text-sky-400 mt-1">{fmt(totals.total_credit)}</div>
        </div>
        <div className="p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Verification</div>
            <div className="mt-1.5">
              {totals.is_balanced ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" /> Variance: {fmt(totals.variance)}
                </span>
              )}
            </div>
          </div>
          <Scale className="w-7 h-7 text-neutral-300 dark:text-neutral-700" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
        <div className="relative w-full lg:max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter Trial Balance accounts..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-xs text-on-surface dark:text-white outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Asset', 'Liabilities', 'Equity', 'Revenue', 'Expense'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                typeFilter === t
                  ? 'bg-[#064e3b] text-white'
                  : 'bg-neutral-100 dark:bg-surface-container text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              {t}
            </button>
          ))}

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-xs font-bold text-on-surface dark:text-white"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>Year {y}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadTrialBalance}
            className="p-2 rounded-xl border border-outline-variant/60 hover:bg-neutral/5 text-neutral-600 dark:text-neutral-300 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Trial Balance Table */}
      <div className="rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
        <div className="overflow-x-auto rounded-t-2xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 dark:bg-surface-container text-[10px] font-bold uppercase tracking-wider text-neutral-500 border-b border-outline-variant/60">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Account Title</th>
                <th className="p-3 text-right">Total Debits</th>
                <th className="p-3 text-right">Total Credits</th>
                <th className="p-3 text-right">Debit Balance</th>
                <th className="p-3 text-right">Credit Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-neutral-500">Loading Trial Balance...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-neutral-500">No accounts found.</td></tr>
              ) : (
                paginated.map((r, i) => (
                  <tr key={`${r.account_type}-${r.account_name}-${i}`} className="hover:bg-neutral-50/60 dark:hover:bg-white/[0.03]">
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-surface-container text-neutral-700 dark:text-neutral-300">
                        {r.account_type}
                      </span>
                    </td>
                    <td className="p-2.5 font-semibold text-on-surface dark:text-white">{r.account_name}</td>
                    <td className="p-2.5 text-right font-mono text-neutral-500">{fmt(r.debit_total)}</td>
                    <td className="p-2.5 text-right font-mono text-neutral-500">{fmt(r.credit_total)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {r.trial_debit > 0 ? fmt(r.trial_debit) : '—'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                      {r.trial_credit > 0 ? fmt(r.trial_credit) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot className="bg-neutral-50 dark:bg-surface-container border-t-2 border-outline-variant font-mono font-black text-xs">
                <tr>
                  <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                    Grand Total
                  </td>
                  <td className="p-3 text-right text-emerald-700 dark:text-emerald-400">{fmt(totals.total_debit)}</td>
                  <td className="p-3 text-right text-sky-700 dark:text-sky-400">{fmt(totals.total_credit)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-outline-variant/40 bg-neutral-50/50 dark:bg-surface-container rounded-b-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-neutral-500 font-medium">
              Showing <span className="font-bold text-on-surface dark:text-white">{(safePage - 1) * pageSize + 1}</span>–
              <span className="font-bold text-on-surface dark:text-white">{Math.min(safePage * pageSize, filtered.length)}</span> of{' '}
              <span className="font-bold text-on-surface dark:text-white">{filtered.length}</span> accounts
            </div>
            <div className="flex items-center gap-2">
              <AnimatedSelect
                value={String(pageSize)}
                onChange={(val) => setPageSize(Number(val))}
                openUpwards
                className="min-w-[115px]"
                options={[15, 25, 50, 100].map((s) => ({ value: String(s), label: `${s} / page` }))}
              />
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-white dark:bg-surface-container-high font-bold text-on-surface dark:text-white disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <span className="font-mono font-bold text-neutral-600 dark:text-neutral-300 px-1">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-white dark:bg-surface-container-high font-bold text-on-surface dark:text-white disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
