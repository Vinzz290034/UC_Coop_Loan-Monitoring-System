'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import AnimatedSelect from '@/components/ui/AnimatedSelect';
import { Search, RefreshCw, CheckCircle2, AlertTriangle, Scale, X, Layers, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';

interface TrialBalanceRow {
  account_name: string;
  account_type: string;
  debit_total: number;
  credit_total: number;
  trial_debit: number;
  trial_credit: number;
}

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

interface ImportedTbRow {
  account_code: string;
  account_name: string;
  account_type: 'Asset' | 'Liabilities' | 'Equity' | 'Revenue' | 'Expense';
  normal_balance: 'debit' | 'credit';
  opening_balance: number;
}

const parseMoney = (val: unknown): number => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const s = String(val ?? '').trim();
  if (!s || s === '-' || s === '—') return 0;
  const isParenNeg = s.startsWith('(') && s.endsWith(')');
  const cleaned = s.replace(/[₱$,\s()]/g, '');
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return isParenNeg ? -Math.abs(n) : n;
};

const inferTypeFromCodeOrSection = (
  code: string,
  title: string,
  activeSection: ImportedTbRow['account_type']
): ImportedTbRow['account_type'] => {
  const c = code.trim();
  const t = title.toLowerCase();
  if (/^1/.test(c)) return 'Asset';
  if (/^2/.test(c)) return 'Liabilities';
  if (/^3/.test(c)) return 'Equity';
  if (/^4/.test(c)) return 'Revenue';
  if (/^[56789]/.test(c)) return 'Expense';
  if (/cash|bank|receivable|inventory|supplies|prepaid|equipment|furniture|deposit|federation|revolving|petty|depreciation/.test(t)) return 'Asset';
  if (/payable|accrued|due to|unearned|premium|dividend|non-current liab/.test(t)) return 'Liabilities';
  if (/share|capital|surplus|reserve|cetf|optional fund|community dev|donation|grant|equity/.test(t)) return 'Equity';
  if (/interest income|revenue|sales|service fee|fines|membership fee|income/.test(t)) return 'Revenue';
  if (/expense|salary|wages|allowance|utilities|rent|repairs|stationery|depreciation expense/.test(t)) return 'Expense';
  return activeSection;
};

