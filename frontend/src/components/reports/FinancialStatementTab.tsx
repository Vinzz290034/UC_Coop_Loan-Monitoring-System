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
  Receipt,
  Scale,
  Eye,
  EyeOff,
  Search,
  X,
  ExternalLink,
  CreditCard,
  Building2,
  Wallet,
  ShieldCheck,
  Layers
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types (matching GET /reports/financial-statement)
// ---------------------------------------------------------------------------
export interface FsTransaction {
  date: string;
  month?: number | null;
  year?: number | null;
  payee: string;
  particulars?: string;
  voucher_no?: string | null;
  voucher_id?: string | null;
  or_no?: string | null;
  source?: 'check_voucher' | 'revolving_fund' | 'collection' | 'share_capital' | string;
  amount: number;
}

export interface FsLine {
  code?: string;
  title: string;
  description: string;
  always_show: boolean;
  is_deduction?: boolean;
  current: number[];
  previous: number[];
  transactions?: FsTransaction[];
}

export interface FsGroup {
  title: string;
  total_label: string | null;
  lines: FsLine[];
}

export interface FsSection {
  key: string;
  title: string;
  total_label: string;
  groups: FsGroup[];
}

export interface FsResponse {
  success: boolean;
  year: number;
  previous_year: number;
  month_labels: string[];
  statement: {
    assets: FsSection[];
    liabilities: FsSection[];
    equity: FsSection[];
  };
}

