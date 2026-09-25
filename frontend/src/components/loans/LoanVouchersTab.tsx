'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import {
  Search,
  X,
  Printer,
  Edit3,
  Trash2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Send,
  Lock,
  Clock,
  RotateCcw,
  Plus,
  RefreshCw,
  ExternalLink,
  Calendar,
  AlertTriangle,
  Loader2,
  DollarSign,
  FileCheck,
  Building,
  CreditCard,
  Banknote,
  FileText
} from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface AnimatedSelectProps {
  value: string;
  onChange: (val: string) => void;
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
  placeholder = 'Select option...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left',
  disabled = false
}: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

export const DRAW_BANK_OPTIONS: { value: string; label: string }[] = [
  { value: 'BDO', label: 'BDO' },
  { value: 'Metro Bank', label: 'Metro Bank' }
];

interface LoanVouchersTabProps {
  isAdminOrManager: boolean;
  onOpenLoanDetails?: (loanId: string | number) => void;
}

export default function LoanVouchersTab({
  isAdminOrManager,
  onOpenLoanDetails
}: LoanVouchersTabProps) {
  const [checkVouchers, setCheckVouchers] = useState<any[]>([]);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvSearch, setCvSearch] = useState('');
  const [cvPage, setCvPage] = useState(1);
  const [cvLimit] = useState(25);
  const [cvTotalCount, setCvTotalCount] = useState(0);
  const [cvTotalPages, setCvTotalPages] = useState(1);
  const [cvBankFilter, setCvBankFilter] = useState('all');
  const [cvStatusFilter, setCvStatusFilter] = useState('all');
  const [cvSortOrder, setCvSortOrder] = useState<'desc' | 'asc'>('desc');
  const [bankOptions, setBankOptions] = useState<string[]>(['BDO', 'Metro Bank']);

  // Modals & Details State
  const [selectedCvForModal, setSelectedCvForModal] = useState<any | null>(null);
  const [printingCvBreakdown, setPrintingCvBreakdown] = useState<any | null>(null);
  const [isEditingCvModal, setIsEditingCvModal] = useState(false);
  const [initialCvEditSnapshot, setInitialCvEditSnapshot] = useState<string>('');
  const [isSavingCvEdit, setIsSavingCvEdit] = useState(false);
  const [cvToDelete, setCvToDelete] = useState<any | null>(null);
  const [selectedCvIds, setSelectedCvIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeletingCv, setIsDeletingCv] = useState(false);
  const [cvActionFeedback, setCvActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit form state
  const [editCvFormData, setEditCvFormData] = useState({
    id: '',
    voucher_no: '',
    voucher_date: '',
    check_no: '',
    payee: '',
    bank: '',
    particulars: '',
    prepared_by: '',
    checked_by: '',
    approved_by: ''
  });
  const [editCvRows, setEditCvRows] = useState<{ description: string; debit: string; credit: string }[]>([]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Format Helpers
  const cleanCvNumber = (vNo: any): string => {
    if (!vNo) return '—';
    return String(vNo).replace(/^CV\s*#?\s*/i, '').trim();
  };

  const formatVoucherDescription = (particulars?: string, payee?: string): string => {
    const raw = (particulars || '').trim();
    if (!raw) return payee ? `Loan Disbursement for ${payee}` : 'Loan Disbursement';
    return raw;
  };

  const formatDisbursedInWords = (amount: number): string => {
    if (isNaN(amount) || amount === 0) return 'ZERO PESOS ONLY';
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const thousands = ['', 'THOUSAND', 'MILLION', 'BILLION'];

    const numToWords = (n: number): string => {
      let str = '';
      if (n >= 100) {
        str += `${ones[Math.floor(n / 100)]} HUNDRED `;
        n %= 100;
      }
      if (n >= 20) {
        str += `${tens[Math.floor(n / 10)]} `;
        n %= 10;
      } else if (n >= 10) {
        str += `${teens[n - 10]} `;
        return str;
      }
      if (n > 0) {
        str += `${ones[n]} `;
      }
      return str;
    };

    const pesos = Math.floor(amount);
    const centavos = Math.round((amount - pesos) * 100);

    let words = '';
    let tempPesos = pesos;
    let thousandIdx = 0;

    if (tempPesos === 0) {
      words = 'ZERO';
    } else {
      while (tempPesos > 0) {
        const chunk = tempPesos % 1000;
        if (chunk > 0) {
          const chunkWords = numToWords(chunk).trim();
          const thousandLabel = thousands[thousandIdx];
          words = `${chunkWords} ${thousandLabel} ${words}`.trim();
        }
        tempPesos = Math.floor(tempPesos / 1000);
        thousandIdx++;
      }
    }

    const currencyUnit = pesos === 1 ? 'PESO' : 'PESOS';
    if (centavos > 0) {
      return `${words} ${currencyUnit} AND ${centavos.toString().padStart(2, '0')}/100 ONLY`;
    }
    return `${words} ${currencyUnit} ONLY`;
  };

  const getCvDisbursedAmount = (cv: any): number => {
    if (!cv) return 0;
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

    for (const item of details) {
      const desc = (item.book_of_account || item.description || '').trim();
      if (/cib\b|cash\s*in\s*bank/i.test(desc)) {
        const val = Math.abs(typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || 0));
        if (val > 0) return val;
      }
    }

    return parseFloat(cv.amount || 0);
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

    const rows: { description: string; debit: number | null; credit: number | null }[] = [];
    let debitTotal = 0;
    let creditTotal = 0;

    for (const item of details) {
      const val = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || 0);
      if (val > 0) {
        rows.push({
          description: item.book_of_account || 'Loan Principal',
          debit: val,
          credit: null
        });
        debitTotal += val;
      } else if (val < 0) {
        const creditVal = Math.abs(val);
        rows.push({
          description: item.book_of_account || 'Deduction',
          debit: null,
          credit: creditVal
        });
        creditTotal += creditVal;
      } else if (item.book_of_account) {
        rows.push({
          description: item.book_of_account,
          debit: null,
          credit: null
        });
      }
    }

    return { rows, debitTotal, creditTotal };
  };

  // Load check vouchers for Loans folder
  const loadCheckVouchers = useCallback(async (page = 1, searchOverride?: string) => {
    try {
      setCvLoading(true);
      const searchTerm = searchOverride !== undefined ? searchOverride : cvSearch;
      const params: Record<string, string | number> = {
        page,
        limit: cvLimit,
        sort_by: cvSortOrder,
        folder: 'Loan'
      };

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
      console.error('Failed to load loan check vouchers:', err);
    } finally {
      setCvLoading(false);
    }
  }, [cvSearch, cvLimit, cvBankFilter, cvStatusFilter, cvSortOrder]);

  // Initial load and filter change trigger
  useEffect(() => {
    setCvPage(1);
    loadCheckVouchers(1);
  }, [cvBankFilter, cvStatusFilter, cvSortOrder]);

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

  // Status transitions
  const handleMarkForRelease = async (cv: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.put(`/accounts/check-vouchers/${cv.id}`, { status: 'for release' });
      if (res.data?.data) {
        setCheckVouchers(prev => prev.map(c => c.id === cv.id ? { ...c, status: 'for release' } : c));
        if (selectedCvForModal && selectedCvForModal.id === cv.id) {
          setSelectedCvForModal((prev: any) => ({ ...prev, status: 'for release' }));
        }
      }
    } catch (err) {
      console.error('Failed to mark voucher for release:', err);
    }
  };

  const handleMarkFiled = async (cv: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.put(`/accounts/check-vouchers/${cv.id}`, { status: 'filed' });
      if (res.data?.data) {
        setCheckVouchers(prev => prev.map(c => c.id === cv.id ? { ...c, status: 'filed' } : c));
        if (selectedCvForModal && selectedCvForModal.id === cv.id) {
          setSelectedCvForModal((prev: any) => ({ ...prev, status: 'filed' }));
        }
      }
    } catch (err) {
      console.error('Failed to file voucher:', err);
    }
  };

  const handleMarkOnProcess = async (cv: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.put(`/accounts/check-vouchers/${cv.id}`, { status: 'on process' });
      if (res.data?.data) {
        setCheckVouchers(prev => prev.map(c => c.id === cv.id ? { ...c, status: 'on process' } : c));
        if (selectedCvForModal && selectedCvForModal.id === cv.id) {
          setSelectedCvForModal((prev: any) => ({ ...prev, status: 'on process' }));
        }
      }
    } catch (err) {
      console.error('Failed to mark voucher on process:', err);
    }
  };

  // Printing
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

  // Editing Voucher Modal
  const startEditingCv = (cv: any) => {
    const rawRows = cv.details && Array.isArray(cv.details) ? cv.details : [];
    const formattedRows = rawRows.map((r: any) => ({
      description: r.book_of_account || r.description || '',
      debit: r.amount > 0 ? String(r.amount) : '',
      credit: r.amount < 0 ? String(Math.abs(r.amount)) : ''
    }));

    const initialForm = {
      id: cv.id,
      voucher_no: cv.voucher_no || '',
      voucher_date: cv.voucher_date ? String(cv.voucher_date).split('T')[0] : '',
      check_no: cv.check_no || '',
      payee: cv.payee || cv.payee_name || '',
      bank: cv.bank || 'BDO',
      particulars: cv.particulars || '',
      prepared_by: cv.signatories?.prepared_by || 'LAMOSTE, CHINNETTE A.',
      checked_by: cv.signatories?.checked_by || 'MARILOU LARIOSA',
      approved_by: cv.signatories?.approved_by || 'MICHELLE M. PABLE'
    };
    setEditCvFormData(initialForm);
    const initialRowsList = formattedRows.length > 0 ? formattedRows : [{ description: 'Regular Loan Principal', debit: '', credit: '' }];
    setEditCvRows(initialRowsList);
    setInitialCvEditSnapshot(JSON.stringify({ formData: initialForm, rows: initialRowsList }));
    setIsEditingCvModal(true);
  };

  // Track if check voucher edit has dirty/unsaved changes
  const isCvEditDirty = useMemo(() => {
    if (!isEditingCvModal || !initialCvEditSnapshot) return false;
    const current = JSON.stringify({ formData: editCvFormData, rows: editCvRows });
    return current !== initialCvEditSnapshot;
  }, [isEditingCvModal, initialCvEditSnapshot, editCvFormData, editCvRows]);

  // Safe close with unsaved changes confirmation
  const handleCloseEditCvModal = useCallback(() => {
    if (isCvEditDirty) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes in this check voucher. Are you sure you want to close and discard your changes?'
      );
      if (!confirmDiscard) return;
    }
    setIsEditingCvModal(false);
  }, [isCvEditDirty]);

  // Keep session alive while Check Voucher edit modal is open
  useEffect(() => {
    if (!isEditingCvModal) return;
    const touch = () => {
      const now = Date.now();
      if (typeof window !== 'undefined') {
        localStorage.setItem('session_last_activity', now.toString());
      }
    };
    touch();
    const interval = setInterval(touch, 15000);
    return () => clearInterval(interval);
  }, [isEditingCvModal]);

  const handleSaveCvEdit = async () => {
    if (!editCvFormData.id) return;
    try {
      setIsSavingCvEdit(true);
      const builtDetails = editCvRows.map(r => {
        const dVal = parseFloat(r.debit || '0') || 0;
        const cVal = parseFloat(r.credit || '0') || 0;
        return {
          book_of_account: r.description.trim(),
          amount: dVal > 0 ? dVal : cVal > 0 ? -cVal : 0
        };
      }).filter(r => r.book_of_account);

      const payload = {
        voucher_no: editCvFormData.voucher_no.trim(),
        voucher_date: editCvFormData.voucher_date || null,
        check_no: editCvFormData.check_no.trim() || null,
        payee: editCvFormData.payee.trim(),
        bank: editCvFormData.bank.trim() || 'BDO',
        particulars: editCvFormData.particulars.trim(),
        signatories: {
          prepared_by: editCvFormData.prepared_by,
          checked_by: editCvFormData.checked_by,
          approved_by: editCvFormData.approved_by
        },
        details: builtDetails
      };

      const res = await api.put(`/accounts/check-vouchers/${editCvFormData.id}`, payload);
      if (res.data?.data) {
        setCheckVouchers(prev => prev.map(c => c.id === editCvFormData.id ? res.data.data : c));
        if (selectedCvForModal?.id === editCvFormData.id) {
          setSelectedCvForModal(res.data.data);
        }
        setIsEditingCvModal(false);
        setCvActionFeedback({ type: 'success', message: 'Check voucher updated successfully.' });
        setTimeout(() => setCvActionFeedback(null), 3000);
      }
    } catch (err: any) {
      console.error('Failed to update check voucher:', err);
      setCvActionFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to update check voucher.'
      });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } finally {
      setIsSavingCvEdit(false);
    }
  };

  // Single Delete
  const handleConfirmDeleteSingle = async () => {
    if (!cvToDelete) return;
    try {
      setIsDeletingCv(true);
      await api.delete(`/accounts/check-vouchers/${cvToDelete.id}`);
      setCheckVouchers(prev => prev.filter(c => c.id !== cvToDelete.id));
      setCvTotalCount(prev => Math.max(0, prev - 1));
      setCvToDelete(null);
      setCvActionFeedback({ type: 'success', message: 'Check voucher deleted successfully.' });
      setTimeout(() => setCvActionFeedback(null), 3000);
    } catch (err: any) {
      console.error('Failed to delete voucher:', err);
      setCvActionFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to delete check voucher.'
      });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } finally {
      setIsDeletingCv(false);
    }
  };

  // Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedCvIds.length === 0) return;
    try {
      setIsDeletingCv(true);
      await api.post('/accounts/check-vouchers/bulk-delete', { ids: selectedCvIds });
      setCheckVouchers(prev => prev.filter(c => !selectedCvIds.includes(c.id)));
      setCvTotalCount(prev => Math.max(0, prev - selectedCvIds.length));
      setSelectedCvIds([]);
      setIsBulkDeleteModalOpen(false);
      setCvActionFeedback({ type: 'success', message: `${selectedCvIds.length} vouchers deleted successfully.` });
      setTimeout(() => setCvActionFeedback(null), 3000);
    } catch (err: any) {
      console.error('Failed to bulk delete vouchers:', err);
      setCvActionFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to bulk delete check vouchers.'
      });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } finally {
      setIsDeletingCv(false);
    }
  };

  // Multi-select helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCvIds(checkVouchers.map(c => c.id));
    } else {
      setSelectedCvIds([]);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedCvIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Stat Calculations
  const stats = useMemo(() => {
    let totalDisbursed = 0;
    let largest = 0;

    for (const cv of checkVouchers) {
      const amt = getCvDisbursedAmount(cv);
      totalDisbursed += amt;
      if (amt > largest) largest = amt;
    }

    const avg = checkVouchers.length > 0 ? totalDisbursed / checkVouchers.length : 0;
    return {
      totalDisbursed,
      totalCount: cvTotalCount || checkVouchers.length,
      average: avg,
      largest
    };
  }, [checkVouchers, cvTotalCount]);

  // Status Badge Component
  const renderStatusBadge = (cv: any) => {
    const st = (cv.status || 'edit').toLowerCase();
    switch (st) {
      case 'for release':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25">
            <Send className="w-3 h-3" />
            <span>For Release</span>
          </span>
        );
      case 'filed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
            <Lock className="w-3 h-3" />
            <span>Filed</span>
          </span>
        );
      case 'edit':
      default:
        if (isAdminOrManager) {
          return (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                startEditingCv(cv);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer"
              title="Click to edit check voucher"
            >
              <Edit3 className="w-3 h-3" />
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

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {cvActionFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
            cvActionFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500/30 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{cvActionFeedback.message}</span>
          <button onClick={() => setCvActionFeedback(null)} className="p-1 rounded-full hover:bg-black/5 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* METRIC STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Loan Disbursed */}
        <div className="p-5 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
              Total Loan Disbursed
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              ₱{stats.totalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              Across {stats.totalCount} recorded loan vouchers
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Banknote className="w-6 h-6" />
          </div>
        </div>

        {/* Total Vouchers */}
        <div className="p-5 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
              Total Vouchers
            </span>
            <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white font-mono mt-1">
              {stats.totalCount}
            </div>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              In loan check voucher registry
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary dark:text-secondary flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Average Release */}
        <div className="p-5 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
              Average Release
            </span>
            <div className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white font-mono mt-1">
              ₱{stats.average.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              Mean check release value
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Largest Voucher */}
        <div className="p-5 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
              Largest Voucher
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
              ₱{stats.largest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              Peak single loan disbursement
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={cvSearch}
              onChange={e => setCvSearch(e.target.value)}
              placeholder="Search loan vouchers by voucher #, check #, payee, or particulars..."
              className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-400"
            />
            {cvSearch && (
              <button
                onClick={() => setCvSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
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
                  { value: 'Metro Bank', label: 'Metro Bank' }
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
                  { value: 'for release', label: 'For Release' },
                  { value: 'filed', label: 'Filed' }
                ]}
                className="w-36"
                buttonClassName="font-medium text-xs py-1.5"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => loadCheckVouchers(cvPage)}
              className="p-2.5 rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer"
              title="Refresh vouchers"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${cvLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Bulk Delete */}
            {isAdminOrManager && selectedCvIds.length > 0 && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedCvIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CHECK VOUCHERS TABLE */}
      <div className="rounded-3xl border border-outline-variant/60 bg-white dark:bg-surface-container-low shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-neutral-50/75 dark:bg-neutral-800/40 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {isAdminOrManager && (
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={checkVouchers.length > 0 && selectedCvIds.length === checkVouchers.length}
                      onChange={e => handleSelectAll(e.target.checked)}
                      className="rounded border-outline-variant accent-primary cursor-pointer w-3.5 h-3.5"
                    />
                  </th>
                )}
                <th className="py-3.5 px-4">
                  <button
                    onClick={() => setCvSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center gap-1 font-bold text-[11px] hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>Voucher No.</span>
                    <span className="text-[10px] text-neutral-400">
                      {cvSortOrder === 'desc' ? '↓ DESC' : '↑ ASC'}
                    </span>
                  </button>
                </th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Check No.</th>
                <th className="py-3.5 px-4">Payee / Entity</th>
                <th className="py-3.5 px-4">Bank</th>
                <th className="py-3.5 px-4">Particulars / Details</th>
                <th className="py-3.5 px-4 text-right">Disbursed Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {cvLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="animate-pulse">
                    <td colSpan={10} className="py-4 px-4">
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded-md w-full"></div>
                    </td>
                  </tr>
                ))
              ) : checkVouchers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 px-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <p className="font-bold text-neutral-700 dark:text-neutral-300">No loan check vouchers found</p>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      {cvSearch ? 'Try clearing your search query.' : 'Approved loans will automatically create check vouchers here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                checkVouchers.map(cv => {
                  const isSelected = selectedCvIds.includes(cv.id);
                  const disbursedAmount = getCvDisbursedAmount(cv);

                  return (
                    <tr
                      key={cv.id}
                      onClick={() => setSelectedCvForModal(cv)}
                      className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
                      }`}
                    >
                      {isAdminOrManager && (
                        <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(cv.id)}
                            className="rounded border-outline-variant accent-primary cursor-pointer w-3.5 h-3.5"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{cleanCvNumber(cv.voucher_no)}</span>
                          <span className="px-1.5 py-0.5 text-[9px] rounded font-mono font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                            LOAN
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                        {cv.voucher_date ? new Date(cv.voucher_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-900 dark:text-white font-semibold">
                        {cv.check_no || '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-white">
                        {cv.payee || cv.payee_name || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {cv.bank || 'BDO'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300 max-w-xs truncate" title={cv.particulars}>
                        {formatVoucherDescription(cv.particulars, cv.payee)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₱{disbursedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        {renderStatusBadge(cv)}
                      </td>
                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handlePrintCvBreakdown(cv)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                            title="Print Check Voucher"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {isAdminOrManager && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditingCv(cv)}
                                className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                                title="Edit Check Voucher"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setCvToDelete(cv)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                title="Delete Voucher"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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

        {/* Pagination Footer */}
        {cvTotalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-outline-variant/40 bg-white dark:bg-surface-container-low">
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              Displaying page <strong className="text-neutral-900 dark:text-white">{cvPage}</strong> of{' '}
              <strong className="text-neutral-900 dark:text-white">{cvTotalPages}</strong> ({cvTotalCount} vouchers total)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={cvPage === 1}
                onClick={() => setCvPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-xl border border-outline-variant/60 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Previous
              </button>
              <button
                disabled={cvPage >= cvTotalPages}
                onClick={() => setCvPage(prev => Math.min(cvTotalPages, prev + 1))}
                className="px-3 py-1.5 rounded-xl border border-outline-variant/60 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAILS / BREAKDOWN MODAL */}
      {selectedCvForModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 sm:p-6 animate-modal-backdrop"
          onClick={() => setSelectedCvForModal(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-pop"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/60 p-5 sm:p-6 shrink-0 bg-neutral-50/50 dark:bg-neutral-800/50">
              <div>
                <h2 className="text-xl font-black text-neutral-900 dark:text-white font-mono flex items-center gap-2">
                  <span>CV #{cleanCvNumber(selectedCvForModal.voucher_no)}</span>
                  <span className="px-2 py-0.5 text-xs rounded-full font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25">
                    LOAN VOUCHER
                  </span>
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Official UC-METC MPC Check Voucher Breakdown
                </p>
              </div>
              <button
                onClick={() => setSelectedCvForModal(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5 text-xs custom-scrollbar">
              {/* Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/60">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Voucher Date</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    {selectedCvForModal.voucher_date ? new Date(selectedCvForModal.voucher_date).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Payee</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                    {selectedCvForModal.payee || selectedCvForModal.payee_name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Check No.</span>
                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    {selectedCvForModal.check_no || 'PENDING'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Bank</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    {selectedCvForModal.bank || 'BDO'}
                  </span>
                </div>
              </div>

              {/* Particulars */}
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">Particulars</span>
                <p className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/60 text-neutral-800 dark:text-neutral-200">
                  {formatVoucherDescription(selectedCvForModal.particulars, selectedCvForModal.payee)}
                </p>
              </div>

              {/* Accounting Entries Table */}
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase block mb-2">Book of Accounts & Deductions</span>
                {(() => {
                  const { rows, debitTotal, creditTotal } = getBalancedCvRows(selectedCvForModal);
                  return (
                    <div className="rounded-xl border border-outline-variant/60 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-neutral-100/70 dark:bg-neutral-800/70 text-[10px] font-bold uppercase text-neutral-500">
                            <th className="py-2.5 px-3">Book of Account</th>
                            <th className="py-2.5 px-3 text-right">Debit (₱)</th>
                            <th className="py-2.5 px-3 text-right">Credit (₱)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/40">
                          {rows.map((r, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 font-medium text-neutral-800 dark:text-neutral-200">
                                {r.description}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                                {r.debit ? r.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                                {r.credit ? r.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-neutral-50 dark:bg-neutral-800/50 font-bold border-t border-outline-variant/60">
                            <td className="py-2 px-3 uppercase text-[10px]">Total Balance</td>
                            <td className="py-2 px-3 text-right font-mono">
                              ₱{debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              ₱{creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Net Disbursed Highlight */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                    Disbursed Net Amount
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    {formatDisbursedInWords(getCvDisbursedAmount(selectedCvForModal))}
                  </span>
                </div>
                <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                  ₱{getCvDisbursedAmount(selectedCvForModal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-t border-outline-variant/60 bg-neutral-50/50 dark:bg-neutral-800/50">
              <div className="flex items-center gap-2">
                {isAdminOrManager && (!selectedCvForModal.status || selectedCvForModal.status.toLowerCase() === 'edit') && (
                  <button
                    type="button"
                    onClick={() => handleMarkForRelease(selectedCvForModal)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-xs font-bold cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Mark For Release</span>
                  </button>
                )}
                {isAdminOrManager && selectedCvForModal.status?.toLowerCase() === 'for release' && (
                  <button
                    type="button"
                    onClick={() => handleMarkFiled(selectedCvForModal)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Mark Filed</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isAdminOrManager && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedCvForModal;
                      setSelectedCvForModal(null);
                      startEditingCv(target);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handlePrintCvBreakdown(selectedCvForModal)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT MODAL */}
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
            className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-pop"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/60 p-5 sm:p-6 shrink-0 bg-neutral-50/50 dark:bg-neutral-800/50">
              <div>
                <h2 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-primary" />
                  <span>Modify Check Voucher #{editCvFormData.voucher_no}</span>
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Update bank details, check number, and line item allocations.
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

            <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5 text-xs custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Voucher No.</label>
                  <input
                    type="text"
                    value={editCvFormData.voucher_no}
                    onChange={e => setEditCvFormData({ ...editCvFormData, voucher_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Voucher Date</label>
                  <input
                    type="date"
                    value={editCvFormData.voucher_date}
                    onChange={e => setEditCvFormData({ ...editCvFormData, voucher_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Check No.</label>
                  <input
                    type="text"
                    value={editCvFormData.check_no}
                    onChange={e => setEditCvFormData({ ...editCvFormData, check_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Draw Bank</label>
                  <AnimatedSelect
                    value={editCvFormData.bank}
                    onChange={val => setEditCvFormData({ ...editCvFormData, bank: val })}
                    options={DRAW_BANK_OPTIONS}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Payee</label>
                <input
                  type="text"
                  value={editCvFormData.payee}
                  onChange={e => setEditCvFormData({ ...editCvFormData, payee: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Particulars</label>
                <textarea
                  rows={2}
                  value={editCvFormData.particulars}
                  onChange={e => setEditCvFormData({ ...editCvFormData, particulars: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60"
                />
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Accounting Entries</span>
                  <button
                    type="button"
                    onClick={() => setEditCvRows([...editCvRows, { description: '', debit: '', credit: '' }])}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line Item</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {editCvRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Account name / Description"
                        value={row.description}
                        onChange={e => {
                          const updated = [...editCvRows];
                          updated[idx].description = e.target.value;
                          setEditCvRows(updated);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60"
                      />
                      <input
                        type="number"
                        placeholder="Debit ₱"
                        value={row.debit}
                        onChange={e => {
                          const updated = [...editCvRows];
                          updated[idx].debit = e.target.value;
                          setEditCvRows(updated);
                        }}
                        className="w-28 px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-mono text-right"
                      />
                      <input
                        type="number"
                        placeholder="Credit ₱"
                        value={row.credit}
                        onChange={e => {
                          const updated = [...editCvRows];
                          updated[idx].credit = e.target.value;
                          setEditCvRows(updated);
                        }}
                        className="w-28 px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-mono text-right"
                      />
                      <button
                        type="button"
                        onClick={() => setEditCvRows(editCvRows.filter((_, i) => i !== idx))}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-outline-variant/60 bg-neutral-50/50 dark:bg-neutral-800/50">
              <button
                type="button"
                onClick={handleCloseEditCvModal}
                className="px-4 py-2 rounded-xl border border-outline-variant/60 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingCvEdit}
                onClick={handleSaveCvEdit}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isSavingCvEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DELETE MODAL (SINGLE) */}
      {cvToDelete && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop"
          onClick={() => setCvToDelete(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-modal-pop"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Delete Loan Voucher?</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              Are you sure you want to delete Check Voucher <strong>#{cleanCvNumber(cvToDelete.voucher_no)}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setCvToDelete(null)}
                className="px-4 py-2 rounded-xl border border-outline-variant/60 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeletingCv}
                onClick={handleConfirmDeleteSingle}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isDeletingCv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete Voucher</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* BULK DELETE MODAL */}
      {isBulkDeleteModalOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop"
          onClick={() => setIsBulkDeleteModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-modal-pop"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Delete Selected Vouchers?</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              You are about to permanently delete <strong>{selectedCvIds.length}</strong> selected loan check vouchers. This action cannot be reversed.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant/60 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeletingCv}
                onClick={handleConfirmBulkDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isDeletingCv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Bulk Delete</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* HIDDEN PRINT-ONLY CONTAINER FOR CHECK VOUCHER */}
      {printingCvBreakdown && typeof document !== 'undefined' && createPortal(
        <div
          id="loan-printable-cv-sheet"
          className="hidden print:block text-black bg-white font-sans"
          style={{ fontFamily: 'sans-serif', color: '#000000', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: portrait;
                margin: 10mm 15mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              body > *:not(#loan-printable-cv-sheet) {
                display: none !important;
              }
              #loan-printable-cv-sheet {
                display: block !important;
                width: 100% !important;
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
              }
            }
          `}} />
          <div className="w-full mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box', padding: '24px 36px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #064e3b', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="/Coop.jpeg" alt="UC-METC MPC Logo" style={{ height: '46px', width: '46px', borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#064e3b', margin: 0 }}>
                    University of Cebu METC-MPC
                  </h2>
                  <p style={{ fontSize: '10px', color: '#4b5563', margin: '2px 0 0 0' }}>Loans, Savings, and Investment Portal</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h1 style={{ fontSize: '15px', fontWeight: '800', color: '#111827', textTransform: 'uppercase', margin: 0 }}>Check Voucher</h1>
                <p style={{ fontSize: '17px', fontFamily: 'monospace', color: '#064e3b', fontWeight: '800', margin: '2px 0 0 0' }}>
                  CV #{cleanCvNumber(printingCvBreakdown.voucher_no)}
                </p>
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: '12px', backgroundColor: '#ecfdf5', padding: '14px 18px', borderRadius: '12px', border: '1px solid #d1fae5' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block' }}>Voucher Date</span>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937', margin: '2px 0 0 0' }}>
                  {printingCvBreakdown.voucher_date ? new Date(printingCvBreakdown.voucher_date).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block' }}>Borrower / Payee</span>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937', margin: '2px 0 0 0' }}>
                  {printingCvBreakdown.payee || printingCvBreakdown.payee_name || '—'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block' }}>Check No.</span>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#064e3b', margin: '2px 0 0 0', fontFamily: 'monospace' }}>
                  {printingCvBreakdown.check_no || 'PENDING'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block' }}>Draw Bank</span>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1f2937', margin: '2px 0 0 0' }}>
                  {printingCvBreakdown.bank || 'BDO'}
                </p>
              </div>
            </div>

            {/* Particulars */}
            <div>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Particulars / Details:
              </span>
              <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '11px', color: '#111827' }}>
                {formatVoucherDescription(printingCvBreakdown.particulars, printingCvBreakdown.payee)}
              </div>
            </div>

            {/* Accounting Table */}
            {(() => {
              const { rows, debitTotal, creditTotal } = getBalancedCvRows(printingCvBreakdown);
              return (
                <div style={{ border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 'bold' }}>Book of Accounts</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', width: '130px' }}>Debit (₱)</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', width: '130px' }}>Credit (₱)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '6px 12px' }}>{r.description}</td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {r.debit ? r.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {r.credit ? r.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#f9fafb', fontWeight: 'bold', borderTop: '2px solid #111827' }}>
                        <td style={{ padding: '8px 12px', textAlign: 'right', textTransform: 'uppercase', fontSize: '9px' }}>Total</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                          ₱{debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                          ₱{creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}

            {/* Disbursed Amount Box */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ecfdf5', border: '1.5px solid #059669', borderRadius: '10px', padding: '10px 16px' }}>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#047857', textTransform: 'uppercase', display: 'block' }}>
                  Amount in Words:
                </span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#065f46' }}>
                  {formatDisbursedInWords(getCvDisbursedAmount(printingCvBreakdown))}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#047857', textTransform: 'uppercase', display: 'block' }}>
                  Net Check Amount:
                </span>
                <span style={{ fontSize: '16px', fontWeight: '900', fontFamily: 'monospace', color: '#064e3b' }}>
                  ₱{getCvDisbursedAmount(printingCvBreakdown).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px', fontSize: '9.5px' }}>
              <div>
                <span style={{ fontSize: '8px', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Prepared by:</span>
                <div style={{ height: '24px' }}></div>
                <p style={{ fontWeight: 'bold', margin: '0 0 2px 0', borderBottom: '1px solid #111827', paddingBottom: '2px' }}>
                  {printingCvBreakdown.signatories?.prepared_by || 'LAMOSTE, CHINNETTE A.'}
                </p>
                <span style={{ fontSize: '8px', color: '#9ca3af' }}>Bookkeeper / Accounting</span>
              </div>
              <div>
                <span style={{ fontSize: '8px', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Checked by:</span>
                <div style={{ height: '24px' }}></div>
                <p style={{ fontWeight: 'bold', margin: '0 0 2px 0', borderBottom: '1px solid #111827', paddingBottom: '2px' }}>
                  {printingCvBreakdown.signatories?.checked_by || 'MARILOU LARIOSA'}
                </p>
                <span style={{ fontSize: '8px', color: '#9ca3af' }}>Audit Committee</span>
              </div>
              <div>
                <span style={{ fontSize: '8px', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Approved by:</span>
                <div style={{ height: '24px' }}></div>
                <p style={{ fontWeight: 'bold', margin: '0 0 2px 0', borderBottom: '1px solid #111827', paddingBottom: '2px' }}>
                  {printingCvBreakdown.signatories?.approved_by || 'MICHELLE M. PABLE'}
                </p>
                <span style={{ fontSize: '8px', color: '#9ca3af' }}>Manager / Treasurer</span>
              </div>
              <div>
                <span style={{ fontSize: '8px', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Received by:</span>
                <div style={{ height: '24px' }}></div>
                <p style={{ fontWeight: 'bold', margin: '0 0 2px 0', borderBottom: '1px solid #111827', paddingBottom: '2px' }}>
                  {printingCvBreakdown.payee || printingCvBreakdown.payee_name || 'Borrower'}
                </p>
                <span style={{ fontSize: '8px', color: '#9ca3af' }}>Signature over printed name</span>
              </div>
            </div>

            {/* Print Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '12px', fontSize: '8px', color: '#9ca3af' }}>
              <div>
                <div>Generated via UC-METC MPC Portal • Loan Disbursement System</div>
                <div style={{ marginTop: '2px' }}>KADT Solutions</div>
              </div>
              <div>Printed on: {new Date().toLocaleString()}</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