const fmt = (n: number) =>
  `₱${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TrialBalanceTab({
  initialYear = 2026,
  mode = 'trial_balance',
}: {
  initialYear?: number;
  mode?: 'general_ledger' | 'trial_balance';
}) {
  const isGlMode = mode === 'general_ledger';
  const [year, setYear] = useState(initialYear);
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [tAccountsByKey, setTAccountsByKey] = useState<Record<string, TAccount>>({});
  const [selectedTAccount, setSelectedTAccount] = useState<TAccount | null>(null);
  const [tAccountSearch, setTAccountSearch] = useState('');
  const [totals, setTotals] = useState({ total_debit: 0, total_credit: 0, variance: 0, is_balanced: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Import Trial Balance modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetYear, setImportTargetYear] = useState<number>(2026);
  const [importSourceLabel, setImportSourceLabel] = useState('Imported 2025 Ending Trial Balance');
  const [importReplaceExisting, setImportReplaceExisting] = useState(true);
  const [importRows, setImportRows] = useState<ImportedTbRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importBanner, setImportBanner] = useState<string | null>(null);

  const loadTrialBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reports/t-accounts', { params: { year } });
      const accounts: TAccount[] = res.data.accounts || [];
      const tb = res.data.trial_balance || {};
      const map: Record<string, TAccount> = {};
      for (const acc of accounts) {
        map[`${acc.account_type}::${acc.account_name}`] = acc;
      }
      setTAccountsByKey(map);
      setRows(tb.rows || []);
      setTotals({
        total_debit: tb.total_debit || 0,
        total_credit: tb.total_credit || 0,
        variance: tb.variance || 0,
        is_balanced: tb.is_balanced ?? true,
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load General Ledger & Trial Balance.');
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
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            {isGlMode ? 'GL Accounts' : 'Trial Balance Debit'}
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
            {isGlMode ? filtered.length : fmt(totals.total_debit)}
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            {isGlMode ? 'Total Net Debit Balances' : 'Trial Balance Credit'}
          </div>
          <div className="text-2xl font-black font-mono text-sky-700 dark:text-sky-400 mt-1">
            {isGlMode ? fmt(totals.total_debit) : fmt(totals.total_credit)}
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              {isGlMode ? 'Ledger Balance' : 'Verification'}
            </div>
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
            placeholder={isGlMode ? 'Filter General Ledger accounts (click row for T-Account)...' : 'Filter Trial Balance accounts...'}
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

          <AnimatedSelect
            value={String(year)}
            onChange={(val) => setYear(Number(val))}
            className="min-w-[115px]"
            options={[2024, 2025, 2026, 2027].map((y) => ({ value: String(y), label: `Year ${y}` }))}
          />

          <button
            type="button"
            onClick={() => {
              setImportError(null);
              setIsImportModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-xs font-bold cursor-pointer transition-colors"
            title="Import 2025 Trial Balance Excel/CSV as opening balances"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Trial Balance</span>
          </button>

          <button
            type="button"
            onClick={loadTrialBalance}
            className="p-2 rounded-xl border border-outline-variant/60 hover:bg-neutral/5 text-neutral-600 dark:text-neutral-300 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {importBanner && (
        <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between gap-2">
          <span>{importBanner}</span>
          <button type="button" onClick={() => setImportBanner(null)} className="p-1 hover:opacity-70 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
                {isGlMode ? (
                  <>
                    <th className="p-3 text-right">Total Debits</th>
                    <th className="p-3 text-right">Total Credits</th>
                    <th className="p-3 text-right">Ending Balance</th>
                  </>
                ) : (
                  <>
                    <th className="p-3 text-right">Debit Balance</th>
                    <th className="p-3 text-right">Credit Balance</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {loading ? (
                <tr><td colSpan={isGlMode ? 5 : 4} className="p-8 text-center text-neutral-500">Loading {isGlMode ? 'General Ledger' : 'Trial Balance'}...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={isGlMode ? 5 : 4} className="p-8 text-center text-neutral-500">No accounts found.</td></tr>
              ) : (
                paginated.map((r, i) => {
                  const tAcc = tAccountsByKey[`${r.account_type}::${r.account_name}`];
                  return (
                  <tr
                    key={`${r.account_type}-${r.account_name}-${i}`}
                    onClick={() => {
                      if (tAcc) {
                        setTAccountSearch('');
                        setSelectedTAccount(tAcc);
                      }
                    }}
                    className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer group"
                    title="Click to open T-Account"
                  >
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-surface-container text-neutral-700 dark:text-neutral-300">
                        {r.account_type}
                      </span>
                    </td>
                    <td className="p-2.5 font-semibold text-on-surface dark:text-white">
                      <div className="flex items-center justify-between gap-2">
                        <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {r.account_name}
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          <Layers className="w-3 h-3" /> T-Account
                        </span>
                      </div>
                    </td>
                    {isGlMode ? (
                      <>
                        <td className="p-2.5 text-right font-mono text-neutral-500">{fmt(r.debit_total)}</td>
                        <td className="p-2.5 text-right font-mono text-neutral-500">{fmt(r.credit_total)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-on-surface dark:text-white">
                          {tAcc ? fmt(tAcc.ending_balance) : fmt(r.trial_debit > 0 ? r.trial_debit : r.trial_credit)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {r.trial_debit > 0 ? fmt(r.trial_debit) : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                          {r.trial_credit > 0 ? fmt(r.trial_credit) : '—'}
                        </td>
                      </>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>
            {!loading && filtered.length > 0 && !isGlMode && (
              <tfoot className="bg-neutral-50 dark:bg-surface-container border-t-2 border-outline-variant font-mono font-black text-xs">
                <tr>
                  <td colSpan={2} className="p-3 text-right uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
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

      {/* T-Account Drilldown Modal */}
      {selectedTAccount && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setSelectedTAccount(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-surface-container-high border border-outline-variant/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-pop"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/60 bg-neutral-50 dark:bg-surface-container flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {selectedTAccount.account_type}
                    </span>
                    <span className="text-[11px] text-neutral-500">T-Account Ledger • Year {year}</span>
                  </div>
                  <h2 className="text-base font-black text-on-surface dark:text-white mt-0.5">
                    {selectedTAccount.account_name}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-neutral-500">Ending Balance</div>
                  <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                    {fmt(selectedTAccount.ending_balance)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTAccount(null)}
                  className="p-2 rounded-full hover:bg-neutral/10 text-neutral-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search inside T-Account */}
            <div className="px-6 py-3 border-b border-outline-variant/40 bg-white dark:bg-surface-container-high flex items-center justify-between gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tAccountSearch}
                  onChange={(e) => setTAccountSearch(e.target.value)}
                  placeholder="Search JEV #, date, payee, particulars..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-xs text-on-surface dark:text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div className="text-[11px] text-neutral-500 font-mono">
                {selectedTAccount.debits.length} Dr • {selectedTAccount.credits.length} Cr
              </div>
            </div>

            {/* Two-Column T-Account Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x-2 divide-neutral-800 dark:divide-neutral-600 flex-1 overflow-y-auto text-xs">
              {/* DEBIT COLUMN */}
              <div className="p-4 space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border-b-2 border-neutral-800 dark:border-neutral-600 pb-1.5 flex justify-between">
                  <span>Debit (Dr)</span>
                  <span>{selectedTAccount.debits.length} postings</span>
                </div>
                <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
                  {selectedTAccount.debits.filter((d) => {
                    const q = tAccountSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (d.jev_no || '').toLowerCase().includes(q) ||
                      (d.date || '').toLowerCase().includes(q) ||
                      (d.payee || '').toLowerCase().includes(q) ||
                      (d.description || '').toLowerCase().includes(q)
                    );
                  }).length === 0 ? (
                    <div className="text-neutral-400 italic py-6 text-center">No debit postings</div>
                  ) : (
                    selectedTAccount.debits
                      .filter((d) => {
                        const q = tAccountSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          (d.jev_no || '').toLowerCase().includes(q) ||
                          (d.date || '').toLowerCase().includes(q) ||
                          (d.payee || '').toLowerCase().includes(q) ||
                          (d.description || '').toLowerCase().includes(q)
                        );
                      })
                      .map((d, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-2 py-1.5 border-b border-outline-variant/30 last:border-b-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold text-neutral-500">{d.date}</span>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-surface-container text-on-surface dark:text-neutral-200">
                                {d.jev_no}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-600 dark:text-neutral-300 truncate mt-0.5" title={d.description}>
                              {d.payee ? `${d.payee} — ` : ''}{d.description}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                            {fmt(d.amount)}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* CREDIT COLUMN */}
              <div className="p-4 space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 border-b-2 border-neutral-800 dark:border-neutral-600 pb-1.5 flex justify-between">
                  <span>Credit (Cr)</span>
                  <span>{selectedTAccount.credits.length} postings</span>
                </div>
                <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
                  {selectedTAccount.credits.filter((c) => {
                    const q = tAccountSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (c.jev_no || '').toLowerCase().includes(q) ||
                      (c.date || '').toLowerCase().includes(q) ||
                      (c.payee || '').toLowerCase().includes(q) ||
                      (c.description || '').toLowerCase().includes(q)
                    );
                  }).length === 0 ? (
                    <div className="text-neutral-400 italic py-6 text-center">No credit postings</div>
                  ) : (
                    selectedTAccount.credits
                      .filter((c) => {
                        const q = tAccountSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          (c.jev_no || '').toLowerCase().includes(q) ||
                          (c.date || '').toLowerCase().includes(q) ||
                          (c.payee || '').toLowerCase().includes(q) ||
                          (c.description || '').toLowerCase().includes(q)
                        );
                      })
                      .map((c, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-2 py-1.5 border-b border-outline-variant/30 last:border-b-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold text-neutral-500">{c.date}</span>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-surface-container text-on-surface dark:text-neutral-200">
                                {c.jev_no}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-600 dark:text-neutral-300 truncate mt-0.5" title={c.description}>
                              {c.payee ? `${c.payee} — ` : ''}{c.description}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap">
                            {fmt(c.amount)}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer Totals */}
            <div className="grid grid-cols-2 divide-x-2 divide-neutral-800 dark:divide-neutral-600 border-t border-outline-variant/60 bg-neutral-50 dark:bg-surface-container font-mono font-black text-xs">
              <div className="px-6 py-3 flex justify-between">
                <span className="text-neutral-500">Total Debits:</span>
                <span className="text-emerald-700 dark:text-emerald-400">{fmt(selectedTAccount.debit_total)}</span>
              </div>
              <div className="px-6 py-3 flex justify-between">
                <span className="text-neutral-500">Total Credits:</span>
                <span className="text-sky-700 dark:text-sky-400">{fmt(selectedTAccount.credit_total)}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Import Trial Balance Modal */}
      {isImportModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => !importing && setIsImportModalOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-surface-container-high border border-outline-variant/80 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-pop"
          >
            <div className="px-6 py-4 border-b border-outline-variant/60 bg-neutral-50 dark:bg-surface-container flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-on-surface dark:text-white">
                    Import Trial Balance (Continue Accounting Period)
                  </h2>
                  <p className="text-[11px] text-neutral-500">
                    Upload your 2025 exported Trial Balance (.xlsx, .xls, .csv) to carry ending balances forward as Opening Balances.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={importing}
                onClick={() => setIsImportModalOpen(false)}
                className="p-2 rounded-full hover:bg-neutral/10 text-neutral-500 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {importError && (
                <div className="p-3 rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
                  {importError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Continue Into Year (Opening Balances)
                  </label>
                  <AnimatedSelect
                    value={String(importTargetYear)}
                    onChange={(val) => setImportTargetYear(Number(val))}
                    options={[2025, 2026, 2027].map((y) => ({
                      value: String(y),
                      label: `Year ${y} (Jan 1, ${y})`,
                    }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                    Source Label
                  </label>
                  <input
                    type="text"
                    value={importSourceLabel}
                    onChange={(e) => setImportSourceLabel(e.target.value)}
                    placeholder="e.g. Imported 2025 Ending Trial Balance"
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-xs text-on-surface dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/15">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-on-surface dark:text-white">
                    {importFileName ? `Selected: ${importFileName}` : 'Choose Trial Balance Excel / CSV file'}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Supports Coop Trial Balance exports (Account Code, Account Title, Beg. Balance, Debits, Credits, End. Balance) or Debit/Credit columns.
                  </p>
                </div>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shrink-0 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{importFileName ? 'Choose Another File' : 'Select Excel File'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      try {
                        setImportError(null);
                        setImportFileName(file.name);
                        const buf = await file.arrayBuffer();
                        const wb = XLSX.read(buf, { type: 'array' });
                        const sheetName = wb.SheetNames[0];
                        if (!sheetName) {
                          setImportError('No worksheet found in the selected file.');
                          return;
                        }
                        const ws = wb.Sheets[sheetName];
                        const matrix: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

                        // Locate header row
                        let headerRowIdx = -1;
                        let colCode = -1;
                        let colTitle = -1;
                        let colEndBal = -1;
                        let colBegBal = -1;
                        let colDebit = -1;
                        let colCredit = -1;

                        for (let r = 0; r < Math.min(matrix.length, 40); r++) {
                          const row = matrix[r] || [];
                          const cells = row.map((c) => String(c ?? '').trim().toLowerCase());
                          const titleIdx = cells.findIndex((c) => c.includes('account title') || c === 'account' || c === 'account name');
                          const codeIdx = cells.findIndex((c) => c.includes('account code') || c === 'code');
                          if (titleIdx !== -1 || codeIdx !== -1) {
                            headerRowIdx = r;
                            colCode = codeIdx;
                            colTitle = titleIdx !== -1 ? titleIdx : codeIdx + 1;
                            colBegBal = cells.findIndex((c) => c.includes('beg'));
                            colEndBal = cells.findIndex((c) => c.includes('end'));
                            colDebit = cells.findIndex((c) => c.includes('debit'));
                            colCredit = cells.findIndex((c) => c.includes('credit'));
                            break;
                          }
                        }

                        if (headerRowIdx === -1) {
                          setImportError('Could not detect "Account Code" / "Account Title" header row in the spreadsheet.');
                          return;
                        }

                        let activeSection: ImportedTbRow['account_type'] = 'Asset';
                        const parsedRows: ImportedTbRow[] = [];

                        for (let r = headerRowIdx + 1; r < matrix.length; r++) {
                          const row = matrix[r] || [];
                          const rawCode = colCode >= 0 ? String(row[colCode] ?? '').trim() : '';
                          // Some exports place Account Title across merged cells or next non-empty text column
                          let rawTitle = colTitle >= 0 ? String(row[colTitle] ?? '').trim() : '';
                          if (!rawTitle && colTitle >= 0) {
                            for (let c = colTitle; c < Math.min(row.length, colTitle + 4); c++) {
                              const cand = String(row[c] ?? '').trim();
                              if (cand && Number.isNaN(Number(cand.replace(/[,.\-()]/g, '')))) {
                                rawTitle = cand;
                                break;
                              }
                            }
                          }

                          const upperLine = `${rawCode} ${rawTitle}`.trim().toUpperCase();
                          if (!upperLine) continue;

                          // Update active section when encountering major section headers
                          if (!rawCode && !/^TOTAL/.test(upperLine)) {
                            if (/^ASSETS?$/.test(upperLine) || /CURRENT ASSETS|NON-CURRENT ASSETS|CASH/.test(upperLine)) activeSection = 'Asset';
                            else if (/LIABILITIES/.test(upperLine)) activeSection = 'Liabilities';
                            else if (/EQUITY|NET WORTH|MEMBERS'? EQUITY/.test(upperLine)) activeSection = 'Equity';
                            else if (/REVENUE|INCOME/.test(upperLine)) activeSection = 'Revenue';
                            else if (/EXPENSE/.test(upperLine)) activeSection = 'Expense';
                          }

                          // Skip TOTAL / header-only rows
                          if (/^TOTAL\b|^GRAND TOTAL\b|^SUB-?TOTAL\b/.test(rawTitle.toUpperCase()) || /^TOTAL\b/.test(rawCode.toUpperCase())) {
                            continue;
                          }
                          if (!rawCode && colEndBal >= 0 && String(row[colEndBal] ?? '').trim() === '' && (colDebit < 0 || String(row[colDebit] ?? '').trim() === '')) {
                            continue;
                          }
                          if (!rawTitle) continue;

                          const accountType = inferTypeFromCodeOrSection(rawCode, rawTitle, activeSection);
                          const normalBalance: 'debit' | 'credit' = ['Liabilities', 'Equity', 'Revenue'].includes(accountType)
                            ? 'credit'
                            : 'debit';

                          let openingBal = 0;
                          if (colEndBal >= 0 && String(row[colEndBal] ?? '').trim() !== '') {
                            openingBal = parseMoney(row[colEndBal]);
                          } else if (colDebit >= 0 || colCredit >= 0) {
                            const dr = colDebit >= 0 ? parseMoney(row[colDebit]) : 0;
                            const cr = colCredit >= 0 ? parseMoney(row[colCredit]) : 0;
                            const beg = colBegBal >= 0 ? parseMoney(row[colBegBal]) : 0;
                            if (colBegBal >= 0) {
                              openingBal = normalBalance === 'debit' ? beg + dr - cr : beg + cr - dr;
                            } else {
                              openingBal = normalBalance === 'debit' ? dr - cr : cr - dr;
                            }
                          }

                          openingBal = Math.round(openingBal * 100) / 100;
                          if (Math.abs(openingBal) < 0.005) continue;

                          parsedRows.push({
                            account_code: rawCode,
                            account_name: rawTitle,
                            account_type: accountType,
                            normal_balance: normalBalance,
                            opening_balance: openingBal,
                          });
                        }

                        if (parsedRows.length === 0) {
                          setImportError('No non-zero trial balance account rows were found below the header.');
                        }
                        setImportRows(parsedRows);
                      } catch (parseErr: any) {
                        setImportError(parseErr?.message || 'Failed to parse the Excel file.');
                      }
                    }}
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={importReplaceExisting}
                  onChange={(e) => setImportReplaceExisting(e.target.checked)}
                  className="rounded border-neutral-400 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Replace existing opening balances for Year {importTargetYear} (recommended so balances are not doubled)</span>
              </label>

              {importRows.length > 0 && (() => {
                const debitSide = importRows.reduce((s, r) => {
                  if (r.normal_balance === 'debit') return s + (r.opening_balance >= 0 ? r.opening_balance : 0);
                  return s + (r.opening_balance < 0 ? Math.abs(r.opening_balance) : 0);
                }, 0);
                const creditSide = importRows.reduce((s, r) => {
                  if (r.normal_balance === 'credit') return s + (r.opening_balance >= 0 ? r.opening_balance : 0);
                  return s + (r.opening_balance < 0 ? Math.abs(r.opening_balance) : 0);
                }, 0);
                const diff = Math.round((debitSide - creditSide) * 100) / 100;
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Parsed Accounts</span>
                        <span className="text-base font-black font-mono text-on-surface dark:text-white">{importRows.length}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Debit Opening Total</span>
                        <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-400">{fmt(debitSide)}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/50">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block">Credit Opening Total</span>
                        <span className="text-base font-black font-mono text-sky-700 dark:text-sky-400">
                          {fmt(creditSide)}{' '}
                          <span className={`text-[10px] ${Math.abs(diff) < 0.05 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            ({Math.abs(diff) < 0.05 ? 'Balanced' : `Var: ${fmt(diff)}`})
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="border border-outline-variant/60 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-neutral-50 dark:bg-surface-container text-[10px] font-bold uppercase tracking-wider text-neutral-500 border-b border-outline-variant/60 sticky top-0">
                          <tr>
                            <th className="p-2.5">Code</th>
                            <th className="p-2.5">Account Title</th>
                            <th className="p-2.5">Classification</th>
                            <th className="p-2.5 text-right">Opening Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/35">
                          {importRows.map((row, idx) => (
                            <tr key={`${row.account_code}-${idx}`} className="hover:bg-neutral/5">
                              <td className="p-2.5 font-mono text-[11px] text-neutral-500 whitespace-nowrap">{row.account_code || '—'}</td>
                              <td className="p-2.5 font-semibold text-on-surface dark:text-white">{row.account_name}</td>
                              <td className="p-2.5">
                                <select
                                  value={row.account_type}
                                  onChange={(e) => {
                                    const nextType = e.target.value as ImportedTbRow['account_type'];
                                    const nextNormal: 'debit' | 'credit' = ['Liabilities', 'Equity', 'Revenue'].includes(nextType)
                                      ? 'credit'
                                      : 'debit';
                                    setImportRows((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, account_type: nextType, normal_balance: nextNormal } : item
                                      )
                                    );
                                  }}
                                  className="px-2 py-1 rounded-lg border border-outline-variant/60 bg-white dark:bg-surface-container text-[11px] font-bold outline-none"
                                >
                                  <option value="Asset">Asset</option>
                                  <option value="Liabilities">Liabilities</option>
                                  <option value="Equity">Equity</option>
                                  <option value="Revenue">Revenue</option>
                                  <option value="Expense">Expense</option>
                                </select>
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap">{fmt(row.opening_balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 border-t border-outline-variant/60 bg-neutral-50 dark:bg-surface-container flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={importing}
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral/5 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importing || importRows.length === 0}
                onClick={async () => {
                  try {
                    setImporting(true);
                    setImportError(null);
                    const res = await api.post('/reports/trial-balance/import', {
                      target_year: importTargetYear,
                      source_label: importSourceLabel,
                      replace_existing: importReplaceExisting,
                      accounts: importRows,
                    });
                    setImportBanner(res.data?.message || `Imported ${importRows.length} opening balances for Year ${importTargetYear}.`);
                    setIsImportModalOpen(false);
                    setImportRows([]);
                    setImportFileName('');
                    if (year !== importTargetYear) {
                      setYear(importTargetYear);
                    } else {
                      await loadTrialBalance();
                    }
                  } catch (err: any) {
                    setImportError(err?.response?.data?.error?.message || 'Failed to import trial balance.');
                  } finally {
                    setImporting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Import & Continue into {importTargetYear}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
