'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { Skeleton } from '@/components/ui/Skeleton';
import UnifiedCvLfPrintModal, { getSignatoryTitle } from '@/components/loans/UnifiedCvLfPrintModal';
import {
  FileText,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Printer,
  FileCheck,
  Receipt,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Layers,
  Banknote,
  DollarSign,
  Calendar,
  ChevronUp,
  PieChart,
  Sparkles,
  Edit3,
  FileSpreadsheet,
  Building2,
  ArrowUpDown,
  Filter,
  Eye,
  RotateCcw,
  AlertTriangle,
  FolderOpen,
  Lock,
  Clock,
  Send,
  Check,
  Link2,
  GripVertical,
  Unlock
} from 'lucide-react';

// Tab configuration matching the user spreadsheet structure
export type DisbursementTab =
  | 'summary'
  | 'stl_replenishment'
  | 'revolving_fund_replenishment'
  | 'petty_cash_replenishment'
  | 'merchandise_payment'
  | 'operation_expense'
  | 'services_expense';

interface TabConfig {
  id: DisbursementTab;
  label: string;
  folderFilter: string; // Used for DB query (empty string means all check vouchers)
  defaultCategory: string; // Used when creating new CV
  description: string;
}

export const DISBURSEMENT_TABS: TabConfig[] = [
  {
    id: 'summary',
    label: 'All Vouchers',
    folderFilter: '',
    defaultCategory: 'STL',
    description: 'Master registry of all check vouchers in order across all categories'
  },
  {
    id: 'stl_replenishment',
    label: 'STL Replenishment',
    folderFilter: 'STL',
    defaultCategory: 'STL',
    description: 'Check vouchers for Short Term Loan revolving replenishment'
  },
  {
    id: 'revolving_fund_replenishment',
    label: 'Revolving Fund Replenishment',
    folderFilter: 'Revolving Fund',
    defaultCategory: 'Revolving Fund',
    description: 'Revolving fund check vouchers, liquidations, and expense breakdowns'
  },
  {
    id: 'petty_cash_replenishment',
    label: 'Petty Cash Replenishment',
    folderFilter: 'Petty Cash',
    defaultCategory: 'Petty Cash',
    description: 'Check vouchers for office petty cash replenishment'
  },
  {
    id: 'merchandise_payment',
    label: 'Merchandise Payment',
    folderFilter: 'Merchandise',
    defaultCategory: 'Merchandise',
    description: 'Check vouchers for merchandise suppliers and inventory'
  },
  {
    id: 'operation_expense',
    label: 'Operation Expense',
    folderFilter: 'Operation',
    defaultCategory: 'Operation',
    description: 'Administrative, utilities, rent, and operational expense vouchers'
  },
  {
    id: 'services_expense',
    label: 'Services Expense',
    folderFilter: 'Service',
    defaultCategory: 'Service',
    description: 'Professional fees, repairs, transportation, and technical service expenses'
  }
];

export const CATEGORY_TABS: TabConfig[] = DISBURSEMENT_TABS.filter(t => t.id !== 'summary');

export const DISBURSEMENT_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'Regular Loans', label: 'Regular Loans' },
  { value: 'STL', label: 'STL Replenishment' },
  { value: 'Revolving Fund', label: 'Revolving Fund Replenishment' },
  { value: 'Petty Cash', label: 'Petty Cash Replenishment' },
  { value: 'Merchandise', label: 'Merchandise Payment' },
  { value: 'Operation', label: 'Operation Expense' },
  { value: 'Service', label: 'Services Expense' },
  { value: 'Others', label: 'Others' }
];

export const formatCategoryLabel = (folderName?: string, cv?: any): string => {
  const targetFolder = folderName || cv?.folder_name;
  if (targetFolder) {
    const match = DISBURSEMENT_CATEGORY_OPTIONS.find(
      opt => opt.value.toLowerCase() === targetFolder.toLowerCase() || opt.label.toLowerCase() === targetFolder.toLowerCase()
    );
    if (match) return match.label;
    if (/loan/i.test(targetFolder)) return 'Regular Loans';
    if (/stl/i.test(targetFolder)) return 'STL Replenishment';
    if (/revolving/i.test(targetFolder)) return 'Revolving Fund Replenishment';
    if (/petty/i.test(targetFolder)) return 'Petty Cash Replenishment';
    if (/merchandise/i.test(targetFolder)) return 'Merchandise Payment';
    if (/operation/i.test(targetFolder)) return 'Operation Expense';
    if (/service/i.test(targetFolder)) return 'Services Expense';
    return targetFolder;
  }

  // Fallback heuristic if folder is missing
  if (cv) {
    const part = (cv.particulars || '').toLowerCase();
    if (part.includes('stl') || part.includes('short term') || cv.stl_liquidation?.id) return 'STL Replenishment';
    if (part.includes('rf') || part.includes('revolving') || part.includes('liquidation') || cv.revolving_fund?.id) return 'Revolving Fund Replenishment';
    if (part.includes('petty cash')) return 'Petty Cash Replenishment';
    if (
      part.includes('swimming') ||
      part.includes('pants') ||
      part.includes('coverall') ||
      part.includes('gala') ||
      part.includes('type a') ||
      part.includes('type b') ||
      part.includes('shirt') ||
      part.includes('uniform') ||
      part.includes('merchandise')
    ) {
      return 'Merchandise Payment';
    }
    if (cv.loan_id || part.includes('loan')) return 'Regular Loans';
    return 'Operation Expense';
  }

  return 'Regular Loans';
};

export const DRAW_BANK_OPTIONS: { value: string; label: string }[] = [
  { value: 'BDO', label: 'BDO' },
  { value: 'MBTC', label: 'MBTC' }
];

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface AnimatedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
}

function AnimatedSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left',
  disabled = false,
}: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div
      ref={containerRef}
      className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`}
      data-dropdown-container
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-all duration-150 cursor-pointer outline-none ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-surface-container-lowest dark:bg-neutral-800 border-primary text-neutral-900 dark:text-white'
            : 'bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 hover:border-outline-variant text-neutral-900 dark:text-white'
        } ${buttonClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate ${selectedOption ? '' : 'text-neutral-400 font-normal'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 text-neutral-400 transition-transform duration-200 ease-out ${
            isOpen ? 'rotate-180 text-primary dark:text-secondary' : ''
          }`}
        />
      </button>

      <div
        className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} min-w-full w-max max-w-xs mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-neutral-800 border border-outline-variant/60 shadow-xl py-1 custom-scrollbar transition-all duration-200 ease-out origin-top ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        } ${menuClassName}`}
      >
        {options.map(opt => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-secondary font-bold'
                  : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'
              }`}
            >
              <div className="flex flex-col truncate">
                <span className="truncate">{opt.label}</span>
                {opt.description && (
                  <span className="text-[10px] text-neutral-400 font-normal truncate">{opt.description}</span>
                )}
              </div>
              {isSelected && (
                <Check className="w-3.5 h-3.5 flex-shrink-0 text-primary dark:text-secondary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface CvRowItem {
  id?: string;
  date?: string;
  voucher_no?: string;
  description: string;
  remarks?: string;
  debit: string;
  credit: string;
  isAutoCredit?: boolean;
  is_credit?: boolean;
  pairedWithId?: string;
}

export const formatPayeeName = (name?: string): string => {
  if (!name || typeof name !== 'string') return name || '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',');
    const lastName = parts[0].trim();
    const firstName = parts.slice(1).join(',').trim();
    if (firstName && lastName) {
      return `${firstName} ${lastName}`.replace(/\s+/g, ' ').toUpperCase();
    }
  }

  return trimmed.replace(/\s+/g, ' ').toUpperCase();
};

export const isCreditAccountDesc = (desc?: string): boolean => {
  if (!desc) return false;
  return /^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc.trim());
};

export const checkIsCreditRow = (row: { isAutoCredit?: boolean; is_credit?: boolean; description?: string; credit?: any; debit?: any }): boolean => {
  if (row.isAutoCredit === true || row.is_credit === true) return true;
  if (isCreditAccountDesc(row.description)) return true;
  if (row.credit !== null && row.credit !== undefined && row.credit !== '' && Number(row.credit) > 0 && (!row.debit || Number(row.debit) === 0)) return true;
  return false;
};


export const REPLENISHMENT_ACCOUNT_OPTIONS = [
  'Advances to employee',
  'Seminar & Training',
  'Professional Fee',
  'Professional and Consultancy Fee',
  'Audit Professional Expense',
  'SSS premium-EE Share',
  'SSS premium-ER share',
  'Pag-ibig premium ER share',
  'Pag-ibig premium- EE share',
  'Philhealth -EE share',
  'Philhealth-ER share',
  'COS -water',
  'COS - Water Vendo',
  'Transportation',
  'Travel & Transportation',
  'Honorarium',
  'Honorarium and Allowances',
  'Representation',
  'COS- hardbound',
  'COS- printing',
  'COS- Insurance',
  'COS-Wifi',
  'Office supplies',
  'Office Supplies Expenses',
  'Office Use',
  'Hygiene expense',
  'Insurance payable- Climbs',
  'Insurance Payable- 1CISP',
  'Insurance Payable',
  'Licenses & Taxes',
  'Inventory-handbag',
  'Inventory-hardhat',
  'Inventory-safety goggles',
  'Inventory-Pershing cap',
  'Merchandise Inventory - Pershing Cap',
  'Merchandise Inventory - Lanyard',
  'COGS-Pershing cap',
  'COGS - FREIGHT IN - Pershing Cap',
  'COGS-handbag',
  'Freight in',
  'Porterage',
  'Commission- Participation Card',
  'Commission- ROTC Manual',
  'Wages',
  'Communication',
  'Repair & Maintenance',
  'Meeting & conferences',
  'Meeting meals',
  'Incentive',
  'key locker duplicate',
  'CE - Gala',
  'Toga Rental Revenue',
  'Toga Rental Labor Expense',
  'labor',
  'Fixture & Furniture',
  'Account Payable',
  'Credit Payable to Baterna',
  'Due to CETF - Apex Organization',
  'Donation Expense',
  'Miscellaneous',
  'Short Term Loan'
];

export const getRfDeletedAccountsSet = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const saved = localStorage.getItem('rf_deleted_accounts');
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) {
        return new Set(arr.map((s: string) => String(s).trim().toLowerCase()));
      }
    }
  } catch {}
  return new Set();
};

export const saveRfDeletedAccount = (name: string) => {
  if (typeof window === 'undefined') return;
  try {
    const set = getRfDeletedAccountsSet();
    set.add(name.trim().toLowerCase());
    localStorage.setItem('rf_deleted_accounts', JSON.stringify(Array.from(set)));
  } catch {}
};

export const restoreRfDeletedAccount = (name: string) => {
  if (typeof window === 'undefined') return;
  try {
    const set = getRfDeletedAccountsSet();
    set.delete(name.trim().toLowerCase());
    localStorage.setItem('rf_deleted_accounts', JSON.stringify(Array.from(set)));
  } catch {}
};


