'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import type { CollectionItem } from '@/types/collection';
import {
  X,
  Plus,
  Trash2,
  Save,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ClipboardPaste,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';

export interface BillingSheetRow {
  id: string;
  id_no: string;
  last_name: string;
  first_name: string;
  int_calamity: number;
  calamity: number;
  int_emer: number;
  emer: number;
  int_ce: number;
  ce: number;
  int_so: number;
  so: number;
  int_utility: number;
  utility: number;
  petty_cash: number;
  int_petty_cash: number;
  int_reg: number;
  reg: number;
  fines: number;
  fixed_deposit: number;
  custom?: Record<string, number>;
}

export interface CustomBillingColumn {
  key: string;
  label: string;
}

export interface BillingSheetHeader {
  billing_year: string;
  period_label: string;
  to_name: string;
  to_title: string;
  from_name: string;
  re_subject: string;
  date_label: string;
  intro_period: string;
  prepared_by_name?: string;
  prepared_by_title?: string;
  approved_by_name?: string;
  approved_by_title?: string;
  custom_columns?: CustomBillingColumn[];
  column_order?: string[];
}

type NumericFieldKey = Exclude<keyof BillingSheetRow, 'id' | 'id_no' | 'last_name' | 'first_name' | 'custom'>;

const NUMERIC_COLUMNS: { key: NumericFieldKey; label: string; group?: string }[] = [
  { key: 'int_calamity', label: 'Int', group: 'Calamity' },
  { key: 'calamity', label: 'Calamity', group: 'Calamity' },
  { key: 'int_emer', label: 'Int', group: 'Emer' },
  { key: 'emer', label: 'Emer', group: 'Emer' },
  { key: 'int_ce', label: 'Int', group: 'CE' },
  { key: 'ce', label: 'CE', group: 'CE' },
  { key: 'int_so', label: 'Int', group: 'SO' },
  { key: 'so', label: 'SO', group: 'SO' },
  { key: 'int_utility', label: 'Int', group: 'Utility' },
  { key: 'utility', label: 'Utility', group: 'Utility' },
  { key: 'int_petty_cash', label: 'Int', group: 'Petty Cash' },
  { key: 'petty_cash', label: 'Petty cash', group: 'Petty Cash' },
  { key: 'int_reg', label: 'Int', group: 'Reg' },
  { key: 'reg', label: 'Reg', group: 'Reg' },
  { key: 'fines', label: 'FINES' },
  { key: 'fixed_deposit', label: 'FIXED DEPOSIT' },
];

const createEmptyRow = (): BillingSheetRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  id_no: '',
  last_name: '',
  first_name: '',
  int_calamity: 0,
  calamity: 0,
  int_emer: 0,
  emer: 0,
  int_ce: 0,
  ce: 0,
  int_so: 0,
  so: 0,
  int_utility: 0,
  utility: 0,
  petty_cash: 0,
  int_petty_cash: 0,
  int_reg: 0,
  reg: 0,
  fines: 0,
  fixed_deposit: 0,
});

const getRowTotal = (row: BillingSheetRow): number => {
  const baseSum = NUMERIC_COLUMNS.reduce((sum, col) => sum + (Number(row[col.key]) || 0), 0);
  const customSum = Object.values(row.custom || {}).reduce((sum, v) => sum + (Number(v) || 0), 0);
  return baseSum + customSum;
};