interface Figures {
  thisMonth: number;
  sameMonthLastYear: number;
  variance: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const emptyFigures = (): Figures => ({ thisMonth: 0, sameMonthLastYear: 0, variance: 0 });

const addFigures = (a: Figures, b: Figures): Figures => ({
  thisMonth: a.thisMonth + b.thisMonth,
  sameMonthLastYear: a.sameMonthLastYear + b.sameMonthLastYear,
  variance: a.variance + b.variance
});

const peso = (n: number) => {
  const isNeg = n < -0.004;
  const absVal = Math.abs(n || 0);
  const formatted = `₱${absVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return isNeg ? `(${formatted})` : formatted;
};

const plain = (n: number) => {
  const isNeg = n < -0.004;
  const absVal = Math.abs(n || 0);
  const formatted = absVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isNeg ? `(${formatted})` : formatted;
};

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

export default function FinancialStatementTab({ initialYear, initialMonth }: Props) {
  const [year, setYear] = useState<number>(initialYear);
  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod>('ytd');
  const [data, setData] = useState<FsResponse | null>(null);
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
  const [selectedLineModal, setSelectedLineModal] = useState<FsLine | null>(null);
  const [lineModalSearch, setLineModalSearch] = useState('');
  const [lineModalMonthFilter, setLineModalMonthFilter] = useState<number | 'all'>('all');

  const closeLineModal = useCallback(() => {
    setSelectedLineModal(null);
    setLineModalSearch('');
    setLineModalMonthFilter('all');
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

  // Navigate to transaction source
  const handleNavigateToSource = useCallback((t: FsTransaction) => {
    if (t.source === 'check_voucher' || t.voucher_no || t.voucher_id) {
      const vNum = t.voucher_no ? encodeURIComponent(t.voucher_no) : '';
      const vId = t.voucher_id ? encodeURIComponent(t.voucher_id) : '';
      router.push(`/dashboard/disbursement?tab=summary&voucher=${vNum || vId}`);
      return;
    }

    if (t.source === 'revolving_fund') {
      router.push(`/dashboard/disbursement?tab=revolving`);
      return;
    }

    if (t.source === 'collection' || t.or_no) {
      const searchVal = t.or_no || t.payee;
      router.push(`/dashboard/collection?search=${encodeURIComponent(searchVal)}`);
      return;
    }

    if (t.source === 'share_capital') {
      router.push(`/dashboard/membership`);
      return;
    }

    if (t.payee) {
      router.push(`/dashboard/loans?tab=loans&search=${encodeURIComponent(t.payee)}`);
    }
  }, [router]);

  const isYtd = selectedPeriod === 'ytd';
  const q = searchQuery.toLowerCase().trim();

  const doesLineMatch = useCallback((l: FsLine) => {
    if (!q) return true;
    return (
      l.title.toLowerCase().includes(q) ||
      (l.description && l.description.toLowerCase().includes(q))
    );
  }, [q]);

  const monthHasActivity = useCallback((mIdx: number) => {
    if (!data) return false;
    if (year === 2026 && mIdx > 10) return false;
    const inSections = (sections: FsSection[]) =>
      sections.some(s =>
        s.groups.some(g =>
          g.lines.some(l => Math.abs((l.current || [])[mIdx] || 0) > 0.004)
        )
      );
    return (
      inSections(data.statement.assets) ||
      inSections(data.statement.liabilities) ||
      inSections(data.statement.equity)
    );
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
      const res = await api.get('/reports/financial-statement', { params: { year } });
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load Balance Sheet:', err);
      setError(err.response?.data?.message || 'Failed to load the Balance Sheet.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Figure calculators -------------------------------------------------
  // Balance sheet accounts represent positions as of the selected period (month m, or full year YTD)
  const lineFigures = useCallback((line: FsLine): Figures => {
    const mIdx = isYtd ? ytdEndMonthIdx : (selectedPeriod as number);
    const thisMonthVal = (line.current || [])[mIdx] || 0;
    const lastYearVal = (line.previous || [])[mIdx] || 0;
    return {
      thisMonth: thisMonthVal,
      sameMonthLastYear: lastYearVal,
      variance: thisMonthVal - lastYearVal
    };
  }, [isYtd, ytdEndMonthIdx, selectedPeriod]);

  const groupFigures = useCallback((g: FsGroup) =>
    g.lines.reduce((acc, l) => addFigures(acc, lineFigures(l)), emptyFigures()), [lineFigures]);

  const sectionFigures = useCallback((s: FsSection) =>
    s.groups.reduce((acc, g) => addFigures(acc, groupFigures(g)), emptyFigures()), [groupFigures]);

  const totals = useMemo(() => {
    if (!data) return null;
    const assets = data.statement.assets.reduce((acc, s) => addFigures(acc, sectionFigures(s)), emptyFigures());
    const liabilities = data.statement.liabilities.reduce((acc, s) => addFigures(acc, sectionFigures(s)), emptyFigures());
    const equity = data.statement.equity.reduce((acc, s) => addFigures(acc, sectionFigures(s)), emptyFigures());
    const liabAndEquity = addFigures(liabilities, equity);
    const balanceVariance = {
      thisMonth: assets.thisMonth - liabAndEquity.thisMonth,
      sameMonthLastYear: assets.sameMonthLastYear - liabAndEquity.sameMonthLastYear,
      variance: assets.variance - liabAndEquity.variance
    };
    return {
      assets,
      liabilities,
      equity,
      liabAndEquity,
      balanceVariance
    };
  }, [data, sectionFigures]);

  const isLineVisible = useCallback((l: FsLine, ignoreSearch = false) => {
    if (!ignoreSearch && q && !doesLineMatch(l)) return false;
    const f = lineFigures(l);
    const hasValue = Math.abs(f.thisMonth) > 0.004 || Math.abs(f.sameMonthLastYear) > 0.004;
    if (hasValue) return true;
    if (hideEmpty) return false;
    if (!ignoreSearch && q) return true;
    return l.always_show;
  }, [q, doesLineMatch, lineFigures, hideEmpty]);

  const matchCount = useMemo(() => {
    if (!q || !data) return 0;
    let count = 0;
    const countInSections = (sections: FsSection[]) => {
      sections.forEach(s => {
        s.groups.forEach(g => {
          g.lines.forEach(l => {
            if (isLineVisible(l)) count++;
          });
        });
      });
    };
    countInSections(data.statement.assets);
    countInSections(data.statement.liabilities);
    countInSections(data.statement.equity);
    return count;
  }, [q, data, isLineVisible]);

  const toggleCollapse = (key: string) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  // Period label for headers
  const periodEndLabel = useMemo(() => {
    if (isYtd) {
      if (year === 2026) {
        return 'November 30, 2026';
      }
      if (year < 2026) {
        return `December 31, ${year}`;
      }
      return `December 31, ${year}`;
    }
    const m = selectedPeriod as number;
    const lastDay = new Date(year, m + 1, 0).getDate();
    return `${MONTHS[m]} ${lastDay}, ${year}`;
  }, [isYtd, selectedPeriod, year]);

  const currentColumnLabel = isYtd ? 'Current Period (YTD)' : 'This Month';
  const previousColumnLabel = isYtd ? 'Same Period Last Year' : 'Same Month Last Year';
  const varianceColumnLabel = isYtd ? 'Variance' : 'TM-SMLY Variance';

  // ---- Excel export -------------------------------------------------------
  const handleExportExcel = () => {
    if (!data) return;

    const rows: Array<Record<string, string | number>> = [];

    const addSectionToRows = (secTitle: string, sections: FsSection[], totalLabel: string, totalFig: Figures) => {
      rows.push({
        'Account Title': `=== ${secTitle.toUpperCase()} ===`,
        [currentColumnLabel]: '',
        [previousColumnLabel]: '',
        [varianceColumnLabel]: ''
      });

      sections.forEach(sec => {
        rows.push({
          'Account Title': `  [${sec.title.toUpperCase()}]`,
          [currentColumnLabel]: '',
          [previousColumnLabel]: '',
          [varianceColumnLabel]: ''
        });

        sec.groups.forEach(g => {
          if (g.title) {
            rows.push({
              'Account Title': `    ${g.title.toUpperCase()}`,
              [currentColumnLabel]: '',
              [previousColumnLabel]: '',
              [varianceColumnLabel]: ''
            });
          }

          g.lines.forEach(l => {
            if (!isLineVisible(l, true)) return;
            const f = lineFigures(l);
            rows.push({
              'Account Title': `      ${l.title}`,
              [currentColumnLabel]: f.thisMonth,
              [previousColumnLabel]: f.sameMonthLastYear,
              [varianceColumnLabel]: f.variance
            });
          });

          if (g.total_label) {
            const gf = groupFigures(g);
            rows.push({
              'Account Title': `    ${g.total_label}`,
              [currentColumnLabel]: gf.thisMonth,
              [previousColumnLabel]: gf.sameMonthLastYear,
              [varianceColumnLabel]: gf.variance
            });
          }
        });

        const sf = sectionFigures(sec);
        rows.push({
          'Account Title': `  ${sec.total_label}`,
          [currentColumnLabel]: sf.thisMonth,
          [previousColumnLabel]: sf.sameMonthLastYear,
          [varianceColumnLabel]: sf.variance
        });
      });

      rows.push({
        'Account Title': totalLabel,
        [currentColumnLabel]: totalFig.thisMonth,
        [previousColumnLabel]: totalFig.sameMonthLastYear,
        [varianceColumnLabel]: totalFig.variance
      });
      rows.push({ 'Account Title': '', [currentColumnLabel]: '', [previousColumnLabel]: '', [varianceColumnLabel]: '' });
    };

    if (totals) {
      addSectionToRows('PART A: ASSETS', data.statement.assets, 'TOTAL : ASSETS', totals.assets);
      addSectionToRows('PART B: LIABILITIES', data.statement.liabilities, 'TOTAL : LIABILITIES', totals.liabilities);
      addSectionToRows('PART C: EQUITY', data.statement.equity, 'TOTAL : EQUITY', totals.equity);

      rows.push({
        'Account Title': 'TOTAL : LIABILITIES & EQUITY',
        [currentColumnLabel]: totals.liabAndEquity.thisMonth,
        [previousColumnLabel]: totals.liabAndEquity.sameMonthLastYear,
        [varianceColumnLabel]: totals.liabAndEquity.variance
      });

      rows.push({
        'Account Title': 'VARIANCE ASSETS VS LIABILITIES',
        [currentColumnLabel]: totals.balanceVariance.thisMonth,
        [previousColumnLabel]: totals.balanceVariance.sameMonthLastYear,
        [varianceColumnLabel]: totals.balanceVariance.variance
      });
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
    const filename = `Coop_Balance_Sheet_${year}_${isYtd ? 'YTD' : MONTHS_SHORT[selectedPeriod as number]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handlePrint = () => {
    window.print();
  };

  // ---- Cell & Row renderers -----------------------------------------------
  const VarianceCell = ({ value, bold = false }: { value: number; bold?: boolean }) => {
    const isZero = Math.abs(value) < 0.005;
    const isPos = value > 0;
    const formatted = plain(Math.abs(value));
    return (
      <span
        className={`font-mono ${bold ? 'font-black' : 'font-semibold'} ${
          isZero
            ? 'text-neutral-400 dark:text-neutral-500'
            : isPos
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-rose-700 dark:text-rose-400'
        }`}
      >
        {isZero ? '—' : isPos ? `+${formatted}` : `(${formatted})`}
      </span>
    );
  };

  const renderLineRow = (line: FsLine, indent: number = 0) => {
    if (!isLineVisible(line)) return null;
    const f = lineFigures(line);
    const hasTxs = (line.transactions && line.transactions.length > 0);

    return (
      <tr
        key={line.title}
        onClick={() => {
          if (hasTxs) {
            setSelectedLineModal(line);
          }
        }}
        className={`group border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors ${
          hasTxs ? 'cursor-pointer' : ''
        }`}
        title={hasTxs ? `Click to inspect ${line.transactions?.length || 0} transaction records for ${line.title}` : undefined}
      >
        <td className="p-3 text-xs text-neutral-800 dark:text-neutral-200">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${indent * 16}px` }}>
            <span className="font-semibold">
              <HighlightText text={line.title} query={searchQuery} />
            </span>
            {line.is_deduction && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
                Less / Contra
              </span>
            )}
            {hasTxs && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <ExternalLink className="w-2.5 h-2.5" />
                <span>{line.transactions?.length} items</span>
              </span>
            )}
          </div>
          {line.description && (
            <p
              className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 line-clamp-1 group-hover:line-clamp-none transition-all"
              style={{ paddingLeft: `${indent * 16}px` }}
            >
              <HighlightText text={line.description} query={searchQuery} />
            </p>
          )}
        </td>
        <td className="p-3 text-right font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 w-44">
          {plain(f.thisMonth)}
        </td>
        <td className="p-3 text-right font-mono text-xs text-neutral-500 dark:text-neutral-400 w-44">
          {plain(f.sameMonthLastYear)}
        </td>
        <td className="p-3 text-right font-mono text-xs w-44">
          <VarianceCell value={f.variance} />
        </td>
      </tr>
    );
  };

  const renderGroup = (group: FsGroup, groupKey: string) => {
    const visibleLines = group.lines.filter(l => isLineVisible(l));
    if (visibleLines.length === 0 && !group.lines.some(l => l.always_show)) return null;

    const isGroupCollapsed = collapsed[groupKey];
    const gf = groupFigures(group);

    return (
      <React.Fragment key={groupKey}>
        {group.title && (
          <tr className="bg-neutral-50/70 dark:bg-neutral-800/40 border-y border-neutral-200/60 dark:border-neutral-700/60">
            <td colSpan={4} className="p-2.5 pl-6 text-[11px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              <button
                type="button"
                onClick={() => toggleCollapse(groupKey)}
                className="inline-flex items-center gap-1.5 hover:text-emerald-700 dark:hover:text-emerald-200 cursor-pointer"
              >
                {isGroupCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>{group.title}</span>
              </button>
            </td>
          </tr>
        )}
        {!isGroupCollapsed && group.lines.map(line => renderLineRow(line, group.title ? 2 : 1))}
        {group.total_label && !isGroupCollapsed && (
          <tr className="bg-emerald-50/30 dark:bg-emerald-950/15 border-b border-neutral-200 dark:border-neutral-700 font-bold">
            <td className="p-2.5 pl-8 text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">
              {group.total_label}
            </td>
            <td className="p-2.5 text-right font-mono text-xs font-bold text-neutral-900 dark:text-white">
              {plain(gf.thisMonth)}
            </td>
            <td className="p-2.5 text-right font-mono text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {plain(gf.sameMonthLastYear)}
            </td>
            <td className="p-2.5 text-right font-mono text-xs">
              <VarianceCell value={gf.variance} bold />
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const renderSection = (sec: FsSection) => {
    const isSecCollapsed = collapsed[sec.key];
    const sf = sectionFigures(sec);

    return (
      <div
        key={sec.key}
        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900 shadow-2xs space-y-0"
      >
        {/* Section Header */}
        <div className="flex items-center justify-between p-3.5 bg-neutral-100/90 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => toggleCollapse(sec.key)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
          >
            {isSecCollapsed ? <ChevronRight className="w-4 h-4 text-emerald-600" /> : <ChevronDown className="w-4 h-4 text-emerald-600" />}
            <span>{sec.title}</span>
          </button>
          <div className="text-right">
            <span className="font-mono text-xs font-black text-neutral-900 dark:text-white mr-4">
              {peso(sf.thisMonth)}
            </span>
          </div>
        </div>

        {!isSecCollapsed && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/90 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-700 text-[10px] font-black uppercase text-neutral-500 dark:text-neutral-400">
                  <th className="p-2.5 pl-6 min-w-[280px]">Account Title</th>
                  <th className="p-2.5 text-right w-44">{currentColumnLabel}</th>
                  <th className="p-2.5 text-right w-44">{previousColumnLabel}</th>
                  <th className="p-2.5 text-right w-44">{varianceColumnLabel}</th>
                </tr>
              </thead>
              <tbody>
                {sec.groups.map(g => renderGroup(g, `${sec.key}_${g.title || 'default'}`))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-100/80 dark:bg-neutral-800/90 border-t-2 border-neutral-300 dark:border-neutral-600 font-black">
                  <td className="p-3 pl-6 text-xs uppercase text-neutral-900 dark:text-white tracking-wider">
                    {sec.total_label}
                  </td>
                  <td className="p-3 text-right font-mono text-xs font-black text-neutral-900 dark:text-white">
                    {plain(sf.thisMonth)}
                  </td>
                  <td className="p-3 text-right font-mono text-xs font-black text-neutral-600 dark:text-neutral-300">
                    {plain(sf.sameMonthLastYear)}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    <VarianceCell value={sf.variance} bold />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderMajorTotalRow = (label: string, f: Figures, isDark = false) => {
    return (
      <div
        className={`rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs ${
          isDark
            ? 'bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-neutral-900 dark:text-white'
        }`}
      >
        <div className="font-headline text-sm font-black uppercase tracking-wider flex items-center gap-2">
          {isDark ? <ShieldCheck className="w-5 h-5 text-emerald-300" /> : <Layers className="w-5 h-5 text-emerald-600" />}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-8 text-right font-mono text-sm">
          <div>
            <div className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-emerald-200' : 'text-neutral-500'}`}>
              {currentColumnLabel}
            </div>
            <div className="font-black text-base">{peso(f.thisMonth)}</div>
          </div>
          <div>
            <div className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-emerald-200' : 'text-neutral-500'}`}>
              {previousColumnLabel}
            </div>
            <div className="font-bold">{peso(f.sameMonthLastYear)}</div>
          </div>
          <div>
            <div className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-emerald-200' : 'text-neutral-500'}`}>
              {varianceColumnLabel}
            </div>
            <div className="font-black">
              {isDark ? (
                <span>{f.variance > 0 ? '+' : f.variance < 0 ? '−' : ''}{peso(Math.abs(f.variance))}</span>
              ) : (
                <VarianceCell value={f.variance} bold />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-micro-elevate">
      {/* ================= Header & Filter Toolbar ================= */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs space-y-4 print:border-0 print:shadow-none">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              University of Cebu-METC Multipurpose Cooperative
            </div>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white">
              Balance Sheet
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              As of <span className="font-bold text-neutral-800 dark:text-neutral-200">{periodEndLabel}</span>
              {' '}— official Statement of Financial Condition presenting Assets, Liabilities, and Member's Equity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Year Selector */}
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
                  onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                  className="px-3 py-1 rounded-lg bg-emerald-700 text-white font-mono text-xs font-black shadow-2xs hover:bg-emerald-800 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Click to select fiscal year"
                >
                  <span>Year {year}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isYearDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          setYear(y);
                          setIsYearDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-mono font-bold flex items-center justify-between transition-colors ${
                          y === year
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-black'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>Year {y}</span>
                          {y === 2026 && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-sans font-bold">
                              Audited
                            </span>
                          )}
                        </span>
                        {y === year && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setYear(year + 1);
                  setIsYearDropdownOpen(false);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-extrabold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/70 dark:hover:bg-emerald-900/70 cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                title={`Switch to Next Year (${year + 1})`}
              >
                <span className="hidden sm:inline">{year + 1}</span>
                <span>›</span>
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Refresh Statement Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            {/* Excel Export */}
            <button
              onClick={handleExportExcel}
              disabled={!data || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              disabled={!data || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Month Selector Pills (Full Year YTD + JAN..DEC) */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 print:hidden border-t border-neutral-100 dark:border-neutral-800/80 pt-3">
          <button
            type="button"
            onClick={() => setSelectedPeriod('ytd')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              isYtd
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <span>Full Year (YTD)</span>
          </button>

          {MONTHS_SHORT.map((mShort, idx) => {
            const isSelected = selectedPeriod === idx;
            const hasData = monthHasActivity(idx);
            const disabled = isMonthDisabled(idx);
            return (
              <button
                key={mShort}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setSelectedPeriod(idx)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  disabled
                    ? 'opacity-30 bg-neutral-100 dark:bg-neutral-800/40 text-neutral-400 dark:text-neutral-600 cursor-not-allowed border border-transparent select-none'
                    : isSelected
                    ? 'bg-emerald-700 text-white shadow-xs cursor-pointer'
                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 cursor-pointer'
                }`}
                title={disabled ? `${MONTHS[idx]} ${year} is disabled until ${MONTHS[idx]} 1, ${year}` : `View position as of ${MONTHS[idx]} ${year}`}
              >
                <span>{mShort}</span>
                {!disabled && hasData && (
                  <span
                    className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-amber-300' : 'bg-emerald-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Search Bar & Hide Empty Accounts Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-neutral-100 dark:border-neutral-800/80 pt-3 print:hidden">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search account title (e.g. Cash in Vault, Calamity, Inventories)..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {searchQuery && (
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-lg">
                {matchCount} match{matchCount === 1 ? '' : 'es'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setHideEmpty(!hideEmpty)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                hideEmpty
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300'
              }`}
            >
              {hideEmpty ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{hideEmpty ? 'Hidden zero balances' : 'Hide zero accounts'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
            Compiling Official Balance Sheet for {year}...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      {!loading && data && totals && (
        <div className="space-y-6">
          {/* Top KPI Cards (Assets, Liabilities, Equity, Accounting Balance Pill) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Assets Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Total Assets
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white">
                {peso(totals.assets.thisMonth)}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Cash, Loans, Accounts, Inventories & PPE
              </p>
            </div>

            {/* Total Liabilities Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  Total Liabilities
                </span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white">
                {peso(totals.liabilities.thisMonth)}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Trade, Loans, Accrued & Statutory Payables
              </p>
            </div>

            {/* Total Equity Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-400">
                  Total Equity
                </span>
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600">
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white">
                {peso(totals.equity.thisMonth)}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Common Shares, Undivided Surplus & Statutory Funds
              </p>
            </div>
          </div>

          {/* Accounting Equation Verification Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              Math.abs(totals.balanceVariance.thisMonth) < 0.01
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="font-semibold">
                <span className="font-black uppercase tracking-wide">Fundamental Accounting Balance: </span>
                <span>Assets = Liabilities + Equity</span>
              </div>
            </div>
            <div className="font-mono font-black text-xs flex items-center gap-3">
              <span>Variance: {peso(totals.balanceVariance.thisMonth)}</span>
              {Math.abs(totals.balanceVariance.thisMonth) < 0.01 && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-wider">
                  Balanced
                </span>
              )}
            </div>
          </div>

          {/* No Records for Fiscal Year Alert Banner */}
          {Math.abs(totals.assets.thisMonth) < 0.005 && Math.abs(totals.liabilities.thisMonth) < 0.005 && Math.abs(totals.equity.thisMonth) < 0.005 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                No balance sheet records or audited baseline figures exist for Fiscal Year {year}. All balances display ₱0.00.
              </span>
            </div>
          )}


          {/* ============================================================== */}
          {/* PART A: ASSETS */}
          {/* ============================================================== */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <Building2 className="w-5 h-5" />
              <h3 className="text-base font-black uppercase tracking-wider">PART A: ASSETS</h3>
            </div>
            {data.statement.assets.map(sec => renderSection(sec))}
            {renderMajorTotalRow('TOTAL : ASSETS', totals.assets, true)}
          </div>

          {/* ============================================================== */}
          {/* PART B: LIABILITIES */}
          {/* ============================================================== */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <Receipt className="w-5 h-5" />
              <h3 className="text-base font-black uppercase tracking-wider">PART B: LIABILITIES</h3>
            </div>
            {data.statement.liabilities.map(sec => renderSection(sec))}
            {renderMajorTotalRow('TOTAL : LIABILITIES', totals.liabilities)}
          </div>

          {/* ============================================================== */}
          {/* PART C: EQUITY */}
          {/* ============================================================== */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-teal-800 dark:text-teal-400">
              <Scale className="w-5 h-5" />
              <h3 className="text-base font-black uppercase tracking-wider">PART C: EQUITY</h3>
            </div>
            {data.statement.equity.map(sec => renderSection(sec))}
            {renderMajorTotalRow('TOTAL : EQUITY', totals.equity)}
          </div>

          {/* ============================================================== */}
          {/* TOTAL LIABILITIES & EQUITY */}
          {/* ============================================================== */}
          <div className="pt-2">
            {renderMajorTotalRow('TOTAL : LIABILITIES & EQUITY', totals.liabAndEquity, true)}
          </div>

          {/* ============================================================== */}
          {/* VARIANCE ASSETS VS LIABILITIES ROW */}
          {/* ============================================================== */}
          <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-white dark:bg-neutral-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Variance Assets Vs Liabilities
            </div>
            <div className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">
              {peso(totals.balanceVariance.thisMonth)}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* INTERACTIVE TRANSACTION BREAKDOWN MODAL */}
      {/* ============================================================== */}
      {selectedLineModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-4 bg-neutral-50/70 dark:bg-neutral-800/50">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Account Ledger & Itemized Breakdown
                  </div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white mt-0.5">
                    {selectedLineModal.title}
                  </h3>
                  {selectedLineModal.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {selectedLineModal.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={closeLineModal}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Filters & Search */}
              <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-neutral-900">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={lineModalSearch}
                    onChange={e => setLineModalSearch(e.target.value)}
                    placeholder="Search payor, voucher no, particulars..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-neutral-500">Month:</span>
                  <select
                    value={lineModalMonthFilter}
                    onChange={e =>
                      setLineModalMonthFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
                    }
                    className="px-2.5 py-1 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-bold outline-none cursor-pointer"
                  >
                    <option value="all">All Months</option>
                    {MONTHS.map((m, idx) => {
                      const disabled = isMonthDisabled(idx);
                      return (
                        <option key={m} value={idx} disabled={disabled}>
                          {m}{disabled ? ` (Disabled until ${m} 1)` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Modal Table Content */}
              <div className="overflow-y-auto flex-1 p-4">
                {(() => {
                  const txs = selectedLineModal.transactions || [];
                  const filtered = txs.filter(t => {
                    if (lineModalMonthFilter !== 'all') {
                      if (typeof t.month === 'number' && t.month !== lineModalMonthFilter) return false;
                    }
                    if (lineModalSearch) {
                      const sq = lineModalSearch.toLowerCase();
                      const matchPayee = t.payee?.toLowerCase().includes(sq);
                      const matchPart = t.particulars?.toLowerCase().includes(sq);
                      const matchVoucher = t.voucher_no?.toLowerCase().includes(sq);
                      const matchOr = t.or_no?.toLowerCase().includes(sq);
                      if (!matchPayee && !matchPart && !matchVoucher && !matchOr) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-neutral-400 text-xs">
                        No transactions found matching the filter criteria.
                      </div>
                    );
                  }

                  const totalFiltered = filtered.reduce((s, t) => s + (t.amount || 0), 0);

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-neutral-600 dark:text-neutral-400 px-1">
                        <span>Showing {filtered.length} transaction records</span>
                        <span>Total: <b className="font-mono text-neutral-900 dark:text-white">{peso(totalFiltered)}</b></span>
                      </div>

                      <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 text-[10px] font-black uppercase text-neutral-500">
                              <th className="p-2.5 pl-4">Date</th>
                              <th className="p-2.5">Payee / Payor</th>
                              <th className="p-2.5">Particulars / Source</th>
                              <th className="p-2.5">Reference #</th>
                              <th className="p-2.5 text-right">Amount</th>
                              <th className="p-2.5 text-center pr-4">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {filtered.map((t, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                              >
                                <td className="p-2.5 pl-4 font-mono text-[11px] whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                                  {t.date || 'N/A'}
                                </td>
                                <td className="p-2.5 font-bold text-neutral-900 dark:text-white max-w-[200px] truncate">
                                  {t.payee || '—'}
                                </td>
                                <td className="p-2.5 text-neutral-600 dark:text-neutral-400 text-[11px] max-w-[240px] truncate">
                                  {t.particulars || t.source || '—'}
                                </td>
                                <td className="p-2.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap">
                                  {t.voucher_no || t.or_no || '—'}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                                  {peso(t.amount)}
                                </td>
                                <td className="p-2.5 text-center pr-4 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleNavigateToSource(t)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold transition-all cursor-pointer"
                                    title="Open transaction detail in accounting module"
                                  >
                                    <span>Inspect</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 border-t border-neutral-200 dark:border-neutral-800 flex justify-end bg-neutral-50 dark:bg-neutral-800/50">
                <button
                  type="button"
                  onClick={closeLineModal}
                  className="px-4 py-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-colors cursor-pointer"
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