export const ACCOUNT_CATEGORIES = [
  { value: 'Operation', label: 'Operation', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700' },
  { value: 'Merchandise', label: 'Merchandise', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700' },
  { value: 'Service', label: 'Service', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300 dark:border-purple-700' },
  { value: 'CETF', label: 'CETF', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-700' },
  { value: 'CDF', label: 'CDF', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' }
] as const;

export const getCategoryForAccount = (acct: string, categoryMap?: Record<string, string>): string => {
  const trimmed = (acct || '').trim();
  if (!trimmed) return 'Operation';
  const lower = trimmed.toLowerCase();

  // 1. Check explicitly passed category map
  if (categoryMap && categoryMap[lower]) {
    return categoryMap[lower];
  }

  // 2. Check localStorage cache
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('rf_account_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[lower]) return parsed[lower];
      }
    } catch {
      // ignore
    }
  }

  // 3. Keyword-based heuristic auto-classification
  if (
    lower.includes('wifi') ||
    lower.includes('water') ||
    lower.includes('cos') ||
    lower.includes('service') ||
    lower.includes('repair') ||
    lower.includes('labor') ||
    lower.includes('duplicate') ||
    lower.includes('toga rental labor')
  ) {
    return 'Service';
  }
  if (
    lower.includes('merchandise') ||
    lower.includes('inventory') ||
    lower.includes('cogs') ||
    lower.includes('freight') ||
    lower.includes('commission') ||
    lower.includes('pershing') ||
    lower.includes('lanyard') ||
    lower.includes('handbag') ||
    lower.includes('hardhat') ||
    lower.includes('goggles') ||
    lower.includes('porterage')
  ) {
    return 'Merchandise';
  }
  if (lower.includes('cetf') || lower.includes('apex')) {
    return 'CETF';
  }
  if (lower.includes('cdf')) {
    return 'CDF';
  }
  return 'Operation';
};

function ReplenishmentAccountDropdown({
  value,
  onChange,
  options = REPLENISHMENT_ACCOUNT_OPTIONS,
  categoryMap = {},
  onAddAccount,
  onDeleteAccount,
  placeholder = 'Select or type account...'
}: {
  value: string;
  onChange: (val: string) => void;
  options?: string[];
  categoryMap?: Record<string, string>;
  onAddAccount?: (name: string, category: string) => void;
  onDeleteAccount?: (name: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newAcctName, setNewAcctName] = useState('');
  const [newAcctCategory, setNewAcctCategory] = useState('Operation');
  const [categoryManuallySet, setCategoryManuallySet] = useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setIsCreating(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreating) {
          setIsCreating(false);
        } else {
          setOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreating]);

  // Always start from top when opened
  useEffect(() => {
    if (open && listRef.current && !isCreating) {
      listRef.current.scrollTop = 0;
    }
  }, [open, isCreating]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(acct =>
      acct.toLowerCase().includes(term)
    );
  }, [options, search]);

  const exactMatchExists = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return false;
    return options.some(acct => acct.trim().toLowerCase() === term);
  }, [options, search]);

  const handleStartCreate = (suggestedName = search.trim()) => {
    setNewAcctName(suggestedName);
    const guessed = getCategoryForAccount(suggestedName, categoryMap);
    setNewAcctCategory(guessed);
    setCategoryManuallySet(false);
    setIsCreating(true);
  };

  const handleSaveNewAccount = () => {
    const cleanName = newAcctName.trim();
    if (!cleanName) return;
    const cat = newAcctCategory.trim() || 'Operation';

    if (onAddAccount) {
      onAddAccount(cleanName, cat);
    }
    onChange(cleanName);
    setIsCreating(false);
    setOpen(false);
  };

  return (
    <div className={`relative w-full ${open ? 'z-50' : 'z-10'}`} ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setSearch(e.target.value);
            setOpen(true);
            setIsCreating(false);
          }}
          onFocus={() => {
            setSearch('');
            setOpen(true);
            setIsCreating(false);
          }}
          placeholder={placeholder}
          className="w-full pr-8 px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs text-on-surface dark:text-white font-medium focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setOpen(prev => !prev);
            setIsCreating(false);
          }}
          className="absolute right-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-0.5"
          title="Toggle account list"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''}`} />
        </button>
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute left-0 top-full mt-1.5 w-full min-w-[360px] max-w-lg bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-xl shadow-2xl z-[60] ring-1 ring-black/5 dark:ring-white/5 animate-dropdown-pop origin-top overflow-hidden flex flex-col"
        >
          {isCreating ? (
            /* Inline New Account Creator View */
            <div className="p-3 bg-neutral-50/70 dark:bg-neutral-900 flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/20">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Create Book of Account</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5 rounded cursor-pointer"
                  title="Back to account list"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={newAcctName}
                  onChange={e => {
                    setNewAcctName(e.target.value);
                    if (!categoryManuallySet) {
                      setNewAcctCategory(getCategoryForAccount(e.target.value, categoryMap));
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveNewAccount();
                    }
                  }}
                  placeholder="e.g. Communication Equipment"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
                  Select Category
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {ACCOUNT_CATEGORIES.map(cat => {
                    const isSelected = newAcctCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setNewAcctCategory(cat.value);
                          setCategoryManuallySet(true);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? `${cat.color} ring-2 ring-emerald-500 shadow-xs font-black`
                            : 'border-outline-variant/40 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-md px-2 py-1">
                Auto-fills credit row 2 as: <span className="font-bold font-mono">Revolving Fund - {newAcctCategory}</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newAcctName.trim()}
                  onClick={handleSaveNewAccount}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Select</span>
                </button>
              </div>
            </div>
          ) : (
            /* Search Results and Options List */
            <>
              <div className="max-h-56 overflow-y-auto divide-y divide-outline-variant/15 custom-scrollbar">
                {filtered.length === 0 ? (
                  <div className="p-4 text-center">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                      No accounts matching &quot;<span className="font-semibold text-neutral-800 dark:text-neutral-200">{search}</span>&quot;
                    </div>
                    {search.trim() && (
                      <button
                        type="button"
                        onClick={() => handleStartCreate(search.trim())}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create &quot;{search.trim()}&quot; & Set Category</span>
                      </button>
                    )}
                  </div>
                ) : (
                  filtered.map(acct => {
                    const cat = getCategoryForAccount(acct, categoryMap);
                    const isSelected = value.trim().toLowerCase() === acct.trim().toLowerCase();
                    const isCustom = !REPLENISHMENT_ACCOUNT_OPTIONS.includes(acct);
                    return (
                      <div
                        key={acct}
                        className={`group w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-emerald-100/70 dark:bg-emerald-950/70 font-bold text-emerald-900 dark:text-emerald-200'
                            : 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 text-neutral-800 dark:text-neutral-200'
                        }`}
                        onClick={() => {
                          onChange(acct);
                          setOpen(false);
                        }}
                      >
                        <span className="truncate flex-1">{acct}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              cat === 'Service'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                : cat === 'Merchandise'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                : cat === 'CETF' || cat === 'CDF'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                            }`}
                          >
                            {cat}
                          </span>
                          {onDeleteAccount && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onDeleteAccount(acct);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition-all cursor-pointer"
                              title="Delete account option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Quick-Action Bar */}
              <div className="p-2 border-t border-outline-variant/20 bg-neutral-50/80 dark:bg-neutral-800/40 flex items-center justify-between gap-2">
                {search.trim() && !exactMatchExists ? (
                  <button
                    type="button"
                    onClick={() => handleStartCreate(search.trim())}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300/80 dark:border-emerald-700/60 font-medium text-xs transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 font-bold">
                      <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Create &quot;{search.trim()}&quot;
                    </span>
                    <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">
                      + Set Category
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartCreate('')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer ml-auto px-1 py-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create New Account</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DisbursementPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isAdmin = user?.role === 'admin';
  const isAdminOrManager = user?.role === 'admin';
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

  // Active Tab state (defaults to master summary tab)
  const [activeTab, setActiveTab] = useState<DisbursementTab>('summary');
  const [cvSortOrder, setCvSortOrder] = useState<'voucher_desc' | 'voucher_asc'>('voucher_desc');

  // SSR hydration safety
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Members do not have access to Disbursement — redirect to Overview
  useEffect(() => {
    if (user && !isAdminOrStaff) {
      router.replace('/dashboard');
    }
  }, [user, isAdminOrStaff, router]);

  // Sync tab with URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'loan' || tabParam === 'loans') {
      router.replace('/dashboard/loans?tab=vouchers');
      return;
    }
    if (tabParam && DISBURSEMENT_TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam as DisbursementTab);
    } else if (tabParam === 'revolving_funds' || tabParam === 'revolving') {
      setActiveTab('revolving_fund_replenishment');
    } else if (tabParam === 'stl_liquidations' || tabParam === 'stl_liquidation') {
      setActiveTab('stl_replenishment');
    }
  }, [searchParams, router]);

  const currentTabConfig = useMemo(() => {
    return DISBURSEMENT_TABS.find(t => t.id === activeTab) || DISBURSEMENT_TABS[0];
  }, [activeTab]);

  // Check Vouchers state
  const [checkVouchers, setCheckVouchers] = useState<any[]>([]);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvSearch, setCvSearch] = useState('');
  const [cvBankFilter, setCvBankFilter] = useState('all');
  const [cvStatusFilter, setCvStatusFilter] = useState('all');
  const [cvPage, setCvPage] = useState(1);
  const [cvLimit] = useState(25);
  const [cvTotalCount, setCvTotalCount] = useState(0);
  const [cvTotalPages, setCvTotalPages] = useState(1);

  // Selection & Actions State
  const [selectedCvIds, setSelectedCvIds] = useState<string[]>([]);
  const [cvToDelete, setCvToDelete] = useState<any | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isClearAllCvModalOpen, setIsClearAllCvModalOpen] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState('');
  const [isDeletingCv, setIsDeletingCv] = useState(false);
  const [cvActionFeedback, setCvActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Custom Modal Dialog (Replaces native browser alert & confirm)
  const [modalDialog, setModalDialog] = useState<{
    isOpen: boolean;
    type?: 'confirm' | 'alert';
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'amber' | 'rose' | 'emerald' | 'primary';
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const showAppAlert = (
    title: string,
    message: string,
    variant: 'primary' | 'rose' | 'amber' | 'emerald' = 'primary',
    confirmLabel: string = 'OK'
  ) => {
    setModalDialog({
      isOpen: true,
      type: 'alert',
      title,
      message,
      confirmLabel,
      variant,
      onConfirm: () => setModalDialog(null)
    });
  };

  // View / Edit / Print State
  const [selectedCvForModal, setSelectedCvForModal] = useState<any | null>(null);
  const [modalCvViewMode, setModalCvViewMode] = useState<'summary' | 'detailed'>('detailed');
  const [printingCvBreakdown, setPrintingCvBreakdown] = useState<any | null>(null);
  const [unifiedPrintModal, setUnifiedPrintModal] = useState<{
    isOpen: boolean;
    cv?: any | null;
    lf?: any | null;
    type?: 'stl' | 'rf' | null;
    mode?: 'summary' | 'detailed' | null;
  }>({
    isOpen: false,
    cv: null,
    lf: null,
    type: null,
    mode: 'detailed'
  });
  const [isEditingCvModal, setIsEditingCvModal] = useState(false);
  const [editingOriginalCv, setEditingOriginalCv] = useState<any | null>(null);
  const [editCvViewMode, setEditCvViewMode] = useState<'summary' | 'detailed'>('detailed');
  const [openedFromPrintModal, setOpenedFromPrintModal] = useState(false);
  const [initialCvEditSnapshot, setInitialCvEditSnapshot] = useState<string>('');
  const [isSavingCvEdit, setIsSavingCvEdit] = useState(false);
  const [isSyncingCvRf, setIsSyncingCvRf] = useState(false);
  const [isApprovingCv, setIsApprovingCv] = useState(false);

  // Create Check Voucher Modal State
  const [isCreateCVOpen, setIsCreateCVOpen] = useState(false);
  const [isSavingNewCv, setIsSavingNewCv] = useState(false);
  const [isFetchingNextVoucherNo, setIsFetchingNextVoucherNo] = useState(false);
  const [newCvVoucherNo, setNewCvVoucherNo] = useState('');
  const [newCvDate, setNewCvDate] = useState('');
  const [newCvReleasedDate, setNewCvReleasedDate] = useState('');
  const [newCvPayee, setNewCvPayee] = useState('');
  const [newCvBankName, setNewCvBankName] = useState('BDO');
  const [newCvCheckNo, setNewCvCheckNo] = useState('');
  const [newCvParticulars, setNewCvParticulars] = useState('');
  const [newCvFundAmount, setNewCvFundAmount] = useState('');
  const [newCvCategory, setNewCvCategory] = useState('');
  const [newCvPreparedBy, setNewCvPreparedBy] = useState('LAMOSTE, CHINNETTE A.');
  const [newCvCheckedBy, setNewCvCheckedBy] = useState('MARILOU LARIOSA');
  const [newCvApprovedBy, setNewCvApprovedBy] = useState('MICHELLE M. PABLE');
  const [newCvLiquidatedBy, setNewCvLiquidatedBy] = useState('MICHELLE M. PABLE');
  const [newCvDetailedApprovedBy, setNewCvDetailedApprovedBy] = useState('CANDILARIO N. TATOY');
  const [newCvRows, setNewCvRows] = useState<CvRowItem[]>([
    { id: 'new-row-1', date: '', voucher_no: '', description: '', remarks: '', debit: '', credit: '' }
  ]);

  // Edit Check Voucher State
  const [editCvFormData, setEditCvFormData] = useState({
    id: '',
    voucher_no: '',
    voucher_date: '',
    date_released: '',
    status: 'edit',
    check_no: '',
    payee: '',
    bank: '',
    particulars: '',
    folder_name: '',
    prepared_by: '',
    checked_by: '',
    approved_by: '',
    liquidated_by: '',
    detailed_approved_by: ''
  });
  const [editCvRows, setEditCvRows] = useState<CvRowItem[]>([]);
  const [editCvCibAmount, setEditCvCibAmount] = useState<string>('');
  const [deletedRowsStack, setDeletedRowsStack] = useState<{ isEdit: boolean; row: CvRowItem; index: number }[]>([]);
  const dragRowIdx = useRef<number | null>(null);
  const dragOverRowIdx = useRef<number | null>(null);
  const editModalScrollRef = useRef<HTMLDivElement | null>(null);
  const createModalScrollRef = useRef<HTMLDivElement | null>(null);

  // Dedicated modal for editing Date Sealed & Disbursed (or setting date when sealing)
  const [disbursedDateModal, setDisbursedDateModal] = useState<{
    isOpen: boolean;
    cv: any | null;
    date: string;
    isSealingAction: boolean;
  }>({
    isOpen: false,
    cv: null,
    date: '',
    isSealingAction: false
  });

  const reorderCvRows = useCallback((fromIdx: number, toIdx: number, isEdit: boolean = true) => {
    if (fromIdx === toIdx) return;
    if (isEdit) {
      setEditCvRows(prev => {
        const updated = [...prev];
        const [moved] = updated.splice(fromIdx, 1);
        updated.splice(toIdx, 0, moved);
        return updated;
      });
    } else {
      setNewCvRows(prev => {
        const updated = [...prev];
        const [moved] = updated.splice(fromIdx, 1);
        updated.splice(toIdx, 0, moved);
        return updated;
      });
    }
  }, []);

  const handleRowDragOver = useCallback((e: React.DragEvent, toIdx: number, isEdit: boolean = true) => {
    e.preventDefault();
    dragOverRowIdx.current = toIdx;
    const container = isEdit ? editModalScrollRef.current : createModalScrollRef.current;
    if (!container) return;
    const { top, bottom } = container.getBoundingClientRect();
    const threshold = 80;
    if (e.clientY < top + threshold) {
      container.scrollTop -= 12;
    } else if (e.clientY > bottom - threshold) {
      container.scrollTop += 12;
    }
  }, []);

  // Custom Accounts & Categories state for Book of Accounts dropdown
  const [customAccountOptions, setCustomAccountOptions] = useState<string[]>(() => {
    const deleted = getRfDeletedAccountsSet();
    let base = REPLENISHMENT_ACCOUNT_OPTIONS;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rf_custom_accounts');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            base = Array.from(new Set([...REPLENISHMENT_ACCOUNT_OPTIONS, ...parsed]));
          }
        }
      } catch {
        // ignore
      }
    }
    return base.filter(a => !deleted.has(a.trim().toLowerCase())).sort((a, b) => a.localeCompare(b));
  });

  const [accountCategoryMap, setAccountCategoryMap] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('rf_account_categories');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  // Fetch accounts from server to sync custom accounts and categories
  const fetchCustomAccounts = useCallback(async () => {
    try {
      const res = await api.get('/revolving-funds/accounts');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const serverNames: string[] = [];
        const serverCatMap: Record<string, string> = {};
        for (const item of res.data.data) {
          const name = typeof item === 'string' ? item : item.name;
          const cat = typeof item === 'string' ? '' : item.category;
          if (name) {
            serverNames.push(name);
            if (cat) serverCatMap[name.toLowerCase()] = cat;
          }
        }

        // Also sync server-side deleted accounts if provided
        if (Array.isArray(res.data.deleted) && typeof window !== 'undefined') {
          try {
            const localDeleted = getRfDeletedAccountsSet();
            for (const d of res.data.deleted) {
              if (d) localDeleted.add(String(d).trim().toLowerCase());
            }
            localStorage.setItem('rf_deleted_accounts', JSON.stringify(Array.from(localDeleted)));
          } catch {}
        }

        const deleted = getRfDeletedAccountsSet();

        setCustomAccountOptions(prev => {
          const merged = Array.from(new Set([...REPLENISHMENT_ACCOUNT_OPTIONS, ...prev, ...serverNames]))
            .filter(a => !deleted.has(a.trim().toLowerCase()))
            .sort((a, b) => a.localeCompare(b));
          try {
            localStorage.setItem('rf_custom_accounts', JSON.stringify(merged));
          } catch {}
          return merged;
        });
        setAccountCategoryMap(prev => {
          const merged = { ...prev, ...serverCatMap };
          try {
            localStorage.setItem('rf_account_categories', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    } catch {
      // Quietly keep local options if server endpoint fails
    }
  }, []);

  useEffect(() => {
    fetchCustomAccounts();
  }, [fetchCustomAccounts]);

  const handleAddCustomAccount = async (name: string, category: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const catToUse = category.trim() || 'Operation';

    restoreRfDeletedAccount(trimmed);

    // 1. Update category map in state & localStorage
    setAccountCategoryMap(prev => {
      const nextMap = { ...prev, [trimmed.toLowerCase()]: catToUse };
      try {
        localStorage.setItem('rf_account_categories', JSON.stringify(nextMap));
      } catch {}
      return nextMap;
    });

    // 2. Update options list in state & localStorage
    setCustomAccountOptions(prev => {
      const merged = Array.from(new Set([...prev, trimmed])).sort((a, b) => a.localeCompare(b));
      try {
        localStorage.setItem('rf_custom_accounts', JSON.stringify(merged));
      } catch {}
      return merged;
    });

    // 3. Persist to backend
    try {
      await api.post('/revolving-funds/accounts', { name: trimmed, category: catToUse });
    } catch (err) {
      console.error('Failed to save custom account to backend:', err);
    }
  };

  const handleDeleteCustomAccount = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    saveRfDeletedAccount(trimmed);

    setCustomAccountOptions(prev => {
      const filtered = prev.filter(a => a.toLowerCase() !== trimmed.toLowerCase());
      try {
        localStorage.setItem('rf_custom_accounts', JSON.stringify(filtered));
      } catch {}
      return filtered;
    });

    setAccountCategoryMap(prev => {
      const nextMap = { ...prev };
      delete nextMap[trimmed.toLowerCase()];
      try {
        localStorage.setItem('rf_account_categories', JSON.stringify(nextMap));
      } catch {}
      return nextMap;
    });

    try {
      await api.delete(`/revolving-funds/accounts/${encodeURIComponent(trimmed)}`);
    } catch (err) {
      console.error('Failed to remove custom account:', err);
    }
  };

  // Calculate live disbursed amount for newly created voucher
  const getNewCvDisbursedAmount = (): number => {
    let debitTotal = 0;
    let nonCibCreditTotal = 0;
    let cibCreditTotal = 0;
    for (const r of newCvRows) {
      const isCred = checkIsCreditRow(r);
      const isCib = /^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test((r.description || '').trim());
      if (isCred || isCib) {
        const val = parseFloat(String(r.credit || r.debit || '0')) || 0;
        if (isCib) {
          cibCreditTotal += val;
        } else {
          nonCibCreditTotal += val;
        }
      } else {
        debitTotal += parseFloat(String(r.debit || '0')) || 0;
      }
    }
    if (cibCreditTotal > 0) return cibCreditTotal;
    if (debitTotal > 0) return Math.max(0, debitTotal - nonCibCreditTotal);
    return 0;
  };

  // Calculate live disbursed amount while editing/modifying voucher
  const getEditCvDisbursedAmount = (): number => {
    const activeCv = editingOriginalCv || selectedCvForModal;
    const replenishType = getReplenishmentType(editCvFormData.folder_name, activeCv);
    if (replenishType === 'stl') {
      const cibVal = parseFloat(editCvCibAmount || '0') || 0;
      if (cibVal > 0) return cibVal;
      if (activeCv?.cib_amount && parseFloat(activeCv.cib_amount) > 0) return parseFloat(activeCv.cib_amount);
      if (activeCv?.amount && parseFloat(activeCv.amount) > 0) return parseFloat(activeCv.amount);
    }

    let debitTotal = 0;
    let nonCibCreditTotal = 0;
    let cibCreditTotal = 0;
    for (const r of editCvRows) {
      const isCred = checkIsCreditRow(r);
      const isCib = /^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test((r.description || '').trim());
      if (isCred || isCib) {
        const val = parseFloat(String(r.credit || (isCred && r.debit ? r.debit : '0') || '0')) || 0;
        if (isCib) {
          cibCreditTotal += val;
        } else {
          nonCibCreditTotal += val;
        }
      } else {
        debitTotal += parseFloat(String(r.debit || '0')) || 0;
      }
    }
    const cibVal = parseFloat(editCvCibAmount || '0') || cibCreditTotal;
    const overallCredit = nonCibCreditTotal + cibVal;
    if (debitTotal > 0) return debitTotal;
    if (overallCredit > 0) return overallCredit;

    const baseAmount = parseFloat(selectedCvForModal?.amount || 0);
    return isNaN(baseAmount) ? 0 : baseAmount;
  };

  // Load check vouchers for active tab
  const loadCheckVouchers = useCallback(async (page = 1, searchOverride?: string) => {
    try {
      setCvLoading(true);
      const searchTerm = searchOverride !== undefined ? searchOverride : cvSearch;
      const params: Record<string, string | number> = {
        page,
        limit: cvLimit,
        sort_by: cvSortOrder
      };

      if (currentTabConfig.folderFilter) {
        params.folder = currentTabConfig.folderFilter;
      }

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (cvBankFilter !== 'all') params.bank = cvBankFilter;
      if (cvStatusFilter !== 'all') params.status = cvStatusFilter;

      const res = await api.get('/accounts/check-vouchers', { params });
      setCheckVouchers(res.data.data || []);
      if (res.data.pagination) {
        setCvTotalCount(res.data.pagination.total);
        setCvTotalPages(res.data.pagination.totalPages);
        setCvPage(res.data.pagination.page);
      }
    } catch (err) {
      console.error('Failed to load check vouchers:', err);
    } finally {
      setCvLoading(false);
    }
  }, [cvSearch, cvLimit, currentTabConfig.folderFilter, cvBankFilter, cvStatusFilter, cvSortOrder]);

  // Refetch whenever active tab, bank filter, status filter, sort order, or page changes
  useEffect(() => {
    setCvPage(1);
    setSelectedCvIds([]);
    loadCheckVouchers(1);
  }, [activeTab, cvBankFilter, cvStatusFilter, cvSortOrder]);

  // Debounced search
  useEffect(() => {
    if (!cvSearch.trim()) {
      setCvPage(1);
      loadCheckVouchers(1, '');
      return;
    }

    const timer = setTimeout(() => {
      setCvPage(1);
      loadCheckVouchers(1, cvSearch);
    }, 250);

    return () => clearTimeout(timer);
  }, [cvSearch]);

  // Unique bank options from current vouchers
  const bankOptions = useMemo(() => {
    const banks = new Set<string>();
    checkVouchers.forEach(cv => {
      if (cv.bank && cv.bank.trim()) banks.add(cv.bank.trim());
    });
    return Array.from(banks);
  }, [checkVouchers]);

  // Tab summary statistics
  const tabStats = useMemo(() => {
    const totalAmount = checkVouchers.reduce((sum, cv) => sum + (parseFloat(cv.amount) || 0), 0);
    const avgAmount = checkVouchers.length > 0 ? totalAmount / checkVouchers.length : 0;
    const maxAmount = checkVouchers.reduce((max, cv) => Math.max(max, parseFloat(cv.amount) || 0), 0);
    return { totalAmount, avgAmount, maxAmount, count: cvTotalCount };
  }, [checkVouchers, cvTotalCount]);

  // Utility helpers
  const formatDisbursedInWords = (amount: number): string => {
    if (!amount || isNaN(amount) || amount <= 0) return 'ZERO PESOS ONLY';
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
      'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const toWords = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n] + ' ';
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '') + ' ';
      if (n < 1000) return ones[Math.floor(n / 100)] + ' HUNDRED ' + toWords(n % 100);
      if (n < 1000000) return toWords(Math.floor(n / 1000)).trim() + ' THOUSAND ' + toWords(n % 1000);
      return toWords(Math.floor(n / 1000000)).trim() + ' MILLION ' + toWords(n % 1000000);
    };
    const pesos = Math.floor(amount);
    const centavos = Math.round((amount - pesos) * 100);
    const words = pesos === 0 ? 'ZERO' : toWords(pesos).replace(/\s+/g, ' ').trim();
    const currencyUnit = pesos === 1 ? 'PESO' : 'PESOS';

    if (centavos > 0) {
      return `${words} ${currencyUnit} AND ${centavos.toString().padStart(2, '0')}/100 ONLY`;
    }
    return `${words} ${currencyUnit} ONLY`;
  };

  const formatVoucherDescription = (particulars?: string, payee?: string) => {
    const p = (particulars || '').trim();
    if (!p) return 'Disbursement of funds';
    return p;
  };

  const cleanCvNumber = (vNo: string) => {
    if (!vNo) return '';
    return vNo.replace(/^CV\s*#?/i, '').trim();
  };

  const getCvDisbursedAmount = (cv: any): number => {
    if (!cv) return 0;
    const isStl = getReplenishmentType(cv.folder_name, cv) === 'stl';
    if (isStl) {
      if (cv.cib_amount && parseFloat(cv.cib_amount) > 0) {
        return parseFloat(cv.cib_amount);
      }
      if (cv.amount && parseFloat(cv.amount) > 0) {
        return parseFloat(cv.amount);
      }
      let rawDetails: any[] = [];
      if (Array.isArray(cv.details)) rawDetails = cv.details;
      else if (typeof cv.details === 'string') {
        try { rawDetails = JSON.parse(cv.details); } catch {}
      }
      for (const item of rawDetails) {
        const desc = (item.book_of_account || item.description || '').trim();
        if (/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc)) {
          const val = typeof item.amount === 'number' ? Math.abs(item.amount) : parseFloat(item.amount || item.credit || 0);
          if (val > 0) return val;
        }
      }
    }

    let details: any[] = [];
    if (Array.isArray(cv.details)) {
      details = cv.details;
    } else if (typeof cv.details === 'string') {
      try {
        const parsed = JSON.parse(cv.details);
        if (Array.isArray(parsed)) details = parsed;
      } catch {
        details = [];
      }
    }

    // 1. Calculate sum of debit items (gross voucher disbursement amount)
    let debitSum = 0;
    for (const item of details) {
      const desc = (item.book_of_account || item.description || '').trim();
      const val = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || item.debit || 0);
      const isCredit = item.is_credit === true ||
                       item.isAutoCredit === true ||
                       /^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc) ||
                       val < 0 ||
                       (item.credit !== null && item.credit !== undefined && item.credit !== '' && !item.debit);
      if (!isCredit && val > 0) {
        debitSum += val;
      }
    }
    if (debitSum > 0) return debitSum;

    // Check linked revolving fund items or STL items if details is not yet populated
    if (Array.isArray(cv.revolving_fund?.items) && cv.revolving_fund.items.length > 0) {
      const rfSum = cv.revolving_fund.items
        .filter((it: any) => !it.is_cancelled)
        .reduce((sum: number, it: any) => sum + (parseFloat(it.amount || 0) || 0), 0);
      if (rfSum > 0) return rfSum;
    }
    if (Array.isArray(cv.stl_liquidation?.items) && cv.stl_liquidation.items.length > 0) {
      const stlSum = cv.stl_liquidation.items
        .filter((it: any) => !it.is_cancelled)
        .reduce((sum: number, it: any) => sum + (parseFloat(it.amount || 0) || 0), 0);
      if (stlSum > 0) return stlSum;
    }

    return parseFloat(cv.amount || 0);
  };

  const cleanCategoryName = (name: string): string => {
    if (!name) return 'Operation';
    return name
      .replace(/^revolving\s*fund\s*-\s*/i, '')
      .replace(/^stl\s*-\s*/i, '')
      .replace(/^short\s*term\s*loan\s*-\s*/i, '')
      .trim();
  };

  const formatCibAccountName = (bankName?: string): string => {
    const b = (bankName || '').trim().toUpperCase();
    if (!b) return 'CIB-MBTC';
    if (b.includes('METRO') || b.includes('MBTC')) return 'CIB-MBTC';
    if (b.includes('BDO')) return 'CIB-BDO';
    if (b.includes('LAND') || b.includes('LBP')) return 'CIB-LBP';
    if (b.includes('PNB')) return 'CIB-PNB';
    if (b.includes('DBP')) return 'CIB-DBP';
    if (b.includes('BPI')) return 'CIB-BPI';
    if (b.startsWith('CIB-')) return b;
    if (b.startsWith('CIB - ')) return `CIB-${b.slice(6)}`;
    if (b.startsWith('CIB ')) return `CIB-${b.slice(4)}`;
    return `CIB-${b.replace(/\s*BANK\b/i, '').trim()}`;
  };

  const getSummaryCvRows = (cv: any) => {
    if (!cv) return { rows: [], debitTotal: 0, creditTotal: 0 };
    let details: any[] = [];
    if (Array.isArray(cv.details)) {
      details = cv.details;
    } else if (typeof cv.details === 'string') {
      try {
        const parsed = JSON.parse(cv.details);
        if (Array.isArray(parsed)) details = parsed;
      } catch {
        details = [];
      }
    }

    const rows: { id: string; date: string; voucher_no: string; description: string; remarks?: string; debit: number | null; credit: number | null }[] = [];
    let debitTotal = 0;
    let creditTotal = 0;

    const rawDate = cv.voucher_date || cv.date;
    const dateStr = rawDate ? (typeof rawDate === 'string' ? rawDate.split('T')[0] : '') : '';
    const vNo = (cv.voucher_no || '').replace(/^CV-?0*/i, '').trim();
    const cibName = formatCibAccountName(cv.bank_name || cv.bank);
    const replenishType = getReplenishmentType(cv.folder_name, cv);

    if (replenishType === 'stl') {
      const debitMap: Record<string, number> = {};
      const creditMap: Record<string, number> = {};

      if (details.length > 0) {
        for (const item of details) {
          const desc = (item.book_of_account || item.description || '').trim();
          if (!desc || /^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc)) continue;
          const val = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || 0);
          const isCred = item.is_credit === true || item.isAutoCredit === true || val < 0;

          if (isCred) {
            const cVal = Math.abs(val) || Number(item.credit) || 0;
            if (cVal > 0) {
              let acct = 'Other Deductions';
              if (/service\s*fee/i.test(desc)) acct = 'Service Fee';
              else if (/insurance/i.test(desc)) acct = 'Insurance Payable';
              else if (/interest/i.test(desc)) acct = 'Interest Receive';
              else if (/loans?\s*receivable/i.test(desc)) acct = 'Loans Receivable';
              else acct = desc.replace(/;.*$/, '').trim() || 'Other Deductions';
              creditMap[acct] = (creditMap[acct] || 0) + cVal;
            }
          } else {
            const dVal = val || Number(item.debit) || 0;
            if (dVal > 0) {
              let acct = 'Loans Receivable';
              if (/loans?\s*receivable/i.test(desc) || /short\s*term\s*loan|stl/i.test(desc)) acct = 'Loans Receivable';
              else acct = desc.replace(/;.*$/, '').trim() || 'Loans Receivable';
              debitMap[acct] = (debitMap[acct] || 0) + dVal;
            }
          }
        }
      } else if (Array.isArray(cv.stl_liquidation?.items) && cv.stl_liquidation.items.length > 0) {
        for (const it of cv.stl_liquidation.items) {
          if (it.is_cancelled) continue;
          const val = typeof it.amount === 'number' ? it.amount : parseFloat(it.amount || 0);
          if (val > 0) {
            debitMap['Loans Receivable'] = (debitMap['Loans Receivable'] || 0) + val;
          }
        }
      }

      if (Object.keys(debitMap).length === 0) {
        const fallbackAmt = parseFloat(cv.amount || 0);
        if (fallbackAmt > 0) debitMap['Loans Receivable'] = fallbackAmt;
      }

      let rowIdx = 0;
      for (const [name, amt] of Object.entries(debitMap)) {
        if (amt > 0) {
          rows.push({
            id: `cat-${rowIdx++}`,
            date: dateStr,
            voucher_no: vNo,
            description: name,
            remarks: '',
            debit: amt,
            credit: null
          });
          debitTotal += amt;
        }
      }

      const preferredOrder = ['Service Fee', 'Insurance Payable', 'Interest Receive', 'Loans Receivable'];
      const sortedCreditKeys = Object.keys(creditMap).sort((a, b) => {
        const idxA = preferredOrder.indexOf(a);
        const idxB = preferredOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      for (const name of sortedCreditKeys) {
        const amt = creditMap[name];
        if (amt > 0) {
          rows.push({
            id: `cat-${rowIdx++}`,
            date: dateStr,
            voucher_no: vNo,
            description: name,
            remarks: '',
            debit: null,
            credit: amt
          });
          creditTotal += amt;
        }
      }

      const balancingCib = Math.max(0, debitTotal - creditTotal);
      if (balancingCib > 0 || creditTotal === 0) {
        const cibAmount = balancingCib > 0 ? balancingCib : (cv.amount ? parseFloat(cv.amount) : 0);
        rows.push({
          id: 'credit-cib',
          date: dateStr,
          voucher_no: vNo,
          description: cibName,
          remarks: '',
          debit: null,
          credit: cibAmount
        });
        creditTotal += cibAmount;
      }

      return { rows, debitTotal, creditTotal };
    }

    const catMap: Record<string, number> = {};
    if (details.length > 0) {
      for (const item of details) {
        const val = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || 0);
        const desc = item.book_of_account || item.description || '';
        if (val > 0 && !/cib\b|cash\s*in\s*bank/i.test(desc)) {
          const cat = cleanCategoryName(getCategoryForAccount(desc));
          catMap[cat] = (catMap[cat] || 0) + val;
        }
      }
    } else if (Array.isArray(cv.revolving_fund?.items) && cv.revolving_fund.items.length > 0) {
      for (const it of cv.revolving_fund.items) {
        if (it.is_cancelled) continue;
        const val = typeof it.amount === 'number' ? it.amount : parseFloat(it.amount || 0);
        if (val > 0) {
          const rawCat = it.category || getCategoryForAccount(it.account_name || '') || 'Operation';
          const cat = cleanCategoryName(rawCat);
          catMap[cat] = (catMap[cat] || 0) + val;
        }
      }
    }

    if (Object.keys(catMap).length > 0) {
      let idx = 0;
      for (const [cat, amt] of Object.entries(catMap)) {
        rows.push({
          id: `cat-${idx++}`,
          date: dateStr,
          voucher_no: vNo,
          description: cat,
          remarks: '',
          debit: amt,
          credit: null
        });
        debitTotal += amt;
      }
    } else {
      const fallbackAmt = parseFloat(cv.amount || 0);
      if (fallbackAmt > 0) {
        rows.push({
          id: 'cat-0',
          date: dateStr,
          voucher_no: vNo,
          description: 'Operation',
          remarks: '',
          debit: fallbackAmt,
          credit: null
        });
        debitTotal = fallbackAmt;
      }
    }

    if (debitTotal > 0) {
      rows.push({
        id: 'credit-cib',
        date: dateStr,
        voucher_no: vNo,
        description: cibName,
        remarks: '',
        debit: null,
        credit: debitTotal
      });
      creditTotal = debitTotal;
    }

    return { rows, debitTotal, creditTotal };
  };

  const getBalancedCvRows = (cv: any) => {
    if (!cv) return { rows: [], debitTotal: 0, creditTotal: 0 };
    let details: any[] = [];
    if (Array.isArray(cv.details)) {
      details = cv.details;
    } else if (typeof cv.details === 'string') {
      try {
        const parsed = JSON.parse(cv.details);
        if (Array.isArray(parsed)) details = parsed;
      } catch {
        details = [];
      }
    }

    const rows: { id: string; date: string; voucher_no: string; description: string; remarks: string; debit: number | null; credit: number | null; isAutoCredit?: boolean; is_credit?: boolean }[] = [];
    let debitTotal = 0;
    let creditTotal = 0;

    for (let idx = 0; idx < details.length; idx++) {
      const item = details[idx];
      const desc = item.book_of_account || item.description || '';
      const rawVal = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || 0);

      const isCreditItem = item.is_credit === true ||
                           item.isAutoCredit === true ||
                           isCreditAccountDesc(desc) ||
                           rawVal < 0 ||
                           (item.credit !== null && item.credit !== undefined && item.credit !== '' && !item.debit);

      const dateStr = item.date ? item.date.split('T')[0] : (cv?.voucher_date ? cv.voucher_date.split('T')[0] : '');
      const vNo = item.voucher_no || cv?.voucher_no || '';
      const itemRemarks = item.remarks || item.particulars || item.note || '';

      if (isCreditItem) {
        const creditAmt = rawVal < 0
          ? Math.abs(rawVal)
          : (item.credit !== null && item.credit !== undefined && item.credit !== '' ? Number(item.credit) : (item.debit && isCreditAccountDesc(desc) ? Number(item.debit) : (rawVal > 0 ? rawVal : null)));
        rows.push({
          id: `item-${idx}`,
          date: dateStr,
          voucher_no: vNo,
          description: desc || 'Credit / Deduction',
          remarks: itemRemarks,
          debit: null,
          credit: creditAmt,
          isAutoCredit: true,
          is_credit: true
        });
        if (creditAmt) creditTotal += creditAmt;
      } else if (rawVal > 0) {
        rows.push({
          id: `item-${idx}`,
          date: dateStr,
          voucher_no: vNo,
          description: desc || 'Disbursement Line',
          remarks: itemRemarks,
          debit: rawVal,
          credit: null,
          isAutoCredit: false,
          is_credit: false
        });
        debitTotal += rawVal;
      } else if (desc) {
        rows.push({
          id: `item-${idx}`,
          date: dateStr,
          voucher_no: vNo,
          description: desc,
          remarks: itemRemarks,
          debit: null,
          credit: null,
          isAutoCredit: false,
          is_credit: false
        });
      }
    }

    if (rows.length === 0) {
      const fallbackAmt = parseFloat(cv?.amount || 0);
      if (fallbackAmt > 0) {
        const rawDate = cv?.voucher_date || cv?.date;
        const dateStr = rawDate ? (typeof rawDate === 'string' ? rawDate.split('T')[0] : '') : '';
        const vNo = (cv?.voucher_no || '').replace(/^CV-?0*/i, '').trim();
        rows.push({
          id: 'item-0',
          date: dateStr,
          voucher_no: vNo,
          description: cv?.particulars || 'Disbursement Line',
          remarks: '',
          debit: fallbackAmt,
          credit: null,
          isAutoCredit: false,
          is_credit: false
        });
        debitTotal = fallbackAmt;
      }
    }

    // Auto-balance credit with CIB row if creditTotal is 0 and debitTotal > 0
    if (debitTotal > 0 && creditTotal === 0) {
      const rawDate = cv?.voucher_date || cv?.date;
      const dateStr = rawDate ? (typeof rawDate === 'string' ? rawDate.split('T')[0] : '') : '';
      const vNo = (cv?.voucher_no || '').replace(/^CV-?0*/i, '').trim();
      const detectedBank = (cv?.bank_name || cv?.bank || 'MBTC').trim();
      const cibLabel = detectedBank.toUpperCase().startsWith('CIB') ? detectedBank : `CIB - ${detectedBank}`;
      rows.push({
        id: 'credit-cib-auto',
        date: dateStr,
        voucher_no: vNo,
        description: cibLabel,
        remarks: '',
        debit: null,
        credit: debitTotal,
        isAutoCredit: true,
        is_credit: true
      });
      creditTotal = debitTotal;
    }

    return { rows, debitTotal, creditTotal };
  };

  const isRevolvingVoucher = (cv: any) => {
    if (!cv) return false;
    const folder = (cv.folder_name || '').toLowerCase();
    const particulars = (cv.particulars || '').toLowerCase();
    return folder === 'revolving fund' || 
           folder.includes('revolving') || 
           particulars.includes('revolving fund') || 
           Boolean(cv.revolving_fund?.id);
  };

  const isStlVoucher = (cv: any) => {
    if (!cv) return false;
    const folder = (cv.folder_name || '').toLowerCase();
    const particulars = (cv.particulars || '').toLowerCase();
    return folder === 'stl' || 
           folder.includes('stl replenishment') || 
           particulars.includes('stl replenishment') || 
           Boolean(cv.stl_liquidation?.id);
  };

  const isStlOrRfTabOrVoucher = (cv: any) => {
    // If the voucher explicitly has a non-replenishment folder, it is NOT STL or RF!
    if (cv) {
      const f = (cv.folder_name || '').toLowerCase();
      if (f && f !== 'stl' && !f.includes('stl') && !f.includes('revolving')) {
        return false;
      }
      if (isStlVoucher(cv) || isRevolvingVoucher(cv)) return true;
    }

    if (activeTab === 'petty_cash_replenishment' || 
        activeTab === 'merchandise_payment' || 
        activeTab === 'operation_expense' || 
        activeTab === 'services_expense') {
      return false;
    }

    if (activeTab === 'stl_replenishment' || activeTab === 'revolving_fund_replenishment') {
      return true;
    }

    return false;
  };

  const getReplenishmentType = (folderOrCat?: string, cv?: any): 'stl' | 'rf' | null => {
    const cat = (folderOrCat || cv?.folder_name || '').toLowerCase();
    if (cat) {
      if (cat === 'stl' || cat.includes('stl')) return 'stl';
      if (cat.includes('revolving')) return 'rf';
      return null;
    }
    if (activeTab === 'petty_cash_replenishment' || 
        activeTab === 'merchandise_payment' || 
        activeTab === 'operation_expense' || 
        activeTab === 'services_expense') {
      return null;
    }
    const part = (cv?.particulars || '').toLowerCase();
    if (part.includes('stl') || Boolean(cv?.stl_liquidation?.id)) {
      return 'stl';
    }
    if (part.includes('revolving') || Boolean(cv?.revolving_fund?.id)) {
      return 'rf';
    }
    if (activeTab === 'stl_replenishment') return 'stl';
    if (activeTab === 'revolving_fund_replenishment') return 'rf';
    return null;
  };

  // Helper for row editing in Check Voucher modals
  const updateCvRowField = (
    isEdit: boolean,
    rowId: string,
    field: 'date' | 'voucher_no' | 'description' | 'remarks' | 'debit' | 'credit',
    val: string,
    replenishType: 'stl' | 'rf' | null
  ) => {
    const setRows = isEdit ? setEditCvRows : setNewCvRows;

    setRows(prev => {
      const rowIdx = prev.findIndex(r => r.id === rowId);
      if (rowIdx === -1) return prev;

      const currentRow = prev[rowIdx];
      const updatedRow = { ...currentRow, [field]: val };

      // If not in replenishment mode, just update the single field
      if (!replenishType) {
        return prev.map((r, i) => (i === rowIdx ? updatedRow : r));
      }

      const isCurrentCredit = checkIsCreditRow(currentRow);
      const nextRows = prev.map((r, i) => (i === rowIdx ? updatedRow : r));

      // If description was edited on a debit row, auto-fill matching category on a paired credit row if present
      if (field === 'description' && !isCurrentCredit) {
        const cat = getCategoryForAccount(val, accountCategoryMap);
        const autoCreditDesc = replenishType === 'stl' ? 'Revolving Fund - STL' : `Revolving Fund - ${cat}`;
        
        const pairedCreditIdx = nextRows.findIndex(r => r.pairedWithId === rowId);
        if (pairedCreditIdx !== -1) {
          const currentCreditDesc = nextRows[pairedCreditIdx]?.description || '';
          if (!/cib\b|cash\s*in\s*bank/i.test(currentCreditDesc)) {
            nextRows[pairedCreditIdx] = {
              ...nextRows[pairedCreditIdx],
              description: autoCreditDesc
            };
          }
        }
      }

      return nextRows;
    });
  };

  const removeCvRow = (isEdit: boolean, rowId: string) => {
    const currentRows = isEdit ? editCvRows : newCvRows;
    const idx = currentRows.findIndex(r => r.id === rowId);
    if (idx !== -1) {
      const removedRow = currentRows[idx];
      setDeletedRowsStack(stack => [...stack, { isEdit, row: removedRow, index: idx }]);
    }

    const setRows = isEdit ? setEditCvRows : setNewCvRows;
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  const handleUndoDeleteRow = (isEdit: boolean) => {
    const lastIdx = deletedRowsStack.findLastIndex(item => item.isEdit === isEdit);
    if (lastIdx === -1) return;
    const target = deletedRowsStack[lastIdx];
    if (!target || !target.row) return;

    setDeletedRowsStack(prev => prev.filter((_, i) => i !== lastIdx));

    const setRows = isEdit ? setEditCvRows : setNewCvRows;
    setRows(prev => {
      const copy = [...prev];
      const restoredRow = {
        ...target.row,
        id: target.row.id && !copy.some(r => r.id === target.row.id)
          ? target.row.id
          : 'row-restored-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)
      };
      const insertAt = Math.min(target.index, copy.length);
      copy.splice(insertAt, 0, restoredRow);
      return copy;
    });
  };

  const addCvRow = (isEdit: boolean, replenishType: 'stl' | 'rf' | null, isCredit: boolean = false) => {
    const newId = 'row-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const defaultDate = isEdit
      ? (editCvFormData.voucher_date || new Date().toISOString().split('T')[0])
      : (newCvDate || new Date().toISOString().split('T')[0]);
    const defaultVoucherNo = isEdit ? editCvFormData.voucher_no : newCvVoucherNo;

    let defaultDesc = 'Operation';
    if (isCredit) {
      defaultDesc = replenishType === 'stl' ? 'Revolving Fund - STL' : 'Revolving Fund - Operation';
    } else if (replenishType === 'stl') {
      defaultDesc = 'Short Term Loan';
    }

    const newRow: CvRowItem = {
      id: newId,
      date: defaultDate,
      voucher_no: defaultVoucherNo,
      description: defaultDesc,
      remarks: '',
      debit: '',
      credit: '',
      isAutoCredit: isCredit,
      is_credit: isCredit
    };

    const setRows = isEdit ? setEditCvRows : setNewCvRows;
    setRows(prev => {
      const copy = [...prev];
      const cibIdx = copy.findIndex(r => /^(cib\b|cash\s*in\s*bank)/i.test((r.description || '').trim()));
      if (cibIdx !== -1) {
        copy.splice(cibIdx, 0, newRow);
        return copy;
      }
      copy.push(newRow);
      return copy;
    });
  };

  const openUnifiedPrintModalForCv = (
    cv: any,
    modeOrEvent?: 'summary' | 'detailed' | React.MouseEvent,
    e?: React.MouseEvent
  ) => {
    let mode: 'summary' | 'detailed' = 'detailed';
    if (typeof modeOrEvent === 'string') {
      mode = modeOrEvent;
    } else if (modeOrEvent && 'stopPropagation' in modeOrEvent) {
      modeOrEvent.stopPropagation();
    }
    if (e) e.stopPropagation();
    const type: 'stl' | 'rf' = (activeTab === 'revolving_fund_replenishment' || isRevolvingVoucher(cv)) ? 'rf' : 'stl';
    setUnifiedPrintModal({
      isOpen: true,
      cv,
      lf: null,
      type,
      mode
    });
  };

  const extractRfNumber = (cv: any): string | null => {
    if (!cv) return null;
    if (cv.revolving_fund?.lf_no) return cv.revolving_fund.lf_no;
    const combined = `${cv.particulars || ''} ${cv.folder_name || ''}`;
    const match = combined.match(/RF\s*#?\s*([A-Za-z0-9\-_]+)/i) || combined.match(/LF\s*#?\s*([A-Za-z0-9\-_]+)/i);
    return match ? (match[1].startsWith('RF') || match[1].startsWith('LF') ? match[1] : `RF#${match[1]}`) : null;
  };

  // Open Check Voucher Modal by ID or No
  const openCheckVoucherModalByIdOrNo = async (voucherIdOrNo: string, fallbackVoucherNo?: string) => {
    if (!voucherIdOrNo) return;
    const directMatch = checkVouchers.find(v => v.id === voucherIdOrNo || v.voucher_no === voucherIdOrNo);
    if (directMatch) {
      setSelectedCvForModal(directMatch);
      setIsEditingCvModal(false);
      return;
    }

    try {
      setCvLoading(true);
      if (voucherIdOrNo.length > 20) {
        const res = await api.get(`/accounts/check-vouchers`, { params: { id: voucherIdOrNo } });
        if (res.data?.data?.[0]) {
          setSelectedCvForModal(res.data.data[0]);
          setIsEditingCvModal(false);
          return;
        }
      }
      const searchTarget = fallbackVoucherNo || voucherIdOrNo;
      const res = await api.get(`/accounts/check-vouchers`, { params: { search: searchTarget, limit: 10 } });
      if (res.data?.data?.length > 0) {
        const matched = res.data.data.find((v: any) => v.voucher_no === searchTarget || v.id === searchTarget) || res.data.data[0];
        setSelectedCvForModal(matched);
        setIsEditingCvModal(false);
      } else {
        showAppAlert('Voucher Not Found', `Check Voucher "${searchTarget}" was not found.`);
      }
    } catch (err) {
      console.error('Error fetching check voucher modal:', err);
    } finally {
      setCvLoading(false);
    }
  };

  // Revert status from 'on process' back to 'edit'
  const handleRevertToEdit = (cv: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Revert Voucher to Edit',
      message: `Revert Voucher #${cv.voucher_no} back to "Edit" status? This will unlock the voucher for modifications.`,
      confirmLabel: 'Revert to Edit',
      variant: 'amber',
      onConfirm: async () => {
        setModalDialog(null);
        try {
          const res = await api.put(`/accounts/check-vouchers/${cv.id}`, {
            status: 'edit'
          });
          const updated = res.data?.data;
          if (updated) {
            setCheckVouchers(prev => prev.map(v => (v.id === cv.id ? { ...v, status: 'edit' } : v)));
            if (selectedCvForModal?.id === cv.id) {
              setSelectedCvForModal((prev: any) => (prev ? { ...prev, status: 'edit' } : null));
            }
            setCvActionFeedback({
              type: 'success',
              message: `Voucher #${cv.voucher_no} reverted to Edit status.`
            });
            setTimeout(() => setCvActionFeedback(null), 4000);
          }
        } catch (err: any) {
          console.error('Failed to revert voucher status:', err);
          setCvActionFeedback({
            type: 'error',
            message: err.response?.data?.error?.message || 'Failed to revert status.'
          });
          setTimeout(() => setCvActionFeedback(null), 4000);
        }
      }
    });
  };

  // Render Status Badge
  const renderStatusBadge = (status?: string, cv?: any) => {
    const s = (status || 'edit').toLowerCase();
    switch (s) {
      case 'on process':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25">
            <Clock className="w-3 h-3" />
            <span>On Process</span>
          </span>
        );
      case 'for release':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25">
            <Send className="w-3 h-3" />
            <span>For Release</span>
          </span>
        );
      case 'filed':
        if (cv && isAdmin) {
          return (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                startEditingCv(cv);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs group"
              title="Click to override lock and edit filed check voucher"
            >
              <Lock className="w-3 h-3 group-hover:hidden" />
              <Edit3 className="w-3 h-3 hidden group-hover:inline-block text-emerald-800 dark:text-emerald-200" />
              <span>Filed</span>
            </button>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
            <Lock className="w-3 h-3" />
            <span>Filed</span>
          </span>
        );
      case 'edit':
      default:
        if (cv && isAdminOrStaff) {
          return (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                startEditingCv(cv);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs group"
              title="Click to edit check voucher"
            >
              <Edit3 className="w-3 h-3 group-hover:rotate-12 transition-transform" />
              <span>Edit</span>
            </button>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
            <Edit3 className="w-3 h-3" />
            <span>Edit</span>
          </span>
        );
    }
  };

  // Print CV Breakdown: opens browser print dialog cleanly without altering status
  const handlePrintCvBreakdown = (cv: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPrintingCvBreakdown(cv);

    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup);
      setPrintingCvBreakdown(null);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Advance to 'on process'
  const handleMarkOnProcess = async (cv: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.put(`/accounts/check-vouchers/${cv.id}`, {
        status: 'on process'
      });
      if (res.data?.data) {
        const updated = res.data.data;
        setCheckVouchers(prev => prev.map(v => (v.id === cv.id ? { ...v, status: updated.status } : v)));
        if (selectedCvForModal && selectedCvForModal.id === cv.id) {
          setSelectedCvForModal((prev: any) => (prev ? { ...prev, status: updated.status } : null));
        }
        setCvActionFeedback({ type: 'success', message: `Voucher #${cv.voucher_no} status updated to On Process!` });
        setTimeout(() => setCvActionFeedback(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to advance voucher status to on process:', err);
      setCvActionFeedback({ type: 'error', message: err.response?.data?.error?.message || 'Failed to update status.' });
      setTimeout(() => setCvActionFeedback(null), 4000);
    }
  };

  // Advance to 'for release' (Manager / Admin Approval)
  const handleApproveForRelease = async (cv: any) => {
    try {
      setIsApprovingCv(true);
      const today = new Date().toISOString().split('T')[0];
      const res = await api.put(`/accounts/check-vouchers/${cv.id}`, {
        status: 'for release',
        managers_approval_date: today
      });
      const updated = res.data?.data;
      if (updated) {
        setCheckVouchers(prev => prev.map(v => (v.id === cv.id ? { ...v, ...updated } : v)));
        if (selectedCvForModal?.id === cv.id) {
          setSelectedCvForModal((prev: any) => (prev ? { ...prev, ...updated } : null));
        }
        setCvActionFeedback({
          type: 'success',
          message: `Voucher #${cv.voucher_no} approved by manager for release!`
        });
        setTimeout(() => setCvActionFeedback(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to approve check voucher for release:', err);
      setCvActionFeedback({ type: 'error', message: err.response?.data?.error?.message || 'Failed to approve check voucher for release.' });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } finally {
      setIsApprovingCv(false);
    }
  };

  // Advance to 'filed' (Admin Only Release & Seal with Disbursed Date)
  const handleFileAndLockCv = (cv: any) => {
    if (!isAdmin) {
      showAppAlert('Permission Denied', 'Only administrators can release, seal, and file check vouchers.', 'amber');
      return;
    }
    const defaultDate = cv.date_released
      ? cv.date_released.split('T')[0]
      : (cv.voucher_date ? cv.voucher_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setDisbursedDateModal({
      isOpen: true,
      cv,
      date: defaultDate,
      isSealingAction: true
    });
  };

  // Open modal to directly edit Date Sealed & Disbursed (Admin Only)
  const handleOpenEditDisbursedDate = (cv: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) {
      showAppAlert('Permission Denied', 'Only administrators can edit the disbursed date.', 'amber');
      return;
    }
    const defaultDate = cv.date_released
      ? cv.date_released.split('T')[0]
      : (cv.voucher_date ? cv.voucher_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setDisbursedDateModal({
      isOpen: true,
      cv,
      date: defaultDate,
      isSealingAction: false
    });
  };

  // Save changes from Disbursed Date Modal (either sealing or updating date)
  const handleSaveDisbursedDateModal = async () => {
    if (!disbursedDateModal.cv) return;
    try {
      const payload: any = {
        date_released: disbursedDateModal.date || null
      };
      if (disbursedDateModal.isSealingAction) {
        payload.status = 'filed';
      }
      const res = await api.put(`/accounts/check-vouchers/${disbursedDateModal.cv.id}`, payload);
      const updated = res.data?.data;
      if (updated) {
        setCheckVouchers(prev => prev.map(v => (v.id === disbursedDateModal.cv.id ? { ...v, ...updated } : v)));
        if (selectedCvForModal?.id === disbursedDateModal.cv.id) {
          setSelectedCvForModal((prev: any) => (prev ? { ...prev, ...updated } : null));
        }
        setCvActionFeedback({
          type: 'success',
          message: disbursedDateModal.isSealingAction
            ? `Voucher #${disbursedDateModal.cv.voucher_no} is now sealed and disbursed on ${disbursedDateModal.date}!`
            : `Disbursed date updated to ${disbursedDateModal.date} for Voucher #${disbursedDateModal.cv.voucher_no}!`
        });
        setTimeout(() => setCvActionFeedback(null), 4000);
      }
      setDisbursedDateModal({ isOpen: false, cv: null, date: '', isSealingAction: false });
    } catch (err: any) {
      console.error('Failed to save disbursed date:', err);
      setCvActionFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to update disbursed date.'
      });
      setTimeout(() => setCvActionFeedback(null), 4000);
    }
  };

  // Admin Unlock/Revert from 'filed' to 'for release'
  const handleUnlockCv = (cv: any) => {
    if (!isAdmin) return;
    setModalDialog({
      isOpen: true,
      type: 'confirm',
      title: 'Unlock Check Voucher',
      message: `Unlock Check Voucher #${cv.voucher_no}? This will re-enable editing and deletion for administrators.`,
      confirmLabel: 'Unlock Voucher',
      variant: 'rose',
      onConfirm: async () => {
        setModalDialog(null);
        try {
          const res = await api.put(`/accounts/check-vouchers/${cv.id}`, {
            status: 'for release'
          });
          const updated = res.data?.data;
          if (updated) {
            setCheckVouchers(prev => prev.map(v => (v.id === cv.id ? { ...v, ...updated } : v)));
            if (selectedCvForModal?.id === cv.id) {
              setSelectedCvForModal((prev: any) => (prev ? { ...prev, ...updated } : null));
            }
            setCvActionFeedback({
              type: 'success',
              message: `Check Voucher #${cv.voucher_no} unlocked by administrator.`
            });
            setTimeout(() => setCvActionFeedback(null), 4000);
          }
        } catch (err: any) {
          console.error('Failed to unlock check voucher:', err);
          setCvActionFeedback({ type: 'error', message: err.response?.data?.error?.message || 'Failed to unlock check voucher.' });
          setTimeout(() => setCvActionFeedback(null), 4000);
        }
      }
    });
  };

  // Helper to open Edit Check Voucher Modal with prepared data
  const openEditCvModalActual = (cv: any, mode?: 'summary' | 'detailed', passedRows?: any[]) => {
    setEditingOriginalCv(cv);
    setEditCvViewMode(mode || 'detailed');
    setOpenedFromPrintModal(Boolean(passedRows && passedRows.length > 0) || Boolean(unifiedPrintModal.isOpen));
    const isReplenish = isStlOrRfTabOrVoucher(cv) || Boolean(getReplenishmentType(cv.folder_name, cv));

    // Determine the rows to edit:
    // 1. If explicit passedRows are provided from the print modal (e.g. from Detailed Check Voucher view), prioritize them!
    // 2. If mode === 'summary', use summary category rows.
    // 3. Otherwise, use getBalancedCvRows(cv) which preserves the detailed itemized book of accounts stored on the voucher!
    let rowsToUse: any[] = [];
    if (passedRows && passedRows.length > 0) {
      rowsToUse = passedRows;
    } else if (mode === 'summary') {
      rowsToUse = getSummaryCvRows(cv).rows;
    } else {
      const balanced = getBalancedCvRows(cv);
      rowsToUse = balanced.rows;
    }

    let detectedBank = cv.bank || '';
    if (!detectedBank) {
      let details: any[] = [];
      if (Array.isArray(cv.details)) details = cv.details;
      else if (typeof cv.details === 'string') {
        try { details = JSON.parse(cv.details); } catch {}
      }
      for (const d of details) {
        const desc = (d.book_of_account || d.description || '').toLowerCase();
        if (desc.includes('mbtc') || desc.includes('metro')) {
          detectedBank = 'MBTC';
          break;
        } else if (desc.includes('bdo')) {
          detectedBank = 'BDO';
          break;
        }
      }
      if (!detectedBank && rowsToUse.length > 0) {
        for (const r of rowsToUse) {
          const desc = (r.description || '').toLowerCase();
          if (desc.includes('mbtc') || desc.includes('metro')) {
            detectedBank = 'MBTC';
            break;
          } else if (desc.includes('bdo')) {
            detectedBank = 'BDO';
            break;
          }
        }
      }
    }
    if (!detectedBank) detectedBank = 'BDO';

    const initialForm = {
      id: cv.id,
      voucher_no: cv.voucher_no || '',
      voucher_date: cv.voucher_date ? cv.voucher_date.split('T')[0] : '',
      date_released: cv.date_released ? cv.date_released.split('T')[0] : '',
      status: (cv.status || 'edit').toLowerCase(),
      check_no: cv.check_no || '',
      payee: cv.payee || cv.payee_name || '',
      bank: detectedBank,
      particulars: cv.particulars || '',
      folder_name: cv.folder_name || currentTabConfig.defaultCategory,
      prepared_by: cv.signatories?.prepared_by || 'LAMOSTE, CHINNETTE A.',
      checked_by: cv.signatories?.checked_by || 'MARILOU LARIOSA',
      approved_by: cv.signatories?.approved_by || 'MICHELLE M. PABLE',
      liquidated_by: cv.signatories?.liquidated_by || cv.revolving_fund?.custodian_name || 'MICHELLE M. PABLE',
      detailed_approved_by: cv.signatories?.detailed_approved_by || cv.signatories?.approved_by || 'CANDILARIO N. TATOY'
    };
    setEditCvFormData(initialForm);

    let initialRowsList: CvRowItem[] = [];
    if (rowsToUse.length > 0) {
      initialRowsList = rowsToUse.map((r, i) => {
        const rowId = r.id || `edit-row-${i}-${Date.now()}`;
        const isCredit = checkIsCreditRow(r);
        const rawCredit = r.credit !== null && r.credit !== undefined && r.credit !== '' ? String(r.credit) : '';
        const rawDebit = r.debit !== null && r.debit !== undefined && r.debit !== '' ? String(r.debit) : '';
        const rawAmt = typeof r.amount === 'number' ? r.amount : parseFloat(r.amount || 0);

        let creditVal = '';
        let debitVal = '';

        if (isCredit) {
          if (rawCredit) creditVal = rawCredit;
          else if (rawDebit) creditVal = rawDebit;
          else if (rawAmt !== 0) creditVal = String(Math.abs(rawAmt));
        } else {
          if (rawDebit) debitVal = rawDebit;
          else if (rawAmt > 0) debitVal = String(rawAmt);
        }

        return {
          id: rowId,
          date: r.date || (cv.voucher_date ? cv.voucher_date.split('T')[0] : ''),
          voucher_no: r.voucher_no || cv.voucher_no || '',
          description: r.description || r.book_of_account || '',
          remarks: r.remarks || '',
          debit: debitVal,
          credit: creditVal,
          isAutoCredit: Boolean(isCredit),
          is_credit: Boolean(isCredit)
        };
      });
    } else {
      const amt = parseFloat(cv.amount || 0);
      const defaultDate = cv.voucher_date ? cv.voucher_date.split('T')[0] : '';
      const defaultVoucherNo = cv.voucher_no || '';
      const row0Id = `row-0-${Date.now()}`;

      if (isReplenish) {
        const defaultBank = formatCibAccountName(detectedBank);
        initialRowsList = [
          {
            id: row0Id,
            date: defaultDate,
            voucher_no: defaultVoucherNo,
            description: cv.particulars || (getReplenishmentType(cv.folder_name, cv) === 'stl' ? 'Short Term Loan' : 'Operation'),
            remarks: '',
            debit: amt > 0 ? String(amt) : '',
            credit: '',
            isAutoCredit: false
          },
          {
            id: `credit-${row0Id}`,
            date: defaultDate,
            voucher_no: defaultVoucherNo,
            description: defaultBank,
            remarks: '',
            debit: '',
            credit: amt > 0 ? String(amt) : '',
            isAutoCredit: true
          }
        ];
      } else {
        initialRowsList = [
          { id: row0Id, date: defaultDate, voucher_no: defaultVoucherNo, description: cv.particulars || 'Disbursement Item', remarks: '', debit: amt > 0 ? String(amt) : '', credit: '' },
          { id: `cib-${row0Id}`, date: defaultDate, voucher_no: defaultVoucherNo, description: `CIB - ${detectedBank}`, remarks: '', debit: '', credit: amt > 0 ? String(amt) : '' }
        ];
      }
    }
    // Initialize CIB manual input amount ONLY for replenishment vouchers (STL / Revolving Fund)
    let initialCibVal = '';
    const replenishType = getReplenishmentType(cv.folder_name, cv);
    if (isReplenish) {
      let rawDetails: any[] = [];
      if (Array.isArray(cv.details)) rawDetails = cv.details;
      else if (typeof cv.details === 'string') {
        try { rawDetails = JSON.parse(cv.details); } catch {}
      }
      for (const d of rawDetails) {
        const desc = (d.book_of_account || d.description || '').toLowerCase();
        if (/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc.trim())) {
          const val = typeof d.amount === 'number' ? Math.abs(d.amount) : parseFloat(d.amount || d.credit || 0);
          if (val > 0) {
            initialCibVal = String(val);
            break;
          }
        }
      }

      // Also check if initialRowsList had any CIB row, extract its value and filter it out from body rows
      const cibRowInRows = initialRowsList.find(r => /^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test((r.description || '').trim()));
      if (cibRowInRows) {
        if (!initialCibVal) {
          initialCibVal = cibRowInRows.credit || cibRowInRows.debit || '';
        }
        initialRowsList = initialRowsList.filter(r => !/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test((r.description || '').trim()));
      }

      // For Revolving Fund replenishment: CIB amount is always the full disbursed/debit total
      if (replenishType !== 'stl') {
        let dSum = 0;
        for (const r of initialRowsList) {
          const isCred = checkIsCreditRow(r);
          const dVal = !isCred ? (parseFloat(r.debit || '0') || 0) : 0;
          if (!isCred && dVal > 0) dSum += dVal;
        }
        if (dSum > 0) {
          initialCibVal = dSum.toFixed(2);
        } else if (cv.amount && parseFloat(cv.amount) > 0) {
          initialCibVal = parseFloat(cv.amount).toFixed(2);
        }
      } else if (!initialCibVal) {
        // If STL and still empty, calculate difference between debits and credits
        let dSum = 0;
        let cSum = 0;
        for (const r of initialRowsList) {
          const isCred = checkIsCreditRow(r);
          const dVal = !isCred ? (parseFloat(r.debit || '0') || 0) : 0;
          const cVal = isCred ? (parseFloat(r.credit || '0') || (r.debit ? parseFloat(r.debit) : 0) || 0) : 0;
          if (!isCred && dVal > 0) dSum += dVal;
          if (isCred && cVal > 0) cSum += cVal;
        }
        if (dSum > cSum) {
          initialCibVal = (dSum - cSum).toFixed(2);
        }
      }
    }

    setEditCvRows(initialRowsList);
    setEditCvCibAmount(initialCibVal);
    setInitialCvEditSnapshot(JSON.stringify({ formData: initialForm, rows: initialRowsList, cibAmount: initialCibVal }));
    setIsEditingCvModal(true);
  };

  // Start Editing CV - supports overriding filed status check vouchers for authorized users
  const startEditingCv = (cv: any, mode?: 'summary' | 'detailed', passedRows?: any[]) => {
    if (!cv) return;
    const status = (cv.status || 'edit').toLowerCase();

    // If filed, prompt user with Override confirmation (Admin Only)
    if (status === 'filed') {
      if (!isAdmin) {
        showAppAlert(
          'Permission Denied',
          'Only administrators can override and edit a filed (sealed) check voucher.',
          'amber'
        );
        return;
      }
      setModalDialog({
        isOpen: true,
        type: 'confirm',
        variant: 'amber',
        title: 'Override Filed Voucher Lock?',
        message: `Check Voucher #${cv.voucher_no} is currently sealed and filed. As an authorized user, do you want to override the lock to edit its details, date disbursed, or line items?`,
        confirmLabel: 'Override & Edit',
        cancelLabel: 'Cancel',
        onConfirm: () => {
          setModalDialog(null);
          openEditCvModalActual(cv, mode, passedRows);
        },
        onCancel: () => setModalDialog(null)
      });
      return;
    }

    if (status !== 'edit') {
      if (isAdminOrStaff) {
        setModalDialog({
          isOpen: true,
          type: 'confirm',
          variant: 'amber',
          title: `Modify "${status.toUpperCase()}" Voucher?`,
          message: `Check Voucher #${cv.voucher_no} is currently in "${status.toUpperCase()}" status. Do you want to edit it?`,
          confirmLabel: 'Edit Voucher',
          cancelLabel: 'Cancel',
          onConfirm: () => {
            setModalDialog(null);
            openEditCvModalActual(cv, mode, passedRows);
          },
          onCancel: () => setModalDialog(null)
        });
        return;
      }
      showAppAlert(
        'Voucher Locked',
        `Check vouchers in "${cv.status?.toUpperCase() || 'LOCKED'}" status cannot be edited. Please revert the voucher to "Edit" status first to make changes.`,
        'amber'
      );
      return;
    }

    openEditCvModalActual(cv, mode, passedRows);
  };

  // Track if check voucher edit has dirty/unsaved changes
  const isCvEditDirty = useMemo(() => {
    if (!isEditingCvModal || !initialCvEditSnapshot) return false;
    const current = JSON.stringify({ formData: editCvFormData, rows: editCvRows, cibAmount: editCvCibAmount });
    return current !== initialCvEditSnapshot;
  }, [isEditingCvModal, initialCvEditSnapshot, editCvFormData, editCvRows, editCvCibAmount]);

  const performCloseEditCvModal = useCallback(() => {
    setIsEditingCvModal(false);
    if (openedFromPrintModal && editingOriginalCv) {
      openUnifiedPrintModalForCv(editingOriginalCv, editCvViewMode);
      setEditingOriginalCv(null);
    }
  }, [openedFromPrintModal, editingOriginalCv, editCvViewMode]);

  // Safe close with unsaved changes confirmation
  const handleCloseEditCvModal = useCallback(() => {
    if (isCvEditDirty) {
      setModalDialog({
        isOpen: true,
        type: 'confirm',
        variant: 'amber',
        title: 'Discard Unsaved Changes?',
        message: 'You have unsaved changes in this check voucher. Are you sure you want to close and discard your changes?',
        confirmLabel: 'Discard Changes',
        cancelLabel: 'Keep Editing',
        onConfirm: () => {
          setModalDialog(null);
          performCloseEditCvModal();
        },
        onCancel: () => setModalDialog(null),
      });
      return;
    }
    performCloseEditCvModal();
  }, [isCvEditDirty, performCloseEditCvModal]);

  // Keep session alive while Check Voucher edit or create modal is open so the user is never timed out
  useEffect(() => {
    if (!isEditingCvModal && !isCreateCVOpen) return;
    const touch = () => {
      const now = Date.now();
      if (typeof window !== 'undefined') {
        localStorage.setItem('session_last_activity', now.toString());
      }
    };
    touch();
    const interval = setInterval(touch, 15000);
    return () => clearInterval(interval);
  }, [isEditingCvModal, isCreateCVOpen]);

  // Save Edited CV
  const handleSaveCvEdit = async () => {
    if (!editCvFormData.id) return;
    try {
      setIsSavingCvEdit(true);
      let calculatedAmount = 0;
      const detailsArray = editCvRows
        .filter(r => r.description.trim() || r.debit || r.credit)
        .map(r => {
          const isCredit = checkIsCreditRow(r);
          const debitVal = !isCredit ? (parseFloat(r.debit || '0') || 0) : 0;
          const creditVal = isCredit ? (parseFloat(r.credit || '0') || (r.debit ? parseFloat(r.debit) : 0) || 0) : 0;
          if (!isCredit && debitVal > 0) calculatedAmount += debitVal;
          const netAmount = isCredit ? -Math.abs(creditVal) : debitVal;
          return {
            date: r.date || null,
            voucher_no: r.voucher_no || null,
            book_of_account: r.description.trim(),
            remarks: r.remarks ? r.remarks.trim() : null,
            amount: netAmount,
            debit: isCredit ? null : (debitVal > 0 ? debitVal : null),
            credit: isCredit ? (creditVal > 0 ? creditVal : null) : null,
            is_credit: isCredit,
            isAutoCredit: isCredit
          };
        });

      const activeOriginalCv = editingOriginalCv || selectedCvForModal;
      const isReplenish = isStlOrRfTabOrVoucher(activeOriginalCv) || Boolean(getReplenishmentType(editCvFormData.folder_name, activeOriginalCv));
      const replenishType = getReplenishmentType(editCvFormData.folder_name, activeOriginalCv);
      const isStl = replenishType === 'stl';
      let creditRowsSum = 0;
      let debitRowsSum = 0;
      for (const r of editCvRows) {
        if (checkIsCreditRow(r)) {
          creditRowsSum += parseFloat(r.credit || (r.debit ? r.debit : '0') || '0') || 0;
        } else {
          debitRowsSum += parseFloat(r.debit || '0') || 0;
        }
      }
      const cibVal = isReplenish
        ? (isStl ? (parseFloat(editCvCibAmount || '0') || 0) : (creditRowsSum > 0 ? creditRowsSum : debitRowsSum))
        : 0;
      // Persist the manual CIB row for replenishment vouchers (STL / Revolving Fund)
      if (isReplenish) {
        const existingCibIdx = detailsArray.findIndex(d => /^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test((d.book_of_account || '').trim()));
        if (cibVal > 0) {
          const cibName = formatCibAccountName(editCvFormData.bank);
          if (existingCibIdx >= 0) {
            detailsArray[existingCibIdx] = {
              ...detailsArray[existingCibIdx],
              book_of_account: cibName,
              amount: -cibVal,
              credit: cibVal,
              debit: null,
              is_credit: true,
              isAutoCredit: true
            };
          } else {
            detailsArray.push({
              date: editCvFormData.voucher_date || null,
              voucher_no: editCvFormData.voucher_no || null,
              book_of_account: cibName,
              remarks: null,
              amount: -cibVal,
              debit: null,
              credit: cibVal,
              is_credit: true,
              isAutoCredit: true
            });
          }
        } else if (existingCibIdx >= 0) {
          detailsArray.splice(existingCibIdx, 1);
        }
      }

      const disbursedAmt = getEditCvDisbursedAmount();
      const finalAmount = calculatedAmount > 0 ? calculatedAmount : (disbursedAmt > 0 ? disbursedAmt : (activeOriginalCv?.amount || 0));

      const payload = {
        voucher_no: editCvFormData.voucher_no.trim(),
        voucher_date: editCvFormData.voucher_date || null,
        date_released: editCvFormData.date_released || null,
        status: editCvFormData.status || undefined,
        check_no: editCvFormData.check_no.trim() || null,
        payee: formatPayeeName(editCvFormData.payee),
        bank: editCvFormData.bank.trim() || null,
        particulars: editCvFormData.particulars.trim() || null,
        folder_name: editCvFormData.folder_name.trim() || null,
        amount: finalAmount,
        details: detailsArray,
        signatories: {
          prepared_by: editCvFormData.prepared_by.trim(),
          checked_by: editCvFormData.checked_by.trim(),
          approved_by: editCvFormData.approved_by.trim(),
          liquidated_by: (editCvFormData.liquidated_by || 'MICHELLE M. PABLE').trim(),
          detailed_approved_by: (editCvFormData.detailed_approved_by || 'CANDILARIO N. TATOY').trim()
        }
      };

      const res = await api.put(`/accounts/check-vouchers/${editCvFormData.id}`, payload);
      // Use server response as authoritative source — it includes all joined relations
      // (revolving_fund, stl_liquidation). Parse details to an array so row-render
      // functions (getBalancedCvRows / getSummaryCvRows) always receive fresh data.
      const serverData = res.data?.data || {};
      let parsedDetails = serverData.details;
      if (typeof parsedDetails === 'string') {
        try { parsedDetails = JSON.parse(parsedDetails); } catch { parsedDetails = detailsArray; }
      }
      if (!Array.isArray(parsedDetails)) parsedDetails = detailsArray;
      const updatedCv = {
        ...activeOriginalCv,
        ...serverData,
        details: parsedDetails,
      };
      setSelectedCvForModal(updatedCv);
      setModalCvViewMode(editCvViewMode);
      setIsEditingCvModal(false);
      if (openedFromPrintModal) {
        openUnifiedPrintModalForCv(updatedCv, editCvViewMode);
      }
      setEditingOriginalCv(null);

      setCheckVouchers(prev => prev.map(cv => (cv.id === editCvFormData.id ? { ...cv, ...updatedCv } : cv)));
      setCvActionFeedback({ type: 'success', message: 'Check Voucher updated successfully!' });
      setTimeout(() => setCvActionFeedback(null), 4000);

      // Immediately refresh live table from database to sync all counts and joined relations
      loadCheckVouchers(cvPage);

      setModalDialog({
        isOpen: true,
        type: 'alert',
        variant: 'emerald',
        title: 'Changes Saved Successfully',
        confirmLabel: 'Got it',
        onConfirm: () => {
          setModalDialog(null);
          // If category changed away from current filtered tab, switch seamlessly to target category tab
          const targetTab = DISBURSEMENT_TABS.find(t => 
            t.defaultCategory.toLowerCase() === editCvFormData.folder_name.trim().toLowerCase() ||
            (t.folderFilter && t.folderFilter.toLowerCase() === editCvFormData.folder_name.trim().toLowerCase())
          );
          if (targetTab && activeTab !== 'summary' && activeTab !== targetTab.id) {
            setActiveTab(targetTab.id);
          }
        }
      });
    } catch (err: any) {
      console.error('Failed to update check voucher:', err);
      setCvActionFeedback({ type: 'error', message: err.response?.data?.error?.message || 'Failed to update check voucher.' });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } finally {
      setIsSavingCvEdit(false);
    }
  };

  // Sync Check Voucher with Revolving Fund
  const handleSyncCvWithRf = async () => {
    if (!selectedCvForModal?.id) return;
    try {
      setIsSyncingCvRf(true);
      const res = await api.post(`/accounts/check-vouchers/${selectedCvForModal.id}/sync-revolving-fund`);
      if (res.data?.data) {
        setSelectedCvForModal(res.data.data);
        setCheckVouchers(prev => prev.map(cv => (cv.id === selectedCvForModal.id ? res.data.data : cv)));
        setCvActionFeedback({
          type: 'success',
          message: res.data.message || 'Auto-populated from linked Liquidation Form!'
        });
        setTimeout(() => setCvActionFeedback(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to sync CV with LF:', err);
      setCvActionFeedback({ type: 'error', message: err.response?.data?.error?.message || 'Failed to sync with linked Liquidation Form.' });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } finally {
      setIsSyncingCvRf(false);
    }
  };

  // Fetch live next sequential voucher number from backend
  const fetchNextVoucherNo = async (targetDate?: string) => {
    try {
      setIsFetchingNextVoucherNo(true);
      const params = targetDate ? { date: targetDate } : {};
      const res = await api.get('/accounts/check-vouchers/next-number', { params });
      if (res.data?.data?.next_voucher_no) {
        setNewCvVoucherNo(res.data.data.next_voucher_no);
      }
    } catch (err) {
      console.error('Failed to get next voucher number:', err);
    } finally {
      setIsFetchingNextVoucherNo(false);
    }
  };

  // Open Create Check Voucher Modal
  const openCreateCheckVoucherModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const yr = String(new Date().getFullYear()).slice(-2);
    setNewCvVoucherNo(`${yr}-...`);
    setNewCvDate(today);
    setNewCvReleasedDate(today);
    setNewCvPayee('');
    setNewCvBankName('BDO');
    setNewCvCheckNo('');
    setNewCvParticulars('');
    setNewCvFundAmount('');
    const defaultCat = currentTabConfig.defaultCategory || 'Loan';
    setNewCvCategory(defaultCat);
    setNewCvPreparedBy('LAMOSTE, CHINNETTE A.');
    setNewCvCheckedBy('MARILOU LARIOSA');
    setNewCvApprovedBy('MICHELLE M. PABLE');
    setNewCvLiquidatedBy('MICHELLE M. PABLE');
    setNewCvDetailedApprovedBy('CANDILARIO N. TATOY');

    const isReplenish = getReplenishmentType(defaultCat);
    const row0Id = `new-row-0-${Date.now()}`;
    if (isReplenish) {
      const defaultBank = formatCibAccountName(newCvBankName || 'MBTC');
      setNewCvRows([
        {
          id: row0Id,
          date: today,
          voucher_no: '',
          description: isReplenish === 'stl' ? 'Short Term Loan' : 'Operation',
          debit: '',
          credit: '',
          isAutoCredit: false
        },
        {
          id: `credit-${row0Id}`,
          date: today,
          voucher_no: '',
          description: defaultBank,
          debit: '',
          credit: '',
          isAutoCredit: true
        }
      ]);
    } else {
      setNewCvRows([
        { id: row0Id, date: today, voucher_no: '', description: defaultCat === 'Loan' ? 'Loan' : defaultCat, debit: '', credit: '' },
        { id: `cib-${row0Id}`, date: today, voucher_no: '', description: 'CIB - BDO', debit: '', credit: '' }
      ]);
    }
    setIsCreateCVOpen(true);
    fetchNextVoucherNo(today);
  };

  // Create Check Voucher Submission
  const handleCreateCheckVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCvVoucherNo.trim()) return showAppAlert('Missing Information', 'Please provide a Voucher Number.');
    if (!newCvPayee.trim()) return showAppAlert('Missing Information', 'Please specify a Payee.');
    if (!newCvCategory.trim()) return showAppAlert('Missing Information', 'Please select a disbursement category.');

    try {
      setIsSavingNewCv(true);
      let calculatedAmount = 0;
      const detailsArray = newCvRows
        .filter(r => r.description.trim() || r.debit || r.credit)
        .map(r => {
          const isCredit = checkIsCreditRow(r);
          const debitVal = !isCredit ? (parseFloat(r.debit || '0') || 0) : 0;
          const creditVal = isCredit ? (parseFloat(r.credit || '0') || (r.debit ? parseFloat(r.debit) : 0) || 0) : 0;
          if (!isCredit && debitVal > 0) calculatedAmount += debitVal;
          const netAmount = isCredit ? -Math.abs(creditVal) : debitVal;
          return {
            date: r.date || null,
            voucher_no: r.voucher_no || null,
            book_of_account: r.description.trim(),
            remarks: r.remarks ? r.remarks.trim() : null,
            amount: netAmount,
            debit: isCredit ? null : (debitVal > 0 ? debitVal : null),
            credit: isCredit ? (creditVal > 0 ? creditVal : null) : null,
            is_credit: isCredit,
            isAutoCredit: isCredit
          };
        });

      const matchedCat = CATEGORY_TABS.find(t => t.defaultCategory === newCvCategory);
      const payload = {
        voucher_no: newCvVoucherNo.trim(),
        voucher_date: newCvDate || null,
        date_released: newCvReleasedDate || null,
        check_no: newCvCheckNo.trim() || null,
        payee: formatPayeeName(newCvPayee),
        bank: newCvBankName.trim() || null,
        particulars: newCvParticulars.trim() || `${matchedCat?.label || 'Disbursement'}`,
        folder_name: newCvCategory || 'Loan',
        amount: calculatedAmount,
        fund_amount: newCvFundAmount !== '' ? parseFloat(newCvFundAmount) : null,
        details: detailsArray,
        signatories: {
          prepared_by: newCvPreparedBy.trim(),
          checked_by: newCvCheckedBy.trim(),
          approved_by: newCvApprovedBy.trim(),
          liquidated_by: (newCvLiquidatedBy || 'MICHELLE M. PABLE').trim(),
          detailed_approved_by: (newCvDetailedApprovedBy || 'CANDILARIO N. TATOY').trim()
        }
      };

      const res = await api.post('/accounts/check-vouchers', payload);
      const issuedVoucherNo = res.data?.data?.voucher_no || newCvVoucherNo;
      setIsCreateCVOpen(false);
      loadCheckVouchers(1);
      setCvActionFeedback({ type: 'success', message: `Check Voucher #${issuedVoucherNo} issued successfully!` });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to create check voucher:', err);
      setCvActionFeedback({ type: 'error', message: err.response?.data?.error?.message || 'Failed to create check voucher.' });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } finally {
      setIsSavingNewCv(false);
    }
  };

  // Delete Single CV
  const handleDeleteCv = async () => {
    if (!cvToDelete) return;
    try {
      setIsDeletingCv(true);
      await api.delete(`/accounts/check-vouchers/${cvToDelete.id}`);
      setCvToDelete(null);
      if (selectedCvForModal?.id === cvToDelete.id) setSelectedCvForModal(null);
      loadCheckVouchers(cvPage);
      setCvActionFeedback({ type: 'success', message: 'Check Voucher deleted successfully.' });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to delete check voucher:', err);
      setCvActionFeedback({ type: 'error', message: err.response?.data?.error?.message || 'Failed to delete check voucher.' });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } finally {
      setIsDeletingCv(false);
    }
  };

  // Bulk Delete Selected
  const handleBulkDeleteCv = async () => {
    if (selectedCvIds.length === 0) return;
    try {
      setIsDeletingCv(true);
      const res = await api.post('/accounts/check-vouchers/bulk-delete', { ids: selectedCvIds });
      setIsBulkDeleteModalOpen(false);
      setSelectedCvIds([]);
      loadCheckVouchers(1);
      setCvActionFeedback({
        type: 'success',
        message: res.data?.message || `${selectedCvIds.length} vouchers deleted successfully.`
      });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to bulk delete check vouchers:', err);
      setCvActionFeedback({ type: 'error', message: err.response?.data?.error?.message || 'Failed to delete selected check vouchers.' });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } finally {
      setIsDeletingCv(false);
    }
  };

  // Clear All CVs in Category
  const handleClearAllCv = async () => {
    if (clearAllConfirmText.trim().toUpperCase() !== 'CLEAR') {
      showAppAlert('Confirmation Required', 'Please type CLEAR in the input box to confirm deletion.', 'rose');
      return;
    }
    try {
      setIsDeletingCv(true);
      // Delete filtered by category IDs or all
      const allIds = checkVouchers.map(v => v.id);
      await api.post('/accounts/check-vouchers/bulk-delete', { ids: allIds });
      setIsClearAllCvModalOpen(false);
      setClearAllConfirmText('');
      setSelectedCvIds([]);
      loadCheckVouchers(1);
      setCvActionFeedback({ type: 'success', message: `Cleared check vouchers in ${currentTabConfig.label}.` });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to clear check vouchers:', err);
      setCvActionFeedback({ type: 'error', message: err.response?.data?.error?.message || 'Failed to clear check vouchers.' });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } finally {
      setIsDeletingCv(false);
    }
  };

  // Selection toggle (only unfiled vouchers can be selected for bulk actions)
  const unfiledVouchers = useMemo(() => checkVouchers.filter(v => v.status !== 'filed'), [checkVouchers]);

  const toggleSelectAll = () => {
    if (unfiledVouchers.length > 0 && selectedCvIds.length === unfiledVouchers.length) {
      setSelectedCvIds([]);
    } else {
      setSelectedCvIds(unfiledVouchers.map(cv => cv.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedCvIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  if (user && !isAdminOrStaff) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 p-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-headline text-on-surface dark:text-white">
          Access Restricted
        </h2>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md">
          The Disbursement Module is accessible to cooperative administrative and accounting officers only.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-xs font-bold hover:shadow-md transition-all cursor-pointer"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <BackButton href="/dashboard" label="Back to Overview" />
        </div>

        {isAdminOrStaff && activeTab === 'summary' && (
          <div className="flex items-center gap-3 flex-wrap self-end sm:self-auto">
            <button
              type="button"
              onClick={openCreateCheckVoucherModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-headline font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Check Voucher
            </button>
          </div>
        )}
      </div>

      {/* Action Feedback Toast */}
      {cvActionFeedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg transition-all animate-in slide-in-from-top duration-200 ${
            cvActionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            {cvActionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{cvActionFeedback.message}</span>
          </div>
          <button
            onClick={() => setCvActionFeedback(null)}
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards for Active Tab */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {currentTabConfig.id === 'summary' ? 'Total Vouchers Disbursed' : `Total ${currentTabConfig.label} Disbursed`}
            </span>
            <p className="text-xl sm:text-2xl font-headline font-black text-primary dark:text-secondary">
              ₱{tabStats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-neutral-500">
              {currentTabConfig.id === 'summary'
                ? `Across ${tabStats.count} total check vouchers in system`
                : `Across ${tabStats.count} recorded check vouchers`}
            </p>
          </div>
          <div className="p-3 bg-primary/10 dark:bg-secondary/10 rounded-2xl text-primary dark:text-secondary">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Vouchers
            </span>
            <p className="text-xl sm:text-2xl font-headline font-black text-neutral-900 dark:text-white">
              {tabStats.count}
            </p>
            <p className="text-[10px] text-neutral-500">
              {currentTabConfig.id === 'summary' ? 'All check vouchers in master registry' : 'In current category registry'}
            </p>
          </div>
          <div className="p-3 bg-emerald-700/10 dark:bg-emerald-400/10 rounded-2xl text-emerald-700 dark:text-emerald-400">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Average Release
            </span>
            <p className="text-xl sm:text-2xl font-headline font-black text-neutral-900 dark:text-white">
              ₱{tabStats.avgAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-neutral-500">Mean check release value</p>
          </div>
          <div className="p-3 bg-blue-700/10 dark:bg-blue-400/10 rounded-2xl text-blue-700 dark:text-blue-400">
            <PieChart className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Largest Voucher
            </span>
            <p className="text-xl sm:text-2xl font-headline font-black text-neutral-900 dark:text-white">
              ₱{tabStats.maxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-neutral-500">Peak single check disbursement</p>
          </div>
          <div className="p-3 bg-amber-700/10 dark:bg-amber-400/10 rounded-2xl text-amber-700 dark:text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs - Same format as Loans page */}
      <div className="flex border-b border-outline-variant/50 overflow-x-auto">
        {DISBURSEMENT_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                router.replace(`/dashboard/disbursement?tab=${tab.id}`);
              }}
              className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Context Subtitle */}
      {currentTabConfig.id !== 'summary' && (
        <div className="pt-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {currentTabConfig.description}
          </p>
        </div>
      )}

      {/* STANDARD CHECK VOUCHER REGISTRY TABLE FOR CURRENT DISBURSEMENT TAB */}
      <div className="space-y-4">
          {/* Table Filters & Toolbar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search Box */}
              <div className="relative flex-1 max-w-lg">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={cvSearch}
                  onChange={e => setCvSearch(e.target.value)}
                  placeholder={
                    currentTabConfig.id === 'summary'
                      ? 'Search all check vouchers by voucher #, check #, payee, or description...'
                      : `Search ${currentTabConfig.label} by voucher #, check #, payee, or description...`
                  }
                  className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-400"
                />
                {cvSearch && (
                  <button
                    onClick={() => setCvSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters & Actions */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Bank Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Bank:</span>
                  <AnimatedSelect
                    value={cvBankFilter}
                    onChange={setCvBankFilter}
                    options={[
                      { value: 'all', label: 'All Banks' },
                      { value: 'BDO', label: 'BDO' },
                      { value: 'MBTC', label: 'MBTC' },
                      ...bankOptions
                        .filter(b => !['BDO', 'MBTC', 'METRO BANK', 'METROBANK'].includes(b.toUpperCase()))
                        .map(b => ({ value: b, label: b }))
                    ]}
                    className="w-36"
                    buttonClassName="font-medium text-xs py-1.5"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Status:</span>
                  <AnimatedSelect
                    value={cvStatusFilter}
                    onChange={setCvStatusFilter}
                    options={[
                      { value: 'all', label: 'All Statuses' },
                      { value: 'edit', label: 'Edit' },
                      { value: 'on process', label: 'On Process' },
                      { value: 'for release', label: 'For Release' },
                      { value: 'filed', label: 'Filed' },
                    ]}
                    className="w-36"
                    buttonClassName="font-medium text-xs py-1.5"
                  />
                </div>

                {/* Reload Button */}
                <button
                  onClick={() => loadCheckVouchers(cvPage)}
                  disabled={cvLoading}
                  className="p-2.5 rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer disabled:opacity-50"
                  title="Refresh registry"
                >
                  <RefreshCw className={`w-4 h-4 ${cvLoading ? 'animate-spin text-primary' : ''}`} />
                </button>

                {/* Bulk Actions */}
                {selectedCvIds.length > 0 && isAdminOrStaff && (
                  <button
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedCvIds.length})</span>
                  </button>
                )}

                {/* Clear Category */}
                {checkVouchers.length > 0 && isAdminOrStaff && activeTab !== 'summary' && (
                  <button
                    onClick={() => setIsClearAllCvModalOpen(true)}
                    className="px-3 py-2 text-xs font-bold rounded-xl border border-rose-300 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                    title="Clear vouchers in this category"
                  >
                    Clear Category
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/60 bg-surface-container-low/70 dark:bg-surface-container/70 text-neutral-600 dark:text-neutral-300 font-headline uppercase tracking-wider text-[11px]">
                    {isAdminOrStaff && (
                      <th className="py-3.5 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={unfiledVouchers.length > 0 && selectedCvIds.length === unfiledVouchers.length}
                          onChange={toggleSelectAll}
                          className="rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </th>
                    )}
                    <th 
                      onClick={() => setCvSortOrder(prev => prev === 'voucher_desc' ? 'voucher_asc' : 'voucher_desc')}
                      className="py-3.5 px-4 font-bold cursor-pointer select-none hover:text-primary dark:hover:text-secondary transition-colors group"
                      title="Click to sort by voucher number (ascending / descending)"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Voucher No.</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-primary dark:text-secondary shrink-0" />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 font-bold">Date</th>
                    <th className="py-3.5 px-4 font-bold">Check No.</th>
                    <th className="py-3.5 px-4 font-bold">Payee / Entity</th>
                    <th className="py-3.5 px-4 font-bold">Bank</th>
                    <th className="py-3.5 px-4 font-bold">Description / Details</th>
                    <th className="py-3.5 px-4 font-bold text-right">Disbursed Amount</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    <th className="py-3.5 px-4 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {cvLoading && checkVouchers.length === 0 ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 px-4"><Skeleton className="h-4 w-4 rounded" /></td>
                        <td className="py-4 px-4"><Skeleton className="h-4 w-24 rounded" /></td>
                        <td className="py-4 px-4"><Skeleton className="h-4 w-20 rounded" /></td>
                        <td className="py-4 px-4"><Skeleton className="h-4 w-20 rounded" /></td>
                        <td className="py-4 px-4"><Skeleton className="h-4 w-32 rounded" /></td>
                        <td className="py-4 px-4"><Skeleton className="h-4 w-20 rounded" /></td>
                        <td className="py-4 px-4"><Skeleton className="h-4 w-40 rounded" /></td>
                        <td className="py-4 px-4 text-right"><Skeleton className="h-4 w-24 rounded ml-auto" /></td>
                        <td className="py-4 px-4 text-center"><Skeleton className="h-5 w-16 rounded-full mx-auto" /></td>
                        <td className="py-4 px-4 text-center"><Skeleton className="h-7 w-16 rounded-xl mx-auto" /></td>
                      </tr>
                    ))
                  ) : checkVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-neutral-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FolderOpen className="w-8 h-8 text-neutral-400" />
                          <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                            {currentTabConfig.id === 'summary' ? 'No check vouchers found.' : `No ${currentTabConfig.label} check vouchers found.`}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    checkVouchers.map(cv => {
                      const isSelected = selectedCvIds.includes(cv.id);
                      const isRf = isRevolvingVoucher(cv);
                      const rfNum = extractRfNumber(cv);
                      const amount = getCvDisbursedAmount(cv);

                      return (
                        <tr
                          key={cv.id}
                          onClick={() => {
                            setSelectedCvForModal(cv);
                            setIsEditingCvModal(false);
                          }}
                          className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer ${
                            isSelected ? 'bg-primary/5 dark:bg-secondary/5' : ''
                          }`}
                        >
                          {isAdminOrStaff && (
                            <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={cv.status === 'filed'}
                                onChange={() => toggleSelectRow(cv.id)}
                                className="rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title={cv.status === 'filed' ? 'Filed vouchers cannot be deleted' : undefined}
                              />
                            </td>
                          )}
                          <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                            <span className="font-mono text-primary dark:text-secondary hover:underline">
                              {cv.voucher_no}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                            {cv.voucher_date ? new Date(cv.voucher_date).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                            {cv.check_no || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white max-w-[200px] truncate" title={formatPayeeName(cv.payee)}>
                            {formatPayeeName(cv.payee) || '—'}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                            {cv.bank ? (
                              <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px] font-bold">
                                {/metro/i.test(cv.bank) ? 'MBTC' : cv.bank}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-neutral-700 dark:text-neutral-300 max-w-[280px]" title={cv.particulars}>
                            <div className="truncate font-medium">{cv.particulars || 'Disbursement voucher'}</div>
                            {activeTab === 'summary' && (
                              <div className="mt-1">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                                  {formatCategoryLabel(cv.folder_name, cv)}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-headline font-bold text-right text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                            ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            {renderStatusBadge(cv.status, cv)}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Print Button: Check Voucher with itemized schedule for STL/RF or standard CV breakdown */}
                              {isStlOrRfTabOrVoucher(cv) ? (
                                <button
                                  type="button"
                                  onClick={e => openUnifiedPrintModalForCv(cv, e)}
                                  className="p-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition-all cursor-pointer group"
                                  title="Print Check Voucher with Itemized Schedule"
                                >
                                  <div className="relative">
                                    <Printer className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  </div>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handlePrintCvBreakdown(cv, e);
                                  }}
                                  className="p-1.5 rounded-lg border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
                                  title="Print voucher breakdown sheet"
                                >
                                  <Printer className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                </button>
                              )}

                              {/* Delete CV: HIDDEN/REMOVED if status is 'filed'! If filed, show locked indicator */}
                              {isAdminOrStaff && (
                                cv.status === 'filed' ? (
                                  <span
                                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/60 text-neutral-400 cursor-not-allowed inline-flex items-center justify-center"
                                    title="Check voucher is Sealed & Filed (Locked - cannot be deleted)"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setCvToDelete(cv);
                                    }}
                                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                                    title="Delete check voucher"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {cvTotalPages > 1 && (
              <div className="p-4 border-t border-outline-variant/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                <span>
                  Showing {checkVouchers.length} of {cvTotalCount} check vouchers {currentTabConfig.id === 'summary' ? 'total' : `in ${currentTabConfig.label}`}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setCvPage(1);
                      loadCheckVouchers(1);
                    }}
                    disabled={cvPage <= 1}
                    className="px-2.5 py-1.5 rounded-lg border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    «
                  </button>
                  <button
                    onClick={() => {
                      const p = Math.max(1, cvPage - 1);
                      setCvPage(p);
                      loadCheckVouchers(p);
                    }}
                    disabled={cvPage <= 1}
                    className="px-2.5 py-1.5 rounded-lg border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    ‹
                  </button>
                  <span className="px-3 py-1 font-bold text-neutral-800 dark:text-neutral-200">
                    Page {cvPage} of {cvTotalPages}
                  </span>
                  <button
                    onClick={() => {
                      const p = Math.min(cvTotalPages, cvPage + 1);
                      setCvPage(p);
                      loadCheckVouchers(p);
                    }}
                    disabled={cvPage >= cvTotalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => {
                      setCvPage(cvTotalPages);
                      loadCheckVouchers(cvTotalPages);
                    }}
                    disabled={cvPage >= cvTotalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* CREATE CHECK VOUCHER MODAL */}
      {isCreateCVOpen && mounted && createPortal(
        <div
          data-editing-session="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 sm:p-6 animate-modal-backdrop"
          onClick={e => {
            // Prevent accidental closure when clicking backdrop
            e.stopPropagation();
          }}
        >
          <div
            className="bg-surface-container-lowest dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-modal-pop overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/60 p-5 sm:p-6 shrink-0 bg-surface-container-lowest dark:bg-neutral-900">
              <div>
                <h2 className="text-xl font-headline font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary dark:text-secondary" />
                  Issue New Check Voucher
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Select a category and record an official cooperative disbursement check with balanced double-entry breakdown.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCVOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCheckVoucher} className="flex flex-col flex-1 overflow-hidden">
              <div ref={createModalScrollRef} className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5 text-xs custom-scrollbar">
                {/* Top Row: Category, Voucher No, Date, Draw Bank */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                      Disbursement Category *
                    </label>
                    <AnimatedSelect
                      value={newCvCategory}
                      onChange={selected => {
                        setNewCvCategory(selected);
                        const matched = CATEGORY_TABS.find(t => t.defaultCategory === selected);
                        const isRepl = getReplenishmentType(selected);
                        if (isRepl) {
                          const row0Id = `new-row-0-${Date.now()}`;
                          setNewCvRows([
                            {
                              id: row0Id,
                              date: newCvDate || new Date().toISOString().split('T')[0],
                              voucher_no: '',
                              description: isRepl === 'stl' ? 'Short Term Loan' : 'Communication',
                              debit: '',
                              credit: ''
                            },
                            {
                              id: `credit-${row0Id}`,
                              date: newCvDate || new Date().toISOString().split('T')[0],
                              voucher_no: '',
                              description: isRepl === 'stl' ? 'Revolving Fund - STL' : 'Revolving Fund - Operation',
                              debit: '',
                              credit: '',
                              isAutoCredit: true,
                              pairedWithId: row0Id
                            }
                          ]);
                        } else if (matched) {
                          setNewCvRows(prev => {
                            if (prev.length > 0 && (!prev[0].description || CATEGORY_TABS.some(t => t.label === prev[0].description || t.defaultCategory === prev[0].description))) {
                              return prev.map((r, i) => i === 0 ? { ...r, description: matched.label } : r);
                            }
                            return prev;
                          });
                        }
                      }}
                      options={CATEGORY_TABS.map(cat => ({
                        value: cat.defaultCategory,
                        label: cat.label,
                      }))}
                      buttonClassName="font-bold text-primary dark:text-secondary"
                      menuClassName="min-w-[220px]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">
                        Voucher No. *
                      </label>
                      <button
                        type="button"
                        onClick={() => fetchNextVoucherNo(newCvDate)}
                        className="text-[10px] text-primary dark:text-secondary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                        title="Sync with next sequence number"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${isFetchingNextVoucherNo ? 'animate-spin' : ''}`} />
                        Sync Next No.
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={newCvVoucherNo}
                      onChange={e => setNewCvVoucherNo(e.target.value)}
                      placeholder="e.g. 26-391"
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-mono font-bold"
                    />
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Sequential auto-numbering with database lock protection.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                      Voucher Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={newCvDate}
                      onChange={e => setNewCvDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                      Draw Bank
                    </label>
                    <AnimatedSelect
                      value={newCvBankName}
                      onChange={bName => {
                        setNewCvBankName(bName);
                        setNewCvRows(prev => {
                          const bankRowIdx = prev.findIndex(r => /cib\b|cash\s*in\s*bank/i.test(r.description || ''));
                          if (bankRowIdx >= 0) {
                            return prev.map((r, i) => i === bankRowIdx ? { ...r, description: `CIB - ${bName}` } : r);
                          }
                          return prev;
                        });
                      }}
                      options={DRAW_BANK_OPTIONS}
                      buttonClassName="font-bold"
                      align="right"
                    />
                  </div>
                </div>

                {/* Second Row: Payee, Check No, Date Released */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                      Paid To (Payee Name) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Individual member name, supplier, or cooperative entity"
                      value={newCvPayee}
                      onChange={e => setNewCvPayee(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-medium"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                      Check Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 000341829"
                      value={newCvCheckNo}
                      onChange={e => setNewCvCheckNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-mono font-bold"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                      Date Released
                    </label>
                    <input
                      type="date"
                      value={newCvReleasedDate}
                      onChange={e => setNewCvReleasedDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe transaction context, purpose of disbursement, or loan contract details..."
                    value={newCvParticulars}
                    onChange={e => setNewCvParticulars(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 resize-none"
                  />
                </div>

                {/* Fund Amount */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Fund Amount <span className="text-neutral-400 font-normal normal-case">(Total fund amount)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-sm">₱</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newCvFundAmount}
                      onChange={e => setNewCvFundAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-mono font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Used to compute Fund Balance on the detailed check voucher.
                  </p>
                </div>

                {/* Line Items Rows (Balanced Double Entry) */}
                {(() => {
                  const replenishType = getReplenishmentType(newCvCategory);
                  const isReplenish = Boolean(replenishType);
                  let debitTotal = 0;
                  let creditTotal = 0;
                  newCvRows.forEach(r => {
                    debitTotal += parseFloat(r.debit || '0') || 0;
                    creditTotal += parseFloat(r.credit || '0') || 0;
                  });
                  const disbursedAmt = getNewCvDisbursedAmount();

                  return (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-neutral-900 dark:text-white uppercase text-[11px] tracking-wider block">
                            {isReplenish ? 'Transaction Details' : 'Accounting Line Items & Breakdown'}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            {isReplenish
                              ? 'Selecting an expense account auto-generates the balancing credit row with matching fund category.'
                              : 'Specify debit and credit entries to match disbursed check amount.'}
                          </span>
                        </div>
                      </div>

                      <div className="border border-emerald-950/20 dark:border-emerald-800/40 rounded-2xl shadow-xs overflow-visible relative">
                        {isReplenish ? (
                          <>
                            {/* Top Banner matching Image 2 */}
                            <div className="bg-[#064e3b] text-white py-2 px-3 text-center font-bold text-xs uppercase tracking-wider rounded-t-2xl">
                              TRANSACTION DETAILS
                            </div>

                            {/* Table Column Header for Replenishment */}
                            <div className="grid grid-cols-[36px_110px_1.5fr_1.2fr_105px_105px_36px] px-3 py-2 bg-[#ecfdf5] dark:bg-emerald-950/40 font-bold text-[10px] uppercase tracking-wider text-[#064e3b] dark:text-emerald-300 gap-2 border-b border-emerald-950/10 items-center">
                              <div className="text-center">#</div>
                              <div>{replenishType === 'stl' ? 'LAF No.' : 'RF Voucher #'}</div>
                              <div>Book of Accounts</div>
                              <div>Remarks</div>
                              <div className="text-right">Debit (₱)</div>
                              <div className="text-right">Credit (₱)</div>
                              <div className="text-center">Action</div>
                            </div>

                            <div className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-surface-container-lowest overflow-visible">
                              {newCvRows.map((row, idx) => {
                                const isCreditRow = checkIsCreditRow(row);
                                return (
                                  <div
                                    key={row.id || idx}
                                    draggable
                                    onDragStart={() => { dragRowIdx.current = idx; }}
                                    onDragOver={e => handleRowDragOver(e, idx, false)}
                                    onDrop={() => {
                                      if (dragRowIdx.current !== null && dragOverRowIdx.current !== null) {
                                        reorderCvRows(dragRowIdx.current, dragOverRowIdx.current, false);
                                      }
                                      dragRowIdx.current = null;
                                      dragOverRowIdx.current = null;
                                    }}
                                    onDragEnd={() => { dragRowIdx.current = null; dragOverRowIdx.current = null; }}
                                    style={{ zIndex: newCvRows.length - idx + 10 }}
                                    className={`relative grid grid-cols-[36px_110px_1.5fr_1.2fr_105px_105px_36px] px-3 py-2 items-center gap-2 cursor-grab active:cursor-grabbing transition-colors select-none ${
                                      isCreditRow
                                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                                    }`}
                                  >
                                    <div className="text-center font-mono font-medium text-xs text-neutral-600 dark:text-neutral-400 flex items-center justify-center gap-0.5 cursor-grab" title="Drag to reorder row">
                                      <GripVertical className="w-3 h-3 text-neutral-400 shrink-0 opacity-60" />
                                      <span>{idx + 1}</span>
                                    </div>
                                    <div>
                                      <input
                                        type="text"
                                        placeholder={replenishType === 'stl' ? 'LAF No.' : 'RF Voucher #'}
                                        value={row.voucher_no || ''}
                                        onChange={e => updateCvRowField(false, row.id!, 'voucher_no', e.target.value, replenishType)}
                                        className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                      />
                                    </div>
                                    <div>
                                      {isCreditRow ? (
                                        <input
                                          type="text"
                                          value={row.description}
                                          onChange={e => updateCvRowField(false, row.id!, 'description', e.target.value, replenishType)}
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs font-bold text-emerald-900 dark:text-emerald-200 italic"
                                          placeholder="Credit Account (e.g. CIB-MBTC)"
                                        />
                                      ) : replenishType === 'stl' ? (
                                        <input
                                          type="text"
                                          value={row.description}
                                          onChange={e => updateCvRowField(false, row.id!, 'description', e.target.value, replenishType)}
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                          placeholder="Book of Accounts"
                                        />
                                      ) : (
                                        <ReplenishmentAccountDropdown
                                          value={row.description}
                                          onChange={val => updateCvRowField(false, row.id!, 'description', val, replenishType)}
                                          options={customAccountOptions}
                                          categoryMap={accountCategoryMap}
                                          onAddAccount={handleAddCustomAccount}
                                          onDeleteAccount={handleDeleteCustomAccount}
                                       />
                                      )}
                                    </div>
                                    <div>
                                      <input
                                        type="text"
                                        placeholder="Remarks..."
                                        value={row.remarks || ''}
                                        onChange={e => updateCvRowField(false, row.id!, 'remarks', e.target.value, replenishType)}
                                        className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                      />
                                    </div>
                                    <div>
                                      {isCreditRow ? (
                                        <div className="text-center font-mono text-xs text-neutral-400 dark:text-neutral-500 py-1.5">—</div>
                                      ) : (
                                        <input
                                          type="number"
                                          step="0.01"
                                          placeholder="0.00"
                                          value={row.debit}
                                          onChange={e => updateCvRowField(false, row.id!, 'debit', e.target.value, replenishType)}
                                          className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-right text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                        />
                                      )}
                                    </div>
                                    <div>
                                      {isCreditRow ? (
                                        <input
                                          type="number"
                                          step="0.01"
                                          placeholder="0.00"
                                          value={row.credit}
                                          onChange={e => updateCvRowField(false, row.id!, 'credit', e.target.value, replenishType)}
                                          className="w-full px-2 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 font-mono text-right text-xs font-bold text-rose-600 dark:text-rose-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                        />
                                      ) : (
                                        <div className="text-center font-mono text-xs text-neutral-400 dark:text-neutral-500 py-1.5">—</div>
                                      )}
                                    </div>
                                    <div className="col-span-1 text-center">
                                      {(() => {
                                        const hasMultipleDebits = newCvRows.filter(r => !checkIsCreditRow(r)).length > 1;
                                        const hasMultipleCredits = newCvRows.filter(r => checkIsCreditRow(r)).length > 1;
                                        const canDelete = isCreditRow ? hasMultipleCredits : hasMultipleDebits;
                                        return canDelete ? (
                                          <button
                                            type="button"
                                            onClick={() => removeCvRow(false, row.id!)}
                                            className="text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                            title="Remove row"
                                          >
                                            <X className="w-3.5 h-3.5 mx-auto" />
                                          </button>
                                        ) : null;
                                      })()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Table Total Footer matching Image 2 */}
                            <div className="grid grid-cols-[36px_110px_1.5fr_1.2fr_105px_105px_36px] px-3 py-2 bg-[#ecfdf5] dark:bg-emerald-950/40 font-bold text-xs border-t border-emerald-950/10 items-center rounded-b-2xl">
                              <div className="col-span-4 text-right pr-4 font-bold uppercase tracking-wider text-xs text-emerald-950 dark:text-emerald-200">
                                TOTAL:
                              </div>
                              <div className="text-right font-mono font-bold text-neutral-900 dark:text-white">
                                ₱{debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                ₱{creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                              <div></div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Standard Column Header */}
                            <div className="grid grid-cols-[36px_1.5fr_1.2fr_110px_110px_36px] px-3 py-2 bg-[#ecfdf5] dark:bg-emerald-950/40 font-bold text-[10px] uppercase tracking-wider text-[#064e3b] dark:text-emerald-300 items-center gap-2 border-b border-emerald-950/10">
                              <div className="text-center font-bold">#</div>
                              <div>Book of Account / Item Description</div>
                              <div>Remarks</div>
                              <div className="text-right">Debit (₱)</div>
                              <div className="text-right">Credit (₱)</div>
                              <div className="text-center">Action</div>
                            </div>

                            <div className="divide-y divide-outline-variant/20 bg-white dark:bg-surface-container-lowest">
                              {newCvRows.map((row, idx) => (
                                <div
                                  key={row.id || idx}
                                  draggable
                                  onDragStart={() => { dragRowIdx.current = idx; }}
                                  onDragOver={e => handleRowDragOver(e, idx, false)}
                                  onDrop={() => {
                                    if (dragRowIdx.current !== null && dragOverRowIdx.current !== null) {
                                      reorderCvRows(dragRowIdx.current, dragOverRowIdx.current, false);
                                    }
                                    dragRowIdx.current = null;
                                    dragOverRowIdx.current = null;
                                  }}
                                  onDragEnd={() => { dragRowIdx.current = null; dragOverRowIdx.current = null; }}
                                  className="grid grid-cols-[36px_1.5fr_1.2fr_110px_110px_36px] px-3 py-2 items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-neutral-50 dark:hover:bg-neutral-800/40 select-none transition-colors"
                                >
                                  <div className="text-center font-mono font-medium text-xs text-neutral-500 flex items-center justify-center gap-0.5 cursor-grab" title="Drag to reorder row">
                                    <GripVertical className="w-3 h-3 text-neutral-400 shrink-0 opacity-60" />
                                    <span>{idx + 1}</span>
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      placeholder={`Line item #${idx + 1}`}
                                      value={row.description}
                                      onChange={e => updateCvRowField(false, row.id!, 'description', e.target.value, null)}
                                      className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      placeholder="Remarks..."
                                      value={row.remarks || ''}
                                      onChange={e => updateCvRowField(false, row.id!, 'remarks', e.target.value, null)}
                                      className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="Debit"
                                      value={row.debit}
                                      onChange={e => updateCvRowField(false, row.id!, 'debit', e.target.value, null)}
                                      className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-right text-xs"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="Credit"
                                      value={row.credit}
                                      onChange={e => updateCvRowField(false, row.id!, 'credit', e.target.value, null)}
                                      className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-right text-xs"
                                    />
                                  </div>
                                  <div className="text-center">
                                    {newCvRows.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeCvRow(false, row.id!)}
                                        className="text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                                        title="Remove row"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Action Buttons Row below table box */}
                      {isReplenish && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          {deletedRowsStack.some(item => !item.isEdit) && (
                            <button
                              type="button"
                              onClick={() => handleUndoDeleteRow(false)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                              title="Undo last deleted line item"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Undo Delete</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => addCvRow(false, replenishType, false)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary hover:bg-primary/20 dark:hover:bg-secondary/20 text-xs font-bold transition-all cursor-pointer"
                            title="Add an expense debit line item"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Debit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => addCvRow(false, replenishType, true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/20 dark:hover:bg-emerald-400/20 text-xs font-bold transition-all cursor-pointer"
                            title="Add a credit / replenishment line item"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Credit</span>
                          </button>
                        </div>
                      )}

                      {/* Calculated summary row */}
                      <div className="p-3.5 rounded-2xl bg-surface-container-low dark:bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-outline-variant/40">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="font-bold text-neutral-600 dark:text-neutral-300">
                            Total Debit: <span className="font-mono text-neutral-900 dark:text-neutral-100 font-extrabold">₱{debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </span>
                          <span className="font-bold text-neutral-600 dark:text-neutral-300">
                            Total Credit: <span className="font-mono text-neutral-900 dark:text-neutral-100 font-extrabold">₱{creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </span>
                          {Math.abs(debitTotal - creditTotal) < 0.01 && debitTotal > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Balanced
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                            Disbursed Amount
                          </span>
                          <span className="font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-300">
                            ₱{disbursedAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Signatories Section */}
                {(() => {
                  const isReplenish = Boolean(getReplenishmentType(newCvCategory));
                  return (
                    <div className="space-y-4 pt-2 border-t border-outline-variant/60">
                      {/* Summary Check Voucher Signatories */}
                      <div className="p-3.5 rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                            Summary Voucher Signatories
                          </span>
                          <span className="text-[9px] font-semibold text-neutral-400">Used for Summary Check Voucher printouts</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Prepared By</label>
                            <input
                              type="text"
                              value={newCvPreparedBy}
                              onChange={e => setNewCvPreparedBy(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-800 text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Checked By</label>
                            <input
                              type="text"
                              value={newCvCheckedBy}
                              onChange={e => setNewCvCheckedBy(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-800 text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                              {isReplenish ? 'Approved By (Summary)' : 'Approved By'}
                            </label>
                            <input
                              type="text"
                              value={newCvApprovedBy}
                              onChange={e => setNewCvApprovedBy(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-800 text-xs font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Detailed Check Voucher Signatories */}
                      {isReplenish && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              Detailed Check Voucher Signatories (Replenishment / Liquidation)
                            </span>
                            <span className="text-[9px] font-semibold text-emerald-700/80 dark:text-emerald-400/80">Used on Detailed Check Voucher page</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 uppercase">Liquidated By</label>
                                <span className="text-[9px] text-neutral-400">
                                  Title: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{getSignatoryTitle(newCvLiquidatedBy) || 'None'}</strong>
                                </span>
                              </div>
                              <input
                                type="text"
                                value={newCvLiquidatedBy}
                                onChange={e => setNewCvLiquidatedBy(e.target.value)}
                                placeholder="e.g. MICHELLE M. PABLE"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800/60 bg-white dark:bg-neutral-800 text-xs font-semibold uppercase"
                              />
                              <div className="flex gap-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() => setNewCvLiquidatedBy('MICHELLE M. PABLE')}
                                  className="px-1.5 py-0.5 rounded text-[9px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-neutral-600 dark:text-neutral-300 cursor-pointer font-medium"
                                >
                                  Pable (Manager)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewCvLiquidatedBy('CANDILARIO N. TATOY')}
                                  className="px-1.5 py-0.5 rounded text-[9px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-neutral-600 dark:text-neutral-300 cursor-pointer font-medium"
                                >
                                  Tatoy (Chairman)
                                </button>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 uppercase">Approved By (Detailed)</label>
                                <span className="text-[9px] text-neutral-400">
                                  Title: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{getSignatoryTitle(newCvDetailedApprovedBy) || 'None'}</strong>
                                </span>
                              </div>
                              <input
                                type="text"
                                value={newCvDetailedApprovedBy}
                                onChange={e => setNewCvDetailedApprovedBy(e.target.value)}
                                placeholder="e.g. CANDILARIO N. TATOY"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800/60 bg-white dark:bg-neutral-800 text-xs font-semibold uppercase"
                              />
                              <div className="flex gap-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() => setNewCvDetailedApprovedBy('CANDILARIO N. TATOY')}
                                  className="px-1.5 py-0.5 rounded text-[9px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-neutral-600 dark:text-neutral-300 cursor-pointer font-medium"
                                >
                                  Tatoy (Chairman)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewCvDetailedApprovedBy('MICHELLE M. PABLE')}
                                  className="px-1.5 py-0.5 rounded text-[9px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-neutral-600 dark:text-neutral-300 cursor-pointer font-medium"
                                >
                                  Pable (Manager)
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-outline-variant/60 shrink-0 bg-surface-container-lowest dark:bg-neutral-900">
                <button
                  type="button"
                  onClick={() => setIsCreateCVOpen(false)}
                  className="px-5 py-2.5 rounded-full border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNewCv}
                  className="px-6 py-2.5 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingNewCv ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Create Voucher</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* VIEW CHECK VOUCHER MODAL */}
      {selectedCvForModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop"
          onClick={() => setSelectedCvForModal(null)}
        >
          <div
            className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-3xl shadow-2xl relative animate-modal-pop overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline font-bold text-base text-on-surface dark:text-white">
                      Check Voucher
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-emerald-800/60">
                      CV #{selectedCvForModal.voucher_no}
                    </span>
                    {selectedCvForModal.loan_id && (
                      <Link
                        href={`/dashboard/loans?search=${selectedCvForModal.voucher_no}`}
                        className="inline-flex items-center gap-1 font-sans text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold border border-blue-300 dark:border-blue-800/60 hover:underline"
                        title="View Loan in Loan Monitoring"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Loan #{selectedCvForModal.voucher_no}
                      </Link>
                    )}
                    {renderStatusBadge(selectedCvForModal.status, selectedCvForModal)}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Accounting line items &amp; deduction details
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCvForModal(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
              {/* Voucher Meta Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Voucher Date</span>
                  <span className="text-sm font-bold text-on-surface dark:text-white truncate block mt-0.5">
                    {selectedCvForModal.voucher_date ? new Date(selectedCvForModal.voucher_date).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Disbursement Category</span>
                  <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300 truncate block mt-0.5">
                    {formatCategoryLabel(selectedCvForModal.folder_name)}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Payee</span>
                  <span className="text-sm font-bold text-on-surface dark:text-white truncate block mt-0.5" title={selectedCvForModal.payee || '—'}>
                    {selectedCvForModal.payee || '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Bank</span>
                  <span className="text-sm font-bold text-on-surface dark:text-white truncate block mt-0.5">
                    {selectedCvForModal.bank_name || selectedCvForModal.bank || '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Check No.</span>
                  <span className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400 truncate block mt-0.5">
                    {selectedCvForModal.check_no || '—'}
                  </span>
                </div>

                {/* Date Sealed & Disbursed Card */}
                {(selectedCvForModal.status === 'filed' || selectedCvForModal.date_released || isStlOrRfTabOrVoucher(selectedCvForModal)) && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-500/40 flex flex-col justify-between group relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                        Date Disbursed
                      </span>
                      {isAdminOrStaff && (
                        <button
                          type="button"
                          onClick={e => handleOpenEditDisbursedDate(selectedCvForModal, e)}
                          className="p-1 rounded-md text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                          title="Edit Date Disbursed"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100 truncate block mt-0.5 font-mono">
                      {selectedCvForModal.date_released
                        ? new Date(selectedCvForModal.date_released).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {(selectedCvForModal.particulars || selectedCvForModal.payee) && (
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-outline-variant/30 text-xs">
                  <span className="font-bold text-neutral-500 block mb-0.5">Description:</span>
                  <p className="text-neutral-700 dark:text-neutral-300 italic">
                    {formatVoucherDescription(selectedCvForModal.particulars, selectedCvForModal.payee)}
                  </p>
                </div>
              )}


              {/* Transaction Details Table */}
              {(() => {
                const isReplenish = isStlOrRfTabOrVoucher(selectedCvForModal);
                const summaryData = getSummaryCvRows(selectedCvForModal);
                const detailedData = getBalancedCvRows(selectedCvForModal);
                const activeData = isReplenish ? summaryData : detailedData;
                const { rows, debitTotal, creditTotal } = activeData;
                const isStl = getReplenishmentType(selectedCvForModal?.folder_name, selectedCvForModal) === 'stl';

                return (
                  <div className="space-y-3">
                    {isReplenish ? (
                      /* Replenishment Summary Breakdown Table */
                      <div className="border border-emerald-300 dark:border-emerald-700/60 rounded-2xl overflow-hidden text-[10px] shadow-2xs">
                        <div className="bg-[#064e3b] text-white px-4 py-2 text-center">
                          <span className="font-extrabold uppercase text-[10px] tracking-wider text-white">
                            TRANSACTION DETAILS
                          </span>
                        </div>
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#ecfdf5] dark:bg-emerald-950/40 text-[#064e3b] dark:text-emerald-300 font-extrabold uppercase text-[9px] border-b border-emerald-200 dark:border-emerald-800">
                            <tr>
                              <th className="p-2.5 w-12 text-center border-r border-emerald-200 dark:border-emerald-800">#</th>
                              <th className="p-2.5 w-28 border-r border-emerald-200 dark:border-emerald-800">{isStl ? 'LAF NO.' : 'RF VOUCHER #'}</th>
                              <th className="p-2.5 border-r border-emerald-200 dark:border-emerald-800">BOOK OF ACCOUNTS</th>
                              <th className="p-2.5 w-36 text-right border-r border-emerald-200 dark:border-emerald-800">DEBIT (₱)</th>
                              <th className="p-2.5 w-36 text-right">CREDIT (₱)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summaryData.rows.map((item, idx) => (
                              <tr key={idx} className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-emerald-50/30">
                                <td className="p-2.5 text-center font-mono font-medium text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                                  {idx + 1}
                                </td>
                                <td className="p-2.5 font-mono text-[10px] font-bold text-neutral-800 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-800">
                                  {item.voucher_no || selectedCvForModal.voucher_no || '—'}
                                </td>
                                <td className="p-2.5 border-r border-neutral-200 dark:border-neutral-800 font-bold text-neutral-900 dark:text-white">
                                  {item.description}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                                  {item.debit !== null ? item.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : <span className="text-neutral-400 font-bold">–</span>}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                  {item.credit !== null ? item.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : <span className="text-rose-500 font-bold">–</span>}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-[#ecfdf5] dark:bg-emerald-950/40 font-bold border-t border-emerald-300 dark:border-emerald-700 text-[10px]">
                              <td colSpan={3} className="p-2.5 text-right uppercase tracking-wider text-neutral-900 dark:text-white font-extrabold">TOTAL:</td>
                              <td className="p-2.5 text-right font-mono font-extrabold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                                ₱{summaryData.debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-2.5 text-right font-mono font-extrabold text-rose-600 dark:text-rose-400">
                                ₱{summaryData.creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* Standard Loan Disbursement Table */
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                            TRANSACTION DETAILS
                          </h5>
                        </div>
                        <div className="border border-emerald-200 dark:border-emerald-800/60 rounded-2xl overflow-hidden shadow-2xs">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-[#ecfdf5] dark:bg-emerald-950/40 text-[#064e3b] dark:text-emerald-300 font-bold uppercase text-[10px] tracking-wider border-b border-emerald-200 dark:border-emerald-800/60">
                                <th className="px-4 py-2.5 text-left w-12 font-bold">#</th>
                                <th className="px-4 py-2.5 text-left font-bold">Book of Accounts</th>
                                <th className="px-4 py-2.5 text-right w-36 font-bold">Debit</th>
                                <th className="px-4 py-2.5 text-right w-36 font-bold">Credit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/20 bg-white dark:bg-surface-container-lowest">
                              {rows.map((item, idx) => (
                                <tr key={idx} className="hover:bg-emerald-50/20 dark:hover:bg-neutral-800/40 transition-colors">
                                  <td className="px-4 py-2.5 text-neutral-400 font-mono">{idx + 1}</td>
                                  <td className="px-4 py-2.5 font-medium text-on-surface dark:text-white">
                                    {item.description}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold whitespace-nowrap text-neutral-900 dark:text-neutral-100">
                                    {item.debit !== null ? `₱${item.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold whitespace-nowrap text-rose-600 dark:text-rose-400">
                                    {item.credit !== null ? `₱${item.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : <span className="text-rose-500 font-bold">—</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="font-bold bg-[#ecfdf5]/60 dark:bg-emerald-950/30 border-t border-emerald-200 dark:border-emerald-800/60 text-xs">
                              <tr>
                                <td colSpan={2} className="px-4 py-2.5 font-bold text-right uppercase tracking-wide text-neutral-700 dark:text-neutral-200">TOTAL:</td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold text-neutral-900 dark:text-white">
                                  {debitTotal > 0 ? `₱${debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                  {creditTotal > 0 ? `₱${creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Disbursed Amount Box below table */}
                    <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-1">
                          DISBURSED AMOUNT:
                        </span>
                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wide leading-relaxed">
                          {formatDisbursedInWords(debitTotal || getCvDisbursedAmount(selectedCvForModal))}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-mono font-extrabold text-base text-emerald-700 dark:text-emerald-300">
                          ₱{(debitTotal || getCvDisbursedAmount(selectedCvForModal)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>


                    {/* Signatures Block matching physical document */}
                    <div className="pt-4 border-t border-outline-variant/30 space-y-4 text-xs">
                      {/* Row 1: Prepared By, Checked By, Approved By */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">PREPARED BY:</span>
                          <div className="h-5"></div>
                          <p className="text-xs font-bold text-on-surface dark:text-white mb-1 uppercase">
                            {selectedCvForModal.signatories?.prepared_by || 'LAMOSTE, CHINNETTE A.'}
                          </p>
                          <div className="border-b border-neutral-300 dark:border-neutral-700"></div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">CHECKED BY:</span>
                          <div className="h-5"></div>
                          <p className="text-xs font-bold text-on-surface dark:text-white mb-1 uppercase">
                            {selectedCvForModal.signatories?.checked_by || 'MARILOU LARIOSA'}
                          </p>
                          <div className="border-b border-neutral-300 dark:border-neutral-700"></div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">APPROVED BY:</span>
                          <div className="h-5"></div>
                          <p className="text-xs font-bold text-on-surface dark:text-white mb-1 uppercase">
                            {selectedCvForModal.signatories?.approved_by || 'MICHELLE M. PABLE'}
                          </p>
                          <div className="border-b border-neutral-300 dark:border-neutral-700"></div>
                        </div>
                      </div>

                      {/* Row 2: Received By, Date */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">RECEIVED BY:</span>
                          <div className="h-8"></div>
                          <div className="border-b border-neutral-300 dark:border-neutral-700"></div>
                          <p className="text-[9px] text-neutral-500 mt-1">Signature over Printed Name</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block">DATE:</span>
                          <div className="h-8 flex items-center">
                            {selectedCvForModal.date_released ? (
                              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 font-mono">
                                {new Date(selectedCvForModal.date_released).toLocaleDateString('en-GB')}
                              </span>
                            ) : null}
                          </div>
                          <div className="border-b border-neutral-300 dark:border-neutral-700"></div>
                        </div>
                        <div></div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-outline-variant/30 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/40 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCvForModal(null)}
                className="px-5 py-2 text-xs font-semibold rounded-full border border-outline-variant text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                Close
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Staff / Admin: Approve for Release when 'on process' */}
                {selectedCvForModal.status === 'on process' && isAdminOrStaff && (
                  <button
                    type="button"
                    disabled={isApprovingCv}
                    onClick={() => handleApproveForRelease(selectedCvForModal)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isApprovingCv ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isApprovingCv ? 'Approving...' : 'Approve for Release'}</span>
                  </button>
                )}

                {/* If on process: allow staff/admin to Revert to Edit */}
                {selectedCvForModal.status === 'on process' && isAdminOrStaff && (
                  <button
                    type="button"
                    onClick={() => handleRevertToEdit(selectedCvForModal)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-xs transition-all cursor-pointer"
                    title="Revert back to Edit status if printing was cancelled or details need changes"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revert to Edit</span>
                  </button>
                )}

                {/* Admin ONLY: Release & File (Seal & Disburse) when 'for release' */}
                {selectedCvForModal.status === 'for release' && isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleFileAndLockCv(selectedCvForModal)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Seal &amp; Disburse</span>
                  </button>
                )}

                {/* Admin ONLY: Override & Edit for Filed Vouchers */}
                {selectedCvForModal.status === 'filed' && isAdmin && (
                  <button
                    type="button"
                    onClick={() => startEditingCv(selectedCvForModal, modalCvViewMode)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Override lock and edit this filed check voucher"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Override &amp; Edit</span>
                  </button>
                )}

                {/* Edit Voucher for vouchers in 'edit' status */}
                {isAdminOrStaff && (!selectedCvForModal.status || selectedCvForModal.status.toLowerCase() === 'edit') && (
                  <button
                    type="button"
                    onClick={() => startEditingCv(selectedCvForModal, modalCvViewMode)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Edit check voucher line items and details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Voucher</span>
                  </button>
                )}

                {/* Admin ONLY: Edit Disbursed Date button for Filed Vouchers */}
                {selectedCvForModal.status === 'filed' && isAdmin && (
                  <button
                    type="button"
                    onClick={e => handleOpenEditDisbursedDate(selectedCvForModal, e)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Edit date when voucher was sealed and disbursed"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Edit Date Disbursed</span>
                  </button>
                )}

                {/* Advance to On Process if currently 'edit' */}
                {isAdminOrStaff && (!selectedCvForModal.status || selectedCvForModal.status.toLowerCase() === 'edit') && (
                  <button
                    type="button"
                    onClick={() => handleMarkOnProcess(selectedCvForModal)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold text-xs transition-all cursor-pointer"
                    title="Advance voucher status to On Process"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mark On Process</span>
                  </button>
                )}


                {isStlOrRfTabOrVoucher(selectedCvForModal) ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handlePrintCvBreakdown(selectedCvForModal)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full border border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all active:scale-95 cursor-pointer"
                      title="Print only the single check voucher sheet"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Voucher Only</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openUnifiedPrintModalForCv(selectedCvForModal)}
                      className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-full bg-emerald-700 hover:bg-emerald-800 text-white shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                      title="Print Check Voucher with integrated itemized expense breakdown"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Check Voucher (Full Schedule)</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePrintCvBreakdown(selectedCvForModal)}
                    className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-full bg-emerald-700 hover:bg-emerald-800 text-white shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Breakdown</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT CHECK VOUCHER MODAL */}
      {isEditingCvModal && mounted && createPortal(
        <div
          data-editing-session="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 sm:p-6 animate-modal-backdrop"
          onClick={e => {
            // Prevent accidental closure when clicking backdrop during voucher edits
            e.stopPropagation();
          }}
        >
          <div
            className="bg-surface-container-lowest dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-modal-pop overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/60 p-5 sm:p-6 shrink-0 bg-surface-container-lowest dark:bg-neutral-900">
              <div>
                <h2 className="text-xl font-headline font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-primary dark:text-secondary" />
                  Modify Check Voucher #{editCvFormData.voucher_no}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Update disbursement details, line items, and signatories.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEditCvModal}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={editModalScrollRef} className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5 text-xs custom-scrollbar">
              {/* Override Banner when editing a filed check voucher */}
              {editCvFormData.status === 'filed' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                      <Unlock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">Override Mode (Filed Voucher)</span>
                      <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                        You are modifying a sealed &amp; filed check voucher. Any changes to amounts, description, dates, or line items will be updated.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Status:</span>
                    <select
                      value={editCvFormData.status}
                      onChange={e => setEditCvFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="px-2.5 py-1.5 rounded-xl border border-amber-500/40 bg-white dark:bg-neutral-800 text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer"
                    >
                      <option value="filed">Keep as Filed (Locked)</option>
                      <option value="edit">Revert to Edit</option>
                      <option value="for release">Revert to For Release</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Voucher No.
                  </label>
                  <input
                    type="text"
                    value={editCvFormData.voucher_no}
                    onChange={e => setEditCvFormData({ ...editCvFormData, voucher_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Voucher Date
                  </label>
                  <input
                    type="date"
                    value={editCvFormData.voucher_date}
                    onChange={e => setEditCvFormData({ ...editCvFormData, voucher_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Check No.
                  </label>
                  <input
                    type="text"
                    value={editCvFormData.check_no}
                    onChange={e => setEditCvFormData({ ...editCvFormData, check_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Bank
                  </label>
                  <AnimatedSelect
                    value={editCvFormData.bank}
                    onChange={val => {
                      setEditCvFormData(prev => ({ ...prev, bank: val }));
                      const replenishType = getReplenishmentType(editCvFormData.folder_name, selectedCvForModal);
                      if (replenishType) {
                        const cibName = formatCibAccountName(val);
                        setEditCvRows(rows =>
                          rows.map(r =>
                            (/cib\b|cash\s*in\s*bank/i.test(r.description || '') || (!r.description && r.isAutoCredit))
                              ? { ...r, description: cibName }
                              : r
                          )
                        );
                      }
                    }}
                    options={
                      DRAW_BANK_OPTIONS.some(o => o.value === editCvFormData.bank)
                        ? DRAW_BANK_OPTIONS
                        : editCvFormData.bank
                        ? [...DRAW_BANK_OPTIONS, { value: editCvFormData.bank, label: `${editCvFormData.bank} (Current)` }]
                        : DRAW_BANK_OPTIONS
                    }
                    buttonClassName="font-medium"
                    align="right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Payee Name
                  </label>
                  <input
                    type="text"
                    value={editCvFormData.payee}
                    onChange={e => setEditCvFormData({ ...editCvFormData, payee: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Disbursement Category
                  </label>
                  <AnimatedSelect
                    value={editCvFormData.folder_name}
                    onChange={val => setEditCvFormData({ ...editCvFormData, folder_name: val })}
                    options={[
                      ...DISBURSEMENT_CATEGORY_OPTIONS,
                      ...(editCvFormData.folder_name && !DISBURSEMENT_CATEGORY_OPTIONS.some(t => t.value.toLowerCase() === editCvFormData.folder_name.toLowerCase())
                        ? [{ value: editCvFormData.folder_name, label: editCvFormData.folder_name }]
                        : [])
                    ]}
                    buttonClassName="font-medium"
                    menuClassName="min-w-[220px]"
                    align="right"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1 flex items-center justify-between">
                    <span>Date Disbursed</span>
                    {editCvFormData.date_released && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold lowercase tracking-normal">sealed/disbursed</span>
                    )}
                  </label>
                  <input
                    type="date"
                    disabled={!isAdmin}
                    title={!isAdmin ? 'Only administrators can edit the disbursed date' : undefined}
                    value={editCvFormData.date_released}
                    onChange={e => setEditCvFormData({ ...editCvFormData, date_released: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editCvFormData.particulars}
                  onChange={e => setEditCvFormData({ ...editCvFormData, particulars: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 resize-none"
                />
              </div>

              {/* Rows */}
              {(() => {
                const replenishType = getReplenishmentType(editCvFormData.folder_name, selectedCvForModal);
                const isReplenish = Boolean(replenishType);
                let debitTotal = 0;
                let creditTotal = 0;
                editCvRows.forEach(r => {
                  debitTotal += parseFloat(r.debit || '0') || 0;
                  creditTotal += parseFloat(r.credit || '0') || 0;
                });

                return (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-neutral-900 dark:text-white uppercase text-[11px] tracking-wider block">
                          {isReplenish ? 'Transaction Details' : 'Breakdown Rows'}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {isReplenish
                            ? 'Selecting an expense account auto-generates the balancing credit row with matching fund category.'
                            : 'Specify debit and credit entries to balance disbursed check amount.'}
                        </span>
                      </div>
                      {!isReplenish && (
                        <button
                          type="button"
                          onClick={() => addCvRow(true, null, false)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-secondary hover:underline cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Row
                        </button>
                      )}
                    </div>

                    <div className="border border-emerald-950/20 dark:border-emerald-800/40 rounded-2xl shadow-xs overflow-visible relative">
                      {isReplenish ? (
                        <>
                          {/* Top Banner matching Image 2 */}
                          <div className="bg-[#064e3b] text-white py-2 px-3 text-center font-bold text-xs uppercase tracking-wider rounded-t-2xl">
                            TRANSACTION DETAILS
                          </div>

                          {/* Table Column Header for Replenishment */}
                          <div className="grid grid-cols-[36px_110px_1.5fr_1.2fr_105px_105px_36px] px-3 py-2 bg-[#ecfdf5] dark:bg-emerald-950/40 font-bold text-[10px] uppercase tracking-wider text-[#064e3b] dark:text-emerald-300 gap-2 border-b border-emerald-950/10 items-center">
                            <div className="text-center">#</div>
                            <div>{replenishType === 'stl' ? 'LAF No.' : 'RF Voucher #'}</div>
                            <div>Book of Accounts</div>
                            <div>Remarks</div>
                            <div className="text-right">Debit (₱)</div>
                            <div className="text-right">Credit (₱)</div>
                            <div className="text-center">Action</div>
                          </div>

                          <div className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-surface-container-lowest overflow-visible">
                            {editCvRows.map((row, idx) => {
                              const isCreditRow = checkIsCreditRow(row);
                              return (
                                <div
                                  key={row.id || idx}
                                  draggable
                                  onDragStart={() => { dragRowIdx.current = idx; }}
                                  onDragOver={e => handleRowDragOver(e, idx)}
                                  onDrop={() => {
                                    if (dragRowIdx.current !== null && dragOverRowIdx.current !== null) {
                                      reorderCvRows(dragRowIdx.current, dragOverRowIdx.current);
                                    }
                                    dragRowIdx.current = null;
                                    dragOverRowIdx.current = null;
                                  }}
                                  onDragEnd={() => { dragRowIdx.current = null; dragOverRowIdx.current = null; }}
                                  style={{ zIndex: editCvRows.length - idx + 10 }}
                                  className={`relative grid grid-cols-[36px_110px_1.5fr_1.2fr_105px_105px_36px] px-3 py-2 items-center gap-2 cursor-grab active:cursor-grabbing transition-colors select-none ${
                                    isCreditRow
                                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                                  }`}
                                >
                                  <div className="flex items-center justify-center gap-0.5 text-neutral-400 group-hover:text-neutral-600">
                                    <GripVertical className="w-3 h-3 cursor-grab opacity-60" />
                                    <span className="font-mono text-xs font-medium text-neutral-600 dark:text-neutral-400">{idx + 1}</span>
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      placeholder={replenishType === 'stl' ? 'LAF No.' : 'RF Voucher #'}
                                      value={row.voucher_no || ''}
                                      onChange={e => updateCvRowField(true, row.id!, 'voucher_no', e.target.value, replenishType)}
                                      className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                  </div>
                                  <div>
                                    {isCreditRow ? (
                                      <input
                                        type="text"
                                        value={row.description}
                                        onChange={e => updateCvRowField(true, row.id!, 'description', e.target.value, replenishType)}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs font-bold text-emerald-900 dark:text-emerald-200 italic"
                                        placeholder="Credit Account (e.g. CIB-MBTC)"
                                      />
                                    ) : (
                                      replenishType === 'stl' ? (
                                        <input
                                          type="text"
                                          value={row.description}
                                          onChange={e => updateCvRowField(true, row.id!, 'description', e.target.value, replenishType)}
                                          className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                          placeholder="Book of Accounts"
                                        />
                                      ) : (
                                        <ReplenishmentAccountDropdown
                                        value={row.description}
                                        onChange={val => updateCvRowField(true, row.id!, 'description', val, replenishType)}
                                        options={customAccountOptions}
                                        categoryMap={accountCategoryMap}
                                        onAddAccount={handleAddCustomAccount}
                                        onDeleteAccount={handleDeleteCustomAccount}
                                      />
                                     )
                                    )}
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      placeholder="Remarks..."
                                      value={row.remarks || ''}
                                      onChange={e => updateCvRowField(true, row.id!, 'remarks', e.target.value, replenishType)}
                                      className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                  </div>
                                  <div>
                                    {isCreditRow ? (
                                      <div className="text-center font-mono text-xs text-neutral-400 dark:text-neutral-500 py-1.5">—</div>
                                    ) : (
                                      <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={row.debit}
                                        onChange={e => updateCvRowField(true, row.id!, 'debit', e.target.value, replenishType)}
                                        className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-right text-xs font-bold text-neutral-900 dark:text-neutral-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                      />
                                    )}
                                  </div>
                                  <div>
                                    {isCreditRow ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={row.credit}
                                        onChange={e => updateCvRowField(true, row.id!, 'credit', e.target.value, replenishType)}
                                        className="w-full px-2 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 font-mono text-right text-xs font-bold text-rose-600 dark:text-rose-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                      />
                                    ) : (
                                      <div className="text-center font-mono text-xs text-neutral-400 dark:text-neutral-500 py-1.5">—</div>
                                    )}
                                  </div>
                                  <div className="text-center">
                                    {(() => {
                                      const hasMultipleDebits = editCvRows.filter(r => !checkIsCreditRow(r)).length > 1;
                                      const hasMultipleCredits = editCvRows.filter(r => checkIsCreditRow(r)).length > 1;
                                      const canDelete = isCreditRow ? hasMultipleCredits : hasMultipleDebits;
                                      return canDelete ? (
                                        <button
                                          type="button"
                                          onClick={e => { e.stopPropagation(); removeCvRow(true, row.id!); }}
                                          className="text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                          title="Remove row"
                                        >
                                          <X className="w-3.5 h-3.5 mx-auto" />
                                        </button>
                                      ) : null;
                                    })()}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Footer: 3-row for STL Replenishment only, 2-row (TOTAL & CIB only) for Revolving Check Voucher */}
                          <div className="border-t border-emerald-950/10 bg-[#ecfdf5] dark:bg-emerald-950/40 divide-y divide-emerald-200/60 dark:divide-emerald-800/40 rounded-b-2xl">
                            {replenishType === 'stl' ? (
                              <>
                                {/* Row 1: TOTAL (deductions) */}
                                <div className="grid grid-cols-[36px_110px_1.5fr_1.2fr_105px_105px_36px] px-3 py-2 items-center gap-2 font-bold text-xs">
                                  <div className="col-span-4 text-right pr-4 font-bold uppercase tracking-wider text-xs text-emerald-950 dark:text-emerald-200">
                                    TOTAL:
                                  </div>
                                  <div className="text-center font-mono font-bold text-neutral-400 dark:text-neutral-500">
                                    —
                                  </div>
                                  <div className="text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                    ₱{creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div></div>
                                </div>

                                {/* Row 2: CIB Account with manual input for credit column */}
                                <div className="grid grid-cols-[36px_110px_1.5fr_1.2fr_105px_105px_36px] px-3 py-1.5 items-center gap-2 font-bold text-xs bg-emerald-100/40 dark:bg-emerald-950/60">
                                  <div className="col-span-4 text-right pr-4 font-extrabold uppercase tracking-wider text-xs text-[#064e3b] dark:text-emerald-300">
                                    {formatCibAccountName(editCvFormData.bank).replace('-', ':')}:
                                  </div>
                                  <div className="text-center font-mono font-bold text-neutral-400 dark:text-neutral-500">
                                    —
                                  </div>
                                  <div>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={editCvCibAmount}
                                      onChange={e => setEditCvCibAmount(e.target.value)}
                                      className="w-full px-2 py-1 rounded-lg border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-neutral-900 font-mono text-right text-xs font-extrabold text-[#064e3b] dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                                      title={`Manually input ${formatCibAccountName(editCvFormData.bank).replace('-', ':')} credit amount`}
                                    />
                                  </div>
                                  <div></div>
                                </div>

                                {/* Row 3: OVERALL (balanced) */}
                                <div className="grid grid-cols-[36px_110px_1.5fr_1.2fr_105px_105px_36px] px-3 py-2.5 items-center gap-2 font-extrabold text-xs bg-[#d1fae5]/70 dark:bg-emerald-900/40 rounded-b-2xl">
                                  <div className="col-span-4 text-right pr-4 font-black uppercase tracking-wider text-xs text-[#064e3b] dark:text-emerald-200">
                                    OVERALL:
                                  </div>
                                  <div className="text-right font-mono font-black text-[#064e3b] dark:text-emerald-200">
                                    ₱{debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div className="text-right font-mono font-black text-[#064e3b] dark:text-emerald-200">
                                    ₱{(creditTotal + (parseFloat(editCvCibAmount || '0') || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div></div>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* Row 1: TOTAL for Revolving: Debit has total, Credit is — */}
                                <div className="grid grid-cols-[36px_110px_1.5fr_1.2fr_105px_105px_36px] px-3 py-2 items-center gap-2 font-bold text-xs">
                                  <div className="col-span-4 text-right pr-4 font-bold uppercase tracking-wider text-xs text-emerald-950 dark:text-emerald-200">
                                    TOTAL:
                                  </div>
                                  <div className="text-right font-mono font-bold text-neutral-900 dark:text-white">
                                    ₱{debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div className="text-center font-mono font-bold text-neutral-400 dark:text-neutral-500">
                                    —
                                  </div>
                                  <div></div>
                                </div>

                                {/* Row 2: CIB Account for Revolving: Debit is —, Credit has CIB check amount */}
                                <div className="grid grid-cols-[36px_110px_1.5fr_1.2fr_105px_105px_36px] px-3 py-1.5 items-center gap-2 font-bold text-xs bg-emerald-100/40 dark:bg-emerald-950/60 rounded-b-2xl">
                                  <div className="col-span-4 text-right pr-4 font-extrabold uppercase tracking-wider text-xs text-[#064e3b] dark:text-emerald-300">
                                    {formatCibAccountName(editCvFormData.bank).replace('-', ':')}:
                                  </div>
                                  <div className="text-center font-mono font-bold text-neutral-400 dark:text-neutral-500">
                                    —
                                  </div>
                                  <div className="text-right font-mono font-extrabold text-[#064e3b] dark:text-emerald-300 pr-1">
                                    ₱{(creditTotal > 0 ? creditTotal : (parseFloat(editCvCibAmount || '0') || debitTotal)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div></div>
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Standard Column Header */}
                          <div className="grid grid-cols-[36px_1.5fr_1.2fr_110px_110px_36px] px-3 py-2 bg-[#ecfdf5] dark:bg-emerald-950/40 text-[10px] font-bold uppercase tracking-wider text-[#064e3b] dark:text-emerald-300 items-center gap-2 border-b border-emerald-950/10">
                            <div className="text-center font-bold">#</div>
                            <div>Book of Account</div>
                            <div>Remarks</div>
                            <div className="text-right">Debit (₱)</div>
                            <div className="text-right">Credit (₱)</div>
                            <div className="text-center">Action</div>
                          </div>

                          <div className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-surface-container-lowest">
                            {editCvRows.map((row, idx) => (
                              <div
                                key={row.id || idx}
                                draggable
                                onDragStart={() => { dragRowIdx.current = idx; }}
                                onDragOver={e => handleRowDragOver(e, idx)}
                                onDrop={() => {
                                  if (dragRowIdx.current !== null && dragOverRowIdx.current !== null) {
                                    reorderCvRows(dragRowIdx.current, dragOverRowIdx.current);
                                  }
                                  dragRowIdx.current = null;
                                  dragOverRowIdx.current = null;
                                }}
                                onDragEnd={() => { dragRowIdx.current = null; dragOverRowIdx.current = null; }}
                                className="grid grid-cols-[36px_1.5fr_1.2fr_110px_110px_36px] px-3 py-2 items-center gap-2 cursor-grab active:cursor-grabbing hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors select-none"
                              >
                                <div className="flex items-center justify-center gap-0.5 text-neutral-400 group-hover:text-neutral-600">
                                  <GripVertical className="w-3 h-3 cursor-grab opacity-60" />
                                  <span className="font-mono text-xs font-medium text-neutral-500">{idx + 1}</span>
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    value={row.description}
                                    onChange={e => updateCvRowField(true, row.id!, 'description', e.target.value, null)}
                                    placeholder="Account description"
                                    className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs cursor-text"
                                  />
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    value={row.remarks || ''}
                                    onChange={e => updateCvRowField(true, row.id!, 'remarks', e.target.value, null)}
                                    placeholder="Remarks..."
                                    className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs cursor-text"
                                  />
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={row.debit}
                                    onChange={e => updateCvRowField(true, row.id!, 'debit', e.target.value, null)}
                                    placeholder="Debit"
                                    className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-right text-xs cursor-text"
                                  />
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={row.credit}
                                    onChange={e => updateCvRowField(true, row.id!, 'credit', e.target.value, null)}
                                    placeholder="Credit"
                                    className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-right text-xs cursor-text"
                                  />
                                </div>
                                <div className="text-center">
                                  {editCvRows.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={e => { e.stopPropagation(); removeCvRow(true, row.id!); }}
                                      className="text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5 mx-auto" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action Buttons Row below table box */}
                    {isReplenish && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        {deletedRowsStack.some(item => item.isEdit) && (
                          <button
                            type="button"
                            onClick={() => handleUndoDeleteRow(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            title="Undo last deleted line item"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Undo Delete</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => addCvRow(true, replenishType, false)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary hover:bg-primary/20 dark:hover:bg-secondary/20 text-xs font-bold transition-all cursor-pointer"
                          title="Add an expense debit line item"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Debit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addCvRow(true, replenishType, true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/20 dark:hover:bg-emerald-400/20 text-xs font-bold transition-all cursor-pointer"
                          title="Add a credit / replenishment line item"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Credit</span>
                        </button>
                      </div>
                    )}

                    {/* Summary row */}
                    {(() => {
                      const isStl = replenishType === 'stl';
                      const cibVal = isReplenish ? (parseFloat(editCvCibAmount || '0') || 0) : 0;
                      const overallCreditTotal = isStl
                        ? creditTotal + cibVal
                        : (creditTotal > 0 ? creditTotal : (cibVal > 0 ? cibVal : debitTotal));
                      const isBalanced = Math.abs(debitTotal - overallCreditTotal) < 0.01 && debitTotal > 0;
                      return (
                        <div className="p-3 rounded-xl bg-surface-container-low dark:bg-surface-container flex items-center justify-between text-xs border border-outline-variant/40">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-neutral-600 dark:text-neutral-300">
                              Total Debit: <span className="font-mono text-neutral-900 dark:text-neutral-100 font-extrabold">₱{debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </span>
                            <span className="font-bold text-neutral-600 dark:text-neutral-300">
                              Total Credit: <span className="font-mono text-neutral-900 dark:text-neutral-100 font-extrabold">₱{overallCreditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </span>
                            {isBalanced && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" /> Balanced
                              </span>
                            )}
                            {!isBalanced && debitTotal > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                Difference: ₱{Math.abs(debitTotal - overallCreditTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Disbursed Amount Banner */}
              {(() => {
                const disbursedAmt = getEditCvDisbursedAmount();
                return (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-1">
                        Disbursed Amount:
                      </span>
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wide leading-relaxed">
                        {formatDisbursedInWords(disbursedAmt)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-mono font-extrabold text-base text-emerald-700 dark:text-emerald-300">
                        ₱{disbursedAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Signatories */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-outline-variant/60">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Prepared By</label>
                  <input
                    type="text"
                    value={editCvFormData.prepared_by}
                    onChange={e => setEditCvFormData({ ...editCvFormData, prepared_by: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Checked By</label>
                  <input
                    type="text"
                    value={editCvFormData.checked_by}
                    onChange={e => setEditCvFormData({ ...editCvFormData, checked_by: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">
                    {Boolean(getReplenishmentType(editCvFormData.folder_name, selectedCvForModal)) ? 'Approved By (Summary)' : 'Approved By'}
                  </label>
                  <input
                    type="text"
                    value={editCvFormData.approved_by}
                    onChange={e => setEditCvFormData({ ...editCvFormData, approved_by: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Detailed Check Voucher Signatories (only for replenishments) */}
              {Boolean(getReplenishmentType(editCvFormData.folder_name, selectedCvForModal)) && (
                <div className="pt-2 border-t border-outline-variant/40">
                  <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    Detailed Check Voucher Signatories
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Liquidated By</label>
                        <span className="text-[9px] text-neutral-400">
                          Title below: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{getSignatoryTitle(editCvFormData.liquidated_by) || 'None'}</strong>
                        </span>
                      </div>
                      <input
                        type="text"
                        value={editCvFormData.liquidated_by}
                        onChange={e => setEditCvFormData({ ...editCvFormData, liquidated_by: e.target.value })}
                        placeholder="e.g. MICHELLE M. PABLE"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-semibold uppercase"
                      />
                      <div className="flex gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => setEditCvFormData({ ...editCvFormData, liquidated_by: 'MICHELLE M. PABLE' })}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                        >
                          Pable (Manager)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditCvFormData({ ...editCvFormData, liquidated_by: 'CANDILARIO N. TATOY' })}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                        >
                          Tatoy (Chairman)
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Approved By (Detailed)</label>
                        <span className="text-[9px] text-neutral-400">
                          Title below: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{getSignatoryTitle(editCvFormData.detailed_approved_by) || 'None'}</strong>
                        </span>
                      </div>
                      <input
                        type="text"
                        value={editCvFormData.detailed_approved_by}
                        onChange={e => setEditCvFormData({ ...editCvFormData, detailed_approved_by: e.target.value })}
                        placeholder="e.g. CANDILARIO N. TATOY"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-semibold uppercase"
                      />
                      <div className="flex gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => setEditCvFormData({ ...editCvFormData, detailed_approved_by: 'CANDILARIO N. TATOY' })}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                        >
                          Tatoy (Chairman)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditCvFormData({ ...editCvFormData, detailed_approved_by: 'MICHELLE M. PABLE' })}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                        >
                          Pable (Manager)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-outline-variant/60 shrink-0 bg-surface-container-lowest dark:bg-neutral-900">
              <button
                type="button"
                onClick={handleCloseEditCvModal}
                className="px-5 py-2 rounded-full border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCvEdit}
                disabled={isSavingCvEdit}
                className="px-6 py-2 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSavingCvEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE SINGLE VOUCHER CONFIRMATION MODAL */}
      {cvToDelete && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-modal-backdrop">
          <div className="bg-surface-container-lowest dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-modal-pop">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-2xl bg-rose-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-headline font-bold text-base text-neutral-900 dark:text-white">Delete Check Voucher</h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Are you sure you want to permanently delete Voucher #{cvToDelete.voucher_no} for{' '}
              <strong className="text-neutral-900 dark:text-white">{cvToDelete.payee}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCvToDelete(null)}
                className="px-4 py-2 text-xs font-bold rounded-full border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCv}
                disabled={isDeletingCv}
                className="px-5 py-2 text-xs font-bold rounded-full bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all flex items-center gap-1.5"
              >
                {isDeletingCv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Voucher</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {isBulkDeleteModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-modal-backdrop">
          <div className="bg-surface-container-lowest dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-modal-pop">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-2xl bg-rose-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-headline font-bold text-base text-neutral-900 dark:text-white">Delete Selected Vouchers</h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Are you sure you want to permanently delete{' '}
              <strong className="text-neutral-900 dark:text-white">{selectedCvIds.length} selected vouchers</strong>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-full border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteCv}
                disabled={isDeletingCv}
                className="px-5 py-2 text-xs font-bold rounded-full bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all flex items-center gap-1.5"
              >
                {isDeletingCv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete {selectedCvIds.length} Vouchers</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CLEAR ALL IN CATEGORY CONFIRMATION MODAL */}
      {isClearAllCvModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-modal-backdrop">
          <div className="bg-surface-container-lowest dark:bg-neutral-900 border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-modal-pop">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-2xl bg-rose-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-headline font-bold text-base text-rose-700 dark:text-rose-400">
                Clear All {currentTabConfig.label} Vouchers
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              This will permanently delete all check vouchers in the{' '}
              <strong className="text-neutral-900 dark:text-white">{currentTabConfig.label}</strong> category. Type{' '}
              <span className="font-mono font-bold text-rose-600">CLEAR</span> below to confirm:
            </p>
            <input
              type="text"
              value={clearAllConfirmText}
              onChange={e => setClearAllConfirmText(e.target.value)}
              placeholder="Type CLEAR to confirm"
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-surface-container border border-rose-300 dark:border-rose-900 font-mono"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsClearAllCvModalOpen(false);
                  setClearAllConfirmText('');
                }}
                className="px-4 py-2 text-xs font-bold rounded-full border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllCv}
                disabled={isDeletingCv || clearAllConfirmText.trim().toUpperCase() !== 'CLEAR'}
                className="px-5 py-2 text-xs font-bold rounded-full bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-40"
              >
                {isDeletingCv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Clear All</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* UNIFIED CUSTOM ALERT & CONFIRM MODAL */}
      {modalDialog && mounted && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm animate-modal-backdrop"
          onClick={() => {
            if (modalDialog.onCancel) modalDialog.onCancel();
            setModalDialog(null);
          }}
        >
          <div
            className={`bg-surface-container-lowest dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl p-6 ${modalDialog.message ? 'max-w-md' : 'max-w-sm'} w-full shadow-2xl space-y-4 animate-modal-pop`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-2xl ${
                  modalDialog.variant === 'rose'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : modalDialog.variant === 'amber'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : modalDialog.variant === 'emerald'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-primary/10 text-primary dark:text-secondary'
                }`}
              >
                {modalDialog.variant === 'rose' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : modalDialog.variant === 'amber' ? (
                  <RotateCcw className="w-6 h-6" />
                ) : modalDialog.variant === 'emerald' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-headline font-bold text-base text-neutral-900 dark:text-white">
                  {modalDialog.title}
                </h3>
              </div>
            </div>

            {modalDialog.message ? (
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {modalDialog.message}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              {modalDialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => {
                    if (modalDialog.onCancel) modalDialog.onCancel();
                    setModalDialog(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-full border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
                >
                  {modalDialog.cancelLabel || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  modalDialog.onConfirm();
                }}
                className={`px-5 py-2 text-xs font-bold rounded-full text-white active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  modalDialog.variant === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : modalDialog.variant === 'amber'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : modalDialog.variant === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-primary dark:bg-secondary dark:text-neutral-950 hover:opacity-90'
                }`}
              >
                <span>{modalDialog.confirmLabel || (modalDialog.type === 'confirm' ? 'Confirm' : 'OK')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* HIDDEN PRINT-ONLY CONTAINER: CHECK VOUCHER */}
      {printingCvBreakdown && typeof document !== 'undefined' && createPortal(
        <div id="cv-breakdown-print-section" className="hidden print:block text-black bg-white font-sans" style={{ fontFamily: 'sans-serif', color: '#000000', backgroundColor: '#ffffff', boxSizing: 'border-box' }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: portrait;
                margin: 10mm 15mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              body > *:not(#cv-breakdown-print-section):not(#coop-printable-lf-sheet):not(#stl-printable-lf-sheet) {
                display: none !important;
              }
              #cv-breakdown-print-section {
                display: block !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
              }
            }
          `}} />
          <div className="w-full mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box', padding: '28px 58px 28px 36px' }}>

            {/* Brand Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #064e3b', paddingBottom: '14px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                <img src="/Coop.jpeg" alt="UC-METC Multipurpose Cooperative Logo" style={{ height: '48px', width: '48px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#064e3b', margin: 0 }}>University of Cebu METC-MPC</h2>
                  <p style={{ fontSize: '10px', color: '#4b5563', fontWeight: '600', margin: '3px 0 0 0' }}>Loans, Savings, and Investment Portal</p>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <h1 style={{ fontSize: '15px', fontWeight: '800', color: '#111827', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>Check Voucher</h1>
                <p style={{ fontSize: '18px', fontFamily: 'monospace', color: '#064e3b', fontWeight: '800', margin: '3px 0 0 0', letterSpacing: '0.03em' }}>CV #{cleanCvNumber(printingCvBreakdown.voucher_no)}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr 1fr 0.8fr', gap: '16px', backgroundColor: '#ecfdf5', padding: '16px 22px', borderRadius: '14px', border: '1px solid #d1fae5' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Voucher Date</span>
                <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', margin: '3px 0 0 0' }}>
                  {printingCvBreakdown.voucher_date ? new Date(printingCvBreakdown.voucher_date).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Name</span>
                <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', margin: '3px 0 0 0' }}>
                  {printingCvBreakdown.payee || printingCvBreakdown.payee_name || '—'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Check No.</span>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#064e3b', margin: '3px 0 0 0', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                  {printingCvBreakdown.check_no || 'PENDING'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Bank</span>
                <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', margin: '3px 0 0 0' }}>
                  {printingCvBreakdown.bank || '—'}
                </p>
              </div>
            </div>

            {/* Description */}
            {(printingCvBreakdown.particulars || printingCvBreakdown.payee) && (
              <div style={{ backgroundColor: '#f9fafb', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '11px' }}>
                <strong style={{ color: '#374151' }}>DESCRIPTION:</strong>{' '}
                <span style={{ color: '#1f2937', fontStyle: 'italic' }}>
                  {formatVoucherDescription(printingCvBreakdown.particulars, printingCvBreakdown.payee || printingCvBreakdown.payee_name)}
                </span>
              </div>
            )}

            {/* Transaction Details Table */}
            {(() => {
              const isReplenish = isStlOrRfTabOrVoucher(printingCvBreakdown);
              const summaryData = getSummaryCvRows(printingCvBreakdown);
              const detailedData = getBalancedCvRows(printingCvBreakdown);
              const { rows, debitTotal, creditTotal } = isReplenish ? summaryData : detailedData;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ border: '1px solid #6ee7b7', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                    <div style={{ backgroundColor: '#064e3b', color: '#ffffff', padding: '8px 14px', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>
                      TRANSACTION DETAILS
                    </div>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '10px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#ecfdf5', color: '#064e3b', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #a7f3d0' }}>
                          <th style={{ padding: '8px 12px', width: '40px', textAlign: 'center', borderRight: '1px solid #d1fae5' }}>#</th>
                          <th style={{ padding: '8px 12px', borderRight: '1px solid #d1fae5' }}>BOOK OF ACCOUNTS</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', width: '130px', borderRight: '1px solid #d1fae5' }}>DEBIT (₱)</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', width: '130px' }}>CREDIT (₱)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length > 0 ? (
                          rows.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd' }}>
                              <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace', color: '#6b7280', borderRight: '1px solid #e5e7eb' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                                {item.description}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#111827', borderRight: '1px solid #e5e7eb' }}>
                                {item.debit !== null ? item.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : <span style={{ color: '#9ca3af' }}>–</span>}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#dc2626' }}>
                                {item.credit !== null ? item.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : <span style={{ color: '#dc2626' }}>–</span>}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
                              No breakdown line items recorded.
                            </td>
                          </tr>
                        )}
                        {/* Total row */}
                        <tr style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', fontSize: '10px', borderTop: '1px solid #6ee7b7' }}>
                          <td colSpan={2} style={{ padding: '8px 12px', textAlign: 'right', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #d1fae5' }}>
                            TOTAL:
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#111827', borderRight: '1px solid #d1fae5' }}>
                            ₱{debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>
                            ₱{creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Below the table: Disbursed Amount with words and number */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ecfdf5', padding: '12px 18px', borderRadius: '10px', border: '1px solid #d1fae5', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#064e3b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                        Disbursed Amount:
                      </span>
                      <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.4 }}>
                        {formatDisbursedInWords(debitTotal || getCvDisbursedAmount(printingCvBreakdown))}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '15px', fontFamily: 'monospace', fontWeight: '800', color: '#064e3b' }}>
                        ₱{(debitTotal || getCvDisbursedAmount(printingCvBreakdown)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Signature Block matching physical document */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', paddingTop: '22px', fontSize: '10px' }}>
              {/* Row 1: Prepared By, Checked By, Approved By */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px' }}>
                <div>
                  <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#374151', fontSize: '10px', display: 'block', letterSpacing: '0.04em' }}>
                    PREPARED BY:
                  </span>
                  <div style={{ height: '24px' }}></div>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#111827', margin: '0 0 5px 0', fontSize: '13px', letterSpacing: '0.02em' }}>
                    {printingCvBreakdown.signatories?.prepared_by || 'LAMOSTE, CHINNETTE A.'}
                  </p>
                  <div style={{ borderBottom: '1.5px solid #111827' }}></div>
                </div>

                <div>
                  <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#374151', fontSize: '10px', display: 'block', letterSpacing: '0.04em' }}>
                    CHECKED BY:
                  </span>
                  <div style={{ height: '24px' }}></div>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#111827', margin: '0 0 5px 0', fontSize: '13px', letterSpacing: '0.02em' }}>
                    {printingCvBreakdown.signatories?.checked_by || 'MARILOU LARIOSA'}
                  </p>
                  <div style={{ borderBottom: '1.5px solid #111827' }}></div>
                </div>

                <div>
                  <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#374151', fontSize: '10px', display: 'block', letterSpacing: '0.04em' }}>
                    APPROVED BY:
                  </span>
                  <div style={{ height: '24px' }}></div>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#111827', margin: '0 0 5px 0', fontSize: '13px', letterSpacing: '0.02em' }}>
                    {printingCvBreakdown.signatories?.approved_by || 'MICHELLE M. PABLE'}
                  </p>
                  <div style={{ borderBottom: '1.5px solid #111827' }}></div>
                </div>
              </div>

              {/* Row 2: Received By, Date */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px' }}>
                <div>
                  <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#374151', fontSize: '10px', display: 'block', letterSpacing: '0.04em' }}>
                    RECEIVED BY:
                  </span>
                  <div style={{ height: '36px' }}></div>
                  <div style={{ borderBottom: '1.5px solid #111827' }}></div>
                  <p style={{ color: '#4b5563', margin: '4px 0 0 0', fontSize: '9.5px', fontWeight: '500' }}>
                    Signature over Printed Name
                  </p>
                </div>

                <div>
                  <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#374151', fontSize: '10px', display: 'block', letterSpacing: '0.04em' }}>
                    DATE:
                  </span>
                  <div style={{ height: '36px', display: 'flex', alignItems: 'flex-end', paddingBottom: '3px', fontWeight: 'bold', fontSize: '11px', color: '#111827', fontFamily: 'monospace' }}>
                    {printingCvBreakdown.date_released ? new Date(printingCvBreakdown.date_released).toLocaleDateString('en-GB') : ''}
                  </div>
                  <div style={{ borderBottom: '1.5px solid #111827' }}></div>
                </div>

                <div>{/* Empty cell for column alignment */}</div>
              </div>
            </div>

            {/* Print Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '1px solid #e5e7eb', paddingTop: '10px', fontSize: '8px', color: '#9ca3af' }}>
              <div>
                <div>Generated via UC-METC MPC Portal</div>
                <div style={{ marginTop: '2px' }}>KADT Solutions</div>
              </div>
              <span>Printed on: {new Date().toLocaleString()}</span>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* MODAL FOR SEAL & DISBURSE DATE / EDIT DISBURSED DATE */}
      {disbursedDateModal.isOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop"
          onClick={() => setDisbursedDateModal({ isOpen: false, cv: null, date: '', isSealingAction: false })}
        >
          <div
            className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-base text-on-surface dark:text-white">
                    {disbursedDateModal.isSealingAction ? 'Seal & Disburse Voucher' : 'Edit Disbursed Date'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Check Voucher #{disbursedDateModal.cv?.voucher_no}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDisbursedDateModal({ isOpen: false, cv: null, date: '', isSealingAction: false })}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {disbursedDateModal.isSealingAction && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-emerald-900 dark:text-emerald-200">
                  <p className="leading-relaxed">
                    Setting this date will seal, disburse, and lock Check Voucher #{disbursedDateModal.cv?.voucher_no}.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                  Date Sealed &amp; Disbursed *
                </label>
                <input
                  type="date"
                  required
                  value={disbursedDateModal.date}
                  onChange={e => setDisbursedDateModal(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-medium text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDisbursedDateModal({ isOpen: false, cv: null, date: '', isSealingAction: false })}
                  className="px-4 py-2 text-xs font-semibold rounded-full border border-outline-variant text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!disbursedDateModal.date}
                  onClick={handleSaveDisbursedDateModal}
                  className="px-5 py-2 text-xs font-bold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {disbursedDateModal.isSealingAction ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Seal &amp; Disburse</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Date</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* UNIFIED CV + LF MERGED PRINT MODAL */}
      <UnifiedCvLfPrintModal
        isOpen={unifiedPrintModal.isOpen}
        onClose={() => setUnifiedPrintModal(prev => ({ ...prev, isOpen: false }))}
        initialCv={unifiedPrintModal.cv}
        initialLf={unifiedPrintModal.lf}
        initialType={unifiedPrintModal.type}
        initialMode={unifiedPrintModal.mode || 'detailed'}
        onEdit={(cv, mode, rows) => {
          setUnifiedPrintModal(prev => ({ ...prev, isOpen: false }));
          setSelectedCvForModal(null);
          startEditingCv(cv || unifiedPrintModal.cv, mode, rows);
        }}
        onLinkSuccess={() => {
          loadCheckVouchers();
        }}
      />
    </div>
  );
}

export default function DisbursementPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      }
    >
      <DisbursementPageContent />
    </Suspense>
  );
}
