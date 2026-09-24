'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import LoanAmortizationCalculator from '@/components/loans/LoanAmortizationCalculator';
import SearchInput from '@/components/SearchInput';
import * as XLSX from 'xlsx';
import {
  Banknote,
  Percent,
  Calendar,
  AlertTriangle,
  PlusCircle,
  FileCheck,
  CheckCircle,
  XCircle,
  CreditCard,
  DollarSign,
  User,
  Clock,
  Eye,
  EyeOff,
  Search,
  X,
  ArrowLeft,
  Info,
  ShieldCheck,
  CheckCircle2,
  Users,
  Printer,
  Download,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  FileText,
  ShoppingCart,
  Minus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Receipt,
  ReceiptText,
  Pencil,
  Plus,
  Save,
  RefreshCw,
  Filter,
  Layers,
  RotateCcw,
  ArrowRight,
  ExternalLink,
  Zap,
  History
} from 'lucide-react';
import LoanApprovalModal from '@/components/loans/LoanApprovalModal';
import RevolvingFundsTab from '@/components/loans/RevolvingFundsTab';

interface LoanProduct {
  id: number | string;
  name: string;
  interest_rate: string;
  term_months: number;
  amortization_type: 'flat_rate' | 'diminishing_balance';
  min_amount: string;
  max_amount: string;
  is_active: boolean;
}

interface Loan {
  id: number | string;
  member_id: number | string;
  first_name?: string;
  last_name?: string;
  product_name?: string;
  principal_amount: string;
  interest_rate: string;
  term_months: number;
  amortization_type: string;
  status: 'pending_approval' | 'approved' | 'disbursed' | 'fully_paid' | 'rejected' | 'defaulted';
  created_at: string;
  disbursed_at?: string | null;
  maturity_date?: string | null;
  laf_no?: string;
  payment_mode?: string;
}

const LOAN_CATEGORIES = {
  REGULAR: 'Regular Loan',
  STL: 'Short Term Loan or STL',
};

const getProductCategory = (name: string) => {
  if (!name) return LOAN_CATEGORIES.REGULAR;
  const lowercaseName = name.toLowerCase();
  // Calamity Loan is strictly a Regular Loan
  if (lowercaseName.includes('calamity')) {
    return LOAN_CATEGORIES.REGULAR;
  }
  if (
    lowercaseName.includes('short term') ||
    lowercaseName.includes('stl') ||
    lowercaseName.includes('utility') ||
    lowercaseName.includes('emergency') ||
    lowercaseName.includes('express') ||
    lowercaseName.includes('special')
  ) {
    return LOAN_CATEGORIES.STL;
  }
  return LOAN_CATEGORIES.REGULAR;
};

const LOAN_DESCRIPTIONS: Record<string, { desc: string; helper?: string }> = {
  'Regular Loan - Salary Deduction': {
    desc: 'Regular salary-based credit line with automatic payroll deduction.',
    helper: '₱10,000 to ₱75,000. Maximum term: 1 year (12 months).'
  },
  'Regular Loan - Project Loan': {
    desc: 'Project or entrepreneurial funding for business expansions or asset acquisitions.',
    helper: '₱76,000 to ₱300,000. Maximum term: 2 years (24 months).'
  },
  'Regular Loan - Calamity Loan': {
    desc: 'Emergency financial assistance released during officially declared State of Calamity.',
    helper: '₱10,000 to ₱50,000. Maximum term: 1-2 years (24 months).'
  },
  'Short Term Loan (STL) - Utility Loan': {
    desc: 'Quick cash relief for paying electricity, water, internet, or other home utilities.',
    helper: 'Fixed amount: ₱3,000. Term: 1 month.'
  },
  'Short Term Loan (STL) - Emergency Loan': {
    desc: 'Emergency funding for medical needs or unplanned urgent expenses.',
    helper: 'Fixed amount: ₱5,000. Term: 1-2 months.'
  },
  'Short Term Loan (STL) - Cash Express': {
    desc: 'Quick cash release to bridge short-term financing gaps.',
    helper: 'Fixed amount: ₱7,000. Term: 1-2 months.'
  },
  'Short Term Loan (STL) - Special Occasion': {
    desc: 'Financial support for seasonal expenses, holidays, and school registration periods.',
    helper: 'Fixed amount: ₱10,000. Term: 1-3 months.'
  }
};

function LoansPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusParam = searchParams.get('status');

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'staff' || (user?.role as string) === 'manager';
  const isVerified = isAdminOrManager || user?.profile?.status === 'approved' || user?.profile?.status === 'active' || user?.profile?.is_verified === true;

  const [activeTab, setActiveTab] = useState<'loans' | 'payments' | 'products'>('loans');

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'payments' || tab === 'products' || tab === 'loans') {
      setActiveTab(tab as any);
    } else if (tab === 'vouchers' || tab === 'revolving_funds' || tab === 'revolving') {
      router.replace('/dashboard/disbursement');
    }
  }, [searchParams, router]);

  // Loan Payments State
  const [loanPayments, setLoanPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsMethodFilter, setPaymentsMethodFilter] = useState('all');
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPerPage] = useState(15);
  const [selectedPaymentForModal, setSelectedPaymentForModal] = useState<any | null>(null);

  const formatDisplayPaymentMethod = (method?: string, ref?: string) => {
    const m = (method || '').trim();
    const r = (ref || '').trim();

    if (m === 'SD' || m.toLowerCase() === 'salary_deduction' || r === 'SD' || r.toLowerCase() === 'salary_deduction') {
      return { label: 'Salary Deduction', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' };
    }
    if (m.toUpperCase() === 'HAND-IN' || m.toUpperCase() === 'HAND -IN' || m.toLowerCase() === 'cash') {
      return { label: 'Cash / Over-The-Counter', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' };
    }
    if (m.toLowerCase().includes('bank') || m.toLowerCase().includes('transfer') || ['bdo', 'mbtc', 'bpi'].includes(m.toLowerCase())) {
      return { label: m.toUpperCase().includes('BANK') ? m : `Bank (${m})`, color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' };
    }
    if (m.toLowerCase().includes('check') || m.toLowerCase().includes('pdc')) {
      return { label: 'Check Payment', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' };
    }
    if (m.toLowerCase().includes('paid thru')) {
      return { label: m, color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300' };
    }
    if (!isNaN(Number(m)) && Number(m) > 0) {
      return { label: 'Salary Deduction', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' };
    }
    return { label: m || 'Salary Deduction', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300' };
  };

  const getCleanReceiptIdentifier = (payment: any) => {
    const ref = (payment?.reference_no || '').trim();
    if (ref && !['SD', 'HAND-IN', 'HAND -IN'].includes(ref.toUpperCase()) && isNaN(Number(ref))) {
      return ref.toUpperCase().startsWith('OR') || ref.toUpperCase().startsWith('RCPT') ? ref : `OR-${ref}`;
    }
    if (ref && !isNaN(Number(ref))) {
      return `OR-${ref}`;
    }
    return `OR-${String(payment?.id || '').slice(0, 8).toUpperCase()}`;
  };

  const loadLoanPayments = useCallback(async () => {
    try {
      setPaymentsLoading(true);
      const params: Record<string, string> = {};
      if (paymentsSearch.trim()) params.search = paymentsSearch.trim();
      if (paymentsMethodFilter && paymentsMethodFilter !== 'all') params.payment_method = paymentsMethodFilter;
      const res = await api.get('/loans/repayments', { params });
      setLoanPayments(res.data.data || []);
      setPaymentsPage(1);
    } catch (err) {
      console.error('Failed to load loan payments:', err);
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentsSearch, paymentsMethodFilter]);

  useEffect(() => {
    if (activeTab === 'payments') {
      loadLoanPayments();
    }
  }, [activeTab, loadLoanPayments]);

  // Check Voucher Registry state
  const [checkVouchers, setCheckVouchers] = useState<any[]>([]);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvSearch, setCvSearch] = useState('');
  const [cvPage, setCvPage] = useState(1);
  const [cvLimit] = useState(25);
  const [cvTotalCount, setCvTotalCount] = useState(0);
  const [cvTotalPages, setCvTotalPages] = useState(1);

  const loadCheckVouchers = useCallback(async (page = 1, searchOverride?: string) => {
    try {
      setCvLoading(true);
      const searchTerm = searchOverride !== undefined ? searchOverride : cvSearch;
      const params: Record<string, string | number> = { page, limit: cvLimit };
      if (searchTerm.trim()) params.search = searchTerm.trim();
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
  }, [cvSearch, cvLimit]);

  // Live real-time debounced search & instant revert on erase
  useEffect(() => {
    if ((activeTab as any) !== 'vouchers' || !isAdminOrManager) return;

    // If search is empty or erased, instantly revert to original full list
    if (!cvSearch.trim()) {
      setCvPage(1);
      loadCheckVouchers(1, '');
      return;
    }

    // Debounce typing by 250ms so user sees matching vouchers appear as they type
    const timer = setTimeout(() => {
      setCvPage(1);
      loadCheckVouchers(1, cvSearch);
    }, 250);

    return () => clearTimeout(timer);
  }, [cvSearch, activeTab]);

  // Check Voucher Deletion & Selection State
  const [selectedCvIds, setSelectedCvIds] = useState<string[]>([]);
  const [cvToDelete, setCvToDelete] = useState<any | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isClearAllCvModalOpen, setIsClearAllCvModalOpen] = useState(false);
  const [clearAllConfirmText, setClearAllConfirmText] = useState('');
  const [isDeletingCv, setIsDeletingCv] = useState(false);
  // Check Voucher Expansion / Details State
  const [expandedCvIds, setExpandedCvIds] = useState<string[]>([]);
  const [selectedCvForModal, setSelectedCvForModal] = useState<any | null>(null);
  const [printingCvBreakdown, setPrintingCvBreakdown] = useState<any | null>(null);
  const [cvActionFeedback, setCvActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const toggleExpandCv = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedCvIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const formatVoucherDescription = (particulars?: string, payee?: string) => {
    const p = (particulars || '').trim();
    if (!p) return 'Loan disbursement';
    return p;
  };

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

  // Check Voucher Modal Edit State
  const [isEditingCvModal, setIsEditingCvModal] = useState(false);
  const [isSavingCvEdit, setIsSavingCvEdit] = useState(false);
  const [isSyncingCvRf, setIsSyncingCvRf] = useState(false);
  const [editCvFormData, setEditCvFormData] = useState<any>({
    id: '',
    voucher_no: '',
    voucher_date: '',
    check_no: '',
    payee: '',
    bank: '',
    date_released: '',
    particulars: '',
    signatories: {
      prepared_by: 'LAMOSTE, CHINNETTE A.',
      checked_by: 'MARILOU LARIOSA',
      approved_by: 'MICHELLE M. PABLE',
      received_by: ''
    },
    rows: [] as { description: string; debit: string; credit: string }[]
  });

  const startEditingCv = (cv: any) => {
    const { rows } = getBalancedCvRows(cv);
    setEditCvFormData({
      id: cv.id,
      voucher_no: cv.voucher_no || '',
      voucher_date: cv.voucher_date ? String(cv.voucher_date).split('T')[0] : '',
      check_no: cv.check_no || '',
      payee: cv.payee || cv.payee_name || '',
      bank: cv.bank || '',
      date_released: cv.date_released ? String(cv.date_released).split('T')[0] : '',
      particulars: cv.particulars || '',
      signatories: {
        prepared_by: cv.signatories?.prepared_by || 'LAMOSTE, CHINNETTE A.',
        checked_by: cv.signatories?.checked_by || 'MARILOU LARIOSA',
        approved_by: cv.signatories?.approved_by || 'MICHELLE M. PABLE',
        received_by: cv.signatories?.received_by || ''
      },
      rows: rows.length > 0 ? rows.map(r => ({
        description: r.description,
        debit: r.debit !== null ? String(r.debit) : '',
        credit: r.credit !== null ? String(r.credit) : ''
      })) : [
        { description: 'Loans Receivable- Regular', debit: String(cv.amount || 0), credit: '' }
      ]
    });
    setSelectedCvForModal(cv); // needed so the modal portal renders
    setIsEditingCvModal(true);
  };

  const openCheckVoucherModalByIdOrNo = async (voucherIdOrNo: string, fallbackVoucherNo?: string) => {
    if (!voucherIdOrNo && !fallbackVoucherNo) return;
    try {
      const primary = (voucherIdOrNo || '').trim();
      const secondary = (fallbackVoucherNo || '').trim();

      // Check current in-memory vouchers first
      let cv = checkVouchers.find(v => 
        (primary && (v.id === primary || v.voucher_no === primary)) || 
        (secondary && (v.id === secondary || v.voucher_no === secondary))
      );

      // If not in memory, fetch directly from backend API
      if (!cv) {
        if (primary) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(primary);
          const params: Record<string, any> = { limit: 1 };
          if (isUuid) {
            params.id = primary;
          } else {
            params.search = primary;
          }
          const res = await api.get('/accounts/check-vouchers', { params });
          if (res.data?.success && res.data?.data && res.data.data.length > 0) {
            cv = res.data.data[0];
          }
        }

        if (!cv && secondary && secondary !== primary) {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(secondary);
          const params: Record<string, any> = { limit: 1 };
          if (isUuid) {
            params.id = secondary;
          } else {
            params.search = secondary;
          }
          const res = await api.get('/accounts/check-vouchers', { params });
          if (res.data?.success && res.data?.data && res.data.data.length > 0) {
            cv = res.data.data[0];
          }
        }
      }

      if (cv) {
        router.push(`/dashboard/disbursement?tab=loan&search=${encodeURIComponent(cv.voucher_no || '')}`);
        return;
      }
    } catch (err) {
      console.error('Failed to open check voucher modal:', err);
    }
  };

  // Vice-versa link states & navigation to Revolving Funds
  const [rfTargetSearch, setRfTargetSearch] = useState<string>('');
  const [rfTargetId, setRfTargetId] = useState<string>('');

  const isRevolvingVoucher = (cv: any) => {
    if (!cv) return false;
    if (cv.revolving_fund) return true;
    const desc = ((cv.particulars || '') + ' ' + (cv.folder_name || '')).toLowerCase();
    if (desc.includes('revolving') || desc.includes('replenishment') || /rf\s*#?\s*\d+/i.test(desc)) return true;
    if (cv.details && Array.isArray(cv.details)) {
      return cv.details.some((d: any) => 
        /revolving|replenishment/i.test(d.book_of_account || '') ||
        /revolving|replenishment/i.test(d.particulars || '')
      );
    }
    return false;
  };

  const extractRfNumber = (cv: any) => {
    if (!cv) return '';
    if (cv.revolving_fund?.lf_no) return cv.revolving_fund.lf_no;
    const match = (cv.particulars || '').match(/RF\s*#?\s*(\d+)/i);
    if (match) return `LF-${match[1]}`;
    return '';
  };

  const jumpToRevolvingFund = (rfObj?: any, fallbackLfNo?: string) => {
    setSelectedCvForModal(null);
    setIsEditingCvModal(false);
    const target = rfObj?.lf_no || rfObj?.sheet_name || fallbackLfNo || '';
    router.push(`/dashboard/disbursement?tab=revolving_fund_replenishment&search=${encodeURIComponent(target)}`);
  };

  const handleEditCvRowChange = (index: number, field: 'description' | 'debit' | 'credit', value: string) => {
    setEditCvFormData((prev: any) => {
      const updatedRows = [...prev.rows];
      updatedRows[index] = { ...updatedRows[index], [field]: value };
      return { ...prev, rows: updatedRows };
    });
  };

  const handleEditCvAddRow = () => {
    setEditCvFormData((prev: any) => ({
      ...prev,
      rows: [...prev.rows, { description: '', debit: '', credit: '' }]
    }));
  };

  const handleEditCvRemoveRow = (index: number) => {
    setEditCvFormData((prev: any) => ({
      ...prev,
      rows: prev.rows.filter((_: any, i: number) => i !== index)
    }));
  };

  const calculateEditCvTotals = () => {
    let debitTotal = 0;
    let creditTotal = 0;
    let cibAmount = 0;
    for (const r of editCvFormData.rows || []) {
      const d = parseFloat(r.debit) || 0;
      const c = parseFloat(r.credit) || 0;
      debitTotal += d;
      creditTotal += c;

      const desc = (r.description || '').trim();
      if (/cib\b|cash\s*in\s*bank/i.test(desc)) {
        cibAmount = c || d || 0;
      }
    }

    let disbursed = 0;
    if (cibAmount > 0) {
      disbursed = cibAmount;
    } else {
      const netDiff = Math.max(0, debitTotal - creditTotal);
      disbursed = netDiff > 0 ? netDiff : (debitTotal || creditTotal || 0);
    }

    return { debitTotal, creditTotal, disbursed };
  };

  const handleSaveCvEdit = async () => {
    if (!editCvFormData.id) return;
    try {
      setIsSavingCvEdit(true);
      const { disbursed } = calculateEditCvTotals();

      const detailsToSave: { book_of_account: string; amount: number }[] = [];
      for (const r of editCvFormData.rows) {
        const desc = (r.description || '').trim();
        const d = parseFloat(r.debit) || 0;
        const c = parseFloat(r.credit) || 0;
        if (d > 0) {
          detailsToSave.push({
            book_of_account: desc || 'Disbursed Item',
            amount: d
          });
        }
        if (c > 0) {
          detailsToSave.push({
            book_of_account: desc || 'Deduction',
            amount: -c
          });
        }
        if (d === 0 && c === 0 && desc) {
          detailsToSave.push({
            book_of_account: desc,
            amount: 0
          });
        }
      }

      const payload = {
        voucher_no: editCvFormData.voucher_no,
        voucher_date: editCvFormData.voucher_date || null,
        check_no: editCvFormData.check_no,
        payee: editCvFormData.payee,
        bank: editCvFormData.bank,
        particulars: editCvFormData.particulars,
        date_released: editCvFormData.date_released || null,
        amount: disbursed,
        details: detailsToSave,
        signatories: editCvFormData.signatories
      };

      const res = await api.put(`/accounts/check-vouchers/${editCvFormData.id}`, payload);
      const updatedVoucher = res.data.data;

      setCheckVouchers((prev: any[]) =>
        prev.map(v => (v.id === updatedVoucher.id ? { ...v, ...updatedVoucher } : v))
      );

      setSelectedCvForModal((prev: any) => ({ ...prev, ...updatedVoucher }));
      if (printingCvBreakdown && printingCvBreakdown.id === updatedVoucher.id) {
        setPrintingCvBreakdown((prev: any) => ({ ...prev, ...updatedVoucher }));
      }

      setIsEditingCvModal(false);
      setCvActionFeedback({
        type: 'success',
        message: `Check voucher ${updatedVoucher.voucher_no} updated successfully.`
      });
    } catch (err: any) {
      console.error('Failed to update check voucher:', err);
      setCvActionFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to update check voucher.'
      });
    } finally {
      setIsSavingCvEdit(false);
    }
  };

  const handleSyncCvRevolvingFund = async () => {
    if (!selectedCvForModal?.id) return;
    try {
      setIsSyncingCvRf(true);
      const res = await api.post(`/accounts/check-vouchers/${selectedCvForModal.id}/sync-revolving-fund`);
      if (res.data?.success && res.data?.data) {
        const updatedCv = res.data.data;
        setSelectedCvForModal(updatedCv);
        setCheckVouchers((prev: any[]) =>
          prev.map(v => (v.id === updatedCv.id ? { ...v, ...updatedCv } : v))
        );
        if (printingCvBreakdown && printingCvBreakdown.id === updatedCv.id) {
          setPrintingCvBreakdown((prev: any) => ({ ...prev, ...updatedCv }));
        }
        setCvActionFeedback({
          type: 'success',
          message: res.data.message || `Amounts synchronized from ${res.data.lf?.lf_no || 'liquidation form'} successfully!`
        });
      }
    } catch (err: any) {
      console.error('Failed to sync check voucher with revolving fund:', err);
      setCvActionFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to synchronize amounts from Revolving Fund.'
      });
    } finally {
      setIsSyncingCvRf(false);
    }
  };

  const handleAutoFillEditCvFromRf = async () => {
    if (!editCvFormData.id) return;
    try {
      setIsSyncingCvRf(true);
      const res = await api.post(`/accounts/check-vouchers/${editCvFormData.id}/sync-revolving-fund`);
      if (res.data?.success && res.data?.data) {
        const updatedCv = res.data.data;
        const { rows } = getBalancedCvRows(updatedCv);
        setEditCvFormData((prev: any) => ({
          ...prev,
          amount: updatedCv.amount,
          rows: rows.map(r => ({
            description: r.description,
            debit: r.debit !== null ? String(r.debit) : '',
            credit: r.credit !== null ? String(r.credit) : ''
          }))
        }));
        setSelectedCvForModal(updatedCv);
        setCheckVouchers((prev: any[]) =>
          prev.map(v => (v.id === updatedCv.id ? { ...v, ...updatedCv } : v))
        );
        setCvActionFeedback({
          type: 'success',
          message: res.data.message || 'Check Voucher rows auto-populated from linked Liquidation Form!'
        });
      }
    } catch (err: any) {
      console.error('Failed to auto-fill edit rows from RF:', err);
      setCvActionFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to auto-fill amounts from Revolving Fund.'
      });
    } finally {
      setIsSyncingCvRf(false);
    }
  };

  useEffect(() => {
    if (cvActionFeedback) {
      const timer = setTimeout(() => setCvActionFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [cvActionFeedback]);

  const toggleSelectCv = (id: string) => {
    setSelectedCvIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCvs = () => {
    if (selectedCvIds.length === checkVouchers.length && checkVouchers.length > 0) {
      setSelectedCvIds([]);
    } else {
      setSelectedCvIds(checkVouchers.map((cv: any) => cv.id));
    }
  };

  const handleDeleteSingleVoucher = async () => {
    if (!cvToDelete) return;
    try {
      setIsDeletingCv(true);
      await api.delete(`/accounts/check-vouchers/${cvToDelete.id}`);
      setCvActionFeedback({
        type: 'success',
        message: `Check voucher ${cvToDelete.voucher_no || ''} deleted successfully.`
      });
      setSelectedCvIds(prev => prev.filter(id => id !== cvToDelete.id));
      setCvToDelete(null);
      await loadCheckVouchers();
    } catch (err: any) {
      console.error('Failed to delete voucher:', err);
      setCvActionFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to remove check voucher.'
      });
    } finally {
      setIsDeletingCv(false);
    }
  };

  const handleBulkDeleteVouchers = async () => {
    if (selectedCvIds.length === 0) return;
    try {
      setIsDeletingCv(true);
      const res = await api.post('/accounts/check-vouchers/bulk-delete', { ids: selectedCvIds });
      setCvActionFeedback({
        type: 'success',
        message: res.data?.message || `${selectedCvIds.length} check vouchers deleted successfully.`
      });
      setSelectedCvIds([]);
      setIsBulkDeleteModalOpen(false);
      await loadCheckVouchers();
    } catch (err: any) {
      console.error('Failed to bulk delete vouchers:', err);
      setCvActionFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to remove selected check vouchers.'
      });
    } finally {
      setIsDeletingCv(false);
    }
  };

  const handleClearAllVouchers = async () => {
    if (clearAllConfirmText.trim().toUpperCase() !== 'DELETE') return;
    try {
      setIsDeletingCv(true);
      const res = await api.post('/accounts/check-vouchers/bulk-delete', { all: true });
      setCvActionFeedback({
        type: 'success',
        message: res.data?.message || 'All check vouchers removed successfully.'
      });
      setSelectedCvIds([]);
      setIsClearAllCvModalOpen(false);
      setClearAllConfirmText('');
      await loadCheckVouchers();
    } catch (err: any) {
      console.error('Failed to clear all vouchers:', err);
      setCvActionFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to clear check vouchers.'
      });
    } finally {
      setIsDeletingCv(false);
    }
  };

  // Check Voucher Creation State (standardized format matching loan check voucher)
  const [isPurchaseCVOpen, setIsPurchaseCVOpen] = useState(false);
  const [isSavingNewCv, setIsSavingNewCv] = useState(false);
  const [cvVoucherNo, setCvVoucherNo] = useState('');
  const [cvDate, setCvDate] = useState('');
  const [cvReleasedDate, setCvReleasedDate] = useState('');
  const [cvPayee, setCvPayee] = useState('');
  const [cvBankName, setCvBankName] = useState('BDO');
  const [cvCheckNo, setCvCheckNo] = useState('');
  const [cvRemarks, setCvRemarks] = useState('');
  const [cvPreparedBy, setCvPreparedBy] = useState('LAMOSTE, CHINNETTE A.');
  const [cvCheckedBy, setCvCheckedBy] = useState('MARILOU LARIOSA');
  const [cvApprovedBy, setCvApprovedBy] = useState('MICHELLE M. PABLE');
  const [cvTransactionRows, setCvTransactionRows] = useState<{ description: string; debit: string; credit: string }[]>([
    { description: '', debit: '', credit: '' }
  ]);

  const getNextVoucherNo = () => {
    const currentYearPrefix = String(new Date().getFullYear()).slice(-2); // '26'
    let highestNum = 266; // Specified: latest one was 26-266, so starting baseline is 266

    (checkVouchers || []).forEach((v: any) => {
      if (!v || !v.voucher_no) return;
      const str = String(v.voucher_no).trim();
      const match = str.match(/(?:^|[^\d])(\d{2})-(\d+)(?:$|[^\d])/);
      if (match && match[1] === currentYearPrefix) {
        const parsed = parseInt(match[2], 10);
        if (!isNaN(parsed) && parsed > highestNum) {
          highestNum = parsed;
        }
      }
    });

    return `${currentYearPrefix}-${highestNum + 1}`;
  };

  const openPurchaseCVModal = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    setCvDate(todayIso);
    setCvReleasedDate(todayIso);
    setCvVoucherNo(getNextVoucherNo());
    setCvPayee('');
    setCvBankName('BDO');
    setCvCheckNo('');
    setCvRemarks('');
    setCvPreparedBy('LAMOSTE, CHINNETTE A.');
    setCvCheckedBy('MARILOU LARIOSA');
    setCvApprovedBy('MICHELLE M. PABLE');
    setCvTransactionRows([
      { description: '', debit: '', credit: '' }
    ]);
    setIsPurchaseCVOpen(true);
  };

  const handleNewCvRowChange = (idx: number, field: 'description' | 'debit' | 'credit', val: string) => {
    setCvTransactionRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: val } : row));
  };

  const addNewCvRow = () => {
    setCvTransactionRows(prev => [...prev, { description: '', debit: '', credit: '' }]);
  };

  const removeNewCvRow = (idx: number) => {
    if (cvTransactionRows.length > 1) {
      setCvTransactionRows(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const calculateNewCvTotals = () => {
    let debitTotal = 0;
    let creditTotal = 0;
    let cibAmount = 0;
    for (const r of cvTransactionRows) {
      const d = parseFloat(r.debit) || 0;
      const c = parseFloat(r.credit) || 0;
      debitTotal += d;
      creditTotal += c;

      const desc = (r.description || '').trim();
      if (/cib\b|cash\s*in\s*bank/i.test(desc)) {
        cibAmount = c || d || 0;
      }
    }

    let disbursed = 0;
    if (cibAmount > 0) {
      disbursed = cibAmount;
    } else {
      const netDiff = Math.max(0, debitTotal - creditTotal);
      disbursed = netDiff > 0 ? netDiff : (debitTotal || creditTotal || 0);
    }

    return { debitTotal, creditTotal, disbursed };
  };

  const handleSaveAndSubmitNewCv = async (shouldPrint: boolean = false) => {
    if (!cvPayee.trim() || !cvVoucherNo.trim()) {
      setCvActionFeedback({
        type: 'error',
        message: 'Please provide both a Voucher Number and Payee name.'
      });
      return;
    }

    try {
      setIsSavingNewCv(true);
      const { disbursed } = calculateNewCvTotals();

      const detailsToSave: { book_of_account: string; amount: number }[] = [];
      for (const r of cvTransactionRows) {
        const desc = (r.description || '').trim();
        const d = parseFloat(r.debit) || 0;
        const c = parseFloat(r.credit) || 0;
        if (d > 0) {
          detailsToSave.push({
            book_of_account: desc || 'Disbursed Item',
            amount: d
          });
        }
        if (c > 0) {
          detailsToSave.push({
            book_of_account: desc || 'Deduction',
            amount: -c
          });
        }
        if (d === 0 && c === 0 && desc) {
          detailsToSave.push({
            book_of_account: desc,
            amount: 0
          });
        }
      }

      const payload = {
        voucher_no: cvVoucherNo.trim(),
        voucher_date: cvDate || null,
        check_no: cvCheckNo.trim(),
        payee: cvPayee.trim(),
        bank: cvBankName.trim(),
        particulars: cvRemarks.trim(),
        date_released: cvReleasedDate || null,
        amount: disbursed,
        details: detailsToSave,
        signatories: {
          prepared_by: cvPreparedBy.trim() || 'LAMOSTE, CHINNETTE A.',
          checked_by: cvCheckedBy.trim() || 'MARILOU LARIOSA',
          approved_by: cvApprovedBy.trim() || 'MICHELLE M. PABLE'
        }
      };

      const res = await api.post('/accounts/check-vouchers', payload);
      const createdVoucher = res.data.data;

      // Prepend to checkVouchers list
      setCheckVouchers(prev => [createdVoucher, ...prev]);

      setIsPurchaseCVOpen(false);
      setCvActionFeedback({
        type: 'success',
        message: `Check voucher ${createdVoucher.voucher_no} created successfully.`
      });

      if (shouldPrint) {
        handlePrintCvBreakdown(createdVoucher);
      }
    } catch (err: any) {
      console.error('Failed to create check voucher:', err);
      setCvActionFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to create check voucher.'
      });
    } finally {
      setIsSavingNewCv(false);
    }
  };
  const [loans, setLoans] = useState<Loan[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [members, setMembers] = useState<any[]>([]); // for apply dropdown
  const [loansPage, setLoansPage] = useState(1);
  const [loansSearch, setLoansSearch] = useState('');
  const [loansSortBy, setLoansSortBy] = useState('date_desc');
  const [isLoansExpandedAll, setIsLoansExpandedAll] = useState(false);

  // Truncated pagination helper matching Members Directory
  const getPaginationNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  // Loading & error state
  const [loansLoading, setLoansLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Renovation KPI summary states
  const [memberMetrics, setMemberMetrics] = useState<any>(null);
  const [adminMetrics, setAdminMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Active Loan Details Drawer/Collapsible state
  const [expandedLoanId, setExpandedLoanId] = useState<number | string | null>(null);
  const [loanDetails, setLoanDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [isUnverifiedModalOpen, setIsUnverifiedModalOpen] = useState(false);

  // Form Fields: Product
  const [prodName, setProdName] = useState('');
  const [prodInterestRate, setProdInterestRate] = useState('');
  const [prodTermMonths, setProdTermMonths] = useState('');
  const [prodAmortType, setProdAmortType] = useState<'flat_rate' | 'diminishing_balance'>('diminishing_balance');
  const [prodMinAmount, setProdMinAmount] = useState('');
  const [prodMaxAmount, setProdMaxAmount] = useState('');
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Form Fields: Apply
  const [applyMemberId, setApplyMemberId] = useState('');
  const [applyProductId, setApplyProductId] = useState('');
  const [applyAmount, setApplyAmount] = useState(0); // Note: change applyAmount to number
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Apply Wizard states matching main dashboard flow
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedLoanCategory, setSelectedLoanCategory] = useState<string>(LOAN_CATEGORIES.REGULAR);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [coMakerName, setCoMakerName] = useState('');
  const [coMakerPhone, setCoMakerPhone] = useState('');
  const [applyTermMonths, setApplyTermMonths] = useState<number>(1);
  const [applyLafNo, setApplyLafNo] = useState('');
  const [loadingLafNo, setLoadingLafNo] = useState(false);

  // Physical Form Fields (Admin Desk Entry matching Paper Slip)
  const [applyDate, setApplyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [applyBorrowerName, setApplyBorrowerName] = useState<string>('');
  const [applyAge, setApplyAge] = useState<number | string>('');
  const [applyInvestmentAmount, setApplyInvestmentAmount] = useState<number | string>('');
  const [applyServiceFee, setApplyServiceFee] = useState<string>('100');
  const [applyInsurance, setApplyInsurance] = useState<string>('11');
  const [applyFixedDeposit, setApplyFixedDeposit] = useState<string>('0');
  const [applyPrevBalance, setApplyPrevBalance] = useState<string>('0');
  const [selectedPrevLoanId, setSelectedPrevLoanId] = useState<string>('');
  const [memberActiveLoans, setMemberActiveLoans] = useState<any[]>([]);
  const [loadingMemberActiveLoans, setLoadingMemberActiveLoans] = useState<boolean>(false);
  const [applyOtherCharges, setApplyOtherCharges] = useState<string>('0');
  const [applyScheduleAmounts, setApplyScheduleAmounts] = useState<Record<number, string>>({});

  // Animated Member Selector Dropdown State
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [memberDropdownSearch, setMemberDropdownSearch] = useState('');
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const memberSearchInputRef = useRef<HTMLInputElement>(null);

  // Close member dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    };
    if (isMemberDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMemberDropdownOpen]);

  // Animated Previous Loan Selector Dropdown State
  const [isPrevLoanDropdownOpen, setIsPrevLoanDropdownOpen] = useState(false);
  const prevLoanDropdownRef = useRef<HTMLDivElement>(null);

  // Close prev loan dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (prevLoanDropdownRef.current && !prevLoanDropdownRef.current.contains(event.target as Node)) {
        setIsPrevLoanDropdownOpen(false);
      }
    };
    if (isPrevLoanDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPrevLoanDropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isMemberDropdownOpen) {
      const timer = setTimeout(() => {
        memberSearchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isMemberDropdownOpen]);

  const filteredBorrowerMembers = useMemo(() => {
    if (!memberDropdownSearch.trim()) return members;
    const q = memberDropdownSearch.toLowerCase();
    return members.filter((m: any) => {
      const fullName = `${m.first_name || ''} ${m.middle_name || ''} ${m.last_name || ''}`.toLowerCase();
      const reversedName = `${m.last_name || ''}, ${m.first_name || ''}`.toLowerCase();
      const memberNo = String(m.member_no || '').toLowerCase();
      return fullName.includes(q) || reversedName.includes(q) || memberNo.includes(q);
    });
  }, [members, memberDropdownSearch]);

  const selectedMemberObj = useMemo(() => {
    return members.find((m: any) => String(m.id) === String(applyMemberId));
  }, [members, applyMemberId]);

  const handleSelectMember = (newMemId: string) => {
    setApplyMemberId(newMemId);
    setIsMemberDropdownOpen(false);
    setMemberDropdownSearch('');
    if (newMemId) {
      const catProducts = products.filter(p => getProductCategory(p.name) === selectedLoanCategory);
      if (catProducts.length > 0) {
        setSelectedProduct(catProducts[0]);
        const defAmt = isAdminOrManager ? (parseFloat(catProducts[0].min_amount) || 5000) : parseFloat(catProducts[0].min_amount);
        setApplyAmount(defAmt);
        const defTerm = catProducts[0].term_months >= 2 && selectedLoanCategory === LOAN_CATEGORIES.STL ? 2 : catProducts[0].term_months;
        setApplyTermMonths(defTerm);
      }
      const mem = members.find((m: any) => String(m.id) === String(newMemId));
      if (mem) {
        setApplyBorrowerName([mem.first_name, mem.middle_name, mem.last_name].filter(Boolean).join(' '));
      }
    } else {
      setSelectedProduct(null);
      setApplyBorrowerName('');
    }
  };

  // LAF Assign/Edit Modal (Admin & Staff only)
  const [lafModalLoan, setLafModalLoan] = useState<any | null>(null);
  const [lafInputVal, setLafInputVal] = useState('');
  const [lafModalSubmitting, setLafModalSubmitting] = useState(false);
  const [lafModalError, setLafModalError] = useState<string | null>(null);

  // State of Calamity toggle
  const [isCalamityDeclared, setIsCalamityDeclared] = useState(false);

  // Selected Member CBU & details
  const [selectedMemberSummary, setSelectedMemberSummary] = useState<any>(null);
  const [loadingMemberSummary, setLoadingMemberSummary] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // Form Fields: Repayment
  const [repayLoanId, setRepayLoanId] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState('Cash');
  const [repayRefNo, setRepayRefNo] = useState('');
  const [repaySubmitting, setRepaySubmitting] = useState(false);
  const [repayError, setRepayError] = useState<string | null>(null);

  // Loan Approval & Deductions Modal State
  const [approvalModalLoan, setApprovalModalLoan] = useState<any>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  const openApprovalModal = (loanItem: any, details?: any) => {
    const combined = { ...loanItem, ...(details || {}) };
    setApprovalModalLoan(combined);
    setIsApprovalModalOpen(true);
  };

  const handleApprovalSuccess = async (updatedLoan: any, message: string) => {
    showDialog('Success', message, 'success');
    fetchLoans();
    if (expandedLoanId && updatedLoan?.id && String(expandedLoanId) === String(updatedLoan.id)) {
      try {
        const response = await api.get(`/loans/${updatedLoan.id}`);
        setLoanDetails(response.data.data);
      } catch (err) {
        console.warn('Failed to refresh expanded loan details:', err);
      }
    }
  };

  // Print & Document Generation States
  const [printLoan, setPrintLoan] = useState<any>(null);
  const [printPayment, setPrintPayment] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'voucher' | 'schedule' | 'receipt' | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [downloadingPaymentId, setDownloadingPaymentId] = useState<string | number | null>(null);

  // Voucher Template State Fields (Matching UC-METC Standard Format)
  const [voucherNo, setVoucherNo] = useState('');
  const [voucherDate, setVoucherDate] = useState('');
  const [printedDate, setPrintedDate] = useState('');
  const [bankName, setBankName] = useState('BDO');
  const [checkNo, setCheckNo] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [voucherDescription, setVoucherDescription] = useState('');
  const [preparedBy, setPreparedBy] = useState('LAMOSTE');
  const [checkedBy, setCheckedBy] = useState('MARILOU LARIOSA');
  const [approvedBy, setApprovedBy] = useState('MICHELLE');
  const [releasedBy, setReleasedBy] = useState('Michelle Pable');
  const [voucherId, setVoucherId] = useState<string | null>(null);
  const [isSavingVoucherModal, setIsSavingVoucherModal] = useState(false);
  const [voucherModalFeedback, setVoucherModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Voucher Breakdown Rows
  const [voucherRows, setVoucherRows] = useState<{ description: string; debit: string; credit: string }[]>([]);

  const voucherDebitTotal = useMemo(() => {
    return voucherRows.reduce((sum, r) => sum + (parseFloat(r.debit) || 0), 0);
  }, [voucherRows]);

  const voucherCreditTotal = useMemo(() => {
    return voucherRows.reduce((sum, r) => sum + (parseFloat(r.credit) || 0), 0);
  }, [voucherRows]);

  const voucherDisbursedAmount = useMemo(() => {
    let cibAmount = 0;
    for (const r of voucherRows) {
      const desc = (r.description || '').trim();
      if (/\bcib|cash\s*in\s*bank|\b(metrobank|mbtc|bdo)\b/i.test(desc)) {
        const c = parseFloat(r.credit) || 0;
        const d = parseFloat(r.debit) || 0;
        cibAmount += (c > 0 ? c : d);
      }
    }

    if (cibAmount > 0) {
      return cibAmount;
    }

    const netDiff = Math.max(0, voucherDebitTotal - voucherCreditTotal);
    return netDiff > 0 ? netDiff : (voucherDebitTotal || voucherCreditTotal || 0);
  }, [voucherRows, voucherDebitTotal, voucherCreditTotal]);

  const voucherNetTakeHome = voucherDisbursedAmount;

  const cleanCvNumber = (vNo: string) => {
    if (!vNo) return '';
    return vNo.replace(/^CV\s*#?/i, '').trim();
  };

  const formatVoucherDateDisplay = (dateVal: string | Date | undefined) => {
    if (!dateVal) return '—';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  const formatVoucherDateTime = (dateVal: string | Date | undefined) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const openVoucherModal = (loanObj: any) => {
    setPrintLoan(loanObj);
    setPrintMode('voucher');
    setIsPrintModalOpen(true);
    setVoucherId(null);
    setVoucherModalFeedback(null);

    const yearSuffix = new Date().getFullYear().toString().slice(-2);
    const cleanLaf = (loanObj.laf_no || '').replace(/^LAF\s*#?/i, '').trim();
    const defaultVoucherNo = cleanLaf || `${yearSuffix}-${String(loanObj.id).slice(0, 3)}`;
    setVoucherNo(defaultVoucherNo);

    setCheckNo(loanObj.check_no || '');
    setBankName(loanObj.bank || 'BDO');

    const fullName = [loanObj.first_name, loanObj.middle_name, loanObj.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() || `${loanObj.last_name || ''}, ${loanObj.first_name || ''}`.trim();
    setPayeeName(fullName.toUpperCase());

    const rawDate = loanObj.disbursement_date || loanObj.disbursed_at || loanObj.created_at || new Date();
    const d = new Date(rawDate);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localDateStr = !isNaN(d.getTime())
      ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      : `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;
    setVoucherDate(localDateStr);

    const defaultDesc = loanObj.purpose
      ? `Balance Settlement / Loan Proceeds - ${loanObj.product_name} (${loanObj.purpose})`
      : `Loan Proceeds for ${loanObj.product_name || 'Loan'} (LAF #${loanObj.laf_no || String(loanObj.id).slice(0, 8)})`;
    setVoucherDescription(defaultDesc);
    const initialBookOfAccount = 'Accounts Payable';
    setPreparedBy('LAMOSTE');
    setCheckedBy('MARILOU LARIOSA');
    setApprovedBy('MICHELLE');

    let deds: any[] = [];
    if (loanObj.deductions_breakdown) {
      try {
        deds = typeof loanObj.deductions_breakdown === 'string'
          ? JSON.parse(loanObj.deductions_breakdown)
          : loanObj.deductions_breakdown;
      } catch {}
    }
    const initialRows: { description: string; debit: string; credit: string }[] = [
      {
        description: initialBookOfAccount,
        debit: loanObj.principal_amount ? String(parseFloat(loanObj.principal_amount)) : '',
        credit: ''
      }
    ];
    if (Array.isArray(deds)) {
      for (const d of deds) {
        if (d && d.name) {
          initialRows.push({
            description: `Less: ${d.name}`,
            debit: '',
            credit: d.amount ? String(parseFloat(d.amount)) : ''
          });
        }
      }
    }
    setVoucherRows(initialRows);
    setPrintedDate(new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }));

    // Asynchronously check if a saved check voucher exists for this loan
    (async () => {
      try {
        const searchTarget = cleanLaf || defaultVoucherNo;
        const res = await api.get('/accounts/check-vouchers', {
          params: { search: searchTarget, limit: 10 }
        });
        const match = res.data?.data?.find((v: any) =>
          v.loan_id === loanObj.id ||
          (v.voucher_no && (v.voucher_no === defaultVoucherNo || v.voucher_no === cleanLaf || v.voucher_no === `CV-${cleanLaf}`))
        );
        if (match) {
          setVoucherId(match.id);
          if (match.voucher_no) setVoucherNo(match.voucher_no);
          if (match.check_no) setCheckNo(match.check_no);
          if (match.bank) setBankName(match.bank);
          if (match.payee) setPayeeName(match.payee);
          if (match.particulars) setVoucherDescription(match.particulars);
          if (match.voucher_date) {
            const vd = new Date(match.voucher_date);
            if (!isNaN(vd.getTime())) {
              setVoucherDate(`${vd.getFullYear()}-${pad(vd.getMonth() + 1)}-${pad(vd.getDate())}`);
            }
          }
          if (match.signatories) {
            const sigs = typeof match.signatories === 'string' ? JSON.parse(match.signatories) : match.signatories;
            if (sigs.prepared_by) setPreparedBy(sigs.prepared_by);
            if (sigs.checked_by) setCheckedBy(sigs.checked_by);
            if (sigs.approved_by) setApprovedBy(sigs.approved_by);
          }
          if (match.details) {
            const dets = typeof match.details === 'string' ? JSON.parse(match.details) : match.details;
            if (Array.isArray(dets) && dets.length > 0) {
              const loadedRows = dets.map((item: any) => {
                const amt = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || 0);
                return {
                  description: item.book_of_account || item.description || '',
                  debit: amt > 0 ? String(amt) : '',
                  credit: amt < 0 ? String(Math.abs(amt)) : ''
                };
              });
              setVoucherRows(loadedRows);
            }
          }
        }
      } catch (err) {
        console.warn('Could not query check voucher for loan:', err);
      }
    })();
  };

  const handleSaveVoucherModal = async () => {
    if (!voucherNo.trim()) {
      setVoucherModalFeedback({ type: 'error', message: 'Voucher number is required.' });
      return;
    }
    if (!payeeName.trim()) {
      setVoucherModalFeedback({ type: 'error', message: 'Payee name is required.' });
      return;
    }

    try {
      setIsSavingVoucherModal(true);
      setVoucherModalFeedback(null);

      const detailsToSave: { book_of_account: string; amount: number }[] = [];
      for (const r of voucherRows) {
        const desc = (r.description || '').trim();
        const d = parseFloat(r.debit) || 0;
        const c = parseFloat(r.credit) || 0;
        if (d > 0) {
          detailsToSave.push({ book_of_account: desc || 'Disbursed Item', amount: d });
        } else if (c > 0) {
          detailsToSave.push({ book_of_account: desc || 'Deduction', amount: -c });
        } else if (desc) {
          detailsToSave.push({ book_of_account: desc, amount: 0 });
        }
      }

      const prodName = printLoan?.product_name || 'Loan';
      const isStl = /stl|short\s*term/i.test(prodName);
      const folderName = isStl ? 'Short Term Loans' : 'Regular Loans';

      const payload: any = {
        loan_id: printLoan?.id || null,
        voucher_no: voucherNo.trim(),
        voucher_date: voucherDate || null,
        check_no: checkNo.trim(),
        payee: payeeName.trim(),
        bank: bankName.trim() || 'BDO',
        particulars: voucherDescription.trim(),
        amount: voucherDisbursedAmount,
        folder_name: folderName,
        status: printLoan?.status === 'disbursed' || printLoan?.status === 'fully_paid' ? 'filed' : 'for release',
        details: detailsToSave,
        signatories: {
          prepared_by: preparedBy.trim() || 'LAMOSTE',
          checked_by: checkedBy.trim() || 'MARILOU LARIOSA',
          approved_by: approvedBy.trim() || 'MICHELLE'
        }
      };

      let savedVoucher: any = null;
      if (voucherId) {
        const res = await api.put(`/accounts/check-vouchers/${voucherId}`, payload);
        savedVoucher = res.data?.data;
      } else {
        const res = await api.post('/accounts/check-vouchers', payload);
        savedVoucher = res.data?.data;
        if (savedVoucher?.id) {
          setVoucherId(savedVoucher.id);
        }
      }

      if (savedVoucher) {
        setCheckVouchers((prev: any[]) => {
          const idx = prev.findIndex(v => v.id === savedVoucher.id);
          if (idx >= 0) {
            return prev.map(v => v.id === savedVoucher.id ? { ...v, ...savedVoucher } : v);
          }
          return [savedVoucher, ...prev];
        });
      }

      if (printLoan?.id) {
        setLoans(prev => prev.map(l => l.id === printLoan.id ? { ...l, check_no: checkNo.trim(), bank: bankName.trim() } : l));
      }

      setVoucherModalFeedback({
        type: 'success',
        message: 'Check voucher saved successfully!'
      });
    } catch (err: any) {
      console.error('Failed to save check voucher:', err);
      setVoucherModalFeedback({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to save check voucher.'
      });
    } finally {
      setIsSavingVoucherModal(false);
    }
  };

  const openPrintAmortizationModal = (loanObj: any) => {
    setPrintLoan(loanObj);
    setPrintMode('schedule');
    setIsPrintModalOpen(true);
    setCoMakerName(loanObj.co_maker_name || '');
  };

  const openReceiptModal = (loanObj: any, paymentObj: any) => {
    setPrintLoan(loanObj);
    setPrintPayment(paymentObj);
    setPrintMode('receipt');
    setIsPrintModalOpen(true);
  };

  const closePrintModal = () => {
    setIsPrintModalOpen(false);
    setPrintMode(null);
    setPrintLoan(null);
    setPrintPayment(null);
  };

  // Excel Export Functions
  const exportLoansToExcel = () => {
    if (!loans || loans.length === 0) return;

    const excelData = loans.map((l) => ({
      'Loan ID': `#${l.id}`,
      'Borrower Name': `${l.last_name || ''}, ${l.first_name || ''}`.trim() || 'N/A',
      'Loan Product': l.product_name || 'N/A',
      'Principal Amount (PHP)': parseFloat(l.principal_amount),
      'Interest Rate (%)': `${parseFloat(l.interest_rate)}%`,
      'Term (Months)': l.term_months,
      'Amortization Type': l.amortization_type?.replace('_', ' ').toUpperCase(),
      'Status': l.status.toUpperCase(),
      'Application Date': new Date(l.created_at).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Credit Portfolio');
    XLSX.writeFile(workbook, `Loan_Records_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPaymentsToExcel = () => {
    if (!loanPayments || loanPayments.length === 0) return;

    const excelData = loanPayments.map((p) => ({
      'Receipt / OR No': `OR-${new Date(p.payment_date).getFullYear()}-${String(p.id).padStart(6, '0')}`,
      'Payment Date': p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'N/A',
      'Borrower Name': `${p.last_name || ''}, ${p.first_name || ''} ${p.middle_name ? p.middle_name[0] + '.' : ''}`.trim() || 'N/A',
      'Member No': p.member_no || 'N/A',
      'Loan ID': `#${p.loan_id}`,
      'LAF No': p.laf_no || '—',
      'Loan Product': p.product_name || 'N/A',
      'Payment Method': p.payment_method || 'Cash',
      'Reference / Check No': p.reference_no || '—',
      'Total Amount Paid (PHP)': parseFloat(p.amount || 0),
      'Principal Allocated (PHP)': parseFloat(p.principal_paid || 0),
      'Interest Allocated (PHP)': parseFloat(p.interest_paid || 0),
      'Recorded At': p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Loan Payments');
    XLSX.writeFile(workbook, `UC_COOP_Loan_Payments_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleViewPaymentReceipt = (payment: any) => {
    const loanObj = {
      id: payment.loan_id,
      first_name: payment.first_name,
      last_name: payment.last_name,
      member_no: payment.member_no,
      member_id: payment.member_id,
      product_name: payment.product_name,
      laf_no: payment.laf_no,
      principal_amount: payment.principal_amount,
      remaining_balance: payment.remaining_balance,
    };
    const paymentObj = {
      id: payment.id,
      loan_id: payment.loan_id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      reference_no: payment.reference_no,
      principal_paid: payment.principal_paid,
      interest_paid: payment.interest_paid,
    };
    openReceiptModal(loanObj, paymentObj);
  };

  const handleDownloadPaymentReceipt = (payment: any) => {
    const loanObj = {
      id: payment.loan_id,
      first_name: payment.first_name,
      last_name: payment.last_name,
      member_no: payment.member_no,
      member_id: payment.member_id,
      product_name: payment.product_name,
      laf_no: payment.laf_no,
      principal_amount: payment.principal_amount,
      remaining_balance: payment.remaining_balance,
    };
    const paymentObj = {
      id: payment.id,
      loan_id: payment.loan_id,
      amount: payment.amount,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      reference_no: payment.reference_no,
      principal_paid: payment.principal_paid,
      interest_paid: payment.interest_paid,
    };
    downloadReceipt(loanObj, paymentObj);
  };

  const exportSingleLoanScheduleToExcel = (loanDetailsObj: any) => {
    if (!loanDetailsObj || !loanDetailsObj.schedule) return;

    const summaryData = [
      { Parameter: 'Loan ID', Value: `#${loanDetailsObj.id}` },
      { Parameter: 'Borrower', Value: `${loanDetailsObj.last_name || ''}, ${loanDetailsObj.first_name || ''}`.trim() },
      { Parameter: 'Product', Value: loanDetailsObj.product_name || 'N/A' },
      { Parameter: 'Principal Amount', Value: `PHP ${parseFloat(loanDetailsObj.principal_amount).toLocaleString()}` },
      { Parameter: 'Interest Rate', Value: `${parseFloat(loanDetailsObj.interest_rate)}% p.a.` },
      { Parameter: 'Term', Value: `${loanDetailsObj.term_months} Months` },
      { Parameter: 'Amortization Type', Value: loanDetailsObj.amortization_type?.replace('_', ' ').toUpperCase() },
      { Parameter: 'Status', Value: loanDetailsObj.status?.toUpperCase() },
      { Parameter: 'Disbursement Date', Value: loanDetailsObj.disbursement_date ? new Date(loanDetailsObj.disbursement_date).toLocaleDateString() : 'N/A' },
      {}
    ];

    let runningBal = parseFloat(loanDetailsObj.principal_amount);
    const scheduleRows = loanDetailsObj.schedule.map((sch: any) => {
      const schTotalDue = parseFloat(sch.principal_due) + parseFloat(sch.interest_due);
      if (loanDetailsObj.amortization_type === 'diminishing_balance') {
        runningBal = Math.round((runningBal - schTotalDue) * 100) / 100;
      } else {
        runningBal = Math.round((runningBal - parseFloat(sch.principal_due)) * 100) / 100;
      }
      return {
        'Month': sch.installment_number,
        'Principal Due (PHP)': parseFloat(sch.principal_due),
        'Interest Due (PHP)': parseFloat(sch.interest_due),
        'Total Due (PHP)': schTotalDue,
        'Remaining Balance (PHP)': Math.max(0, runningBal),
        'Principal Paid (PHP)': parseFloat(sch.principal_paid),
        'Interest Paid (PHP)': parseFloat(sch.interest_paid),
        'Due Date': new Date(sch.due_date).toLocaleDateString(),
        'Status': sch.status?.toUpperCase()
      };
    });

    const workbook = XLSX.utils.book_new();

    // Schedule sheet
    const scheduleWs = XLSX.utils.json_to_sheet(scheduleRows);
    XLSX.utils.book_append_sheet(workbook, scheduleWs, 'Amortization Schedule');

    // Summary sheet
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Loan Summary');

    XLSX.writeFile(workbook, `Loan_#${loanDetailsObj.id}_Amortization_Schedule.xlsx`);
  };

  const handlePrint = () => {
    setPrintedDate(new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }));
    // Dismiss the modal immediately so the user knows it's currently printing
    setIsPrintModalOpen(false);
    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup);
      setPrintMode(null);
      setPrintLoan(null);
      setPrintPayment(null);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const downloadReceipt = async (loanObj: any, paymentObj: any) => {
    try {
      setDownloadingPaymentId(paymentObj.id);
      const html2canvas = (await import('html2canvas-pro')).default;
      const receiptNo = `OR-${new Date(paymentObj.payment_date).getFullYear()}-${String(paymentObj.id).padStart(6, '0')}`;

      // If print state is not already set to this receipt, temporarily set it to render print-section in DOM
      const alreadyConfigured = printLoan?.id === loanObj.id && printPayment?.id === paymentObj.id && printMode === 'receipt';

      if (!alreadyConfigured) {
        setPrintLoan(loanObj);
        setPrintPayment(paymentObj);
        setPrintMode('receipt');
        // Wait for React state updates to reflect in the DOM
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const printEl = document.getElementById('print-section');
      if (!printEl) {
        console.error('Print element not found in DOM');
        if (!alreadyConfigured) {
          setPrintLoan(null);
          setPrintPayment(null);
          setPrintMode(null);
        }
        return;
      }

      // Clone the print element so we can modify it for off-screen rendering
      const clone = printEl.cloneNode(true) as HTMLElement;

      // Remove the printing classes that make it hidden on screen
      clone.classList.remove('hidden', 'print:block');

      // Apply off-screen layout styling with standard sizing and background color
      clone.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        z-index: -9999;
        pointer-events: none;
        width: 800px;
        box-sizing: border-box !important;
        padding: 32px;
        background: #ffffff;
        color: #000000;
        display: block !important;
        visibility: visible !important;
      `;

      document.body.appendChild(clone);

      try {
        const canvas = await html2canvas(clone, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          width: clone.offsetWidth,
          height: clone.offsetHeight,
          windowWidth: clone.offsetWidth,
          windowHeight: clone.offsetHeight,
          scrollX: 0,
          scrollY: 0
        });

        const link = document.createElement('a');
        link.download = `Receipt_${receiptNo}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } finally {
        if (document.body.contains(clone)) {
          document.body.removeChild(clone);
        }
      }
    } catch (err) {
      console.error('Failed to generate image from print element:', err);
    } finally {
      setDownloadingPaymentId(null);
      // Revert temporary state changes if they were not already configured by user interaction
      if (!isPrintModalOpen) {
        setPrintLoan(null);
        setPrintPayment(null);
        setPrintMode(null);
      }
    }
  };

  // Unified Dialogue & Confirm System
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    type: 'success' | 'error' | 'confirm' | 'danger';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    confirmText: 'OK',
    cancelText: '',
    type: 'success'
  });

  const showDialog = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'confirm' | 'danger' = 'success',
    onConfirm?: () => void,
    confirmText = 'OK',
    cancelText = ''
  ) => {
    setDialogConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: onConfirm || (() => { }),
      confirmText,
      cancelText
    });
  };

  // Filters — pre-populated from URL query if present
  const [statusFilter, setStatusFilter] = useState(statusParam || '');

  useEffect(() => {
    if (statusParam !== null && statusParam !== undefined) {
      setStatusFilter(statusParam);
    }
  }, [statusParam]);

  const fetchLoans = useCallback(async () => {
    try {
      setLoansLoading(true);
      setError(null);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/loans', { params });
      setLoans(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching loans:', err);
      setError(err.response?.data?.message || 'Failed to retrieve active credit ledger.');
    } finally {
      setLoansLoading(false);
    }
  }, [statusFilter]);

  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const response = await api.get('/loans/products');
      setProducts(response.data.data || []);
    } catch (err) {
      console.error('Error fetching loan products:', err);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const handleToggleProductStatus = async (productId: number | string, currentStatus: boolean) => {
    try {
      await api.patch(`/loans/products/${productId}/status`, { is_active: !currentStatus });
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update product status');
    }
  };

  // Pre-load members list for dropdown autocomplete
  const fetchMembersList = async () => {
    try {
      const response = await api.get('/members');
      setMembers(response.data.data || []);
    } catch (err) {
      console.error('Error pre-loading members:', err);
    }
  };

  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      if (isAdminOrManager) {
        const response = await api.get('/loans/metrics/summary');
        setAdminMetrics(response.data.data || null);
      } else {
        const memberId = user?.profile?.id;
        if (memberId) {
          const response = await api.get(`/members/${memberId}/dashboard-summary`);
          setMemberMetrics(response.data.data || null);
        }
      }
    } catch (err) {
      console.error('Error fetching metrics summary:', err);
    } finally {
      setMetricsLoading(false);
    }
  }, [isAdminOrManager, user]);

  const fetchCalamityStatus = useCallback(async () => {
    try {
      const response = await api.get('/loans/calamity-status');
      setIsCalamityDeclared(response.data.is_calamity_declared || false);
    } catch (err) {
      console.error('Error fetching calamity status:', err);
    }
  }, []);

  const handleToggleCalamityStatus = async (newStatus: boolean) => {
    try {
      await api.patch('/loans/calamity-status', { is_calamity_declared: newStatus });
      setIsCalamityDeclared(newStatus);
      showDialog(
        newStatus ? 'State of Calamity Declared' : 'State of Calamity Deactivated',
        newStatus
          ? 'Calamity loan product is now automatically active and visible to all members.'
          : 'Calamity loan product is now hidden from member applications.',
        'success'
      );
    } catch (err: any) {
      showDialog('Update Failed', err.response?.data?.message || 'Failed to update calamity status.', 'error');
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchProducts();
    fetchMetrics();
    fetchCalamityStatus();
    if (isAdminOrManager) {
      fetchMembersList();
    }
  }, [fetchLoans, fetchProducts, fetchMetrics, fetchCalamityStatus, isAdminOrManager]);

  // Load selected member's CBU / financial summary reactively to enforce progressive limit & co-maker triggers
  useEffect(() => {
    const fetchSelectedMemberSummary = async () => {
      if (!applyMemberId) {
        setSelectedMemberSummary(null);
        setApplyBorrowerName('');
        setApplyAge('');
        setApplyInvestmentAmount('');
        return;
      }

      // Auto-populate borrower name and age from member list
      const mem = members.find((m: any) => String(m.id) === String(applyMemberId));
      if (mem) {
        const computedName = [mem.first_name, mem.middle_name, mem.last_name].filter(Boolean).join(' ');
        if (computedName) setApplyBorrowerName(computedName);
        if (mem?.age) {
          setApplyAge(mem.age);
        } else if (mem?.date_of_birth) {
          const birth = new Date(mem.date_of_birth);
          const diffYears = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          if (diffYears > 0) setApplyAge(diffYears);
        }
      }

      try {
        setLoadingMemberSummary(true);
        const res = await api.get(`/members/${applyMemberId}/dashboard-summary`);
        setSelectedMemberSummary(res.data.data);
        if (res.data?.data?.full_name) {
          setApplyBorrowerName(res.data.data.full_name);
        } else if (res.data?.data?.first_name || res.data?.data?.last_name) {
          setApplyBorrowerName(`${res.data.data.first_name || ''} ${res.data.data.last_name || ''}`.trim());
        }
        if (res.data?.data?.balances?.share_capital !== undefined) {
          setApplyInvestmentAmount(res.data.data.balances.share_capital);
        }
      } catch (err) {
        console.error('Error fetching selected member summary:', err);
      } finally {
        setLoadingMemberSummary(false);
      }
    };
    fetchSelectedMemberSummary();
  }, [applyMemberId, members]);

  // Fetch active loans for the selected member to populate previous loan deduction dropdown
  useEffect(() => {
    const fetchMemberActiveLoans = async () => {
      if (!applyMemberId) {
        setMemberActiveLoans([]);
        setSelectedPrevLoanId('');
        setApplyPrevBalance('0');
        setApplyOtherCharges('0');
        return;
      }
      try {
        setLoadingMemberActiveLoans(true);
        const loansRes = await api.get('/loans', { params: { member_id: applyMemberId } });
        const allLoans = loansRes.data?.data || [];
        const activeLoans = allLoans.filter((l: any) => {
          const isFinished = ['fully_paid', 'rejected', 'cancelled'].includes(l.status);
          const rem = parseFloat(l.remaining_balance);
          return !isFinished && (isNaN(rem) || rem > 0);
        });
        setMemberActiveLoans(activeLoans);

        // Auto-select latest active loan if available
        if (activeLoans.length > 0) {
          const firstLoan = activeLoans[0];
          setSelectedPrevLoanId(String(firstLoan.id));
          const balance = parseFloat(firstLoan.remaining_balance ?? firstLoan.principal_amount ?? 0);
          setApplyPrevBalance(String(!isNaN(balance) ? balance : 0));

          const fines = parseFloat(firstLoan.total_fines || 0);
          const interest = parseFloat(firstLoan.remaining_interest || 0);
          if (fines > 0) {
            setApplyOtherCharges(String(fines));
          } else if (interest > 0) {
            setApplyOtherCharges(String(interest));
          } else {
            setApplyOtherCharges('0');
          }
        } else {
          setSelectedPrevLoanId('');
          setApplyPrevBalance('0');
          setApplyOtherCharges('0');
        }
      } catch (err) {
        console.error('Error fetching member loans for deductions:', err);
        setMemberActiveLoans([]);
      } finally {
        setLoadingMemberActiveLoans(false);
      }
    };
    fetchMemberActiveLoans();
  }, [applyMemberId]);

  // Handler when selecting previous active loan from dropdown
  const handlePrevLoanSelect = (loanId: string) => {
    setSelectedPrevLoanId(loanId);
    if (!loanId) {
      setApplyPrevBalance('0');
      setApplyOtherCharges('0');
      return;
    }
    const foundLoan = memberActiveLoans.find((l: any) => String(l.id) === String(loanId));
    if (foundLoan) {
      const balance = parseFloat(foundLoan.remaining_balance ?? foundLoan.principal_amount ?? 0);
      setApplyPrevBalance(String(!isNaN(balance) ? balance : 0));

      const fines = parseFloat(foundLoan.total_fines || 0);
      const interest = parseFloat(foundLoan.remaining_interest || 0);
      if (fines > 0) {
        setApplyOtherCharges(String(fines));
      } else if (interest > 0) {
        setApplyOtherCharges(String(interest));
      } else {
        setApplyOtherCharges('0');
      }
    }
  };

  const selectedPrevLoanObj = useMemo(() => {
    if (!selectedPrevLoanId) return null;
    return memberActiveLoans.find((l: any) => String(l.id) === String(selectedPrevLoanId)) || null;
  }, [memberActiveLoans, selectedPrevLoanId]);

  const prevLoanFines = useMemo(() => {
    return parseFloat(selectedPrevLoanObj?.total_fines || 0);
  }, [selectedPrevLoanObj]);

  const prevLoanInterest = useMemo(() => {
    return parseFloat(selectedPrevLoanObj?.remaining_interest || 0);
  }, [selectedPrevLoanObj]);

  // Compute total charges (deductions)
  const totalDeductionsCalc = useMemo(() => {
    return (
      (parseFloat(String(applyServiceFee)) || 0) +
      (parseFloat(String(applyInsurance)) || 0) +
      (parseFloat(String(applyFixedDeposit)) || 0) +
      (parseFloat(String(applyPrevBalance)) || 0) +
      (parseFloat(String(applyOtherCharges)) || 0)
    );
  }, [applyServiceFee, applyInsurance, applyFixedDeposit, applyPrevBalance, applyOtherCharges]);

  // Compute net proceeds
  const netProceedsCalc = useMemo(() => {
    return Math.max(0, (applyAmount || 0) - totalDeductionsCalc);
  }, [applyAmount, totalDeductionsCalc]);

  // Compute required monthly payment schedule preview
  const monthlySchedulePreview = useMemo(() => {
    const principal = applyAmount || 0;
    const terms = applyTermMonths || 1;
    if (principal <= 0 || terms <= 0) return [];
    const rate = terms === 36 ? 0.15 : 0.02; // 2% monthly or 15% for 36mo
    const monthlyPrincipal = principal / terms;
    const schedule: { monthLabel: string; payment: number }[] = [];
    
    let remaining = principal;
    for (let i = 1; i <= terms; i++) {
      let interest = 0;
      if (selectedProduct?.amortization_type === 'flat_rate') {
        interest = principal * rate;
      } else {
        interest = remaining * rate;
      }
      const due = monthlyPrincipal + interest;
      schedule.push({
        monthLabel: i === 1 ? '1st Month' : i === 2 ? '2nd Month' : i === 3 ? '3rd Month' : `Month ${i}`,
        payment: Math.round(due * 100) / 100
      });
      remaining -= monthlyPrincipal;
    }
    return schedule;
  }, [applyAmount, applyTermMonths, selectedProduct]);

  const toggleLoanExpand = async (loanId: number | string) => {
    if (expandedLoanId === loanId) {
      setExpandedLoanId(null);
      setLoanDetails(null);
      return;
    }

    setExpandedLoanId(loanId);
    setLoadingDetails(true);
    setLoanDetails(null);

    try {
      const response = await api.get(`/loans/${loanId}`);
      setLoanDetails(response.data.data);
    } catch (err) {
      console.error('Failed to load loan details:', err);
      showDialog('Load Failure', 'Failed to load amortization schedules.', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Actions
  const handleDisburseLoan = (loanId: number | string) => {
    showDialog(
      'Confirm Disbursement',
      'Verify that principal funds are ready for disbursement. Proceed?',
      'confirm',
      async () => {
        try {
          await api.post(`/loans/${loanId}/disburse`);
          showDialog('Disbursement Successful', 'Loan successfully disbursed! Amortization schedules generated.', 'success');
          fetchLoans();
          if (expandedLoanId === loanId) {
            // reload details
            const response = await api.get(`/loans/${loanId}`);
            setLoanDetails(response.data.data);
          }
        } catch (err: any) {
          showDialog('Disbursement Failed', err.response?.data?.message || 'Failed to disburse credit.', 'error');
        }
      },
      'Disburse Funds',
      'Cancel'
    );
  };

  const handleRejectLoan = (loanId: number | string) => {
    showDialog(
      'Reject Application',
      'Are you sure you want to reject this application?',
      'danger',
      async () => {
        try {
          await api.patch(`/loans/${loanId}/reject`);
          showDialog('Application Rejected', 'Application successfully rejected and removed from list.', 'success');
          setLoans((prev) => prev.filter((l) => String(l.id) !== String(loanId)));
          fetchLoans();
        } catch (err: any) {
          showDialog('Operation Failed', err.response?.data?.message || 'Failed to reject application.', 'error');
        }
      },
      'Reject Request',
      'Cancel'
    );
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodInterestRate || !prodTermMonths || !prodMaxAmount) {
      setProductError('Please fill out all required attributes.');
      return;
    }

    setProductError(null);
    setProductSubmitting(true);

    try {
      await api.post('/loans/products', {
        name: prodName,
        interest_rate: parseFloat(prodInterestRate),
        term_months: parseInt(prodTermMonths, 10),
        amortization_type: prodAmortType,
        min_amount: prodMinAmount ? parseFloat(prodMinAmount) : undefined,
        max_amount: parseFloat(prodMaxAmount)
      });

      setProdName('');
      setProdInterestRate('');
      setProdTermMonths('');
      setProdAmortType('diminishing_balance');
      setProdMinAmount('');
      setProdMaxAmount('');
      setIsProductModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setProductError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create product.');
    } finally {
      setProductSubmitting(false);
    }
  };

  const fetchNextLafNo = async () => {
    try {
      setLoadingLafNo(true);
      const res = await api.get('/loans/next-laf-no');
      if (res.data?.data?.next_laf_no) {
        setApplyLafNo(res.data.data.next_laf_no);
      }
    } catch (err) {
      console.error('Failed to fetch next LAF number:', err);
    } finally {
      setLoadingLafNo(false);
    }
  };

  const openApplyModal = () => {
    if (!isAdminOrManager && !isVerified) {
      setIsUnverifiedModalOpen(true);
      return;
    }
    setWizardStep(1);
    setSelectedProduct(null);
    setSelectedLoanCategory(LOAN_CATEGORIES.STL);
    setApplyMemberId(!isAdminOrManager && user?.profile?.id ? String(user.profile.id) : '');
    setApplyAmount(0);
    setApplyDate(new Date().toISOString().split('T')[0]);
    setApplyBorrowerName('');
    setApplyAge('');
    setApplyInvestmentAmount('');
    setApplyServiceFee('100');
    setApplyInsurance('11');
    setApplyFixedDeposit('0');
    setApplyPrevBalance('0');
    setSelectedPrevLoanId('');
    setMemberActiveLoans([]);
    setApplyOtherCharges('0');
    setApplyScheduleAmounts({});
    setCoMakerName('');
    setCoMakerPhone('');
    setApplyLafNo('');
    setSuccessData(null);
    setApplyError(null);
    setIsMemberDropdownOpen(false);
    setIsPrevLoanDropdownOpen(false);
    setMemberDropdownSearch('');
    setIsApplyModalOpen(true);
    if (isAdminOrManager) {
      fetchNextLafNo();
    }
  };

  const handleOpenLafModal = async (loan: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLafModalLoan(loan);
    setLafModalError(null);
    if (loan.laf_no) {
      setLafInputVal(loan.laf_no);
    } else {
      setLafInputVal('');
      try {
        const res = await api.get('/loans/next-laf-no');
        if (res.data?.data?.next_laf_no) {
          setLafInputVal(res.data.data.next_laf_no);
        }
      } catch (err) {
        console.error('Failed to auto-suggest LAF:', err);
      }
    }
  };

  const handleSaveLafNo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lafModalLoan || !lafInputVal.trim()) {
      setLafModalError('Please enter a valid LAF No.');
      return;
    }

    try {
      setLafModalSubmitting(true);
      setLafModalError(null);
      await api.patch(`/loans/${lafModalLoan.id}/laf-no`, {
        laf_no: lafInputVal.trim()
      });
      setLafModalLoan(null);
      fetchLoans();
      if (expandedLoanId === lafModalLoan.id) {
        const response = await api.get(`/loans/${lafModalLoan.id}`);
        setLoanDetails(response.data.data);
      }
    } catch (err: any) {
      setLafModalError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update LAF No.');
    } finally {
      setLafModalSubmitting(false);
    }
  };

  const handleApplyLoanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!applyMemberId || !selectedProduct || !applyAmount || applyAmount <= 0) {
      setApplyError('Please fill in all requested fields (Member, Product, and Loan Amount).');
      return;
    }

    // Enforce co-maker details check if principal exceeds member's CBU ONLY for member self-application
    const shareCapital = parseFloat(String(applyInvestmentAmount)) || selectedMemberSummary?.balances?.share_capital || 0;
    const coMakerRequired = !isAdminOrManager && applyAmount > shareCapital;
    if (coMakerRequired && !coMakerName.trim()) {
      setApplyError('A Co-Maker is required since the loan amount exceeds 100% of Share Capital.');
      return;
    }

    setApplyError(null);
    setApplySubmitting(true);

    try {
      const selectedPrevLoan = memberActiveLoans.find((l: any) => String(l.id) === String(selectedPrevLoanId));
      const prevLoanLabel = selectedPrevLoan 
        ? `Previous Loan Balance (${selectedPrevLoan.laf_no ? `LAF: ${selectedPrevLoan.laf_no}` : selectedPrevLoan.product_name || 'Active Loan'})` 
        : 'Previous Loan Balance';

      let othersLabel = 'Others';
      if (selectedPrevLoan) {
        const finesVal = parseFloat(selectedPrevLoan.total_fines || 0);
        const intVal = parseFloat(selectedPrevLoan.remaining_interest || 0);
        const curOther = parseFloat(String(applyOtherCharges)) || 0;
        if (curOther > 0) {
          if (finesVal > 0 && Math.abs(curOther - finesVal) < 0.01) {
            othersLabel = 'Others (Fines)';
          } else if (intVal > 0 && Math.abs(curOther - intVal) < 0.01) {
            othersLabel = 'Others (Interest)';
          } else if (finesVal > 0 && intVal > 0 && Math.abs(curOther - (finesVal + intVal)) < 0.01) {
            othersLabel = 'Others (Fines + Interest)';
          }
        }
      }

      const deductionsPayload = [
        { name: 'Service Fee', amount: parseFloat(String(applyServiceFee)) || 0 },
        { name: 'Insurance', amount: parseFloat(String(applyInsurance)) || 0 },
        { name: 'Fixed Deposit', amount: parseFloat(String(applyFixedDeposit)) || 0 },
        { name: prevLoanLabel, amount: parseFloat(String(applyPrevBalance)) || 0 },
        { name: othersLabel, amount: parseFloat(String(applyOtherCharges)) || 0 }
      ].filter(d => d.amount > 0);

      const customSchedulePayload = monthlySchedulePreview.map((item, idx) => {
        const customVal = applyScheduleAmounts[idx];
        const paymentAmount = customVal !== undefined && !isNaN(parseFloat(customVal))
          ? parseFloat(customVal)
          : item.payment;
        return {
          month_index: idx + 1,
          month_label: item.monthLabel,
          payment: paymentAmount
        };
      });

      const response = await api.post('/loans', {
        member_id: applyMemberId,
        loan_product_id: selectedProduct.id,
        principal_amount: applyAmount,
        term_months: applyTermMonths,
        co_maker_name: isAdminOrManager ? null : (coMakerName.trim() || null),
        co_maker_phone: isAdminOrManager ? null : (coMakerPhone.trim() || null),
        laf_no: isAdminOrManager ? (applyLafNo.trim() || undefined) : undefined,
        application_date: applyDate || undefined,
        deductions: deductionsPayload,
        custom_schedule: customSchedulePayload
      });

      setSuccessData(response.data.data);
      setWizardStep(3);

      // Reset state fields
      setApplyAmount(0);
      setCoMakerName('');
      setCoMakerPhone('');
      setApplyLafNo('');
      setApplyScheduleAmounts({});
      fetchLoans();
      fetchMetrics();
    } catch (err: any) {
      setApplyError(err.response?.data?.error?.message || err.response?.data?.message || 'Application creation failed.');
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleRepaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayLoanId || !repayAmount || !repayMethod) {
      setRepayError('Loan ID, Amount, and Payment Method are required.');
      return;
    }

    setRepayError(null);
    setRepaySubmitting(true);

    try {
      await api.post('/loans/repayments', {
        loan_id: repayLoanId,
        amount: parseFloat(repayAmount),
        payment_method: repayMethod,
        reference_no: repayRefNo || undefined
      });

      setRepayLoanId('');
      setRepayAmount('');
      setRepayMethod('Cash');
      setRepayRefNo('');
      setIsRepaymentModalOpen(false);
      fetchLoans();
      loadLoanPayments();
    } catch (err: any) {
      setRepayError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to record repayment.');
    } finally {
      setRepaySubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(val || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disbursed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
            <CheckCircle className="w-3.5 h-3.5" />
            Active / Disbursed
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500">
            <Clock className="w-3.5 h-3.5" />
            Pending Approval
          </span>
        );
      case 'fully_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/15 text-primary">
            <CheckCircle className="w-3.5 h-3.5" />
            Fully Paid
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral/15 text-neutral-600 dark:text-neutral-400">
            <X className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-tertiary/10 text-tertiary">
            <AlertTriangle className="w-3.5 h-3.5" />
            Defaulted
          </span>
        );
    }
  };

  return (
    <>
      <div className="space-y-6 animate-micro-elevate">
        <div>
          <BackButton href="/dashboard">Back to System Dashboard</BackButton>
        </div>

        {/* Header and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface dark:text-white flex items-center gap-3">Credit Portfolio Ledger</h1>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
              Manage credit products, loan instantiation, approvals, and repayment bookings.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportLoansToExcel}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-full hover:shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Ledger (.xlsx)
            </button>
            <button
              onClick={openApplyModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Apply for Loan
              {!isVerified && !isAdminOrManager && <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
            </button>
          </div>
        </div>

        {!isAdminOrManager && !isVerified && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-2xl text-xs font-medium space-y-1">
            <p className="font-bold flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Profile Verification & Approval Required
            </p>
            <p>
              You cannot apply for a loan until your profile verification has been completed and approved by an administrator. Please visit your <a href="/dashboard/profile" className="underline font-bold hover:text-primary dark:hover:text-secondary">Profile Page</a> to submit your profile verification details.
            </p>
          </div>
        )}

        {/* Dynamic Dashboard KPI Cards */}
        {metricsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 items-stretch">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 items-stretch">
            {isAdminOrManager ? (
              <>
                {/* Card 1: Active Portfolio */}
                <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow h-full min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 block tracking-wider font-label truncate">Active Portfolio</span>
                    <span className="text-xl font-headline font-extrabold tabular-nums tracking-tight text-on-surface dark:text-white block mt-0.5 truncate">
                      {formatCurrency(adminMetrics?.ledger_aggregates?.current_outstanding_balance || 0)}
                    </span>
                    <span className="text-[9px] font-bold text-neutral-500 block mt-0.5 truncate">
                      Deployed: {formatCurrency(adminMetrics?.ledger_aggregates?.total_capital_deployed || 0)} ({adminMetrics?.portfolio_health?.active_loans || 0} loans)
                    </span>
                  </div>
                </div>

                {/* Card 2: Interest Collected */}
                <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow h-full min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 dark:bg-secondary/15 text-primary dark:text-secondary flex items-center justify-center flex-shrink-0">
                    <Percent className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 block tracking-wider font-label truncate">Interest Revenue</span>
                    <span className="text-xl font-headline font-extrabold tabular-nums tracking-tight text-on-surface dark:text-white block mt-0.5 truncate">
                      {formatCurrency(adminMetrics?.ledger_aggregates?.total_interest_earned || 0)}
                    </span>
                    <span className="text-[9px] font-bold text-green-600 dark:text-green-400 block mt-0.5 truncate">
                      Cumulative interest earned p.a.
                    </span>
                  </div>
                </div>

                {/* Card 3: Pending Underwriting */}
                <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow h-full min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 block tracking-wider font-label truncate">Underwriting Queue</span>
                    <span className="text-xl font-headline font-extrabold tabular-nums tracking-tight text-on-surface dark:text-white block mt-0.5 truncate">
                      {adminMetrics?.portfolio_health?.pending_applications || 0} Applications
                    </span>
                    <span className="text-[9px] font-bold text-tertiary block mt-0.5 truncate">
                      Awaiting manager review/disbursement
                    </span>
                  </div>
                </div>

                {/* Card 4: Default Risks */}
                <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow h-full min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 block tracking-wider font-label truncate">Delinquency Risk</span>
                    <span className="text-xl font-headline font-extrabold tabular-nums tracking-tight text-on-surface dark:text-white block mt-0.5 truncate"
                      title={
                        `Accounts Defaulted: ${adminMetrics?.portfolio_health?.defaulted_loans || 0}`
                      }>
                      {adminMetrics?.portfolio_health?.defaulted_loans || 0} Accounts Defaulted
                    </span>
                    <span className="text-[9px] font-bold text-red-500 block mt-0.5 truncate">
                      Rate: {(((adminMetrics?.portfolio_health?.defaulted_loans || 0) / ((adminMetrics?.portfolio_health?.active_loans || 0) + (adminMetrics?.portfolio_health?.defaulted_loans || 0) || 1)) * 100).toFixed(2)}% of portfolio
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Member Card 1: Active Loan Count */}
                <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow h-full min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 block tracking-wider font-label truncate">My Credit Status</span>
                    <span className="text-xl font-headline font-extrabold tabular-nums tracking-tight text-on-surface dark:text-white block mt-0.5 truncate">
                      {memberMetrics?.loans?.active_count || 0} Active Loans
                    </span>
                    <span className="text-[9px] font-bold text-neutral-500 block mt-0.5 truncate">
                      Approved cooperative contracts list
                    </span>
                  </div>
                </div>

                {/* Member Card 2: Outstanding Balance */}
                <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow h-full min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 dark:bg-secondary/15 text-primary dark:text-secondary flex items-center justify-center flex-shrink-0">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 block tracking-wider font-label truncate">Outstanding Balance</span>
                    <span className="text-xl font-headline font-extrabold tabular-nums tracking-tight text-on-surface dark:text-white block mt-0.5 truncate">
                      {formatCurrency(memberMetrics?.loans?.outstanding_balance || 0)}
                    </span>
                    <span className="text-[9px] font-bold text-neutral-500 block mt-0.5 truncate">
                      Initial Deployed: {formatCurrency(memberMetrics?.loans?.original_principal || 0)}
                    </span>
                  </div>
                </div>

                {/* Member Card 3: Policy Tier */}
                {(() => {
                  const historicalCount = memberMetrics?.loans?.historical_count || 0;
                  const tierName = historicalCount === 0 ? '1st Loan (New)' : historicalCount === 1 ? '2nd Loan (Track Record)' : '3rd Loan+ (Max Tier)';
                  const desc = historicalCount === 0 ? 'Fully collateralized' : historicalCount === 1 ? 'Co-maker for excess' : '3.0x Share Capital cap';
                  return (
                    <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow h-full min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 block tracking-wider font-label truncate">Borrower Policy Tier</span>
                        <span className="text-xl font-headline font-extrabold tabular-nums tracking-tight text-on-surface dark:text-white block mt-0.5 truncate">
                          {tierName}
                        </span>
                        <span className="text-[9px] font-bold text-neutral-500 block mt-0.5 truncate">
                          {desc} ({historicalCount} past approvals)
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Member Card 4: Borrowing Limit */}
                {(() => {
                  const shareCapital = memberMetrics?.balances?.share_capital || 0;
                  const historicalCount = memberMetrics?.loans?.historical_count || 0;
                  const outstandingBalance = memberMetrics?.loans?.outstanding_balance || 0;
                  const limit = historicalCount === 0 ? 0.8 * shareCapital : historicalCount === 1 ? 2.0 * shareCapital : 3.0 * shareCapital;
                  const remaining = outstandingBalance > 0 ? 0 : limit;
                  return (
                    <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow h-full min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 block tracking-wider font-label truncate">Max Credit Line Limit</span>
                        <span className="text-xl font-headline font-extrabold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400 block mt-0.5 truncate">
                          {formatCurrency(remaining)}
                        </span>
                        <span className="text-[9px] font-bold text-neutral-500 block mt-0.5 truncate">
                          Policy Multiplier Limit: {formatCurrency(limit)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-outline-variant/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'loans'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
              }`}
          >
            {isAdminOrManager ? 'Loan Monitoring' : 'Loan Application'}
          </button>
          {isAdminOrManager ? (
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${activeTab === 'payments'
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
                }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Loan Payments</span>
              {loanPayments.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary font-extrabold">
                  {loanPayments.length}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${activeTab === 'payments'
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
                }`}
            >
              <History className="w-4 h-4" />
              <span>Transaction History</span>
              {loanPayments.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary font-extrabold">
                  {loanPayments.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'products'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
              }`}
          >
            Loan Products Registry
          </button>
        </div>

        {/* TABS CONTAINER */}
        {activeTab === 'loans' ? (
          <div className="space-y-6">
            {/* Filter & Sort Desk */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm">
              <div className="w-full lg:w-auto flex-1 max-w-md">
                <SearchInput
                  placeholder="Search by LAF No., borrower, product, contract ID..."
                  defaultValue={loansSearch}
                  onSearch={(val) => {
                    setLoansSearch((prev) => {
                      if (prev !== val) {
                        setLoansPage(1);
                      }
                      return val;
                    });
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold font-label text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Sort By:</label>
                  <select
                    value={loansSortBy}
                    onChange={(e) => {
                      setLoansSortBy(e.target.value);
                      setLoansPage(1);
                    }}
                    className="px-3 py-2 text-xs border border-outline-variant rounded-xl bg-white dark:bg-surface-container-low focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white cursor-pointer font-semibold"
                  >
                    <option value="laf_desc">LAF No: Highest First (Newest)</option>
                    <option value="laf_asc">LAF No: Lowest First (26-01, 26-02...)</option>
                    <option value="date_desc">Date Granted: Newest First</option>
                    <option value="date_asc">Date Granted: Oldest First</option>
                    <option value="amount_desc">Principal (Highest → Lowest)</option>
                    <option value="amount_asc">Principal (Lowest → Highest)</option>
                    <option value="name_asc">Borrower (A → Z)</option>
                    <option value="name_desc">Borrower (Z → A)</option>
                    <option value="status">Status</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold font-label text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setLoansPage(1);
                    }}
                    className="px-3 py-2 text-xs border border-outline-variant rounded-xl bg-white dark:bg-surface-container-low focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white cursor-pointer"
                  >
                    <option value="">All Loans</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="disbursed">Active / Disbursed</option>
                    <option value="fully_paid">Fully Paid</option>
                    <option value="defaulted">Defaulted</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loans List */}
            {loansLoading ? (
              <SkeletonTable rows={5} cols={isAdminOrManager ? 8 : 7} />
            ) : error ? (
              <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl">
                <p className="text-sm font-bold">{error}</p>
              </div>
            ) : loans.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
                <AlertTriangle className="w-8 h-8 text-neutral-600 dark:text-neutral-400/45 mx-auto mb-2" />
                <h3 className="font-headline font-bold text-on-surface dark:text-white">No Loans Registered</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">No loans found matching the status filter.</p>
              </div>
            ) : (
              (() => {
                const filteredLoans = loans
                  .filter((loan) => {
                    // Exclude rejected loans from table list
                    if (loan.status === 'rejected') return false;
                    const q = loansSearch.toLowerCase().trim();
                    if (q) {
                      const bName = `${loan.last_name || ''} ${loan.first_name || ''}`.toLowerCase();
                      const pName = (loan.product_name || '').toLowerCase();
                      const idStr = String(loan.id || '').toLowerCase();
                      const lafStr = (loan.laf_no || '').toLowerCase();
                      const statusStr = (loan.status || '').toLowerCase();
                      const matches = bName.includes(q) || pName.includes(q) || idStr.includes(q) || lafStr.includes(q) || statusStr.includes(q);
                      if (!matches) return false;
                    }
                    return true;
                  })
                  .sort((a, b) => {
                    if (loansSortBy === 'laf_asc') {
                      const parseLaf = (laf: string | null | undefined) => {
                        if (!laf) return { year: 999999, num: 999999, raw: '' };
                        const m = String(laf).match(/^(\d+)-(\d+)$/);
                        if (m) return { year: parseInt(m[1], 10), num: parseInt(m[2], 10), raw: laf };
                        const n = parseInt(String(laf).replace(/\D/g, ''), 10);
                        return { year: 9999, num: isNaN(n) ? 999999 : n, raw: laf };
                      };
                      const lafA = parseLaf(a.laf_no);
                      const lafB = parseLaf(b.laf_no);
                      if (lafA.year !== lafB.year) return lafA.year - lafB.year;
                      if (lafA.num !== lafB.num) return lafA.num - lafB.num;
                      return lafA.raw.localeCompare(lafB.raw);
                    }
                    if (loansSortBy === 'laf_desc') {
                      const parseLaf = (laf: string | null | undefined) => {
                        if (!laf) return { year: -1, num: -1, raw: '' };
                        const m = String(laf).match(/^(\d+)-(\d+)$/);
                        if (m) return { year: parseInt(m[1], 10), num: parseInt(m[2], 10), raw: laf };
                        const n = parseInt(String(laf).replace(/\D/g, ''), 10);
                        return { year: 0, num: isNaN(n) ? -1 : n, raw: laf };
                      };
                      const lafA = parseLaf(a.laf_no);
                      const lafB = parseLaf(b.laf_no);
                      if (lafA.year !== lafB.year) return lafB.year - lafA.year;
                      if (lafA.num !== lafB.num) return lafB.num - lafA.num;
                      return lafB.raw.localeCompare(lafA.raw);
                    }
                    if (loansSortBy === 'date_desc') {
                      const tA = new Date(a.disbursed_at || a.created_at || 0).getTime();
                      const tB = new Date(b.disbursed_at || b.created_at || 0).getTime();
                      return tB - tA;
                    }
                    if (loansSortBy === 'date_asc') {
                      const tA = new Date(a.disbursed_at || a.created_at || 0).getTime();
                      const tB = new Date(b.disbursed_at || b.created_at || 0).getTime();
                      return tA - tB;
                    }
                    if (loansSortBy === 'amount_desc') {
                      return parseFloat(b.principal_amount || '0') - parseFloat(a.principal_amount || '0');
                    }
                    if (loansSortBy === 'amount_asc') {
                      return parseFloat(a.principal_amount || '0') - parseFloat(b.principal_amount || '0');
                    }
                    if (loansSortBy === 'name_asc') {
                      const nameA = `${a.last_name || ''}, ${a.first_name || ''}`.toLowerCase();
                      const nameB = `${b.last_name || ''}, ${b.first_name || ''}`.toLowerCase();
                      return nameA.localeCompare(nameB);
                    }
                    if (loansSortBy === 'name_desc') {
                      const nameA = `${a.last_name || ''}, ${a.first_name || ''}`.toLowerCase();
                      const nameB = `${b.last_name || ''}, ${b.first_name || ''}`.toLowerCase();
                      return nameB.localeCompare(nameA);
                    }
                    if (loansSortBy === 'status') {
                      return (a.status || '').localeCompare(b.status || '');
                    }
                    return 0;
                  });

                const totalLoansCount = filteredLoans.length;
                const LOANS_PER_PAGE = 8;
                const totalLoansPages = Math.ceil(totalLoansCount / LOANS_PER_PAGE) || 1;
                const loansStartIdx = (loansPage - 1) * LOANS_PER_PAGE;
                const visibleLoans = isLoansExpandedAll
                  ? filteredLoans
                  : filteredLoans.slice(loansStartIdx, loansStartIdx + LOANS_PER_PAGE);

                return (
                  <div className="space-y-3">
                    {/* Table Header Bar with Count & Expand All Toggle */}
                    <div className="flex items-center justify-between px-1 flex-wrap gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface dark:text-white">
                          {isAdminOrManager ? 'Loan Monitoring Table' : 'Loan Application Table'}
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold border border-outline-variant/30">
                          {isLoansExpandedAll ? `Showing all ${totalLoansCount} contracts (Full Table)` : `Showing ${visibleLoans.length} of ${totalLoansCount} contracts`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsLoansExpandedAll((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-2xl border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                          isLoansExpandedAll
                            ? 'bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary border-primary/30 hover:bg-primary/20'
                            : 'bg-white dark:bg-surface-container-low text-neutral-700 dark:text-neutral-300 border-outline-variant hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                        title={isLoansExpandedAll ? 'Restore pagination (8 per page)' : 'Expand table to display all contracts on page'}
                      >
                        {isLoansExpandedAll ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                            <span>Minimize Table</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                            <span>Expand All List</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm p-1.5">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-neutral-50/80 dark:bg-neutral-800/60 border-b border-outline-variant/50 text-[11px] font-headline font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                              <th 
                                className="px-6 py-4 cursor-pointer select-none group hover:text-primary dark:hover:text-secondary transition-colors"
                                onClick={() => {
                                  setLoansSortBy(prev => prev === 'laf_asc' ? 'laf_desc' : 'laf_asc');
                                  setLoansPage(1);
                                }}
                                title="Click to sort by LAF No."
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>LAF NO.</span>
                                  {loansSortBy === 'laf_asc' ? (
                                    <ArrowUp className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                  ) : loansSortBy === 'laf_desc' ? (
                                    <ArrowDown className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                  ) : (
                                    <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                                  )}
                                </div>
                              </th>
                              {isAdminOrManager && (
                                <th 
                                  className="px-6 py-4 cursor-pointer select-none group hover:text-primary dark:hover:text-secondary transition-colors"
                                  onClick={() => {
                                    setLoansSortBy(prev => prev === 'name_asc' ? 'name_desc' : 'name_asc');
                                    setLoansPage(1);
                                  }}
                                  title="Click to sort by Borrower name"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span>Borrower Member</span>
                                    {loansSortBy === 'name_asc' ? (
                                      <ArrowUp className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                    ) : loansSortBy === 'name_desc' ? (
                                      <ArrowDown className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                    ) : (
                                      <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                                    )}
                                  </div>
                                </th>
                              )}
                              <th className="px-6 py-4">Loan Product</th>
                              <th 
                                className="px-6 py-4 cursor-pointer select-none group hover:text-primary dark:hover:text-secondary transition-colors"
                                onClick={() => {
                                  setLoansSortBy(prev => prev === 'date_desc' ? 'date_asc' : 'date_desc');
                                  setLoansPage(1);
                                }}
                                title="Click to sort by Date Granted"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>Date Granted</span>
                                  {loansSortBy === 'date_desc' ? (
                                    <ArrowDown className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                  ) : loansSortBy === 'date_asc' ? (
                                    <ArrowUp className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                  ) : (
                                    <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                                  )}
                                </div>
                              </th>
                              <th 
                                className="px-6 py-4 cursor-pointer select-none group hover:text-primary dark:hover:text-secondary transition-colors"
                                onClick={() => {
                                  setLoansSortBy(prev => prev === 'amount_desc' ? 'amount_asc' : 'amount_desc');
                                  setLoansPage(1);
                                }}
                                title="Click to sort by Principal Amount"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>Principal Amount</span>
                                  {loansSortBy === 'amount_desc' ? (
                                    <ArrowDown className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                  ) : loansSortBy === 'amount_asc' ? (
                                    <ArrowUp className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                  ) : (
                                    <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                                  )}
                                </div>
                              </th>
                              <th className="px-6 py-4">Interest (Term)</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4 text-right">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30 font-body text-xs text-on-surface dark:text-white/90">
                            {visibleLoans.length === 0 ? (
                              <tr>
                                <td colSpan={isAdminOrManager ? 8 : 7} className="px-6 py-8 text-center text-neutral-500 italic">
                                  No contracts found matching search criteria.
                                </td>
                              </tr>
                            ) : (
                              visibleLoans.map((loan) => {
                                const isExpanded = expandedLoanId === loan.id;
                                return (
                                  <React.Fragment key={loan.id}>
                                    <tr className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                                       <td className="px-6 py-4 font-mono">
                                         {loan.status === 'pending_approval' ? (
                                           <span className="text-neutral-400 dark:text-neutral-500 font-sans">—</span>
                                         ) : loan.laf_no ? (
                                           <div className="flex flex-col items-start gap-0.5">
                                             <div className="flex items-center gap-1.5">
                                               <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary border border-primary/25 shadow-2xs">
                                                 LAF #{loan.laf_no}
                                               </span>
                                               {isAdminOrManager && (
                                                 <button
                                                   type="button"
                                                   onClick={(e) => handleOpenLafModal(loan, e)}
                                                   className="p-1 text-neutral-400 hover:text-primary dark:hover:text-secondary rounded transition-colors cursor-pointer"
                                                   title="Edit LAF No."
                                                 >
                                                   <Pencil className="w-3 h-3" />
                                                 </button>
                                               )}
                                             </div>
                                             <span className="text-[10px] text-neutral-400 font-mono">#{String(loan.id).slice(0, 8)}</span>
                                           </div>
                                         ) : isAdminOrManager ? (
                                           <div className="flex flex-col items-start gap-1">
                                             <button
                                               type="button"
                                               onClick={(e) => handleOpenLafModal(loan, e)}
                                               className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
                                               title="Assign LAF No."
                                             >
                                               <Plus className="w-3 h-3" /> Assign LAF #
                                             </button>
                                             <span className="text-[10px] text-neutral-400 font-mono">#{String(loan.id).slice(0, 8)}</span>
                                           </div>
                                         ) : (
                                           <span className="text-neutral-400 dark:text-neutral-500 font-sans">—</span>
                                         )}
                                       </td>
                                       {isAdminOrManager && (
                                         <td className="px-6 py-4 font-semibold">
                                           {loan.last_name}, {loan.first_name}
                                         </td>
                                       )}
                                       <td className="px-6 py-4 font-semibold text-primary dark:text-secondary">{loan.product_name || 'Legacy Product'}</td>
                                       <td className="px-6 py-4 font-mono text-xs text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                                         {loan.status !== 'pending_approval' && loan.disbursed_at ? (
                                           new Date(loan.disbursed_at).toLocaleDateString('en-US', {
                                             month: 'short',
                                             day: 'numeric',
                                             year: 'numeric',
                                           })
                                         ) : (
                                           <span className="text-neutral-400 dark:text-neutral-500">—</span>
                                         )}
                                       </td>
                                       <td className="px-6 py-4 font-bold">{formatCurrency(parseFloat(loan.principal_amount))}</td>
                                       <td className="px-6 py-4 font-mono">
                                         <div className="flex items-center gap-1.5">
                                           <span>{parseFloat(loan.interest_rate)}% ({loan.term_months}mo)</span>
                                           {isAdminOrManager && (loan.status === 'pending_approval' || (loan.status === 'approved' && !loan.disbursed_at)) && (
                                             <button
                                               type="button"
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 openApprovalModal(loan, loanDetails);
                                               }}
                                               className="p-1 text-neutral-400 hover:text-primary dark:hover:text-secondary rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                                               title="Edit term months / loan settings"
                                             >
                                               <Pencil className="w-3 h-3" />
                                             </button>
                                           )}
                                         </div>
                                       </td>
                                       <td className="px-6 py-4">{getStatusBadge(loan.status)}</td>
                                       <td className="px-6 py-4 text-right">
                                         {loan.status === 'pending_approval' || loan.status === 'approved' ? (
                                           isAdminOrManager ? (
                                             <button
                                               onClick={() => toggleLoanExpand(loan.id)}
                                               className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary dark:border-secondary/30 dark:bg-secondary/10 dark:text-secondary hover:bg-primary/20 dark:hover:bg-secondary/20 transition-all text-[11px] font-bold cursor-pointer"
                                             >
                                               {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                               {loan.status === 'approved' ? 'Review & Disburse' : 'Review Application'}
                                             </button>
                                           ) : (
                                             <button
                                               onClick={() => toggleLoanExpand(loan.id)}
                                               className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all text-[11px] font-bold cursor-pointer"
                                             >
                                               {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                               View Details
                                             </button>
                                           )
                                         ) : (
                                           <button
                                             onClick={() => toggleLoanExpand(loan.id)}
                                             className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all text-[11px] font-bold cursor-pointer"
                                           >
                                             {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                             Amortization
                                           </button>
                                         )}
                                       </td>
                                    </tr>

                                    {/* Expanded Details Row */}
                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={isAdminOrManager ? 8 : 7} className="px-6 py-6 bg-surface dark:bg-surface-container-high/30 border-y border-outline-variant/40">
                                          {loadingDetails ? (
                                            <div className="flex items-center gap-2 py-4 justify-center">
                                              <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                                              <span className="text-neutral-600 dark:text-neutral-400 font-semibold text-xs">Loading schedules and ledger data...</span>
                                            </div>
                                          ) : !loanDetails ? (
                                            <p className="text-center text-xs text-neutral-600 dark:text-neutral-400">Failed to parse loan details.</p>
                                          ) : (
                                            <div className="space-y-6">
                                              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
                                                  <div>
                                                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Interest Amortization Type</span>
                                                    <p className="font-semibold text-on-surface dark:text-white capitalize mt-0.5">
                                                      {loanDetails.amortization_type?.replace('_', ' ')}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Registered Date</span>
                                                    <p className="font-semibold text-on-surface dark:text-white mt-0.5">
                                                      {new Date(loanDetails.created_at).toLocaleDateString()}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Disbursement Date</span>
                                                    <p className="font-semibold text-on-surface dark:text-white mt-0.5">
                                                      {loanDetails.disbursement_date
                                                        ? new Date(loanDetails.disbursement_date).toLocaleDateString()
                                                        : <span className="italic text-neutral-600 dark:text-neutral-400/50">Un-disbursed</span>}
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">
                                                      {loanDetails.status === 'pending_approval' ? 'Net Take-Home (Est.)' : 'Net Proceeds Released'}
                                                    </span>
                                                    <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                      ₱{parseFloat(loanDetails.net_proceeds || loanDetails.principal_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                    {parseFloat(loanDetails.total_deductions || 0) > 0 && (
                                                      <span className="text-[10px] text-neutral-500 block">
                                                        (Less: ₱{parseFloat(loanDetails.total_deductions).toLocaleString('en-US', { minimumFractionDigits: 2 })} deductions)
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Action Buttons: Check Voucher, Print Schedule, Excel Export, Disburse / Reject */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                  {loan.status !== 'pending_approval' && (
                                                    <>
                                                      {isAdminOrManager && (
                                                        <>
                                                        <button
                                                          type="button"
                                                          onClick={() => openVoucherModal(loanDetails)}
                                                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-outline-variant bg-white dark:bg-surface-container-low hover:bg-neutral-50 dark:hover:bg-neutral-800 text-on-surface dark:text-white font-bold rounded-full text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                                                          title="Generate and print check disbursement voucher"
                                                        >
                                                          <Printer className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                                          Check Voucher
                                                        </button>

                                                        <button
                                                          type="button"
                                                          onClick={() => router.push(`/dashboard/disbursement?tab=loan&search=${encodeURIComponent(loan.laf_no || '')}`)}
                                                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-outline-variant bg-white dark:bg-surface-container-low hover:bg-neutral-50 dark:hover:bg-neutral-800 text-on-surface dark:text-white font-bold rounded-full text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                                                          title="View or manage this loan voucher in the Disbursement module"
                                                        >
                                                          <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                          Disbursement Voucher
                                                        </button>
                                                        </>
                                                      )}

                                                      <button
                                                        type="button"
                                                        onClick={() => openPrintAmortizationModal(loanDetails)}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-outline-variant bg-white dark:bg-surface-container-low hover:bg-neutral-50 dark:hover:bg-neutral-800 text-on-surface dark:text-white font-bold rounded-full text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                                                        title="Print official loan amortization schedule"
                                                      >
                                                        <Printer className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                                        Print Schedule
                                                      </button>

                                                      <button
                                                        type="button"
                                                        onClick={() => exportSingleLoanScheduleToExcel(loanDetails)}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-outline-variant bg-white dark:bg-surface-container-low hover:bg-neutral-50 dark:hover:bg-neutral-800 text-on-surface dark:text-white font-bold rounded-full text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                                                        title="Export amortization ledger to Excel"
                                                      >
                                                        <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                        Export (Excel)
                                                      </button>
                                                    </>
                                                  )}

                                                  {isAdminOrManager && (loan.status === 'pending_approval' || (loan.status === 'approved' && !loan.disbursed_at)) && (
                                                    <>
                                                      {loan.status === 'pending_approval' && (
                                                        <button
                                                          type="button"
                                                          onClick={() => handleRejectLoan(loan.id)}
                                                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-tertiary/40 bg-tertiary/10 hover:bg-tertiary/20 text-tertiary font-bold rounded-full text-xs transition-all active:scale-95 cursor-pointer"
                                                        >
                                                          <XCircle className="w-3.5 h-3.5" />
                                                          Reject
                                                        </button>
                                                      )}
                                                      <button
                                                        type="button"
                                                        onClick={() => openApprovalModal(loan, loanDetails)}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary dark:text-secondary font-bold rounded-full text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                                                        title="Edit loan amount, term months, and configure deductions before disbursement"
                                                      >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                        Edit & Adjust Months / Terms
                                                      </button>
                                                    </>
                                                  )}
                                                </div>
                                              </div>

                                              {loan.status === 'pending_approval' && (
                                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-3 text-amber-700 dark:text-amber-300">
                                                  <Clock className="w-5 h-5 shrink-0" />
                                                  <div className="text-xs">
                                                    <span className="font-bold">Application Pending Review:</span> Amortization schedules, disbursement vouchers, and repayment ledgers will be generated once this loan has been approved and disbursed.
                                                  </div>
                                                </div>
                                              )}


                                              {/* Repayment Schedules Sub-Table */}
                                              {loanDetails.schedule && loanDetails.schedule.length > 0 && (
                                                <div className="space-y-3">
                                                  <h5 className="font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Amortization Repayment Ledger Schedule</h5>
                                                  <div className="overflow-x-auto border border-outline-variant/40 rounded-2xl">
                                                    <table className="w-full text-left text-xs border-collapse">
                                                      <thead className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/40">
                                                        <tr>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400 font-mono">#</th>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Principal Due</th>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Interest Due</th>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Total Due</th>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Loan Balance</th>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Paid Principal</th>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Paid Interest</th>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Due Date</th>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Status</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-outline-variant/35 font-mono">
                                                        {(() => {
                                                          let runningBalance = parseFloat(loanDetails.principal_amount);
                                                          return loanDetails.schedule?.map((sch: any) => {
                                                            const schTotalDue = parseFloat(sch.principal_due) + parseFloat(sch.interest_due);
                                                            if (loanDetails.amortization_type === 'diminishing_balance') {
                                                              runningBalance = Math.round((runningBalance - schTotalDue) * 100) / 100;
                                                            } else {
                                                              runningBalance = Math.round((runningBalance - parseFloat(sch.principal_due)) * 100) / 100;
                                                            }
                                                            const displayBalance = Math.max(0, runningBalance);

                                                            return (
                                                              <tr key={sch.id} className="hover:bg-neutral/5">
                                                                <td className="px-4 py-2 font-bold">{sch.installment_number}</td>
                                                                <td className="px-4 py-2">{formatCurrency(parseFloat(sch.principal_due))}</td>
                                                                <td className="px-4 py-2">{formatCurrency(parseFloat(sch.interest_due))}</td>
                                                                <td className="px-4 py-2 font-bold">{formatCurrency(parseFloat(sch.principal_due) + parseFloat(sch.interest_due))}</td>
                                                                <td className="px-4 py-2 text-tertiary font-bold">{formatCurrency(displayBalance)}</td>
                                                                <td className="px-4 py-2 text-primary">{formatCurrency(parseFloat(sch.principal_paid))}</td>
                                                                <td className="px-4 py-2 text-primary">{formatCurrency(parseFloat(sch.interest_paid))}</td>
                                                                <td className="px-4 py-2 font-sans">{new Date(sch.due_date).toLocaleDateString()}</td>
                                                                <td className="px-4 py-2 font-sans">
                                                                  {sch.status === 'paid' ? (
                                                                    <span className="text-primary font-bold">Paid</span>
                                                                  ) : sch.status === 'partially_paid' ? (
                                                                    <span className="text-amber-500 font-bold">Partial</span>
                                                                  ) : (
                                                                    <span className="text-tertiary font-bold">Unpaid</span>
                                                                  )}
                                                                </td>
                                                              </tr>
                                                            );
                                                          });
                                                        })()}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </div>
                                              )}

                                              {/* Payment Ledger Log */}
                                              {loanDetails.payments && loanDetails.payments.length > 0 && (
                                                <div className="space-y-3">
                                                  <h5 className="font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Repayment Receipts Ledger</h5>
                                                  <div className="overflow-x-auto border border-outline-variant/40 rounded-2xl">
                                                    <table className="w-full text-left text-xs border-collapse">
                                                      <thead className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/40">
                                                        <tr>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400 font-mono">Reference No</th>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Amount Paid</th>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Payment Method</th>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Booking Date</th>
                                                          <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400 text-right">Receipt</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-outline-variant/35 font-mono">
                                                        {loanDetails.payments?.map((pay: any) => (
                                                          <tr key={pay.id} className="hover:bg-neutral/5">
                                                            <td className="px-4 py-2 font-bold">{pay.reference_no || 'N/A'}</td>
                                                            <td className="px-4 py-2 text-primary font-bold">{formatCurrency(parseFloat(pay.amount))}</td>
                                                            <td className="px-4 py-2 font-sans">{pay.payment_method}</td>
                                                            <td className="px-4 py-2 font-sans">{new Date(pay.payment_date).toLocaleString()}</td>
                                                            <td className="px-4 py-2 text-right">
                                                              <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                  onClick={() => downloadReceipt(loanDetails, pay)}
                                                                  disabled={downloadingPaymentId === pay.id}
                                                                  className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-750 dark:text-emerald-300 border border-emerald-250/30 hover:bg-emerald-100 hover:border-emerald-300 rounded-lg text-[9px] font-bold tracking-wide transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50"
                                                                >
                                                                  {downloadingPaymentId === pay.id ? (
                                                                    <>
                                                                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving...
                                                                    </>
                                                                  ) : (
                                                                    <>
                                                                      <Download className="w-2.5 h-2.5" /> Download
                                                                    </>
                                                                  )}
                                                                </button>
                                                                <button
                                                                  onClick={() => openReceiptModal(loanDetails, pay)}
                                                                  className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-750 dark:text-emerald-300 border border-emerald-250/30 hover:bg-emerald-100 hover:border-emerald-300 rounded-lg text-[9px] font-bold tracking-wide transition-all active:scale-95 flex items-center gap-1"
                                                                >
                                                                  <Printer className="w-2.5 h-2.5" /> Print
                                                                </button>
                                                              </div>
                                                            </td>
                                                          </tr>
                                                        ))}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Table Footer: Pagination or Expanded Banner */}
                    {isLoansExpandedAll ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                          <span className="w-2 h-2 rounded-full bg-primary dark:bg-secondary animate-pulse" />
                          <span>Expanded Full Table: Displaying all {totalLoansCount} contracts</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsLoansExpandedAll(false)}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-outline-variant rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Restore pagination (8 contracts per page)"
                        >
                          <Minimize2 className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                          <span>Minimize Table</span>
                        </button>
                      </div>
                    ) : totalLoansPages > 1 ? (
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm">
                        <span className="font-body text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                          Displaying {loansStartIdx + 1} - {Math.min(loansStartIdx + LOANS_PER_PAGE, totalLoansCount)} of {totalLoansCount} contracts
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 justify-center">
                          <button
                            disabled={loansPage === 1}
                            onClick={() => setLoansPage(p => Math.max(1, p - 1))}
                            className="px-3.5 py-1.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-colors disabled:opacity-40 cursor-pointer text-neutral-700 dark:text-neutral-300"
                          >
                            Previous
                          </button>
                          {getPaginationNumbers(loansPage, totalLoansPages).map((p, idx) => {
                            if (p === '...') {
                              return (
                                <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-neutral-400 font-bold select-none">
                                  ...
                                </span>
                              );
                            }
                            const pageNum = Number(p);
                            return (
                              <button
                                key={`page-${pageNum}`}
                                onClick={() => setLoansPage(pageNum)}
                                className={`w-8 h-8 rounded-full text-xs font-bold border transition-all cursor-pointer ${loansPage === pageNum
                                  ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border-primary dark:border-secondary shadow-xs'
                                  : 'border-outline-variant hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400'
                                  }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            disabled={loansPage >= totalLoansPages}
                            onClick={() => setLoansPage(p => Math.min(totalLoansPages, p + 1))}
                            className="px-3.5 py-1.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-colors disabled:opacity-40 cursor-pointer text-neutral-700 dark:text-neutral-300"
                          >
                            Next
                          </button>

                          {/* Expand All Button */}
                          <button
                            type="button"
                            onClick={() => setIsLoansExpandedAll(true)}
                            className="ml-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 dark:bg-secondary/10 dark:hover:bg-secondary/20 text-primary dark:text-secondary text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Expand table to display all contracts on page"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Expand All</span>
                          </button>
                        </div>
                      </div>
                    ) : totalLoansCount > 0 ? (
                      <div className="flex items-center justify-between border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm">
                        <span className="font-body text-xs text-neutral-600 dark:text-neutral-400">
                          Displaying all {totalLoansCount} contracts
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })()
            )}
          </div>
        ) : activeTab === 'payments' ? (
          <div className="space-y-6">
            {/* Header & Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-headline font-bold text-base text-on-surface dark:text-white flex items-center gap-2">
                  {isAdminOrManager ? (
                    <>
                      <Banknote className="w-5 h-5 text-primary dark:text-secondary" /> Loan Repayments Ledger
                    </>
                  ) : (
                    <>
                      <History className="w-5 h-5 text-primary dark:text-secondary" /> Loan Payment Transaction History
                    </>
                  )}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  {isAdminOrManager
                    ? 'Complete audit log of all loan amortizations, collections, and official payment receipts.'
                    : 'Personal transaction history of all loan repayments, amortization receipts, and payments toward your loan balance.'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isAdminOrManager && (
                  <button
                    onClick={() => setIsRepaymentModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Book Repayment
                  </button>
                )}
                <button
                  onClick={exportPaymentsToExcel}
                  disabled={loanPayments.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-outline-variant/60 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800 text-on-surface dark:text-white transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Export Excel
                </button>
                <button
                  onClick={() => loadLoanPayments()}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium border border-outline-variant/60 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                  title="Refresh payments list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${paymentsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            {(() => {
              const totalCollected = loanPayments.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
              const totalPrincipal = loanPayments.reduce((acc, curr) => acc + parseFloat(curr.principal_paid || 0), 0);
              const totalInterest = loanPayments.reduce((acc, curr) => acc + parseFloat(curr.interest_paid || 0), 0);
              const transactionCount = loanPayments.length;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/65 shadow-xs">
                    <div className="flex items-center justify-between text-neutral-500 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                        {isAdminOrManager ? 'Total Collections' : 'Total Repayments'}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary flex items-center justify-center">
                        <Banknote className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="font-mono text-xl font-bold text-on-surface dark:text-white">
                      {formatCurrency(totalCollected)}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 font-medium">
                      {isAdminOrManager ? 'All recorded loan repayments' : 'Total payments on loan balance'}
                    </p>
                  </div>

                  <div className="p-4 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/65 shadow-xs">
                    <div className="flex items-center justify-between text-neutral-500 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                        {isAdminOrManager ? 'Principal Recovered' : 'Principal Paid'}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                        <CreditCard className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="font-mono text-xl font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(totalPrincipal)}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 font-medium">
                      {isAdminOrManager ? 'Credited to principal balance' : 'Credited towards principal'}
                    </p>
                  </div>

                  <div className="p-4 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/65 shadow-xs">
                    <div className="flex items-center justify-between text-neutral-500 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                        {isAdminOrManager ? 'Interest Earned' : 'Interest Paid'}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                        <Percent className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="font-mono text-xl font-bold text-blue-700 dark:text-blue-400">
                      {formatCurrency(totalInterest)}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 font-medium">Finance charges & interest paid</p>
                  </div>

                  <div className="p-4 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/65 shadow-xs">
                    <div className="flex items-center justify-between text-neutral-500 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Transactions</span>
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="font-mono text-xl font-bold text-on-surface dark:text-white">
                      {transactionCount}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1 font-medium">
                      {isAdminOrManager ? 'Successful payment entries' : 'Payment receipts recorded'}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Filter and Search Controls */}
            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={paymentsSearch}
                    onChange={(e) => setPaymentsSearch(e.target.value)}
                    placeholder={isAdminOrManager ? "Search borrower name, member ID, LAF #, receipt OR #, or reference no..." : "Search LAF #, loan product, receipt OR #, or reference no..."}
                    className="w-full pl-10 pr-4 py-2 text-xs bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/50 rounded-2xl focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-secondary text-on-surface dark:text-white"
                  />
                  {paymentsSearch && (
                    <button
                      onClick={() => setPaymentsSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/50 rounded-2xl text-xs">
                    <Filter className="w-3.5 h-3.5 text-neutral-500" />
                    <select
                      value={paymentsMethodFilter}
                      onChange={(e) => setPaymentsMethodFilter(e.target.value)}
                      className="bg-transparent border-none text-xs text-on-surface dark:text-white font-semibold focus:outline-none cursor-pointer pr-2"
                    >
                      <option value="all">All Payment Channels</option>
                      <option value="Cash">Cash</option>
                      <option value="Salary Deduction">Salary Deduction</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Check">Check</option>
                      <option value="Online">Online Payment</option>
                    </select>
                  </div>

                  {(paymentsSearch || paymentsMethodFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setPaymentsSearch('');
                        setPaymentsMethodFilter('all');
                      }}
                      className="px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/50 transition-all font-semibold cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl overflow-hidden shadow-xs">
              {paymentsLoading ? (
                <div className="p-6">
                  <SkeletonTable rows={5} cols={isAdminOrManager ? 10 : 9} />
                </div>
              ) : loanPayments.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                    <Banknote className="w-7 h-7" />
                  </div>
                  <h4 className="font-headline font-bold text-sm text-on-surface dark:text-white">No Payment Records Found</h4>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    {paymentsSearch || paymentsMethodFilter !== 'all'
                      ? 'No repayment records matched your current search filters.'
                      : isAdminOrManager
                        ? 'There are currently no recorded loan repayments in the ledger.'
                        : 'No payment records found for your active or past loans.'}
                  </p>
                  {(paymentsSearch || paymentsMethodFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setPaymentsSearch('');
                        setPaymentsMethodFilter('all');
                      }}
                      className="mt-3 px-4 py-1.5 text-xs font-bold text-primary dark:text-secondary hover:underline cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                (() => {
                  const totalPaymentPages = Math.ceil(loanPayments.length / paymentsPerPage) || 1;
                  const indexOfFirstPayment = (paymentsPage - 1) * paymentsPerPage;
                  const indexOfLastPayment = paymentsPage * paymentsPerPage;
                  const paginatedPayments = loanPayments.slice(indexOfFirstPayment, indexOfLastPayment);

                  return (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-outline-variant/50 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                              <th className="px-4 py-3.5 whitespace-nowrap">Receipt</th>
                              <th className="px-4 py-3.5 whitespace-nowrap">Payment Date</th>
                              {isAdminOrManager && <th className="px-4 py-3.5 whitespace-nowrap">Borrower</th>}
                              <th className="px-4 py-3.5 whitespace-nowrap">LAF</th>
                              <th className="px-4 py-3.5 whitespace-nowrap">Product</th>
                              <th className="px-4 py-3.5 whitespace-nowrap">Payment Method</th>
                              <th className="px-4 py-3.5 whitespace-nowrap text-right">Principal Paid</th>
                              <th className="px-4 py-3.5 whitespace-nowrap text-right">Interest Paid</th>
                              <th className="px-4 py-3.5 whitespace-nowrap text-right">Total Paid</th>
                              <th className="px-4 py-3.5 whitespace-nowrap text-right">Receipt Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30">
                            {paginatedPayments.map((p: any) => {
                              const cleanReceipt = getCleanReceiptIdentifier(p);
                              const borrowerName = `${p.last_name || ''}, ${p.first_name || ''}`.trim() || 'N/A';
                              const paymentDateFormatted = p.payment_date
                                ? new Date(p.payment_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : '—';
                              const paymentTime = p.payment_date
                                ? new Date(p.payment_date).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : '';
                              const methodInfo = formatDisplayPaymentMethod(p.payment_method, p.reference_no);

                              return (
                                <tr
                                  key={p.id}
                                  onClick={() => setSelectedPaymentForModal(p)}
                                  className="hover:bg-neutral-50/90 dark:hover:bg-neutral-900/60 transition-colors cursor-pointer group"
                                  title="Click to view payment transaction details"
                                >
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className="font-mono font-bold text-primary dark:text-secondary bg-primary/5 dark:bg-secondary/10 px-2.5 py-1 rounded-lg border border-primary/20 dark:border-secondary/20">
                                      {cleanReceipt}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="font-medium text-on-surface dark:text-white">{paymentDateFormatted}</div>
                                    {paymentTime && (
                                      <div className="text-[10px] text-neutral-500">{paymentTime}</div>
                                    )}
                                  </td>
                                  {isAdminOrManager && (
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="font-bold text-on-surface dark:text-white group-hover:text-primary dark:group-hover:text-secondary transition-colors">
                                        {borrowerName}
                                      </div>
                                      <div className="text-[10px] font-mono text-neutral-500">
                                        {p.member_no ? `ID: ${p.member_no}` : `#${p.member_id || '—'}`}
                                      </div>
                                    </td>
                                  )}
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {p.laf_no ? (
                                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                        {p.laf_no}
                                      </span>
                                    ) : (
                                      <span className="text-neutral-400 font-medium">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                      {p.product_name || 'Loan'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${methodInfo.color}`}>
                                      {methodInfo.label}
                                    </span>
                                    {p.reference_no && !['SD', 'HAND-IN', 'HAND -IN'].includes(p.reference_no.toUpperCase()) && p.reference_no !== p.payment_method && (
                                      <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                                        Ref: {p.reference_no}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                                    {formatCurrency(parseFloat(p.principal_paid || 0))}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                                    {formatCurrency(parseFloat(p.interest_paid || 0))}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-primary dark:text-secondary text-sm">
                                    {formatCurrency(parseFloat(p.amount || 0))}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleViewPaymentReceipt(p)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-primary dark:text-secondary bg-primary/5 hover:bg-primary/10 dark:bg-secondary/10 dark:hover:bg-secondary/20 border border-primary/20 dark:border-secondary/20 rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
                                        title="View and print official payment receipt"
                                      >
                                        <Receipt className="w-3.5 h-3.5" />
                                        <span>Receipt</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadPaymentReceipt(p)}
                                        className="inline-flex items-center gap-1 p-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all active:scale-95 cursor-pointer"
                                        title="Download receipt as PNG"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Footer */}
                      {totalPaymentPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-outline-variant/40 bg-white dark:bg-surface-container-low">
                          <div className="text-xs text-neutral-600 dark:text-neutral-400">
                            Displaying <strong className="text-on-surface dark:text-white">{indexOfFirstPayment + 1}</strong> to <strong className="text-on-surface dark:text-white">{Math.min(indexOfLastPayment, loanPayments.length)}</strong> of <strong className="text-on-surface dark:text-white">{loanPayments.length}</strong> payments
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-center">
                            <button
                              disabled={paymentsPage === 1}
                              onClick={() => setPaymentsPage(prev => Math.max(1, prev - 1))}
                              className="px-3 py-1.5 rounded-full border border-outline-variant/60 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                            >
                              Previous
                            </button>
                            {getPaginationNumbers(paymentsPage, totalPaymentPages).map((pItem, idx) => {
                              if (pItem === '...') {
                                return (
                                  <span key={`ell-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-neutral-400 font-bold">
                                    ...
                                  </span>
                                );
                              }
                              const pageNum = Number(pItem);
                              return (
                                <button
                                  key={`page-${pageNum}`}
                                  onClick={() => setPaymentsPage(pageNum)}
                                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                    paymentsPage === pageNum
                                      ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border border-primary dark:border-secondary shadow-xs'
                                      : 'border border-outline-variant/60 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            <button
                              disabled={paymentsPage === totalPaymentPages}
                              onClick={() => setPaymentsPage(prev => Math.min(totalPaymentPages, prev + 1))}
                              className="px-3 py-1.5 rounded-full border border-outline-variant/60 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        ) : (
          /* PRODUCTS TAB */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-on-surface dark:text-white">Active Loan Templates Catalog</h3>
              {isAdminOrManager && (
                <button
                  onClick={() => setIsProductModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  Configure New Product
                </button>
              )}
            </div>

            {isAdminOrManager && (
              <div className="mb-6 p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-2xl">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-sm text-on-surface dark:text-white">State of Calamity Status</h4>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      When declared by Admin, Calamity Loan is automatically activated and displayed to members.
                    </p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-3 cursor-pointer bg-white dark:bg-surface-container-low px-4 py-2 rounded-full border border-amber-500/30 shadow-sm hover:border-amber-500 transition-all">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">State of Calamity Declared:</span>
                  <input
                    type="checkbox"
                    checked={isCalamityDeclared}
                    onChange={(e) => handleToggleCalamityStatus(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                  />
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isCalamityDeclared ? 'bg-amber-500 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                    {isCalamityDeclared ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </label>
              </div>
            )}

            {productsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
                <AlertTriangle className="w-8 h-8 text-neutral-600 dark:text-neutral-400/45 mx-auto mb-2" />
                <h3 className="font-headline font-bold text-on-surface dark:text-white">No Products Registered</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">No credit products configured yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {products.map((prod) => (
                  <div key={prod.id} className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-headline font-bold text-base text-on-surface dark:text-white">{prod.name}</h4>
                        <p className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-0.5 capitalize">{prod.amortization_type?.replace('_', ' ')} Formula</p>
                      </div>
                      {isAdminOrManager ? (
                        <button
                          onClick={() => handleToggleProductStatus(prod.id, prod.is_active)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all active:scale-95 ${prod.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-100'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300'
                            }`}
                          title="Click to toggle product status"
                        >
                          {prod.is_active ? 'Active' : 'Inactive'}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${prod.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                          }`}>
                          {prod.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-outline-variant/40 pt-4 text-xs font-body">
                      <div>
                        <span className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-bold">Interest Rate</span>
                        <p className="font-headline text-base font-extrabold text-primary dark:text-secondary mt-0.5 flex items-center gap-0.5">
                          <Percent className="w-4 h-4" /> {parseFloat(prod.interest_rate)}% p.a.
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-bold">Term Limit</span>
                        <p className="font-headline text-base font-extrabold text-on-surface dark:text-white mt-0.5">
                          {prod.term_months} Months
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-outline-variant/40 pt-4 text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>Borrowing Range Limits:</span>
                      <p className="font-mono font-bold text-on-surface dark:text-white mt-0.5">
                        {formatCurrency(parseFloat(prod.min_amount))} - {formatCurrency(parseFloat(prod.max_amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE LOAN PRODUCT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Configure Loan Product</h2>

            {productError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{productError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProductSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Product Template Name *</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Regular Salary Loan"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Interest Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodInterestRate}
                    onChange={(e) => setProdInterestRate(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Term Duration (Months) *</label>
                  <input
                    type="number"
                    required
                    value={prodTermMonths}
                    onChange={(e) => setProdTermMonths(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Amortization Computation Method *</label>
                <select
                  value={prodAmortType}
                  onChange={(e: any) => setProdAmortType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                >
                  <option value="flat_rate">Flat Amortization (Monthly Flat Rate)</option>
                  <option value="diminishing_balance">Diminishing Balance (Reducing Capital Interest)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Minimum Amount (₱)</label>
                  <input
                    type="number"
                    value={prodMinAmount}
                    onChange={(e) => setProdMinAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Maximum Amount (₱) *</label>
                  <input
                    type="number"
                    required
                    value={prodMaxAmount}
                    onChange={(e) => setProdMaxAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={productSubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
                >
                  {productSubmitting ? 'Registering...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: APPLY FOR LOAN */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className={`bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full ${wizardStep === 3 ? 'max-w-md' : (wizardStep === 1 ? 'max-w-3xl' : 'max-w-5xl')
            } shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative animate-modal-pop`}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low dark:bg-surface-container-high/40">
              <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white capitalize">
                Apply for Loan (Admin Desk Entry)
              </h3>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              {applyError && (
                <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs font-semibold flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{applyError}</span>
                </div>
              )}

              {/* Wizard Steps indicator */}
              {wizardStep !== 3 && (
                <div className="flex items-center justify-center gap-4 text-xs font-bold text-neutral-500">
                  <span className={`${wizardStep === 1 ? 'text-primary dark:text-secondary' : 'text-neutral-400'}`}>1. Select Borrower & Product</span>
                  <span className="text-neutral-300">&bull;&bull;&bull;</span>
                  <span className={`${wizardStep === 2 ? 'text-primary dark:text-secondary' : 'text-neutral-400'}`}>2. Amount & Term Settings</span>
                </div>
              )}

              {/* Step 1: Select Borrower & Product */}
              {wizardStep === 1 && (
                <div className="space-y-6 min-h-[380px]">
                  {/* Select Member Animated Dropdown */}
                  <div ref={memberDropdownRef} className="relative space-y-1.5 max-w-md z-30">
                    <div className="flex items-center justify-between px-1">
                      <label className="font-label text-neutral-600 dark:text-neutral-400 font-bold text-xs uppercase">
                        Select Member Borrower *
                      </label>
                      {selectedMemberObj && (
                        <span className="text-[10px] text-primary dark:text-secondary font-mono font-semibold">
                          ID: {selectedMemberObj.member_no || 'N/A'}
                        </span>
                      )}
                    </div>

                    {/* Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsMemberDropdownOpen(prev => !prev)}
                      className={`w-full px-4 py-3 bg-white dark:bg-surface border rounded-2xl flex items-center justify-between text-sm transition-all duration-200 cursor-pointer shadow-xs hover:border-primary/50 text-left ${
                        isMemberDropdownOpen
                          ? 'border-primary ring-2 ring-primary/20 shadow-md'
                          : 'border-outline-variant/65'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          selectedMemberObj
                            ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary'
                            : 'bg-neutral/10 text-neutral-400 dark:bg-neutral/20'
                        }`}>
                          <User className="w-4 h-4" />
                        </div>
                        <span className={`truncate text-sm ${
                          selectedMemberObj
                            ? 'text-on-surface dark:text-white font-semibold'
                            : 'text-neutral-400 dark:text-neutral-500 font-normal'
                        }`}>
                          {selectedMemberObj
                            ? `${selectedMemberObj.last_name}, ${selectedMemberObj.first_name} ${selectedMemberObj.middle_name ? selectedMemberObj.middle_name[0] + '.' : ''}`
                            : '-- Choose Member Profile --'}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-neutral-400 transition-transform duration-300 shrink-0 ml-2 ${
                          isMemberDropdownOpen ? 'rotate-180 text-primary dark:text-secondary' : ''
                        }`}
                      />
                    </button>

                    {/* Animated Dropdown Menu Popover */}
                    <div
                      className={`absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white dark:bg-surface border border-outline-variant/60 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ease-out origin-top ${
                        isMemberDropdownOpen
                          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                      }`}
                      style={{
                        boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.25), 0 4px 16px -2px rgba(0, 0, 0, 0.15)'
                      }}
                    >
                      {/* Search Header */}
                      <div className="p-2.5 border-b border-outline-variant/30 bg-neutral-50/80 dark:bg-surface-container/50">
                        <div className="relative flex items-center">
                          <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
                          <input
                            ref={memberSearchInputRef}
                            type="text"
                            placeholder="Type to search borrower name or ID..."
                            value={memberDropdownSearch}
                            onChange={(e) => setMemberDropdownSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-surface-container-lowest border border-outline-variant/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface dark:text-white placeholder:text-neutral-400 font-medium transition-all"
                          />
                          {memberDropdownSearch && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMemberDropdownSearch('');
                                memberSearchInputRef.current?.focus();
                              }}
                              className="absolute right-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-0.5 rounded-full"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dropdown Options List */}
                      <div className="max-h-60 overflow-y-auto divide-y divide-outline-variant/15 p-1.5">
                        <button
                          type="button"
                          onClick={() => handleSelectMember('')}
                          className={`w-full px-3 py-2 text-left text-xs font-semibold rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                            !applyMemberId
                              ? 'bg-primary/10 text-primary dark:text-secondary'
                              : 'text-neutral-400 hover:bg-neutral/10 dark:hover:bg-neutral/20'
                          }`}
                        >
                          <span className="italic">-- Clear Selection --</span>
                          {!applyMemberId && <CheckCircle2 className="w-4 h-4 text-primary dark:text-secondary shrink-0" />}
                        </button>

                        {filteredBorrowerMembers.length === 0 ? (
                          <div className="px-4 py-8 text-center text-xs text-neutral-400">
                            No member profile found matching &quot;{memberDropdownSearch}&quot;
                          </div>
                        ) : (
                          filteredBorrowerMembers.map((m: any) => {
                            const isSelected = String(m.id) === String(applyMemberId);
                            const memberFullName = `${m.last_name}, ${m.first_name}${m.middle_name ? ' ' + m.middle_name : ''}`;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleSelectMember(String(m.id))}
                                className={`w-full px-3 py-2.5 text-left text-xs rounded-xl flex items-center justify-between transition-all cursor-pointer group ${
                                  isSelected
                                    ? 'bg-primary/15 dark:bg-primary/25 text-primary dark:text-secondary font-bold'
                                    : 'text-on-surface dark:text-neutral-200 hover:bg-primary/5 dark:hover:bg-white/5 font-medium'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                    isSelected
                                      ? 'bg-primary text-white dark:bg-secondary dark:text-neutral-900'
                                      : 'bg-neutral/10 text-neutral-500 dark:bg-neutral/20 group-hover:bg-primary/10 group-hover:text-primary transition-colors'
                                  }`}>
                                    {m.first_name ? m.first_name[0] : 'M'}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate group-hover:text-primary dark:group-hover:text-secondary transition-colors">
                                      {memberFullName}
                                    </span>
                                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                                      ID: {m.member_no || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-primary dark:text-secondary shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {applyMemberId && (() => {
                    const activeRegularCount = selectedMemberSummary?.loans?.active_regular_count || 0;
                    const activeStlCount = selectedMemberSummary?.loans?.active_stl_count || 0;
                    const hasStl1MonthRepayment = selectedMemberSummary?.loans?.has_stl_with_1month_repayment || false;
                    const isRegularLocked = selectedLoanCategory === LOAN_CATEGORIES.REGULAR && activeRegularCount >= 1;
                    const isStlLocked = selectedLoanCategory === LOAN_CATEGORIES.STL && activeStlCount >= 3 && !hasStl1MonthRepayment;

                    return (
                      <div className="space-y-4">
                        {/* Product Category pills */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Select Loan Category:</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {Object.entries(LOAN_CATEGORIES).map(([key, label]) => {
                              const isActive = selectedLoanCategory === label;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => {
                                    setSelectedLoanCategory(label);
                                    const filtered = products.filter(p => getProductCategory(p.name) === label);
                                    if (filtered.length > 0) {
                                      setSelectedProduct(filtered[0]);
                                      const defAmt = isAdminOrManager ? (parseFloat(filtered[0].min_amount) || 5000) : parseFloat(filtered[0].min_amount);
                                      setApplyAmount(defAmt);
                                      const defTerm = filtered[0].term_months >= 2 && label === LOAN_CATEGORIES.STL ? 2 : filtered[0].term_months;
                                      setApplyTermMonths(defTerm);
                                    } else {
                                      setSelectedProduct(null);
                                    }
                                  }}
                                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer text-xs font-bold ${isActive
                                    ? 'bg-primary/10 border-primary text-primary dark:bg-secondary/15 dark:border-secondary dark:text-secondary'
                                    : 'border-outline-variant/65 text-neutral-600 dark:text-neutral-400 hover:border-neutral/30'
                                    }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>

                          {!isAdminOrManager && (
                            <div className="text-[11px] font-bold text-neutral-500/90 flex items-center justify-between gap-2 mt-2.5 bg-neutral/5 dark:bg-neutral/10 p-2.5 px-3.5 rounded-2xl border border-outline-variant/30">
                              <div className="flex items-center gap-2">
                                <Info className="w-4 h-4 text-primary dark:text-secondary flex-shrink-0" />
                                {selectedLoanCategory === LOAN_CATEGORIES.REGULAR ? (
                                  <span>Coop Policy Limit: <strong className="text-primary dark:text-secondary font-extrabold">1 active Regular Loan</strong> at a time. <span className="text-neutral-500 dark:text-neutral-400 font-medium">(Current: {activeRegularCount} / 1)</span></span>
                                ) : (
                                  <span>Coop Policy Limit: Up to <strong className="text-primary dark:text-secondary font-extrabold">3 active Short Term Loans (STLs)</strong> concurrently. <span className="text-neutral-500 dark:text-neutral-400 font-medium">(Current: {activeStlCount} / 3)</span></span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Lock / Re-borrowing Unlocked & Share Capital Banners (Only show restrictions for regular member self-service) */}
                        {!isAdminOrManager && selectedMemberSummary && parseFloat(selectedMemberSummary?.balances?.share_capital || 0) === 0 && (
                          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-2xl text-xs flex items-start gap-2.5 font-semibold">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div className="space-y-1">
                              <p className="font-bold">No Share Capital Deposit Found (₱0.00)</p>
                              <p className="text-[11px] font-normal leading-relaxed text-on-surface/80 dark:text-neutral-300">
                                This member has ₱0.00 in Share Capital. Under Cooperative Policy, borrowing capacity is 80% of paid-up Share Capital (₱0.00), so loan applications are locked. Please post a Share Capital deposit first to enable loan borrowing.
                              </p>
                            </div>
                          </div>
                        )}
                        {!isAdminOrManager && isRegularLocked && (
                          <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2.5 font-semibold">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <span>You cannot apply for a new Regular Loan because this member already has an active Regular Loan.</span>
                          </div>
                        )}
                        {!isAdminOrManager && hasStl1MonthRepayment && selectedLoanCategory === LOAN_CATEGORIES.STL && (
                          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs flex gap-2.5 font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span><strong>STL Re-borrowing Unlocked:</strong> Users can loan again on STL after 1 month term of repayment (even if the term is more than 1month and this applies if they have 3 current loans on STL). At least one of your active STLs has reached 1 month of repayment!</span>
                          </div>
                        )}
                        {!isAdminOrManager && isStlLocked && (
                          <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2.5 font-semibold">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <span>You cannot apply for a new Short Term Loan (STL) because this member has 3 active STLs, and none have reached 1 month of repayment yet.</span>
                          </div>
                        )}

                        {/* Available products under the category */}
                        {(() => {
                          let categoryProducts = products.filter(p => getProductCategory(p.name) === selectedLoanCategory);

                          // If State of Calamity is declared, guarantee Calamity Loan product exists under Regular Loan category
                          if (selectedLoanCategory === LOAN_CATEGORIES.REGULAR && isCalamityDeclared && !categoryProducts.some(p => p.name.toLowerCase().includes('calamity'))) {
                            const calamityFallback: LoanProduct = {
                              id: 999999,
                              name: 'Regular Loan - Calamity Loan',
                              interest_rate: '0.0500',
                              term_months: 24,
                              amortization_type: 'diminishing_balance',
                              min_amount: '10000.00',
                              max_amount: '50000.00',
                              is_active: true
                            };
                            categoryProducts = [...categoryProducts, calamityFallback];
                          }

                          // If State of Calamity is NOT declared, hide Calamity Loan products completely ("gone")
                          if (!isCalamityDeclared) {
                            categoryProducts = categoryProducts.filter(p => !p.name.toLowerCase().includes('calamity'));
                          }

                          return (
                            <div className="space-y-3 pt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Available Loan Products:</span>
                              </div>

                              {categoryProducts.length === 0 ? (
                                <div className="text-center py-8 text-xs text-neutral-500 italic bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl border border-dashed border-outline-variant/60">
                                  No active loan products in this category.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[350px] overflow-y-auto pr-1 pt-1">
                                  {categoryProducts.map((p) => {
                                    const details = LOAN_DESCRIPTIONS[p.name] || { desc: 'Standard cooperative credit option.' };
                                    const isSelected = selectedProduct?.id === p.id;
                                    const isCalamityProduct = p.name.toLowerCase().includes('calamity');

                                    const shareCap = selectedMemberSummary?.balances?.share_capital || 0;
                                    const histCount = selectedMemberSummary?.loans?.historical_count || 0;
                                    const actPrincipal = parseFloat(selectedMemberSummary?.loans?.active_principal || selectedMemberSummary?.loans?.outstanding_balance || 0);
                                    const multiplier = histCount === 0 ? 0.8 : histCount === 1 ? 2.0 : 3.0;
                                    const calculatedCap = multiplier * shareCap;
                                    const baseLimit = calculatedCap;
                                    const remCap = Math.max(0, baseLimit - actPrincipal);

                                    const isExceedingCap = Boolean(selectedMemberSummary) && parseFloat(p.min_amount) > remCap;
                                    const isDisabled = !isAdminOrManager && (isExceedingCap || isRegularLocked || isStlLocked);

                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => {
                                          if (isDisabled) return;
                                          setSelectedProduct(p);
                                          const defAmount = isAdminOrManager ? (parseFloat(p.min_amount) || 5000) : parseFloat(p.min_amount);
                                          setApplyAmount(defAmount);
                                          const defTerm = p.term_months >= 2 && getProductCategory(p.name) === LOAN_CATEGORIES.STL ? 2 : p.term_months;
                                          setApplyTermMonths(defTerm);
                                        }}
                                        className={`w-full p-3.5 rounded-2xl border text-left transition-all ${isDisabled
                                          ? 'border-outline-variant/40 bg-neutral-100/60 dark:bg-neutral-900/40 opacity-60 cursor-not-allowed'
                                          : isSelected
                                            ? 'border-primary/60 bg-primary/5 dark:border-secondary/60 dark:bg-secondary/5 ring-2 ring-primary/20 dark:ring-secondary/20 cursor-pointer shadow-sm'
                                            : 'border-outline-variant/65 bg-transparent hover:border-primary/40 dark:hover:border-secondary/40 hover:bg-neutral/5 cursor-pointer'
                                          }`}
                                      >
                                        <div className="flex justify-between items-center mb-2.5">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-on-surface dark:text-white text-sm block tracking-tight">
                                              {p.name
                                                .replace(/Short Term Loan\s*\(STL\)\s*-\s*/gi, '')
                                                .replace(/Short Term Loan\s*-\s*/gi, '')
                                                .replace(/Regular Loan\s*-\s*/gi, '')}
                                            </span>
                                            {isCalamityProduct && (
                                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${isCalamityDeclared
                                                ? 'bg-amber-500 text-white animate-pulse'
                                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                                }`}>
                                                {isCalamityDeclared ? 'Calamity Active' : 'Calamity Only'}
                                              </span>
                                            )}
                                            {isExceedingCap && !isAdminOrManager && (
                                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary border border-tertiary/30">
                                                Exceeds Limit
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-[9px] font-black bg-neutral/10 dark:bg-neutral/20 text-neutral-600 dark:text-neutral-300 px-2.5 py-0.5 rounded-full uppercase whitespace-nowrap tracking-wider">
                                            {p.amortization_type === 'flat_rate' ? 'Flat Rate' : 'Diminishing'}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center">
                                          <div className="bg-neutral/5 dark:bg-neutral/10 p-2 rounded-xl">
                                            <span className="text-[8px] text-neutral-500 uppercase font-black block tracking-wider mb-0.5">Amount</span>
                                            <strong className="text-on-surface dark:text-white font-bold block text-[11px] leading-tight">
                                              {p.min_amount === p.max_amount
                                                ? `₱${parseFloat(p.min_amount).toLocaleString()}`
                                                : `₱${parseFloat(p.min_amount).toLocaleString()} - ₱${parseFloat(p.max_amount).toLocaleString()}`}
                                            </strong>
                                          </div>
                                          <div className="bg-neutral/5 dark:bg-neutral/10 p-2 rounded-xl">
                                            <span className="text-[8px] text-neutral-500 uppercase font-black block tracking-wider mb-0.5">Interest</span>
                                            <strong className="text-on-surface dark:text-white font-bold block text-[11px] leading-tight">
                                              {p.term_months === 36 ? '2.0% - 15.0%' : `${(parseFloat(p.interest_rate) * 100).toFixed(1)}%`} p.a.
                                            </strong>
                                          </div>
                                          <div className="bg-neutral/5 dark:bg-neutral/10 p-2 rounded-xl">
                                            <span className="text-[8px] text-neutral-500 uppercase font-black block tracking-wider mb-0.5">Term</span>
                                            <strong className="text-on-surface dark:text-white font-bold block text-[11px] leading-tight">
                                              {p.term_months === 1 ? '1 Month' : `1 - ${p.term_months} Months`}
                                            </strong>
                                          </div>
                                        </div>

                                        {!isAdminOrManager && isExceedingCap ? (
                                          <p className="text-[9px] text-tertiary font-bold mt-2 flex items-center justify-center gap-1">
                                            <AlertTriangle className="w-3 h-3 inline" /> Min ₱{parseFloat(p.min_amount).toLocaleString()} exceeds remaining capacity (₱{remCap.toLocaleString()}).
                                          </p>
                                        ) : !isAdminOrManager && isRegularLocked ? (
                                          <p className="text-[9px] text-tertiary font-bold mt-2 flex items-center justify-center gap-1">
                                            <AlertTriangle className="w-3 h-3 inline" /> Regular Loan category locked (Max 1 active).
                                          </p>
                                        ) : !isAdminOrManager && isStlLocked ? (
                                          <p className="text-[9px] text-tertiary font-bold mt-2 flex items-center justify-center gap-1">
                                            <AlertTriangle className="w-3 h-3 inline" /> STL category locked (3 active without 1-month repayment).
                                          </p>
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        <div className="pt-2 flex justify-end">
                          <button
                            disabled={!applyMemberId || !selectedProduct || (!isAdminOrManager && (isRegularLocked || isStlLocked))}
                            onClick={() => {
                              if (selectedProduct) {
                                const defTerm = selectedProduct.term_months >= 2 && getProductCategory(selectedProduct.name) === LOAN_CATEGORIES.STL ? 2 : selectedProduct.term_months;
                                setApplyTermMonths(defTerm);
                                const activePrincipal = parseFloat(selectedMemberSummary?.loans?.active_principal || selectedMemberSummary?.loans?.outstanding_balance || 0);
                                const shareCap = selectedMemberSummary?.balances?.share_capital || 0;
                                const histCount = selectedMemberSummary?.loans?.historical_count || 0;
                                const mult = histCount === 0 ? 0.8 : histCount === 1 ? 2.0 : 3.0;
                                const remainingCap = Math.max(0, (mult * shareCap) - activePrincipal);
                                const initAmt = isAdminOrManager
                                  ? (applyAmount > 0 ? applyAmount : (parseFloat(selectedProduct.min_amount) || 5000))
                                  : Math.min(parseFloat(selectedProduct.max_amount), remainingCap);
                                setApplyAmount(initAmt);
                              }
                              setWizardStep(2);
                            }}
                            className="px-8 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-center text-sm animate-micro-elevate"
                          >
                            Continue to Amount
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Step 2: Amount & Term Details */}
              {wizardStep === 2 && selectedProduct && (() => {
                const shareCapital = parseFloat(String(applyInvestmentAmount)) || selectedMemberSummary?.balances?.share_capital || 0;
                const historicalCount = selectedMemberSummary?.loans?.historical_count || 0;

                let borrowLimit = 0;
                let multiplierText = '';
                let tierName = '';

                if (historicalCount === 0) {
                  borrowLimit = shareCapital > 0 ? Math.max(parseFloat(selectedProduct.max_amount), 0.8 * shareCapital) : parseFloat(selectedProduct.max_amount);
                  multiplierText = shareCapital > 0 ? '80% (0.8x)' : 'Initial Credit Allowance';
                  tierName = '1st Loan (First-Time Borrower)';
                } else if (historicalCount === 1) {
                  borrowLimit = Math.max(parseFloat(selectedProduct.max_amount), 2.0 * shareCapital);
                  multiplierText = '200% (2.0x)';
                  tierName = '2nd Loan (Established Track Record)';
                } else {
                  borrowLimit = Math.max(parseFloat(selectedProduct.max_amount), 3.0 * shareCapital);
                  multiplierText = '300% (3.0x)';
                  tierName = '3rd Loan & Onwards (Maximum Tier)';
                }

                const activePrincipal = parseFloat(selectedMemberSummary?.loans?.active_principal || selectedMemberSummary?.loans?.outstanding_balance || 0);
                const remainingCapacity = Math.max(0, borrowLimit - activePrincipal);

                // Slider cap for self-service regular member
                const maxProductCap = parseFloat(selectedProduct.max_amount) || remainingCapacity;
                const maxSliderCap = Math.min(maxProductCap, remainingCapacity);
                const rawMinProduct = parseFloat(selectedProduct.min_amount) || 1000;
                const minSliderCap = Math.min(rawMinProduct, maxSliderCap);

                const currentAmountValue = applyAmount || 0;
                const coMakerRequired = !isAdminOrManager && currentAmountValue > shareCapital;
                const submitDisabled = applySubmitting || (!isAdminOrManager && coMakerRequired && !coMakerName.trim()) || currentAmountValue <= 0;

                if (isAdminOrManager) {
                  return (
                    <div className="space-y-5 animate-micro-elevate">
                      {/* Physical Slip Title / Policy override banner */}
                      <div className="bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-secondary/15 flex items-center justify-center text-primary dark:text-secondary flex-shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-on-surface dark:text-white">Admin Desk Application Slip Entry</h4>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Selected Product: <strong className="text-primary dark:text-secondary">{selectedProduct.name}</strong> ({selectedProduct.amortization_type === 'flat_rate' ? 'Flat Rate' : 'Diminishing Balance'})
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            Manual Override Active
                          </span>
                        </div>
                      </div>

                      {/* Section 1: Slip Header: Date & LAF No. */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-primary dark:text-secondary" />
                            <span>Application Date *</span>
                          </label>
                          <input
                            type="date"
                            value={applyDate}
                            onChange={(e) => setApplyDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/40 text-sm font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-primary dark:text-secondary" />
                              <span>LAF No. (Loan Application Form #)</span>
                            </label>
                            <span className="text-[9px] font-bold text-neutral-400">e.g. 26-407</span>
                          </div>
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={applyLafNo}
                              onChange={(e) => setApplyLafNo(e.target.value)}
                              placeholder="e.g. 26-407"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/40 text-sm font-mono font-bold text-primary dark:text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                              type="button"
                              onClick={fetchNextLafNo}
                              disabled={loadingLafNo}
                              className="absolute right-2 px-2.5 py-1 text-[11px] font-bold text-neutral-500 hover:text-primary dark:hover:text-secondary bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                              title="Refresh to next sequential LAF No."
                            >
                              {loadingLafNo ? '...' : 'Auto-Suggest'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Borrower's Part (Name, Age, Investment Amount) */}
                      <div className="p-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low space-y-3">
                        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary dark:text-secondary flex items-center gap-1.5">
                            <User className="w-4 h-4" /> Borrower&apos;s Part
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            From Physical Application Sheet
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">Borrower Name</label>
                            <input
                              type="text"
                              value={
                                applyBorrowerName ||
                                (() => {
                                  const mem = members.find((m: any) => String(m.id) === String(applyMemberId));
                                  if (mem) {
                                    return [mem.first_name, mem.middle_name, mem.last_name].filter(Boolean).join(' ');
                                  }
                                  if (selectedMemberSummary?.full_name) return selectedMemberSummary.full_name;
                                  if (selectedMemberSummary?.first_name || selectedMemberSummary?.last_name) {
                                    return `${selectedMemberSummary.first_name || ''} ${selectedMemberSummary.last_name || ''}`.trim();
                                  }
                                  return '';
                                })()
                              }
                              onChange={(e) => setApplyBorrowerName(e.target.value)}
                              placeholder="Borrower Full Name"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/40 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">Age</label>
                            <input
                              type="number"
                              value={applyAge}
                              onChange={(e) => setApplyAge(e.target.value)}
                              placeholder="e.g. 38"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/40 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">Investment Amount (CBU)</label>
                              {selectedMemberSummary?.balances?.share_capital !== undefined && (
                                <span className="text-[9px] text-neutral-400">DB: ₱{parseFloat(selectedMemberSummary.balances.share_capital).toLocaleString()}</span>
                              )}
                            </div>
                            <input
                              type="number"
                              step="any"
                              value={applyInvestmentAmount}
                              onChange={(e) => setApplyInvestmentAmount(e.target.value)}
                              placeholder="e.g. 22000"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/40 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Loan Amount & Term Specification (ANY AMOUNT) */}
                      <div className="p-4 rounded-2xl border-2 border-primary/30 dark:border-secondary/30 bg-primary/5 dark:bg-secondary/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black uppercase tracking-wider text-primary dark:text-secondary flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" /> Loan Amount & Term Selection
                          </label>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary">
                            Any Amount Allowed
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="relative flex items-center">
                            <span className="absolute left-4 font-headline text-2xl font-black text-primary dark:text-secondary">₱</span>
                            <input
                              type="number"
                              step="any"
                              min="1"
                              value={applyAmount || ''}
                              onChange={(e) => setApplyAmount(parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full pl-10 pr-4 py-3 text-2xl font-black font-headline text-primary dark:text-secondary bg-white dark:bg-surface-container-high/80 rounded-2xl border-2 border-primary/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                            Enter any principal amount requested on the application sheet without software limit restrictions.
                          </p>
                        </div>

                        {/* Quick Presets for Short Term Loan Types (Utility, Emergency, Cash Express, Occasion) */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Quick Presets / STL Types:</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { label: 'Utility', amount: 3000 },
                              { label: 'Emergency', amount: 5000 },
                              { label: 'Cash Express', amount: 7000 },
                              { label: 'Occasion', amount: 10000 },
                            ].map((preset) => {
                              const isSelected = applyAmount === preset.amount;
                              return (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => setApplyAmount(preset.amount)}
                                  className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-primary text-white dark:bg-secondary dark:text-neutral-950 border-primary dark:border-secondary font-bold shadow-xs'
                                      : 'bg-white dark:bg-surface-container-high/60 border-outline-variant hover:border-primary/40 text-neutral-700 dark:text-neutral-200'
                                  }`}
                                >
                                  <div className="text-[10px] uppercase font-bold tracking-tight">{preset.label}</div>
                                  <div className="text-xs font-extrabold">{formatCurrency(preset.amount)}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Term Selection */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                            <span>Loan Term Duration:</span>
                            <span className="font-extrabold text-primary dark:text-secondary">{applyTermMonths} {applyTermMonths === 1 ? 'Month' : 'Months'}</span>
                          </label>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {[1, 2, 3].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setApplyTermMonths(m)}
                                className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs ${
                                  applyTermMonths === m
                                    ? 'bg-primary text-white dark:bg-secondary dark:text-neutral-950 border-primary dark:border-secondary shadow-xs'
                                    : 'bg-white dark:bg-surface-container-high/60 border-outline-variant hover:border-primary/40 text-neutral-700 dark:text-neutral-200'
                                }`}
                              >
                                {m} {m === 1 ? 'Month' : 'Months'}
                              </button>
                            ))}
                            {selectedProduct.term_months > 3 && (
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  min="1"
                                  max={selectedProduct.term_months}
                                  value={applyTermMonths}
                                  onChange={(e) => setApplyTermMonths(parseInt(e.target.value, 10) || 1)}
                                  placeholder="Months"
                                  className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/60 text-xs font-bold text-center text-on-surface dark:text-white"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Section 4: For Staff Only - Less Charges (Deductions) & Net Proceeds */}
                      <div className="p-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low space-y-3.5">
                        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <ReceiptText className="w-4 h-4" /> For Staff Only: Less Charges (Deductions)
                          </span>
                          <span className="text-[10px] font-bold text-neutral-500">
                            Auto-Calculates Net Proceeds
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Service Fee</label>
                            <input
                              type="number"
                              step="any"
                              value={applyServiceFee}
                              onChange={(e) => setApplyServiceFee(e.target.value)}
                              placeholder="100"
                              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/40 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Insurance</label>
                            <input
                              type="number"
                              step="any"
                              value={applyInsurance}
                              onChange={(e) => setApplyInsurance(e.target.value)}
                              placeholder="11"
                              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/40 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">Fixed Deposit</label>
                            <input
                              type="number"
                              step="any"
                              value={applyFixedDeposit}
                              onChange={(e) => setApplyFixedDeposit(e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/40 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                                Others
                                {parseFloat(String(applyOtherCharges)) > 0 && selectedPrevLoanObj && (
                                  <span className="ml-1 text-[9px] font-semibold text-primary dark:text-secondary">
                                    {prevLoanFines > 0 && Math.abs(parseFloat(String(applyOtherCharges)) - prevLoanFines) < 0.01
                                      ? '(Fines)'
                                      : prevLoanInterest > 0 && Math.abs(parseFloat(String(applyOtherCharges)) - prevLoanInterest) < 0.01
                                      ? '(Interest)'
                                      : prevLoanFines > 0 && prevLoanInterest > 0 && Math.abs(parseFloat(String(applyOtherCharges)) - (prevLoanFines + prevLoanInterest)) < 0.01
                                      ? '(Fines+Int)'
                                      : ''}
                                  </span>
                                )}
                              </label>
                            </div>
                            <input
                              type="number"
                              step="any"
                              value={applyOtherCharges}
                              onChange={(e) => setApplyOtherCharges(e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/40 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            {selectedPrevLoanObj && (prevLoanFines > 0 || prevLoanInterest > 0) && (
                              <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                                {prevLoanFines > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setApplyOtherCharges(String(prevLoanFines))}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all cursor-pointer ${
                                      Math.abs(parseFloat(String(applyOtherCharges)) - prevLoanFines) < 0.01
                                        ? 'bg-primary text-white border-primary shadow-xs'
                                        : 'bg-neutral-100 dark:bg-surface-container-high text-neutral-600 dark:text-neutral-300 border-outline-variant hover:border-primary/50'
                                    }`}
                                    title="Set Others to Previous Loan Fines"
                                  >
                                    Fines: ₱{Number(prevLoanFines).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </button>
                                )}
                                {prevLoanInterest > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setApplyOtherCharges(String(prevLoanInterest))}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all cursor-pointer ${
                                      Math.abs(parseFloat(String(applyOtherCharges)) - prevLoanInterest) < 0.01
                                        ? 'bg-primary text-white border-primary shadow-xs'
                                        : 'bg-neutral-100 dark:bg-surface-container-high text-neutral-600 dark:text-neutral-300 border-outline-variant hover:border-primary/50'
                                    }`}
                                    title="Set Others to Previous Loan Interest"
                                  >
                                    Int: ₱{Number(prevLoanInterest).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </button>
                                )}
                                {prevLoanFines > 0 && prevLoanInterest > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setApplyOtherCharges(String(prevLoanFines + prevLoanInterest))}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all cursor-pointer ${
                                      Math.abs(parseFloat(String(applyOtherCharges)) - (prevLoanFines + prevLoanInterest)) < 0.01
                                        ? 'bg-primary text-white border-primary shadow-xs'
                                        : 'bg-neutral-100 dark:bg-surface-container-high text-neutral-600 dark:text-neutral-300 border-outline-variant hover:border-primary/50'
                                    }`}
                                    title="Set Others to Both Fines and Interest"
                                  >
                                    Both: ₱{Number(prevLoanFines + prevLoanInterest).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Previous Active Loan Balance Deduction */}
                        <div className="p-3 bg-white dark:bg-surface-container-high/40 rounded-xl border border-outline-variant/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 uppercase tracking-wider">
                              <ReceiptText className="w-3.5 h-3.5 text-primary" />
                              Previous Loan Balance Deduction
                            </label>
                            {selectedPrevLoanId && (() => {
                              const found = memberActiveLoans.find((l: any) => String(l.id) === String(selectedPrevLoanId));
                              return found ? (
                                <span className="text-[10px] text-primary dark:text-secondary font-semibold">
                                  Current Balance: ₱{Number(found.remaining_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : null;
                            })()}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2 space-y-1 relative" ref={prevLoanDropdownRef}>
                              <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                                Select Active Loan to Deduct
                              </label>

                              <button
                                type="button"
                                onClick={() => {
                                  if (applyMemberId && !loadingMemberActiveLoans && memberActiveLoans.length > 0) {
                                    setIsPrevLoanDropdownOpen((prev) => !prev);
                                  }
                                }}
                                disabled={!applyMemberId || loadingMemberActiveLoans || memberActiveLoans.length === 0}
                                className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer bg-white dark:bg-surface-container-high/60 ${
                                  isPrevLoanDropdownOpen
                                    ? 'border-primary ring-2 ring-primary/20 shadow-sm'
                                    : 'border-outline-variant hover:border-primary/40'
                                } ${(!applyMemberId || loadingMemberActiveLoans || memberActiveLoans.length === 0) ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <CreditCard className={`w-3.5 h-3.5 shrink-0 ${selectedPrevLoanObj ? 'text-primary dark:text-secondary' : 'text-neutral-400'}`} />
                                  <span className={`truncate ${selectedPrevLoanObj ? 'text-on-surface dark:text-white font-semibold' : 'text-neutral-500 font-normal'}`}>
                                    {!applyMemberId
                                      ? 'Select a member above first...'
                                      : loadingMemberActiveLoans
                                      ? "Loading member's active loans..."
                                      : memberActiveLoans.length === 0
                                      ? 'No active loans found for this member'
                                      : selectedPrevLoanObj
                                      ? `${selectedPrevLoanObj.laf_no ? `[${selectedPrevLoanObj.laf_no}] ` : ''}${selectedPrevLoanObj.product_name || 'Loan'} — Bal: ₱${Number(selectedPrevLoanObj.remaining_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                      : '-- None / No previous loan deduction --'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {loadingMemberActiveLoans && <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />}
                                  <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isPrevLoanDropdownOpen ? 'rotate-180 text-primary dark:text-secondary' : ''}`} />
                                </div>
                              </button>

                              {/* Animated Dropdown Menu Popover */}
                              <div
                                className={`absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white dark:bg-surface-container-high border border-outline-variant/70 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ease-out origin-top ${
                                  isPrevLoanDropdownOpen
                                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                                }`}
                                style={{
                                  boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.3), 0 4px 16px -2px rgba(0, 0, 0, 0.2)'
                                }}
                              >
                                <div className="max-h-56 overflow-y-auto divide-y divide-outline-variant/20 p-1">
                                  {/* None Option */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handlePrevLoanSelect('');
                                      setIsPrevLoanDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                                      !selectedPrevLoanId
                                        ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary font-bold'
                                        : 'hover:bg-neutral-100 dark:hover:bg-surface-container-highest text-neutral-600 dark:text-neutral-300'
                                    }`}
                                  >
                                    <span className="italic">-- None / No previous loan deduction --</span>
                                    {!selectedPrevLoanId && <CheckCircle2 className="w-4 h-4 text-primary dark:text-secondary shrink-0" />}
                                  </button>

                                  {/* Active Loans */}
                                  {memberActiveLoans.map((l: any) => {
                                    const isSelected = String(l.id) === String(selectedPrevLoanId);
                                    return (
                                      <button
                                        key={l.id}
                                        type="button"
                                        onClick={() => {
                                          handlePrevLoanSelect(String(l.id));
                                          setIsPrevLoanDropdownOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                          isSelected
                                            ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary font-bold'
                                            : 'hover:bg-neutral-100 dark:hover:bg-surface-container-highest text-neutral-800 dark:text-neutral-200'
                                        }`}
                                      >
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {l.laf_no && (
                                              <span className="px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-[10px] font-mono font-bold text-neutral-700 dark:text-neutral-300">
                                                {l.laf_no}
                                              </span>
                                            )}
                                            <span className="text-xs font-semibold truncate">{l.product_name || 'Loan'}</span>
                                          </div>
                                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                            <span>Status: <span className="capitalize">{l.status}</span></span>
                                            {parseFloat(l.remaining_interest || 0) > 0 && (
                                              <span className="text-amber-600 dark:text-amber-400 font-semibold">• Int: ₱{Number(l.remaining_interest).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            )}
                                            {parseFloat(l.total_fines || 0) > 0 && (
                                              <span className="text-rose-600 dark:text-rose-400 font-semibold">• Fines: ₱{Number(l.total_fines).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0 flex items-center gap-2">
                                          <div>
                                            <span className="text-[9px] block text-neutral-400 uppercase font-medium">Bal</span>
                                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                              ₱{Number(l.remaining_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          </div>
                                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary dark:text-secondary shrink-0" />}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                                Prev. Loan Balance (₱)
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={applyPrevBalance}
                                onChange={(e) => setApplyPrevBalance(e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/60 text-xs font-bold text-primary dark:text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Summary of Charges & Net Proceeds */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex justify-between items-center">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">Total Charges</span>
                              <span className="text-xs text-neutral-500">Less from principal</span>
                            </div>
                            <span className="text-base font-black font-headline text-amber-800 dark:text-amber-300">
                              {formatCurrency(totalDeductionsCalc)}
                            </span>
                          </div>

                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex justify-between items-center">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">Net Loan Proceeds</span>
                              <span className="text-xs text-neutral-500">Actual amount to disburse</span>
                            </div>
                            <span className="text-xl font-black font-headline text-emerald-700 dark:text-emerald-300">
                              {formatCurrency(netProceedsCalc)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section 5: Required Payment Schedule (Editable) */}
                      <div className="p-4 rounded-2xl border border-outline-variant/60 bg-surface-container-low space-y-3">
                        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary dark:text-secondary flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" /> Required Payment Schedule
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary">
                              Editable
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-neutral-500">
                              {selectedProduct.amortization_type === 'flat_rate' ? 'Flat Rate' : 'Diminishing Balance (2% / mo)'}
                            </span>
                            {Object.keys(applyScheduleAmounts).length > 0 && (
                              <button
                                type="button"
                                onClick={() => setApplyScheduleAmounts({})}
                                className="text-[10px] font-bold text-primary dark:text-secondary hover:underline cursor-pointer"
                              >
                                Reset to Auto
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {monthlySchedulePreview.map((item: { monthLabel: string; payment: number }, idx: number) => {
                            const currentVal = applyScheduleAmounts[idx] !== undefined ? applyScheduleAmounts[idx] : item.payment;
                            return (
                              <div key={idx} className="bg-white dark:bg-surface-container-high/60 border border-outline-variant/50 rounded-xl p-2.5 space-y-1.5 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{item.monthLabel}:</span>
                                  <span className="text-[9px] text-neutral-400 font-mono">
                                    Auto: ₱{item.payment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="relative flex items-center">
                                  <span className="absolute left-3 text-xs font-bold text-neutral-400">₱</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={currentVal}
                                    onChange={(e) => setApplyScheduleAmounts(prev => ({ ...prev, [idx]: e.target.value }))}
                                    placeholder="0.00"
                                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-outline-variant bg-white dark:bg-surface-container-high/80 text-xs font-bold font-mono text-primary dark:text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer Navigation & Submit */}
                      <div className="flex gap-4 pt-3 border-t border-outline-variant/30">
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="flex-1 py-3 bg-neutral/10 hover:bg-neutral/15 dark:bg-neutral/20 dark:hover:bg-neutral/25 text-on-surface dark:text-white rounded-2xl font-bold transition-colors cursor-pointer text-center text-sm"
                        >
                          Back to Products
                        </button>
                        <button
                          type="button"
                          disabled={submitDisabled}
                          onClick={() => handleApplyLoanSubmit()}
                          className="flex-1 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-center text-sm shadow-md"
                        >
                          {applySubmitting ? 'Booking Application...' : 'Book Loan Application'}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6 animate-micro-elevate">
                    {/* Policy Banner */}
                    <div className="bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-3xl p-5 space-y-2.5">
                      <div className="flex items-center gap-2 font-bold text-sm text-primary dark:text-secondary">
                        <Info className="w-5 h-5" /> Member progressive loan cap validation
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        Borrower is classified under <strong className="text-on-surface dark:text-white font-bold">{tierName}</strong>.
                        With Share Capital equity of <strong className="text-on-surface dark:text-white font-bold">{formatCurrency(shareCapital)}</strong>,
                        the progressive policy borrowing limit is capped at <strong className="text-on-surface dark:text-white font-bold">{multiplierText} ({formatCurrency(borrowLimit)})</strong>.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Slider & Repayment summary */}
                      <div className="space-y-5">
                        <div className="bg-neutral/5 dark:bg-neutral/10 p-4 rounded-2xl text-center space-y-1">
                          <span className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-bold tracking-wider">Loan Principal Amount</span>
                          <div className="font-headline text-3xl font-extrabold text-primary dark:text-secondary">
                            {formatCurrency(currentAmountValue)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 flex justify-between">
                            <span>Adjust Amount:</span>
                            <span>Min: {formatCurrency(minSliderCap)}</span>
                          </label>
                          <input
                            type="range"
                            min={minSliderCap}
                            max={maxSliderCap}
                            step={maxSliderCap - minSliderCap > 10000 ? 1000 : 500}
                            value={currentAmountValue}
                            onChange={(e) => setApplyAmount(parseFloat(e.target.value))}
                            className="w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary dark:accent-secondary"
                          />
                          <div className="text-right text-xs font-bold text-neutral-600 dark:text-neutral-400">
                            Max Allowed: {formatCurrency(maxSliderCap)}
                          </div>
                        </div>

                        {/* Term Selection Slider (Only if product allows multiple months) */}
                        {selectedProduct.term_months > 1 && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 flex justify-between">
                              <span>Adjust Term:</span>
                              <span>{applyTermMonths} {applyTermMonths === 1 ? 'Month' : 'Months'}</span>
                            </label>
                            <input
                              type="range"
                              min="1"
                              max={selectedProduct.term_months}
                              step="1"
                              value={applyTermMonths}
                              onChange={(e) => setApplyTermMonths(parseInt(e.target.value, 10))}
                              className="w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary dark:accent-secondary"
                            />
                            <div className="text-right text-xs font-bold text-neutral-600 dark:text-neutral-400">
                              Max Term: {selectedProduct.term_months} {selectedProduct.term_months === 1 ? 'Month' : 'Months'}
                            </div>
                          </div>
                        )}

                        {/* Amortization math preview */}
                        <div className="border border-outline-variant/65 rounded-2xl p-4 space-y-2 text-xs bg-surface-container-low">
                          <h5 className="font-bold text-on-surface dark:text-white border-b border-outline-variant/30 pb-1.5 mb-2">Estimated Monthly Repayments</h5>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-600 dark:text-neutral-400">Amortization Computation</span>
                            <span className="font-semibold uppercase">{selectedProduct.amortization_type.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-600 dark:text-neutral-400">Term Period</span>
                            <span className="font-semibold">{applyTermMonths} {applyTermMonths === 1 ? 'Month' : 'Months'}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-600 dark:text-neutral-400">Interest Rate</span>
                            <span className="font-semibold">
                              {applyTermMonths === 36 ? '15.0% monthly' : '2.0% monthly'}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-outline-variant/20 font-bold text-sm text-primary dark:text-secondary">
                            <span>Est. Month 1 Due</span>
                            <span>
                              {formatCurrency(
                                (() => {
                                  const rate = applyTermMonths === 36 ? 0.15 : 0.02;
                                  if (selectedProduct.amortization_type === 'flat_rate') {
                                    return (currentAmountValue + (currentAmountValue * rate * applyTermMonths)) / applyTermMonths;
                                  } else {
                                    return (currentAmountValue / applyTermMonths) + (currentAmountValue * rate);
                                  }
                                })()
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Co-Maker fields */}
                      <div className="space-y-5">
                        {coMakerRequired ? (
                          <div className="p-5 border border-amber-500/20 dark:border-amber-400/20 bg-amber-500/5 dark:bg-amber-400/5 rounded-3xl space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                              <Users className="w-5 h-5" /> Co-Maker Requirement Triggered
                            </div>
                            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                              Requested amount of <strong className="text-on-surface dark:text-white font-bold">{formatCurrency(currentAmountValue)}</strong> exceeds the member&apos;s Share Capital equity collateral (<strong className="text-on-surface dark:text-white font-bold">{formatCurrency(shareCapital)}</strong>).
                              A co-maker&apos;s signature is mandatory to book this contract.
                            </p>
                            <div className="space-y-3 pt-2">
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">Co-Maker Full Name *</label>
                                <input
                                  type="text"
                                  required
                                  value={coMakerName}
                                  onChange={(e) => setCoMakerName(e.target.value)}
                                  placeholder="Full name of guarantor member"
                                  className="w-full px-4 py-3 rounded-2xl border border-outline-variant/65 bg-white dark:bg-surface-container-high/40 text-xs text-on-surface dark:text-white font-semibold focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">Co-Maker Phone/Contact</label>
                                <input
                                  type="tel"
                                  value={coMakerPhone}
                                  onChange={(e) => setCoMakerPhone(e.target.value)}
                                  placeholder="Guarantor mobile number"
                                  className="w-full px-4 py-3 rounded-2xl border border-outline-variant/65 bg-white dark:bg-surface-container-high/40 text-xs text-on-surface dark:text-white font-semibold focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-5 border border-green-500/20 dark:border-green-400/20 bg-green-500/5 dark:bg-green-400/5 rounded-3xl space-y-3 flex flex-col justify-center h-full">
                            <div className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">
                              <ShieldCheck className="w-5 h-5" /> Fully Collateralized Loan
                            </div>
                            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                              This request is completely covered by the member&apos;s paid-up Share Capital (<strong className="text-on-surface dark:text-white font-bold">{formatCurrency(shareCapital)}</strong>).
                            </p>
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-500 leading-relaxed italic">
                              No co-maker details are required for this borrowing tier.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-4 pt-4 border-t border-outline-variant/30">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="flex-1 py-3 bg-neutral/10 hover:bg-neutral/15 dark:bg-neutral/20 dark:hover:bg-neutral/25 text-on-surface dark:text-white rounded-2xl font-bold transition-colors cursor-pointer text-center"
                      >
                        Back to Selection
                      </button>
                      <button
                        type="button"
                        disabled={submitDisabled}
                        onClick={() => handleApplyLoanSubmit()}
                        className="flex-1 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-center"
                      >
                        {applySubmitting ? 'Booking Contract...' : 'Create Contract'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Step 3: Success screen */}
              {wizardStep === 3 && successData && (
                <div className="text-center space-y-4 py-4 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-primary/20 dark:bg-secondary/20 text-primary dark:text-secondary rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold animate-micro-elevate">
                    ✓
                  </div>
                  <h4 className="font-headline font-bold text-xl text-on-surface dark:text-white">Credit Contract Booked!</h4>
                  {successData?.laf_no && (
                    <div className="py-1">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary font-mono text-base font-bold border border-primary/25 shadow-xs">
                        <FileText className="w-4 h-4" />
                        LAF #{successData.laf_no}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    A new loan application has been registered under ID <strong className="text-on-surface dark:text-white font-bold font-mono">#{String(successData?.id || 'N/A').slice(0, 8)}</strong> with status <strong className={`${successData?.status === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'} font-bold`}>{successData?.status === 'approved' ? 'Approved' : 'Pending Approval'}</strong>.
                  </p>
                  <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openApplyModal()}
                      className="w-full sm:flex-1 py-3.5 px-4 bg-primary/10 dark:bg-secondary/15 hover:bg-primary/20 dark:hover:bg-secondary/25 text-primary dark:text-secondary border border-primary/25 dark:border-secondary/30 rounded-2xl font-bold transition-all active:scale-95 cursor-pointer text-sm flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Make another one?</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsApplyModalOpen(false);
                        fetchLoans();
                      }}
                      className="w-full sm:flex-1 py-3.5 px-4 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity cursor-pointer text-sm shadow active:scale-95"
                    >
                      Close Window & Refresh
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD REPAYMENT */}
      {isRepaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsRepaymentModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Book Loan Repayment</h2>

            {repayError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{repayError}</span>
              </div>
            )}

            <form onSubmit={handleRepaymentSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Select Credit Contract *</label>
                <select
                  required
                  value={repayLoanId}
                  onChange={(e) => setRepayLoanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white font-semibold"
                >
                  <option value="">-- Choose Loan (LAF No) --</option>
                  {loans
                    .filter((l) => l.status === 'disbursed' || l.status === 'defaulted')
                    .map((l: any) => (
                      <option key={l.id} value={l.id}>
                        {l.laf_no ? `LAF #${l.laf_no}` : `Contract #${l.id.slice(0, 8)}`} - {l.last_name}, {l.first_name} ({l.product_name} - Principal: ₱{parseFloat(l.principal_amount).toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Repayment Payment Amount (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Payment Method *</label>
                  <select
                    value={repayMethod}
                    onChange={(e) => setRepayMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  >
                    <option value="GCash">GCash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Salary Deduction">Salary Deduction</option>
                    <option value="Hand-in">Hand-in</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Reference No / Receipt No</label>
                  <input
                    type="text"
                    value={repayRefNo}
                    onChange={(e) => setRepayRefNo(e.target.value)}
                    placeholder="e.g. TXN-1082"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRepaymentModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={repaySubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
                >
                  {repaySubmitting ? 'Recording Repayment...' : 'Book Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN / EDIT LAF NO. (Admin/Staff Only) */}
      {isAdminOrManager && lafModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30 mb-4">
              <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary dark:text-secondary" />
                <span>{lafModalLoan.laf_no ? 'Edit LAF Number' : 'Assign LAF Number'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setLafModalLoan(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {lafModalError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{lafModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLafNo} className="space-y-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-outline-variant/40 space-y-1 text-xs">
                <div className="text-neutral-500 font-semibold">Borrower:</div>
                <div className="font-bold text-on-surface dark:text-white text-sm">
                  {lafModalLoan.last_name}, {lafModalLoan.first_name}
                </div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  {lafModalLoan.product_name} • Principal: {formatCurrency(parseFloat(lafModalLoan.principal_amount))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface dark:text-white">
                    Loan Application Form (LAF) No. *
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await api.get('/loans/next-laf-no');
                        if (res.data?.data?.next_laf_no) {
                          setLafInputVal(res.data.data.next_laf_no);
                        }
                      } catch (err) {
                        console.error('Failed to get next LAF:', err);
                      }
                    }}
                    className="text-[10px] font-bold text-primary dark:text-secondary hover:underline cursor-pointer"
                  >
                    Suggest Next LAF
                  </button>
                </div>
                <input
                  type="text"
                  value={lafInputVal}
                  onChange={(e) => setLafInputVal(e.target.value)}
                  placeholder="e.g. 26-388"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono font-bold text-primary dark:text-secondary"
                  autoFocus
                />
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  Assign the sequential physical form number to this loan contract.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setLafModalLoan(null)}
                  className="px-5 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={lafModalSubmitting || !lafInputVal.trim()}
                  className="px-5 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {lafModalSubmitting ? 'Saving...' : 'Save LAF No.'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3.5: LOAN APPROVAL & DEDUCTIONS ADJUSTMENT */}
      {isApprovalModalOpen && approvalModalLoan && (
        <LoanApprovalModal
          isOpen={isApprovalModalOpen}
          onClose={() => {
            setIsApprovalModalOpen(false);
            setApprovalModalLoan(null);
          }}
          loan={approvalModalLoan}
          onSuccess={handleApprovalSuccess}
        />
      )}

      {/* MODAL 4: PRINT CHECK VOUCHER PREVIEW */}
      {isPrintModalOpen && printMode === 'voucher' && printLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-4xl shadow-2xl p-6 relative animate-modal-pop max-h-[92vh] overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30">
              <div>
                <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-primary dark:text-secondary" />
                  <span>Generate Check Voucher</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Official UC-METC check disbursement voucher format for loan releases.
                </p>
              </div>
              <button
                type="button"
                onClick={closePrintModal}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Configurable Form Controls */}
            <div className="p-4 bg-neutral-50/80 dark:bg-neutral-800/40 rounded-2xl border border-outline-variant/40 space-y-3.5 text-xs">
              <div className="flex items-center justify-between font-bold text-neutral-700 dark:text-neutral-300 text-[11px] uppercase tracking-wider">
                <span>Voucher Parameters</span>
                <span className="text-[10px] text-neutral-500 font-normal normal-case">Configure fields prior to printing</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-600 dark:text-neutral-400 text-[11px]">Voucher No.</label>
                  <input
                    type="text"
                    value={voucherNo}
                    onChange={(e) => setVoucherNo(e.target.value)}
                    placeholder="e.g. 26-267"
                    className="w-full px-3 py-2 bg-white dark:bg-surface border border-outline-variant rounded-xl font-mono font-bold text-primary dark:text-secondary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-600 dark:text-neutral-400 text-[11px]">Voucher Date</label>
                  <input
                    type="date"
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-surface border border-outline-variant rounded-xl font-semibold text-on-surface dark:text-white focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-600 dark:text-neutral-400 text-[11px]">Check No.</label>
                  <input
                    type="text"
                    value={checkNo}
                    onChange={(e) => setCheckNo(e.target.value)}
                    placeholder="e.g. 12345"
                    className="w-full px-3 py-2 bg-white dark:bg-surface border border-outline-variant rounded-xl font-mono font-bold text-on-surface dark:text-white focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-600 dark:text-neutral-400 text-[11px]">Bank</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. BDO"
                    className="w-full px-3 py-2 bg-white dark:bg-surface border border-outline-variant rounded-xl font-semibold uppercase text-on-surface dark:text-white focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-600 dark:text-neutral-400 text-[11px]">Payee Name</label>
                <input
                  type="text"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="Full Member Name"
                  className="w-full px-3 py-2 bg-white dark:bg-surface border border-outline-variant rounded-xl font-bold uppercase text-on-surface dark:text-white focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-600 dark:text-neutral-400 text-[11px]">Description / Particulars</label>
                <input
                  type="text"
                  value={voucherDescription}
                  onChange={(e) => setVoucherDescription(e.target.value)}
                  placeholder="e.g. Balance Settlement for Financial Management System"
                  className="w-full px-3 py-2 bg-white dark:bg-surface border border-outline-variant rounded-xl font-semibold text-on-surface dark:text-white focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {/* Transaction Breakdown Rows Editor */}
              <div className="space-y-2 pt-2 border-t border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-neutral-700 dark:text-neutral-300 text-[11px] uppercase tracking-wider block">
                      Transaction Breakdown Rows
                    </span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Add, edit, or remove debit/credit entries for this voucher
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVoucherRows(prev => [...prev, { description: '', debit: '', credit: '' }])}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 dark:bg-secondary/15 hover:bg-primary/20 text-primary dark:text-secondary rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="border border-outline-variant/60 rounded-2xl overflow-hidden divide-y divide-outline-variant/40 bg-white dark:bg-surface-container-low shadow-2xs">
                  {/* Table Column Header */}
                  <div className="grid grid-cols-12 px-3 py-2 bg-neutral-100/70 dark:bg-neutral-800/60 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-5">Book of Account / Item</div>
                    <div className="col-span-3 text-right">Debit (₱)</div>
                    <div className="col-span-2 text-right">Credit (₱)</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {voucherRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 px-3 py-2 items-center gap-2 text-xs">
                      <div className="col-span-1 text-center font-mono text-neutral-400 font-bold">{idx + 1}</div>
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={row.description}
                          onChange={e => {
                            const val = e.target.value;
                            setVoucherRows(prev => prev.map((r, i) => (i === idx ? { ...r, description: val } : r)));
                          }}
                          placeholder="e.g. Accounts Payable / Deduction"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs text-on-surface dark:text-white font-medium focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="any"
                          value={row.debit}
                          onChange={e => {
                            const val = e.target.value;
                            setVoucherRows(prev => prev.map((r, i) => (i === idx ? { ...r, debit: val } : r)));
                          }}
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-right text-xs text-on-surface dark:text-white focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="any"
                          value={row.credit}
                          onChange={e => {
                            const val = e.target.value;
                            setVoucherRows(prev => prev.map((r, i) => (i === idx ? { ...r, credit: val } : r)));
                          }}
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent font-mono text-right text-xs text-rose-600 dark:text-rose-400 focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => setVoucherRows(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {voucherRows.length === 0 && (
                    <div className="py-4 text-center text-xs text-neutral-400 italic">
                      No rows added yet. Click &quot;Add Row&quot; above to insert a line item.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-outline-variant/30">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-600 dark:text-neutral-400 text-[11px]">Prepared By</label>
                  <input
                    type="text"
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-surface border border-outline-variant rounded-xl text-xs font-bold uppercase text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-600 dark:text-neutral-400 text-[11px]">Checked By</label>
                  <input
                    type="text"
                    value={checkedBy}
                    onChange={(e) => setCheckedBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-surface border border-outline-variant rounded-xl text-xs font-bold uppercase text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-600 dark:text-neutral-400 text-[11px]">Approved By</label>
                  <input
                    type="text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-surface border border-outline-variant rounded-xl text-xs font-bold uppercase text-on-surface dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Live WYSIWYG Check Voucher Sheet Preview */}
            <div className="border border-outline-variant rounded-2xl bg-white text-black p-6 shadow-sm overflow-hidden space-y-4 font-sans text-xs">
              {/* Brand Header */}
              <div className="flex justify-between items-center border-b-2 border-[#064e3b] pb-3">
                <div className="flex items-center gap-3">
                  <img src="/Coop.jpeg" alt="UC-METC Logo" className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#064e3b] leading-tight m-0">University of Cebu METC-MPC</h2>
                    <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">Loans, Savings, and Investment Portal</p>
                  </div>
                </div>
                <div className="text-right">
                  <h1 className="text-sm font-extrabold uppercase text-neutral-900 tracking-wide m-0">Check Voucher</h1>
                  <p className="text-base font-mono font-extrabold text-[#064e3b] mt-0.5">CV #{cleanCvNumber(voucherNo)}</p>
                </div>
              </div>

              {/* Info Grid Card */}
              <div className="grid grid-cols-4 gap-4 bg-[#ecfdf5] p-3.5 rounded-xl border border-[#d1fae5]">
                <div>
                  <span className="text-[10px] font-bold text-[#059669] uppercase tracking-wider block">Voucher Date</span>
                  <p className="text-sm font-bold text-neutral-900 mt-1">{formatVoucherDateDisplay(voucherDate)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#059669] uppercase tracking-wider block">Name</span>
                  <p className="text-sm font-bold text-neutral-900 mt-1 uppercase">{payeeName || `${printLoan.first_name} ${printLoan.last_name}`}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#059669] uppercase tracking-wider block">Check No.</span>
                  <p className="text-sm font-mono font-bold text-[#064e3b] mt-1">{checkNo || 'PENDING'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#059669] uppercase tracking-wider block">Bank</span>
                  <p className="text-sm font-bold text-neutral-900 mt-1 uppercase">{bankName || '—'}</p>
                </div>
              </div>

              {/* Description Box */}
              <div className="bg-[#f9fafb] p-2.5 px-4 rounded-lg border border-[#e5e7eb] text-[11px]">
                <strong className="text-neutral-700">DESCRIPTION:</strong>{' '}
                <span className="text-neutral-900 italic">{voucherDescription}</span>
              </div>

              {/* Transaction Details Table */}
              <div className="border border-[#064e3b]/20 rounded-xl overflow-hidden">
                <div className="bg-[#064e3b] text-white py-1 px-3 text-[10px] font-bold uppercase tracking-wider text-center">
                  Transaction Details
                </div>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#ecfdf5] text-[#064e3b] font-bold text-[9.5px] uppercase tracking-wider border-b border-[#064e3b]/15">
                      <th className="py-2 px-3 w-9 text-center border-r border-[#064e3b]/10">#</th>
                      <th className="py-2 px-3 border-r border-[#064e3b]/10">Book of Accounts</th>
                      <th className="py-2 px-3 text-right w-32 border-r border-[#064e3b]/10">Debit (₱)</th>
                      <th className="py-2 px-3 text-right w-32">Credit (₱)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voucherRows.length > 0 ? (
                      voucherRows.map((r, idx) => (
                        <tr key={idx} className="border-b border-[#064e3b]/10 bg-white">
                          <td className="py-2 px-3 text-center font-mono text-neutral-500 border-r border-[#064e3b]/10">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-neutral-800 border-r border-[#064e3b]/10">
                            {r.description || '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900 border-r border-[#064e3b]/10">
                            {parseFloat(r.debit) > 0 ? parseFloat(r.debit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-[#dc2626] font-semibold">
                            {parseFloat(r.credit) > 0 ? parseFloat(r.credit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-neutral-400 italic">No transaction details</td>
                      </tr>
                    )}
                    <tr className="bg-[#f9fafb] font-bold text-[10.5px]">
                      <td colSpan={2} className="py-2 px-3 text-right text-neutral-700 uppercase tracking-wider border-r border-[#064e3b]/10">
                        Total:
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-neutral-900 border-r border-[#064e3b]/10">
                        ₱{voucherDebitTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#dc2626]">
                        ₱{voucherCreditTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Disbursed Amount Box */}
              <div className="flex justify-between items-center bg-[#ecfdf5] p-3 px-4 rounded-xl border border-[#d1fae5] gap-4">
                <div className="flex-1">
                  <span className="text-[9px] font-bold text-[#064e3b] uppercase tracking-wider block mb-1">
                    Disbursed Amount:
                  </span>
                  <p className="text-[11px] font-bold text-neutral-900 uppercase tracking-wide leading-snug m-0">
                    {formatDisbursedInWords(voucherDisbursedAmount)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-base font-mono font-extrabold text-[#064e3b]">
                    ₱{voucherDisbursedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Signatures Block */}
              <div className="pt-3 space-y-5 text-xs">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block">PREPARED BY:</span>
                    <div className="h-4"></div>
                    <p className="text-xs font-bold text-neutral-900 uppercase tracking-wider m-0 mb-1">{preparedBy || 'LAMOSTE'}</p>
                    <div className="border-b-[1.5px] border-neutral-900"></div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block">CHECKED BY:</span>
                    <div className="h-4"></div>
                    <p className="text-xs font-bold text-neutral-900 uppercase tracking-wider m-0 mb-1">{checkedBy || 'MARILOU LARIOSA'}</p>
                    <div className="border-b-[1.5px] border-neutral-900"></div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block">APPROVED BY:</span>
                    <div className="h-4"></div>
                    <p className="text-xs font-bold text-neutral-900 uppercase tracking-wider m-0 mb-1">{approvedBy || 'MICHELLE'}</p>
                    <div className="border-b-[1.5px] border-neutral-900"></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block">RECEIVED BY:</span>
                    <div className="h-6"></div>
                    <div className="border-b-[1.5px] border-neutral-900"></div>
                    <p className="text-[9px] text-neutral-500 mt-1">Signature over Printed Name</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider block">DATE:</span>
                    <div className="h-6"></div>
                    <div className="border-b-[1.5px] border-neutral-900"></div>
                  </div>
                  <div></div>
                </div>
              </div>

              {/* Document Footer */}
              <div className="flex justify-between items-center border-t border-neutral-200 pt-2 text-[8.5px] text-neutral-400">
                <div>
                  <div>Generated via UC-METC MPC Portal</div>
                  <div>KADT Solutions</div>
                </div>
                <span>Printed on: {printedDate || new Date().toLocaleString()}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-outline-variant/30">
              <div className="w-full sm:w-auto">
                {voucherModalFeedback && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${
                    voucherModalFeedback.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  }`}>
                    {voucherModalFeedback.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {voucherModalFeedback.message}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={closePrintModal}
                  className="px-5 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveVoucherModal}
                  disabled={isSavingVoucherModal}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Save check voucher edits to database"
                >
                  {isSavingVoucherModal ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PRINT AMORTIZATION SCHEDULE PREVIEW */}
      {isPrintModalOpen && printMode === 'schedule' && printLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30 mb-4">
              <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" /> Print Amortization Schedule
              </h3>
              <button
                onClick={closePrintModal}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Form */}
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-600 dark:text-neutral-400">Guarantor / Co-Maker Name</label>
                <input
                  type="text"
                  value={coMakerName}
                  onChange={(e) => setCoMakerName(e.target.value)}
                  placeholder="e.g. Michelle Pable"
                  className="w-full px-3.5 py-2 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none font-semibold text-on-surface dark:text-white"
                />
              </div>

              <div className="bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-2xl border border-outline-variant/60 space-y-3">
                <h5 className="font-bold text-on-surface dark:text-white text-xs">Schedule Statement Summary</h5>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <p><strong>Member Name:</strong> {printLoan.last_name}, {printLoan.first_name}</p>
                  <p><strong>Loan Product:</strong> {printLoan.product_name}</p>
                  <p><strong>Principal Amount:</strong> {formatCurrency(parseFloat(printLoan.principal_amount))}</p>
                  <p><strong>Total Repayment Periods:</strong> {printLoan.term_months} Months</p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={closePrintModal}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: PRINT RECEIPT PREVIEW */}
      {isPrintModalOpen && printMode === 'receipt' && printLoan && printPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[90vh] overflow-y-auto font-sans">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30 mb-4">
              <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" /> Official Payment Receipt
              </h3>
              <button
                onClick={closePrintModal}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Form */}
            <div className="space-y-4 text-xs">
              <div className="bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-2xl border border-outline-variant/60 space-y-3">
                <h5 className="font-bold text-on-surface dark:text-white text-xs">Receipt Statement Details</h5>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px]">
                  <p><strong>Receipt Number:</strong> OR-{new Date(printPayment.payment_date).getFullYear()}-{String(printPayment.id).padStart(6, '0')}</p>
                  <p><strong>Member Name:</strong> {printLoan.last_name}, {printLoan.first_name}</p>
                  <p><strong>Loan Product:</strong> {printLoan.product_name}</p>
                  <p><strong>Booking Date:</strong> {new Date(printPayment.payment_date).toLocaleString()}</p>
                  <p><strong>Payment Method:</strong> {printPayment.payment_method}</p>
                  <p><strong>Ref / Trace ID:</strong> {printPayment.reference_no || 'N/A'}</p>
                  <p className="col-span-2 text-xs border-t border-outline-variant/20 pt-2 mt-1">
                    <strong className="text-primary dark:text-secondary">Total Amount Paid:</strong> <strong className="text-sm text-primary dark:text-secondary">{formatCurrency(parseFloat(printPayment.amount))}</strong>
                  </p>
                  <p className="col-span-2 text-[9px] text-neutral-500">
                    * Breakdown: Principal paid: {formatCurrency(parseFloat(printPayment.principal_paid || 0))} | Interest paid: {formatCurrency(parseFloat(printPayment.interest_paid || 0))}
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={closePrintModal}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => downloadReceipt(printLoan, printPayment)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAYMENT TRANSACTION DETAILS */}
      {selectedPaymentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[90vh] overflow-y-auto font-sans">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-base sm:text-lg text-on-surface dark:text-white">
                    Payment Transaction
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    {getCleanReceiptIdentifier(selectedPaymentForModal)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPaymentForModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total Paid Hero Card */}
            <div className="bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-4 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Total Amount Remitted</span>
                <div className="font-mono text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-0.5">
                  {formatCurrency(parseFloat(selectedPaymentForModal.amount || 0))}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-xs">
                POSTED
              </span>
            </div>

            {/* Details Grid */}
            <div className="space-y-3.5 text-xs">
              {/* Borrower & Loan Info Card */}
              <div className="bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-2xl border border-outline-variant/60 space-y-3">
                <h5 className="font-headline font-bold text-xs text-on-surface dark:text-white uppercase tracking-wider text-neutral-500">
                  Account & Contract
                </h5>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 font-medium block">Borrower Member</span>
                    <strong className="text-on-surface dark:text-white">
                      {selectedPaymentForModal.last_name}, {selectedPaymentForModal.first_name} {selectedPaymentForModal.middle_name || ''}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 font-medium block">Member ID</span>
                    <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                      {selectedPaymentForModal.member_no || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 font-medium block">LAF Number</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {selectedPaymentForModal.laf_no || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 font-medium block">Loan Product</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedPaymentForModal.product_name || 'Regular Loan'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Allocation Breakdown Card */}
              <div className="bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-2xl border border-outline-variant/60 space-y-2.5">
                <h5 className="font-headline font-bold text-xs text-on-surface dark:text-white uppercase tracking-wider text-neutral-500">
                  Payment Ledger Breakdown
                </h5>
                <div className="space-y-2 pt-1 font-mono">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-sans text-neutral-600 dark:text-neutral-400">Applied to Principal</span>
                    <strong className="text-neutral-800 dark:text-neutral-200">
                      {formatCurrency(parseFloat(selectedPaymentForModal.principal_paid || 0))}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-sans text-neutral-600 dark:text-neutral-400">Applied to Interest / Charges</span>
                    <strong className="text-neutral-800 dark:text-neutral-200">
                      {formatCurrency(parseFloat(selectedPaymentForModal.interest_paid || 0))}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-outline-variant/30 pt-2 font-bold text-emerald-700 dark:text-emerald-400">
                    <span className="font-sans">Total Applied</span>
                    <span>{formatCurrency(parseFloat(selectedPaymentForModal.amount || 0))}</span>
                  </div>
                </div>
              </div>

              {/* Transaction Metadata Card */}
              <div className="bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-2xl border border-outline-variant/60 space-y-2.5">
                <h5 className="font-headline font-bold text-xs text-on-surface dark:text-white uppercase tracking-wider text-neutral-500">
                  Channel & Audit Information
                </h5>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-500 font-medium block">Payment Method</span>
                    <span className="font-semibold text-on-surface dark:text-white">
                      {formatDisplayPaymentMethod(selectedPaymentForModal.payment_method, selectedPaymentForModal.reference_no).label}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 font-medium block">Reference No.</span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">
                      {selectedPaymentForModal.reference_no || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 font-medium block">Payment Date</span>
                    <span className="text-neutral-800 dark:text-neutral-200">
                      {new Date(selectedPaymentForModal.payment_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 font-medium block">Timestamp</span>
                    <span className="font-mono text-[11px] text-neutral-500">
                      {new Date(selectedPaymentForModal.created_at || selectedPaymentForModal.payment_date).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-5 flex items-center justify-between gap-3 border-t border-outline-variant/30 mt-5">
              <button
                type="button"
                onClick={() => setSelectedPaymentForModal(null)}
                className="px-5 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const pay = selectedPaymentForModal;
                    setSelectedPaymentForModal(null);
                    handleDownloadPaymentReceipt(pay);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-outline-variant/60 rounded-full text-xs font-bold hover:bg-neutral/5 text-on-surface dark:text-white transition-all cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pay = selectedPaymentForModal;
                    setSelectedPaymentForModal(null);
                    handleViewPaymentReceipt(pay);
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>View Official Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: UNVERIFIED ACCOUNT NOTICE MODAL */}
      {isUnverifiedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto ring-8 ring-amber-500/5">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white">
                Account Profile Not Yet Verified
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
                Your account profile is currently unverified or pending review by Cooperative Management. You must complete your personal profile verification and receive Admin approval before applying for a credit line.
              </p>
            </div>

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-2xl text-xs text-left space-y-1.5 font-medium">
              <p className="font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                Required Actions:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-neutral-700 dark:text-neutral-300 pl-1">
                <li>Complete all profile details (TIN, Member Title, Address, etc.)</li>
                <li>Submit your profile for verification on the Profile Page</li>
                <li>Wait for Cooperative Admin review (typically 24–48 hours)</li>
              </ul>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href="/dashboard/profile"
                className="w-full sm:w-auto px-5 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold rounded-2xl text-xs shadow hover:opacity-90 transition-all text-center"
              >
                Go to Profile Verification
              </Link>
              <button
                type="button"
                onClick={() => setIsUnverifiedModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 border border-outline-variant/65 text-neutral-700 dark:text-neutral-300 font-bold rounded-2xl text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINT-ONLY CONTAINER */}
      {printLoan && printMode && typeof document !== 'undefined' && createPortal(
        <div id="print-section" className="hidden print:block text-black bg-white font-sans" style={{ fontFamily: 'sans-serif', color: '#000000', backgroundColor: '#ffffff', boxSizing: 'border-box' }}>
          {printMode === 'voucher' ? (
            /* Print-only Check Voucher Sheet Matching UC-METC Standard Format */
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
                  <p style={{ fontSize: '18px', fontFamily: 'monospace', color: '#064e3b', fontWeight: '800', margin: '3px 0 0 0', letterSpacing: '0.03em' }}>CV #{cleanCvNumber(voucherNo)}</p>
                </div>
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr 1fr 0.8fr', gap: '16px', backgroundColor: '#ecfdf5', padding: '16px 22px', borderRadius: '14px', border: '1px solid #d1fae5' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Voucher Date</span>
                  <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', margin: '3px 0 0 0' }}>
                    {formatVoucherDateDisplay(voucherDate)}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Name</span>
                  <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#1f2937', margin: '3px 0 0 0', textTransform: 'uppercase' }}>
                    {payeeName || `${printLoan.first_name} ${printLoan.last_name}`}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Check No.</span>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#064e3b', margin: '3px 0 0 0', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                    {checkNo || 'PENDING'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block', letterSpacing: '0.04em' }}>Bank</span>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937', margin: '3px 0 0 0', textTransform: 'uppercase' }}>
                    {bankName || '—'}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div style={{ backgroundColor: '#f9fafb', padding: '10px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '11px' }}>
                <strong style={{ color: '#374151' }}>DESCRIPTION:</strong>{' '}
                <span style={{ color: '#1f2937', fontStyle: 'italic' }}>
                  {voucherDescription}
                </span>
              </div>

              {/* Transaction Details Table */}
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
                      {voucherRows.length > 0 ? (
                        voucherRows.map((r, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(6, 78, 59, 0.08)', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fcfdfd' }}>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace', color: '#6b7280', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#1f2937', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>
                              {r.description || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#111827', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>
                              {parseFloat(r.debit) > 0 ? parseFloat(r.debit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626', fontWeight: 'bold' }}>
                              {parseFloat(r.credit) > 0 ? parseFloat(r.credit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr style={{ borderBottom: '1px solid rgba(6, 78, 59, 0.08)', backgroundColor: '#ffffff' }}>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace', color: '#6b7280', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>1</td>
                          <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#1f2937', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>Accounts Payable</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#111827', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>—</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#9ca3af' }}>—</td>
                        </tr>
                      )}
                      {/* Total row */}
                      <tr style={{ backgroundColor: '#f9fafb', fontWeight: 'bold', fontSize: '10px', borderTop: '1px solid rgba(6, 78, 59, 0.15)' }}>
                        <td colSpan={2} style={{ padding: '8px 12px', textAlign: 'right', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>
                          Total:
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#111827', borderRight: '1px solid rgba(6, 78, 59, 0.08)' }}>
                          ₱{voucherDebitTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>
                          ₱{voucherCreditTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      {formatDisbursedInWords(voucherDisbursedAmount)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: '15px', fontFamily: 'monospace', fontWeight: '800', color: '#064e3b' }}>
                      ₱{voucherDisbursedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

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
                      {preparedBy || 'LAMOSTE'}
                    </p>
                    <div style={{ borderBottom: '1.5px solid #111827' }}></div>
                  </div>

                  <div>
                    <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#374151', fontSize: '10px', display: 'block', letterSpacing: '0.04em' }}>
                      CHECKED BY:
                    </span>
                    <div style={{ height: '24px' }}></div>
                    <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#111827', margin: '0 0 5px 0', fontSize: '13px', letterSpacing: '0.02em' }}>
                      {checkedBy || 'MARILOU LARIOSA'}
                    </p>
                    <div style={{ borderBottom: '1.5px solid #111827' }}></div>
                  </div>

                  <div>
                    <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#374151', fontSize: '10px', display: 'block', letterSpacing: '0.04em' }}>
                      APPROVED BY:
                    </span>
                    <div style={{ height: '24px' }}></div>
                    <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#111827', margin: '0 0 5px 0', fontSize: '13px', letterSpacing: '0.02em' }}>
                      {approvedBy || 'MICHELLE'}
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
                <span>Printed on: {printedDate || new Date().toLocaleString()}</span>
              </div>
            </div>
          ) : printMode === 'schedule' ? (
            /* Print-only Amortization Table Sheet */
            <div className="w-full mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box', padding: '24px 32px' }}>
              {/* Brand Header */}
              <div className="border-b-2 border-emerald-800 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #064e3b', paddingBottom: '16px', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <img src="/Coop.jpeg" alt="UC-METC Multipurpose Cooperative Logo" style={{ height: '42px', width: '42px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                  <div>
                    <h2 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#064e3b', margin: 0 }}>University of Cebu METC-MPC</h2>
                    <p style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600', margin: '2px 0 0 0' }}>Loans, Savings, and Investment Portal</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <h1 style={{ fontSize: '12px', fontWeight: '800', color: '#111827', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap' }}>Official Loan Amortization</h1>
                  <p style={{ fontSize: '9px', fontFamily: 'monospace', color: '#6b7280', margin: '2px 0 0 0' }}>Contract #{printLoan.id}</p>
                </div>
              </div>

              {/* Modern Parameter Cards */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '16px', border: '1px solid #d1fae5', fontSize: '10px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Borrower Member</span>
                  <p style={{ fontWeight: 'bold', color: '#1f2937', margin: '2px 0 0 0' }}>{printLoan.last_name}, {printLoan.first_name}</p>
                  <p style={{ fontSize: '9px', color: '#6b7280', fontFamily: 'monospace', margin: '2px 0 0 0' }}>ID: #{printLoan.member_id || printLoan.borrower_id}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Loan Product</span>
                  <p style={{ fontWeight: 'bold', color: '#064e3b', margin: '2px 0 0 0' }}>{printLoan.product_name}</p>
                  <p style={{ fontSize: '9px', color: '#6b7280', textTransform: 'capitalize', margin: '2px 0 0 0' }}>{printLoan.amortization_type?.replace('_', ' ')}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Principal Amount</span>
                  <p style={{ fontWeight: 'bold', color: '#1f2937', margin: '2px 0 0 0' }}>{formatCurrency(parseFloat(printLoan.principal_amount))}</p>
                  <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>Interest: {(parseFloat(printLoan.interest_rate) * 100).toFixed(1)}% p.a.</p>
                </div>
                <div style={{ textAlign: 'right', flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Monthly Payment Due</span>
                  <p style={{ fontSize: '12px', fontWeight: '800', color: '#064e3b', margin: '2px 0 0 0' }}>
                    {formatCurrency(
                      printLoan.schedule && printLoan.schedule.length > 0
                        ? parseFloat(printLoan.schedule[0].principal_due) + parseFloat(printLoan.schedule[0].interest_due)
                        : 0
                    )}
                  </p>
                  <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>Term: {printLoan.term_months} Months</p>
                </div>
              </div>

              {/* Installments Table */}
              <div style={{ border: '1px solid rgba(6, 78, 59, 0.1)', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#064e3b', color: '#ffffff', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '8px 12px', borderRight: '1px solid rgba(4, 120, 87, 0.2)' }}>Month</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid rgba(4, 120, 87, 0.2)' }}>Principal Due (₱)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid rgba(4, 120, 87, 0.2)' }}>Interest Due (₱)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid rgba(4, 120, 87, 0.2)' }}>Total Due (₱)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid rgba(4, 120, 87, 0.2)' }}>Balance (₱)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', borderRight: '1px solid rgba(4, 120, 87, 0.2)' }}>Repayment Date</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', width: '96px' }}>Initial</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontFamily: 'monospace', fontSize: '9px' }}>
                    {(() => {
                      let printBalance = parseFloat(printLoan.principal_amount);
                      return printLoan.schedule?.map((sch: any) => {
                        const schTotal = parseFloat(sch.principal_due) + parseFloat(sch.interest_due);
                        if (printLoan.amortization_type === 'diminishing_balance') {
                          printBalance = Math.max(0, Math.round((printBalance - schTotal) * 100) / 100);
                        } else {
                          printBalance = Math.max(0, Math.round((printBalance - parseFloat(sch.principal_due)) * 100) / 100);
                        }
                        return (
                          <tr key={sch.id} style={{ borderBottom: '1px solid rgba(6, 78, 59, 0.05)' }}>
                            <td style={{ padding: '6px 12px', borderRight: '1px solid rgba(6, 78, 59, 0.05)', fontFamily: 'sans-serif', color: '#4b5563', fontWeight: 'bold' }}>{sch.installment_number}</td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid rgba(6, 78, 59, 0.05)', color: '#1f2937' }}>
                              {parseFloat(sch.principal_due).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid rgba(6, 78, 59, 0.05)', color: '#1f2937' }}>
                              {parseFloat(sch.interest_due).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 'bold', color: '#064e3b', borderRight: '1px solid rgba(6, 78, 59, 0.05)' }}>
                              {schTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid rgba(6, 78, 59, 0.05)', color: '#1f2937', fontWeight: 'bold' }}>
                              {printBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'right', borderRight: '1px solid rgba(6, 78, 59, 0.05)', fontFamily: 'sans-serif', color: '#4b5563' }}>
                              {new Date(sch.due_date).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'center', color: '#d1d5db', fontFamily: 'sans-serif' }}>______</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Declaration of Agreement */}
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '16px', border: '1px solid #f3f4f6', fontSize: '10px', lineHeight: '1.625', color: '#4b5563' }}>
                <p style={{ margin: 0 }}><strong>DECLARATION OF AGREEMENT:</strong> I hereby acknowledge receipt of the loan principal proceeds and certify that I have read, understood, and agreed to follow the amortization schedule outlined above. I promise to pay the installments on or before their respective due dates.</p>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', paddingTop: '32px', fontSize: '9px', textAlign: 'center' }}>
                <div style={{ flex: 1, backgroundColor: 'rgba(249, 250, 251, 0.4)', padding: '12px', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#1f2937', margin: 0 }}>{printLoan.last_name}, {printLoan.first_name}</p>
                  <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '8px 0' }}></div>
                  <p style={{ color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', margin: 0 }}>Signature of Borrower</p>
                </div>
                <div style={{ flex: 1, backgroundColor: 'rgba(249, 250, 251, 0.4)', padding: '12px', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#1f2937', margin: 0 }}>{coMakerName || 'N/A (Guarantor)'}</p>
                  <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '8px 0' }}></div>
                  <p style={{ color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', margin: 0 }}>Signature of Co-Maker</p>
                </div>
              </div>
            </div>
          ) : (
            /* Print-only Official Receipt Sheet */
            <div className="w-full mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box', padding: '24px 32px' }}>
              {/* Brand Header */}
              {/* Brand Header */}
              <div className="border-b-2 border-emerald-800 pb-3.5" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #064e3b', paddingBottom: '14px', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                  <img src="/Coop.jpeg" alt="UC-METC Multipurpose Cooperative Logo" style={{ height: '48px', width: '48px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                  <div>
                    <h2 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#064e3b', margin: 0 }}>University of Cebu - METC MPC</h2>
                    <p style={{ fontSize: '10px', color: '#374151', fontWeight: '600', margin: '2px 0 0 0' }}>Multipurpose Cooperative • Alumnos, Mambaling, Cebu City</p>
                    <p style={{ fontSize: '8.5px', color: '#6b7280', margin: '2px 0 0 0' }}>CDA Reg. No. 9520-07000123 | CIN: 0102070123</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <h1 style={{ fontSize: '13px', fontWeight: '800', color: '#064e3b', textTransform: 'uppercase', margin: 0, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>Official Payment Receipt</h1>
                  <p style={{ fontSize: '15px', fontFamily: 'monospace', color: '#111827', fontWeight: '800', margin: '2px 0 0 0' }}>
                    OR-{new Date(printPayment.payment_date).getFullYear()}-{String(printPayment.receipt_no || printPayment.reference_no || printPayment.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}
                  </p>
                  <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    {new Date(printPayment.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} • {new Date(printPayment.payment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Modern Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 1fr', gap: '14px', backgroundColor: '#ecfdf5', padding: '14px 18px', borderRadius: '12px', border: '1px solid #a7f3d0', fontSize: '10px' }}>
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#047857', textTransform: 'uppercase', display: 'block', letterSpacing: '0.03em' }}>Received From (Borrower)</span>
                  <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', margin: '2px 0 0 0' }}>{printLoan.last_name}, {printLoan.first_name}</p>
                  <p style={{ fontSize: '9px', color: '#4b5563', fontFamily: 'monospace', margin: '2px 0 0 0' }}>Member ID: {printLoan.member_no || `#${printLoan.member_id || printLoan.borrower_id}`}</p>
                </div>
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#047857', textTransform: 'uppercase', display: 'block', letterSpacing: '0.03em' }}>Loan Reference</span>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', margin: '2px 0 0 0' }}>
                    {printLoan.laf_no ? `LAF #${printLoan.laf_no}` : (printLoan.product_name || 'Regular Loan')}
                  </p>
                  <p style={{ fontSize: '9px', color: '#059669', fontWeight: 'bold', margin: '2px 0 0 0' }}>Status: Posted to Ledger</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#047857', textTransform: 'uppercase', display: 'block', letterSpacing: '0.03em' }}>Payment Channel</span>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', margin: '2px 0 0 0' }}>{printPayment.payment_method || 'Salary Deduction'}</p>
                  <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>Ref: {printPayment.reference_no || 'SD'}</p>
                </div>
              </div>

              {/* Receipt Summary Table */}
              <div style={{ border: '1px solid rgba(6, 78, 59, 0.18)', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#064e3b', color: '#ffffff', fontWeight: 'bold', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '9px 14px' }}>Payment Allocation Details</th>
                      <th style={{ padding: '9px 14px', textAlign: 'right', width: '192px', borderLeft: '1px solid rgba(4, 120, 87, 0.2)' }}>Amount Received (₱)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 'bold', color: '#111827', display: 'block', fontSize: '11px' }}>Applied to Loan Principal</span>
                        <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>Principal recovery allocated for Contract {printLoan.laf_no ? `LAF #${printLoan.laf_no}` : `#${printLoan.id}`} ({printLoan.product_name || 'Loan'})</p>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#111827', borderLeft: '1px solid #e5e7eb' }}>
                        {parseFloat(printPayment.principal_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 'bold', color: '#111827', display: 'block', fontSize: '11px' }}>Applied to Loan Interest</span>
                        <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>Interest earned / collected on active balance</p>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#111827', borderLeft: '1px solid #e5e7eb' }}>
                        {parseFloat(printPayment.interest_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', fontSize: '10.5px', borderTop: '1.5px solid #064e3b' }}>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: '#064e3b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL PAID AMOUNT</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b', borderLeft: '1px solid rgba(6, 78, 59, 0.1)', fontSize: '13px' }}>
                        ₱{parseFloat(printPayment.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Amount in Words Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', padding: '12px 18px', borderRadius: '10px', border: '1px solid #bbf7d0', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>
                    Amount Received in Words:
                  </span>
                  <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.4 }}>
                    {formatDisbursedInWords(parseFloat(printPayment.amount || 0))}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: '17px', fontFamily: 'monospace', fontWeight: '800', color: '#064e3b' }}>
                    ₱{parseFloat(printPayment.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Declaration Note */}
              <div style={{ backgroundColor: '#f9fafb', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '9px', lineHeight: '1.5', color: '#4b5563' }}>
                <strong style={{ color: '#1f2937' }}>RECEIPT STATUS:</strong> This is an official system-generated billing receipt acknowledging the payment booking of the specified amount under credit contract {printLoan.laf_no ? `LAF #${printLoan.laf_no}` : `#${printLoan.id}`}. The borrower&apos;s outstanding amortization ledger has been credited accordingly.
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', paddingTop: '16px', fontSize: '9.5px', textAlign: 'center' }}>
                <div>
                  <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#374151', fontSize: '9px', display: 'block', letterSpacing: '0.04em' }}>
                    RECEIVED / POSTED BY:
                  </span>
                  <div style={{ height: '28px' }}></div>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#111827', margin: '0 0 4px 0', fontSize: '11.5px', letterSpacing: '0.02em' }}>
                    {releasedBy || 'Authorized Co-op Staff'}
                  </p>
                  <div style={{ borderBottom: '1.5px solid #111827', margin: '0 8px 4px 8px' }}></div>
                  <span style={{ fontSize: '8.5px', color: '#6b7280', textTransform: 'uppercase' }}>Cashier / Posting Clerk</span>
                </div>

                <div>
                  <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#374151', fontSize: '9px', display: 'block', letterSpacing: '0.04em' }}>
                    VERIFIED & CHECKED BY:
                  </span>
                  <div style={{ height: '28px' }}></div>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#111827', margin: '0 0 4px 0', fontSize: '11.5px', letterSpacing: '0.02em' }}>
                    Accounting Officer
                  </p>
                  <div style={{ borderBottom: '1.5px solid #111827', margin: '0 8px 4px 8px' }}></div>
                  <span style={{ fontSize: '8.5px', color: '#6b7280', textTransform: 'uppercase' }}>Bookkeeper / Manager</span>
                </div>

                <div>
                  <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#374151', fontSize: '9px', display: 'block', letterSpacing: '0.04em' }}>
                    ACKNOWLEDGED BY:
                  </span>
                  <div style={{ height: '28px' }}></div>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#064e3b', margin: '0 0 4px 0', fontSize: '11.5px', letterSpacing: '0.02em' }}>
                    {printLoan.last_name}, {printLoan.first_name}
                  </p>
                  <div style={{ borderBottom: '1.5px solid #064e3b', margin: '0 8px 4px 8px' }}></div>
                  <span style={{ fontSize: '8.5px', color: '#047857', textTransform: 'uppercase' }}>Borrower / Payor</span>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* DYNAMIC STYLE INJECTION FOR CLEAN PRINTING */}
      <style dangerouslySetInnerHTML={{
        __html: `
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
          /* Hide everything in body EXCEPT the print section portal */
          body > *:not(#print-section):not(#purchase-cv-print-section):not(#cv-breakdown-print-section):not(#coop-printable-lf-sheet) {
            display: none !important;
          }
          /* Show and size the print section */
          #print-section, #purchase-cv-print-section, #cv-breakdown-print-section {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          #coop-printable-lf-sheet {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            box-sizing: border-box !important;
            padding: 14mm 24mm 20mm 24mm !important;
            margin: 0 auto !important;
          }
        }
      `}} />
      {/* UNIFIED DIALOGUE / CONFIRM MODAL */}
      {dialogConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-sm shadow-2xl p-6 relative animate-modal-pop text-center space-y-4">
            {/* Header Icon */}
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold">
              {dialogConfig.type === 'success' && (
                <div className="bg-primary/10 dark:bg-emerald-500/10 text-primary dark:text-emerald-400 p-3 rounded-full">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}
              {dialogConfig.type === 'error' && (
                <div className="bg-tertiary/10 text-tertiary p-3 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              )}
              {dialogConfig.type === 'confirm' && (
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <Info className="w-6 h-6" />
                </div>
              )}
              {dialogConfig.type === 'danger' && (
                <div className="bg-tertiary/10 text-tertiary p-3 rounded-full">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              )}
            </div>

            {/* Title & Message */}
            <div className="space-y-1.5">
              <h3 className="font-headline font-bold text-base text-on-surface dark:text-white capitalize">
                {dialogConfig.title}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed px-2">
                {dialogConfig.message}
              </p>
            </div>

            {/* Actions Grid */}
            <div className="flex gap-3 pt-2">
              {dialogConfig.cancelText && (
                <button
                  type="button"
                  onClick={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                >
                  {dialogConfig.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setDialogConfig((prev) => ({ ...prev, isOpen: false }));
                  dialogConfig.onConfirm();
                }}
                className={`flex-1 py-2.5 text-white dark:text-neutral-950 font-bold rounded-full text-xs hover:shadow-lg transition-all active:scale-95 cursor-pointer ${dialogConfig.type === 'danger'
                  ? 'bg-tertiary'
                  : 'bg-primary dark:bg-secondary'
                  }`}
              >
                {dialogConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function LoansPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={5} cols={6} />}>
      <LoansPageContent />
    </Suspense>
  );
}
