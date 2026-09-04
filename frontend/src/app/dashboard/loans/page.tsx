'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  Lock,
  Maximize2,
  Minimize2
} from 'lucide-react';

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
  status: 'pending_approval' | 'disbursed' | 'fully_paid' | 'rejected' | 'defaulted';
  created_at: string;
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
  const statusParam = searchParams.get('status');

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'staff';
  const isVerified = isAdminOrManager || user?.profile?.status === 'approved' || user?.profile?.status === 'active' || user?.profile?.is_verified === true;

  const [activeTab, setActiveTab] = useState<'loans' | 'products' | 'calculator'>('loans');
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

  // Print & Document Generation States
  const [printLoan, setPrintLoan] = useState<any>(null);
  const [printPayment, setPrintPayment] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'voucher' | 'schedule' | 'receipt' | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Voucher Template State Fields
  const [voucherNo, setVoucherNo] = useState('');
  const [bankName, setBankName] = useState('Land Bank of the Philippines');
  const [checkNo, setCheckNo] = useState('');
  const [preparedBy, setPreparedBy] = useState('Cooperative Staff');
  const [approvedBy, setApprovedBy] = useState('Credit Committee Chair');
  const [releasedBy, setReleasedBy] = useState('Michelle Pable');

  const openVoucherModal = (loanObj: any) => {
    setPrintLoan(loanObj);
    setPrintMode('voucher');
    setIsPrintModalOpen(true);
    setVoucherNo(`CV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(loanObj.id).substring(0, 4).toUpperCase()}`);
    setCheckNo('');
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
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 794px;
      padding: 40px;
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
        logging: false
      });

      const link = document.createElement('a');
      link.download = `Receipt_${receiptNo}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to generate image from print element:', err);
    } finally {
      document.body.removeChild(clone);
      // Revert temporary state changes if they were not already configured by user interaction
      if (!alreadyConfigured) {
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
        return;
      }
      try {
        setLoadingMemberSummary(true);
        const res = await api.get(`/members/${applyMemberId}/dashboard-summary`);
        setSelectedMemberSummary(res.data.data);
      } catch (err) {
        console.error('Error fetching selected member summary:', err);
      } finally {
        setLoadingMemberSummary(false);
      }
    };
    fetchSelectedMemberSummary();
  }, [applyMemberId]);

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
          showDialog('Application Rejected', 'Application successfully rejected.', 'success');
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

  const openApplyModal = () => {
    if (!isAdminOrManager && !isVerified) {
      setIsUnverifiedModalOpen(true);
      return;
    }
    setWizardStep(1);
    setSelectedProduct(null);
    setSelectedLoanCategory(LOAN_CATEGORIES.REGULAR);
    setApplyMemberId(!isAdminOrManager && user?.profile?.id ? String(user.profile.id) : '');
    setApplyAmount(0);
    setCoMakerName('');
    setCoMakerPhone('');
    setSuccessData(null);
    setApplyError(null);
    setIsApplyModalOpen(true);
  };

  const handleApplyLoanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!applyMemberId || !selectedProduct || !applyAmount) {
      setApplyError('Please fill in all requested fields.');
      return;
    }

    // Enforce co-maker details check if principal exceeds member's CBU
    const shareCapital = selectedMemberSummary?.balances?.share_capital || 0;
    const coMakerRequired = applyAmount > shareCapital;
    if (coMakerRequired && !coMakerName.trim()) {
      setApplyError('A Co-Maker is required since the loan amount exceeds 100% of Share Capital.');
      return;
    }

    setApplyError(null);
    setApplySubmitting(true);

    try {
      const response = await api.post('/loans', {
        member_id: applyMemberId,
        loan_product_id: selectedProduct.id,
        principal_amount: applyAmount,
        term_months: applyTermMonths,
        co_maker_name: coMakerRequired ? coMakerName : null,
        co_maker_phone: coMakerRequired ? coMakerPhone : null
      });

      setSuccessData(response.data.data);
      setWizardStep(3);

      // Reset state fields
      setApplyAmount(0);
      setCoMakerName('');
      setCoMakerPhone('');
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
            {isAdminOrManager && (
              <button
                onClick={() => setIsRepaymentModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral/5 transition-all shadow-sm"
              >
                <CreditCard className="w-4 h-4 text-tertiary" />
                Book Repayment
              </button>
            )}
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
            className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'loans'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
              }`}
          >
            Credit Contracts List
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'products'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
              }`}
          >
            Loan Products Registry
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'calculator'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
              }`}
          >
            Amortization Calculator
          </button>
        </div>

        {/* TABS CONTAINER */}
        {activeTab === 'loans' ? (
          <div className="space-y-6">
            {/* Filter & Sort Desk */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm">
              <div className="w-full lg:w-auto flex-1 max-w-md">
                <SearchInput
                  placeholder="Search borrower, loan product, contract ID..."
                  onSearch={(val) => {
                    setLoansSearch(val);
                    setLoansPage(1);
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
                    className="px-3 py-2 text-xs border border-outline-variant rounded-xl bg-white dark:bg-surface-container-low focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white cursor-pointer"
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
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
                    <option value="disbursed">Active / Disbursed</option>
                    <option value="fully_paid">Fully Paid</option>
                    <option value="rejected">Rejected</option>
                    <option value="defaulted">Defaulted</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loans List */}
            {loansLoading ? (
              <SkeletonTable rows={5} cols={6} />
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
                    const q = loansSearch.toLowerCase().trim();
                    if (q) {
                      const bName = `${loan.last_name || ''} ${loan.first_name || ''}`.toLowerCase();
                      const pName = (loan.product_name || '').toLowerCase();
                      const idStr = String(loan.id || '').toLowerCase();
                      const statusStr = (loan.status || '').toLowerCase();
                      const matches = bName.includes(q) || pName.includes(q) || idStr.includes(q) || statusStr.includes(q);
                      if (!matches) return false;
                    }
                    return true;
                  })
                  .sort((a, b) => {
                    if (loansSortBy === 'date_desc') {
                      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                    }
                    if (loansSortBy === 'date_asc') {
                      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
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
                          Credit Contracts Table
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
                              <th className="px-6 py-4">ID</th>
                              {isAdminOrManager && (
                                <th className="px-6 py-4">Borrower Member</th>
                              )}
                              <th className="px-6 py-4">Loan Product</th>
                              <th className="px-6 py-4">Principal Amount</th>
                              <th className="px-6 py-4">Interest (Term)</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4 text-right">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30 font-body text-xs text-on-surface dark:text-white/90">
                            {visibleLoans.length === 0 ? (
                              <tr>
                                <td colSpan={isAdminOrManager ? 7 : 6} className="px-6 py-8 text-center text-neutral-500 italic">
                                  No contracts found matching search criteria.
                                </td>
                              </tr>
                            ) : (
                              visibleLoans.map((loan) => {
                                const isExpanded = expandedLoanId === loan.id;
                                return (
                                  <React.Fragment key={loan.id}>
                                    <tr className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                                      <td className="px-6 py-4 font-mono font-bold">#{loan.id}</td>
                                      {isAdminOrManager && (
                                        <td className="px-6 py-4 font-semibold">
                                          {loan.last_name}, {loan.first_name}
                                        </td>
                                      )}
                                      <td className="px-6 py-4 font-semibold text-primary dark:text-secondary">{loan.product_name || 'Legacy Product'}</td>
                                      <td className="px-6 py-4 font-bold">{formatCurrency(parseFloat(loan.principal_amount))}</td>
                                      <td className="px-6 py-4 font-mono">
                                        {parseFloat(loan.interest_rate)}% ({loan.term_months}mo)
                                      </td>
                                      <td className="px-6 py-4">{getStatusBadge(loan.status)}</td>
                                      <td className="px-6 py-4 text-right">
                                        <button
                                          onClick={() => toggleLoanExpand(loan.id)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all text-[11px] font-bold cursor-pointer"
                                        >
                                          {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                          Amortization
                                        </button>
                                      </td>
                                    </tr>

                                    {/* Expanded Details Row */}
                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={isAdminOrManager ? 7 : 6} className="px-6 py-6 bg-surface dark:bg-surface-container-high/30 border-y border-outline-variant/40">
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
                                                </div>

                                                {/* Action Buttons: Check Voucher, Print Schedule, Excel Export, Disburse / Reject */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                  {isAdminOrManager && (
                                                    <button
                                                      type="button"
                                                      onClick={() => openVoucherModal(loanDetails)}
                                                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-outline-variant bg-white dark:bg-surface-container-low hover:bg-neutral-50 dark:hover:bg-neutral-800 text-on-surface dark:text-white font-bold rounded-full text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                                                      title="Generate and print check disbursement voucher"
                                                    >
                                                      <Printer className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                                      Check Voucher
                                                    </button>
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

                                                  {isAdminOrManager && loan.status === 'pending_approval' && (
                                                    <>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleRejectLoan(loan.id)}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-tertiary/40 bg-tertiary/10 hover:bg-tertiary/20 text-tertiary font-bold rounded-full text-xs transition-all active:scale-95 cursor-pointer"
                                                      >
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        Reject
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleDisburseLoan(loan.id)}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold rounded-full text-xs shadow hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                                                      >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Approve & Disburse
                                                      </button>
                                                    </>
                                                  )}
                                                </div>
                                              </div>

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
                                                                  className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-750 dark:text-emerald-300 border border-emerald-250/30 hover:bg-emerald-100 hover:border-emerald-300 rounded-lg text-[9px] font-bold tracking-wide transition-all active:scale-95 flex items-center gap-1"
                                                                >
                                                                  <Download className="w-2.5 h-2.5" /> Download
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
        ) : activeTab === 'calculator' ? (
          <div className="space-y-6">
            <LoanAmortizationCalculator />
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
                <div className="space-y-6">
                  {/* Select Member dropdown */}
                  <div className="space-y-1.5 max-w-md">
                    <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-bold text-xs uppercase">Select Member Borrower *</label>
                    <select
                      required
                      value={applyMemberId}
                      onChange={(e) => setApplyMemberId(e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-surface border border-outline-variant/65 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none text-sm text-on-surface dark:text-white font-semibold"
                    >
                      <option value="">-- Choose Member Profile --</option>
                      {members.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.last_name}, {m.first_name} (ID: {m.member_no || 'N/A'})
                        </option>
                      ))}
                    </select>
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
                                      setApplyAmount(parseFloat(filtered[0].min_amount));
                                      setApplyTermMonths(filtered[0].term_months);
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

                          <div className="text-[11px] font-bold text-neutral-500/90 flex items-center gap-2 mt-2.5 bg-neutral/5 dark:bg-neutral/10 p-2 px-3.5 rounded-2xl border border-outline-variant/30">
                            <Info className="w-4 h-4 text-primary dark:text-secondary flex-shrink-0" />
                            {selectedLoanCategory === LOAN_CATEGORIES.REGULAR ? (
                              <span>Coop Policy Limit: <strong className="text-primary dark:text-secondary font-extrabold">1 active Regular Loan</strong> at a time. <span className="text-neutral-500 dark:text-neutral-400 font-medium">(Current: {activeRegularCount} / 1)</span></span>
                            ) : (
                              <span>Coop Policy Limit: Up to <strong className="text-primary dark:text-secondary font-extrabold">3 active Short Term Loans (STLs)</strong> concurrently. <span className="text-neutral-500 dark:text-neutral-400 font-medium">(Current: {activeStlCount} / 3)</span></span>
                            )}
                          </div>
                        </div>

                        {/* Lock / Re-borrowing Unlocked & Share Capital Banners */}
                        {selectedMemberSummary && parseFloat(selectedMemberSummary?.balances?.share_capital || 0) === 0 && (
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
                        {isRegularLocked && (
                          <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2.5 font-semibold">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <span>You cannot apply for a new Regular Loan because this member already has an active Regular Loan.</span>
                          </div>
                        )}
                        {hasStl1MonthRepayment && selectedLoanCategory === LOAN_CATEGORIES.STL && (
                          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs flex gap-2.5 font-semibold">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span><strong>STL Re-borrowing Unlocked:</strong> Users can loan again on STL after 1 month term of repayment (even if the term is more than 1month and this applies if they have 3 current loans on STL). At least one of your active STLs has reached 1 month of repayment!</span>
                          </div>
                        )}
                        {isStlLocked && (
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
                                    const isDisabled = isExceedingCap || isRegularLocked || isStlLocked;

                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => {
                                          if (isDisabled) return;
                                          setSelectedProduct(p);
                                          setApplyAmount(parseFloat(p.min_amount));
                                          setApplyTermMonths(p.term_months);
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
                                            {isExceedingCap && (
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

                                        {isExceedingCap ? (
                                          <p className="text-[9px] text-tertiary font-bold mt-2 flex items-center justify-center gap-1">
                                            <AlertTriangle className="w-3 h-3 inline" /> Min ₱{parseFloat(p.min_amount).toLocaleString()} exceeds remaining capacity (₱{remCap.toLocaleString()}).
                                          </p>
                                        ) : isRegularLocked ? (
                                          <p className="text-[9px] text-tertiary font-bold mt-2 flex items-center justify-center gap-1">
                                            <AlertTriangle className="w-3 h-3 inline" /> Regular Loan category locked (Max 1 active).
                                          </p>
                                        ) : isStlLocked ? (
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
                            disabled={!applyMemberId || !selectedProduct || isRegularLocked || isStlLocked}
                            onClick={() => {
                              if (selectedProduct) {
                                setApplyTermMonths(selectedProduct.term_months);
                                const activePrincipal = parseFloat(selectedMemberSummary?.loans?.active_principal || selectedMemberSummary?.loans?.outstanding_balance || 0);
                                const shareCap = selectedMemberSummary?.balances?.share_capital || 0;
                                const histCount = selectedMemberSummary?.loans?.historical_count || 0;
                                const mult = histCount === 0 ? 0.8 : histCount === 1 ? 2.0 : 3.0;
                                const remainingCap = Math.max(0, (mult * shareCap) - activePrincipal);
                                const initAmt = Math.min(parseFloat(selectedProduct.max_amount), remainingCap);
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
                const shareCapital = selectedMemberSummary?.balances?.share_capital || 0;
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

                // Adjust slider cap based on remaining capacity
                const maxProductCap = parseFloat(selectedProduct.max_amount) || remainingCapacity;
                const maxSliderCap = Math.min(maxProductCap, remainingCapacity);

                const rawMinProduct = parseFloat(selectedProduct.min_amount) || 1000;
                const minSliderCap = Math.min(rawMinProduct, maxSliderCap);

                const currentAmountValue = Math.max(minSliderCap, Math.min(applyAmount || maxSliderCap, maxSliderCap));

                const coMakerRequired = currentAmountValue > shareCapital;
                const submitDisabled = applySubmitting || (coMakerRequired && !coMakerName.trim());

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
                                    // Diminishing straight-line principal Month 1 payment
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
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    A new loan application has been registered under ID <strong className="text-on-surface dark:text-white font-bold font-mono">#{successData?.id || 'N/A'}</strong> with status <strong className="text-amber-500 font-bold">Pending Approval</strong>.
                  </p>
                  <div className="pt-4">
                    <button
                      onClick={() => setIsApplyModalOpen(false)}
                      className="w-full py-3.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity cursor-pointer text-sm"
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
      {/* MODAL 4: PRINT CHECK VOUCHER PREVIEW */}
      {isPrintModalOpen && printMode === 'voucher' && printLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30 mb-4">
              <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" /> Generate Check Voucher
              </h3>
              <button
                onClick={closePrintModal}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Form & Preview */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-600 dark:text-neutral-400">Voucher Number</label>
                  <input
                    type="text"
                    value={voucherNo}
                    onChange={(e) => setVoucherNo(e.target.value)}
                    placeholder="e.g. CV-2026-07-001"
                    className="w-full px-3.5 py-2 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none font-semibold text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-600 dark:text-neutral-400">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Land Bank"
                    className="w-full px-3.5 py-2 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none font-semibold text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-600 dark:text-neutral-400">Check Reference Number</label>
                <input
                  type="text"
                  value={checkNo}
                  onChange={(e) => setCheckNo(e.target.value)}
                  placeholder="e.g. 000492819 (or leave blank if pending)"
                  className="w-full px-3.5 py-2 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none font-semibold text-on-surface dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-600 dark:text-neutral-400">Prepared By</label>
                  <input
                    type="text"
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-surface border border-outline-variant rounded-xl text-[11px] font-semibold text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-600 dark:text-neutral-400">Approved By</label>
                  <input
                    type="text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-surface border border-outline-variant rounded-xl text-[11px] font-semibold text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-600 dark:text-neutral-400">Released By</label>
                  <input
                    type="text"
                    value={releasedBy}
                    onChange={(e) => setReleasedBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-surface border border-outline-variant rounded-xl text-[11px] font-semibold text-on-surface dark:text-white"
                  />
                </div>
              </div>

              {/* Mini Sheet Preview */}
              <div className="bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-2xl border border-outline-variant/60 space-y-4 mt-2">
                <div className="text-center pb-2 border-b border-outline-variant">
                  <h4 className="font-bold text-neutral-800 dark:text-neutral-100 text-xs">University of Cebu Cooperative</h4>
                  <p className="text-[10px] text-neutral-500 font-semibold">CHECK DISBURSEMENT VOUCHER PREVIEW</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <p><strong>Payee:</strong> {printLoan.last_name}, {printLoan.first_name}</p>
                  <p className="text-right"><strong>Amount:</strong> <span className="font-bold text-primary dark:text-secondary">{formatCurrency(parseFloat(printLoan.principal_amount))}</span></p>
                </div>
                <div className="border border-outline-variant bg-white dark:bg-surface rounded-xl p-3 text-[10px] leading-normal space-y-2">
                  <div className="flex justify-between font-bold border-b pb-1 text-neutral-700 dark:text-neutral-300">
                    <span>Account Title & Description</span>
                    <div className="flex gap-6">
                      <span>Debit</span>
                      <span>Credit</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-bold text-on-surface dark:text-white block">Loans Receivable — {printLoan.product_name || 'Regular Loan'}</span>
                      <span className="text-[9px] text-neutral-500">Ref: {printLoan.laf_no ? `LAF #${printLoan.laf_no}` : `Contract #${String(printLoan.id).slice(0, 8).toUpperCase()}`}</span>
                    </div>
                    <div className="flex gap-6 font-mono font-bold">
                      <span className="text-on-surface dark:text-white">{parseFloat(printLoan.principal_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <span className="text-neutral-400">—</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-bold text-on-surface dark:text-white block">Cash in Bank — {bankName}</span>
                      <span className="text-[9px] text-neutral-500">Check #: {checkNo || 'PENDING'}</span>
                    </div>
                    <div className="flex gap-6 font-mono font-bold">
                      <span className="text-neutral-400">—</span>
                      <span className="text-primary dark:text-secondary">{parseFloat(printLoan.principal_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
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
      {printLoan && printMode && (
        <div id="print-section" className="hidden print:block text-black bg-white p-6 font-sans" style={{ fontFamily: 'sans-serif', color: '#000000', backgroundColor: '#ffffff' }}>
          {printMode === 'voucher' ? (
            /* Print-only Check Voucher Sheet (Identical Format to Loan Amortization) */
            <div className="max-w-4xl mx-auto p-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Brand Header */}
              <div className="border-b-2 border-emerald-800 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #064e3b', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/Coop Sync_logo.png" alt="Coop Sync Logo" style={{ height: '36px', width: 'auto', display: 'block', objectFit: 'contain' }} />
                  <div>
                    <h2 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#064e3b', margin: 0 }}>University of Cebu Cooperative</h2>
                    <p style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600', margin: '2px 0 0 0' }}>Coop Sync Loan Management Portal</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ fontSize: '12px', fontWeight: '800', color: '#111827', textTransform: 'uppercase', margin: 0 }}>Check Disbursement Voucher</h1>
                  <p style={{ fontSize: '9px', fontFamily: 'monospace', color: '#6b7280', margin: '2px 0 0 0' }}>{voucherNo}</p>
                </div>
              </div>

              {/* Modern Info Grid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '16px', border: '1px solid #d1fae5', fontSize: '10px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Payee Member</span>
                  <p style={{ fontWeight: 'bold', color: '#1f2937', margin: '2px 0 0 0' }}>{printLoan.last_name}, {printLoan.first_name}</p>
                  <p style={{ fontSize: '9px', color: '#6b7280', fontFamily: 'monospace', margin: '2px 0 0 0' }}>ID: #{printLoan.member_id || printLoan.borrower_id}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Check Reference</span>
                  <p style={{ fontWeight: 'bold', color: '#064e3b', margin: '2px 0 0 0' }}>{checkNo || 'PENDING RELEASE'}</p>
                  <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>{bankName}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Disbursement Amount</span>
                  <p style={{ fontSize: '12px', fontWeight: '800', color: '#064e3b', margin: '2px 0 0 0' }}>{formatCurrency(parseFloat(printLoan.principal_amount))}</p>
                  <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>{new Date(printLoan.disbursement_date || printLoan.created_at).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right', flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Loan Product</span>
                  <p style={{ fontWeight: 'bold', color: '#1f2937', margin: '2px 0 0 0' }}>{printLoan.product_name || 'Standard'}</p>
                  <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>{printLoan.term_months} Mos ({printLoan.payment_mode || 'Standard'})</p>
                </div>
              </div>

              {/* Simplified Debit/Credit Table */}
              <div style={{ border: '1px solid rgba(6, 78, 59, 0.1)', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#064e3b', color: '#ffffff', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '8px 12px', borderRight: '1px solid rgba(4, 120, 87, 0.2)' }}>Account Title & Description</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', width: '140px', borderRight: '1px solid rgba(4, 120, 87, 0.2)' }}>Debit (₱)</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', width: '140px' }}>Credit (₱)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(6, 78, 59, 0.05)' }}>
                      <td style={{ padding: '10px 12px', borderRight: '1px solid rgba(6, 78, 59, 0.05)' }}>
                        <span style={{ fontWeight: 'bold', color: '#1f2937', display: 'block' }}>Receivables - Loans ({printLoan.product_name || 'Standard'})</span>
                        <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>Disbursement of principal amount for Contract #{printLoan.id}</p>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#1f2937', borderRight: '1px solid rgba(6, 78, 59, 0.05)' }}>
                        {parseFloat(printLoan.principal_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#9ca3af' }}>-</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(6, 78, 59, 0.05)' }}>
                      <td style={{ padding: '10px 12px', borderRight: '1px solid rgba(6, 78, 59, 0.05)' }}>
                        <span style={{ fontWeight: 'bold', color: '#1f2937', display: 'block' }}>Cash in Bank</span>
                        <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>Check drawn on {bankName} (Ref No: {checkNo || 'N/A'})</p>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#9ca3af', borderRight: '1px solid rgba(6, 78, 59, 0.05)' }}>-</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#064e3b' }}>
                        {parseFloat(printLoan.principal_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', fontSize: '10px' }}>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: '#064e3b', borderRight: '1px solid rgba(6, 78, 59, 0.05)' }}>TOTAL</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b', borderRight: '1px solid rgba(6, 78, 59, 0.05)' }}>
                        {parseFloat(printLoan.principal_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b' }}>
                        {parseFloat(printLoan.principal_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Particulars Card */}
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '16px', border: '1px solid #f3f4f6', fontSize: '10px', lineHeight: '1.625', color: '#4b5563' }}>
                <p style={{ margin: 0 }}><strong>PARTICULARS / REMARKS:</strong> Being check payment for the loan proceeds of {printLoan.product_name} approved on {new Date(printLoan.created_at).toLocaleDateString()} under member name {printLoan.last_name}, {printLoan.first_name}.</p>
              </div>

              {/* Modern Signee Grid (Matching Amortization Table) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', paddingTop: '32px', fontSize: '9px', textAlign: 'center' }}>
                <div style={{ flex: 1, backgroundColor: 'rgba(249, 250, 251, 0.4)', padding: '12px', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#1f2937', margin: 0 }}>{releasedBy || preparedBy || 'AUTHORIZED SIGNATORY'}</p>
                  <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '8px 0' }}></div>
                  <p style={{ color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', margin: 0 }}>Authorized Disbursing Officer</p>
                </div>
                <div style={{ flex: 1, backgroundColor: 'rgba(249, 250, 251, 0.4)', padding: '12px', borderRadius: '12px', border: '1px solid #d1fae5' }}>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#064e3b', margin: 0 }}>{printLoan.last_name}, {printLoan.first_name}</p>
                  <div style={{ height: '1px', backgroundColor: '#a7f3d0', margin: '8px 0' }}></div>
                  <p style={{ color: '#059669', fontWeight: '600', textTransform: 'uppercase', margin: 0 }}>Signature of Borrower (Received By)</p>
                </div>
              </div>
            </div>
          ) : printMode === 'schedule' ? (
            /* Print-only Amortization Table Sheet */
            <div className="max-w-4xl mx-auto p-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Brand Header */}
              <div className="border-b-2 border-emerald-800 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #064e3b', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/Coop Sync_logo.png" alt="Coop Sync Logo" style={{ height: '36px', width: 'auto', display: 'block', objectFit: 'contain' }} />
                  <div>
                    <h2 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#064e3b', margin: 0 }}>University of Cebu Cooperative</h2>
                    <p style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600', margin: '2px 0 0 0' }}>Coop Sync Loan Management Portal</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ fontSize: '12px', fontWeight: '800', color: '#111827', textTransform: 'uppercase', margin: 0 }}>Official Loan Amortization</h1>
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
            <div className="max-w-4xl mx-auto p-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Brand Header */}
              <div className="border-b-2 border-emerald-800 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #064e3b', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/Coop Sync_logo.png" alt="Coop Sync Logo" style={{ height: '36px', width: 'auto', display: 'block', objectFit: 'contain' }} />
                  <div>
                    <h2 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#064e3b', margin: 0 }}>University of Cebu Cooperative</h2>
                    <p style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600', margin: '2px 0 0 0' }}>Coop Sync Loan Management Portal</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ fontSize: '12px', fontWeight: '800', color: '#111827', textTransform: 'uppercase', margin: 0 }}>Official Payment Receipt</h1>
                  <p style={{ fontSize: '9px', fontFamily: 'monospace', color: '#6b7280', margin: '2px 0 0 0' }}>OR-{new Date(printPayment.payment_date).getFullYear()}-{String(printPayment.id).padStart(6, '0')}</p>
                </div>
              </div>

              {/* Modern Info Grid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '16px', border: '1px solid #d1fae5', fontSize: '10px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Received From</span>
                  <p style={{ fontWeight: 'bold', color: '#1f2937', margin: '2px 0 0 0' }}>{printLoan.last_name}, {printLoan.first_name}</p>
                  <p style={{ fontSize: '9px', color: '#6b7280', fontFamily: 'monospace', margin: '2px 0 0 0' }}>Member ID: {printLoan.member_no || `#${printLoan.member_id || printLoan.borrower_id}`}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Payment Channel</span>
                  <p style={{ fontWeight: 'bold', color: '#1f2937', margin: '2px 0 0 0' }}>{printPayment.payment_method}</p>
                  <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>Ref No: {printPayment.reference_no || 'N/A'}</p>
                </div>
                <div style={{ textAlign: 'right', flex: 1 }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Date & Time Booked</span>
                  <p style={{ fontWeight: 'bold', color: '#1f2937', margin: '2px 0 0 0' }}>{new Date(printPayment.payment_date).toLocaleDateString()}</p>
                  <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>{new Date(printPayment.payment_date).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Receipt Summary Table */}
              <div style={{ border: '1px solid rgba(6, 78, 59, 0.1)', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#064e3b', color: '#ffffff', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '10px 16px' }}>Payment Allocation Details</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', width: '192px', borderLeft: '1px solid rgba(4, 120, 87, 0.2)' }}>Amount Received (₱)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(6, 78, 59, 0.05)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 'bold', color: '#1f2937', display: 'block' }}>Applied to Loan Principal</span>
                        <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>Principal recovery allocated for Contract #{printLoan.id} ({printLoan.product_name})</p>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#1f2937', borderLeft: '1px solid rgba(6, 78, 59, 0.05)' }}>
                        {parseFloat(printPayment.principal_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(6, 78, 59, 0.05)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 'bold', color: '#1f2937', display: 'block' }}>Applied to Loan Interest</span>
                        <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>Interest earned / collected on active balance</p>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#1f2937', borderLeft: '1px solid rgba(6, 78, 59, 0.05)' }}>
                        {parseFloat(printPayment.interest_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', fontSize: '10px' }}>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: '#064e3b' }}>TOTAL PAID AMOUNT</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b', borderLeft: '1px solid rgba(6, 78, 59, 0.05)' }}>
                        {parseFloat(printPayment.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Declaration Note */}
              <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '16px', border: '1px solid #f3f4f6', fontSize: '10px', lineHeight: '1.625', color: '#4b5563' }}>
                <p style={{ margin: 0 }}><strong>RECEIPT STATUS:</strong> This is an official system-generated billing receipt acknowledging the payment booking of the specified amount under credit contract #{printLoan.id}. The borrower&apos;s outstanding amortization ledger has been credited accordingly.</p>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', paddingTop: '32px', fontSize: '9px', textAlign: 'center' }}>
                <div style={{ flex: 1, backgroundColor: 'rgba(249, 250, 251, 0.4)', padding: '12px', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#022c22', margin: 0 }}>{releasedBy}</p>
                  <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '8px 0' }}></div>
                  <p style={{ color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', margin: 0 }}>Authorized Cashier / Staff</p>
                </div>
                <div style={{ flex: 1, backgroundColor: 'rgba(249, 250, 251, 0.4)', padding: '12px', borderRadius: '12px', border: '1px solid #d1fae5' }}>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#064e3b', margin: 0 }}>{printLoan.last_name}, {printLoan.first_name}</p>
                  <div style={{ height: '1px', backgroundColor: '#a7f3d0', margin: '8px 0' }}></div>
                  <p style={{ color: '#059669', fontWeight: '600', textTransform: 'uppercase', margin: 0 }}>Borrower Acknowledgment</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DYNAMIC STYLE INJECTION FOR CLEAN PRINTING */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            size: letter portrait;
            margin: 10mm 12mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          body * {
            visibility: hidden !important;
          }
          #print-section, #print-section * {
            visibility: visible !important;
          }
          #print-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0px !important;
            margin: 0px !important;
            box-sizing: border-box !important;
            -webkit-font-smoothing: antialiased !important;
            text-rendering: optimizeLegibility !important;
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
