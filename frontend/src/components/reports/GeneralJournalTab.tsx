'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import AnimatedSelect from '@/components/ui/AnimatedSelect';
import ExcelJS from 'exceljs';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
} from 'lucide-react';

interface JournalLine {
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  entry_id: string;
  manual_id?: number;
  date: string;
  jev_no: string;
  source_type: string;
  source_label: string;
  payee: string;
  description: string;
  lines: JournalLine[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
}

const fmt = (n: number) =>
  `₱${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = [
  { value: '', label: 'Full Year (YTD)' },
  { value: '1', label: 'Through Jan' },
  { value: '2', label: 'Through Feb' },
  { value: '3', label: 'Through Mar' },
  { value: '4', label: 'Through Apr' },
  { value: '5', label: 'Through May' },
  { value: '6', label: 'Through Jun' },
  { value: '7', label: 'Through Jul' },
  { value: '8', label: 'Through Aug' },
  { value: '9', label: 'Through Sep' },
  { value: '10', label: 'Through Oct' },
  { value: '11', label: 'Through Nov' },
  { value: '12', label: 'Through Dec' },
];

export default function GeneralJournalTab({ initialYear = 2026 }: { initialYear?: number }) {
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);
  const [viewMode, setViewMode] = useState<'daily' | 'all'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accountOptions, setAccountOptions] = useState<{ account_title: string; account_type: string }[]>([]);
  const [summary, setSummary] = useState({ entry_count: 0, total_debit: 0, total_credit: 0, is_balanced: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual JEV Modal
  const [isJevModalOpen, setIsJevModalOpen] = useState(false);
  const [jevNo, setJevNo] = useState('');
  const [jevDate, setJevDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [jevDesc, setJevDesc] = useState('');
  const [jevLines, setJevLines] = useState([
    { account_name: '', account_type: 'Expense', debit: '', credit: '' },
    { account_name: '', account_type: 'Asset', debit: '', credit: '' },
  ]);
  const [jevSubmitting, setJevSubmitting] = useState(false);
  const [jevError, setJevError] = useState<string | null>(null);
  const [openAccountLineIdx, setOpenAccountLineIdx] = useState<number | null>(null);

  const handleOpenReverseJev = (je: JournalEntry) => {
    const entryYear = Number(String(je.date || '').slice(0, 4)) || year;
    const reverseDate = `${entryYear + 1}-01-01`;
    setJevNo(je.jev_no ? `REV-${je.jev_no}` : '');
    setJevDate(reverseDate);
    setJevDesc(`Reversing Entry for ${je.jev_no || 'Adjusting JEV'}${je.description ? ` — ${je.description}` : ''}`);
    setJevLines(
      (je.lines || []).map((line) => ({
        account_name: line.account_name || '',
        account_type: line.account_type || 'Expense',
        debit: line.credit > 0 ? String(line.credit) : '',
        credit: line.debit > 0 ? String(line.debit) : '',
      }))
    );
    setJevError(null);
    setOpenAccountLineIdx(null);
    setIsJevModalOpen(true);
  };

  const loadJournal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { year };
      if (month) params.month = month;
      const [journalRes, tAccRes] = await Promise.all([
        api.get('/reports/general-journal', { params }),
        api.get('/reports/t-accounts', { params: { year } }).catch(() => ({ data: { accounts: [] } })),
      ]);
      setEntries(journalRes.data.entries || []);
      setSummary(journalRes.data.summary || { entry_count: 0, total_debit: 0, total_credit: 0, is_balanced: true });
      const tAccs = (tAccRes.data?.accounts || []).map((a: any) => ({
        account_title: a.account_name,
        account_type: a.account_type,
      }));
      setAccountOptions(tAccs);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load General Journal.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  useEffect(() => {
    if (viewMode === 'daily' && selectedDate) {
      const y = Number(selectedDate.slice(0, 4));
      if (y && y !== year) setYear(y);
    }
  }, [viewMode, selectedDate, year]);

  const shiftSelectedDate = (deltaDays: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
    setSelectedDate(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    );
  };

  const formattedAsOfDate = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, [selectedDate]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (viewMode === 'daily' && selectedDate && e.date !== selectedDate) return false;
      if (sourceFilter !== 'all' && e.source_type !== sourceFilter) return false;
      if (!q) return true;
      return (
        (e.jev_no || '').toLowerCase().includes(q) ||
        (e.payee || '').toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        e.lines.some((l) => l.account_name.toLowerCase().includes(q))
      );
    });
  }, [entries, viewMode, selectedDate, sourceFilter, search]);

  const activeSummary = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const entry of filteredEntries) {
      for (const line of entry.lines || []) {
        totalDebit += Number(line.debit) || 0;
        totalCredit += Number(line.credit) || 0;
      }
    }
    totalDebit = Math.round(totalDebit * 100) / 100;
    totalCredit = Math.round(totalCredit * 100) / 100;
    return {
      entry_count: filteredEntries.length,
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    };
  }, [filteredEntries]);

  useEffect(() => {
    setPage(1);
  }, [search, sourceFilter, viewMode, selectedDate, year, month, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedEntries = useMemo(
    () => filteredEntries.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredEntries, safePage, pageSize]
  );

  const modalTotals = useMemo(() => {
    const debit = jevLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const credit = jevLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
    return {
      debit: Math.round(debit * 100) / 100,
      credit: Math.round(credit * 100) / 100,
      diff: Math.round((debit - credit) * 100) / 100,
    };
  }, [jevLines]);

  const handleCreateJev = async (e: React.FormEvent) => {
    e.preventDefault();
    setJevError(null);
    if (modalTotals.debit <= 0 || Math.abs(modalTotals.diff) >= 0.01) {
      setJevError('Total Debits must equal Total Credits and be greater than ₱0.00.');
      return;
    }
    setJevSubmitting(true);
    try {
      await api.post('/reports/journal-entries', {
        jev_no: jevNo.trim() || undefined,
        entry_date: jevDate,
        description: jevDesc.trim(),
        lines: jevLines.map((l) => ({
          account_name: l.account_name.trim(),
          account_type: l.account_type,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        })),
      });
      setIsJevModalOpen(false);
      setJevNo('');
      setJevDesc('');
      setJevLines([
        { account_name: '', account_type: 'Expense', debit: '', credit: '' },
        { account_name: '', account_type: 'Asset', debit: '', credit: '' },
      ]);
      await loadJournal();
    } catch (err: any) {
      setJevError(err.response?.data?.error?.message || 'Failed to post Journal Entry.');
    } finally {
      setJevSubmitting(false);
    }
  };

  const handleDeleteManualJev = async (manualId: number) => {
    try {
      await api.delete(`/reports/journal-entries/${manualId}`);
      await loadJournal();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete Journal Entry.');
    }
  };

  const handleExportExcel = async () => {
    if (filteredEntries.length === 0) return;
    const periodLabel =
      viewMode === 'daily'
        ? `As of ${formattedAsOfDate}`
        : `Year ${year}${month ? ` (${MONTHS.find((m) => m.value === month)?.label || `Month ${month}`})` : ' (Full Year YTD)'}`;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'UC-METC MPC Loan & Accounting System';
    wb.created = new Date();

    const ws = wb.addWorksheet('Journal Entry', {
      views: [{ state: 'frozen', ySplit: 5 }],
      pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    ws.columns = [
      { key: 'date', width: 13 },
      { key: 'jev', width: 20 },
      { key: 'source', width: 18 },
      { key: 'account', width: 46 },
      { key: 'type', width: 13 },
      { key: 'payee', width: 26 },
      { key: 'debit', width: 18 },
      { key: 'credit', width: 18 },
    ];

    // Formal Letterhead
    ws.mergeCells('A1:H1');
    const r1 = ws.getCell('A1');
    r1.value = 'UNIVERSITY OF CEBU - METC MULTIPURPOSE COOPERATIVE (UC-METC MPC)';
    r1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF064E3B' } };
    r1.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 24;

    ws.mergeCells('A2:H2');
    const r2 = ws.getCell('A2');
    r2.value = 'GENERAL JOURNAL / JOURNAL ENTRY';
    r2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF111827' } };
    r2.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 20;

    ws.mergeCells('A3:H3');
    const r3 = ws.getCell('A3');
    r3.value = `Period: ${periodLabel}   |   Entries: ${activeSummary.entry_count}   |   Status: ${activeSummary.is_balanced ? 'Balanced (Dr = Cr)' : 'Unbalanced'}`;
    r3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF4B5563' } };
    r3.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 18;
    ws.getRow(4).height = 8;

    // Header Row
    const headerRow = ws.getRow(5);
    headerRow.values = [
      'Date',
      'JEV / Ref #',
      'Source',
      'Account Title & Particulars',
      'Type',
      'Payee / Party',
      'Debit (₱)',
      'Credit (₱)',
    ];
    headerRow.height = 24;
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
      cell.alignment = {
        horizontal: colNumber >= 7 ? 'right' : colNumber === 1 || colNumber === 3 || colNumber === 5 ? 'center' : 'left',
        vertical: 'middle',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF064E3B' } },
        bottom: { style: 'medium', color: { argb: 'FF064E3B' } },
        left: { style: 'thin', color: { argb: 'FF047857' } },
        right: { style: 'thin', color: { argb: 'FF047857' } },
      };
    });

    const currencyFmt = '"₱"#,##0.00;("₱"#,##0.00);"-"';
    const thinGrid = { style: 'thin' as const, color: { argb: 'FFE2E8F0' } };
    const jevTopBorder = { style: 'thin' as const, color: { argb: 'FF94A3B8' } };

    filteredEntries.forEach((je, jeIdx) => {
      const bandFill = jeIdx % 2 === 1 ? 'FFF8FAFC' : 'FFFFFFFF';
      je.lines.forEach((line, idx) => {
        const isFirst = idx === 0;
        const isCreditOnly = line.credit > 0 && line.debit === 0;
        const row = ws.addRow([
          isFirst ? je.date : '',
          isFirst ? je.jev_no : '',
          isFirst ? je.source_label : '',
          isCreditOnly ? `      ${line.account_name}` : line.account_name,
          line.account_type,
          isFirst ? je.payee : '',
          line.debit > 0 ? Number(line.debit) : null,
          line.credit > 0 ? Number(line.credit) : null,
        ]);
        row.height = 19;
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bandFill } };
          cell.border = {
            top: isFirst ? jevTopBorder : thinGrid,
            bottom: thinGrid,
            left: thinGrid,
            right: thinGrid,
          };
          cell.font = {
            name: 'Calibri',
            size: 10,
            bold: colNumber === 2 && isFirst,
            color: {
              argb:
                colNumber === 7 && line.debit > 0
                  ? 'FF065F46'
                  : colNumber === 8 && line.credit > 0
                    ? 'FF0369A1'
                    : isCreditOnly && colNumber === 4
                      ? 'FF334155'
                      : 'FF111827',
            },
          };
          if (colNumber >= 7) {
            cell.numFmt = currencyFmt;
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else if (colNumber === 1 || colNumber === 3 || colNumber === 5) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          }
        });
      });

      // Formal indented explanation row under each JEV
      const noteRow = ws.addRow([
        '',
        '',
        '',
        `   (${je.description || 'Journal Entry'})`,
        '',
        '',
        null,
        null,
      ]);
      noteRow.height = 17;
      noteRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bandFill } };
        cell.border = {
          top: thinGrid,
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: thinGrid,
          right: thinGrid,
        };
        if (colNumber === 4) {
          cell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }
      });
    });

    // Grand Total Row
    const totalRow = ws.addRow([
      '',
      '',
      '',
      'GRAND TOTAL',
      '',
      '',
      activeSummary.total_debit,
      activeSummary.total_credit,
    ]);
    totalRow.height = 24;
    totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
      cell.font = {
        name: 'Calibri',
        size: 11,
        bold: true,
        color: { argb: colNumber === 8 ? 'FF0369A1' : 'FF064E3B' },
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF064E3B' } },
        bottom: { style: 'double', color: { argb: 'FF064E3B' } },
        left: thinGrid,
        right: thinGrid,
      };
      if (colNumber >= 7) {
        cell.numFmt = currencyFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (colNumber === 4) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });

    // Signatory Block
    ws.addRow([]);
    ws.addRow([]);
    const sigLabelRow = ws.addRow(['', 'Prepared by:', '', 'Verified by (Accountant):', '', 'Approved by (Manager):', '', '']);
    sigLabelRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF374151' } };
    const sigLineRow = ws.addRow(['', '___________________________', '', '___________________________', '', '___________________________', '', '']);
    sigLineRow.font = { name: 'Calibri', size: 10, color: { argb: 'FF6B7280' } };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileTag =
      viewMode === 'daily'
        ? selectedDate
        : `${year}_${month ? `Through_M${month}` : 'YTD'}`;
    a.href = url;
    a.download = `Journal_Entry_${fileTag}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Daily Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-on-surface dark:text-white">
              {viewMode === 'daily'
                ? `Journal Entry as of ${formattedAsOfDate}`
                : `All Journal Entries — Year ${year}`}
            </h2>
            <p className="text-[11px] text-neutral-500">
              {viewMode === 'daily'
                ? 'Showing all balanced double-entry postings recorded on this date'
                : 'Showing full-year / YTD chronological journal entries'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-outline-variant/60 bg-neutral-100 dark:bg-surface-container p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'daily'
                  ? 'bg-[#064e3b] text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-on-surface'
                }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'all'
                  ? 'bg-[#064e3b] text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-on-surface'
                }`}
            >
              All Dates (YTD)
            </button>
          </div>

          {viewMode === 'daily' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => shiftSelectedDate(-1)}
                className="p-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container hover:bg-neutral/5 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                title="Previous day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-xs font-bold text-on-surface dark:text-white outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => shiftSelectedDate(1)}
                className="p-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container hover:bg-neutral/5 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                title="Next day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container hover:bg-neutral/5 text-xs font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer"
              >
                Today
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Journal Entries</div>
          <div className="text-2xl font-black text-on-surface dark:text-white mt-1 font-mono">{activeSummary.entry_count}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            {viewMode === 'daily' ? `Entries on ${formattedAsOfDate}` : 'Chronological double-entry JEVs'}
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Debits</div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono">{fmt(activeSummary.total_debit)}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Sum of debit postings</div>
        </div>
        <div className="p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Credits</div>
          <div className="text-2xl font-black text-sky-700 dark:text-sky-400 mt-1 font-mono">{fmt(activeSummary.total_credit)}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Sum of credit postings</div>
        </div>
        <div className="p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Ledger Status</div>
          <div className="mt-1.5 flex items-center gap-2">
            {activeSummary.is_balanced ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Balanced (Dr = Cr)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5" /> Out of Balance
              </span>
            )}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Feeds T-Accounts & Trial Balance</div>
        </div>
      </div>

      {/* Filter & Actions Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between p-4 rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
        <div className="relative w-full lg:max-w-sm">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search JEV #, payee, description, account..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-xs text-on-surface dark:text-white outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <AnimatedSelect
            value={String(year)}
            onChange={(val) => setYear(Number(val))}
            className="min-w-[115px] py-2"
            options={[2024, 2025, 2026, 2027].map((y) => ({ value: String(y), label: `Year ${y}` }))}
          />

          <AnimatedSelect
            value={month}
            onChange={(val) => setMonth(val)}
            className="min-w-[145px] py-2"
            options={MONTHS}
          />

          <AnimatedSelect
            value={sourceFilter}
            onChange={(val) => setSourceFilter(val)}
            className="min-w-[175px] py-2"
            options={[
              { value: 'all', label: 'All Sources' },
              { value: 'check_voucher', label: 'Check Vouchers' },
              { value: 'collection', label: 'Collections' },
              { value: 'revolving_fund', label: 'RF Liquidations' },
              { value: 'share_capital', label: 'Manual Share Capital' },
              { value: 'manual_jev', label: 'Manual Adjusting JEVs' },
            ]}
          />

          <button
            type="button"
            onClick={loadJournal}
            className="p-2 rounded-xl border border-outline-variant/60 hover:bg-neutral/5 text-neutral-600 dark:text-neutral-300 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            disabled={filteredEntries.length === 0}
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container hover:bg-neutral/5 text-xs font-bold text-on-surface dark:text-white disabled:opacity-40 cursor-pointer"
            title="Export filtered Journal Entries to Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setJevError(null);
              if (viewMode === 'daily' && selectedDate) setJevDate(selectedDate);
              setIsJevModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Adjusting Entry (JEV)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Journal Table */}
      <div className="rounded-2xl border border-outline-variant/60 bg-white dark:bg-surface-container-low">
        <div className="overflow-x-auto rounded-t-2xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 dark:bg-surface-container text-[10px] font-bold uppercase tracking-wider text-neutral-500 border-b border-outline-variant/60">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">JEV / Ref #</th>
                <th className="p-3">Source</th>
                <th className="p-3">Account Title &amp; Particulars</th>
                <th className="p-3 text-right">Debit (₱)</th>
                <th className="p-3 text-right">Credit (₱)</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-500">Loading General Journal...</td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-500">
                    <BookOpen className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    No journal entries found for this filter.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((je) => (
                  <React.Fragment key={je.entry_id}>
                    {je.lines.map((line, idx) => (
                      <tr
                        key={`${je.entry_id}-${idx}`}
                        className={idx === 0 ? 'bg-neutral-50/40 dark:bg-white/[0.02]' : 'hover:bg-neutral-50/60 dark:hover:bg-white/[0.03]'}
                      >
                        <td className="p-2.5 font-mono text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                          {idx === 0 ? je.date : ''}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-on-surface dark:text-white whitespace-nowrap">
                          {idx === 0 ? je.jev_no : ''}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          {idx === 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary">
                              {je.source_label}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className={`font-semibold ${line.credit > 0 && line.debit === 0 ? 'pl-6 text-neutral-700 dark:text-neutral-300' : 'text-on-surface dark:text-white'}`}>
                            {line.account_name}
                            <span className="ml-2 text-[10px] text-neutral-400 font-normal">({line.account_type})</span>
                          </div>
                          {idx === 0 && (
                            <div className="text-[11px] text-neutral-500 mt-0.5">
                              {je.payee} — {je.description}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {line.debit > 0 ? fmt(line.debit) : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-sky-700 dark:text-sky-400">
                          {line.credit > 0 ? fmt(line.credit) : '—'}
                        </td>
                        <td className="p-2.5 text-center">
                          {idx === 0 && je.source_type === 'manual_jev' && je.manual_id && (
                            <div className="inline-flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenReverseJev(je)}
                                className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                                title="Create Reversing Entry (flips debits & credits)"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteManualJev(je.manual_id!)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                title="Delete Manual JEV"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredEntries.length > 0 && (
          <div className="px-4 py-3 border-t border-outline-variant/40 bg-neutral-50/50 dark:bg-surface-container rounded-b-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-neutral-500 font-medium">
              Showing <span className="font-bold text-on-surface dark:text-white">{(safePage - 1) * pageSize + 1}</span>–
              <span className="font-bold text-on-surface dark:text-white">{Math.min(safePage * pageSize, filteredEntries.length)}</span> of{' '}
              <span className="font-bold text-on-surface dark:text-white">{filteredEntries.length}</span> entries
            </div>
            <div className="flex items-center gap-2">
              <AnimatedSelect
                value={String(pageSize)}
                onChange={(val) => setPageSize(Number(val))}
                openUpwards
                className="min-w-[115px]"
                options={[10, 20, 50, 100].map((s) => ({ value: String(s), label: `${s} / page` }))}
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

      {/* New Adjusting Journal Entry Modal */}
      {isJevModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setOpenAccountLineIdx(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop"
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!(e.target as HTMLElement).closest('[data-account-combo]')) {
                setOpenAccountLineIdx(null);
              }
            }}
            className="bg-white dark:bg-surface-container-high border border-outline-variant/80 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-visible shadow-2xl p-6 animate-modal-pop"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-on-surface dark:text-white">New Adjusting Journal Entry (JEV)</h2>
                  <p className="text-[11px] text-neutral-500">Automatically posts to General Ledger, T-Accounts, Trial Balance &amp; Statements</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsJevModalOpen(false)} className="p-1.5 rounded-full hover:bg-neutral/10 text-neutral-500 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {jevError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold">
                {jevError}
              </div>
            )}

            <form onSubmit={handleCreateJev} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">JEV No. (Optional)</label>
                  <input
                    type="text"
                    value={jevNo}
                    onChange={(e) => setJevNo(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Entry Date *</label>
                  <input
                    type="date"
                    required
                    value={jevDate}
                    onChange={(e) => setJevDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Description *</label>
                  <input
                    type="text"
                    required
                    value={jevDesc}
                    onChange={(e) => setJevDesc(e.target.value)}
                    placeholder="e.g. Month-end accrual"
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-neutral-500">Debit &amp; Credit Lines</span>
                  <button
                    type="button"
                    onClick={() => setJevLines([...jevLines, { account_name: '', account_type: 'Expense', debit: '', credit: '' }])}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    + Add Line
                  </button>
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  <div className="col-span-5">Account Title</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2 text-right">Debit (₱)</div>
                  <div className="col-span-2 text-right">Credit (₱)</div>
                  <div className="col-span-1"></div>
                </div>

                {jevLines.map((line, i) => {
                  const q = line.account_name.trim().toLowerCase();
                  const filteredOpts = accountOptions
                    .filter((o) =>
                      q
                        ? o.account_title.toLowerCase().includes(q)
                        : o.account_type === line.account_type
                    )
                    .slice(0, 40);
                  const isOpen = openAccountLineIdx === i && filteredOpts.length > 0;
                  return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5 relative" data-account-combo>
                      <input
                        type="text"
                        required
                        placeholder="Select or type account..."
                        value={line.account_name}
                        onFocus={() => setOpenAccountLineIdx(i)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const next = [...jevLines];
                          next[i].account_name = val;
                          const matched = accountOptions.find(
                            (o) => o.account_title.toLowerCase() === val.trim().toLowerCase()
                          );
                          if (matched) {
                            next[i].account_type = matched.account_type;
                          }
                          setJevLines(next);
                          setOpenAccountLineIdx(i);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-on-surface dark:text-white outline-none focus:border-emerald-500"
                      />
                      <div
                        className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-outline-variant/60 bg-white dark:bg-surface-container-high shadow-xl max-h-40 overflow-y-auto origin-top transition-all duration-200 ease-out ${
                          isOpen
                            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                            : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
                        }`}
                      >
                        {filteredOpts.map((opt) => (
                          <button
                            key={`${opt.account_type}-${opt.account_title}`}
                            type="button"
                            onClick={() => {
                              const next = [...jevLines];
                              next[i].account_name = opt.account_title;
                              next[i].account_type = opt.account_type;
                              setJevLines(next);
                              setOpenAccountLineIdx(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                          >
                            <span className="truncate font-semibold text-on-surface dark:text-white">{opt.account_title}</span>
                            <span className="text-[10px] font-bold text-neutral-400 shrink-0">{opt.account_type}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <AnimatedSelect
                        value={line.account_type}
                        onChange={(val) => {
                          const next = [...jevLines];
                          next[i].account_type = val;
                          setJevLines(next);
                        }}
                        className="py-2"
                        options={[
                          { value: 'Asset', label: 'Asset' },
                          { value: 'Liabilities', label: 'Liabilities' },
                          { value: 'Equity', label: 'Equity' },
                          { value: 'Revenue', label: 'Revenue' },
                          { value: 'Expense', label: 'Expense' },
                        ]}
                      />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={line.debit}
                      onChange={(e) => {
                        const next = [...jevLines];
                        next[i].debit = e.target.value;
                        if (parseFloat(e.target.value) > 0) next[i].credit = '';
                        setJevLines(next);
                      }}
                      className="col-span-2 px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container font-mono text-right text-on-surface dark:text-white outline-none focus:border-emerald-500"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={line.credit}
                      onChange={(e) => {
                        const next = [...jevLines];
                        next[i].credit = e.target.value;
                        if (parseFloat(e.target.value) > 0) next[i].debit = '';
                        setJevLines(next);
                      }}
                      className="col-span-2 px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container font-mono text-right text-on-surface dark:text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      disabled={jevLines.length <= 2}
                      onClick={() => setJevLines(jevLines.filter((_, idx) => idx !== i))}
                      className="col-span-1 flex items-center justify-center p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer"
                      title="Remove line"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-surface-container border border-outline-variant/60 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <span>Total Debit: <strong className="text-emerald-600 dark:text-emerald-400">{fmt(modalTotals.debit)}</strong></span>
                <span>Total Credit: <strong className="text-sky-600 dark:text-sky-400">{fmt(modalTotals.credit)}</strong></span>
                {modalTotals.debit === 0 && modalTotals.credit === 0 ? (
                  <span className="text-neutral-400 font-sans font-semibold">Enter debit &amp; credit amounts</span>
                ) : Math.abs(modalTotals.diff) < 0.01 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Balanced</span>
                ) : (
                  <span className="text-rose-500 font-bold">Variance: {fmt(Math.abs(modalTotals.diff))}</span>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJevModalOpen(false)}
                  className="px-5 py-2 rounded-full border border-outline-variant text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={jevSubmitting || modalTotals.debit <= 0 || Math.abs(modalTotals.diff) >= 0.01}
                  className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {jevSubmitting ? 'Posting...' : 'Post Journal Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
