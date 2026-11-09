'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Scale,
  Eye,
  EyeOff
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types (shape returned by GET /reports/statement-of-operations)
// ---------------------------------------------------------------------------
interface SooLine {
  code: string;
  title: string;
  description: string;
  always_show: boolean;
  current: number[];
  previous: number[];
}

interface SooGroup {
  title: string;
  total_label: string | null;
  lines: SooLine[];
}

interface SooSection {
  key: string;
  title: string;
  plain_title: string;
  description: string;
  total_label: string;
  groups: SooGroup[];
}

interface SooResponse {
  year: number;
  previous_year: number;
  statement: {
    revenues: SooSection[];
    expenses: SooSection[];
  };
}

// The 4 columns of the official statement
interface Figures {
  thisMonth: number;
  ytd: number;
  lastYtd: number;
  variance: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const emptyFigures = (): Figures => ({ thisMonth: 0, ytd: 0, lastYtd: 0, variance: 0 });

const addFigures = (a: Figures, b: Figures): Figures => ({
  thisMonth: a.thisMonth + b.thisMonth,
  ytd: a.ytd + b.ytd,
  lastYtd: a.lastYtd + b.lastYtd,
  variance: a.variance + b.variance
});

const subFigures = (a: Figures, b: Figures): Figures => ({
  thisMonth: a.thisMonth - b.thisMonth,
  ytd: a.ytd - b.ytd,
  lastYtd: a.lastYtd - b.lastYtd,
  variance: a.variance - b.variance
});

const peso = (n: number) =>
  `₱${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const plain = (n: number) =>
  (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  initialYear: number;
  initialMonth: number; // 1-12
}

export default function StatementOfOperationsTab({ initialYear, initialMonth }: Props) {
  const [year, setYear] = useState<number>(initialYear);
  const [monthIdx, setMonthIdx] = useState<number>(Math.min(Math.max(initialMonth - 1, 0), 11));
  const [data, setData] = useState<SooResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reports/statement-of-operations', { params: { year } });
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load Statement of Operations:', err);
      setError(err.response?.data?.message || 'Failed to load the Statement of Operations.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Figure calculators -------------------------------------------------
  const lineFigures = useCallback((line: SooLine): Figures => {
    const sumTo = (arr: number[]) => arr.slice(0, monthIdx + 1).reduce((a, b) => a + (b || 0), 0);
    const ytd = sumTo(line.current || []);
    const lastYtd = sumTo(line.previous || []);
    return {
      thisMonth: (line.current || [])[monthIdx] || 0,
      ytd,
      lastYtd,
      variance: ytd - lastYtd
    };
  }, [monthIdx]);

  const groupFigures = useCallback((g: SooGroup) =>
    g.lines.reduce((acc, l) => addFigures(acc, lineFigures(l)), emptyFigures()), [lineFigures]);

  const sectionFigures = useCallback((s: SooSection) =>
    s.groups.reduce((acc, g) => addFigures(acc, groupFigures(g)), emptyFigures()), [groupFigures]);

  const totals = useMemo(() => {
    if (!data) return null;
    const revenue = data.statement.revenues.reduce((acc, s) => addFigures(acc, sectionFigures(s)), emptyFigures());
    const expenses = data.statement.expenses.reduce((acc, s) => addFigures(acc, sectionFigures(s)), emptyFigures());
    return { revenue, expenses, net: subFigures(revenue, expenses) };
  }, [data, sectionFigures]);

  const isLineVisible = (l: SooLine) => {
    const f = lineFigures(l);
    const hasValue = Math.abs(f.thisMonth) > 0.004 || Math.abs(f.ytd) > 0.004 || Math.abs(f.lastYtd) > 0.004;
    if (hasValue) return true;
    if (hideEmpty) return false;
    return l.always_show;
  };

  const periodEndLabel = useMemo(() => {
    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
    return `${MONTHS[monthIdx]} ${lastDay}, ${year}`;
  }, [year, monthIdx]);

  const toggleSection = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  // ---- Excel export -------------------------------------------------------
  const handleExport = () => {
    if (!data || !totals) return;
    const rows: (string | number)[][] = [
      ['UNIVERSITY OF CEBU-METC MULTIPURPOSE COOPERATIVE'],
      ['STATEMENT OF OPERATIONS'],
      [`For the period ended ${periodEndLabel}`],
      [],
      ['Account Title', 'This Month', 'YTD This Month', 'YTD Same Month Last Year', 'YTD Variance']
    ];
    const push = (title: string, f: Figures) =>
      rows.push([title, f.thisMonth, f.ytd, f.lastYtd, f.variance]);

    const exportSections = (sections: SooSection[]) => {
      sections.forEach(s => {
        rows.push([s.title.toUpperCase()]);
        s.groups.forEach(g => {
          if (s.groups.length > 1) rows.push([g.title]);
          g.lines.filter(isLineVisible).forEach(l => push(l.title, lineFigures(l)));
          if (g.total_label) push(g.total_label, groupFigures(g));
        });
        push(s.total_label, sectionFigures(s));
        rows.push([]);
      });
    };

    rows.push(['REVENUES']);
    exportSections(data.statement.revenues);
    push('TOTAL: REVENUES', totals.revenue);
    rows.push([]);
    rows.push(['EXPENSES']);
    exportSections(data.statement.expenses);
    push('TOTAL: EXPENSES', totals.expenses);
    rows.push([]);
    push('NET SURPLUS BEFORE OTHER ITEMS', totals.net);
    push('TOTAL NET SURPLUS', totals.net);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 50 }, { wch: 16 }, { wch: 16 }, { wch: 24 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Statement of Operations');
    XLSX.writeFile(wb, `Statement_of_Operations_${MONTHS[monthIdx]}_${year}.xlsx`);
  };

  // ---- Small render helpers ----------------------------------------------
  const VarianceCell = ({ value, isExpense, bold }: { value: number; isExpense?: boolean; bold?: boolean }) => {
    if (Math.abs(value) < 0.005) {
      return <span className="text-neutral-400">{plain(0)}</span>;
    }
    // For income, going up is good. For expenses, going up is a warning.
    const good = isExpense ? value < 0 : value > 0;
    const Icon = value > 0 ? TrendingUp : TrendingDown;
    return (
      <span className={`inline-flex items-center justify-end gap-1 ${bold ? 'font-black' : 'font-semibold'} ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        <Icon className="w-3 h-3 shrink-0" />
        {value > 0 ? '+' : '−'}{plain(Math.abs(value))}
      </span>
    );
  };

  const FigureCells = ({ f, isExpense, bold }: { f: Figures; isExpense?: boolean; bold?: boolean }) => (
    <>
      <td className={`p-2.5 text-right font-mono ${bold ? 'font-black' : ''}`}>{plain(f.thisMonth)}</td>
      <td className={`p-2.5 text-right font-mono ${bold ? 'font-black' : 'font-semibold'}`}>{plain(f.ytd)}</td>
      <td className={`p-2.5 text-right font-mono text-neutral-500 dark:text-neutral-400 ${bold ? 'font-black' : ''}`}>{plain(f.lastYtd)}</td>
      <td className="p-2.5 text-right font-mono"><VarianceCell value={f.variance} isExpense={isExpense} bold={bold} /></td>
    </>
  );

  const TableHead = () => (
    <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-bold">
      <tr>
        <th className="p-2.5 text-left min-w-[280px]">Account Title</th>
        <th className="p-2.5 text-right w-32">This Month</th>
        <th className="p-2.5 text-right w-36">YTD This Month</th>
        <th className="p-2.5 text-right w-40">YTD Same Month Last Year</th>
        <th className="p-2.5 text-right w-36">YTD Variance</th>
      </tr>
    </thead>
  );

  const renderSection = (s: SooSection, isExpense: boolean, number: number) => {
    const sf = sectionFigures(s);
    const isCollapsed = !!collapsed[s.key];
    const accent = isExpense
      ? 'border-amber-300 dark:border-amber-800/70'
      : 'border-emerald-300 dark:border-emerald-800/80';
    const badge = isExpense
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300';

    return (
      <div key={s.key} className={`rounded-2xl border ${accent} bg-white dark:bg-neutral-900 overflow-hidden shadow-2xs print:shadow-none print:break-inside-avoid`}>
        {/* Section header (click to open / close) */}
        <button
          type="button"
          onClick={() => toggleSection(s.key)}
          className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <span className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-sm font-black ${badge}`}>
              {number}
            </span>
            <div>
              <div className="text-sm font-black text-neutral-900 dark:text-white">{s.plain_title}</div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{s.title}</div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-xl">{s.description}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 self-end sm:self-auto">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Year to date</div>
              <div className={`text-lg font-black font-mono ${isExpense ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {peso(sf.ytd)}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono">This month: {peso(sf.thisMonth)}</div>
            </div>
            <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform print:hidden ${isCollapsed ? '' : 'rotate-180'}`} />
          </div>
        </button>

        {!isCollapsed && (
          <div className="overflow-x-auto border-t border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-xs border-collapse">
              <TableHead />
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {s.groups.map((g, gi) => {
                  const visible = g.lines.filter(isLineVisible);
                  if (visible.length === 0 && hideEmpty) return null;
                  return (
                    <React.Fragment key={`${s.key}-${gi}`}>
                      {s.groups.length > 1 && (
                        <tr className="bg-neutral-50/60 dark:bg-neutral-800/30">
                          <td colSpan={5} className="px-2.5 pt-3 pb-1.5 text-[11px] font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                            {g.title}
                          </td>
                        </tr>
                      )}
                      {visible.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-3 text-center text-[11px] text-neutral-400 italic">
                            No amounts recorded yet.
                          </td>
                        </tr>
                      ) : visible.map((l, li) => (
                        <tr key={`${s.key}-${gi}-${li}`} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 text-neutral-800 dark:text-neutral-200">
                          <td className="p-2.5">
                            <div className="font-semibold text-neutral-900 dark:text-white">{l.title}</div>
                            <div className="text-[10.5px] text-neutral-500 dark:text-neutral-400 print:hidden">{l.description}</div>
                          </td>
                          <FigureCells f={lineFigures(l)} isExpense={isExpense} />
                        </tr>
                      ))}
                      {g.total_label && visible.length > 0 && (
                        <tr className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-900 dark:text-white border-t border-neutral-300 dark:border-neutral-700">
                          <td className="p-2.5 text-[11px] font-bold uppercase tracking-wide">{g.total_label}</td>
                          <FigureCells f={groupFigures(g)} isExpense={isExpense} bold />
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={`${isExpense ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/40'} text-neutral-900 dark:text-white border-t-2 ${isExpense ? 'border-amber-500' : 'border-emerald-600'}`}>
                  <td className="p-2.5 text-[11px] font-black uppercase tracking-wide">{s.total_label}</td>
                  <FigureCells f={sf} isExpense={isExpense} bold />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  const TotalRow = ({ label, f, tone, isExpense }: { label: string; f: Figures; tone: 'green' | 'amber' | 'dark'; isExpense?: boolean }) => {
    const toneClass =
      tone === 'green'
        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
        : tone === 'amber'
        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
        : 'bg-[#064e3b] text-white border-emerald-900';
    const isDark = tone === 'dark';
    return (
      <div className={`rounded-2xl border overflow-x-auto ${toneClass}`}>
        <table className="w-full text-xs">
          <tbody>
            <tr className={isDark ? 'text-white' : 'text-neutral-900 dark:text-white'}>
              <td className="p-3 min-w-[280px] text-xs font-black uppercase tracking-wider">{label}</td>
              <td className="p-3 w-32 text-right font-mono font-black">{plain(f.thisMonth)}</td>
              <td className="p-3 w-36 text-right font-mono font-black">{plain(f.ytd)}</td>
              <td className={`p-3 w-40 text-right font-mono font-bold ${isDark ? 'text-emerald-200' : 'text-neutral-500'}`}>{plain(f.lastYtd)}</td>
              <td className="p-3 w-36 text-right font-mono">
                {isDark ? (
                  <span className="font-black">{f.variance > 0 ? '+' : f.variance < 0 ? '−' : ''}{plain(Math.abs(f.variance))}</span>
                ) : (
                  <VarianceCell value={f.variance} isExpense={isExpense} bold />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // ---- Render -------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* ================= Header & period picker ================= */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs space-y-4 print:border-0 print:shadow-none">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              University of Cebu-METC Multipurpose Cooperative
            </div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white">Statement of Operations</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              For the period ended <span className="font-bold text-neutral-800 dark:text-neutral-200">{periodEndLabel}</span>
              {' '}— shows how much the cooperative <b>earned</b>, how much it <b>spent</b>, and what was <b>left over</b>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Year stepper */}
            <div className="flex items-center rounded-xl border border-emerald-300 dark:border-emerald-800 overflow-hidden text-xs font-bold">
              <button
                type="button"
                onClick={() => setYear(y => y - 1)}
                className="px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 cursor-pointer"
                title="Previous year"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 bg-emerald-700 text-white font-mono">Year {year}</span>
              <button
                type="button"
                onClick={() => setYear(y => y + 1)}
                className="px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 cursor-pointer"
                title="Next year"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!data}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        {/* Step 1: choose a month */}
        <div className="print:hidden">
          <div className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 mb-1.5">
            Step 1 — Pick the month you want to see:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MONTHS_SHORT.map((m, idx) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonthIdx(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  monthIdx === idx
                    ? 'bg-[#064e3b] text-white shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setShowGuide(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-900 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            {showGuide ? 'Hide guide' : 'How do I read this report?'}
          </button>
          <button
            type="button"
            onClick={() => setHideEmpty(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
          >
            {hideEmpty ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {hideEmpty ? 'Show all accounts' : 'Hide accounts with no amount'}
          </button>
        </div>

        {showGuide && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 print:hidden">
            {[
              { t: 'This Month', d: `Only what happened in ${MONTHS[monthIdx]} ${year}.` },
              { t: 'YTD This Month', d: `"Year-to-date": everything from January 1 up to the end of ${MONTHS[monthIdx]} ${year}.` },
              { t: 'YTD Same Month Last Year', d: `The same January–${MONTHS[monthIdx]} period, but in ${year - 1}, for comparison.` },
              { t: 'YTD Variance', d: 'The difference between this year and last year. Green = good news, red = needs attention.' }
            ].map(g => (
              <div key={g.t} className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900">
                <div className="text-xs font-black text-sky-900 dark:text-sky-200">{g.t}</div>
                <div className="text-[11px] text-sky-800/80 dark:text-sky-300/80 mt-0.5">{g.d}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="p-12 text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-neutral-500">Preparing the Statement of Operations… this may take a moment.</p>
        </div>
      ) : data && totals ? (
        <div className={`space-y-5 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
          {/* ================= Quick answer ================= */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            totals.net.ytd >= 0
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
          }`}>
            <Scale className={`w-6 h-6 shrink-0 ${totals.net.ytd >= 0 ? 'text-emerald-700' : 'text-rose-700'}`} />
            <div className="text-sm text-neutral-800 dark:text-neutral-200">
              <div className="font-black">In short:</div>
              From January to {MONTHS[monthIdx]} {year}, the cooperative earned <b>{peso(totals.revenue.ytd)}</b> and spent{' '}
              <b>{peso(totals.expenses.ytd)}</b>. That leaves a{' '}
              <b className={totals.net.ytd >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                {totals.net.ytd >= 0 ? 'surplus (extra money)' : 'deficit (shortage)'} of {peso(Math.abs(totals.net.ytd))}
              </b>.
              {' '}For {MONTHS[monthIdx]} alone, the result is{' '}
              <b>{totals.net.thisMonth >= 0 ? '' : '−'}{peso(Math.abs(totals.net.thisMonth))}</b>.
            </div>
          </div>

          {/* ================= Big summary cards ================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Total Income (Revenues)', hint: 'All money earned', f: totals.revenue, icon: Wallet, color: 'text-emerald-700 dark:text-emerald-400', isExpense: false },
              { label: 'Total Expenses', hint: 'All money spent', f: totals.expenses, icon: Receipt, color: 'text-amber-700 dark:text-amber-400', isExpense: true },
              { label: 'Total Net Surplus', hint: 'Income minus expenses', f: totals.net, icon: Scale, color: totals.net.ytd >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400', isExpense: false }
            ].map(c => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300">{c.label}</div>
                      <div className="text-[10.5px] text-neutral-400">{c.hint}</div>
                    </div>
                    <Icon className={`w-5 h-5 ${c.color}`} />
                  </div>
                  <div className={`text-2xl font-black font-mono mt-2 ${c.color}`}>{peso(c.f.ytd)}</div>
                  <div className="text-[10.5px] text-neutral-500">Year to date (Jan – {MONTHS_SHORT[monthIdx]} {year})</div>
                  <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="text-neutral-400">This month</div>
                      <div className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{peso(c.f.thisMonth)}</div>
                    </div>
                    <div>
                      <div className="text-neutral-400">vs. last year</div>
                      <div className="font-mono"><VarianceCell value={c.f.variance} isExpense={c.isExpense} bold /></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================= REVENUES ================= */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider">Part A</span>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">Revenues — Money Coming In</h3>
            </div>
            {data.statement.revenues.map((s, i) => renderSection(s, false, i + 1))}
            <TotalRow label="TOTAL: REVENUES" f={totals.revenue} tone="green" />
          </div>

          {/* ================= EXPENSES ================= */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider">Part B</span>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">Expenses — Money Going Out</h3>
            </div>
            {data.statement.expenses.map((s, i) => renderSection(s, true, i + 1))}
            <TotalRow label="TOTAL: EXPENSES" f={totals.expenses} tone="amber" isExpense />
          </div>

          {/* ================= NET SURPLUS ================= */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#064e3b] text-white text-[11px] font-black uppercase tracking-wider">Part C</span>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">Result — What Is Left Over</h3>
            </div>
            <TotalRow label="Net Surplus Before Other Items" f={totals.net} tone="green" />
            <TotalRow label="TOTAL NET SURPLUS" f={totals.net} tone="dark" />
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Net Surplus = Total Revenues − Total Expenses. A positive amount means the cooperative earned more than it spent.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

