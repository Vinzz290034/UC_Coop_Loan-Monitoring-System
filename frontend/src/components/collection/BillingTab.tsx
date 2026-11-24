'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import type { CollectionItem } from '@/types/collection';
import BillingSheetModal from './BillingSheetModal';
import {
  Search,
  FileSpreadsheet,
  Receipt,
  DollarSign,
  CheckCircle2,
  ArrowUpDown,
  RefreshCw,
  FolderOpen,
  ChevronDown,
  Check
} from 'lucide-react';

interface BillingSheetSummary {
  collection_id: string;
  row_count: number;
  sheet_total: number;
  updated_at: string | null;
}

interface BillingTabProps {
  collections: CollectionItem[];
  getDisplayAmount: (item: CollectionItem) => number;
  parseDate: (dateStr?: string) => { year: string | null; month: number | null; dateKey: string | null };
  formatDetails: (item: CollectionItem) => string;
}

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function AnimatedYearSelect({
  value,
  years,
  onChange,
}: {
  value: string;
  years: string[];
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const options = useMemo(
    () => [{ value: 'all', label: 'All Years' }, ...years.map(yr => ({ value: yr, label: yr }))],
    [years]
  );

  const selectedLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div ref={containerRef} className={`relative ${isOpen ? 'z-50' : 'z-10'}`}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all duration-150 cursor-pointer min-w-[96px] ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-surface-container-lowest dark:bg-neutral-800 text-neutral-900 dark:text-white'
            : 'border-outline-variant/60 bg-surface-container-low dark:bg-surface-container hover:border-outline-variant text-neutral-800 dark:text-neutral-200'
        }`}
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-primary dark:text-secondary' : ''
          }`}
        />
      </button>

      <div
        className={`absolute right-0 mt-1.5 w-32 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 shadow-xl py-1 transition-all duration-150 origin-top-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        }`}
      >
        {options.map(opt => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                selected
                  ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary font-bold'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <span>{opt.label}</span>
              {selected && <Check className="w-3.5 h-3.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BillingTab({
  collections,
  getDisplayAmount,
  parseDate,
  formatDetails,
}: BillingTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'or_no' | 'date'>('or_no');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [summaryMap, setSummaryMap] = useState<Record<string, BillingSheetSummary>>({});
  const [activeSheetItem, setActiveSheetItem] = useState<CollectionItem | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/collections/billing-sheets/summary');
      const rows: BillingSheetSummary[] = res.data?.data || [];
      const map: Record<string, BillingSheetSummary> = {};
      for (const r of rows) {
        map[r.collection_id] = r;
      }
      setSummaryMap(map);
    } catch (err) {
      console.error('Failed to fetch billing sheets summary:', err);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const availableYears = useMemo(() => {
    const years = new Set<string>(['2026']);
    for (const c of collections) {
      const parsed = parseDate(c.date);
      if (parsed.year) years.add(parsed.year);
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [collections, parseDate]);

  const monthsWithData = useMemo(() => {
    const set = new Set<number>();
    for (const c of collections) {
      const parsed = parseDate(c.date);
      if (parsed.month !== null && (selectedYear === 'all' || !parsed.year || parsed.year === selectedYear)) {
        set.add(parsed.month);
      }
    }
    return set;
  }, [collections, selectedYear, parseDate]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = collections.filter(item => {
      const parsed = parseDate(item.date);
      if (selectedYear !== 'all' && parsed.year && parsed.year !== selectedYear) return false;
      if (selectedMonth !== 'all' && parsed.month !== null && parsed.month !== Number(selectedMonth)) return false;
      if (q) {
        const details = formatDetails(item).toLowerCase();
        const matches =
          (item.or_no || '').toLowerCase().includes(q) ||
          (item.payor_name || '').toLowerCase().includes(q) ||
          (item.payment_method || '').toLowerCase().includes(q) ||
          details.includes(q);
        if (!matches) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'date') {
        const cmpDate = (b.date || '').localeCompare(a.date || '');
        if (cmpDate !== 0) return sortOrder === 'desc' ? cmpDate : -cmpDate;
      }
      const numA = parseInt((a.or_no || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt((b.or_no || '').replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return sortOrder === 'desc' ? numB - numA : numA - numB;
      return sortOrder === 'desc'
        ? (b.or_no || '').localeCompare(a.or_no || '', undefined, { numeric: true })
        : (a.or_no || '').localeCompare(b.or_no || '', undefined, { numeric: true });
    });

    return list;
  }, [collections, selectedYear, selectedMonth, searchQuery, sortBy, sortOrder, parseDate, formatDetails]);

  const totalBilledAmount = useMemo(
    () => filteredItems.reduce((sum, item) => sum + getDisplayAmount(item), 0),
    [filteredItems, getDisplayAmount]
  );

  const encodedCount = useMemo(
    () => filteredItems.filter(item => (summaryMap[item.id]?.row_count || 0) > 0).length,
    [filteredItems, summaryMap]
  );

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* 3 Billing KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Billing Receipts
            </span>
            <p className="text-2xl font-headline font-black text-neutral-900 dark:text-white">
              {filteredItems.length}
            </p>
            <p className="text-[10px] text-neutral-500">University of Cebu billing ORs</p>
          </div>
          <div className="p-3 bg-primary/10 dark:bg-secondary/10 rounded-2xl text-primary dark:text-secondary">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Billed Amount
            </span>
            <p className="text-2xl font-headline font-black text-emerald-700 dark:text-emerald-400">
              ₱{totalBilledAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-neutral-500">Combined total across filtered receipts</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-700 dark:text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Billing Sheets Encoded
            </span>
            <p className="text-2xl font-headline font-black text-neutral-900 dark:text-white">
              {encodedCount} <span className="text-sm font-semibold text-neutral-400">/ {filteredItems.length}</span>
            </p>
            <p className="text-[10px] text-neutral-500">Click any receipt row to encode or print</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600 dark:text-amber-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Billing Search & Period Filter */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search billing receipts by OR #, period, or details..."
              className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AnimatedYearSelect
              value={selectedYear}
              years={availableYears}
              onChange={setSelectedYear}
            />

            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedYear('2026');
                setSelectedMonth('all');
              }}
              className="p-2.5 rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
              title="Reset filters"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Month Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setSelectedMonth('all')}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              selectedMonth === 'all'
                ? 'bg-primary text-white dark:bg-secondary dark:text-neutral-950 shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/70'
            }`}
          >
            All Months
          </button>
          {MONTH_LABELS.map((label, idx) => {
            const hasData = monthsWithData.has(idx);
            const active = selectedMonth === String(idx);
            return (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedMonth(String(idx))}
                disabled={!hasData && !active}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all inline-flex items-center gap-1 ${
                  active
                    ? 'bg-primary text-white dark:bg-secondary dark:text-neutral-950 shadow-xs cursor-pointer'
                    : hasData
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer'
                    : 'bg-neutral-100/60 dark:bg-neutral-900/40 text-neutral-400 opacity-50 cursor-not-allowed'
                }`}
              >
                <span>{label}</span>
                {hasData && !active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lined-up Billing Receipts Table */}
      <div className="rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low/70 dark:bg-surface-container/70 text-neutral-600 dark:text-neutral-300 font-headline uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-3 w-12 text-center">#</th>
                <th
                  onClick={() => {
                    if (sortBy === 'or_no') setSortOrder(o => (o === 'desc' ? 'asc' : 'desc'));
                    else { setSortBy('or_no'); setSortOrder('desc'); }
                  }}
                  className="py-3.5 px-3 cursor-pointer hover:text-primary select-none whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    OR #
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => {
                    if (sortBy === 'date') setSortOrder(o => (o === 'desc' ? 'asc' : 'desc'));
                    else { setSortBy('date'); setSortOrder('desc'); }
                  }}
                  className="py-3.5 px-3 cursor-pointer hover:text-primary select-none whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Date
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3.5 px-3">Billing Period / Payor</th>
                <th className="py-3.5 px-3">Payment Mode</th>
                <th className="py-3.5 px-3">Details / Particulars</th>
                <th className="py-3.5 px-3 text-right">Billed Amount</th>
                <th className="py-3.5 px-3 text-center">Sheet Status</th>
                <th className="py-3.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center gap-2">
                      <FolderOpen className="w-8 h-8 text-neutral-400" />
                      <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                        No University of Cebu billing receipts found.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const amount = getDisplayAmount(item);
                  const summary = summaryMap[item.id];
                  const rowCount = summary?.row_count || 0;
                  const sheetTotal = summary?.sheet_total || 0;
                  const isMatched = rowCount > 0 && Math.abs(amount - sheetTotal) < 0.01;
                  const details = formatDetails(item);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setActiveSheetItem(item)}
                      className={`${
                        idx % 2 === 1
                          ? 'bg-emerald-50/75 dark:bg-emerald-950/25'
                          : 'bg-white dark:bg-neutral-950'
                      } hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 transition-colors cursor-pointer`}
                    >
                      <td className="py-3.5 px-3 text-center text-neutral-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {item.or_no}
                      </td>
                      <td className="py-3.5 px-3 text-neutral-600 dark:text-neutral-300 whitespace-nowrap tabular-nums">
                        {formatDisplayDate(item.date)}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-neutral-900 dark:text-white">
                        {item.payor_name}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-medium">
                          {item.payment_method || 'Hand in'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-neutral-600 dark:text-neutral-400">
                        {details}
                      </td>
                      <td className="py-3.5 px-3 text-right font-headline font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap tabular-nums">
                        ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {rowCount > 0 ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isMatched
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {isMatched ? 'Matched' : 'Draft'} • {rowCount} row{rowCount === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                            Not Encoded
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setActiveSheetItem(item);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Open Sheet</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-outline-variant/60 bg-surface-container-low/80 dark:bg-surface-container/80 font-bold text-neutral-900 dark:text-white">
                  <td colSpan={6} className="py-3.5 px-4 text-right uppercase tracking-wider text-[11px]">
                    Total ({filteredItems.length} Billing Receipt{filteredItems.length === 1 ? '' : 's'})
                  </td>
                  <td className="py-3.5 px-3 text-right font-headline font-black text-sm text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                    ₱{totalBilledAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {activeSheetItem && (
        <BillingSheetModal
          item={activeSheetItem}
          receiptAmount={getDisplayAmount(activeSheetItem)}
          onClose={() => {
            setActiveSheetItem(null);
            fetchSummary();
          }}
        />
      )}
    </div>
  );
}
