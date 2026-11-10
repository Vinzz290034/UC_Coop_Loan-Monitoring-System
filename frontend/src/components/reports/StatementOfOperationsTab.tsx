'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Scale,
  Eye,
  EyeOff,
  Search,
  X,
  ExternalLink,
  FileText,
  CreditCard
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types (shape returned by GET /reports/statement-of-operations)
// ---------------------------------------------------------------------------
export interface SooTransaction {
  date: string;
  month?: number | null;
  year?: number | null;
  payee: string;
  particulars?: string;
  voucher_no?: string | null;
  voucher_id?: string | null;
  or_no?: string | null;
  lf_no?: string | null;
  source?: 'check_voucher' | 'revolving_fund' | 'collection' | 'disbursement' | string;
  amount: number;
}

interface SooLine {
  code: string;
  title: string;
  description: string;
  always_show: boolean;
  current: number[];
  previous: number[];
  transactions?: SooTransaction[];
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

const HighlightText = ({ text, query }: { text?: string; query: string }) => {
  if (!text) return null;
  if (!query) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-emerald-200 dark:bg-emerald-800 text-emerald-950 dark:text-emerald-100 rounded-xs px-0.5 font-bold"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

type SelectedPeriod = number | 'ytd';

interface Props {
  initialYear: number;
  initialMonth: number; // 1-12
}

export default function StatementOfOperationsTab({ initialYear, initialMonth }: Props) {
  const [year, setYear] = useState<number>(initialYear);
  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod>('ytd');
  const [data, setData] = useState<SooResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // The system's active operating fiscal year is 2026, and operations run through November (month index 10).
  const ytdEndMonthIdx = useMemo(() => {
    if (year === 2026) return 10; // November
    if (year < 2026) return 11; // December for completed past years
    return 10;
  }, [year]);

  // Disable upcoming months (e.g. December) until that month actually arrives on the 1st
  const isMonthDisabled = useCallback((mIdx: number) => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0 = Jan, 10 = Nov, 11 = Dec

    if (year > curYear) return true;
    if (year === curYear) return mIdx > curMonth;
    if (year === 2026 && mIdx > 10 && (curYear < 2026 || (curYear === 2026 && curMonth < 11))) {
      return true;
    }
    return false;
  }, [year]);

  // Safeguard: if a disabled month is selected, automatically switch back to YTD
  useEffect(() => {
    if (typeof selectedPeriod === 'number' && isMonthDisabled(selectedPeriod)) {
      setSelectedPeriod('ytd');
    }
  }, [selectedPeriod, isMonthDisabled]);

  const router = useRouter();
  const [selectedLineModal, setSelectedLineModal] = useState<SooLine | null>(null);
  const [lineModalSearch, setLineModalSearch] = useState('');
  const [lineModalMonthFilter, setLineModalMonthFilter] = useState<number | 'all'>('all');

  const closeLineModal = useCallback(() => {
    setSelectedLineModal(null);
    setLineModalSearch('');
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedLineModal) {
        closeLineModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLineModal, closeLineModal]);

  const lineModalTransactions = useMemo(() => {
    if (!selectedLineModal) return [];
    let list = selectedLineModal.transactions || [];

    // Filter by month
    if (lineModalMonthFilter !== 'all') {
      const targetMonthNum = lineModalMonthFilter + 1; // 1-12
      list = list.filter(t => {
        if (t.month) return t.month === targetMonthNum;
        if (t.date && t.date !== 'N/A') {
          return Number(t.date.slice(5, 7)) === targetMonthNum;
        }
        return false;
      });
    }

    // Filter by search query
    if (lineModalSearch.trim()) {
      const qModal = lineModalSearch.toLowerCase().trim();
      list = list.filter(t =>
        String(t.payee || '').toLowerCase().includes(qModal) ||
        String(t.particulars || '').toLowerCase().includes(qModal) ||
        String(t.voucher_no || '').toLowerCase().includes(qModal) ||
        String(t.or_no || '').toLowerCase().includes(qModal) ||
        String(t.lf_no || '').toLowerCase().includes(qModal) ||
        String(t.date || '').toLowerCase().includes(qModal) ||
        String(t.amount || '').includes(qModal)
      );
    }

    return list;
  }, [selectedLineModal, lineModalMonthFilter, lineModalSearch]);

  const modalPeriodTotal = useMemo(() => {
    if (!selectedLineModal) return 0;
    if (lineModalMonthFilter === 'all') {
      return (selectedLineModal.current || []).reduce((a, b) => a + (b || 0), 0);
    }
    return (selectedLineModal.current || [])[lineModalMonthFilter] || 0;
  }, [selectedLineModal, lineModalMonthFilter]);

  const modalFilteredTotal = useMemo(() => {
    return lineModalTransactions.reduce((acc, t) => acc + (parseFloat(String(t.amount)) || 0), 0);
  }, [lineModalTransactions]);

  const handleOpenTransaction = useCallback((t: SooTransaction) => {
    const isCheckVoucher = Boolean(
      (t.voucher_no && t.voucher_no !== '—' && !t.voucher_no.startsWith('LF') && !t.voucher_no.includes('Liquidation')) ||
      t.voucher_id
    );
    const isRevolvingFund = Boolean(
      !isCheckVoucher && (t.lf_no || (t.voucher_no && (t.voucher_no.startsWith('LF') || t.voucher_no.includes('Liquidation'))))
    );

    if (isCheckVoucher) {
      const params = new URLSearchParams();
      params.set('tab', 'summary');
      if (t.voucher_no && !t.voucher_no.startsWith('LF') && !t.voucher_no.includes('Liquidation')) {
        params.set('voucher', t.voucher_no);
      }
      if (t.voucher_id) params.set('id', t.voucher_id);
      params.set('fromReport', 'statement_of_operations');
      params.set('year', String(year));
      router.push(`/dashboard/disbursement?${params.toString()}`);
      return;
    }

    if (isRevolvingFund) {
      const params = new URLSearchParams();
      params.set('tab', 'revolving_fund_replenishment');
      if (t.lf_no) params.set('search', t.lf_no);
      params.set('fromReport', 'statement_of_operations');
      params.set('year', String(year));
      router.push(`/dashboard/disbursement?${params.toString()}`);
      return;
    }

    // Default: Cashier Collection OR Loan Repayment
    if (t.or_no || t.source === 'collection') {
      const searchVal = t.or_no || t.payee;
      router.push(`/dashboard/collection?search=${encodeURIComponent(searchVal)}`);
      return;
    }

    // Fallback: loans tracker
    if (t.payee) {
      router.push(`/dashboard/loans?tab=loans&search=${encodeURIComponent(t.payee)}`);
    }
  }, [router, year]);

  const isYtd = selectedPeriod === 'ytd';
  const q = searchQuery.toLowerCase().trim();

  const doesLineMatch = useCallback((l: SooLine) => {
    if (!q) return true;
    return (
      l.title.toLowerCase().includes(q) ||
      (l.description && l.description.toLowerCase().includes(q))
    );
  }, [q]);

  const monthHasActivity = useCallback((mIdx: number) => {
    if (!data) return false;
    if (year === 2026 && mIdx > 10) return false;
    const inSections = (sections: SooSection[]) =>
      sections.some(s =>
        s.groups.some(g =>
          g.lines.some(l => Math.abs((l.current || [])[mIdx] || 0) > 0.004)
        )
      );
    return inSections(data.statement.revenues) || inSections(data.statement.expenses);
  }, [data, year]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    };
    if (isYearDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isYearDropdownOpen]);

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
    const endIdx = isYtd ? ytdEndMonthIdx : (selectedPeriod as number);
    const sumTo = (arr: number[]) => (arr || []).slice(0, endIdx + 1).reduce((a, b) => a + (b || 0), 0);
    const ytd = sumTo(line.current || []);
    const lastYtd = sumTo(line.previous || []);
    const thisMonthVal = isYtd ? ytd : ((line.current || [])[selectedPeriod as number] || 0);
    return {
      thisMonth: thisMonthVal,
      ytd,
      lastYtd,
      variance: ytd - lastYtd
    };
  }, [isYtd, ytdEndMonthIdx, selectedPeriod]);

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

  const isLineVisible = useCallback((l: SooLine, ignoreSearch = false) => {
    if (!ignoreSearch && q && !doesLineMatch(l)) return false;
    const f = lineFigures(l);
    const hasValue = Math.abs(f.thisMonth) > 0.004 || Math.abs(f.ytd) > 0.004 || Math.abs(f.lastYtd) > 0.004;
    if (hasValue) return true;
    if (hideEmpty) return false;
    if (!ignoreSearch && q) return true;
    return l.always_show;
  }, [q, doesLineMatch, lineFigures, hideEmpty]);

  const matchCount = useMemo(() => {
    if (!q || !data) return 0;
    let count = 0;
    const countInSections = (sections: SooSection[]) => {
      sections.forEach(s => {
        s.groups.forEach(g => {
          g.lines.forEach(l => {
            if (isLineVisible(l)) count++;
          });
        });
      });
    };
    countInSections(data.statement.revenues);
    countInSections(data.statement.expenses);
    return count;
  }, [q, data, isLineVisible]);

  const hasRevenueMatches = useMemo(() => {
    if (!q || !data) return true;
    return data.statement.revenues.some(s => s.groups.some(g => g.lines.some(l => isLineVisible(l))));
  }, [q, data, isLineVisible]);

  const hasExpenseMatches = useMemo(() => {
    if (!q || !data) return true;
    return data.statement.expenses.some(s => s.groups.some(g => g.lines.some(l => isLineVisible(l))));
  }, [q, data, isLineVisible]);

  const periodEndLabel = useMemo(() => {
    if (isYtd) {
      if (year === 2026) {
        return 'January 1 – November 30, 2026';
      }
      if (year < 2026) {
        return `Full Year ${year} (YTD)`;
      }
      return `January 1 – December 31, ${year}`;
    }
    const mIdx = selectedPeriod as number;
    const lastDay = new Date(year, mIdx + 1, 0).getDate();
    return `${MONTHS[mIdx]} ${lastDay}, ${year}`;
  }, [isYtd, year, selectedPeriod]);

  const toggleSection = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  // ---- Excel export -------------------------------------------------------
  const handleExport = () => {
    if (!data || !totals) return;
    const rows: (string | number)[][] = [
      ['UNIVERSITY OF CEBU-METC MULTIPURPOSE COOPERATIVE'],
      ['STATEMENT OF OPERATIONS'],
      [`For the period ended ${periodEndLabel}`],
      [],
      ['Account Title', isYtd ? 'Full Year Total' : 'This Month', isYtd ? `Full Year ${year}` : 'YTD This Month', isYtd ? `Full Year ${data.previous_year}` : 'YTD Same Month Last Year', 'YTD Variance']
    ];
    const push = (title: string, f: Figures) =>
      rows.push([title, f.thisMonth, f.ytd, f.lastYtd, f.variance]);

    const exportSections = (sections: SooSection[]) => {
      sections.forEach(s => {
        rows.push([s.title.toUpperCase()]);
        s.groups.forEach(g => {
          if (s.groups.length > 1) rows.push([g.title]);
          g.lines.filter(l => isLineVisible(l, true)).forEach(l => push(l.title, lineFigures(l)));
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
    ws['!cols'] = [{ wch: 50 }, { wch: 18 }, { wch: 18 }, { wch: 26 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Statement of Operations');
    const fileName = isYtd
      ? `Statement_of_Operations_Full_Year_${year}.xlsx`
      : `Statement_of_Operations_${MONTHS[selectedPeriod as number]}_${year}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
        <th className="p-2.5 text-right w-32">{isYtd ? 'Full Year Total' : 'This Month'}</th>
        <th className="p-2.5 text-right w-36">{isYtd ? `Full Year ${year}` : 'YTD This Month'}</th>
        <th className="p-2.5 text-right w-40">{isYtd ? `Full Year ${data?.previous_year || year - 1}` : 'YTD Same Month Last Year'}</th>
        <th className="p-2.5 text-right w-36">YTD Variance</th>
      </tr>
    </thead>
  );

  const renderSection = (s: SooSection, isExpense: boolean, number: number) => {
    const isCollapsed = q ? false : !!collapsed[s.key];
    const sf = sectionFigures(s);

    const hasAnyMatchingLine = s.groups.some(g => g.lines.some(l => isLineVisible(l)));
    if (q && !hasAnyMatchingLine) return null;

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
              <div className="text-sm font-black text-neutral-900 dark:text-white">
                <HighlightText text={s.plain_title} query={q} />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                <HighlightText text={s.title} query={q} />
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-xl">{s.description}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 self-end sm:self-auto">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Year to date</div>
              <div className={`text-lg font-black font-mono ${isExpense ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {peso(sf.ytd)}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono">
                {isYtd ? `Full Year: ${peso(sf.ytd)}` : `This month: ${peso(sf.thisMonth)}`}
              </div>
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
                  const visible = g.lines.filter(l => isLineVisible(l));
                  if (visible.length === 0 && (hideEmpty || q)) return null;
                  return (
                    <React.Fragment key={`${s.key}-${gi}`}>
                      {s.groups.length > 1 && (
                        <tr className="bg-neutral-50/60 dark:bg-neutral-800/30">
                          <td colSpan={5} className="px-2.5 pt-3 pb-1.5 text-[11px] font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                            <HighlightText text={g.title} query={q} />
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
                        <tr
                          key={`${s.key}-${gi}-${li}`}
                          onClick={() => {
                            setSelectedLineModal(l);
                            setLineModalSearch('');
                            setLineModalMonthFilter(isYtd ? 'all' : (selectedPeriod as number));
                          }}
                          className="hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 text-neutral-800 dark:text-neutral-200 cursor-pointer group transition-colors"
                          title={`Click to view itemized records and vouchers for ${l.title}`}
                        >
                          <td className="p-2.5">
                            <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white">
                              <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                                <HighlightText text={l.title} query={q} />
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="hidden sm:inline">View Records</span>
                              </span>
                            </div>
                            <div className="text-[10.5px] text-neutral-500 dark:text-neutral-400 print:hidden">
                              <HighlightText text={l.description} query={q} />
                            </div>
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
            {/* Year Selector matching Loan Products Tab format */}
            <div className="flex items-center gap-1 bg-emerald-50/90 dark:bg-emerald-950/60 p-1 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
              <button
                type="button"
                disabled={year <= 2024}
                onClick={() => {
                  if (year > 2024) {
                    setYear(year - 1);
                    setIsYearDropdownOpen(false);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 ${
                  year <= 2024
                    ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                    : 'text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/70 dark:hover:bg-emerald-900/70 cursor-pointer active:scale-95'
                }`}
                title={year <= 2024 ? 'Starts at Year 2024' : `Switch to Previous Year (${year - 1})`}
              >
                <span>‹</span>
                <span className="hidden sm:inline">{Math.max(2024, year - 1)}</span>
              </button>

              <div className="relative" ref={yearDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsYearDropdownOpen(prev => !prev)}
                  className="px-3 py-1 rounded-lg text-xs font-extrabold bg-[#064e3b] hover:bg-emerald-800 text-white cursor-pointer shadow-2xs font-mono inline-flex items-center gap-1.5 transition-all duration-200 active:scale-95"
                >
                  <span>Year {year}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-emerald-300 transition-transform duration-200 ease-out ${
                      isYearDropdownOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>

                {/* Animated Dropdown Menu */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 mt-2 w-36 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/80 shadow-xl py-1.5 z-50 origin-top transition-all duration-200 ease-out ${
                    isYearDropdownOpen
                      ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="px-3 py-1 text-[9.5px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 mb-1">
                    Select Fiscal Year
                  </div>
                  <div className="max-h-56 overflow-y-auto px-1.5 space-y-0.5">
                    {Array.from(new Set([2024, 2025, 2026, 2027, 2028, year, year - 1, year + 1]))
                      .filter(yr => yr >= 2024)
                      .sort((a, b) => a - b)
                      .map((yr: number) => {
                        const isSelectedYear = year === yr;
                        return (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => {
                              setYear(yr);
                              setIsYearDropdownOpen(false);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                              isSelectedYear
                                ? 'bg-[#064e3b] text-white shadow-2xs'
                                : 'text-neutral-700 dark:text-neutral-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-800 dark:hover:text-emerald-300 hover:translate-x-0.5'
                            }`}
                          >
                            <span>Year {yr}</span>
                            {isSelectedYear && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setYear(year + 1);
                  setIsYearDropdownOpen(false);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-extrabold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/70 dark:hover:bg-emerald-900/70 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                title={`Switch to Next Year (${year + 1})`}
              >
                <span className="hidden sm:inline">{year + 1}</span>
                <span>›</span>
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

        {/* Step 1: choose a month or Full Year (YTD) */}
        <div className="print:hidden">
          <div className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 mb-1.5">
            Step 1 — Filter by month or Full Year (YTD):
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedPeriod('ytd')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isYtd
                  ? 'bg-[#064e3b] text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
              }`}
            >
              <span>Full Year (YTD)</span>
            </button>
            {MONTHS_SHORT.map((m, idx) => {
              const isSelected = selectedPeriod === idx;
              const hasActivity = monthHasActivity(idx);
              const disabled = isMonthDisabled(idx);
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setSelectedPeriod(idx)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    disabled
                      ? 'opacity-30 bg-neutral-100 dark:bg-neutral-800/40 text-neutral-400 dark:text-neutral-600 cursor-not-allowed border border-transparent select-none'
                      : isSelected
                      ? 'bg-[#064e3b] text-white shadow-xs cursor-pointer'
                      : hasActivity
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70 hover:bg-emerald-100/80 cursor-pointer'
                      : 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer'
                  }`}
                  title={disabled ? `${MONTHS[idx]} ${year} is disabled until ${MONTHS[idx]} 1, ${year}` : `View ${MONTHS[idx]} ${year}`}
                >
                  <span>{m}</span>
                  {!disabled && hasActivity && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-emerald-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Options */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search account or line item (e.g. Salary, CLIMBS, Fines, Taxes)..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 focus:border-emerald-500 focus:bg-white dark:focus:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 transition-all outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {searchQuery.trim() && (
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5 rounded-xl">
                {matchCount} {matchCount === 1 ? 'account match' : 'account matches'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setHideEmpty(v => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              {hideEmpty ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {hideEmpty ? 'Show all accounts' : 'Hide accounts with no amount'}
            </button>
          </div>
        </div>
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
              {isYtd ? (
                <>
                  From January to {MONTHS[ytdEndMonthIdx]} <b>{year}</b> (YTD), the cooperative earned <b>{peso(totals.revenue.ytd)}</b> and spent{' '}
                  <b>{peso(totals.expenses.ytd)}</b>. That leaves a{' '}
                  <b className={totals.net.ytd >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                    {totals.net.ytd >= 0 ? 'surplus (extra money)' : 'deficit (shortage)'} of {peso(Math.abs(totals.net.ytd))}
                  </b>.
                </>
              ) : (
                <>
                  From January to {MONTHS[selectedPeriod as number]} {year}, the cooperative earned <b>{peso(totals.revenue.ytd)}</b> and spent{' '}
                  <b>{peso(totals.expenses.ytd)}</b>. That leaves a{' '}
                  <b className={totals.net.ytd >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                    {totals.net.ytd >= 0 ? 'surplus (extra money)' : 'deficit (shortage)'} of {peso(Math.abs(totals.net.ytd))}
                  </b>.
                  {' '}For {MONTHS[selectedPeriod as number]} alone, the result is{' '}
                  <b>{totals.net.thisMonth >= 0 ? '' : '−'}{peso(Math.abs(totals.net.thisMonth))}</b>.
                </>
              )}
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
                  <div className="text-[10.5px] text-neutral-500">
                    {isYtd ? `Full Year ${year} (YTD)` : `Year to date (Jan – ${MONTHS_SHORT[selectedPeriod as number]} ${year})`}
                  </div>
                  <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="text-neutral-400">{isYtd ? 'Annual' : 'This month'}</div>
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
          {hasRevenueMatches && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider">Part A</span>
                <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">Revenues — Money Coming In</h3>
              </div>
              {data.statement.revenues.map((s, i) => renderSection(s, false, i + 1))}
              {!q && <TotalRow label="TOTAL: REVENUES" f={totals.revenue} tone="green" />}
            </div>
          )}

          {/* ================= EXPENSES ================= */}
          {hasExpenseMatches && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider">Part B</span>
                <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">Expenses — Money Going Out</h3>
              </div>
              {data.statement.expenses.map((s, i) => renderSection(s, true, i + 1))}
              {!q && <TotalRow label="TOTAL: EXPENSES" f={totals.expenses} tone="amber" isExpense />}
            </div>
          )}

          {/* ================= NET SURPLUS ================= */}
          {!q && (
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
          )}

          {/* ================= No matches state ================= */}
          {q && matchCount === 0 && (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <Search className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                No accounts or line items match &ldquo;{searchQuery}&rdquo;
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Try searching for a different loan product, expense, or income category.
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* ================= Transaction Breakdown Modal ================= */}
      {selectedLineModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-neutral-900 border border-emerald-400/90 dark:border-emerald-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-3 bg-emerald-50/70 dark:bg-emerald-950/40 shrink-0">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                      Account Ledger Breakdown
                    </span>
                    <span className="text-[10.5px] font-bold text-neutral-500 font-mono">
                      Fiscal Year {year}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white mt-1">
                    {selectedLineModal.title}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-xl">
                    {selectedLineModal.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeLineModal}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white text-base font-bold transition-colors cursor-pointer shrink-0"
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Top Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* 1. Origin / System Link */}
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Source Module</div>
                  <div className="font-bold text-neutral-900 dark:text-white mt-1 flex items-center gap-1.5">
                    {selectedLineModal.title.includes('Interest') || selectedLineModal.title.includes('Fines') ? (
                      <>
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Loan Credit Operations</span>
                      </>
                    ) : selectedLineModal.transactions?.some(t => t.source === 'check_voucher' || t.voucher_no) ? (
                      <>
                        <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Disbursements & Check Vouchers</span>
                      </>
                    ) : (
                      <>
                        <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Cashier Collections</span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    Click any transaction row below to navigate directly to its voucher or collection record.
                  </div>
                </div>

                {/* 2. Amount in Period */}
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold tracking-wider">
                    {lineModalMonthFilter === 'all' ? `Full Year ${year} (YTD)` : `${MONTHS_SHORT[lineModalMonthFilter]} ${year} Amount`}
                  </div>
                  <div className="font-mono font-black text-lg text-emerald-900 dark:text-emerald-200 mt-0.5">
                    {peso(modalPeriodTotal)}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                    {modalFilteredTotal !== modalPeriodTotal ? (
                      <span>Filtered sum: {peso(modalFilteredTotal)}</span>
                    ) : (
                      <span>Official Statement figure</span>
                    )}
                  </div>
                </div>

                {/* 3. Record Count */}
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Transaction Count</div>
                  <div className="font-mono font-black text-lg text-neutral-900 dark:text-white mt-0.5">
                    {lineModalTransactions.length} {lineModalTransactions.length === 1 ? 'record' : 'records'}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    {selectedLineModal.transactions?.length || 0} total recorded in {year}
                  </div>
                </div>
              </div>

              {/* Month Filter Selector & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search payee, particulars, voucher #, or OR #..."
                    value={lineModalSearch}
                    onChange={(e) => setLineModalSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  {lineModalSearch && (
                    <button
                      type="button"
                      onClick={() => setLineModalSearch('')}
                      className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Month Toggle Pills */}
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-x-auto text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setLineModalMonthFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      lineModalMonthFilter === 'all'
                        ? 'bg-[#064e3b] text-white shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-300 hover:text-emerald-700'
                    }`}
                  >
                    All Year
                  </button>
                  {MONTHS_SHORT.map((m, idx) => {
                    const disabled = isMonthDisabled(idx);
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={disabled}
                        onClick={() => !disabled && setLineModalMonthFilter(idx)}
                        className={`px-2 py-1 rounded-lg transition-all whitespace-nowrap ${
                          disabled
                            ? 'opacity-30 cursor-not-allowed text-neutral-400 select-none'
                            : lineModalMonthFilter === idx
                            ? 'bg-[#064e3b] text-white shadow-xs cursor-pointer'
                            : 'text-neutral-600 dark:text-neutral-300 hover:text-emerald-700 cursor-pointer'
                        }`}
                        title={disabled ? `Disabled until ${MONTHS[idx]} 1, ${year}` : undefined}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Itemized Table */}
              <div className="flex-1 flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden min-h-[200px] max-h-[380px]">
                <div className="px-3 py-2 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <span>Underlying Transactions ({lineModalTransactions.length})</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 hidden sm:inline">
                    Click any row or &quot;Open Voucher&quot; to inspect in Disbursement / Collection
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] sticky top-0 z-10 shadow-xs">
                      <tr>
                        <th className="p-2 w-10 text-center border-r border-emerald-700/60">#</th>
                        <th className="p-2 w-24 border-r border-emerald-700/60">Date</th>
                        <th className="p-2 w-32 border-r border-emerald-700/60">Voucher / Ref #</th>
                        <th className="p-2 min-w-[170px] border-r border-emerald-700/60">Payee / Member</th>
                        <th className="p-2 min-w-[200px] border-r border-emerald-700/60">Particulars / Details</th>
                        <th className="p-2 w-28 text-right border-r border-emerald-700/60">Amount (₱)</th>
                        <th className="p-2 w-32 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {lineModalTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-neutral-400 italic">
                            No transactions recorded for this period.
                          </td>
                        </tr>
                      ) : (
                        lineModalTransactions.map((t, idx) => {
                          const hasVoucher = Boolean(
                            (t.voucher_no && t.voucher_no !== '—' && !t.voucher_no.startsWith('LF') && !t.voucher_no.includes('Liquidation')) ||
                            t.voucher_id
                          );
                          const isLf = Boolean(t.lf_no || (t.voucher_no && (t.voucher_no.startsWith('LF') || t.voucher_no.includes('Liquidation'))));
                          const hasOr = Boolean(t.or_no && t.or_no !== '—');

                          const displayRef = t.voucher_no
                            ? (t.voucher_no.startsWith('CV') || t.voucher_no.startsWith('LF') ? t.voucher_no : `CV ${t.voucher_no}`)
                            : t.lf_no
                            ? `LF #${t.lf_no}`
                            : hasOr
                            ? `OR #${t.or_no}`
                            : '—';

                          return (
                            <tr
                              key={idx}
                              onClick={() => handleOpenTransaction(t)}
                              className="hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer group"
                              title={
                                hasVoucher
                                  ? `Click to open Check Voucher #${t.voucher_no} in Disbursement`
                                  : isLf
                                  ? `Click to view Revolving Fund Liquidation in Disbursement`
                                  : hasOr
                                  ? `Click to view Receipt #${t.or_no} in Collections`
                                  : 'Click to open details'
                              }
                            >
                              <td className="p-2 text-center font-mono text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                                {idx + 1}
                              </td>
                              <td className="p-2 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                                {t.date}
                              </td>
                              <td className="p-2 font-mono font-bold text-neutral-800 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${
                                  hasVoucher
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : isLf
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : hasOr
                                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                                }`}>
                                  {displayRef}
                                </span>
                              </td>
                              <td className="p-2 font-semibold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                                <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                                  {t.payee || '—'}
                                </span>
                              </td>
                              <td className="p-2 text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                                {t.particulars || '—'}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                                {peso(t.amount)}
                              </td>
                              <td className="p-2 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenTransaction(t);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{hasVoucher ? 'Open Voucher' : isLf ? 'Open RF' : hasOr ? 'Open Receipt' : 'Open'}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {lineModalTransactions.length > 0 && (
                      <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-bold border-t border-neutral-300 dark:border-neutral-700 sticky bottom-0 z-10 shadow-xs">
                        <tr>
                          <td colSpan={5} className="p-2 text-right uppercase text-[10px] text-neutral-600 dark:text-neutral-400">
                            Total Filtered Amount:
                          </td>
                          <td className="p-2 text-right font-mono text-emerald-800 dark:text-emerald-400 font-black">
                            {peso(modalFilteredTotal)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/60 shrink-0">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Showing <b>{lineModalTransactions.length}</b> of <b>{selectedLineModal.transactions?.length || 0}</b> transactions
              </span>
              <button
                type="button"
                onClick={closeLineModal}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

