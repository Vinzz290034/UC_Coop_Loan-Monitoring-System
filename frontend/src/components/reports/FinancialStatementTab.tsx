'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const consumedDeepLinkRef = useRef<string | null>(null);
  const [selectedLineModal, setSelectedLineModal] = useState<FsLine | null>(null);
  const [lineModalSearch, setLineModalSearch] = useState('');
  const [lineModalMonthFilter, setLineModalMonthFilter] = useState<number | 'all'>('all');

  // Re-open Balance Sheet breakdown modal when returning from Disbursement/Check Voucher
  useEffect(() => {
    if (!data || !searchParams) return;
    const tabParam = searchParams.get('tab');
    const accountParam = searchParams.get('account');
    const subViewParam = searchParams.get('subview');
    if (tabParam !== 'financial_statement' || !accountParam) return;

    const deepLinkKey = `${tabParam}::${accountParam}::${subViewParam || 'all'}::${data.year}`;
    if (consumedDeepLinkRef.current === deepLinkKey) return;

    const targetLower = accountParam.trim().toLowerCase();
    const allSections = [
      ...(data.statement.assets || []),
      ...(data.statement.liabilities || []),
      ...(data.statement.equity || []),
    ];
    let matchedLine: FsLine | null = null;
    for (const sec of allSections) {
      for (const grp of sec.groups || []) {
        const found = (grp.lines || []).find(
          (l) => l.title.trim().toLowerCase() === targetLower
        );
        if (found) {
          matchedLine = found;
          break;
        }
      }
      if (matchedLine) break;
    }

    if (matchedLine) {
      consumedDeepLinkRef.current = deepLinkKey;
      setSelectedLineModal(matchedLine);
      if (subViewParam && subViewParam !== 'all') {
        const parsedMonth = parseInt(subViewParam, 10);
        if (!isNaN(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11) {
          setLineModalMonthFilter(parsedMonth);
        } else {
          setLineModalMonthFilter('all');
        }
      } else {
        setLineModalMonthFilter('all');
      }
    }
  }, [data, searchParams]);

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
    if (t.source === 'baseline' || t.source === 'inventory_baseline' || (!t.voucher_id && /^(BEG-BAL|INV-OCT)$/i.test(String(t.voucher_no || '')))) {
      return;
    }

    if (t.source === 'income_statement') {
      router.push(`/dashboard/reports?tab=statement_of_operations&year=${year}`);
      return;
    }

    if (t.source === 'check_voucher' || t.voucher_no || t.voucher_id) {
      const params = new URLSearchParams();
      params.set('tab', 'summary');
      const vRef = t.voucher_no || t.voucher_id || '';
      if (vRef) params.set('voucher', vRef);
      if (t.voucher_id) params.set('id', t.voucher_id);
      params.set('fromReport', 'financial_statement');
      if (selectedLineModal?.title) params.set('returnAccount', selectedLineModal.title);
      params.set('returnSubView', String(lineModalMonthFilter));
      params.set('year', String(year));
      router.push(`/dashboard/disbursement?${params.toString()}`);
      return;
    }

    if (t.source === 'revolving_fund') {
      const params = new URLSearchParams();
      params.set('tab', 'revolving');
      params.set('fromReport', 'financial_statement');
      if (selectedLineModal?.title) params.set('returnAccount', selectedLineModal.title);
      params.set('returnSubView', String(lineModalMonthFilter));
      params.set('year', String(year));
      router.push(`/dashboard/disbursement?${params.toString()}`);
      return;
    }

    if (t.source === 'collection' || t.or_no) {
      const searchVal = t.or_no || t.payee;
      const params = new URLSearchParams();
      if (searchVal) params.set('search', searchVal);
      params.set('fromReport', 'financial_statement');
      if (selectedLineModal?.title) params.set('returnAccount', selectedLineModal.title);
      params.set('returnSubView', String(lineModalMonthFilter));
      params.set('year', String(year));
      router.push(`/dashboard/collection?${params.toString()}`);
      return;
    }

    if (t.source === 'share_capital') {
      router.push(`/dashboard/membership`);
      return;
    }

    if (t.payee) {
      router.push(`/dashboard/loans?tab=loans&search=${encodeURIComponent(t.payee)}`);
    }
  }, [router, year, selectedLineModal, lineModalMonthFilter]);

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
      const res = await api.get('/reports/financial-statement', { params: { year, _t: Date.now() } });
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
  const handleExportExcel = async () => {
    if (!data) return;

    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'University of Cebu-METC Multipurpose Cooperative';
    wb.created = new Date();

    const ws = wb.addWorksheet('Balance Sheet', {
      views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.45, right: 0.45, top: 0.55, bottom: 0.55, header: 0.25, footer: 0.25 }
      }
    });

    ws.columns = [
      { width: 54 },
      { width: 22 },
      { width: 22 },
      { width: 20 }
    ];

    const FONT_NAME = 'Calibri';
    const NUM_FMT = '#,##0.00;(#,##0.00);"-"';
    const VAR_FMT = '+#,##0.00;(#,##0.00);"-"';
    const CURRENCY_FMT = '₱#,##0.00;(₱#,##0.00);"₱0.00"';

    // Title block
    const r1 = ws.addRow(['UNIVERSITY OF CEBU-METC MULTIPURPOSE COOPERATIVE']);
    ws.mergeCells('A1:D1');
    r1.height = 24;
    r1.getCell(1).font = { name: FONT_NAME, size: 14, bold: true, color: { argb: 'FF064E3B' } };
    r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const r2 = ws.addRow(['BALANCE SHEET (STATEMENT OF FINANCIAL CONDITION)']);
    ws.mergeCells('A2:D2');
    r2.height = 20;
    r2.getCell(1).font = { name: FONT_NAME, size: 12, bold: true, color: { argb: 'FF111827' } };
    r2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const r3 = ws.addRow([`As of ${periodEndLabel}`]);
    ws.mergeCells('A3:D3');
    r3.height = 18;
    r3.getCell(1).font = { name: FONT_NAME, size: 10, italic: true, color: { argb: 'FF4B5563' } };
    r3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= 4; c++) {
      r3.getCell(c).border = { bottom: { style: 'medium', color: { argb: 'FF064E3B' } } };
    }

    const r4 = ws.addRow([]);
    r4.height = 8;

    // Table header row (Row 5)
    const hdr = ws.addRow(['Account Title', currentColumnLabel, previousColumnLabel, varianceColumnLabel]);
    hdr.height = 26;
    hdr.eachCell((cell, colNumber) => {
      cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
      cell.alignment = {
        horizontal: colNumber === 1 ? 'left' : 'right',
        vertical: 'middle',
        wrapText: true,
        indent: colNumber === 1 ? 1 : 0
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF064E3B' } },
        bottom: { style: 'medium', color: { argb: 'FF064E3B' } }
      };
    });

    const styleNumericCell = (
      cell: import('exceljs').Cell,
      val: number,
      opts: { bold?: boolean; currency?: boolean; isVariance?: boolean; color?: string } = {}
    ) => {
      let fgColor = opts.color || 'FF1F2937';
      if (opts.isVariance && Math.abs(val) >= 0.005) {
        fgColor = val > 0 ? 'FF047857' : 'FFBE123C';
      } else if (opts.isVariance) {
        fgColor = 'FF9CA3AF';
      }
      cell.font = { name: FONT_NAME, size: opts.bold ? 10 : 9.5, bold: !!opts.bold, color: { argb: fgColor } };
      cell.numFmt = opts.currency ? CURRENCY_FMT : opts.isVariance ? VAR_FMT : NUM_FMT;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    };

    const addPartBanner = (label: string, fillHex: string, textHex: string) => {
      const row = ws.addRow([label]);
      ws.mergeCells(row.number, 1, row.number, 4);
      row.height = 22;
      for (let c = 1; c <= 4; c++) {
        const cell = row.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillHex } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }
        };
      }
      row.getCell(1).font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: textHex } };
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    };

    const addSectionHeader = (label: string, fillHex: string, textHex: string) => {
      const row = ws.addRow([label]);
      ws.mergeCells(row.number, 1, row.number, 4);
      row.height = 19;
      for (let c = 1; c <= 4; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillHex } };
      }
      row.getCell(1).font = { name: FONT_NAME, size: 10, bold: true, color: { argb: textHex } };
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    };

    const addGroupHeader = (label: string) => {
      const row = ws.addRow([label]);
      ws.mergeCells(row.number, 1, row.number, 4);
      row.height = 17;
      row.getCell(1).font = { name: FONT_NAME, size: 9.5, bold: true, italic: true, color: { argb: 'FF374151' } };
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 2 };
    };

    const addDataRow = (
      title: string,
      f: Figures,
      opts: {
        indent?: number;
        bold?: boolean;
        fillHex?: string;
        topBorder?: 'thin';
        bottomBorder?: 'thin' | 'double' | 'hair';
        borderHex?: string;
        currency?: boolean;
        textHex?: string;
        height?: number;
      } = {}
    ) => {
      const row = ws.addRow([title, f.thisMonth, f.sameMonthLastYear, f.variance]);
      row.height = opts.height || 18;
      const bHex = opts.borderHex || 'FFE5E7EB';
      for (let c = 1; c <= 4; c++) {
        const cell = row.getCell(c);
        if (opts.fillHex) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fillHex } };
        }
        cell.border = {
          ...(opts.topBorder ? { top: { style: opts.topBorder, color: { argb: bHex } } } : {}),
          ...(opts.bottomBorder ? { bottom: { style: opts.bottomBorder, color: { argb: bHex } } } : {})
        };
      }
      row.getCell(1).font = {
        name: FONT_NAME,
        size: opts.bold ? 10 : 9.5,
        bold: !!opts.bold,
        color: { argb: opts.textHex || 'FF1F2937' }
      };
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: opts.indent ?? 2 };

      styleNumericCell(row.getCell(2), f.thisMonth, { bold: opts.bold, currency: opts.currency, color: opts.textHex });
      styleNumericCell(row.getCell(3), f.sameMonthLastYear, { bold: opts.bold, currency: opts.currency, color: opts.textHex });
      styleNumericCell(row.getCell(4), f.variance, { bold: opts.bold, currency: opts.currency, isVariance: true });
    };

    const addPartToSheet = (
      partTitle: string,
      sections: FsSection[],
      totalLabel: string,
      totalFig: Figures,
      theme: { bannerFill: string; bannerText: string; secFill: string; secText: string; totalFill: string; totalBorder: string }
    ) => {
      addPartBanner(partTitle, theme.bannerFill, theme.bannerText);
      sections.forEach(sec => {
        addSectionHeader(sec.title.toUpperCase(), theme.secFill, theme.secText);
        sec.groups.forEach(g => {
          const hasGroupTitle = Boolean(g.title);
          if (hasGroupTitle) addGroupHeader(g.title);
          g.lines.forEach(l => {
            if (!isLineVisible(l, true)) return;
            addDataRow(l.title, lineFigures(l), {
              indent: hasGroupTitle ? 3 : 2,
              bottomBorder: 'hair',
              borderHex: 'FFE5E7EB'
            });
          });
          if (g.total_label) {
            addDataRow(g.total_label, groupFigures(g), {
              indent: 2,
              bold: true,
              fillHex: 'FFF9FAFB',
              topBorder: 'thin',
              bottomBorder: 'thin',
              borderHex: 'FF9CA3AF'
            });
          }
        });
        addDataRow(sec.total_label, sectionFigures(sec), {
          indent: 1,
          bold: true,
          fillHex: 'FFF3F4F6',
          topBorder: 'thin',
          bottomBorder: 'thin',
          borderHex: 'FF6B7280',
          height: 20
        });
        ws.addRow([]).height = 6;
      });

      addDataRow(totalLabel, totalFig, {
        indent: 1,
        bold: true,
        fillHex: theme.totalFill,
        topBorder: 'thin',
        bottomBorder: 'double',
        borderHex: theme.totalBorder,
        currency: true,
        textHex: theme.bannerText,
        height: 22
      });
      ws.addRow([]).height = 10;
    };

    if (totals) {
      addPartToSheet('PART A — ASSETS', data.statement.assets, 'TOTAL: ASSETS', totals.assets, {
        bannerFill: 'FFD1FAE5',
        bannerText: 'FF064E3B',
        secFill: 'FFECFDF5',
        secText: 'FF065F46',
        totalFill: 'FFECFDF5',
        totalBorder: 'FF064E3B'
      });

      addPartToSheet('PART B — LIABILITIES', data.statement.liabilities, 'TOTAL: LIABILITIES', totals.liabilities, {
        bannerFill: 'FFFEF3C7',
        bannerText: 'FF92400E',
        secFill: 'FFFFFBEB',
        secText: 'FF92400E',
        totalFill: 'FFFEF3C7',
        totalBorder: 'FF92400E'
      });

      addPartToSheet('PART C — EQUITY', data.statement.equity, 'TOTAL: EQUITY', totals.equity, {
        bannerFill: 'FFDBEAFE',
        bannerText: 'FF1E40AF',
        secFill: 'FFEFF6FF',
        secText: 'FF1E3A8A',
        totalFill: 'FFEFF6FF',
        totalBorder: 'FF1E40AF'
      });

      addDataRow('TOTAL: LIABILITIES & EQUITY', totals.liabAndEquity, {
        indent: 1,
        bold: true,
        fillHex: 'FFD1FAE5',
        topBorder: 'thin',
        bottomBorder: 'double',
        borderHex: 'FF064E3B',
        currency: true,
        textHex: 'FF064E3B',
        height: 24
      });

      const isBalanced = Math.abs(totals.balanceVariance.thisMonth) < 0.01;
      addDataRow('ACCOUNTING BALANCE VARIANCE (ASSETS − LIABILITIES & EQUITY)', totals.balanceVariance, {
        indent: 1,
        bold: true,
        fillHex: isBalanced ? 'FFECFDF5' : 'FFFFF1F2',
        topBorder: 'thin',
        bottomBorder: 'thin',
        borderHex: isBalanced ? 'FF047857' : 'FFBE123C',
        currency: true,
        textHex: isBalanced ? 'FF047857' : 'FFBE123C',
        height: 20
      });
    }

    // Footer
    ws.addRow([]).height = 10;
    const footer = ws.addRow([
      `Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  •  University of Cebu-METC Multipurpose Cooperative`
    ]);
    ws.mergeCells(footer.number, 1, footer.number, 4);
    footer.getCell(1).font = { name: FONT_NAME, size: 8.5, italic: true, color: { argb: 'FF6B7280' } };
    footer.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Balance_Sheet_${year}_${isYtd ? 'YTD' : MONTHS_SHORT[selectedPeriod as number]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-modal-backdrop">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-modal-pop">
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
                                  {(t.source === 'baseline' || t.source === 'inventory_baseline' || (!t.voucher_id && /^(BEG-BAL|INV-OCT)$/i.test(String(t.voucher_no || '')))) ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-[10px] font-semibold">
                                      Opening Balance
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleNavigateToSource(t)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold transition-all cursor-pointer"
                                      title={t.source === 'income_statement' ? 'Open Income Statement' : 'Open transaction detail in accounting module'}
                                    >
                                      <span>{t.source === 'income_statement' ? 'Income Stmt' : 'Inspect'}</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </button>
                                  )}
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