const formatMoney = (val: number): string => {
  if (!val || Math.abs(val) < 0.005) return '';
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatMoneyAlways = (val: number): string =>
  (Number(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toIsoDateString(raw: string): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDateFromIso(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

interface BillingMemberOption {
  id: string;
  last_name: string;
  first_name: string;
  member_no: string;
}

function MemberNameDropdownCell({
  value,
  field,
  members,
  onChangeText,
  onSelectMember,
  bold = false,
}: {
  value: string;
  field: 'last_name' | 'first_name';
  members: BillingMemberOption[];
  onChangeText: (val: string) => void;
  onSelectMember: (member: BillingMemberOption) => void;
  bold?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 240,
  });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - 260),
      width: Math.max(rect.width, 240),
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };
    const handleScrollOrResize = () => updateCoords();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return members.slice(0, 60);
    return members
      .filter(m => {
        const target = field === 'last_name' ? m.last_name : m.first_name;
        const full = `${m.last_name} ${m.first_name}`;
        return (
          target.toLowerCase().includes(q) ||
          full.toLowerCase().includes(q) ||
          m.member_no.toLowerCase().includes(q)
        );
      })
      .slice(0, 60);
  }, [members, value, field]);

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <input
        type="text"
        value={value}
        onFocus={() => {
          updateCoords();
          setIsOpen(true);
        }}
        onChange={e => {
          onChangeText(e.target.value);
          if (!isOpen) {
            updateCoords();
            setIsOpen(true);
          }
        }}
        className={`w-full pl-2 pr-6 py-1.5 rounded bg-transparent focus:bg-primary/5 dark:focus:bg-secondary/10 focus:outline-none uppercase text-xs ${
          bold ? 'font-semibold' : ''
        }`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          if (!isOpen) updateCoords();
          setIsOpen(prev => !prev);
        }}
        className="absolute right-0.5 p-0.5 rounded text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
        title="Select from Membership list"
      >
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`}
        />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            className="fixed z-1200 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-150"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-neutral-400 text-center">
                No matching members
              </div>
            ) : (
              filtered.map(m => {
                const isSelected =
                  m.last_name.toLowerCase() === value.trim().toLowerCase() ||
                  m.first_name.toLowerCase() === value.trim().toLowerCase();
                return (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault();
                      onSelectMember(m);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-[11px] flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold'
                        : 'text-neutral-800 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    <span className="truncate uppercase">
                      <span className="font-bold">{m.last_name}</span>
                      {m.first_name ? `, ${m.first_name}` : ''}
                    </span>
                    {m.member_no && (
                      <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                        {m.member_no}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

function NumericAmountCell({
  value,
  onChangeValue,
}: {
  value: number;
  onChangeValue: (raw: string) => void;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState(() => (value ? String(value) : ''));

  useEffect(() => {
    if (!isFocused) {
      setDraft(value ? formatMoney(value) : '');
    }
  }, [value, isFocused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={isFocused ? draft : value ? formatMoney(value) : ''}
      onFocus={() => {
        setIsFocused(true);
        setDraft(value ? String(value) : '');
      }}
      onBlur={() => {
        setIsFocused(false);
      }}
      onChange={e => {
        let cleaned = e.target.value.replace(/[^0-9.]/g, '');
        const firstDot = cleaned.indexOf('.');
        if (firstDot !== -1) {
          const dec = cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
          cleaned = cleaned.slice(0, firstDot + 1) + dec;
        }
        setDraft(cleaned);
        onChangeValue(cleaned);
      }}
      className="w-full min-w-[78px] px-2 py-1.5 rounded bg-transparent focus:bg-primary/5 dark:focus:bg-secondary/10 focus:outline-none text-right tabular-nums text-xs"
    />
  );
}

const BILLING_YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => String(new Date().getFullYear() - 3 + i));

function BillingYearSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (year: string) => void;
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

  const options = useMemo(() => {
    if (value && !BILLING_YEAR_OPTIONS.includes(value)) {
      return [value, ...BILLING_YEAR_OPTIONS];
    }
    return BILLING_YEAR_OPTIONS;
  }, [value]);

  return (
    <div ref={containerRef} className={`relative ${isOpen ? 'z-50' : 'z-10'}`}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all duration-150 cursor-pointer ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white'
            : 'border-outline-variant/60 bg-white dark:bg-neutral-950 hover:border-outline-variant text-neutral-900 dark:text-white'
        }`}
      >
        <span>{value || new Date().getFullYear()}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-primary dark:text-secondary' : ''
          }`}
        />
      </button>

      <div
        className={`absolute left-0 mt-1.5 w-28 max-h-52 overflow-y-auto rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 shadow-xl py-1 transition-all duration-150 origin-top ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        }`}
      >
        {options.map(yr => {
          const selected = yr === value;
          return (
            <button
              key={yr}
              type="button"
              onClick={() => {
                onChange(yr);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                selected
                  ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary font-bold'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <span>{yr}</span>
              {selected && <Check className="w-3.5 h-3.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function extractDefaultHeader(item: CollectionItem): BillingSheetHeader {
  const rawDate = item.date || '';
  const d = rawDate ? new Date(rawDate) : new Date();
  const isValidDate = !Number.isNaN(d.getTime());
  const year = isValidDate ? String(d.getFullYear()) : String(new Date().getFullYear());
  const formattedDate = isValidDate
    ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : rawDate;

  const name = item.payor_name || '';
  const parenMatch = name.match(/\(([^)]+)\)/);
  let period = parenMatch ? parenMatch[1].replace(/billing/i, '').trim() : '';
  if (!period && isValidDate) {
    period = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  }
  const periodUpper = period.toUpperCase() || `BILLING ${year}`;

  return {
    billing_year: year,
    period_label: periodUpper,
    to_name: 'MR. CARL TECSON, CPA',
    to_title: 'Cash-Accounting Head',
    from_name: 'UC-METC Multipurpose Cooperative',
    re_subject: `Billing / Collection List for ${periodUpper}`,
    date_label: formattedDate,
    intro_period: period || formattedDate,
    prepared_by_name: 'VANESSA MAE A. MONDRANO',
    prepared_by_title: 'Loan & Insurance-in-charge',
    approved_by_name: 'DR. MICHELLE M. PABLE',
    approved_by_title: 'Manager, UC-METC MPC',
  };
}

interface BillingSheetModalProps {
  item: CollectionItem;
  receiptAmount: number;
  onClose: () => void;
}

export default function BillingSheetModal({ item, receiptAmount, onClose }: BillingSheetModalProps) {
  const [isEntered, setIsEntered] = useState(false);
  const [header, setHeader] = useState<BillingSheetHeader>(() => extractDefaultHeader(item));
  const [rows, setRows] = useState<BillingSheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [addColEntered, setAddColEntered] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [includeIntCol, setIncludeIntCol] = useState(false);
  const [draggedColKey, setDraggedColKey] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);
  const [members, setMembers] = useState<BillingMemberOption[]>([]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!showAddColModal) {
      setAddColEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setAddColEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [showAddColModal]);

  useEffect(() => {
    let active = true;
    const loadMembers = async () => {
      try {
        const res = await api.get('/members');
        if (!active) return;
        const data = res.data?.data || [];
        const seen = new Set<string>();
        const list: BillingMemberOption[] = [];
        for (const m of data) {
          const role = String(m.user_role || '').toLowerCase();
          const memberNo = String(m.member_no || m.member_id || '').trim();
          if (role === 'admin' || role === 'staff' || role === 'manager') continue;
          if (memberNo.startsWith('ADM-') || memberNo.startsWith('STF-')) continue;

          const lastName = String(m.last_name || '').trim();
          const firstName = String(m.first_name || '').trim();
          if (!lastName && !firstName) continue;

          const key = `${lastName.toLowerCase()}|${firstName.toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);

          list.push({
            id: String(m.id),
            last_name: lastName.toUpperCase(),
            first_name: firstName.toUpperCase(),
            member_no: memberNo,
          });
        }
        list.sort((a, b) => {
          const cmpLast = a.last_name.localeCompare(b.last_name);
          return cmpLast !== 0 ? cmpLast : a.first_name.localeCompare(b.first_name);
        });
        setMembers(list);
      } catch (err) {
        console.error('Failed to load membership list for billing dropdown:', err);
      }
    };
    loadMembers();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadSheet = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/collections/${item.id}/billing-sheet`);
        if (!active) return;
        const data = res.data?.data;
        if (data?.header && Object.keys(data.header).length > 0) {
          setHeader({ ...extractDefaultHeader(item), ...data.header });
        } else {
          setHeader(extractDefaultHeader(item));
        }
        if (Array.isArray(data?.rows) && data.rows.length > 0) {
          setRows(
            data.rows.map((r: Partial<BillingSheetRow>) => ({
              ...createEmptyRow(),
              ...r,
              id: r.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            }))
          );
        } else {
          setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
        }
      } catch (err) {
        console.error('Failed to load billing sheet:', err);
        if (active) {
          setFeedback({ type: 'error', message: 'Could not load saved billing sheet.' });
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadSheet();
    return () => {
      active = false;
    };
  }, [item]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      r =>
        r.id_no.toLowerCase().includes(q) ||
        r.last_name.toLowerCase().includes(q) ||
        r.first_name.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const columnTotals = useMemo(() => {
    const totals: Record<NumericFieldKey, number> = {
      int_calamity: 0,
      calamity: 0,
      int_emer: 0,
      emer: 0,
      int_ce: 0,
      ce: 0,
      int_so: 0,
      so: 0,
      int_utility: 0,
      utility: 0,
      petty_cash: 0,
      int_petty_cash: 0,
      int_reg: 0,
      reg: 0,
      fines: 0,
      fixed_deposit: 0,
    };
    for (const r of rows) {
      for (const col of NUMERIC_COLUMNS) {
        totals[col.key] += Number(r[col.key]) || 0;
      }
    }
    return totals;
  }, [rows]);

  const customColumns = useMemo(() => header.custom_columns || [], [header.custom_columns]);

  const orderedColumns = useMemo(() => {
    type OrderedCol = { key: string; label: string; group?: string; isCustom: boolean };
    const allCols: OrderedCol[] = [
      ...NUMERIC_COLUMNS.map(c => ({ key: String(c.key), label: c.label, group: c.group, isCustom: false })),
      ...customColumns.map(c => ({ key: c.key, label: c.label, isCustom: true })),
    ];
    const order = header.column_order;
    if (!Array.isArray(order) || order.length === 0) return allCols;
    const byKey = new Map(allCols.map(c => [c.key, c]));
    const result: OrderedCol[] = [];
    const seen = new Set<string>();
    for (const k of order) {
      const col = byKey.get(k);
      if (col && !seen.has(k)) {
        result.push(col);
        seen.add(k);
      }
    }
    for (const col of allCols) {
      if (!seen.has(col.key)) result.push(col);
    }
    return result;
  }, [customColumns, header.column_order]);

  const moveColumnByOffset = (colKey: string, delta: -1 | 1) => {
    const keys = orderedColumns.map(c => c.key);
    const idx = keys.indexOf(colKey);
    const targetIdx = idx + delta;
    if (idx === -1 || targetIdx < 0 || targetIdx >= keys.length) return;
    const next = [...keys];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    setHeader(h => ({ ...h, column_order: next }));
  };

  const reorderColumns = (sourceKey: string, targetKey: string) => {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    const keys = orderedColumns.map(c => c.key);
    const fromIdx = keys.indexOf(sourceKey);
    const toIdx = keys.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...keys];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setHeader(h => ({ ...h, column_order: next }));
  };

  const getColCellValue = (row: BillingSheetRow, col: { key: string; isCustom: boolean }): number =>
    col.isCustom ? Number(row.custom?.[col.key]) || 0 : Number(row[col.key as NumericFieldKey]) || 0;

  const getColFooterTotal = (col: { key: string; isCustom: boolean }): number =>
    col.isCustom
      ? customColumnTotals[col.key] || 0
      : columnTotals[col.key as NumericFieldKey] || 0;

  const customColumnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const col of customColumns) {
      totals[col.key] = 0;
    }
    for (const r of rows) {
      for (const col of customColumns) {
        totals[col.key] = (totals[col.key] || 0) + (Number(r.custom?.[col.key]) || 0);
      }
    }
    return totals;
  }, [rows, customColumns]);

  const grandTotal = useMemo(
    () => rows.reduce((sum, r) => sum + getRowTotal(r), 0),
    [rows]
  );

  const variance = receiptAmount - grandTotal;
  const isBalanced = Math.abs(variance) < 0.01;

  const updateRowField = (rowId: string, field: keyof BillingSheetRow, value: string) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        if (field === 'id_no') {
          return { ...r, id_no: value.replace(/\D/g, '') };
        }
        if (field === 'last_name' || field === 'first_name') {
          return { ...r, [field]: value };
        }
        const cleaned = value.replace(/[^0-9.]/g, '');
        const parsed = cleaned === '' ? 0 : parseFloat(cleaned);
        return { ...r, [field]: Number.isNaN(parsed) ? 0 : parsed };
      })
    );
  };

  const updateCustomField = (rowId: string, colKey: string, value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parsed = cleaned === '' ? 0 : parseFloat(cleaned);
    const num = Number.isNaN(parsed) ? 0 : parsed;
    setRows(prev =>
      prev.map(r =>
        r.id === rowId ? { ...r, custom: { ...(r.custom || {}), [colKey]: num } } : r
      )
    );
  };

  const handleAddCustomColumn = () => {
    const label = newColName.trim();
    if (!label) return;
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'col';
    const stamp = Date.now().toString(36).slice(-4);
    const colsToAdd: CustomBillingColumn[] = [];
    if (includeIntCol) {
      colsToAdd.push({ key: `custom_int_${slug}_${stamp}`, label: 'Int' });
    }
    colsToAdd.push({ key: `custom_${slug}_${stamp}`, label });
    setHeader(h => ({
      ...h,
      custom_columns: [...(h.custom_columns || []), ...colsToAdd],
    }));
    setNewColName('');
    setIncludeIntCol(false);
    setShowAddColModal(false);
  };

  const handleRemoveCustomColumn = (colKey: string) => {
    setHeader(h => ({
      ...h,
      custom_columns: (h.custom_columns || []).filter(c => c.key !== colKey),
    }));
    setRows(prev =>
      prev.map(r => {
        if (!r.custom || !(colKey in r.custom)) return r;
        const nextCustom = { ...r.custom };
        delete nextCustom[colKey];
        return { ...r, custom: nextCustom };
      })
    );
  };

  const selectMemberForRow = (rowId: string, member: BillingMemberOption) => {
    setRows(prev =>
      prev.map(r =>
        r.id === rowId
          ? { ...r, last_name: member.last_name, first_name: member.first_name }
          : r
      )
    );
  };

  const addRows = (count: number) => {
    setRows(prev => [...prev, ...Array.from({ length: count }, () => createEmptyRow())]);
  };

  const removeRow = (rowId: string) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== rowId);
      return next.length > 0 ? next : [createEmptyRow()];
    });
  };

  const handlePasteImport = () => {
    const lines = pasteText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setShowPasteModal(false);
      return;
    }

    const parseNum = (s: string | undefined) => {
      if (!s) return 0;
      const n = parseFloat(s.replace(/[₱,\s]/g, ''));
      return Number.isNaN(n) ? 0 : n;
    };

    const imported: BillingSheetRow[] = lines.map(line => {
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      // Expected order: ID NO, LAST NAME, FIRST NAME, Int, Calamity, Int, Emer, Int, CE, Int, SO, Int, Utility, Petty cash, Int, Int, Reg, FINES, FIXED DEPOSIT
      // Also support optional leading row number if cols[0] is small integer and cols.length >= 19
      let offset = 0;
      if (cols.length >= 20 && /^\d{1,3}$/.test(cols[0].trim())) {
        offset = 1;
      }
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        id_no: (cols[offset] || '').replace(/\D/g, ''),
        last_name: (cols[offset + 1] || '').trim(),
        first_name: (cols[offset + 2] || '').trim(),
        int_calamity: parseNum(cols[offset + 3]),
        calamity: parseNum(cols[offset + 4]),
        int_emer: parseNum(cols[offset + 5]),
        emer: parseNum(cols[offset + 6]),
        int_ce: parseNum(cols[offset + 7]),
        ce: parseNum(cols[offset + 8]),
        int_so: parseNum(cols[offset + 9]),
        so: parseNum(cols[offset + 10]),
        int_utility: parseNum(cols[offset + 11]),
        utility: parseNum(cols[offset + 12]),
        petty_cash: parseNum(cols[offset + 13]),
        int_petty_cash: parseNum(cols[offset + 14]),
        int_reg: parseNum(cols[offset + 15]),
        reg: parseNum(cols[offset + 16]),
        fines: parseNum(cols[offset + 17]),
        fixed_deposit: parseNum(cols[offset + 18]),
      };
    });

    setRows(prev => {
      const nonEmpty = prev.filter(
        r => r.id_no.trim() || r.last_name.trim() || r.first_name.trim() || getRowTotal(r) > 0
      );
      return [...nonEmpty, ...imported];
    });
    setPasteText('');
    setShowPasteModal(false);
    setFeedback({ type: 'success', message: `Imported ${imported.length} row(s) from pasted data.` });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const cleanedRows = rows.filter(
        r => r.id_no.trim() || r.last_name.trim() || r.first_name.trim() || getRowTotal(r) > 0
      );
      await api.put(`/collections/${item.id}/billing-sheet`, {
        header,
        rows: cleanedRows,
      });
      setFeedback({ type: 'success', message: 'Billing sheet saved successfully.' });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error('Failed to save billing sheet:', err);
      setFeedback({
        type: 'error',
        message: err?.response?.data?.error?.message || 'Failed to save billing sheet.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    const nonEmptyRows = rows.filter(
      r => r.id_no.trim() || r.last_name.trim() || r.first_name.trim() || getRowTotal(r) > 0
    );

    const escapeHtml = (str: string) =>
      String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const rowsHtml = nonEmptyRows
      .map((r, idx) => {
        const total = getRowTotal(r);
        return `
          <tr>
            <td class="center">${idx + 1}</td>
            <td class="center mono">${escapeHtml(r.id_no)}</td>
            <td class="name-cell">${escapeHtml(r.last_name.toUpperCase())}</td>
            <td class="name-cell">${escapeHtml(r.first_name.toUpperCase())}</td>
            ${orderedColumns.map(c => `<td class="num">${formatMoney(getColCellValue(r, c))}</td>`).join('')}
            <td class="num bold total-col">${formatMoneyAlways(total)}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>UC Billing Sheet - OR #${escapeHtml(item.or_no)}</title>
          <style>
            @page { size: letter landscape; margin: 10mm 12mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              font-size: 9px;
              line-height: 1.35;
              background: #fff;
            }
            .sheet { width: 100%; }
            .top-meta {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 9.5px;
              font-weight: 700;
              letter-spacing: 0.2px;
              margin-bottom: 4px;
            }
            .coop-header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              margin-bottom: 10px;
            }
            .coop-header-text {
              text-align: center;
            }
            .coop-logo {
              width: 44px;
              height: 44px;
              object-fit: contain;
              border-radius: 9999px;
            }
            .coop-header h2 {
              margin: 0;
              font-size: 13px;
              font-weight: 800;
              color: #065f46;
              letter-spacing: 0.4px;
            }
            .coop-header p {
              margin: 1.5px 0 0;
              font-size: 9px;
              color: #374151;
            }
            .memo {
              margin-bottom: 8px;
              font-size: 9.5px;
              line-height: 1.45;
            }
            .memo-table {
              width: auto;
              border-collapse: collapse;
              margin-bottom: 6px;
            }
            .memo-table td {
              border: none;
              padding: 1px 4px 1px 0;
              vertical-align: top;
              font-size: 9.5px;
            }
            .memo-label {
              width: 48px;
              font-weight: 700;
            }
            .greetings {
              margin: 4px 0 6px;
              font-size: 9.5px;
            }
            table.data-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            table.data-table thead { display: table-header-group; }
            table.data-table tfoot { display: table-row-group; }
            table.data-table tr { page-break-inside: avoid; break-inside: avoid; }
            table.data-table th,
            table.data-table td {
              border: 1px solid #4b5563;
              padding: 3px 3.5px;
              vertical-align: middle;
              overflow: hidden;
            }
            table.data-table th {
              background: #e5e7eb;
              font-weight: 700;
              text-align: center;
              font-size: 8px;
              line-height: 1.2;
              color: #111827;
            }
            table.data-table tbody tr:nth-child(even) td {
              background: #ecfdf5;
            }
            td.center { text-align: center; }
            td.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 8.5px; }
            td.name-cell {
              text-align: left;
              white-space: nowrap;
              text-overflow: ellipsis;
              font-size: 8.5px;
            }
            td.num {
              text-align: right;
              font-variant-numeric: tabular-nums;
              white-space: nowrap;
              font-size: 8.5px;
            }
            td.bold { font-weight: 700; }
            th.total-col, td.total-col { background: #f3f4f6; }
            table.data-table tfoot td {
              background: #e5e7eb;
              font-weight: 700;
              font-size: 8.5px;
              border-top: 1.5px solid #111827;
            }
            .footer-block {
              margin-top: 10px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .remittance-note {
              font-size: 9.5px;
              line-height: 1.5;
            }
            .signatories {
              margin-top: 26px;
              display: flex;
              justify-content: space-between;
              max-width: 720px;
              font-size: 9.5px;
            }
            .sig-line {
              min-width: 210px;
            }
            .sig-name {
              font-weight: 700;
              text-transform: uppercase;
            }
            .sig-title {
              color: #374151;
              font-size: 9px;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="top-meta">
              <span>BILLING ${escapeHtml(header.billing_year)}</span>
              <span>${escapeHtml(header.period_label)}</span>
            </div>
            <div class="coop-header">
              <div class="coop-header-text">
                <h2>UNIVERSITY OF CEBU-METC MULTIPURPOSE COOPERATIVE</h2>
                <p>UCMETC Campus, Alumnos, Mambaling, Cebu City</p>
                <p>Tel. No. 410-8811 local 5155</p>
              </div>
              <img src="${window.location.origin}/Coop.jpeg" alt="UC-METC MPC Logo" class="coop-logo" />
            </div>
            <div class="memo">
              <table class="memo-table">
                <tr>
                  <td class="memo-label">TO</td>
                  <td>: <strong>${escapeHtml(header.to_name)}</strong><br/>&nbsp;&nbsp;${escapeHtml(header.to_title)}</td>
                </tr>
                <tr>
                  <td class="memo-label">FROM</td>
                  <td>: <strong>${escapeHtml(header.from_name)}</strong></td>
                </tr>
                <tr>
                  <td class="memo-label">RE</td>
                  <td>: <strong>${escapeHtml(header.re_subject)}</strong></td>
                </tr>
                <tr>
                  <td class="memo-label">DATE</td>
                  <td>: <strong>${escapeHtml(header.date_label)}</strong></td>
                </tr>
              </table>
              <div class="greetings">
                <div>Greetings!</div>
                <div>This is to respectfully endorse to your office the METC Coop billing or collection list of employees who will be deducted from their salary for the payroll period of <strong>${escapeHtml(header.intro_period)}</strong>, to wit:</div>
              </div>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:2.3%;">#</th>
                  <th style="width:4.8%;">ID NO.</th>
                  <th colspan="2" style="width:15.5%;">NAME</th>
                  ${orderedColumns.map(c => `<th style="width:4.45%;">${escapeHtml(c.label)}</th>`).join('')}
                  <th class="total-col" style="width:6.2%;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || `<tr><td colspan="${orderedColumns.length + 5}" class="center" style="padding:12px;color:#6b7280;">No billing entries</td></tr>`}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" class="center">TOTAL (${nonEmptyRows.length} Employee${nonEmptyRows.length === 1 ? '' : 's'})</td>
                  ${orderedColumns.map(c => `<td class="num">${formatMoney(getColFooterTotal(c))}</td>`).join('')}
                  <td class="num bold">${formatMoneyAlways(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
            <div class="footer-block">
              <div class="remittance-note">
                <div>Kindly have the remittance check payable to <strong>University of Cebu-METC Multipurpose Cooperative</strong>.</div>
                <div>Thank you.</div>
              </div>
              <div class="signatories">
                <div class="sig-line">
                  <div class="sig-name">${escapeHtml(header.prepared_by_name || 'VANESSA MAE A. MONDRANO')}</div>
                  <div class="sig-title">${escapeHtml(header.prepared_by_title || 'Loan & Insurance-in-charge')}</div>
                </div>
                <div class="sig-line">
                  <div class="sig-name">${escapeHtml(header.approved_by_name || 'DR. MICHELLE M. PABLE')}</div>
                  <div class="sig-title">${escapeHtml(header.approved_by_title || 'Manager, UC-METC MPC')}</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const existingFrame = document.getElementById('uc-billing-print-frame');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'uc-billing-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!frameDoc || !iframe.contentWindow) {
      iframe.remove();
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => iframe.remove(), 1500);
      }
    };

    const logoImg = frameDoc.querySelector('img.coop-logo') as HTMLImageElement | null;
    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 80);
      logoImg.onerror = () => setTimeout(triggerPrint, 80);
      setTimeout(triggerPrint, 1200);
    } else {
      setTimeout(triggerPrint, 200);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-1000 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs transition-opacity duration-200 ease-out ${
        isEntered ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-[98vw] xl:max-w-[1460px] max-h-[94vh] flex flex-col rounded-3xl bg-white dark:bg-neutral-950 border border-outline-variant/60 shadow-2xl overflow-hidden transition-all duration-200 ease-out ${
          isEntered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-3'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Modal Action Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-outline-variant/50 bg-neutral-50/90 dark:bg-neutral-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-headline font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <span>UC Billing Endorsement Sheet</span>
                <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary">
                  OR #{item.or_no}
                </span>
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-md">
                {item.payor_name}
              </p>
            </div>
          </div>

          {/* Reconciliation Pill */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-3.5 py-2 rounded-2xl bg-white dark:bg-neutral-950 border border-outline-variant/60 text-xs">
            <div>
              <span className="text-neutral-400 mr-1.5">Receipt:</span>
              <span className="font-bold text-neutral-900 dark:text-white">₱{formatMoneyAlways(receiptAmount)}</span>
            </div>
            <div className="h-3.5 w-px bg-outline-variant/60" />
            <div>
              <span className="text-neutral-400 mr-1.5">Sheet Total:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">₱{formatMoneyAlways(grandTotal)}</span>
            </div>
            <div className="h-3.5 w-px bg-outline-variant/60" />
            <div className={`font-bold ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isBalanced
                ? 'Matched'
                : `Diff: ₱${formatMoneyAlways(Math.abs(variance))}`}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
              title="Paste rows directly from Excel or CSV"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paste Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white dark:bg-secondary dark:text-neutral-950 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save Sheet'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-500 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Scrollable Sheet Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-500">
              <Loader2 className="w-7 h-7 animate-spin text-primary dark:text-secondary" />
              <span className="text-xs font-semibold">Loading billing sheet...</span>
            </div>
          ) : (
            <>
              {/* Official Endorsement Header Card */}
              <div className="p-4 sm:p-5 rounded-2xl border border-outline-variant/60 bg-neutral-50/70 dark:bg-neutral-900/50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-300">
                  <div className="flex items-center gap-1.5">
                    <span>BILLING</span>
                    <BillingYearSelect
                      value={header.billing_year}
                      onChange={yr => setHeader(h => ({ ...h, billing_year: yr }))}
                    />
                  </div>
                  <div className="text-center flex-1 min-w-[260px]">
                    <div className="text-sm font-headline font-black text-emerald-800 dark:text-emerald-400 tracking-wide">
                      UNIVERSITY OF CEBU-METC MULTIPURPOSE COOPERATIVE
                    </div>
                    <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      UCMETC Campus, Alumnos, Mambaling, Cebu City • Tel. No. 410-8811 local 5155
                    </div>
                  </div>
                  <input
                    type="text"
                    value={header.period_label}
                    onChange={e => setHeader(h => ({ ...h, period_label: e.target.value }))}
                    placeholder="NOVEMBER 16-30"
                    className="w-44 text-right px-2 py-0.5 rounded-md border border-outline-variant/60 bg-white dark:bg-neutral-950 text-xs font-bold uppercase"
                  />
                </div>

                {/* Memo Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2 border-t border-outline-variant/40">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-12 font-bold text-neutral-500">TO:</span>
                      <input
                        type="text"
                        value={header.to_name}
                        onChange={e => setHeader(h => ({ ...h, to_name: e.target.value }))}
                        className="flex-1 px-2.5 py-1 rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-950 font-semibold"
                      />
                      <input
                        type="text"
                        value={header.to_title}
                        onChange={e => setHeader(h => ({ ...h, to_title: e.target.value }))}
                        className="w-40 px-2.5 py-1 rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-300"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-12 font-bold text-neutral-500">FROM:</span>
                      <input
                        type="text"
                        value={header.from_name}
                        onChange={e => setHeader(h => ({ ...h, from_name: e.target.value }))}
                        className="flex-1 px-2.5 py-1 rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-950 font-semibold"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-12 font-bold text-neutral-500">RE:</span>
                      <input
                        type="text"
                        value={header.re_subject}
                        onChange={e => setHeader(h => ({ ...h, re_subject: e.target.value }))}
                        className="flex-1 px-2.5 py-1 rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-950 font-semibold"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-12 font-bold text-neutral-500">DATE:</span>
                      <input
                        type="date"
                        value={toIsoDateString(header.date_label)}
                        onChange={e => {
                          const iso = e.target.value;
                          const formatted = iso ? formatDisplayDateFromIso(iso) : '';
                          const yearPart = iso ? iso.slice(0, 4) : '';
                          setHeader(h => ({
                            ...h,
                            date_label: formatted,
                            ...(yearPart ? { billing_year: yearPart } : {}),
                          }));
                        }}
                        className="w-44 px-2.5 py-1 rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-950 font-semibold cursor-pointer"
                      />
                      <span className="text-neutral-400">Period:</span>
                      <input
                        type="text"
                        value={header.intro_period}
                        onChange={e => setHeader(h => ({ ...h, intro_period: e.target.value }))}
                        className="flex-1 px-2.5 py-1 rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-950"
                      />
                    </div>
                  </div>
                </div>

                {/* Greetings Text */}
                <div className="pt-2 border-t border-outline-variant/30 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  <p className="font-semibold">Greetings!</p>
                  <p>
                    This is to respectfully endorse to your office the METC Coop billing or collection list of employees who will be deducted from their salary for the payroll period of{' '}
                    <span className="font-bold text-neutral-900 dark:text-white">{header.intro_period || '—'}</span>, to wit:
                  </p>
                </div>
              </div>

              {/* Row Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filter rows by ID No. or Name..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-outline-variant/60 bg-neutral-50 dark:bg-neutral-900 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addRows(1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Row</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addRows(5)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add 5 Rows</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddColModal(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-600/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Column</span>
                  </button>
                </div>
              </div>

              {/* Structured Accounting Table */}
              <div className="rounded-2xl border border-outline-variant/70 overflow-x-auto shadow-xs">
                <table className="w-full border-collapse text-xs min-w-[1720px]">
                  <thead className="bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 sticky top-0 z-10">
                    <tr>
                      <th className="border-b border-r border-outline-variant/60 px-2 py-2.5 w-10 min-w-[40px] text-center font-bold">#</th>
                      <th className="border-b border-r border-outline-variant/60 px-2 py-2.5 w-24 min-w-[92px] text-center font-bold whitespace-nowrap">ID NO.</th>
                      <th className="border-b border-r border-outline-variant/60 px-2.5 py-2.5 w-40 min-w-[160px] text-left font-bold whitespace-nowrap">LAST NAME</th>
                      <th className="border-b border-r border-outline-variant/60 px-2.5 py-2.5 w-40 min-w-[160px] text-left font-bold whitespace-nowrap">FIRST NAME</th>
                      {orderedColumns.map((col, colIdx) => (
                        <th
                          key={col.key}
                          draggable
                          onDragStart={() => setDraggedColKey(col.key)}
                          onDragOver={e => {
                            e.preventDefault();
                            if (draggedColKey && draggedColKey !== col.key) {
                              setDragOverColKey(col.key);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverColKey === col.key) setDragOverColKey(null);
                          }}
                          onDrop={e => {
                            e.preventDefault();
                            if (draggedColKey) reorderColumns(draggedColKey, col.key);
                            setDraggedColKey(null);
                            setDragOverColKey(null);
                          }}
                          onDragEnd={() => {
                            setDraggedColKey(null);
                            setDragOverColKey(null);
                          }}
                          className={`group border-b border-r border-outline-variant/60 px-1.5 py-2 min-w-[84px] text-center font-bold whitespace-nowrap select-none cursor-grab active:cursor-grabbing transition-colors ${
                            dragOverColKey === col.key
                              ? 'bg-emerald-200/80 dark:bg-emerald-900/60'
                              : col.isCustom
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/30'
                              : ''
                          }`}
                          title={col.group ? `${col.group} — ${col.label} (Drag or use arrows to move)` : `${col.label} (Drag or use arrows to move)`}
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                moveColumnByOffset(col.key, -1);
                              }}
                              disabled={colIdx === 0}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-0 cursor-pointer transition-opacity"
                              title="Move left"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                            <span>{col.label}</span>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                moveColumnByOffset(col.key, 1);
                              }}
                              disabled={colIdx === orderedColumns.length - 1}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-0 cursor-pointer transition-opacity"
                              title="Move right"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                            {col.isCustom && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleRemoveCustomColumn(col.key);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500/15 text-neutral-400 hover:text-rose-600 transition-opacity cursor-pointer"
                                title={`Remove ${col.label} column`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="border-b border-r border-outline-variant/60 px-3 py-2.5 min-w-[105px] text-right font-black bg-neutral-200 dark:bg-neutral-800 md:sticky md:right-0 md:z-20 md:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                        TOTAL
                      </th>
                      <th className="border-b border-outline-variant/60 px-2 py-2.5 w-10 min-w-[40px] text-center" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 bg-white dark:bg-neutral-950">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={orderedColumns.length + 6}
                          className="py-10 text-center text-xs text-neutral-400 dark:text-neutral-500"
                        >
                          {rows.length === 0
                            ? 'No billing rows yet. Click "+ Add Row" or "Paste Excel" to enter employee deductions.'
                            : 'No rows match your search filter.'}
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, idx) => {
                      const rowTotal = getRowTotal(row);
                      return (
                        <tr
                          key={row.id}
                          className={`${
                            idx % 2 === 1
                              ? 'bg-emerald-50/75 dark:bg-emerald-950/25'
                              : 'bg-white dark:bg-neutral-950'
                          } hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 transition-colors`}
                        >
                          <td className="border-r border-outline-variant/40 px-1.5 py-1 text-center text-neutral-400 font-medium">
                            {idx + 1}
                          </td>
                          <td className="border-r border-outline-variant/40 p-0.5">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={row.id_no}
                              onChange={e => updateRowField(row.id, 'id_no', e.target.value)}
                              className="w-full px-1.5 py-1 rounded bg-transparent focus:bg-primary/5 dark:focus:bg-secondary/10 focus:outline-none text-center font-mono text-[11px]"
                            />
                          </td>
                          <td className="border-r border-outline-variant/40 p-0.5">
                            <MemberNameDropdownCell
                              value={row.last_name}
                              field="last_name"
                              members={members}
                              bold={true}
                              onChangeText={val => updateRowField(row.id, 'last_name', val)}
                              onSelectMember={member => selectMemberForRow(row.id, member)}
                            />
                          </td>
                          <td className="border-r border-outline-variant/40 p-0.5">
                            <MemberNameDropdownCell
                              value={row.first_name}
                              field="first_name"
                              members={members}
                              onChangeText={val => updateRowField(row.id, 'first_name', val)}
                              onSelectMember={member => selectMemberForRow(row.id, member)}
                            />
                          </td>
                          {orderedColumns.map(col => (
                            <td key={col.key} className="border-r border-outline-variant/40 p-0.5">
                              <NumericAmountCell
                                value={getColCellValue(row, col)}
                                onChangeValue={raw =>
                                  col.isCustom
                                    ? updateCustomField(row.id, col.key, raw)
                                    : updateRowField(row.id, col.key as NumericFieldKey, raw)
                                }
                              />
                            </td>
                          ))}
                          <td className="border-r border-outline-variant/40 px-3 py-1.5 text-right font-bold tabular-nums text-emerald-700 dark:text-emerald-400 bg-neutral-50 dark:bg-neutral-900 md:sticky md:right-0 md:z-10 md:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]">
                            {formatMoneyAlways(rowTotal)}
                          </td>
                          <td className="px-1 py-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeRow(row.id)}
                              className="p-1 rounded hover:bg-rose-500/10 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Remove row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                  <tfoot className="bg-neutral-100 dark:bg-neutral-900 font-bold text-neutral-900 dark:text-white border-t-2 border-outline-variant/70">
                    <tr>
                      <td colSpan={4} className="border-r border-outline-variant/60 px-3 py-2 text-right uppercase tracking-wider text-[10px]">
                        Grand Total ({rows.length} row{rows.length === 1 ? '' : 's'})
                      </td>
                      {orderedColumns.map(col => (
                        <td key={col.key} className="border-r border-outline-variant/60 px-1.5 py-2 text-right tabular-nums">
                          {formatMoney(getColFooterTotal(col)) || '—'}
                        </td>
                      ))}
                      <td className="border-r border-outline-variant/60 px-3 py-2.5 text-right tabular-nums font-black text-emerald-700 dark:text-emerald-400 bg-neutral-200 dark:bg-neutral-800 md:sticky md:right-0 md:z-10 md:shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                        ₱{formatMoneyAlways(grandTotal)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bottom Formality Text & Signatories */}
              <div className="p-4 sm:p-5 rounded-2xl border border-outline-variant/60 bg-neutral-50/70 dark:bg-neutral-900/50 space-y-5 text-xs">
                <div className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  <p>
                    Kindly have the remittance check payable to{' '}
                    <span className="font-bold text-neutral-900 dark:text-white">
                      University of Cebu-METC Multipurpose Cooperative
                    </span>
                    .
                  </p>
                  <p className="mt-0.5">Thank you.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 max-w-3xl">
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={header.prepared_by_name ?? 'VANESSA MAE A. MONDRANO'}
                      onChange={e => setHeader(h => ({ ...h, prepared_by_name: e.target.value }))}
                      className="w-full px-2 py-1 rounded-lg border border-outline-variant/50 bg-white dark:bg-neutral-950 font-bold uppercase text-neutral-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={header.prepared_by_title ?? 'Loan & Insurance-in-charge'}
                      onChange={e => setHeader(h => ({ ...h, prepared_by_title: e.target.value }))}
                      className="w-full px-2 py-1 rounded-lg border border-outline-variant/40 bg-white dark:bg-neutral-950 text-[11px] text-neutral-600 dark:text-neutral-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={header.approved_by_name ?? 'DR. MICHELLE M. PABLE'}
                      onChange={e => setHeader(h => ({ ...h, approved_by_name: e.target.value }))}
                      className="w-full px-2 py-1 rounded-lg border border-outline-variant/50 bg-white dark:bg-neutral-950 font-bold uppercase text-neutral-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={header.approved_by_title ?? 'Manager, UC-METC MPC'}
                      onChange={e => setHeader(h => ({ ...h, approved_by_title: e.target.value }))}
                      className="w-full px-2 py-1 rounded-lg border border-outline-variant/40 bg-white dark:bg-neutral-950 text-[11px] text-neutral-600 dark:text-neutral-400"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Paste Excel / CSV Modal */}
      {showPasteModal && (
        <div
          className="fixed inset-0 z-1100 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowPasteModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white dark:bg-neutral-950 border border-outline-variant/60 p-5 shadow-2xl space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-headline font-black text-neutral-900 dark:text-white">
                Paste Rows from Excel / CSV
              </h3>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Copy rows directly from Excel (columns: <code>ID NO.</code>, <code>LAST NAME</code>, <code>FIRST NAME</code>, followed by <code>Int, Calamity, Int, Emer, Int, CE, Int, SO, Int, Utility, Petty cash, Int, Int, Reg, FINES, FIXED DEPOSIT</code>; optional leading row # is automatically skipped) and paste below:
            </p>
            <textarea
              rows={8}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="022194&#9;AGUILAR&#9;MAYETT&#9;&#9;&#9;&#9;&#9;&#9;&#9;67.00&#9;1600.63&#9;&#9;&#9;&#9;&#9;350.00&#9;2500.00&#9;&#9;500.00"
              className="w-full p-3 rounded-xl border border-outline-variant/60 bg-neutral-50 dark:bg-neutral-900 text-xs font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasteImport}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white dark:bg-secondary dark:text-neutral-950 cursor-pointer"
              >
                Import Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Column Modal */}
      {showAddColModal && (
        <div
          className={`fixed inset-0 z-1100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200 ease-out ${
            addColEntered ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setShowAddColModal(false)}
        >
          <div
            className={`w-full max-w-md rounded-2xl bg-white dark:bg-neutral-950 border border-outline-variant/60 p-5 shadow-2xl space-y-4 transition-all duration-200 ease-out ${
              addColEntered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-headline font-black text-neutral-900 dark:text-white">
                Add Custom Billing Column
              </h3>
              <button
                type="button"
                onClick={() => setShowAddColModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-600 dark:text-neutral-300 mb-1">
                  Column Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddCustomColumn();
                  }}
                  placeholder="e.g. Rice, Uniform, Locker, Membership"
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => setIncludeIntCol(prev => !prev)}
                className="flex items-center gap-2.5 cursor-pointer text-neutral-700 dark:text-neutral-300 select-none group"
              >
                <span
                  className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all duration-150 active:scale-90 ${
                    includeIntCol
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs scale-100'
                      : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 group-hover:border-emerald-500'
                  }`}
                >
                  <Check
                    className={`w-3 h-3 stroke-[3] transition-all duration-150 ${
                      includeIntCol ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                    }`}
                  />
                </span>
                <span>Include an <strong>Int</strong> column before it</span>
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddColModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomColumn}
                disabled={!newColName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
