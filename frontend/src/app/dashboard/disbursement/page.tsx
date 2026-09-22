'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import RevolvingFundsTab from '@/components/loans/RevolvingFundsTab';
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
  AlertTriangle,
  FolderOpen,
  Lock,
  Clock,
  Send,
  Check,
  RotateCcw
} from 'lucide-react';

// Tab configuration matching the user spreadsheet structure
export type DisbursementTab =
  | 'loan'
  | 'stl_replenishment'
  | 'revolving_fund_replenishment'
  | 'petty_cash_replenishment'
  | 'merchandise_payment'
  | 'operation_expense'
  | 'services_expense';

interface TabConfig {
  id: DisbursementTab;
  label: string;
  folderFilter: string; // Used for DB query
  defaultCategory: string; // Used when creating new CV
  description: string;
}

export const DISBURSEMENT_TABS: TabConfig[] = [
  {
    id: 'loan',
    label: 'Loan',
    folderFilter: 'Loan',
    defaultCategory: 'Loan',
    description: 'Check vouchers for approved regular loans and short-term loans'
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

function DisbursementPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isAdmin = user?.role === 'admin';
  const isAdminOrManager = user?.role === 'admin';
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

  // Active Tab state
  const [activeTab, setActiveTab] = useState<DisbursementTab>('loan');
  const [rfSubView, setRfSubView] = useState<'vouchers' | 'liquidations'>('vouchers');

  // SSR hydration safety
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync tab with URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && DISBURSEMENT_TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam as DisbursementTab);
    } else if (tabParam === 'revolving_funds' || tabParam === 'revolving') {
      setActiveTab('revolving_fund_replenishment');
    }
  }, [searchParams]);

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

  // Cross-linking to Revolving Fund
  const [rfTargetSearch, setRfTargetSearch] = useState('');
  const [rfTargetId, setRfTargetId] = useState('');

  // Selection & Actions State
  const [selectedCvIds, setSelectedCvIds] = useState<string[]>([]);
  const [cvToDelete, setCvToDelete] = useState<any | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isClearAllCvModalOpen, setIsClearAllCvModalOpen] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState('');
  const [isDeletingCv, setIsDeletingCv] = useState(false);
  const [cvActionFeedback, setCvActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // View / Edit / Print State
  const [selectedCvForModal, setSelectedCvForModal] = useState<any | null>(null);
  const [printingCvBreakdown, setPrintingCvBreakdown] = useState<any | null>(null);
  const [isEditingCvModal, setIsEditingCvModal] = useState(false);
  const [isSavingCvEdit, setIsSavingCvEdit] = useState(false);
  const [isSyncingCvRf, setIsSyncingCvRf] = useState(false);

  // Create Check Voucher Modal State
  const [isCreateCVOpen, setIsCreateCVOpen] = useState(false);
  const [isSavingNewCv, setIsSavingNewCv] = useState(false);
  const [newCvVoucherNo, setNewCvVoucherNo] = useState('');
  const [newCvDate, setNewCvDate] = useState('');
  const [newCvReleasedDate, setNewCvReleasedDate] = useState('');
  const [newCvPayee, setNewCvPayee] = useState('');
  const [newCvBankName, setNewCvBankName] = useState('BDO');
  const [newCvCheckNo, setNewCvCheckNo] = useState('');
  const [newCvParticulars, setNewCvParticulars] = useState('');
  const [newCvCategory, setNewCvCategory] = useState('');
  const [newCvPreparedBy, setNewCvPreparedBy] = useState('LAMOSTE, CHINNETTE A.');
  const [newCvCheckedBy, setNewCvCheckedBy] = useState('MARILOU LARIOSA');
  const [newCvApprovedBy, setNewCvApprovedBy] = useState('MICHELLE M. PABLE');
  const [newCvRows, setNewCvRows] = useState<{ description: string; debit: string; credit: string }[]>([
    { description: '', debit: '', credit: '' }
  ]);

  // Edit Check Voucher State
  const [editCvFormData, setEditCvFormData] = useState({
    id: '',
    voucher_no: '',
    voucher_date: '',
    check_no: '',
    payee: '',
    bank: '',
    particulars: '',
    folder_name: '',
    prepared_by: '',
    checked_by: '',
    approved_by: ''
  });
  const [editCvRows, setEditCvRows] = useState<{ description: string; debit: string; credit: string }[]>([]);

  // Load check vouchers for active tab
  const loadCheckVouchers = useCallback(async (page = 1, searchOverride?: string) => {
    try {
      setCvLoading(true);
      const searchTerm = searchOverride !== undefined ? searchOverride : cvSearch;
      const params: Record<string, string | number> = {
        page,
        limit: cvLimit,
        folder: currentTabConfig.folderFilter
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
      console.error('Failed to load check vouchers:', err);
    } finally {
      setCvLoading(false);
    }
  }, [cvSearch, cvLimit, currentTabConfig.folderFilter, cvBankFilter, cvStatusFilter]);

  // Refetch whenever active tab, bank filter, status filter, or page changes
  useEffect(() => {
    setCvPage(1);
    setSelectedCvIds([]);
    loadCheckVouchers(1);
  }, [activeTab, cvBankFilter, cvStatusFilter]);

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
          description: item.book_of_account || 'Disbursement Line',
          debit: val,
          credit: null
        });
        debitTotal += val;
      } else if (val < 0) {
        const creditVal = Math.abs(val);
        rows.push({
          description: item.book_of_account || 'Credit / Deduction',
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

  const isRevolvingVoucher = (cv: any) => {
    if (!cv) return false;
    const folder = (cv.folder_name || '').toLowerCase();
    const particulars = (cv.particulars || '').toLowerCase();
    return folder.includes('revolving') || particulars.includes('revolving') || Boolean(cv.revolving_fund?.id);
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
        alert(`Check Voucher ${searchTarget} not found.`);
      }
    } catch (err) {
      console.error('Error fetching check voucher modal:', err);
    } finally {
      setCvLoading(false);
    }
  };

  // Revert status from 'on process' back to 'edit'
  const handleRevertToEdit = async (cv: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Revert Voucher #${cv.voucher_no} back to "Edit" status?`)) return;
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
      alert(err.response?.data?.error?.message || 'Failed to revert status.');
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status?: string, cv?: any) => {
    const s = (status || 'edit').toLowerCase();
    switch (s) {
      case 'on process':
        if (cv && isAdminOrStaff) {
          return (
            <button
              type="button"
              onClick={e => handleRevertToEdit(cv, e)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 hover:border-blue-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs group"
              title="Status: On Process. Click to revert back to Edit if printing was cancelled."
            >
              <Clock className="w-3 h-3 group-hover:rotate-45 transition-transform" />
              <span>On Process</span>
            </button>
          );
        }
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

  // Print CV Breakdown: prints sheet and changes status to 'on process'
  const handlePrintCvBreakdown = (cv: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPrintingCvBreakdown(cv);

    const cleanup = async () => {
      window.removeEventListener('afterprint', cleanup);
      setPrintingCvBreakdown(null);

      // Advance voucher status to 'on process' after printing if currently 'edit'
      if (!cv.status || cv.status.toLowerCase() === 'edit') {
        try {
          const res = await api.post(`/accounts/check-vouchers/${cv.id}/print`);
          if (res.data?.data) {
            const updated = res.data.data;
            setCheckVouchers(prev => prev.map(v => (v.id === cv.id ? { ...v, status: updated.status } : v)));
            if (selectedCvForModal && selectedCvForModal.id === cv.id) {
              setSelectedCvForModal((prev: any) => (prev ? { ...prev, status: updated.status } : null));
            }
            setCvActionFeedback({
              type: 'success',
              message: `Voucher #${cv.voucher_no} is now On Process.`
            });
            setTimeout(() => setCvActionFeedback(null), 4000);
          }
        } catch (err) {
          console.error('Error updating CV status to on process after printing:', err);
        }
      }
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Advance to 'for release' (Manager / Admin Approval)
  const handleApproveForRelease = async (cv: any) => {
    try {
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
      alert(err.response?.data?.error?.message || 'Failed to approve check voucher for release.');
    }
  };

  // Advance to 'filed' (Admin Only Release & Seal)
  const handleFileAndLockCv = async (cv: any) => {
    if (!isAdmin) {
      alert('Only administrators can release, seal, and file check vouchers.');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.put(`/accounts/check-vouchers/${cv.id}`, {
        status: 'filed',
        date_released: today
      });
      const updated = res.data?.data;
      if (updated) {
        setCheckVouchers(prev => prev.map(v => (v.id === cv.id ? { ...v, ...updated } : v)));
        if (selectedCvForModal?.id === cv.id) {
          setSelectedCvForModal((prev: any) => (prev ? { ...prev, ...updated } : null));
        }
        setCvActionFeedback({
          type: 'success',
          message: `Voucher #${cv.voucher_no} is now sealed, filed, and locked!`
        });
        setTimeout(() => setCvActionFeedback(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to file check voucher:', err);
      alert(err.response?.data?.error?.message || 'Failed to file check voucher.');
    }
  };

  // Admin Unlock/Revert from 'filed' to 'for release'
  const handleUnlockCv = async (cv: any) => {
    if (!isAdmin) return;
    if (!confirm(`Unlock Check Voucher #${cv.voucher_no}? This will re-enable editing and deletion.`)) return;
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
      alert(err.response?.data?.error?.message || 'Failed to unlock check voucher.');
    }
  };

  // Start Editing CV
  const startEditingCv = (cv: any) => {
    if (!cv) return;
    const { rows } = getBalancedCvRows(cv);
    setEditCvFormData({
      id: cv.id,
      voucher_no: cv.voucher_no || '',
      voucher_date: cv.voucher_date ? cv.voucher_date.split('T')[0] : '',
      check_no: cv.check_no || '',
      payee: cv.payee || cv.payee_name || '',
      bank: cv.bank || 'BDO',
      particulars: cv.particulars || '',
      folder_name: cv.folder_name || currentTabConfig.defaultCategory,
      prepared_by: cv.signatories?.prepared_by || 'LAMOSTE, CHINNETTE A.',
      checked_by: cv.signatories?.checked_by || 'MARILOU LARIOSA',
      approved_by: cv.signatories?.approved_by || 'MICHELLE M. PABLE'
    });

    if (rows.length > 0) {
      setEditCvRows(
        rows.map(r => ({
          description: r.description,
          debit: r.debit !== null ? String(r.debit) : '',
          credit: r.credit !== null ? String(r.credit) : ''
        }))
      );
    } else {
      const amt = parseFloat(cv.amount || 0);
      setEditCvRows([
        { description: cv.particulars || 'Disbursement Item', debit: amt > 0 ? String(amt) : '', credit: '' },
        { description: `CIB - ${cv.bank || 'BDO'}`, debit: '', credit: amt > 0 ? String(amt) : '' }
      ]);
    }
    setIsEditingCvModal(true);
  };

  // Save Edited CV
  const handleSaveCvEdit = async () => {
    if (!editCvFormData.id) return;
    try {
      setIsSavingCvEdit(true);
      let calculatedAmount = 0;
      const detailsArray = editCvRows
        .filter(r => r.description.trim() || r.debit || r.credit)
        .map(r => {
          const debitVal = parseFloat(r.debit || '0') || 0;
          const creditVal = parseFloat(r.credit || '0') || 0;
          if (debitVal > 0) calculatedAmount += debitVal;
          const netAmount = debitVal > 0 ? debitVal : -creditVal;
          return {
            book_of_account: r.description.trim(),
            amount: netAmount
          };
        });

      const payload = {
        voucher_no: editCvFormData.voucher_no.trim(),
        voucher_date: editCvFormData.voucher_date || null,
        check_no: editCvFormData.check_no.trim() || null,
        payee: editCvFormData.payee.trim(),
        bank: editCvFormData.bank.trim() || null,
        particulars: editCvFormData.particulars.trim() || null,
        folder_name: editCvFormData.folder_name.trim() || null,
        amount: calculatedAmount > 0 ? calculatedAmount : selectedCvForModal.amount,
        details: detailsArray,
        signatories: {
          prepared_by: editCvFormData.prepared_by.trim(),
          checked_by: editCvFormData.checked_by.trim(),
          approved_by: editCvFormData.approved_by.trim()
        }
      };

      const res = await api.put(`/accounts/check-vouchers/${editCvFormData.id}`, payload);
      const updatedCv = res.data?.data || { ...selectedCvForModal, ...payload };
      setSelectedCvForModal(updatedCv);
      setIsEditingCvModal(false);

      setCheckVouchers(prev => prev.map(cv => (cv.id === editCvFormData.id ? { ...cv, ...updatedCv } : cv)));
      setCvActionFeedback({ type: 'success', message: 'Check Voucher updated successfully!' });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to update check voucher:', err);
      alert(err.response?.data?.error?.message || 'Failed to update check voucher.');
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
      alert(err.response?.data?.error?.message || 'Failed to sync with linked Liquidation Form.');
    } finally {
      setIsSyncingCvRf(false);
    }
  };

  // Open Create Check Voucher Modal
  const openCreateCheckVoucherModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const yr = String(new Date().getFullYear()).slice(-2);
    setNewCvVoucherNo(`${yr}-${Math.floor(100 + Math.random() * 900)}`);
    setNewCvDate(today);
    setNewCvReleasedDate(today);
    setNewCvPayee('');
    setNewCvBankName('BDO');
    setNewCvCheckNo('');
    setNewCvParticulars('');
    setNewCvCategory(currentTabConfig.defaultCategory);
    setNewCvPreparedBy('LAMOSTE, CHINNETTE A.');
    setNewCvCheckedBy('MARILOU LARIOSA');
    setNewCvApprovedBy('MICHELLE M. PABLE');
    setNewCvRows([
      { description: currentTabConfig.label, debit: '', credit: '' },
      { description: 'CIB - BDO', debit: '', credit: '' }
    ]);
    setIsCreateCVOpen(true);
  };

  // Create Check Voucher Submission
  const handleCreateCheckVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCvVoucherNo.trim()) return alert('Please provide a Voucher Number.');
    if (!newCvPayee.trim()) return alert('Please specify a Payee.');

    try {
      setIsSavingNewCv(true);
      let calculatedAmount = 0;
      const detailsArray = newCvRows
        .filter(r => r.description.trim() || r.debit || r.credit)
        .map(r => {
          const debitVal = parseFloat(r.debit || '0') || 0;
          const creditVal = parseFloat(r.credit || '0') || 0;
          if (debitVal > 0) calculatedAmount += debitVal;
          const netAmount = debitVal > 0 ? debitVal : -creditVal;
          return {
            book_of_account: r.description.trim(),
            amount: netAmount
          };
        });

      const payload = {
        voucher_no: newCvVoucherNo.trim(),
        voucher_date: newCvDate || null,
        date_released: newCvReleasedDate || null,
        check_no: newCvCheckNo.trim() || null,
        payee: newCvPayee.trim(),
        bank: newCvBankName.trim() || null,
        particulars: newCvParticulars.trim() || `${currentTabConfig.label} disbursement`,
        folder_name: newCvCategory || currentTabConfig.defaultCategory,
        amount: calculatedAmount,
        details: detailsArray,
        signatories: {
          prepared_by: newCvPreparedBy.trim(),
          checked_by: newCvCheckedBy.trim(),
          approved_by: newCvApprovedBy.trim()
        }
      };

      const res = await api.post('/accounts/check-vouchers', payload);
      setIsCreateCVOpen(false);
      loadCheckVouchers(1);
      setCvActionFeedback({ type: 'success', message: `Check Voucher #${newCvVoucherNo} issued successfully!` });
      setTimeout(() => setCvActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to create check voucher:', err);
      alert(err.response?.data?.error?.message || 'Failed to create check voucher.');
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
      alert(err.response?.data?.error?.message || 'Failed to delete check voucher.');
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
      alert(err.response?.data?.error?.message || 'Failed to delete selected check vouchers.');
    } finally {
      setIsDeletingCv(false);
    }
  };

  // Clear All CVs in Category
  const handleClearAllCv = async () => {
    if (clearAllConfirmText.trim().toUpperCase() !== 'CLEAR') {
      alert('Please type CLEAR to confirm deletion.');
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
      alert(err.response?.data?.error?.message || 'Failed to clear check vouchers.');
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Page Title Header */}
      <div className="space-y-3">
        <BackButton href="/dashboard" label="Back to Overview" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-headline font-extrabold tracking-tight text-neutral-900 dark:text-white flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-primary/10 text-primary dark:text-secondary dark:bg-secondary/10">
                <FileSpreadsheet className="w-6 h-6 sm:w-7 sm:h-7" />
              </span>
              Disbursement Module
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Cooperative disbursement registries, replenishment schedules, check vouchers, and liquidation ledgers.
            </p>
          </div>

          {isAdminOrStaff && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={openCreateCheckVoucherModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-headline font-bold text-xs rounded-full shadow-md hover:shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Issue Check Voucher
              </button>
            </div>
          )}
        </div>
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
              Total {currentTabConfig.label} Disbursed
            </span>
            <p className="text-xl sm:text-2xl font-headline font-black text-primary dark:text-secondary">
              ₱{tabStats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-neutral-500">Across {tabStats.count} recorded check vouchers</p>
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
            <p className="text-[10px] text-neutral-500">In current category registry</p>
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

      {/* Sub-view toggle for Revolving Fund Replenishment */}
      {activeTab === 'revolving_fund_replenishment' && (
        <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Revolving fund check vouchers, liquidations, and expense breakdowns
          </p>
          <div className="inline-flex items-center p-1 rounded-2xl bg-surface-container-low dark:bg-surface-container-high border border-outline-variant/60">
            <button
              type="button"
              onClick={() => setRfSubView('vouchers')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                rfSubView === 'vouchers'
                  ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
              }`}
            >
              Check Vouchers
            </button>
            <button
              type="button"
              onClick={() => setRfSubView('liquidations')}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                rfSubView === 'liquidations'
                  ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
              }`}
            >
              Liquidation Forms & Items
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT: IF REVOLVING FUND LIQUIDATION SUBVIEW */}
      {activeTab === 'revolving_fund_replenishment' && rfSubView === 'liquidations' ? (
        <div className="p-6 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs">
          <RevolvingFundsTab
            isAdminOrManager={isAdminOrManager}
            onViewCheckVoucher={openCheckVoucherModalByIdOrNo}
            initialSearch={rfTargetSearch}
            targetLiquidationId={rfTargetId}
            onClearTarget={() => {
              setRfTargetSearch('');
              setRfTargetId('');
            }}
          />
        </div>
      ) : (
        /* STANDARD CHECK VOUCHER REGISTRY TABLE FOR CURRENT DISBURSEMENT TAB */
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
                  placeholder={`Search ${currentTabConfig.label} by voucher #, check #, payee, or particulars...`}
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
                  <select
                    value={cvBankFilter}
                    onChange={e => setCvBankFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-medium rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 focus:outline-none focus:border-primary text-neutral-900 dark:text-white cursor-pointer"
                  >
                    <option value="all">All Banks</option>
                    <option value="BDO">BDO</option>
                    <option value="LBP">Land Bank (LBP)</option>
                    <option value="DBP">DBP</option>
                    {bankOptions
                      .filter(b => !['BDO', 'LBP', 'DBP'].includes(b.toUpperCase()))
                      .map(b => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Status:</span>
                  <select
                    value={cvStatusFilter}
                    onChange={e => setCvStatusFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-medium rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 focus:outline-none focus:border-primary text-neutral-900 dark:text-white cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="edit">Edit</option>
                    <option value="on process">On Process</option>
                    <option value="for release">For Release</option>
                    <option value="filed">Filed</option>
                  </select>
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
                {checkVouchers.length > 0 && isAdminOrStaff && (
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
                    <th className="py-3.5 px-4 font-bold">Voucher No.</th>
                    <th className="py-3.5 px-4 font-bold">Date</th>
                    <th className="py-3.5 px-4 font-bold">Check No.</th>
                    <th className="py-3.5 px-4 font-bold">Payee / Entity</th>
                    <th className="py-3.5 px-4 font-bold">Bank</th>
                    <th className="py-3.5 px-4 font-bold">Particulars / Details</th>
                    <th className="py-3.5 px-4 font-bold text-right">Disbursed Amount</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    <th className="py-3.5 px-4 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {cvLoading && checkVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-neutral-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          <span>Loading {currentTabConfig.label} check vouchers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : checkVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-neutral-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FolderOpen className="w-8 h-8 text-neutral-400" />
                          <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                            No {currentTabConfig.label} check vouchers found.
                          </p>
                          <p className="text-[11px] text-neutral-400 max-w-md">
                            Issue a new check voucher using the &quot;Issue Check Voucher&quot; button above, or import
                            historical spreadsheets from Data Import.
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
                            <span className="font-mono text-primary dark:text-secondary hover:underline flex items-center gap-1.5">
                              <span>{cv.voucher_no}</span>
                              {isRf && (
                                <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-sans font-bold">
                                  {rfNum || 'RF'}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                            {cv.voucher_date ? new Date(cv.voucher_date).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                            {cv.check_no || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-neutral-900 dark:text-white max-w-[200px] truncate" title={cv.payee}>
                            {cv.payee || '—'}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                            {cv.bank ? (
                              <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px] font-bold">
                                {cv.bank}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-neutral-700 dark:text-neutral-300 max-w-[280px] truncate" title={cv.particulars}>
                            {cv.particulars || 'Disbursement voucher'}
                          </td>
                          <td className="py-3.5 px-4 font-headline font-bold text-right text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                            ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            {renderStatusBadge(cv.status, cv)}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Print Fast Breakdown */}
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
                  Showing {checkVouchers.length} of {cvTotalCount} check vouchers in {currentTabConfig.label}
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
      )}

      {/* CREATE CHECK VOUCHER MODAL */}
      {isCreateCVOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 sm:p-6 animate-modal-backdrop"
          onClick={() => setIsCreateCVOpen(false)}
        >
          <div
            className="bg-surface-container-lowest dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-modal-pop overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/60 p-5 sm:p-6 shrink-0 bg-surface-container-lowest dark:bg-neutral-900">
              <div>
                <h2 className="text-xl font-headline font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary dark:text-secondary" />
                  Issue New Check Voucher ({currentTabConfig.label})
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Record official cooperative disbursement check with balanced double-entry breakdown.
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
              <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5 text-xs custom-scrollbar">
                {/* Top Row: Voucher No, Date, Check No, Bank */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                      Voucher No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCvVoucherNo}
                      onChange={e => setNewCvVoucherNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-mono font-bold"
                    />
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
                      Date Released
                    </label>
                    <input
                      type="date"
                      value={newCvReleasedDate}
                      onChange={e => setNewCvReleasedDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                      Draw Bank
                    </label>
                    <select
                      value={newCvBankName}
                      onChange={e => setNewCvBankName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-bold"
                    >
                      <option value="BDO">BDO</option>
                      <option value="LBP">LBP (Land Bank)</option>
                      <option value="BPI">BPI</option>
                      <option value="MBTC">Metrobank</option>
                      <option value="PNB">PNB</option>
                      <option value="OTHER">Other Bank</option>
                    </select>
                  </div>
                </div>

                {/* Second Row: Payee, Check No, Folder/Category */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
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
                  <div>
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
                </div>

                {/* Particulars */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                    Particulars / Transaction Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe transaction context, purpose of disbursement, or loan contract details..."
                    value={newCvParticulars}
                    onChange={e => setNewCvParticulars(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 resize-none"
                  />
                </div>

                {/* Line Items Rows (Balanced Double Entry) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-neutral-900 dark:text-white uppercase text-[11px] tracking-wider block">
                        Accounting Line Items &amp; Breakdown
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        Specify debit and credit entries to match disbursed check amount.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewCvRows(prev => [...prev, { description: '', debit: '', credit: '' }])}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-secondary hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Breakdown Row</span>
                    </button>
                  </div>

                  <div className="border border-outline-variant/60 rounded-2xl overflow-hidden divide-y divide-outline-variant/40">
                    <div className="grid grid-cols-12 px-3 py-2 bg-surface-container-low dark:bg-surface-container font-bold text-[10px] uppercase tracking-wider text-neutral-500">
                      <div className="col-span-6">Book of Account / Item Description</div>
                      <div className="col-span-3 text-right">Debit (₱)</div>
                      <div className="col-span-2 text-right">Credit (₱)</div>
                      <div className="col-span-1 text-center">Action</div>
                    </div>

                    {newCvRows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-12 px-3 py-2 items-center gap-2">
                        <div className="col-span-6">
                          <input
                            type="text"
                            placeholder={`Line item #${idx + 1}`}
                            value={row.description}
                            onChange={e => {
                              const val = e.target.value;
                              setNewCvRows(prev => prev.map((r, i) => (i === idx ? { ...r, description: val } : r)));
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Debit"
                            value={row.debit}
                            onChange={e => {
                              const val = e.target.value;
                              setNewCvRows(prev => prev.map((r, i) => (i === idx ? { ...r, debit: val } : r)));
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-right text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Credit"
                            value={row.credit}
                            onChange={e => {
                              const val = e.target.value;
                              setNewCvRows(prev => prev.map((r, i) => (i === idx ? { ...r, credit: val } : r)));
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-right text-xs"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          {newCvRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setNewCvRows(prev => prev.filter((_, i) => i !== idx))}
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

                  {/* Calculated summary row */}
                  {(() => {
                    let debitTotal = 0;
                    let creditTotal = 0;
                    newCvRows.forEach(r => {
                      debitTotal += parseFloat(r.debit || '0') || 0;
                      creditTotal += parseFloat(r.credit || '0') || 0;
                    });
                    const diff = debitTotal - creditTotal;
                    return (
                      <div className="p-3 rounded-xl bg-surface-container-low dark:bg-surface-container flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-neutral-600 dark:text-neutral-300">
                            Total Net Debit: <span className="font-mono text-primary dark:text-secondary">₱{debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </span>
                          <span className="font-bold text-neutral-600 dark:text-neutral-300">
                            Total Credit: <span className="font-mono text-neutral-500">₱{creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-neutral-500">
                          Net Disbursed Amount: ₱{diff > 0 ? diff.toLocaleString('en-US', { minimumFractionDigits: 2 }) : debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Signatories */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-outline-variant/60">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Prepared By</label>
                    <input
                      type="text"
                      value={newCvPreparedBy}
                      onChange={e => setNewCvPreparedBy(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Checked By</label>
                    <input
                      type="text"
                      value={newCvCheckedBy}
                      onChange={e => setNewCvCheckedBy(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Approved By</label>
                    <input
                      type="text"
                      value={newCvApprovedBy}
                      onChange={e => setNewCvApprovedBy(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-semibold"
                    />
                  </div>
                </div>
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
                  <span>Issue Voucher</span>
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
            className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-2xl shadow-2xl relative animate-modal-pop overflow-hidden max-h-[90vh] flex flex-col"
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Voucher Date</span>
                  <span className="text-sm font-bold text-on-surface dark:text-white truncate block mt-0.5">
                    {selectedCvForModal.voucher_date ? new Date(selectedCvForModal.voucher_date).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Name</span>
                  <span className="text-sm font-bold text-on-surface dark:text-white truncate block mt-0.5" title={selectedCvForModal.payee || '—'}>
                    {selectedCvForModal.payee || '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Check No.</span>
                  <span className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400 truncate block mt-0.5">
                    {selectedCvForModal.check_no || '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Bank</span>
                  <span className="text-sm font-bold text-on-surface dark:text-white truncate block mt-0.5">
                    {selectedCvForModal.bank || '—'}
                  </span>
                </div>
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

              {/* Linked Revolving Fund Banner */}
              {isRevolvingVoucher(selectedCvForModal) && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/5 to-transparent border border-amber-400/50 dark:border-amber-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                          Linked Liquidation Form
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-200/80 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200">
                          {selectedCvForModal.revolving_fund?.lf_no || extractRfNumber(selectedCvForModal) || 'Revolving Fund'}
                        </span>
                        {selectedCvForModal.revolving_fund?.sheet_name && (
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                            ({selectedCvForModal.revolving_fund.sheet_name})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                        Custodian: <span className="font-semibold text-neutral-800 dark:text-neutral-100">{selectedCvForModal.revolving_fund?.custodian_name || selectedCvForModal.payee || 'Michelle M. Pable'}</span>
                        {selectedCvForModal.revolving_fund?.total_liquidated && (
                          <span className="ml-2 font-mono text-emerald-700 dark:text-emerald-400">
                            • Liquidated: ₱{parseFloat(selectedCvForModal.revolving_fund.total_liquidated).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncCvWithRf}
                    disabled={isSyncingCvRf}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white shadow-2xs transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCvRf ? 'animate-spin' : ''}`} />
                    <span>Sync with Liquidation Form</span>
                  </button>
                </div>
              )}

              {/* Transaction Details Table */}
              {(() => {
                const { rows, debitTotal, creditTotal } = getBalancedCvRows(selectedCvForModal);
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Transaction Details
                      </h5>
                    </div>
                    <div className="border border-outline-variant/50 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-neutral-100/70 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 font-bold border-b border-outline-variant/40">
                            <th className="px-4 py-2.5 text-left w-12">#</th>
                            <th className="px-4 py-2.5 text-left">Book of Accounts</th>
                            <th className="px-4 py-2.5 text-right w-36">Debit</th>
                            <th className="px-4 py-2.5 text-right w-36">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/20">
                          {rows.length > 0 ? (
                            rows.map((item, idx) => (
                              <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                                <td className="px-4 py-2.5 text-neutral-400 font-mono">{idx + 1}</td>
                                <td className="px-4 py-2.5 font-medium text-on-surface dark:text-white">
                                  {item.description}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold whitespace-nowrap text-neutral-900 dark:text-neutral-100">
                                  {item.debit !== null ? `₱${item.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold whitespace-nowrap text-rose-600 dark:text-rose-400">
                                  {item.credit !== null ? `₱${item.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-4 py-6 text-center text-neutral-500 italic">
                                No transaction breakdown details available for this voucher.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-neutral-100/70 dark:bg-neutral-800/70 border-t border-outline-variant/30 font-bold">
                          <tr>
                            <td colSpan={2} className="px-4 py-2.5 font-bold text-right text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                              Total:
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
                              ₱{debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                              ₱{creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Disbursed Amount Box below table */}
                    <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-1">
                          Disbursed Amount:
                        </span>
                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wide leading-relaxed">
                          {formatDisbursedInWords(getCvDisbursedAmount(selectedCvForModal))}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-mono font-extrabold text-base text-emerald-700 dark:text-emerald-300">
                          ₱{getCvDisbursedAmount(selectedCvForModal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          <div className="h-8"></div>
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
                {/* Manager / Admin: Approve for Release when 'on process' */}
                {selectedCvForModal.status === 'on process' && isAdminOrManager && (
                  <button
                    type="button"
                    onClick={() => handleApproveForRelease(selectedCvForModal)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Approve for Release</span>
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

                {/* Admin: Release & File (Locked) when 'for release' */}
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



                {/* Edit CV: Available only if not filed, or if admin */}
                {isAdminOrStaff && (selectedCvForModal.status !== 'filed' || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => startEditingCv(selectedCvForModal)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full border border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all active:scale-95 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Voucher</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handlePrintCvBreakdown(selectedCvForModal)}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-full bg-emerald-700 hover:bg-emerald-800 text-white shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Breakdown</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT CHECK VOUCHER MODAL */}
      {isEditingCvModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 sm:p-6 animate-modal-backdrop"
          onClick={() => setIsEditingCvModal(false)}
        >
          <div
            className="bg-surface-container-lowest dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-modal-pop overflow-hidden"
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
                onClick={() => setIsEditingCvModal(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5 text-xs custom-scrollbar">
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
                  <select
                    value={editCvFormData.bank}
                    onChange={e => setEditCvFormData({ ...editCvFormData, bank: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 font-medium"
                  >
                    <option value="BDO">BDO</option>
                    <option value="LBP">Land Bank (LBP)</option>
                    <option value="DBP">DBP</option>
                    <option value="CASH">Cash on Hand</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    Category
                  </label>
                  <input
                    type="text"
                    value={editCvFormData.folder_name}
                    onChange={e => setEditCvFormData({ ...editCvFormData, folder_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Particulars
                </label>
                <textarea
                  rows={2}
                  value={editCvFormData.particulars}
                  onChange={e => setEditCvFormData({ ...editCvFormData, particulars: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 resize-none"
                />
              </div>

              {/* Rows */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 dark:text-white uppercase text-[11px] tracking-wider">
                    Breakdown Rows
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditCvRows(prev => [...prev, { description: '', debit: '', credit: '' }])}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-secondary hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Row
                  </button>
                </div>

                <div className="border border-outline-variant/60 rounded-2xl overflow-hidden divide-y divide-outline-variant/40">
                  {editCvRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 px-3 py-2 items-center gap-2">
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={row.description}
                          onChange={e => {
                            const val = e.target.value;
                            setEditCvRows(prev => prev.map((r, i) => (i === idx ? { ...r, description: val } : r)));
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          value={row.debit}
                          onChange={e => {
                            const val = e.target.value;
                            setEditCvRows(prev => prev.map((r, i) => (i === idx ? { ...r, debit: val } : r)));
                          }}
                          placeholder="Debit"
                          className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-right text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.credit}
                          onChange={e => {
                            const val = e.target.value;
                            setEditCvRows(prev => prev.map((r, i) => (i === idx ? { ...r, credit: val } : r)));
                          }}
                          placeholder="Credit"
                          className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-right text-xs"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => setEditCvRows(prev => prev.filter((_, i) => i !== idx))}
                          className="text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Approved By</label>
                  <input
                    type="text"
                    value={editCvFormData.approved_by}
                    onChange={e => setEditCvFormData({ ...editCvFormData, approved_by: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-outline-variant/60 shrink-0 bg-surface-container-lowest dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => setIsEditingCvModal(false)}
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



      {/* GLOBAL PRINT STYLES FOR CV BREAKDOWN */}
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
          body > *:not(#cv-breakdown-print-section) {
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

      {/* HIDDEN PRINT-ONLY CONTAINER: CHECK VOUCHER */}
      {printingCvBreakdown && typeof document !== 'undefined' && createPortal(
        <div id="cv-breakdown-print-section" className="hidden print:block text-black bg-white font-sans" style={{ fontFamily: 'sans-serif', color: '#000000', backgroundColor: '#ffffff', boxSizing: 'border-box' }}>
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
              const { rows, debitTotal, creditTotal } = getBalancedCvRows(printingCvBreakdown);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ border: '1px solid rgba(6, 78, 59, 0.2)', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                    <div style={{ backgroundColor: '#064e3b', color: '#ffffff', padding: '6px 14px', fontWeight: 'bold', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>
                      Transaction Details
                    </div>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '10px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#ecfdf5', color: '#064e3b', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(6, 78, 59, 0.15)' }}>
                          <th style={{ padding: '8px 12px', width: '36px', textAlign: 'center', borderRight: '1px solid rgba(6, 78, 59, 0.1)' }}>#</th>
                          <th style={{ padding: '8px 12px', borderRight: '1px solid rgba(6, 78, 59, 0.1)' }}>Book of Accounts</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', width: '130px', borderRight: '1px solid rgba(6, 78, 59, 0.1)' }}>Debit (₱)</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', width: '130px' }}>Credit (₱)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length > 0 ? (
                          rows.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(6, 78, 59, 0.08)', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd' }}>
                              <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace', color: '#6b7280', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#1f2937', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>
                                {item.description}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#111827', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>
                                {item.debit !== null ? item.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#dc2626' }}>
                                {item.credit !== null ? item.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
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
                        <tr style={{ backgroundColor: '#f9fafb', fontWeight: 'bold', fontSize: '10px', borderTop: '1px solid rgba(6, 78, 59, 0.15)' }}>
                          <td colSpan={2} style={{ padding: '8px 12px', textAlign: 'right', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>
                            Total:
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#111827', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>
                            ₱{debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>
                            ₱{creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        {formatDisbursedInWords(getCvDisbursedAmount(printingCvBreakdown))}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '15px', fontFamily: 'monospace', fontWeight: '800', color: '#064e3b' }}>
                        ₱{getCvDisbursedAmount(printingCvBreakdown).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  <div style={{ height: '36px' }}></div>
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
