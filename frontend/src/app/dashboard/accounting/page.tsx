'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Building,
  PlusCircle,
  History,
  AlertTriangle,
  X,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  FileText,
  Printer,
  Receipt
} from 'lucide-react';

export default function AccountingPage() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState<'share' | 'investment'>('share');

  // Member selection
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Ledgers loading/states
  const [shareData, setShareData] = useState<any>(null);
  const [fixedDepositData, setFixedDepositData] = useState<any[]>([]);
  const [investmentData, setInvestmentData] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [isInvTxModalOpen, setIsInvTxModalOpen] = useState(false);
  const [selectedInvId, setSelectedInvId] = useState<number | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Form Fields: Share Capital
  const [shareTxType, setShareTxType] = useState<'credit' | 'debit'>('credit');
  const [shareAmount, setShareAmount] = useState('');
  const [shareRemarks, setShareRemarks] = useState('');
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Form Fields: Create Investment
  const [invName, setInvName] = useState('');
  const [invPrincipal, setInvPrincipal] = useState('');
  const [invSubmitting, setInvSubmitting] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);

  // Form Fields: Post Investment Transaction
  const [invTxType, setInvTxType] = useState<'deposit' | 'yield_payout' | 'withdrawal'>('yield_payout');
  const [invTxAmount, setInvTxAmount] = useState('');
  const [invTxSubmitting, setInvTxSubmitting] = useState(false);
  const [invTxError, setInvTxError] = useState<string | null>(null);

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

  // Pending office payment placements queue (Admin/Manager)
  const [pendingPlacements, setPendingPlacements] = useState<any[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadPendingPlacements = useCallback(async () => {
    if (!isAdminOrManager) return;
    try {
      const res = await api.get('/accounts/pending-placements');
      setPendingPlacements(res.data.data?.all_pending || []);
    } catch (err) {
      console.error('Error fetching pending placements:', err);
    }
  }, [isAdminOrManager]);

  useEffect(() => {
    loadPendingPlacements();
  }, [loadPendingPlacements]);

  const handleConfirmPayment = async (type: string, id: string) => {
    try {
      setConfirmingId(id);
      const endpointType = type === 'fixed_deposit' ? 'fixed-deposit' : 'share-capital';
      await api.put(`/accounts/confirm-placement/${endpointType}/${id}`);
      await loadPendingPlacements();
      await loadLedgerData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error confirming cash payment.');
    } finally {
      setConfirmingId(null);
    }
  };

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
        api.get(`/accounts/share-capital/${selectedMemberId}`),
        api.get(`/accounts/fixed-deposits/${selectedMemberId}`),
        api.get(`/accounts/investments/${selectedMemberId}`)
      ]);

      setShareData(shareRes.data);
      setFixedDepositData(fdRes.data.data || []);
      setInvestmentData(invRes.data.data || []);
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

  // Submission Handlers
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

  const handleInvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !invName || !invPrincipal) {
      setInvError('Name and principal are required.');
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
      setInvError(err.response?.data?.error?.message || err.response?.data?.message || 'Investment failed.');
    } finally {
      setInvSubmitting(false);
    }
  };

  const handleInvTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvId || !invTxAmount) {
      setInvTxError('Amount is required.');
      return;
    }

    setInvTxError(null);
    setInvTxSubmitting(true);

    try {
      await api.post(`/accounts/investments/${selectedInvId}/transactions`, {
        transaction_type: invTxType,
        amount: parseFloat(invTxAmount)
      });

      setInvTxAmount('');
      setIsInvTxModalOpen(false);
      setSelectedInvId(null);
      loadLedgerData();
    } catch (err: any) {
      setInvTxError(err.response?.data?.error?.message || err.response?.data?.message || 'Transaction booking failed.');
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

  return (
    <div className="space-y-6 animate-micro-elevate">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Selector and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface dark:text-white">Capital Accounts Ledger</h1>
          <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
            Monitor member equity contributions, timed high-yield placements, and backing investments.
          </p>
        </div>

        {isAdminOrManager && (
          <div className="flex items-center gap-3">
            {activeTab === 'share' && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Book Share Tx
              </button>
            )}
            {activeTab === 'investment' && (
              <button
                onClick={() => setIsInvModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                Create Investment
              </button>
            )}
          </div>
        )}
      </div>

      {/* Member Selection for Admins */}
      {isAdminOrManager && (
        <div className="flex items-center gap-3 bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm max-w-md">
          <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 whitespace-nowrap font-label">Auditing Member:</label>
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

      {/* Pending Office Cash Payment Queue for Admins */}
      {isAdminOrManager && pendingPlacements.length > 0 && (
        <div className="bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-primary dark:text-secondary">
              <Clock className="w-5 h-5" />
              <h3 className="font-headline text-base font-extrabold">Pending Member Placements & Office Payments ({pendingPlacements.length})</h3>
            </div>
            <span className="text-xs font-bold text-neutral-500 bg-white dark:bg-surface-container-high px-3 py-1 rounded-full border border-outline-variant/40">Awaiting In-Person Office Cash Payment</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPlacements.map((p) => (
              <div key={p.id} className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-2xl flex items-center justify-between gap-4 shadow-xs hover:border-primary/40 transition-all">
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-on-surface dark:text-white block text-sm">
                    {p.first_name} {p.last_name} <span className="font-mono text-xs text-neutral-500 font-normal">({p.member_no})</span>
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="uppercase font-mono px-2 py-0.5 rounded-full bg-primary/10 dark:bg-secondary/15 text-[10px] font-extrabold text-primary dark:text-secondary">
                      {p.placement_type === 'fixed_deposit' ? 'Fixed Deposit' : 'Share Capital'}
                    </span>
                    <span className="font-extrabold text-primary dark:text-secondary text-sm">₱{parseFloat(p.amount).toLocaleString()}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 block font-mono">
                    Phone: {p.phone || 'N/A'} • Submitted: {new Date(p.created_at || p.placement_date).toLocaleDateString()}
                  </span>
                </div>

                <button
                  disabled={confirmingId === p.id}
                  onClick={() => handleConfirmPayment(p.placement_type, p.id)}
                  className="px-4 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-xs rounded-2xl hover:opacity-90 transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{confirmingId === p.id ? 'Approving...' : 'Confirm Office Payment'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Pending Office Payment Placements */}
      {(!isAdminOrManager || selectedMemberId) && (() => {
        const pendingFixed = (investmentData || []).filter((inv: any) => inv.status === 'pending_payment');
        const pendingShare = (shareData?.transactions || []).filter((tx: any) => tx.status === 'pending_payment');
        const allMemberPending = [
          ...pendingFixed.map((inv: any) => ({
            id: inv.id,
            type: 'fixed_deposit',
            title: 'Fixed Deposit Placement',
            amount: inv.principal_amount,
            date: inv.created_at || inv.placement_date,
            details: `${(inv.interest_rate * 100).toFixed(1)}% Yield`
          })),
          ...pendingShare.map((tx: any) => ({
            id: tx.id,
            type: 'share_capital',
            title: 'Share Capital Placement',
            amount: tx.amount,
            date: tx.transaction_date,
            details: tx.remarks || 'Equity Contribution'
          }))
        ];

        if (allMemberPending.length === 0) return null;

        return (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Clock className="w-5 h-5" />
                <h3 className="font-headline text-base font-extrabold">My Pending Placements & Payment Slips ({allMemberPending.length})</h3>
              </div>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-white dark:bg-surface-container-high px-3 py-1 rounded-full border border-amber-500/30">Awaiting Office Cash Payment</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allMemberPending.map((item) => (
                <div key={item.id} className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-2xl flex items-center justify-between gap-4 shadow-xs hover:border-amber-500/50 transition-all">
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

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/50">
        <button
          onClick={() => setActiveTab('share')}
          className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all ${activeTab === 'share'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
            }`}
        >
          Share Capital Ledger
        </button>
        <button
          onClick={() => setActiveTab('investment')}
          className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all ${activeTab === 'investment'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
            }`}
        >
          Fixed Deposits & Investment History
        </button>
      </div>

      {/* LOADING & ERRORS */}
      {loading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : error ? (
        <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      ) : !selectedMemberId ? (
        <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">Please select a member profile to retrieve their ledger files.</p>
        </div>
      ) : (
        /* TAB RENDERINGS */
        <div>
          {/* TAB 1: SHARE CAPITAL */}
          {activeTab === 'share' && shareData && (
            <div className="space-y-6">
              {/* Summary card */}
              <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm max-w-sm">
                <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Cumulative Valuation Balance</span>
                <h3 className="font-headline text-2xl font-extrabold text-primary dark:text-secondary mt-1">
                  {formatCurrency(shareData.balance)}
                </h3>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2">Locked member equity value contributions</p>
              </div>

              {/* Transactions List */}
              <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
                <h4 className="px-6 py-4 font-headline text-sm font-bold text-on-surface dark:text-white border-b border-outline-variant/40 flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> Share Capital Capital Postings
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/45">
                        <th className="px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Tx Date</th>
                        <th className="px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Tx Type</th>
                        <th className="px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Amount</th>
                        <th className="px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Valuation After</th>
                        <th className="px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/35 font-body text-xs text-on-surface dark:text-white/95">
                      {shareData.transactions?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-center text-neutral-600 dark:text-neutral-400 italic">No transactions booked.</td>
                        </tr>
                      ) : (
                        shareData.transactions?.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-neutral/5">
                            <td className="px-6 py-3 font-mono">{new Date(tx.transaction_date).toLocaleString()}</td>
                            <td className="px-6 py-3">
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
                            <td className="px-6 py-3 font-bold">{formatCurrency(parseFloat(tx.amount))}</td>
                            <td className="px-6 py-3 font-mono font-bold text-neutral-600 dark:text-neutral-400">{formatCurrency(parseFloat(tx.balance_after))}</td>
                            <td className="px-6 py-3 text-neutral-600 dark:text-neutral-400">{tx.remarks}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FIXED DEPOSITS & INVESTMENT HISTORY */}
          {activeTab === 'investment' && (
            <div className="space-y-8">
              {/* SECTION 1: FIXED DEPOSITS HISTORY */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary dark:text-secondary" />
                    <h3 className="font-headline text-lg font-extrabold text-on-surface dark:text-white">
                      Fixed Deposits & Timed Placements ({fixedDepositData.length})
                    </h3>
                  </div>
                  <span className="text-xs text-neutral-500 font-mono">Annual Dividend & Fixed Rate Yields</span>
                </div>

                {fixedDepositData.length === 0 ? (
                  <div className="p-8 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60 text-center space-y-2">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold">No Fixed Deposit Placements booked yet.</p>
                    <p className="text-[11px] text-neutral-500">Initiate a Fixed Deposit placement from your main dashboard to earn high annual interest yields.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {fixedDepositData.map((fd) => (
                      <div key={fd.id} className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm space-y-4 hover:border-primary/40 transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-neutral-400 block uppercase">Placement Ref #{fd.id}</span>
                            <h4 className="font-headline font-bold text-base text-on-surface dark:text-white">
                              {formatCurrency(parseFloat(fd.principal_amount))}
                            </h4>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {fd.status === 'pending_payment' ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                  Pending Office Payment
                                </span>
                                <button
                                  onClick={() => setSelectedReceipt({
                                    id: fd.id.toString(),
                                    type: 'fixed_deposit',
                                    title: 'Fixed Deposit Placement',
                                    amount: fd.principal_amount,
                                    date: fd.created_at || fd.placement_date,
                                    details: `${(fd.interest_rate * 100).toFixed(1)}% Interest Yield`
                                  })}
                                  className="px-2.5 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary dark:text-secondary rounded-full text-[10px] font-extrabold cursor-pointer"
                                >
                                  Slip
                                </button>
                              </div>
                            ) : fd.status === 'active' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary dark:text-secondary">
                                Active Placement
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                Matured
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 border-t border-outline-variant/40 pt-3 text-xs font-body">
                          <div>
                            <span className="text-[10px] text-neutral-400 uppercase font-bold">Interest Rate Yield</span>
                            <p className="font-mono font-extrabold text-primary dark:text-secondary">
                              {(parseFloat(fd.interest_rate) * 100).toFixed(1)}% p.a.
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 uppercase font-bold">Placement Date</span>
                            <p className="font-mono text-neutral-600 dark:text-neutral-400">
                              {new Date(fd.placement_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 uppercase font-bold">Maturity Date</span>
                            <p className="font-mono text-neutral-600 dark:text-neutral-400">
                              {new Date(fd.maturity_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 uppercase font-bold">Estimated Yield</span>
                            <p className="font-mono font-bold text-amber-500">
                              +{formatCurrency(parseFloat(fd.principal_amount) * parseFloat(fd.interest_rate))}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: COOPERATIVE BACKING PORTFOLIOS */}
              {investmentData.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-outline-variant/40">
                  <h3 className="font-headline text-lg font-extrabold text-on-surface dark:text-white">
                    Cooperative Investment Portfolios ({investmentData.length})
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {investmentData.map((inv) => (
                      <div key={inv.id} className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm space-y-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-headline font-bold text-base text-on-surface dark:text-white">{inv.investment_name}</h4>
                            <span className="text-[10px] text-neutral-600 dark:text-neutral-400">Account ID: #{inv.id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAdminOrManager && (
                              <button
                                onClick={() => {
                                  setSelectedInvId(inv.id);
                                  setIsInvTxModalOpen(true);
                                }}
                                className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary dark:text-secondary rounded-full text-[10px] font-bold transition-all active:scale-95"
                              >
                                Post Transact
                              </button>
                            )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                              Active
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-outline-variant/40 pt-4 text-xs font-body">
                          <div>
                            <span className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-bold">Invested Principal</span>
                            <p className="font-headline text-sm font-extrabold text-neutral-600 dark:text-neutral-400 mt-0.5">
                              {formatCurrency(parseFloat(inv.principal_amount))}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-bold">Current Bal</span>
                            <p className="font-headline text-base font-extrabold text-primary dark:text-secondary mt-0.5">
                              {formatCurrency(parseFloat(inv.current_balance))}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-bold">Cumulative Dividends</span>
                            <p className="font-headline text-sm font-extrabold text-amber-500 mt-0.5">
                              {formatCurrency(parseFloat(inv.interest_yield))}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: BOOK SHARE CAPITAL TRANSACTION */}
      {isShareModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shareSubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
                >
                  {shareSubmitting ? 'Recording...' : 'Book Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: CREATE INVESTMENT */}
      {isInvModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setIsInvModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">New Investment Account</h2>

            {invError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{invError}</span>
              </div>
            )}

            <form onSubmit={handleInvSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Investment Category Name *</label>
                <input
                  type="text"
                  required
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="e.g. Cooperative Agri-Business Portfolio"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Invested Principal Amount (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={invPrincipal}
                  onChange={(e) => setInvPrincipal(e.target.value)}
                  placeholder="e.g. 100000"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInvModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invSubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
                >
                  {invSubmitting ? 'Opening Account...' : 'Open Account'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: POST INVESTMENT TRANSACTION */}
      {isInvTxModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => {
                setIsInvTxModalOpen(false);
                setSelectedInvId(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Book Investment Transaction</h2>

            {invTxError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{invTxError}</span>
              </div>
            )}

            <form onSubmit={handleInvTxSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Transaction Category *</label>
                <select
                  value={invTxType}
                  onChange={(e: any) => setInvTxType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                >
                  <option value="yield_payout">Yield Payout (Dividend Distribution Return)</option>
                  <option value="deposit">Deposit (Principal Capital Injection)</option>
                  <option value="withdrawal">Withdrawal (Capital Withdrawal Out)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Transaction Amount (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={invTxAmount}
                  onChange={(e) => setInvTxAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsInvTxModalOpen(false);
                    setSelectedInvId(null);
                  }}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invTxSubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
                >
                  {invTxSubmitting ? 'Submitting...' : 'Apply Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: PAYMENT SLIP VOUCHER RECEIPT */}
      {selectedReceipt && mounted && createPortal(
        <div
          key={`payment-slip-modal-${selectedReceipt.id}`}
          className="fixed inset-0 z-[100] bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-modal-backdrop"
        >
          <div
            key={`payment-slip-card-${selectedReceipt.id}`}
            className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-[28px] w-full max-w-[480px] shadow-2xl overflow-hidden animate-modal-pop relative"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low dark:bg-surface-container-high/40">
              <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white">
                Official Placement Payment Slip
              </h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Reference Header Tag */}
              <div className="p-3 bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-primary dark:text-secondary uppercase font-label">Tracking Code</span>
                <span className="font-mono font-extrabold text-xs text-on-surface dark:text-white bg-white dark:bg-surface-container-high px-2.5 py-0.5 rounded-lg border border-outline-variant/40">
                  #{selectedReceipt.id.toString().slice(0, 8).toUpperCase()}
                </span>
              </div>

              {/* Details Card */}
              <div className="p-4 border border-outline-variant/60 rounded-2xl space-y-2.5 text-xs font-body bg-white dark:bg-surface-container-low">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500 font-semibold">Member Account:</span>
                  <span className="text-on-surface dark:text-white font-extrabold text-xs">
                    {user?.profile?.first_name ? `${user.profile.first_name} ${user.profile.last_name}` : (shareData?.member ? `${shareData.member.first_name} ${shareData.member.last_name}` : (members.find((m: any) => m.id.toString() === selectedMemberId) ? `${members.find((m: any) => m.id.toString() === selectedMemberId).first_name} ${members.find((m: any) => m.id.toString() === selectedMemberId).last_name}` : 'John Doe'))}
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

              {/* Cashier Notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <strong className="block font-bold text-xs">📢 Office Cashier Instructions:</strong>
                <p className="text-[11px] leading-relaxed">Present this payment slip to the UC METC Cooperative Office Cashier. Staff will issue your official receipt (OR) and activate your balance immediately.</p>
              </div>

              {/* Action Buttons */}
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
    </div>
  );
}
