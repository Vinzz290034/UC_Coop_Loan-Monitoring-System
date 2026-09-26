'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import PendingPlacementsSection from '@/components/accounting/PendingPlacementsSection';
import SearchInput from '@/components/SearchInput';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  History,
  AlertTriangle,
  X,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  Printer,
  Receipt,
  Download,
  Loader2,
  PiggyBank,
  Building,
  PlusCircle,
  Sparkles,
  Layers,
  Plus,
  WalletCards,
  Lock,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Eye,
  Filter,
  RotateCcw
} from 'lucide-react';

export default function AccountingPage() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'staff';

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Active Tab: 'savings' | 'share_capital' | 'fixed_deposits'
  const [activeTab, setActiveTab] = useState<'savings' | 'share_capital' | 'fixed_deposits'>('savings');

  // Member selection
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Ledgers data state
  const [savingsData, setSavingsData] = useState<any>(null);
  const [shareData, setShareData] = useState<any>(null);
  const [fixedDeposits, setFixedDeposits] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);

  // All Savings Accounts (Admin Overview)
  const [allSavingsAccounts, setAllSavingsAccounts] = useState<any[]>([]);
  const [savingsSummary, setSavingsSummary] = useState<any>(null);
  const [loadingAllSavings, setLoadingAllSavings] = useState(false);
  const [savingsSearch, setSavingsSearch] = useState('');
  const [savingsStatusFilter, setSavingsStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [savingsPage, setSavingsPage] = useState(1);
  const [savingsPageSize, setSavingsPageSize] = useState(10);
  const [viewingPassbookMember, setViewingPassbookMember] = useState<any | null>(null);

  // Modal target member ID (for depositing or withdrawing)
  const [modalMemberId, setModalMemberId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isSavingsDepositModalOpen, setIsSavingsDepositModalOpen] = useState(false);
  const [isSavingsWithdrawModalOpen, setIsSavingsWithdrawModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isFDModalOpen, setIsFDModalOpen] = useState(false);
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);

  // Form Fields: Savings Deposit & Withdrawal
  const [savingsDepositAmount, setSavingsDepositAmount] = useState('');
  const [savingsDepositRef, setSavingsDepositRef] = useState('');
  const [savingsDepositMethod, setSavingsDepositMethod] = useState<'cash' | 'gcash' | 'bank_transfer' | 'payroll'>('cash');
  const [savingsDepositRemarks, setSavingsDepositRemarks] = useState('');
  const [savingsDepositSubmitting, setSavingsDepositSubmitting] = useState(false);
  const [savingsDepositError, setSavingsDepositError] = useState<string | null>(null);

  const [savingsWithdrawAmount, setSavingsWithdrawAmount] = useState('');
  const [savingsWithdrawRef, setSavingsWithdrawRef] = useState('');
  const [savingsWithdrawRemarks, setSavingsWithdrawRemarks] = useState('');
  const [savingsWithdrawSubmitting, setSavingsWithdrawSubmitting] = useState(false);
  const [savingsWithdrawError, setSavingsWithdrawError] = useState<string | null>(null);

  // Investment Transaction Modal State
  const [selectedInvestmentForTx, setSelectedInvestmentForTx] = useState<any | null>(null);
  const [invTxType, setInvTxType] = useState<'deposit' | 'yield_payout' | 'withdrawal'>('deposit');
  const [invTxAmount, setInvTxAmount] = useState('');
  const [invTxSubmitting, setInvTxSubmitting] = useState(false);
  const [invTxError, setInvTxError] = useState<string | null>(null);

  // Receipt preview modal state
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [completedReceiptTx, setCompletedReceiptTx] = useState<any | null>(null);
  const [completedReceiptMode, setCompletedReceiptMode] = useState<'receipt' | null>(null);
  const [downloadingTxId, setDownloadingTxId] = useState<string | number | null>(null);

  const auditedMember = user?.role === 'member' && user.profile
    ? user.profile
    : (members.find((m: any) => m.id.toString() === selectedMemberId) || null);

  // Form Fields: Share Capital
  const [shareTxType, setShareTxType] = useState<'credit' | 'debit'>('credit');
  const [shareAmount, setShareAmount] = useState('');
  const [shareRemarks, setShareRemarks] = useState('');
  const [sharePaymentMethod, setSharePaymentMethod] = useState<'gcash' | 'bank_transfer' | 'payroll' | 'otc'>('otc');
  const [sharePaymentRefNo, setSharePaymentRefNo] = useState('');
  const [shareSalaryDeductionMode, setShareSalaryDeductionMode] = useState<'SD' | 'SD30' | 'SD2'>('SD');
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Form Fields: Fixed Deposit
  const [fdPrincipal, setFdPrincipal] = useState('');
  const [fdRate, setFdRate] = useState('0.05');
  const [fdDuration, setFdDuration] = useState('12');
  const [fdSubmitting, setFdSubmitting] = useState(false);
  const [fdError, setFdError] = useState<string | null>(null);

  // Fixed Deposit Status Action Modal State (Early Withdrawal / Payout)
  const [selectedFDForAction, setSelectedFDForAction] = useState<any | null>(null);
  const [fdActionRemarks, setFdActionRemarks] = useState('');
  const [fdActionSubmitting, setFdActionSubmitting] = useState(false);
  const [fdActionError, setFdActionError] = useState<string | null>(null);

  // Form Fields: New Investment Account
  const [invName, setInvName] = useState('');
  const [invPrincipal, setInvPrincipal] = useState('');
  const [invSubmitting, setInvSubmitting] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);

  // Load members dropdown on mount (Admin/Manager only)
  useEffect(() => {
    async function loadMembers() {
      if (!isAdminOrManager) return;
      try {
        const response = await api.get('/members');
        const list = response.data.data || [];
        setMembers(list);
        if (list.length > 0) {
          setSelectedMemberId(list[0].id.toString());
          setModalMemberId(list[0].id.toString());
        }
      } catch (err) {
        console.error('Error preloading member list:', err);
      }
    }
    loadMembers();
  }, [isAdminOrManager]);

  // Set default member for member role
  useEffect(() => {
    if (user && user.role === 'member' && user.profile?.id) {
      setSelectedMemberId(user.profile.id.toString());
      setModalMemberId(user.profile.id.toString());
    }
  }, [user]);

  // Load all savings accounts (Co-op wide for Admin/Staff)
  const loadAllSavings = useCallback(async () => {
    if (!isAdminOrManager) return;
    try {
      setLoadingAllSavings(true);
      const res = await api.get('/accounts/savings');
      if (res.data?.data) {
        setAllSavingsAccounts(res.data.data.accounts || []);
        setSavingsSummary(res.data.data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching all savings accounts:', err);
    } finally {
      setLoadingAllSavings(false);
    }
  }, [isAdminOrManager]);

  useEffect(() => {
    if (isAdminOrManager && activeTab === 'savings') {
      loadAllSavings();
    }
  }, [isAdminOrManager, activeTab, loadAllSavings]);

  const openSavingsDepositModal = (targetMember?: any) => {
    const memId = targetMember?.member_id?.toString() || targetMember?.id?.toString() || viewingPassbookMember?.member_id?.toString() || selectedMemberId || (members[0]?.id?.toString() ?? '');
    setModalMemberId(memId);
    setSelectedMemberId(memId);
    setSavingsDepositError(null);
    setSavingsDepositAmount('');
    setSavingsDepositRef('');
    setSavingsDepositRemarks('');
    setIsSavingsDepositModalOpen(true);
  };

  const openSavingsWithdrawModal = (targetMember?: any) => {
    const memId = targetMember?.member_id?.toString() || targetMember?.id?.toString() || viewingPassbookMember?.member_id?.toString() || selectedMemberId || (members[0]?.id?.toString() ?? '');
    setModalMemberId(memId);
    setSelectedMemberId(memId);
    setSavingsWithdrawError(null);
    setSavingsWithdrawAmount('');
    setSavingsWithdrawRef('');
    setSavingsWithdrawRemarks('');
    setIsSavingsWithdrawModalOpen(true);
  };

  // Sync activeTab from ?tab= query param (e.g. from notification clicks)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const syncTabFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'savings' || tabParam === 'share_capital' || tabParam === 'fixed_deposits') {
          setActiveTab(tabParam);
        }
      };
      syncTabFromUrl();
      window.addEventListener('popstate', syncTabFromUrl);
      return () => window.removeEventListener('popstate', syncTabFromUrl);
    }
  }, []);

  // Main data loader (fetches all ledgers for selected member)
  const loadLedgerData = useCallback(async () => {
    if (!selectedMemberId) return;

    try {
      setLoading(true);
      setError(null);

      const [savingsRes, shareRes, fdRes, invRes] = await Promise.all([
        api.get(`/accounts/savings/${selectedMemberId}`).catch(() => ({ data: { data: null } })),
        api.get(`/accounts/share-capital/${selectedMemberId}`).catch(() => ({ data: null })),
        api.get(`/accounts/fixed-deposits/${selectedMemberId}`).catch(() => ({ data: { data: [] } })),
        api.get(`/accounts/investments/${selectedMemberId}`).catch(() => ({ data: { data: [] } }))
      ]);

      if (savingsRes.data?.data) setSavingsData(savingsRes.data.data);
      if (shareRes.data) setShareData(shareRes.data);
      if (fdRes.data) setFixedDeposits(fdRes.data.data || []);
      if (invRes.data) setInvestments(invRes.data.data || []);

    } catch (err: any) {
      console.error('Error fetching ledger details:', err);
      setError(err.response?.data?.message || 'Error occurred while fetching accounts.');
    } finally {
      setLoading(false);
    }
  }, [selectedMemberId]);

  useEffect(() => {
    loadLedgerData();
  }, [loadLedgerData]);

  // Submission Handlers: Savings Deposit
  const handleSavingsDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveMemberId = modalMemberId || selectedMemberId;
    if (!effectiveMemberId || !savingsDepositAmount) {
      setSavingsDepositError('Please select a member and enter the deposit amount.');
      return;
    }

    const numAmount = parseFloat(savingsDepositAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSavingsDepositError('Please enter a valid amount greater than zero.');
      return;
    }

    setSavingsDepositError(null);
    setSavingsDepositSubmitting(true);

    try {
      await api.post('/accounts/savings/deposit', {
        member_id: effectiveMemberId,
        amount: numAmount,
        payment_method: savingsDepositMethod,
        reference_no: savingsDepositRef.trim() || undefined,
        remarks: savingsDepositRemarks.trim() || 'Savings account cash deposit'
      });

      setSavingsDepositAmount('');
      setSavingsDepositRef('');
      setSavingsDepositRemarks('');
      setIsSavingsDepositModalOpen(false);
      await loadLedgerData();
      if (isAdminOrManager) {
        await loadAllSavings();
      }
    } catch (err: any) {
      setSavingsDepositError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to process savings deposit.');
    } finally {
      setSavingsDepositSubmitting(false);
    }
  };

  // Submission Handlers: Savings Withdrawal
  const handleSavingsWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveMemberId = modalMemberId || selectedMemberId;
    if (!effectiveMemberId || !savingsWithdrawAmount) {
      setSavingsWithdrawError('Please select a member and enter the withdrawal amount.');
      return;
    }

    const numAmount = parseFloat(savingsWithdrawAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSavingsWithdrawError('Please enter a valid amount greater than zero.');
      return;
    }

    const targetAcc = allSavingsAccounts.find((a: any) => a.member_id?.toString() === effectiveMemberId);
    const currentBal = parseFloat(targetAcc?.balance ?? savingsData?.account?.balance ?? 0);
    const maintBal = parseFloat(targetAcc?.maintaining_balance ?? savingsData?.account?.maintaining_balance ?? 100);

    if (numAmount > currentBal) {
      setSavingsWithdrawError(`Insufficient balance. Current balance is ₱${currentBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}.`);
      return;
    }

    if (currentBal - numAmount < maintBal) {
      setSavingsWithdrawError(`Withdrawal exceeds maintaining balance policy (Min. ₱${maintBal.toFixed(2)}). Maximum withdrawable: ₱${Math.max(0, currentBal - maintBal).toLocaleString('en-US', { minimumFractionDigits: 2 })}.`);
      return;
    }

    setSavingsWithdrawError(null);
    setSavingsWithdrawSubmitting(true);

    try {
      await api.post('/accounts/savings/withdraw', {
        member_id: effectiveMemberId,
        amount: numAmount,
        reference_no: savingsWithdrawRef.trim() || undefined,
        remarks: savingsWithdrawRemarks.trim() || 'Counter cash withdrawal'
      });

      setSavingsWithdrawAmount('');
      setSavingsWithdrawRef('');
      setSavingsWithdrawRemarks('');
      setIsSavingsWithdrawModalOpen(false);
      await loadLedgerData();
      if (isAdminOrManager) {
        await loadAllSavings();
      }
    } catch (err: any) {
      setSavingsWithdrawError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to process savings withdrawal.');
    } finally {
      setSavingsWithdrawSubmitting(false);
    }
  };

  // Submission Handlers: Share Capital
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !shareAmount) {
      setShareError('Please enter the contribution amount.');
      return;
    }

    const numAmount = parseFloat(shareAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setShareError('Please enter a valid amount greater than zero.');
      return;
    }

    if ((sharePaymentMethod === 'gcash' || sharePaymentMethod === 'bank_transfer') && !sharePaymentRefNo.trim()) {
      setShareError('Please enter the transaction reference number.');
      return;
    }

    setShareError(null);
    setShareSubmitting(true);

    try {
      const methodLabel = sharePaymentMethod === 'gcash'
        ? 'GCash'
        : sharePaymentMethod === 'bank_transfer'
          ? 'Bank Transfer'
          : sharePaymentMethod === 'payroll'
            ? `Salary Deduction (${shareSalaryDeductionMode})`
            : 'Hand-in';
      const refPart = sharePaymentRefNo.trim() ? ` (Ref: ${sharePaymentRefNo.trim()})` : '';
      const customRemarks = shareRemarks.trim() ? ` - ${shareRemarks.trim()}` : '';
      const finalRemarks = `Capital build-up deposit via ${methodLabel}${refPart}${customRemarks}`;

      await api.post('/accounts/share-capital', {
        member_id: selectedMemberId,
        transaction_type: 'credit',
        amount: numAmount,
        remarks: finalRemarks
      });

      setShareAmount('');
      setShareRemarks('');
      setSharePaymentRefNo('');
      setSharePaymentMethod('otc');
      setIsShareModalOpen(false);
      loadLedgerData();
    } catch (err: any) {
      setShareError(err.response?.data?.error?.message || err.response?.data?.message || 'Share transaction failed.');
    } finally {
      setShareSubmitting(false);
    }
  };

  // Submission Handler: Fixed Deposit
  const handleFDSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !fdPrincipal || !fdDuration) {
      setFdError('Principal amount and duration are required.');
      return;
    }

    setFdError(null);
    setFdSubmitting(true);

    try {
      await api.post('/accounts/fixed-deposits', {
        member_id: parseInt(selectedMemberId, 10),
        principal_amount: parseFloat(fdPrincipal),
        interest_rate: parseFloat(fdRate),
        duration_months: parseInt(fdDuration, 10)
      });

      setFdPrincipal('');
      setIsFDModalOpen(false);
      loadLedgerData();
    } catch (err: any) {
      setFdError(err.response?.data?.error?.message || err.response?.data?.message || 'Fixed deposit creation failed.');
    } finally {
      setFdSubmitting(false);
    }
  };

  // Submission Handler: Fixed Deposit Withdrawal / Payout
  const handleFDActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFDForAction) return;

    setFdActionError(null);
    setFdActionSubmitting(true);

    try {
      // Record withdrawal transaction on fixed deposit
      await api.post('/accounts/share-capital', {
        member_id: selectedFDForAction.member_id,
        transaction_type: 'credit',
        amount: parseFloat(selectedFDForAction.principal_amount),
        remarks: fdActionRemarks || `Fixed Deposit #${selectedFDForAction.id} Principal Liquidation Payout`
      });

      setSelectedFDForAction(null);
      setFdActionRemarks('');
      loadLedgerData();
    } catch (err: any) {
      setFdActionError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to process Fixed Deposit payout.');
    } finally {
      setFdActionSubmitting(false);
    }
  };

  // Submission Handler: Create Investment Account
  const handleInvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !invName || !invPrincipal) {
      setInvError('Investment name and principal amount are required.');
      return;
    }

    setInvError(null);
    setInvSubmitting(true);

    try {
      await api.post('/accounts/investments', {
        member_id: parseInt(selectedMemberId, 10),
        investment_name: invName,
        principal_amount: parseFloat(invPrincipal)
      });

      setInvName('');
      setInvPrincipal('');
      setIsInvModalOpen(false);
      loadLedgerData();
    } catch (err: any) {
      setInvError(err.response?.data?.error?.message || err.response?.data?.message || 'Investment account creation failed.');
    } finally {
      setInvSubmitting(false);
    }
  };

  // Submission Handler: Post Investment Transaction
  const handlePostInvestmentTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentForTx || !invTxAmount) {
      setInvTxError('Transaction amount is required.');
      return;
    }

    setInvTxError(null);
    setInvTxSubmitting(true);

    try {
      await api.post(`/accounts/investments/${selectedInvestmentForTx.id}/transactions`, {
        transaction_type: invTxType,
        amount: parseFloat(invTxAmount)
      });

      setInvTxAmount('');
      setSelectedInvestmentForTx(null);
      loadLedgerData();
    } catch (err: any) {
      setInvTxError(err.response?.data?.error?.message || err.response?.data?.message || 'Posting transaction failed.');
    } finally {
      setInvTxSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(val || 0);
  };

  const formatAmountInWords = (amount: number): string => {
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

  const getCleanReceiptNumber = (tx: any) => {
    if (!tx) return 'AR-2026-0001';
    if (tx.invoice_no && tx.invoice_no !== 'SD' && tx.invoice_no !== 'HAND-IN') {
      return `AR-${tx.invoice_no}`;
    }
    const year = tx.transaction_date ? new Date(tx.transaction_date).getFullYear() : 2026;
    const cleanId = String(tx.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    return `AR-${year}-${cleanId || '0001'}`;
  };

  const handlePrint = () => {
    // Dismiss the modal immediately so the user knows it's currently printing
    setCompletedReceiptMode(null);
    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup);
      setCompletedReceiptTx(null);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const openContributionReceiptModal = (txObj: any) => {
    setCompletedReceiptTx(txObj);
    setCompletedReceiptMode('receipt');
  };

  const downloadContributionReceipt = async (txObj: any) => {
    try {
      setDownloadingTxId(txObj.id);
      const html2canvas = (await import('html2canvas-pro')).default;
      const receiptNo = getCleanReceiptNumber(txObj);

      const isModalOpen = completedReceiptTx?.id === txObj.id && completedReceiptMode === 'receipt';

      if (!completedReceiptTx || completedReceiptTx.id !== txObj.id) {
        setCompletedReceiptTx(txObj);
        // Do NOT set completedReceiptMode('receipt') here so modal will not pop up!
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const printEl = document.getElementById('print-section');
      if (!printEl) {
        console.error('Print element not found in DOM');
        if (!isModalOpen) {
          setCompletedReceiptTx(null);
        }
        return;
      }

      const clone = printEl.cloneNode(true) as HTMLElement;
      clone.classList.remove('hidden', 'print:block');
      clone.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        z-index: -9999;
        pointer-events: none;
        width: 740px;
        box-sizing: border-box !important;
        padding: 24px 32px;
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
        link.download = `Acknowledgement_Receipt_${receiptNo}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } finally {
        if (document.body.contains(clone)) {
          document.body.removeChild(clone);
        }
      }
    } catch (err) {
      console.error('Failed to generate receipt image:', err);
    } finally {
      setDownloadingTxId(null);
      if (completedReceiptMode !== 'receipt') {
        setCompletedReceiptTx(null);
      }
    }
  };

  const filteredSavingsAccounts = React.useMemo(() => {
    return allSavingsAccounts.filter((acc: any) => {
      const q = savingsSearch.toLowerCase().trim();
      const fullName = `${acc.last_name || ''} ${acc.first_name || ''} ${acc.middle_name || ''}`.toLowerCase();
      const matchesSearch = !q || (
        fullName.includes(q) ||
        (acc.member_no && acc.member_no.toLowerCase().includes(q)) ||
        (acc.account_number && acc.account_number.toLowerCase().includes(q)) ||
        (acc.email && acc.email.toLowerCase().includes(q)) ||
        (acc.phone && acc.phone.includes(q))
      );

      const matchesStatus = savingsStatusFilter === 'all' || acc.status === savingsStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allSavingsAccounts, savingsSearch, savingsStatusFilter]);

  const totalSavingsPages = Math.max(1, Math.ceil(filteredSavingsAccounts.length / savingsPageSize));
  const paginatedSavingsAccounts = React.useMemo(() => {
    const start = (savingsPage - 1) * savingsPageSize;
    return filteredSavingsAccounts.slice(start, start + savingsPageSize);
  }, [filteredSavingsAccounts, savingsPage, savingsPageSize]);

  return (
    <div className="space-y-6 animate-micro-elevate">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <BackButton href="/dashboard">Back to System Dashboard</BackButton>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {activeTab === 'savings' && (
            <>
              <button
                onClick={() => openSavingsDepositModal()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Deposit Savings
              </button>

              {isAdminOrManager && (
                <button
                  onClick={() => openSavingsWithdrawModal()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-tertiary hover:bg-tertiary/90 text-white rounded-full hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <TrendingDown className="w-4 h-4" />
                  Withdraw Cash
                </button>
              )}
            </>
          )}

          {activeTab === 'share_capital' && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Add Share Capital
            </button>
          )}

          {activeTab === 'fixed_deposits' && (
            <button
              onClick={() => setIsFDModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Building className="w-4 h-4" />
              New Fixed Deposit
            </button>
          )}
        </div>
      </div>

      {/* Member Selection for Admins/Staff - only for share capital */}
      {isAdminOrManager && activeTab === 'share_capital' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm max-w-md">
          <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 whitespace-nowrap font-label">Auditing Member Profile:</label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-outline-variant rounded-xl bg-white dark:bg-surface-container-low focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
          >
            <option value="">-- Choose Member Profile --</option>
            {members.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.last_name}, {m.first_name} (Member ID: {m.member_no || 'N/A'})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Nav Tabs Bar - Standardized underline tab design matching Loans page */}
      <div className="flex border-b border-outline-variant/50 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab('savings');
            setViewingPassbookMember(null);
          }}
          className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'savings'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
          }`}
        >
          <WalletCards className="w-4 h-4" />
          <span>Savings Account (Passbook)</span>
          {isAdminOrManager ? (
            savingsSummary?.total_accounts !== undefined ? (
              <span className={`ml-1 px-2 py-0.5 text-[10px] rounded-full font-extrabold font-mono ${
                activeTab === 'savings'
                  ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}>
                {savingsSummary.total_accounts} Accounts
              </span>
            ) : null
          ) : (
            savingsData?.account?.balance !== undefined && (
              <span className={`ml-1 px-2 py-0.5 text-[10px] rounded-full font-extrabold font-mono ${
                activeTab === 'savings'
                  ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}>
                ₱{parseFloat(savingsData.account.balance || 0).toLocaleString()}
              </span>
            )
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('share_capital')}
          className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'share_capital'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Share Capital Ledger</span>
        </button>
      </div>

      {/* Pending Office Cash Payment Queue for Admins/Staff - only for share capital */}
      {activeTab === 'share_capital' && <PendingPlacementsSection onConfirmed={loadLedgerData} />}

      {/* Member Pending Office Payment Placements Banner - only for share capital */}
      {activeTab === 'share_capital' && (!isAdminOrManager || selectedMemberId) && (() => {
        const pendingShare = (shareData?.transactions || []).filter((tx: any) => tx.status === 'pending_payment');
        const pendingFD = (fixedDeposits || []).filter((fd: any) => fd.status === 'pending_payment');
        const allMemberPending = [
          ...pendingShare.map((tx: any) => ({
            id: tx.id,
            type: 'share_capital',
            title: 'Share Capital Placement',
            amount: tx.amount,
            date: tx.transaction_date,
            details: tx.remarks || 'Equity Contribution'
          })),
          ...pendingFD.map((fd: any) => ({
            id: fd.id,
            type: 'fixed_deposit',
            title: 'Fixed Deposit Placement',
            amount: fd.principal_amount,
            date: fd.placement_date,
            details: `${fd.interest_rate * 100}% Yield • Term: ${fd.maturity_date || 'Timed placement'}`
          }))
        ];

        if (allMemberPending.length === 0) return null;

        return (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Clock className="w-5 h-5" />
                <h3 className="font-headline text-base font-extrabold">Pending Placements & Payment Slips ({allMemberPending.length})</h3>
              </div>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-white dark:bg-surface-container-high px-3 py-1 rounded-full border border-amber-500/30">Awaiting Office Cash Payment</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allMemberPending.map((item) => (
                <div key={`${item.type}-${item.id}`} className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-2xl flex items-center justify-between gap-4 shadow-xs hover:border-amber-500/50 transition-all">
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-on-surface dark:text-white block text-sm">{item.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-primary dark:text-secondary text-sm">₱{parseFloat(item.amount).toLocaleString()}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">Pending Payment</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 block font-mono">Date: {new Date(item.date).toLocaleDateString()}</span>
                  </div>

                  <button
                    onClick={() => setSelectedReceipt(item)}
                    className="px-4 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-xs rounded-2xl hover:opacity-95 transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>View Payment Slip</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* MAIN LEDGER DATA VIEWS */}
      {activeTab === 'savings' && isAdminOrManager && !viewingPassbookMember ? (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                <span className="text-[10px] uppercase font-bold tracking-wider font-label">Total Savings Pool</span>
                <WalletCards className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-headline text-2xl font-extrabold text-emerald-800 dark:text-emerald-300 mt-1">
                {formatCurrency(parseFloat(savingsSummary?.total_savings_pool || 0))}
              </h3>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                {savingsSummary?.funded_accounts || 0} active funded member accounts
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[10px] uppercase font-bold tracking-wider font-label">Total Savings Accounts</span>
                <Users className="w-4 h-4 text-primary dark:text-secondary" />
              </div>
              <h3 className="font-headline text-2xl font-extrabold text-on-surface dark:text-white mt-1">
                {savingsSummary?.total_accounts || allSavingsAccounts.length}
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">Total registered cooperative members</p>
            </div>

            <div className="p-5 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[10px] uppercase font-bold tracking-wider font-label">Cumulative Deposits</span>
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-headline text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(parseFloat(savingsSummary?.total_deposits_all || 0))}
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">Total cash & check passbook inflows</p>
            </div>

            <div className="p-5 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[10px] uppercase font-bold tracking-wider font-label">Cumulative Withdrawals</span>
                <TrendingDown className="w-4 h-4 text-tertiary" />
              </div>
              <h3 className="font-headline text-2xl font-extrabold text-tertiary mt-1">
                {formatCurrency(parseFloat(savingsSummary?.total_withdrawals_all || 0))}
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">Disbursed member cash withdrawals</p>
            </div>
          </div>

          {/* Search, Filter & Actions Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 max-w-xl">
              <SearchInput
                placeholder="Search member name, member ID, or account number..."
                defaultValue={savingsSearch}
                onSearch={(val) => {
                  setSavingsSearch(val);
                  setSavingsPage(1);
                }}
                className="w-full"
              />
              <select
                value={savingsStatusFilter}
                onChange={(e) => {
                  setSavingsStatusFilter(e.target.value as any);
                  setSavingsPage(1);
                }}
                className="px-3 py-2 text-xs border border-outline-variant rounded-full bg-white dark:bg-surface-container-low text-on-surface dark:text-white outline-none focus:border-primary shadow-xs cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {(savingsSearch || savingsStatusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSavingsSearch('');
                    setSavingsStatusFilter('all');
                    setSavingsPage(1);
                  }}
                  className="px-3 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-on-surface dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <span className="text-xs text-neutral-500 font-medium">
                {filteredSavingsAccounts.length} {filteredSavingsAccounts.length === 1 ? 'account' : 'accounts'} found
              </span>
            </div>
          </div>

          {/* Accounts Overview Table */}
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm p-1.5">
            <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-headline text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
                <WalletCards className="w-4 h-4 text-emerald-600" /> Member Savings Accounts & Passbooks
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openSavingsDepositModal()}
                  className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Quick Deposit
                </button>
                <button
                  onClick={() => openSavingsWithdrawModal()}
                  className="px-3.5 py-1.5 text-xs font-bold bg-tertiary/10 hover:bg-tertiary/20 text-tertiary rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <TrendingDown className="w-3.5 h-3.5" /> Quick Withdraw
                </button>
              </div>
            </div>

            {loadingAllSavings ? (
              <div className="p-8">
                <SkeletonTable rows={6} cols={7} />
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/45">
                      <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Member Profile</th>
                      <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Account #</th>
                      <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Available Balance</th>
                      <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden md:table-cell">Total Deposits</th>
                      <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden lg:table-cell">Total Withdrawals</th>
                      <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Status</th>
                      <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/35 font-body text-xs text-on-surface dark:text-white/95">
                    {paginatedSavingsAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 italic">
                          <WalletCards className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-50" />
                          No member savings accounts matched your search criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedSavingsAccounts.map((acc: any) => {
                        const bal = parseFloat(acc.balance || 0);
                        const dep = parseFloat(acc.total_deposits || 0);
                        const wth = parseFloat(acc.total_withdrawals || 0);

                        return (
                          <tr key={acc.member_id} className="hover:bg-neutral-500/5 transition-colors">
                            <td className="px-4 sm:px-6 py-3">
                              <div className="font-bold text-on-surface dark:text-white text-xs">
                                {acc.last_name}, {acc.first_name} {acc.middle_name ? `${acc.middle_name[0]}.` : ''}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] px-2 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-mono font-bold">
                                  ID: {acc.member_no || 'N/A'}
                                </span>
                                {acc.phone && (
                                  <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                                    • {acc.phone}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3">
                              <span className="font-mono text-xs font-bold text-primary dark:text-secondary bg-primary/5 dark:bg-secondary/10 px-2 py-1 rounded-lg">
                                {acc.account_number || 'SAV-PENDING'}
                              </span>
                              <div className="text-[10px] text-neutral-400 mt-0.5">
                                Min: ₱{parseFloat(acc.maintaining_balance || 100).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-3">
                              <span className={`font-headline text-sm font-extrabold ${bal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'}`}>
                                {formatCurrency(bal)}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 hidden md:table-cell">
                              {dep > 0 ? `+${formatCurrency(dep)}` : '₱0.00'}
                            </td>
                            <td className="px-4 sm:px-6 py-3 font-mono font-bold text-tertiary hidden lg:table-cell">
                              {wth > 0 ? `-${formatCurrency(wth)}` : '₱0.00'}
                            </td>
                            <td className="px-4 sm:px-6 py-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                acc.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${acc.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                                {acc.status || 'Active'}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-right">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <button
                                  onClick={() => {
                                    setViewingPassbookMember(acc);
                                    setSelectedMemberId(acc.member_id.toString());
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-on-surface dark:text-white rounded-lg transition-all active:scale-95 inline-flex items-center gap-1 cursor-pointer"
                                  title="Audit detailed passbook transactions"
                                >
                                  <History className="w-3 h-3 text-emerald-600" />
                                  <span>View Passbook</span>
                                </button>
                                <button
                                  onClick={() => openSavingsDepositModal(acc)}
                                  className="px-2 py-1 text-[11px] font-bold bg-emerald-600/10 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white rounded-lg transition-all active:scale-95 inline-flex items-center cursor-pointer"
                                  title="Deposit into this member's savings"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => openSavingsWithdrawModal(acc)}
                                  className="px-2 py-1 text-[11px] font-bold bg-tertiary/10 hover:bg-tertiary text-tertiary hover:text-white rounded-lg transition-all active:scale-95 inline-flex items-center cursor-pointer"
                                  title="Withdraw cash from this member's savings"
                                >
                                  <TrendingDown className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="px-6 py-3.5 border-t border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select
                  value={savingsPageSize}
                  onChange={(e) => {
                    setSavingsPageSize(Number(e.target.value));
                    setSavingsPage(1);
                  }}
                  className="px-2 py-1 border border-outline-variant rounded-lg bg-white dark:bg-surface-container-low text-on-surface dark:text-white font-medium"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>per page</span>
                <span className="mx-2 text-neutral-300 dark:text-neutral-700">|</span>
                <span>
                  Showing {filteredSavingsAccounts.length === 0 ? 0 : (savingsPage - 1) * savingsPageSize + 1} - {Math.min(savingsPage * savingsPageSize, filteredSavingsAccounts.length)} of {filteredSavingsAccounts.length} accounts
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={savingsPage <= 1}
                  onClick={() => setSavingsPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-outline-variant hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 py-1 font-bold text-on-surface dark:text-white font-mono">
                  {savingsPage} / {totalSavingsPages}
                </div>
                <button
                  disabled={savingsPage >= totalSavingsPages}
                  onClick={() => setSavingsPage((p) => Math.min(totalSavingsPages, p + 1))}
                  className="p-1.5 rounded-lg border border-outline-variant hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : loading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : error ? (
        <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      ) : !selectedMemberId && activeTab === 'share_capital' ? (
        <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">Please select a member profile to retrieve their account ledger files.</p>
        </div>
      ) : (
        <>
          {/* TAB 0: SAVINGS ACCOUNT (PASSBOOK) */}
          {activeTab === 'savings' && savingsData && (
            <div className="space-y-6">
              {/* Back Bar for Admin Auditing a Member */}
              {isAdminOrManager && viewingPassbookMember && (
                <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/60 shadow-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setViewingPassbookMember(null)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-on-surface dark:text-white rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to All Savings Accounts</span>
                    </button>
                    <div className="h-5 w-[1px] bg-outline-variant/60 hidden sm:block" />
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase tracking-wider font-label font-bold">
                        Auditing Member Passbook
                      </span>
                      <span className="text-sm font-extrabold text-on-surface dark:text-white">
                        {viewingPassbookMember.last_name}, {viewingPassbookMember.first_name}
                        <span className="ml-2 text-xs font-mono font-bold text-neutral-400">
                          (Member ID: {viewingPassbookMember.member_no || 'N/A'})
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openSavingsDepositModal(viewingPassbookMember)}
                      className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> Deposit
                    </button>
                    <button
                      onClick={() => openSavingsWithdrawModal(viewingPassbookMember)}
                      className="px-3.5 py-2 text-xs font-bold bg-tertiary/10 hover:bg-tertiary/20 text-tertiary rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <TrendingDown className="w-3.5 h-3.5" /> Withdraw
                    </button>
                  </div>
                </div>
              )}
              {/* Account Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-xs">
                  <div className="flex items-center justify-between text-neutral-500">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-label">Account Number</span>
                    <WalletCards className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-mono text-base font-extrabold text-on-surface dark:text-white mt-2">
                    {savingsData.account?.account_number || 'SAV-NEW'}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                      {savingsData.account?.status || 'Active'}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Int: {(parseFloat(savingsData.account?.interest_rate || 0.02) * 100).toFixed(1)}% p.a.
                    </span>
                  </div>
                </div>

                <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl shadow-xs">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-label">Available Savings</span>
                    <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-headline text-2xl font-extrabold text-emerald-800 dark:text-emerald-300 mt-1">
                    {formatCurrency(parseFloat(savingsData.account?.balance || 0))}
                  </h3>
                  <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                    Min. Maintaining: {formatCurrency(parseFloat(savingsData.account?.maintaining_balance || 100))}
                  </p>
                </div>

                <div className="p-5 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-xs">
                  <div className="flex items-center justify-between text-neutral-500">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-label">Total Deposits</span>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-headline text-xl font-bold text-primary dark:text-secondary mt-1">
                    {formatCurrency(
                      (savingsData.transactions || [])
                        .filter((tx: any) => tx.transaction_type === 'deposit')
                        .reduce((acc: number, tx: any) => acc + parseFloat(tx.amount || 0), 0)
                    )}
                  </h3>
                  <p className="text-[10px] text-neutral-400 mt-1">Cumulative cash/check inflows</p>
                </div>

                <div className="p-5 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-xs">
                  <div className="flex items-center justify-between text-neutral-500">
                    <span className="text-[10px] uppercase font-bold tracking-wider font-label">Total Withdrawals</span>
                    <TrendingDown className="w-4 h-4 text-tertiary" />
                  </div>
                  <h3 className="font-headline text-xl font-bold text-tertiary mt-1">
                    {formatCurrency(
                      (savingsData.transactions || [])
                        .filter((tx: any) => tx.transaction_type === 'withdrawal' || tx.transaction_type === 'loan_offset')
                        .reduce((acc: number, tx: any) => acc + parseFloat(tx.amount || 0), 0)
                    )}
                  </h3>
                  <p className="text-[10px] text-neutral-400 mt-1">Outflows & loan deductions</p>
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm p-1.5">
                <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-headline text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" /> Savings Passbook & Transaction Ledger
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsSavingsDepositModalOpen(true)}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Deposit
                    </button>
                    {isAdminOrManager && (
                      <button
                        onClick={() => setIsSavingsWithdrawModalOpen(true)}
                        className="px-3 py-1.5 text-xs font-bold bg-tertiary/10 hover:bg-tertiary/20 text-tertiary rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <TrendingDown className="w-3.5 h-3.5" /> Withdraw
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/45">
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Tx Date</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Type</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Ref #</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Amount</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden sm:table-cell">Balance After</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden md:table-cell">Performed By</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden lg:table-cell">Remarks</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/35 font-body text-xs text-on-surface dark:text-white/95">
                      {(() => {
                        const txs = savingsData.transactions || [];
                        if (txs.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8} className="px-6 py-8 text-center text-neutral-500 italic">
                                No savings transactions recorded yet. Click &quot;Deposit&quot; to initialize this member&apos;s passbook.
                              </td>
                            </tr>
                          );
                        }

                        return txs.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-neutral-500/5 transition-colors">
                            <td className="px-4 sm:px-6 py-3 font-mono">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                            <td className="px-4 sm:px-6 py-3">
                              {tx.transaction_type === 'deposit' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                  <TrendingUp className="w-3.5 h-3.5" /> Deposit
                                </span>
                              ) : tx.transaction_type === 'withdrawal' ? (
                                <span className="inline-flex items-center gap-1 text-tertiary font-bold">
                                  <TrendingDown className="w-3.5 h-3.5" /> Withdrawal
                                </span>
                              ) : tx.transaction_type === 'loan_offset' ? (
                                <span className="inline-flex items-center gap-1 text-blue-600 font-bold">
                                  <ArrowRightLeft className="w-3.5 h-3.5" /> Loan Payment
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-purple-600 font-bold capitalize">
                                  {tx.transaction_type}
                                </span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 font-mono text-xs text-neutral-500">{tx.reference_no || '-'}</td>
                            <td className="px-4 sm:px-6 py-3 font-bold">
                              <span className={tx.transaction_type === 'deposit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-tertiary'}>
                                {tx.transaction_type === 'deposit' ? '+' : '-'} {formatCurrency(parseFloat(tx.amount))}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-3 font-mono font-bold text-neutral-600 dark:text-neutral-400 hidden sm:table-cell">
                              {formatCurrency(parseFloat(tx.balance_after))}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-neutral-500 hidden md:table-cell font-mono text-xs">
                              {tx.performer_name || 'System'}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-neutral-600 dark:text-neutral-400 hidden lg:table-cell">
                              {tx.remarks || '-'}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-right">
                              <button
                                onClick={() => openContributionReceiptModal({
                                  ...tx,
                                  title: `Savings ${tx.transaction_type.toUpperCase()}`,
                                  member: auditedMember
                                })}
                                className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-on-surface dark:text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" /> Slip
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: SHARE CAPITAL LEDGER */}
          {activeTab === 'share_capital' && shareData && (
            <div className="space-y-6">
              <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm max-w-sm">
                <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Cumulative Valuation Balance</span>
                <h3 className="font-headline text-2xl font-extrabold text-primary dark:text-secondary mt-1">
                  {formatCurrency(shareData.balance)}
                </h3>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">Locked member equity value contributions</p>
              </div>

              <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm p-1.5">
                <h4 className="px-6 py-4 font-headline text-sm font-bold text-on-surface dark:text-white border-b border-outline-variant/40 flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> Share Capital Postings
                </h4>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/45">
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Tx Date</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Tx Type</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Amount</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden sm:table-cell">Valuation After</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden md:table-cell">Remarks</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/35 font-body text-xs text-on-surface dark:text-white/95">
                      {(() => {
                        const postedTransactions = (shareData.transactions || []).filter(
                          (tx: any) => !tx.status || tx.status === 'completed'
                        );

                        if (postedTransactions.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-6 py-6 text-center text-neutral-600 dark:text-neutral-400 italic">No transactions booked.</td>
                            </tr>
                          );
                        }

                        return postedTransactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-neutral/5">
                            <td className="px-4 sm:px-6 py-3 font-mono">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                            <td className="px-4 sm:px-6 py-3">
                              {tx.transaction_type === 'credit' ? (
                                <span className="inline-flex items-center gap-1 text-primary font-bold">
                                  <TrendingUp className="w-3.5 h-3.5" /> Deposit
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-tertiary font-bold">
                                  <TrendingDown className="w-3.5 h-3.5" /> Withdrawal
                                </span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 font-bold">{formatCurrency(parseFloat(tx.amount))}</td>
                            <td className="px-4 sm:px-6 py-3 font-mono font-bold text-neutral-600 dark:text-neutral-400 hidden sm:table-cell">{formatCurrency(parseFloat(tx.balance_after))}</td>
                            <td className="px-4 sm:px-6 py-3 text-neutral-600 dark:text-neutral-400 hidden md:table-cell">{tx.remarks}</td>
                            <td className="px-4 sm:px-6 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => downloadContributionReceipt(tx)}
                                  disabled={downloadingTxId === tx.id}
                                  className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-750 dark:text-emerald-300 border border-emerald-250/30 hover:bg-emerald-100 hover:border-emerald-300 rounded-lg text-[9px] font-bold tracking-wide transition-all active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  {downloadingTxId === tx.id ? (
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
                                  onClick={() => openContributionReceiptModal(tx)}
                                  className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-750 dark:text-emerald-300 border border-emerald-250/30 hover:bg-emerald-100 hover:border-emerald-300 rounded-lg text-[9px] font-bold tracking-wide transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                >
                                  <Printer className="w-2.5 h-2.5" /> Print
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FIXED DEPOSITS REGISTRY */}
          {activeTab === 'fixed_deposits' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Active Placements</span>
                  <h3 className="font-headline text-2xl font-extrabold text-primary dark:text-secondary mt-1">
                    {fixedDeposits.filter((fd: any) => fd.status === 'active').length} Account(s)
                  </h3>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">Active timed fixed placements</p>
                </div>

                <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Total Active Principal</span>
                  <h3 className="font-headline text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(
                      fixedDeposits
                        .filter((fd: any) => fd.status === 'active')
                        .reduce((sum: number, fd: any) => sum + parseFloat(fd.principal_amount), 0)
                    )}
                  </h3>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">Locked principal value</p>
                </div>
              </div>

              <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm p-1.5">
                <h4 className="px-6 py-4 font-headline text-sm font-bold text-on-surface dark:text-white border-b border-outline-variant/40 flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" /> Fixed Term Deposits
                </h4>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/45">
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Placement Date</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Principal</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Yield Rate</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Maturity Date</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Status</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/35 font-body text-xs text-on-surface dark:text-white/95">
                      {fixedDeposits.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-6 text-center text-neutral-600 dark:text-neutral-400 italic">No fixed deposit placements recorded.</td>
                        </tr>
                      ) : (
                        fixedDeposits.map((fd: any) => (
                          <tr key={fd.id} className="hover:bg-neutral/5">
                            <td className="px-4 sm:px-6 py-3 font-mono">{new Date(fd.placement_date).toLocaleDateString()}</td>
                            <td className="px-4 sm:px-6 py-3 font-bold">{formatCurrency(parseFloat(fd.principal_amount))}</td>
                            <td className="px-4 sm:px-6 py-3 font-bold text-primary dark:text-secondary">{(parseFloat(fd.interest_rate) * 100).toFixed(2)}% p.a.</td>
                            <td className="px-4 sm:px-6 py-3 font-mono">{fd.maturity_date ? new Date(fd.maturity_date).toLocaleDateString() : 'N/A'}</td>
                            <td className="px-4 sm:px-6 py-3">
                              {fd.status === 'active' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">Active</span>
                              ) : fd.status === 'pending_payment' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">Pending Office Cash</span>
                              ) : fd.status === 'matured' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300">Matured</span>
                              ) : fd.status === 'withdrawn' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">Withdrawn</span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{fd.status}</span>
                              )}
                            </td>
                            <td className="px-4 sm:px-6 py-3 text-right">
                              {isAdminOrManager && (fd.status === 'active' || fd.status === 'matured') && (
                                <button
                                  onClick={() => {
                                    setSelectedFDForAction(fd);
                                    setFdActionRemarks('');
                                    setFdActionError(null);
                                  }}
                                  className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-250/30 hover:bg-amber-100 hover:border-amber-400 rounded-lg text-[10px] font-bold tracking-wide transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                                >
                                  {fd.status === 'matured' ? 'Payout Maturity' : 'Early Withdrawal'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </>
      )}

      {/* MODAL 0A: SAVINGS DEPOSIT */}
      {isSavingsDepositModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/50 mb-4">
              <div>
                <h3 className="font-headline font-bold text-xl text-on-surface dark:text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Deposit into Savings Account
                </h3>
                <p className="text-xs text-neutral-500">
                  Credit funds to member passbook / regular savings ledger
                </p>
              </div>
              <button
                onClick={() => setIsSavingsDepositModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {savingsDepositError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{savingsDepositError}</span>
              </div>
            )}

            <form onSubmit={handleSavingsDepositSubmit} className="space-y-5">
              {/* Member Selector (for Admins/Staff) */}
              {isAdminOrManager && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                    Target Member Account:
                  </label>
                  <select
                    value={modalMemberId || selectedMemberId}
                    onChange={(e) => {
                      setModalMemberId(e.target.value);
                      setSelectedMemberId(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-xs border border-outline-variant/65 rounded-xl bg-white dark:bg-surface-container-low text-on-surface dark:text-white focus:outline-none focus:border-primary font-medium"
                  >
                    {members.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.last_name}, {m.first_name} (Member ID: {m.member_no || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Account summary banner */}
              {(() => {
                const targetAcc = allSavingsAccounts.find((a: any) => a.member_id?.toString() === (modalMemberId || selectedMemberId));
                const targetMem = members.find((m: any) => m.id?.toString() === (modalMemberId || selectedMemberId));
                const accNo = targetAcc?.account_number || savingsData?.account?.account_number || 'SAV-NEW';
                const bal = parseFloat(targetAcc?.balance ?? savingsData?.account?.balance ?? 0);

                return (
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs flex items-center justify-between">
                    <div>
                      <span className="text-emerald-700 dark:text-emerald-300 block font-medium">Account Number</span>
                      <span className="font-bold font-mono text-on-surface dark:text-white">
                        {accNo}
                      </span>
                      {targetMem && (
                        <span className="text-[10px] text-neutral-500 block">
                          {targetMem.last_name}, {targetMem.first_name}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-700 dark:text-emerald-300 block font-medium">Current Balance</span>
                      <span className="font-extrabold font-headline text-emerald-800 dark:text-emerald-300">
                        {formatCurrency(bal)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                  Deposit Amount (₱):
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 1000"
                  value={savingsDepositAmount}
                  onChange={(e) => setSavingsDepositAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-outline-variant/65 rounded-2xl bg-transparent font-bold text-lg focus:outline-none focus:border-primary text-on-surface dark:text-white"
                />
              </div>

              {/* Payment Channel */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">Deposit Channel / Method:</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'cash', label: 'Cash (Over Counter)', desc: 'Direct counter cash hand-in' },
                    { id: 'gcash', label: 'GCash Wallet', desc: 'Online mobile transfer' },
                    { id: 'bank_transfer', label: 'Bank Deposit', desc: 'Direct bank transfer' },
                    { id: 'payroll', label: 'Payroll Deduction', desc: 'Salary deduction deduction' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSavingsDepositMethod(m.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        savingsDepositMethod === m.id
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-outline-variant/65 bg-transparent hover:border-neutral/30 text-on-surface dark:text-white'
                      }`}
                    >
                      <span className="font-bold text-xs block">{m.label}</span>
                      <span className="text-[9px] text-neutral-400 block mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Number */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                  Receipt / Reference Number (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. OR-2026-9912 or GCash Ref"
                  value={savingsDepositRef}
                  onChange={(e) => setSavingsDepositRef(e.target.value)}
                  className="w-full px-4 py-2.5 border border-outline-variant/65 rounded-xl bg-transparent text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary font-mono"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                  Remarks / Notes:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Payday emergency fund savings"
                  value={savingsDepositRemarks}
                  onChange={(e) => setSavingsDepositRemarks(e.target.value)}
                  className="w-full px-4 py-2.5 border border-outline-variant/65 rounded-xl bg-transparent text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/50">
                <button
                  type="button"
                  onClick={() => setIsSavingsDepositModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingsDepositSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {savingsDepositSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" /> Confirm Deposit
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 0B: SAVINGS WITHDRAWAL */}
      {isSavingsWithdrawModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/50 mb-4">
              <div>
                <h3 className="font-headline font-bold text-xl text-on-surface dark:text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-tertiary" />
                  Withdraw Cash from Savings
                </h3>
                <p className="text-xs text-neutral-500">
                  Process member counter cash withdrawal slip
                </p>
              </div>
              <button
                onClick={() => setIsSavingsWithdrawModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {savingsWithdrawError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{savingsWithdrawError}</span>
              </div>
            )}

            <form onSubmit={handleSavingsWithdrawSubmit} className="space-y-5">
              {/* Member Selector (for Admins/Staff) */}
              {isAdminOrManager && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                    Target Member Account:
                  </label>
                  <select
                    value={modalMemberId || selectedMemberId}
                    onChange={(e) => {
                      setModalMemberId(e.target.value);
                      setSelectedMemberId(e.target.value);
                    }}
                    className="w-full px-3 py-2 text-xs border border-outline-variant/65 rounded-xl bg-white dark:bg-surface-container-low text-on-surface dark:text-white focus:outline-none focus:border-tertiary font-medium"
                  >
                    {members.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.last_name}, {m.first_name} (Member ID: {m.member_no || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Account summary banner */}
              {(() => {
                const targetAcc = allSavingsAccounts.find((a: any) => a.member_id?.toString() === (modalMemberId || selectedMemberId));
                const targetMem = members.find((m: any) => m.id?.toString() === (modalMemberId || selectedMemberId));
                const bal = parseFloat(targetAcc?.balance ?? savingsData?.account?.balance ?? 0);
                const maint = parseFloat(targetAcc?.maintaining_balance ?? savingsData?.account?.maintaining_balance ?? 100);

                return (
                  <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl text-xs space-y-2">
                    {targetMem && (
                      <div className="text-[11px] font-bold text-on-surface dark:text-white pb-1 border-b border-outline-variant/30">
                        {targetMem.last_name}, {targetMem.first_name} (ID: {targetMem.member_no || 'N/A'})
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Available Savings Balance:</span>
                      <span className="font-extrabold font-headline text-on-surface dark:text-white text-base">
                        {formatCurrency(bal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-[11px]">
                      <span className="text-neutral-500">Required Maintaining Balance:</span>
                      <span className="font-bold text-neutral-600 dark:text-neutral-400 font-mono">
                        {formatCurrency(maint)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Max Withdrawable Now:</span>
                      <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(Math.max(0, bal - maint))}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                  Withdrawal Amount (₱):
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 500"
                  value={savingsWithdrawAmount}
                  onChange={(e) => setSavingsWithdrawAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-outline-variant/65 rounded-2xl bg-transparent font-bold text-lg focus:outline-none focus:border-tertiary text-on-surface dark:text-white"
                />
              </div>

              {/* Reference / Withdrawal Slip # */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                  Withdrawal Slip / Voucher # (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. WDL-2026-0045"
                  value={savingsWithdrawRef}
                  onChange={(e) => setSavingsWithdrawRef(e.target.value)}
                  className="w-full px-4 py-2.5 border border-outline-variant/65 rounded-xl bg-transparent text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary font-mono"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                  Reason / Remarks:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Medical emergency withdrawal"
                  value={savingsWithdrawRemarks}
                  onChange={(e) => setSavingsWithdrawRemarks(e.target.value)}
                  className="w-full px-4 py-2.5 border border-outline-variant/65 rounded-xl bg-transparent text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/50">
                <button
                  type="button"
                  onClick={() => setIsSavingsWithdrawModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingsWithdrawSubmitting}
                  className="px-5 py-2.5 bg-tertiary hover:bg-tertiary/90 text-white font-bold text-xs rounded-xl hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {savingsWithdrawSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3.5 h-3.5" /> Confirm Cash Payout
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 1: BOOK SHARE CAPITAL TRANSACTION */}
      {isShareModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/50 mb-4">
              <div>
                <h3 className="font-headline font-bold text-xl text-on-surface dark:text-white">
                  Initiate Investment
                </h3>
                <p className="text-xs text-neutral-500">
                  Choose investment type, placement amount, and deposit channel
                </p>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {shareError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{shareError}</span>
              </div>
            )}

            <form onSubmit={handleShareSubmit} className="space-y-5">
              {/* Selected Type summary banner */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl text-xs flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 block">Investment Type</span>
                  <span className="font-bold font-headline text-on-surface dark:text-white capitalize">
                    Share Capital (Capital Build-Up)
                  </span>
                </div>
                {auditedMember && (
                  <div className="text-right">
                    <span className="text-neutral-500 block">Beneficiary Member</span>
                    <span className="font-bold font-headline text-on-surface dark:text-white">
                      {auditedMember.full_name || auditedMember.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                  Placement Amount (₱):
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={shareAmount}
                  onChange={(e) => setShareAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-outline-variant/65 rounded-2xl bg-transparent font-bold text-lg focus:outline-none focus:border-primary text-on-surface dark:text-white"
                />
              </div>

              {/* Payment Channel Options */}
              <div className="space-y-2.5">
                <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">Select Deposit Channel:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSharePaymentMethod('gcash');
                      setSharePaymentRefNo('');
                    }}
                    className={`p-3.5 rounded-xl border transition-all text-left flex items-start gap-2 cursor-pointer ${sharePaymentMethod === 'gcash'
                      ? 'bg-primary/5 dark:bg-secondary/5 border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/20'
                      : 'border-outline-variant/65 bg-transparent hover:border-neutral/30'
                      }`}
                  >
                    <WalletCards className="w-4 h-4 mt-0.5 text-primary dark:text-secondary flex-shrink-0" />
                    <div>
                      <span className="font-bold text-xs block text-on-surface dark:text-white">GCash</span>
                      <span className="text-[9px] text-neutral-500 block leading-tight mt-0.5">Instant online GCash mobile wallet transfer</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSharePaymentMethod('bank_transfer');
                      setSharePaymentRefNo('');
                    }}
                    className={`p-3.5 rounded-xl border transition-all text-left flex items-start gap-2 cursor-pointer ${sharePaymentMethod === 'bank_transfer'
                      ? 'bg-primary/5 dark:bg-secondary/5 border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/20'
                      : 'border-outline-variant/65 bg-transparent hover:border-neutral/30'
                      }`}
                  >
                    <Building className="w-4 h-4 mt-0.5 text-primary dark:text-secondary flex-shrink-0" />
                    <div>
                      <span className="font-bold text-xs block text-on-surface dark:text-white">Bank Transfer</span>
                      <span className="text-[9px] text-neutral-500 block leading-tight mt-0.5">Direct deposit to BDO Account</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSharePaymentMethod('payroll');
                      setSharePaymentRefNo('');
                    }}
                    className={`p-3.5 rounded-xl border transition-all text-left flex items-start gap-2 cursor-pointer ${sharePaymentMethod === 'payroll'
                      ? 'bg-primary/5 dark:bg-secondary/5 border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/20'
                      : 'border-outline-variant/65 bg-transparent hover:border-neutral/30'
                      }`}
                  >
                    <Lock className="w-4 h-4 mt-0.5 text-primary dark:text-secondary flex-shrink-0" />
                    <div>
                      <span className="font-bold text-xs block text-on-surface dark:text-white">Salary Deduction</span>
                      <span className="text-[9px] text-neutral-500 block leading-tight mt-0.5">Deduct from upcoming payslip</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSharePaymentMethod('otc');
                      setSharePaymentRefNo('');
                    }}
                    className={`p-3.5 rounded-xl border transition-all text-left flex items-start gap-2 cursor-pointer ${sharePaymentMethod === 'otc'
                      ? 'bg-primary/5 dark:bg-secondary/5 border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/20'
                      : 'border-outline-variant/65 bg-transparent hover:border-neutral/30'
                      }`}
                  >
                    <Users className="w-4 h-4 mt-0.5 text-primary dark:text-secondary flex-shrink-0" />
                    <div>
                      <span className="font-bold text-xs block text-on-surface dark:text-white">Hand-in</span>
                      <span className="text-[9px] text-neutral-500 block leading-tight mt-0.5">Hand-in cash to the co-op cashier</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Salary Deduction Cutoff Schedule Options */}
              {sharePaymentMethod === 'payroll' && (
                <div className="p-3.5 border border-outline-variant/65 rounded-xl bg-neutral/5 space-y-2.5 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300">
                      Select Payroll Cutoff:
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary px-2 py-0.5 rounded-full font-extrabold">
                      {shareSalaryDeductionMode === 'SD' ? '15th Cutoff' : shareSalaryDeductionMode === 'SD30' ? '30th Cutoff' : '15th & 30th Cutoffs'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setShareSalaryDeductionMode('SD')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${shareSalaryDeductionMode === 'SD'
                        ? 'bg-primary/10 dark:bg-secondary/10 border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/20 shadow-sm'
                        : 'border-outline-variant/65 bg-white dark:bg-surface-container-high hover:border-neutral/40'
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-extrabold text-xs text-on-surface dark:text-white">SD</span>
                        <span className="text-[9px] font-bold text-primary dark:text-secondary bg-primary/10 dark:bg-secondary/10 px-1.5 py-0.5 rounded">15th</span>
                      </div>
                      <span className="text-[9px] text-neutral-500 dark:text-neutral-400 block leading-tight mt-1">
                        Deducted every 15th of the month
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShareSalaryDeductionMode('SD30')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${shareSalaryDeductionMode === 'SD30'
                        ? 'bg-primary/10 dark:bg-secondary/10 border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/20 shadow-sm'
                        : 'border-outline-variant/65 bg-white dark:bg-surface-container-high hover:border-neutral/40'
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-extrabold text-xs text-on-surface dark:text-white">SD30</span>
                        <span className="text-[9px] font-bold text-primary dark:text-secondary bg-primary/10 dark:bg-secondary/10 px-1.5 py-0.5 rounded">30th</span>
                      </div>
                      <span className="text-[9px] text-neutral-500 dark:text-neutral-400 block leading-tight mt-1">
                        Deducted every 30th of the month
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShareSalaryDeductionMode('SD2')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${shareSalaryDeductionMode === 'SD2'
                        ? 'bg-primary/10 dark:bg-secondary/10 border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/20 shadow-sm'
                        : 'border-outline-variant/65 bg-white dark:bg-surface-container-high hover:border-neutral/40'
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-extrabold text-xs text-on-surface dark:text-white">SD2</span>
                        <span className="text-[9px] font-bold text-primary dark:text-secondary bg-primary/10 dark:bg-secondary/10 px-1.5 py-0.5 rounded">15 & 30</span>
                      </div>
                      <span className="text-[9px] text-neutral-500 dark:text-neutral-400 block leading-tight mt-1">
                        Deducted every 15th and 30th
                      </span>
                    </button>
                  </div>

                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                    {shareSalaryDeductionMode === 'SD' && 'ℹ️ Deduction will be scheduled on the 15th-day payroll cutoff.'}
                    {shareSalaryDeductionMode === 'SD30' && 'ℹ️ Deduction will be scheduled on the 30th-day / end-of-month payroll cutoff.'}
                    {shareSalaryDeductionMode === 'SD2' && 'ℹ️ Deduction will be split and scheduled across both 15th & 30th payroll cutoffs.'}
                  </p>
                </div>
              )}

              {/* GCash Details */}
              {sharePaymentMethod === 'gcash' && (
                <div className="p-3.5 border border-outline-variant/65 rounded-xl bg-neutral/5 space-y-2 text-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-neutral-600 dark:text-neutral-400">GCash Account Name:</span>
                    <span className="text-on-surface dark:text-white font-extrabold">Michelle Pable</span>
                  </div>
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-neutral-600 dark:text-neutral-400">Co-op GCash Number:</span>
                    <span className="font-mono text-primary dark:text-secondary font-extrabold">09498664041</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter GCash Reference No. (e.g. 10029384)"
                    value={sharePaymentRefNo}
                    onChange={(e) => setSharePaymentRefNo(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant/65 rounded-lg bg-white dark:bg-surface-container-high text-xs font-mono font-bold focus:outline-none focus:border-primary text-on-surface dark:text-white"
                  />
                </div>
              )}

              {/* Bank Transfer Details */}
              {sharePaymentMethod === 'bank_transfer' && (
                <div className="p-3.5 border border-outline-variant/65 rounded-xl bg-neutral/5 dark:bg-surface-container space-y-2.5 text-xs">
                  <div className="space-y-1 pb-1 border-b border-outline-variant/30">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                      Account Name:
                    </div>
                    <div className="font-semibold text-on-surface dark:text-white text-xs leading-snug">
                      UNIVERSITY OF CEBU - METC MULTIPURPOSE COOPERATIVE (UC-METC MPC)
                    </div>
                  </div>
                  <div className="flex justify-between items-center font-bold pt-0.5">
                    <span className="text-neutral-600 dark:text-neutral-400">BDO Account No:</span>
                    <span className="font-mono text-primary dark:text-secondary font-extrabold tracking-wider text-sm">007050082810</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter Bank Deposit/Ref No. (e.g. BDO-98213)"
                    value={sharePaymentRefNo}
                    onChange={(e) => setSharePaymentRefNo(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant/65 rounded-lg bg-white dark:bg-surface-container-high text-xs font-mono font-bold focus:outline-none focus:border-primary text-on-surface dark:text-white"
                  />
                </div>
              )}

              {/* Optional Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                  Remarks / Notes (Optional):
                </label>
                <input
                  type="text"
                  value={shareRemarks}
                  onChange={(e) => setShareRemarks(e.target.value)}
                  placeholder="e.g. Additional capital build-up"
                  className="w-full px-3.5 py-2.5 bg-transparent border border-outline-variant/65 rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-xs text-on-surface dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="flex-1 py-3 bg-neutral/10 hover:bg-neutral/15 dark:bg-neutral/20 dark:hover:bg-neutral/25 text-on-surface dark:text-white rounded-2xl font-bold transition-colors cursor-pointer text-center text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shareSubmitting || !shareAmount}
                  className="flex-1 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-center text-sm shadow-md"
                >
                  {shareSubmitting ? 'Processing...' : 'Confirm Capital Placement'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: NEW FIXED DEPOSIT PLACEMENT */}
      {isFDModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setIsFDModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">New Fixed Term Deposit</h2>

            {fdError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{fdError}</span>
              </div>
            )}

            <form onSubmit={handleFDSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Principal Deposit Amount (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={fdPrincipal}
                  onChange={(e) => setFdPrincipal(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Annual Yield Rate (Decimal) *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={fdRate}
                  onChange={(e) => setFdRate(e.target.value)}
                  placeholder="e.g. 0.05 for 5%"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Duration (Months) *</label>
                <select
                  value={fdDuration}
                  onChange={(e) => setFdDuration(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none text-on-surface dark:text-white"
                >
                  <option value="6">6 Months Term</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                  <option value="36">36 Months (3 Years)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFDModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fdSubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {fdSubmitting ? 'Submitting...' : 'Create Placement'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2B: FIXED DEPOSIT LIQUIDATION / PAYOUT ACTION */}
      {selectedFDForAction && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setSelectedFDForAction(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-1">
              {selectedFDForAction.status === 'matured' ? 'Process Maturity Payout' : 'Process Early Withdrawal'}
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              {selectedFDForAction.status === 'matured'
                ? 'Liquidate matured fixed deposit principal and post final distribution to member equity.'
                : 'Withdraw principal funds prior to maturity date. Liquidated amount will be credited back.'}
            </p>

            {fdActionError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{fdActionError}</span>
              </div>
            )}

            <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-outline-variant/40 space-y-2 mb-4 text-xs font-body">
              <div className="flex justify-between">
                <span className="text-neutral-500">Placement Principal:</span>
                <span className="font-bold text-primary dark:text-secondary">{formatCurrency(parseFloat(selectedFDForAction.principal_amount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Agreed Yield Rate:</span>
                <span className="font-bold">{(parseFloat(selectedFDForAction.interest_rate) * 100).toFixed(2)}% p.a.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Maturity Date:</span>
                <span className="font-mono">{selectedFDForAction.maturity_date ? new Date(selectedFDForAction.maturity_date).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>

            <form onSubmit={handleFDActionSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Auditing Remarks / Voucher Ref</label>
                <input
                  type="text"
                  value={fdActionRemarks}
                  onChange={(e) => setFdActionRemarks(e.target.value)}
                  placeholder="e.g. Approved maturity release / check #1234"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFDForAction(null)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fdActionSubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {fdActionSubmitting ? 'Processing...' : 'Confirm Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: CREATE INVESTMENT ACCOUNT */}
      {isInvModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setIsInvModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Create Investment Account</h2>

            {invError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{invError}</span>
              </div>
            )}

            <form onSubmit={handleInvSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Investment Plan / Portfolio Name *</label>
                <input
                  type="text"
                  required
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="e.g. Coop Growth Fund Series A"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Initial Principal Amount (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={invPrincipal}
                  onChange={(e) => setInvPrincipal(e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInvModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invSubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {invSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: POST INVESTMENT TRANSACTION */}
      {selectedInvestmentForTx && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setSelectedInvestmentForTx(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-1">Post Investment Transaction</h2>
            <p className="text-xs text-neutral-500 mb-4">Account: <strong className="text-on-surface dark:text-white">{selectedInvestmentForTx.investment_name}</strong></p>

            {invTxError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{invTxError}</span>
              </div>
            )}

            <form onSubmit={handlePostInvestmentTx} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Transaction Type *</label>
                <select
                  value={invTxType}
                  onChange={(e: any) => setInvTxType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none text-on-surface dark:text-white"
                >
                  <option value="deposit">Deposit (Additional Capital)</option>
                  <option value="yield_payout">Yield Payout (Interest Reinvestment)</option>
                  <option value="withdrawal">Withdrawal (Capital Redemption)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Amount (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={invTxAmount}
                  onChange={(e) => setInvTxAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedInvestmentForTx(null)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invTxSubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {invTxSubmitting ? 'Posting...' : 'Confirm Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 5: PAYMENT SLIP VOUCHER RECEIPT */}
      {selectedReceipt && mounted && createPortal(
        <div
          key={`payment-slip-modal-${selectedReceipt.id}`}
          className="fixed inset-0 z-[100] bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-modal-backdrop"
        >
          <div
            key={`payment-slip-card-${selectedReceipt.id}`}
            className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-[28px] w-full max-w-[480px] shadow-2xl overflow-hidden animate-modal-pop relative"
          >
            <div className="px-6 py-4 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low dark:bg-surface-container-high/40">
              <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white">
                Official Placement Payment Slip
              </h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-primary dark:text-secondary uppercase font-label">Tracking Code</span>
                <span className="font-mono font-extrabold text-xs text-on-surface dark:text-white bg-white dark:bg-surface-container-high px-2.5 py-0.5 rounded-lg border border-outline-variant/40">
                  #{selectedReceipt.id.toString().slice(0, 8).toUpperCase()}
                </span>
              </div>

              <div className="p-4 border border-outline-variant/60 rounded-2xl space-y-2.5 text-xs font-body bg-white dark:bg-surface-container-low">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-semibold">Member Account:</span>
                  <span className="text-on-surface dark:text-white font-extrabold text-xs">
                    {auditedMember ? `${auditedMember.first_name} ${auditedMember.last_name}` : 'John Doe'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-semibold">Placement Type:</span>
                  <span className="text-on-surface dark:text-white font-bold text-xs">{selectedReceipt.title}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-semibold">Placement Amount:</span>
                  <span className="text-primary dark:text-secondary font-extrabold text-sm">₱{parseFloat(selectedReceipt.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-semibold">Status:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px]">Pending Cash Payment</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono pt-1.5 border-t border-outline-variant/30">
                  <span>Date Issued:</span>
                  <span>{new Date(selectedReceipt.date).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReceipt(null);
                    setTimeout(() => {
                      window.print();
                    }, 150);
                  }}
                  className="w-full py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-headline font-bold text-xs shadow-md hover:opacity-90 transition-opacity cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Payment Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="w-full py-2 bg-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 6: COMPLETED CONTRIBUTION RECEIPT PREVIEW */}
      {completedReceiptMode === 'receipt' && completedReceiptTx && auditedMember && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/70 backdrop-blur-md p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-2xl shadow-2xl p-6 md:p-7 relative animate-modal-pop max-h-[92vh] overflow-y-auto font-sans flex flex-col gap-5">
            {/* Modal Top Bar */}
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-base text-on-surface dark:text-white">
                    Acknowledgement Receipt
                  </h3>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    {new Date(completedReceiptTx.transaction_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • {new Date(completedReceiptTx.transaction_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setCompletedReceiptMode(null); setCompletedReceiptTx(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Preview Paper Card */}
            <div className="p-5 md:p-6 rounded-2xl border border-outline-variant/60 bg-neutral-50/70 dark:bg-neutral-900/40 space-y-4 text-xs">
              {/* Paper Header */}
              <div className="flex justify-between items-center border-b-2 border-emerald-800/80 pb-3.5">
                <div className="flex items-center gap-3">
                  <img src="/Coop.jpeg" alt="UC-METC Multipurpose Cooperative Logo" className="h-11 w-11 rounded-full object-cover" />
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                      University of Cebu - METC MPC
                    </h4>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-semibold mt-0.5">
                      Loans, Savings, and Investment Portal
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[12px] font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                    Acknowledgement Receipt
                  </span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block mt-1">
                    {new Date(completedReceiptTx.transaction_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mt-0.5">
                    {new Date(completedReceiptTx.transaction_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Member & Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/30">
                <div>
                  <span className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider block">
                    Received From
                  </span>
                  <p className="font-bold text-neutral-900 dark:text-white text-xs mt-0.5">
                    {auditedMember.last_name}, {auditedMember.first_name} {auditedMember.middle_name || ''}
                  </p>
                  <p className="text-[10px] font-mono text-neutral-500">
                    ID: {auditedMember.member_no || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider block">
                    Transaction Type
                  </span>
                  <p className="font-bold text-neutral-900 dark:text-white text-xs mt-0.5">
                    {completedReceiptTx.transaction_type === 'credit' ? 'Share Capital Deposit' : 'Share Capital Withdrawal'}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Status: Completed
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider block">
                    Payment Method
                  </span>
                  <p className="font-bold text-neutral-900 dark:text-white text-xs mt-0.5">
                    {completedReceiptTx.remarks?.toLowerCase().includes('bdo') || completedReceiptTx.remarks?.toLowerCase().includes('bank') ? 'Bank Transfer (BDO)' : (completedReceiptTx.remarks?.toLowerCase().includes('gcash') ? 'GCash' : (completedReceiptTx.remarks?.toLowerCase().includes('salary') || completedReceiptTx.invoice_no === 'SD' ? 'Salary Deduction' : 'Hand-in (Cash)'))}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    Ref: {completedReceiptTx.invoice_no || 'SD'}
                  </p>
                </div>
              </div>

              {/* Breakdown Ledger Table */}
              {(() => {
                const currentBalance = parseFloat(completedReceiptTx.balance_after || 0);
                const txAmount = parseFloat(completedReceiptTx.amount || 0);
                const prevBalance = completedReceiptTx.transaction_type === 'credit' ? Math.max(0, currentBalance - txAmount) : (currentBalance + txAmount);

                return (
                  <div className="space-y-2.5">
                    <div className="border border-emerald-800/20 rounded-xl overflow-hidden bg-white dark:bg-surface-container">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-emerald-900 text-white text-[9.5px] uppercase tracking-wider font-bold">
                            <th className="py-2 px-3 w-8 text-center">#</th>
                            <th className="py-2 px-3">Particulars / Accounting Breakdown</th>
                            <th className="py-2 px-3 w-28 text-center">Reference</th>
                            <th className="py-2 px-3 text-right w-36">Amount (₱)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                          <tr>
                            <td className="py-2.5 px-3 text-center text-neutral-500 font-mono">1</td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-neutral-900 dark:text-white block">
                                {completedReceiptTx.transaction_type === 'credit' ? 'Share Capital Contribution (Capital Build-Up)' : 'Share Capital Withdrawal'}
                              </span>
                              <p className="text-[10px] text-neutral-500 mt-0.5">
                                {completedReceiptTx.remarks || 'Direct member equity deposit booked to member share capital account.'}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-neutral-600 dark:text-neutral-400 text-[11px]">
                              {completedReceiptTx.invoice_no || 'SD'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                              {txAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr className="bg-neutral-50 dark:bg-neutral-900/30">
                            <td colSpan={3} className="py-2 px-3 text-right text-neutral-600 dark:text-neutral-400 font-medium">
                              Previous Account Balance:
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-neutral-600 dark:text-neutral-400 font-semibold">
                              ₱{prevBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr className="bg-neutral-50 dark:bg-neutral-900/30">
                            <td colSpan={3} className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                              {completedReceiptTx.transaction_type === 'credit' ? 'Deposit Added:' : 'Withdrawal Deducted:'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {completedReceiptTx.transaction_type === 'credit' ? '+' : '-'} ₱{txAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr className="bg-emerald-50 dark:bg-emerald-950/40 border-t border-emerald-800/30">
                            <td colSpan={3} className="py-2.5 px-3 text-right font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider text-[10px]">
                              Updated Total Share Capital Balance:
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-900 dark:text-emerald-300 text-sm">
                              ₱{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Amount in words banner */}
                    <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/30 gap-3">
                      <div className="flex-1">
                        <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                          Amount Received in Words:
                        </span>
                        <p className="text-[11px] font-bold text-neutral-900 dark:text-white uppercase leading-snug mt-0.5">
                          {formatAmountInWords(txAmount)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-base font-mono font-extrabold text-emerald-800 dark:text-emerald-400">
                          ₱{txAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Modal Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => { setCompletedReceiptMode(null); setCompletedReceiptTx(null); }}
                className="px-5 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => downloadContributionReceipt(completedReceiptTx)}
                disabled={downloadingTxId === completedReceiptTx.id}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              >
                {downloadingTxId === completedReceiptTx.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download PNG
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* HIDDEN PRINT-ONLY CONTAINER: STANDARDIZED COOPERATIVE ACKNOWLEDGEMENT RECEIPT */}
      {completedReceiptTx && auditedMember && mounted && typeof document !== 'undefined' && createPortal(
        <div id="print-section" className="hidden print:block text-black bg-white font-sans" style={{ fontFamily: 'sans-serif', color: '#000000', backgroundColor: '#ffffff', boxSizing: 'border-box', width: '100%' }}>
          <div style={{ maxWidth: '720px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box', padding: '16px 20px' }}>
            
            {/* Cooperative Letterhead Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #064e3b', paddingBottom: '14px', boxSizing: 'border-box', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 auto', minWidth: 0 }}>
                <img src="/Coop.jpeg" alt="UC-METC Multipurpose Cooperative Logo" style={{ height: '52px', width: '52px', borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.02em', color: '#064e3b', margin: 0, lineHeight: 1.2 }}>
                    University of Cebu - METC MPC
                  </h2>
                  <p style={{ fontSize: '11px', color: '#374151', fontWeight: '600', margin: '4px 0 0 0', lineHeight: 1.2 }}>
                    Loans, Savings, and Investment Portal
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <h1 style={{ fontSize: '15px', fontWeight: '800', color: '#064e3b', textTransform: 'uppercase', margin: 0, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                  Acknowledgement Receipt
                </h1>
                <p style={{ fontSize: '13px', color: '#111827', fontWeight: 'bold', margin: '5px 0 0 0' }}>
                  {new Date(completedReceiptTx.transaction_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p style={{ fontSize: '11px', color: '#374151', fontWeight: '600', margin: '2px 0 0 0' }}>
                  {new Date(completedReceiptTx.transaction_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Member & Transaction Profile Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 1fr', gap: '14px', backgroundColor: '#ecfdf5', padding: '14px 18px', borderRadius: '12px', border: '1px solid #a7f3d0', fontSize: '10px' }}>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#047857', textTransform: 'uppercase', display: 'block', letterSpacing: '0.03em' }}>
                  Received From (Member)
                </span>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827', margin: '2px 0 0 0' }}>
                  {auditedMember.last_name}, {auditedMember.first_name} {auditedMember.middle_name || ''}
                </p>
                <p style={{ fontSize: '9px', color: '#4b5563', fontFamily: 'monospace', margin: '2px 0 0 0' }}>
                  Member ID: {auditedMember.member_no || 'N/A'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#047857', textTransform: 'uppercase', display: 'block', letterSpacing: '0.03em' }}>
                  Transaction Type
                </span>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', margin: '2px 0 0 0' }}>
                  {completedReceiptTx.transaction_type === 'credit' ? 'Share Capital Deposit' : 'Share Capital Withdrawal'}
                </p>
                <p style={{ fontSize: '9px', color: '#059669', fontWeight: 'bold', margin: '2px 0 0 0' }}>
                  Status: Completed (Official Entry)
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#047857', textTransform: 'uppercase', display: 'block', letterSpacing: '0.03em' }}>
                  Payment Channel
                </span>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', margin: '2px 0 0 0' }}>
                  {completedReceiptTx.remarks?.toLowerCase().includes('bdo') || completedReceiptTx.remarks?.toLowerCase().includes('bank') ? 'Bank Transfer (BDO)' : (completedReceiptTx.remarks?.toLowerCase().includes('gcash') ? 'GCash' : (completedReceiptTx.remarks?.toLowerCase().includes('salary') || completedReceiptTx.invoice_no === 'SD' ? 'Salary Deduction' : 'Hand-in (Cash)'))}
                </p>
                <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>
                  Ref: {completedReceiptTx.invoice_no || 'SD'}
                </p>
              </div>
            </div>

            {/* Financial Ledger Table */}
            {(() => {
              const currentBalance = parseFloat(completedReceiptTx.balance_after || 0);
              const txAmount = parseFloat(completedReceiptTx.amount || 0);
              const prevBalance = completedReceiptTx.transaction_type === 'credit' ? Math.max(0, currentBalance - txAmount) : (currentBalance + txAmount);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ border: '1px solid rgba(6, 78, 59, 0.18)', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '10px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#064e3b', color: '#ffffff', fontWeight: 'bold', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '9px 14px', width: '36px', textAlign: 'center' }}>#</th>
                          <th style={{ padding: '9px 14px' }}>Particulars / Ledger Description</th>
                          <th style={{ padding: '9px 14px', width: '120px', textAlign: 'center' }}>Reference</th>
                          <th style={{ padding: '9px 14px', textAlign: 'right', width: '150px' }}>Amount (₱)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '10px 14px', textAlign: 'center', color: '#6b7280', fontFamily: 'monospace' }}>1</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontWeight: 'bold', color: '#111827', display: 'block', fontSize: '11px' }}>
                              {completedReceiptTx.transaction_type === 'credit' ? 'Share Capital Contribution (Capital Build-Up)' : 'Share Capital Withdrawal'}
                            </span>
                            <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>
                              {completedReceiptTx.remarks || 'Direct member equity deposit booked to member share capital account.'}
                            </p>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontFamily: 'monospace', color: '#4b5563', fontSize: '9.5px' }}>
                            {completedReceiptTx.invoice_no || 'SD'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', color: '#111827' }}>
                            {txAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                          <td colSpan={3} style={{ padding: '8px 14px', textAlign: 'right', color: '#4b5563', fontWeight: '600' }}>
                            Previous Account Balance:
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#4b5563', fontWeight: '600' }}>
                            ₱{prevBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                          <td colSpan={3} style={{ padding: '8px 14px', textAlign: 'right', color: '#047857', fontWeight: 'bold' }}>
                            {completedReceiptTx.transaction_type === 'credit' ? 'Deposit Added:' : 'Withdrawal Deducted:'}
                          </td>
                          <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#047857', fontWeight: 'bold' }}>
                            {completedReceiptTx.transaction_type === 'credit' ? '+' : '-'} ₱{txAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr style={{ backgroundColor: '#ecfdf5', borderTop: '1.5px solid #064e3b' }}>
                          <td colSpan={3} style={{ padding: '10px 14px', textAlign: 'right', color: '#064e3b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '10.5px' }}>
                            Updated Total Share Capital Balance:
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b', fontWeight: '800', fontSize: '13px' }}>
                            ₱{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        {formatAmountInWords(txAmount)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '17px', fontFamily: 'monospace', fontWeight: '800', color: '#064e3b' }}>
                        ₱{txAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Official Certification Note */}
            <div style={{ backgroundColor: '#f9fafb', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '9px', lineHeight: '1.5', color: '#4b5563' }}>
              <strong style={{ color: '#1f2937' }}>CERTIFICATION:</strong> This is an official system-generated Acknowledgement Receipt confirming the recorded equity transaction under the records of the University of Cebu - METC Multipurpose Cooperative (UC-METC MPC). The member&apos;s share capital passbook and ledger have been credited/debited and updated accordingly.
            </div>

            {/* Official Receipt Footer */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginTop: '12px', fontSize: '9px', color: '#6b7280', lineHeight: 1.4, fontWeight: 'normal' }}>
              <p style={{ margin: 0, color: '#6b7280', fontWeight: 'normal' }}>Generated via UC-METC MPC Portal</p>
              <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontWeight: 'normal' }}>KADT Solutions</p>
            </div>
          </div>
        </div>,
        document.body
      )}

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
            background: #ffffff !important;
            width: 100% !important;
            height: auto !important;
          }
          /* Hide the entire web app and all modals, leaving ONLY #print-section */
          body > *:not(#print-section) {
            display: none !important;
          }
          #print-section {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-sizing: border-box !important;
          }
        }
      `}} />
    </div>
  );
}
