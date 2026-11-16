'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Upload,
  Plus,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  ExternalLink,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Edit3
} from 'lucide-react';

export interface BankReconEntry {
  id: string;
  db_id?: number | null;
  date: string;
  month: number;
  voucher_no: string;
  raw_voucher_no?: string;
  check_no?: string | null;
  depositor_payee: string;
  particulars: string;
  withdrawal: number;
  deposit: number;
  balance: number;
  source: 'check_voucher' | 'collection' | 'imported' | 'manual';
  voucher_id?: string | null;
  or_no?: string | null;
}

export interface BankLedgerData {
  bank: 'BDO' | 'MBTC';
  beginning_balance: number;
  beginning_balance_id: number | null;
  total_deposits: number;
  total_withdrawals: number;
  ending_balance: number;
  monthly: { deposits: number; withdrawals: number; ending_balance: number }[];
  entries: BankReconEntry[];
}

interface BankReconResponse {
  success: boolean;
  year: number;
  banks: {
    BDO: BankLedgerData;
    MBTC: BankLedgerData;
  };
}

interface ParsedImportRow {
  tx_date: string;
  voucher_no: string;
  depositor_payee: string;
  particulars: string;
  withdrawal: number;
  deposit: number;
}

interface Props {
  initialYear: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const peso = (n: number) => {
  const isNeg = n < -0.004;
  const abs = Math.abs(n || 0);
  const str = `₱${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return isNeg ? `(${str})` : str;
};

const parseExcelDateValue = (raw: any, fallbackYear: number): string => {
  if (typeof raw === 'number' && raw > 20000 && raw < 80000) {
    const dt = new Date(Math.round((raw - 25569) * 86400 * 1000));
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }
  const s = String(raw || '').trim();
  if (!s) return `${fallbackYear}-01-01`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdy) {
    const mm = mdy[1].padStart(2, '0');
    const dd = mdy[2].padStart(2, '0');
    const yy = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
    return `${yy}-${mm}-${dd}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return `${fallbackYear}-01-01`;
};

const parseNum = (v: any): number => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const clean = String(v || '').replace(/[₱,\s]/g, '');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

export default function BankReconTab({ initialYear }: Props) {
  const router = useRouter();
  const [year, setYear] = useState<number>(() => Math.max(2025, initialYear));
  const [activeBank, setActiveBank] = useState<'BDO' | 'MBTC'>('BDO');
  const [selectedMonth, setSelectedMonth] = useState<number | 'ytd'>('ytd');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'check_voucher' | 'collection' | 'imported'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<BankReconResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Import modal state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [importBank, setImportBank] = useState<'BDO' | 'MBTC'>('BDO');
  const [importBegBal, setImportBegBal] = useState<string>('');
  const [importRows, setImportRows] = useState<ParsedImportRow[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Beginning Balance / Manual Entry modal
  const [isBegBalOpen, setIsBegBalOpen] = useState(false);
  const [begBalValue, setBegBalValue] = useState('');
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    tx_date: `${initialYear}-01-02`,
    voucher_no: '',
    depositor_payee: '',
    particulars: '',
    withdrawal: '',
    deposit: ''
  });
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  const fetchRecon = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reports/bank-recon', { params: { year, _t: Date.now() } });
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load Bank Recon ledger.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchRecon();
  }, [fetchRecon]);

  const currentLedger = data?.banks?.[activeBank] || null;

  const openingBalanceForView = useMemo(() => {
    if (!currentLedger) return 0;
    if (selectedMonth === 'ytd' || selectedMonth === 0) return currentLedger.beginning_balance;
    return currentLedger.monthly[selectedMonth - 1]?.ending_balance ?? currentLedger.beginning_balance;
  }, [currentLedger, selectedMonth]);

  const filteredEntries = useMemo(() => {
    if (!currentLedger) return [];
    const q = searchQuery.toLowerCase().trim();
    return currentLedger.entries.filter(e => {
      if (selectedMonth === 'ytd') {
        if (year === 2026 && e.month > 10) return false;
      } else if (e.month !== selectedMonth) {
        return false;
      }
      if (sourceFilter === 'imported') {
        if (e.source !== 'imported' && e.source !== 'manual') return false;
      } else if (sourceFilter !== 'all' && e.source !== sourceFilter) {
        return false;
      }
      if (!q) return true;
      return (
        e.date.toLowerCase().includes(q) ||
        e.voucher_no.toLowerCase().includes(q) ||
        e.depositor_payee.toLowerCase().includes(q) ||
        e.particulars.toLowerCase().includes(q)
      );
    });
  }, [currentLedger, selectedMonth, sourceFilter, searchQuery, year]);

  const viewTotals = useMemo(() => {
    const deposits = filteredEntries.reduce((s, e) => s + e.deposit, 0);
    const withdrawals = filteredEntries.reduce((s, e) => s + e.withdrawal, 0);
    const ending =
      selectedMonth === 'ytd'
        ? (currentLedger?.ending_balance ?? 0)
        : (currentLedger?.monthly?.[selectedMonth]?.ending_balance ?? openingBalanceForView);
    return { deposits, withdrawals, ending };
  }, [filteredEntries, selectedMonth, currentLedger, openingBalanceForView]);

  const parseSheetIntoRows = useCallback((wb: XLSX.WorkBook, sheetName: string, targetBank: 'BDO' | 'MBTC') => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rawGrid = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

    // Check if sheet has side-by-side BDO (left) and MBTC (right) blocks
    let bankAnchorCol = -1;
    for (let r = 0; r < Math.min(rawGrid.length, 6); r++) {
      const row = rawGrid[r] || [];
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '').trim().toLowerCase();
        if (targetBank === 'MBTC' && (cell === 'mbtc' || cell.includes('metrobank'))) {
          bankAnchorCol = c;
          break;
        }
        if (targetBank === 'BDO' && cell === 'bdo') {
          bankAnchorCol = c;
          break;
        }
      }
      if (bankAnchorCol !== -1) break;
    }

    // Locate header row containing Withdrawal / Deposit / Date within the target bank's column block
    let headerIdx = -1;
    let blockStart = bankAnchorCol !== -1 ? Math.max(0, bankAnchorCol - 2) : 0;
    let blockEnd = 999;
    let colDate = 0;
    let colVoucher = 1;
    let colWithdrawal = 2;
    let colDepositor = 3;
    let colDeposit = 4;

    for (let r = 0; r < Math.min(rawGrid.length, 15); r++) {
      const row = (rawGrid[r] || []).map((c: any) => String(c || '').trim().toLowerCase());
      const withdrawalCols: number[] = [];
      row.forEach((c, idx) => {
        if (c === 'withdrawal' || c.includes('withdraw')) withdrawalCols.push(idx);
      });

      if (withdrawalCols.length > 0) {
        let chosenW = withdrawalCols[0];
        if (bankAnchorCol !== -1) {
          chosenW = withdrawalCols.find(idx => idx >= bankAnchorCol - 1) ?? withdrawalCols[withdrawalCols.length - 1];
        } else if (targetBank === 'MBTC' && withdrawalCols.length > 1) {
          chosenW = withdrawalCols[1];
        }

        const sliceStart = Math.max(0, chosenW - 3);
        const nextW = withdrawalCols.find(idx => idx > chosenW);
        const sliceEnd = nextW ? nextW - 3 : row.length;
        const depIdx = row.findIndex((c, idx) => idx >= chosenW && idx <= sliceEnd && c === 'deposit');

        if (depIdx !== -1) {
          headerIdx = r;
          blockStart = sliceStart;
          blockEnd = Math.max(depIdx + 2, sliceEnd);
          const dtIdx = row.findIndex((c, idx) => idx >= sliceStart && idx <= chosenW && c === 'date');
          const vIdx = row.findIndex((c, idx) => idx >= sliceStart && idx <= chosenW && c.includes('voucher'));
          const dprIdx = row.findIndex((c, idx) => idx > chosenW && idx < depIdx && (c.includes('depositor') || c.includes('payee')));
          colDate = dtIdx !== -1 ? dtIdx : chosenW - 2;
          colVoucher = vIdx !== -1 ? vIdx : chosenW - 1;
          colWithdrawal = chosenW;
          colDepositor = dprIdx !== -1 ? dprIdx : chosenW + 1;
          colDeposit = depIdx;
          break;
        }
      }
    }

    const startRow = headerIdx !== -1 ? headerIdx + 1 : 0;
    let detectedBeg = '';
    const parsed: ParsedImportRow[] = [];

    for (let r = startRow; r < rawGrid.length; r++) {
      const row = rawGrid[r] || [];
      const blockSlice = row.slice(blockStart, Math.min(row.length, blockEnd));
      const blockText = blockSlice.map((c: any) => String(c || '')).join(' ').toLowerCase();
      if (blockText.includes('beginning balance') || blockText.includes('balance forwarded')) {
        const nums = blockSlice.map(parseNum).filter((n: number) => n > 0);
        if (nums.length > 0 && !detectedBeg) detectedBeg = String(nums[nums.length - 1]);
        continue;
      }
      const w = parseNum(row[colWithdrawal]);
      const dep = parseNum(row[colDeposit]);
      if (w === 0 && dep === 0) continue;

      const rawDate = row[colDate];
      if (!rawDate && !row[colVoucher] && !row[colDepositor]) continue;

      parsed.push({
        tx_date: parseExcelDateValue(rawDate, year),
        voucher_no: String(row[colVoucher] || '').trim(),
        depositor_payee: String(row[colDepositor] || '').trim() || (w > 0 ? 'Check Voucher Withdrawal' : 'Bank Deposit'),
        particulars: `${sheetName} (${targetBank}) import`,
        withdrawal: Math.round(w * 100) / 100,
        deposit: Math.round(dep * 100) / 100
      });
    }

    setImportBegBal(detectedBeg);
    setImportRows(parsed);
  }, [year]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    setWorkbook(wb);
    setSheetNames(wb.SheetNames);
    const defaultSheet = wb.SheetNames.find(s => /recon/i.test(s)) || wb.SheetNames[0];
    setSelectedSheet(defaultSheet);
    const nextBank: 'BDO' | 'MBTC' = /mbtc|metro/i.test(file.name) ? 'MBTC' : importBank;
    setImportBank(nextBank);
    parseSheetIntoRows(wb, defaultSheet, nextBank);
  };

  const handleConfirmImport = async () => {
    try {
      setIsImporting(true);
      await api.post('/reports/bank-recon/import', {
        bank: importBank,
        year,
        beginning_balance: importBegBal !== '' ? parseFloat(importBegBal) : undefined,
        replace_existing: replaceExisting,
        rows: importRows
      });
      setFeedback({ type: 'success', message: `Imported ${importRows.length} entries into ${importBank} (${year}).` });
      setIsImportOpen(false);
      setActiveBank(importBank);
      await fetchRecon();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Import failed.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveBegBal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingEntry(true);
      await api.post('/reports/bank-recon/entry', {
        bank: activeBank,
        year,
        entry_type: 'beginning_balance',
        amount: parseFloat(begBalValue) || 0
      });
      setIsBegBalOpen(false);
      setFeedback({ type: 'success', message: `Updated ${activeBank} Beginning Balance for ${year}.` });
      await fetchRecon();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update Beginning Balance.' });
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingEntry(true);
      await api.post('/reports/bank-recon/entry', {
        bank: activeBank,
        year,
        entry_type: 'manual',
        tx_date: newEntry.tx_date,
        voucher_no: newEntry.voucher_no,
        depositor_payee: newEntry.depositor_payee,
        particulars: newEntry.particulars,
        withdrawal: parseFloat(newEntry.withdrawal || '0') || 0,
        deposit: parseFloat(newEntry.deposit || '0') || 0
      });
      setIsAddEntryOpen(false);
      setNewEntry({ tx_date: `${year}-01-02`, voucher_no: '', depositor_payee: '', particulars: '', withdrawal: '', deposit: '' });
      setFeedback({ type: 'success', message: `Added manual entry to ${activeBank}.` });
      await fetchRecon();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to add entry.' });
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleDeleteEntry = async (dbId: number) => {
    try {
      await api.delete(`/reports/bank-recon/${dbId}`);
      await fetchRecon();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to delete entry.' });
    }
  };

  const handleOpenSource = (e: BankReconEntry) => {
    if (e.source === 'check_voucher') {
      const p = new URLSearchParams();
      p.set('tab', 'summary');
      if (e.raw_voucher_no) p.set('voucher', e.raw_voucher_no);
      if (e.voucher_id) p.set('id', e.voucher_id);
      p.set('fromReport', 'bank_recon');
      p.set('year', String(year));
      router.push(`/dashboard/disbursement?${p.toString()}`);
    } else if (e.source === 'collection') {
      const p = new URLSearchParams();
      if (e.or_no || e.depositor_payee) p.set('search', e.or_no || e.depositor_payee);
      p.set('fromReport', 'bank_recon');
      p.set('year', String(year));
      router.push(`/dashboard/collection?${p.toString()}`);
    }
  };

  const handleExportExcel = () => {
    if (!currentLedger) return;
    const rows = [
      [`UNIVERSITY OF CEBU-METC MULTIPURPOSE COOPERATIVE`],
      [`BANK RECONCILIATION LEDGER — ${activeBank === 'BDO' ? 'BDO Current Account' : 'Metrobank (MBTC) Current Account'} (${year})`],
      [],
      ['Date', 'Voucher / Ref #', 'Depositor / Payee', 'Particulars / Source', 'Withdrawal', 'Deposit', 'Running Balance'],
      ['', 'BEG-BAL', 'Beginning Balance', selectedMonth === 'ytd' ? 'January 1 Balance' : `Opening Balance (${MONTHS[selectedMonth]})`, '', '', openingBalanceForView],
      ...filteredEntries.map(e => [
        e.date,
        e.voucher_no,
        e.depositor_payee,
        e.particulars,
        e.withdrawal || '',
        e.deposit || '',
        e.balance
      ]),
      [],
      ['TOTALS', '', '', '', viewTotals.withdrawals, viewTotals.deposits, viewTotals.ending]
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${activeBank}_Recon_${year}`);
    XLSX.writeFile(wb, `UC_METC_Bank_Recon_${activeBank}_${year}.xlsx`);
  };

  return (
    <div className="space-y-5 animate-micro-elevate">
      {/* Header Control Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-outline-variant/60 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              University of Cebu-METC Multipurpose Cooperative
            </span>
            <h2 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-600" />
              <span>Bank Reconciliation &amp; Cash-in-Bank Ledger</span>
            </h2>
            <p className="text-xs text-neutral-500">
              Tracks BDO and Metrobank (MBTC) deposits from Collections, withdrawals from Check Vouchers, and imported bank recon entries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="inline-flex items-center rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 p-0.5 text-xs font-bold">
              <button
                type="button"
                disabled={year <= 2025}
                onClick={() => setYear(y => Math.max(2025, y - 1))}
                className="px-2 py-1 hover:text-emerald-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono">{year}</span>
              <button type="button" onClick={() => setYear(y => y + 1)} className="px-2 py-1 hover:text-emerald-700 cursor-pointer">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setImportBank(activeBank); setIsImportOpen(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddEntryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={fetchRecon}
              className="p-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bank Switcher Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:hidden">
            {(['BDO', 'MBTC'] as const).map(code => {
              const b = data.banks[code];
              const isSelected = activeBank === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setActiveBank(code)}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        {code === 'BDO' ? 'BDO Current Account • Loans' : 'Metrobank (MBTC) • Merchandise & Services'}
                      </span>
                      <div className="text-xl font-black font-mono text-neutral-900 dark:text-white mt-0.5">
                        {peso(b.ending_balance)}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      isSelected ? 'bg-emerald-700 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}>
                      {b.entries.length} txns
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-neutral-200/70 dark:border-neutral-800 text-[11px]">
                    <div>
                      <span className="text-neutral-400 block">Beginning</span>
                      <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">{peso(b.beginning_balance)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Deposits (+)</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{peso(b.total_deposits)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block">Withdrawals (−)</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{peso(b.total_withdrawals)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Month Filter Pills + Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 print:hidden">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedMonth('ytd')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedMonth === 'ytd'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
              }`}
            >
              Full Year (JAN–NOV)
            </button>
            {MONTHS_SHORT.slice(0, 11).map((mLabel, idx) => (
              <button
                key={mLabel}
                type="button"
                onClick={() => setSelectedMonth(idx)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedMonth === idx
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
                }`}
              >
                {mLabel}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-xs font-bold"
            >
              <option value="all">All Sources</option>
              <option value="check_voucher">Check Vouchers (Withdrawals)</option>
              <option value="collection">Collections (Deposits)</option>
              <option value="imported">Imported / Manual</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search voucher, SI #, depositor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-xs w-56"
              />
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected Bank Summary Strip */}
      {currentLedger && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-black uppercase text-neutral-500">
                {selectedMonth === 'ytd' ? 'Beginning Balance' : `Opening (${MONTHS[selectedMonth]})`}
              </span>
              <button
                type="button"
                onClick={() => { setBegBalValue(String(currentLedger.beginning_balance)); setIsBegBalOpen(true); }}
                className="text-emerald-600 hover:text-emerald-800 p-1 rounded cursor-pointer print:hidden"
                title="Edit Jan 1 Beginning Balance"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-lg font-black font-mono text-neutral-900 dark:text-white mt-1">
              {peso(openingBalanceForView)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10.5px] font-black uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" /> Deposits (Period)
            </span>
            <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
              {peso(viewTotals.deposits)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10.5px] font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Withdrawals (Period)
            </span>
            <div className="text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
              {peso(viewTotals.withdrawals)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800">
            <span className="text-[10.5px] font-black uppercase text-emerald-800 dark:text-emerald-300">
              Ending Balance ({activeBank})
            </span>
            <div className="text-lg font-black font-mono text-emerald-900 dark:text-emerald-200 mt-1">
              {peso(viewTotals.ending)}
            </div>
          </div>
        </div>
      )}

      {/* Bank Recon Running Ledger Table */}
      <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-outline-variant/60 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#064e3b] text-white text-[10px] font-black uppercase tracking-wider">
              <tr>
                <th className="p-3 whitespace-nowrap">Date</th>
                <th className="p-3 whitespace-nowrap">Voucher / Ref #</th>
                <th className="p-3">Depositor / Payee</th>
                <th className="p-3">Particulars / Source</th>
                <th className="p-3 text-right whitespace-nowrap">Withdrawal (−)</th>
                <th className="p-3 text-right whitespace-nowrap">Deposit (+)</th>
                <th className="p-3 text-right whitespace-nowrap">Running Balance</th>
                <th className="p-3 text-right whitespace-nowrap print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold">
                <td className="p-3 font-mono text-neutral-500">{selectedMonth === 'ytd' ? `${year}-01-01` : `${year}-${String(selectedMonth + 1).padStart(2, '0')}-01`}</td>
                <td className="p-3 font-mono text-emerald-800 dark:text-emerald-300">BEG-BAL</td>
                <td className="p-3">Beginning Balance</td>
                <td className="p-3 text-neutral-500 italic">{activeBank} Opening Balance</td>
                <td className="p-3 text-right font-mono text-neutral-400">—</td>
                <td className="p-3 text-right font-mono text-neutral-400">—</td>
                <td className="p-3 text-right font-mono font-black text-neutral-900 dark:text-white">{peso(openingBalanceForView)}</td>
                <td className="p-3 text-right print:hidden">—</td>
              </tr>

              {loading && !currentLedger ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-500">Loading {activeBank} Bank Recon ledger...</td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-500">
                    No transactions match this filter. Import your Bank Recon Excel/CSV or switch months.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(e => (
                  <tr key={e.id} className="hover:bg-emerald-50/30 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="p-3 font-mono text-[11px] whitespace-nowrap text-neutral-600 dark:text-neutral-400">{e.date}</td>
                    <td className="p-3 font-mono font-bold whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10.5px] ${
                        e.source === 'check_voucher'
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                          : e.source === 'collection'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      }`}>
                        {e.voucher_no || '—'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-neutral-900 dark:text-white">{e.depositor_payee || '—'}</td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-400 max-w-xs truncate" title={e.particulars}>{e.particulars}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {e.withdrawal > 0 ? peso(e.withdrawal) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {e.deposit > 0 ? peso(e.deposit) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-neutral-900 dark:text-white whitespace-nowrap">
                      {peso(e.balance)}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap print:hidden">
                      {(e.source === 'check_voucher' || e.source === 'collection') ? (
                        <button
                          type="button"
                          onClick={() => handleOpenSource(e)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 text-[10.5px] font-bold border border-emerald-300/70 dark:border-emerald-700 cursor-pointer"
                        >
                          <span>{e.source === 'check_voucher' ? 'Open Voucher' : 'Open Receipt'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : e.db_id ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(e.db_id!)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Delete imported/manual entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* IMPORT EXCEL / CSV MODAL */}
      {isImportOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-outline-variant/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-white">Import Bank Recon Excel / CSV</h3>
                <p className="text-xs text-neutral-500">Reads Date, Voucher No., Withdrawal, Depositor, Deposit, and Beginning Balance.</p>
              </div>
              <button type="button" onClick={() => setIsImportOpen(false)} className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Target Bank</label>
                  <select
                    value={importBank}
                    onChange={e => {
                      const nextBank = e.target.value as 'BDO' | 'MBTC';
                      setImportBank(nextBank);
                      if (workbook && selectedSheet) {
                        parseSheetIntoRows(workbook, selectedSheet, nextBank);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-800 font-bold"
                  >
                    <option value="BDO">BDO Current Account (Loans)</option>
                    <option value="MBTC">Metrobank (MBTC) Current Account (Merchandise)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Upload Excel / CSV File</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-700 file:text-white file:font-bold cursor-pointer"
                  />
                </div>
              </div>

              {sheetNames.length > 0 && workbook && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Worksheet / Tab</label>
                    <select
                      value={selectedSheet}
                      onChange={e => {
                        setSelectedSheet(e.target.value);
                        parseSheetIntoRows(workbook, e.target.value, importBank);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-800 font-bold"
                    >
                      {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Beginning Balance (Optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Detected or enter manually"
                      value={importBegBal}
                      onChange={e => setImportBegBal(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-800 font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                />
                <span>Replace previously imported rows for {importBank} ({year})</span>
              </label>

              {importRows.length > 0 && (
                <div className="border border-outline-variant/60 rounded-xl overflow-hidden">
                  <div className="bg-neutral-100 dark:bg-neutral-800 px-3 py-2 font-bold text-[11px]">
                    Preview: {importRows.length} rows detected
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-outline-variant/40">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Voucher #</th>
                          <th className="p-2">Depositor / Payee</th>
                          <th className="p-2 text-right">Withdrawal</th>
                          <th className="p-2 text-right">Deposit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30">
                        {importRows.slice(0, 25).map((r, i) => (
                          <tr key={i}>
                            <td className="p-2 font-mono">{r.tx_date}</td>
                            <td className="p-2 font-mono">{r.voucher_no || '—'}</td>
                            <td className="p-2">{r.depositor_payee}</td>
                            <td className="p-2 text-right font-mono text-rose-600">{r.withdrawal > 0 ? peso(r.withdrawal) : '—'}</td>
                            <td className="p-2 text-right font-mono text-emerald-700">{r.deposit > 0 ? peso(r.deposit) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-outline-variant/60 flex justify-end gap-2">
              <button type="button" onClick={() => setIsImportOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                disabled={isImporting || (importRows.length === 0 && importBegBal === '')}
                onClick={handleConfirmImport}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? 'Importing...' : `Import to ${importBank}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT BEGINNING BALANCE MODAL */}
      {isBegBalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form onSubmit={handleSaveBegBal} className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-neutral-900 dark:text-white">Set {activeBank} Beginning Balance ({year})</h3>
              <button type="button" onClick={() => setIsBegBalOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">January 1 Beginning Balance (₱)</label>
              <input
                type="number"
                step="0.01"
                required
                value={begBalValue}
                onChange={e => setBegBalValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-800 font-mono font-bold text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsBegBalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 cursor-pointer">Cancel</button>
              <button type="submit" disabled={isSavingEntry} className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white cursor-pointer">
                {isSavingEntry ? 'Saving...' : 'Save Balance'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* ADD MANUAL ENTRY MODAL */}
      {isAddEntryOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form onSubmit={handleSaveManualEntry} className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-md w-full p-5 space-y-3 shadow-2xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-neutral-900 dark:text-white">Add {activeBank} Recon Entry</h3>
              <button type="button" onClick={() => setIsAddEntryOpen(false)} className="p-1 rounded-full hover:bg-neutral-100 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Date *</label>
                <input type="date" required value={newEntry.tx_date} onChange={e => setNewEntry(p => ({ ...p, tx_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-800" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Voucher / SI #</label>
                <input type="text" placeholder="e.g. 2025-384" value={newEntry.voucher_no} onChange={e => setNewEntry(p => ({ ...p, voucher_no: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-800" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Depositor / Payee *</label>
              <input type="text" required placeholder="e.g. AIA refund, Enjambre..." value={newEntry.depositor_payee} onChange={e => setNewEntry(p => ({ ...p, depositor_payee: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-800" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Particulars</label>
              <input type="text" placeholder="Optional note" value={newEntry.particulars} onChange={e => setNewEntry(p => ({ ...p, particulars: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-800" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Withdrawal (₱)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={newEntry.withdrawal} onChange={e => setNewEntry(p => ({ ...p, withdrawal: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-800 font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Deposit (₱)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={newEntry.deposit} onChange={e => setNewEntry(p => ({ ...p, deposit: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-800 font-mono" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsAddEntryOpen(false)} className="px-4 py-2 rounded-xl font-bold border border-outline-variant/60 cursor-pointer">Cancel</button>
              <button type="submit" disabled={isSavingEntry} className="px-4 py-2 rounded-xl font-bold bg-emerald-700 text-white cursor-pointer">
                {isSavingEntry ? 'Saving...' : 'Add Entry'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
