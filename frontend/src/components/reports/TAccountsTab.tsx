'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import AnimatedSelect from '@/components/ui/AnimatedSelect';
import { Search, RefreshCw, Layers } from 'lucide-react';

interface TAccountPosting {
  date: string;
  jev_no: string;
  payee?: string;
  description: string;
  amount: number;
  source_type: string;
}

interface TAccount {
  account_name: string;
  account_type: string;
  normal: 'debit' | 'credit';
  opening_balance: number;
  debit_total: number;
  credit_total: number;
  ending_balance: number;
  debits: TAccountPosting[];
  credits: TAccountPosting[];
}

const fmt = (n: number) =>
  `₱${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TAccountsTab({ initialYear = 2026 }: { initialYear?: number }) {
  const [year, setYear] = useState(initialYear);
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [accounts, setAccounts] = useState<TAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reports/t-accounts', { params: { year } });
      setAccounts(res.data.accounts || []);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load T-Accounts.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadTAccounts();
  }, [loadTAccounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (typeFilter !== 'All' && a.account_type !== typeFilter) return false;
      if (!q) return true;
      return a.account_name.toLowerCase().includes(q) || a.account_type.toLowerCase().includes(q);
    });
  }, [accounts, typeFilter, search]);

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
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
        <div className="relative w-full lg:max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search T-Account name..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-xs text-on-surface dark:text-white outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Asset', 'Liabilities', 'Equity', 'Revenue', 'Expense'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
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
            onClick={loadTAccounts}
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

      {loading ? (
        <div className="p-12 text-center text-xs text-neutral-500">Loading T-Accounts...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-xs text-neutral-500">
          <Layers className="w-6 h-6 mx-auto mb-2 opacity-40" />
          No T-Accounts match your filter.
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {paginated.map((acc) => (
            <div key={`${acc.account_type}-${acc.account_name}`} className="rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low overflow-hidden flex flex-col">
              {/* T-Account Header */}
              <div className="px-4 py-3 border-b-2 border-neutral-800 dark:border-neutral-600 bg-neutral-50 dark:bg-surface-container flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">{acc.account_type}</span>
                  <h3 className="text-sm font-black text-on-surface dark:text-white">{acc.account_name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-neutral-500 block">Ending Balance</span>
                  <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400">{fmt(acc.ending_balance)}</span>
                </div>
              </div>

              {/* Two-Column T Split */}
              <div className="grid grid-cols-2 divide-x-2 divide-neutral-800 dark:divide-neutral-600 text-[11px] flex-1">
                {/* DEBIT SIDE */}
                <div className="p-3 space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border-b border-outline-variant/40 pb-1 flex justify-between">
                    <span>Debit (Dr)</span>
                    <span>{acc.debits.length}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {acc.debits.length === 0 ? (
                      <div className="text-neutral-400 italic py-2">No debit postings</div>
                    ) : (
                      acc.debits.slice(0, 40).map((d, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 py-0.5">
                          <span className="truncate text-neutral-600 dark:text-neutral-300" title={`${d.date} • ${d.description}`}>
                            <span className="font-mono text-[10px] text-neutral-400 mr-1">{d.jev_no}</span>
                            {d.description}
                          </span>
                          <span className="font-mono font-bold text-on-surface dark:text-white whitespace-nowrap">{fmt(d.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* CREDIT SIDE */}
                <div className="p-3 space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 border-b border-outline-variant/40 pb-1 flex justify-between">
                    <span>Credit (Cr)</span>
                    <span>{acc.credits.length}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {acc.credits.length === 0 ? (
                      <div className="text-neutral-400 italic py-2">No credit postings</div>
                    ) : (
                      acc.credits.slice(0, 40).map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 py-0.5">
                          <span className="truncate text-neutral-600 dark:text-neutral-300" title={`${c.date} • ${c.description}`}>
                            <span className="font-mono text-[10px] text-neutral-400 mr-1">{c.jev_no}</span>
                            {c.description}
                          </span>
                          <span className="font-mono font-bold text-on-surface dark:text-white whitespace-nowrap">{fmt(c.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* T-Account Footer Totals */}
              <div className="grid grid-cols-2 divide-x-2 divide-neutral-800 dark:divide-neutral-600 border-t border-outline-variant/60 bg-neutral-50/70 dark:bg-surface-container text-[11px] font-mono font-bold">
                <div className="px-3 py-2 flex justify-between">
                  <span className="text-neutral-500">Total Dr:</span>
                  <span className="text-emerald-700 dark:text-emerald-400">{fmt(acc.debit_total)}</span>
                </div>
                <div className="px-3 py-2 flex justify-between">
                  <span className="text-neutral-500">Total Cr:</span>
                  <span className="text-sky-700 dark:text-sky-400">{fmt(acc.credit_total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-neutral-500 font-medium">
            Showing <span className="font-bold text-on-surface dark:text-white">{(safePage - 1) * pageSize + 1}</span>–
            <span className="font-bold text-on-surface dark:text-white">{Math.min(safePage * pageSize, filtered.length)}</span> of{' '}
            <span className="font-bold text-on-surface dark:text-white">{filtered.length}</span> T-Accounts
          </div>
          <div className="flex items-center gap-2">
            <AnimatedSelect
              value={String(pageSize)}
              onChange={(val) => setPageSize(Number(val))}
              openUpwards
              className="min-w-[115px]"
              options={[6, 12, 24, 48].map((s) => ({ value: String(s), label: `${s} / page` }))}
            />
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container font-bold text-on-surface dark:text-white disabled:opacity-40 cursor-pointer"
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
              className="px-3 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container font-bold text-on-surface dark:text-white disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
