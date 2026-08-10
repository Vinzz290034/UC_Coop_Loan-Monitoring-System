'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import PendingPlacementsSection from '@/components/accounting/PendingPlacementsSection';
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
  PiggyBank,
  Building,
  PlusCircle,
  Sparkles,
  Layers,
  Plus
} from 'lucide-react';

export default function AccountingPage() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'staff';

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Active Tab: 'share_capital' | 'fixed_deposits' | 'investments'
  const [activeTab, setActiveTab] = useState<'share_capital' | 'fixed_deposits' | 'investments'>('share_capital');

  // Member selection
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Ledgers data state
  const [shareData, setShareData] = useState<any>(null);
  const [fixedDeposits, setFixedDeposits] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isFDModalOpen, setIsFDModalOpen] = useState(false);
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);

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

  const auditedMember = user?.role === 'member' && user.profile 
    ? user.profile 
    : (members.find((m: any) => m.id.toString() === selectedMemberId) || null);

  // Form Fields: Share Capital
  const [shareTxType, setShareTxType] = useState<'credit' | 'debit'>('credit');
  const [shareAmount, setShareAmount] = useState('');
  const [shareRemarks, setShareRemarks] = useState('');
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Form Fields: Fixed Deposit
  const [fdPrincipal, setFdPrincipal] = useState('');
  const [fdRate, setFdRate] = useState('0.05');
  const [fdDuration, setFdDuration] = useState('12');
  const [fdSubmitting, setFdSubmitting] = useState(false);
  const [fdError, setFdError] = useState<string | null>(null);

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
    }
  }, [user]);

  // Main data loader (fetches all ledgers for selected member)
  const loadLedgerData = useCallback(async () => {
    if (!selectedMemberId) return;

    try {
      setLoading(true);
      setError(null);

      const [shareRes, fdRes, invRes] = await Promise.all([
        api.get(`/accounts/share-capital/${selectedMemberId}`).catch(() => ({ data: null })),
        api.get(`/accounts/fixed-deposits/${selectedMemberId}`).catch(() => ({ data: { data: [] } })),
        api.get(`/accounts/investments/${selectedMemberId}`).catch(() => ({ data: { data: [] } }))
      ]);

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

  // Submission Handlers: Share Capital
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !shareAmount) {
      setShareError('Amount is required.');
      return;
    }

    setShareError(null);
    setShareSubmitting(true);

    try {
      await api.post('/accounts/share-capital', {
        member_id: parseInt(selectedMemberId, 10),
        transaction_type: shareTxType,
        amount: parseFloat(shareAmount),
        remarks: shareRemarks || undefined
      });

      setShareAmount('');
      setShareRemarks('');
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

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const openContributionReceiptModal = (txObj: any) => {
    setCompletedReceiptTx(txObj);
    setCompletedReceiptMode('receipt');
  };

  const downloadContributionReceipt = async (txObj: any) => {
    const html2canvas = (await import('html2canvas-pro')).default;
    const receiptNo = `TXN-${new Date(txObj.transaction_date).getFullYear()}-${String(txObj.id).padStart(6, '0')}`;

    const alreadyConfigured = completedReceiptTx?.id === txObj.id && completedReceiptMode === 'receipt';
    
    if (!alreadyConfigured) {
      setCompletedReceiptTx(txObj);
      setCompletedReceiptMode('receipt');
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    const printEl = document.getElementById('print-section');
    if (!printEl) {
      console.error('Print element not found in DOM');
      if (!alreadyConfigured) {
        setCompletedReceiptTx(null);
        setCompletedReceiptMode(null);
      }
      return;
    }

    const clone = printEl.cloneNode(true) as HTMLElement;
    clone.classList.remove('hidden', 'print:block');
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
      if (!alreadyConfigured) {
        setCompletedReceiptTx(null);
        setCompletedReceiptMode(null);
      }
    }
  };

  return (
    <div className="space-y-6 animate-micro-elevate">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface dark:text-white">Capital & Asset Accounts Ledger</h1>
          <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
            Monitor member share capital equity, fixed term deposits, and cooperative investment accounts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'share_capital' && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Book Share Tx
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

          {activeTab === 'investments' && (
            <button
              onClick={() => setIsInvModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <PiggyBank className="w-4 h-4" />
              Create Investment Account
            </button>
          )}
        </div>
      </div>

      {/* Member Selection for Admins/Staff */}
      {isAdminOrManager && (
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
                {m.last_name}, {m.first_name} (ID: #{m.id})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Nav Tabs Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-800/60 rounded-2xl w-fit border border-outline-variant/30 overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('share_capital')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'share_capital'
              ? 'bg-white dark:bg-neutral-900 text-primary dark:text-secondary shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-on-surface dark:hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Share Capital Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('fixed_deposits')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'fixed_deposits'
              ? 'bg-white dark:bg-neutral-900 text-primary dark:text-secondary shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-on-surface dark:hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Fixed Deposits</span>
          {fixedDeposits.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary font-extrabold">
              {fixedDeposits.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('investments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'investments'
              ? 'bg-white dark:bg-neutral-900 text-primary dark:text-secondary shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-on-surface dark:hover:text-white'
          }`}
        >
          <PiggyBank className="w-4 h-4" />
          <span>Investments Ledger</span>
          {investments.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary font-extrabold">
              {investments.length}
            </span>
          )}
        </button>
      </div>

      {/* Pending Office Cash Payment Queue for Admins/Staff */}
      <PendingPlacementsSection onConfirmed={loadLedgerData} />

      {/* Member Pending Office Payment Placements Banner */}
      {(!isAdminOrManager || selectedMemberId) && (() => {
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
      {loading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : error ? (
        <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      ) : !selectedMemberId ? (
        <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">Please select a member profile to retrieve their account ledger files.</p>
        </div>
      ) : (
        <>
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

              <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
                <h4 className="px-6 py-4 font-headline text-sm font-bold text-on-surface dark:text-white border-b border-outline-variant/40 flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> Share Capital Postings
                </h4>
                <div className="overflow-x-auto">
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
                      {shareData.transactions?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-6 text-center text-neutral-600 dark:text-neutral-400 italic">No transactions booked.</td>
                        </tr>
                      ) : (
                        shareData.transactions?.map((tx: any) => (
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
                                  className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-750 dark:text-emerald-300 border border-emerald-250/30 hover:bg-emerald-100 hover:border-emerald-300 rounded-lg text-[9px] font-bold tracking-wide transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                >
                                  <Download className="w-2.5 h-2.5" /> Download
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
                        ))
                      )}
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

              <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
                <h4 className="px-6 py-4 font-headline text-sm font-bold text-on-surface dark:text-white border-b border-outline-variant/40 flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" /> Fixed Term Deposits
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/45">
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Placement Date</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Principal</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Yield Rate</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Maturity Date</th>
                        <th className="px-4 sm:px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/35 font-body text-xs text-on-surface dark:text-white/95">
                      {fixedDeposits.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-center text-neutral-600 dark:text-neutral-400 italic">No fixed deposit placements recorded.</td>
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
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{fd.status}</span>
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

          {/* TAB 3: INVESTMENTS LEDGER */}
          {activeTab === 'investments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
                <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Active Portfolios</span>
                  <h3 className="font-headline text-2xl font-extrabold text-primary dark:text-secondary mt-1">
                    {investments.length} Account(s)
                  </h3>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">Member investment portfolios</p>
                </div>

                <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Total Portfolio Balance</span>
                  <h3 className="font-headline text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(
                      investments.reduce((sum: number, inv: any) => sum + parseFloat(inv.current_balance || 0), 0)
                    )}
                  </h3>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">Current combined balance</p>
                </div>

                <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Accumulated Yield</span>
                  <h3 className="font-headline text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                    {formatCurrency(
                      investments.reduce((sum: number, inv: any) => sum + parseFloat(inv.interest_yield || 0), 0)
                    )}
                  </h3>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">Total interest payouts earned</p>
                </div>
              </div>

              {/* Investments List Card Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-headline text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-primary" /> Member Investment Portfolios
                  </h4>
                </div>

                {investments.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
                    <PiggyBank className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">No investment accounts recorded for this member profile.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {investments.map((inv: any) => (
                      <div key={inv.id} className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm hover:border-primary/40 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h5 className="font-headline font-bold text-sm text-on-surface dark:text-white">{inv.investment_name}</h5>
                            <span className="text-[10px] text-neutral-400 font-mono">Created: {new Date(inv.created_at).toLocaleDateString()}</span>
                          </div>

                          {isAdminOrManager && (
                            <button
                              onClick={() => { setSelectedInvestmentForTx(inv); setInvTxError(null); }}
                              className="px-3 py-1.5 bg-primary/10 dark:bg-secondary/15 hover:bg-primary/20 text-primary dark:text-secondary rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Post Tx</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/40 border border-outline-variant/30 text-xs">
                          <div>
                            <span className="text-[9px] uppercase text-neutral-400 font-bold block">Principal</span>
                            <span className="font-bold text-on-surface dark:text-white">{formatCurrency(parseFloat(inv.principal_amount))}</span>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase text-neutral-400 font-bold block">Current Balance</span>
                            <span className="font-bold text-primary dark:text-secondary">{formatCurrency(parseFloat(inv.current_balance))}</span>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase text-neutral-400 font-bold block">Yield Earned</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(parseFloat(inv.interest_yield))}</span>
                          </div>
                        </div>

                        {/* Recent Transactions List */}
                        {inv.transactions && inv.transactions.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-outline-variant/30">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Transaction Log ({inv.transactions.length})</span>
                            <div className="max-h-36 overflow-y-auto divide-y divide-outline-variant/20 text-xs">
                              {inv.transactions.map((tx: any) => (
                                <div key={tx.id} className="py-1.5 flex items-center justify-between text-[11px]">
                                  <span className="capitalize font-bold text-neutral-700 dark:text-neutral-300">
                                    {tx.transaction_type === 'yield_payout' ? '📈 Yield Payout' : tx.transaction_type === 'deposit' ? '💵 Deposit' : '💸 Withdrawal'}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold">{formatCurrency(parseFloat(tx.amount))}</span>
                                    <span className="text-[9px] text-neutral-400">{new Date(tx.transaction_date).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: BOOK SHARE CAPITAL TRANSACTION */}
      {isShareModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Book Share Capital Transaction</h2>

            {shareError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{shareError}</span>
              </div>
            )}

            <form onSubmit={handleShareSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Transaction Category *</label>
                <select
                  value={shareTxType}
                  onChange={(e: any) => setShareTxType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                >
                  <option value="credit">Deposit (Equity Contribution Injection)</option>
                  <option value="debit">Withdrawal (Equity Withdrawal Capital-Out)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Contribution Capital Amount (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={shareAmount}
                  onChange={(e) => setShareAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Remarks / Reference</label>
                <input
                  type="text"
                  value={shareRemarks}
                  onChange={(e) => setShareRemarks(e.target.value)}
                  placeholder="e.g. Monthly salary deduction contribution"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shareSubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {shareSubmitting ? 'Recording...' : 'Book Transaction'}
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

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <strong className="block font-bold text-xs">📢 Office Cashier Instructions:</strong>
                <p className="text-[11px] leading-relaxed">Present this payment slip to the UC METC Cooperative Office Cashier. Staff will issue your official receipt (OR) and activate your balance immediately.</p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => window.print()}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30 mb-4">
              <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" /> Official Contribution Receipt
              </h3>
              <button
                onClick={() => { setCompletedReceiptMode(null); setCompletedReceiptTx(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-2xl border border-outline-variant/60 space-y-3">
                <h5 className="font-bold text-on-surface dark:text-white text-xs">Transaction Details</h5>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px]">
                  <p><strong>Tracking Number:</strong> TXN-{new Date(completedReceiptTx.transaction_date).getFullYear()}-{String(completedReceiptTx.id).padStart(6, '0')}</p>
                  <p><strong>Member Name:</strong> {auditedMember.last_name}, {auditedMember.first_name}</p>
                  <p><strong>Account Type:</strong> Share Capital (CBU)</p>
                  <p><strong>Date Booked:</strong> {new Date(completedReceiptTx.transaction_date).toLocaleString()}</p>
                  <p><strong>Transaction Type:</strong> {completedReceiptTx.transaction_type === 'credit' ? 'Deposit (Capital Injection)' : 'Withdrawal (Equity Out)'}</p>
                  <p><strong>Remarks:</strong> {completedReceiptTx.remarks || 'Standard capital account adjustment'}</p>
                  <p className="col-span-2 text-xs border-t border-outline-variant/20 pt-2 mt-1">
                    <strong className="text-primary dark:text-secondary">Amount:</strong> <strong className="text-sm text-primary dark:text-secondary">{formatCurrency(parseFloat(completedReceiptTx.amount))}</strong>
                  </p>
                  <p className="col-span-2 text-xs">
                    <strong className="text-neutral-600 dark:text-neutral-400">Balance After:</strong> <strong className="text-neutral-700 dark:text-neutral-350">{formatCurrency(parseFloat(completedReceiptTx.balance_after))}</strong>
                  </p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => { setCompletedReceiptMode(null); setCompletedReceiptTx(null); }}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => downloadContributionReceipt(completedReceiptTx)}
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
        </div>,
        document.body
      )}

      {/* HIDDEN PRINT-ONLY CONTAINER */}
      {completedReceiptTx && auditedMember && (
        <div id="print-section" className="hidden print:block text-black bg-white p-6 font-sans" style={{ fontFamily: 'sans-serif', color: '#000000', backgroundColor: '#ffffff' }}>
          <div className="max-w-4xl mx-auto p-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="border-b-2 border-emerald-800 pb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #064e3b', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="/Coop Sync_logo.png" alt="Coop Sync Logo" style={{ height: '36px', width: 'auto', display: 'block', objectFit: 'contain' }} />
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#064e3b', margin: 0 }}>University of Cebu Cooperative</h2>
                  <p style={{ fontSize: '9px', color: '#6b7280', fontWeight: '600', margin: '2px 0 0 0' }}>Coop Sync Loan Management Portal</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h1 style={{ fontSize: '12px', fontWeight: '800', color: '#111827', textTransform: 'uppercase', margin: 0 }}>Official Contribution Receipt</h1>
                <p style={{ fontSize: '9px', fontFamily: 'monospace', color: '#6b7280', margin: '2px 0 0 0' }}>
                  TXN-{new Date(completedReceiptTx.transaction_date).getFullYear()}-{String(completedReceiptTx.id).padStart(6, '0')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '16px', border: '1px solid #d1fae5', fontSize: '10px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Received From</span>
                <p style={{ fontWeight: 'bold', color: '#1f2937', margin: '2px 0 0 0' }}>
                  {auditedMember.last_name}, {auditedMember.first_name}
                </p>
                <p style={{ fontSize: '9px', color: '#6b7280', fontFamily: 'monospace', margin: '2px 0 0 0' }}>Member ID: #{auditedMember.id}</p>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Transaction Type</span>
                <p style={{ fontWeight: 'bold', color: '#1f2937', textTransform: 'capitalize', margin: '2px 0 0 0' }}>
                  {completedReceiptTx.transaction_type === 'credit' ? 'Share Capital Deposit' : 'Share Capital Withdrawal'}
                </p>
                <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>Status: Completed</p>
              </div>
              <div style={{ textAlign: 'right', flex: 1 }}>
                <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', display: 'block' }}>Date & Time Booked</span>
                <p style={{ fontWeight: 'bold', color: '#064e3b', margin: '2px 0 0 0' }}>{new Date(completedReceiptTx.transaction_date).toLocaleDateString()}</p>
                <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>{new Date(completedReceiptTx.transaction_date).toLocaleTimeString()}</p>
              </div>
            </div>

            <div style={{ border: '1px solid rgba(6, 78, 59, 0.1)', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#064e3b', color: '#ffffff', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '10px 16px' }}>Ledger Allocation Details</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', width: '192px', borderLeft: '1px solid rgba(4, 120, 87, 0.2)' }}>Valuation Change (₱)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(6, 78, 59, 0.05)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 'bold', color: '#1f2937', display: 'block' }}>
                        {completedReceiptTx.transaction_type === 'credit' ? 'Equity Share Capital Contribution' : 'Equity Share Capital Withdrawal'}
                      </span>
                      <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>{completedReceiptTx.remarks || 'Standard capital account deposit adjustment.'}</p>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#1f2937', borderLeft: '1px solid rgba(6, 78, 59, 0.05)' }}>
                      {parseFloat(completedReceiptTx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(6, 78, 59, 0.05)', backgroundColor: '#f9fafb' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 'bold', color: '#4b5563', display: 'block' }}>Total Account Balance After</span>
                      <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0' }}>Cumulative valuation of locked member equity value contributions</p>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '600', color: '#4b5563', borderLeft: '1px solid rgba(6, 78, 59, 0.05)' }}>
                      {parseFloat(completedReceiptTx.balance_after).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold', fontSize: '10px' }}>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#064e3b' }}>NET TRANSACTION VALUE</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b', borderLeft: '1px solid rgba(6, 78, 59, 0.05)' }}>
                      {parseFloat(completedReceiptTx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '16px', border: '1px solid #f3f4f6', fontSize: '10px', lineHeight: '1.625', color: '#4b5563' }}>
              <p style={{ margin: 0 }}>
                <strong>RECEIPT STATUS:</strong> This is an official system-generated transaction receipt acknowledging the ledger booking of the specified equity change. The member&apos;s share capital balance has been credited/debited and updated accordingly.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', paddingTop: '32px', fontSize: '9px', textAlign: 'center' }}>
              <div style={{ flex: 1, backgroundColor: 'rgba(249, 250, 251, 0.4)', padding: '12px', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#022c22', margin: 0 }}>Cooperative Office Staff</p>
                <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '8px 0' }}></div>
                <p style={{ color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', margin: 0 }}>Authorized Officer</p>
              </div>
              <div style={{ flex: 1, backgroundColor: 'rgba(249, 250, 251, 0.4)', padding: '12px', borderRadius: '12px', border: '1px solid #d1fae5' }}>
                <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#064e3b', margin: 0 }}>
                  {auditedMember.last_name}, {auditedMember.first_name}
                </p>
                <div style={{ height: '1px', backgroundColor: '#a7f3d0', margin: '8px 0' }}></div>
                <p style={{ color: '#059669', fontWeight: '600', textTransform: 'uppercase', margin: 0 }}>Member Signature</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
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
            background: white !important;
            color: black !important;
            padding: 0px !important;
          }
        }
      `}} />
    </div>
  );
}
