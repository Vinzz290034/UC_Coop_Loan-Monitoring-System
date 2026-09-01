'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import {
  X,
  Loader2,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote,
  Calendar,
  Layers,
  ArrowDownRight,
  TrendingDown,
} from 'lucide-react';

interface LoanBillingLedgerModalProps {
  loanId: string | number;
  borrowerName?: string;
  productName?: string;
  onClose: () => void;
}

interface ScheduleRow {
  schedule_id: string | number;
  installment_number: number;
  is_sub_row?: boolean;
  due_date: string | null;
  date_paid?: string | null;
  principal_due: string;
  interest_due: string;
  total_due: string;
  principal_paid: string;
  interest_paid: string;
  amount_paid?: string;
  installment_status: string;
  outstanding_remaining: string;
  days_overdue: number;
}

export default function LoanBillingLedgerModal({
  loanId,
  borrowerName,
  productName,
  onClose,
}: LoanBillingLedgerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loanData, setLoanData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchLedger() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/billing/loan/${loanId}`);
        if (res.data && res.data.success) {
          setSchedules(res.data.data || []);
          setLoanData(res.data.loan || null);
        }
      } catch (err: any) {
        console.error('Error fetching loan billing ledger:', err);
        setError(err.response?.data?.error?.message || 'Failed to load billing ledger for this loan.');
      } finally {
        setLoading(false);
      }
    }

    fetchLedger();
  }, [loanId]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(typeof val === 'string' ? parseFloat(val) : val || 0);
  };

  // Compute summary totals
  const amountLoaned = loanData?.principal_amount
    ? parseFloat(loanData.principal_amount)
    : schedules.reduce((s, r) => s + parseFloat(r.principal_due || '0'), 0);
  const totalPaid = schedules.reduce(
    (s, r) => s + parseFloat(r.amount_paid || String(parseFloat(r.principal_paid || '0') + parseFloat(r.interest_paid || '0')) || '0'),
    0
  );
  const totalOutstanding = schedules.reduce((s, r) => s + parseFloat(r.outstanding_remaining || '0'), 0);
  const overdueCount = schedules.filter(
    (r) => r.days_overdue > 0 && ['unpaid', 'partially_paid'].includes(r.installment_status)
  ).length;

  const getInstallmentStatusBadge = (status: string, daysOverdue: number) => {
    if (status === 'paid') {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/20';
    }
    if (daysOverdue > 0) {
      return 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-500/20';
    }
    if (status === 'partially_paid') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-500/20';
    }
    return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-500/20';
  };

  const getInstallmentLabel = (status: string, daysOverdue: number) => {
    if (status === 'paid') return 'Paid';
    if (daysOverdue > 0) return `${daysOverdue}d Overdue`;
    if (status === 'partially_paid') return 'Partial';
    return 'Pending';
  };

  const displayedBorrower = loanData?.borrower_name || borrowerName;
  const displayedProduct = loanData?.product_name || productName;
  const displayedLaf = loanData?.laf_no ? `LAF #${loanData.laf_no}` : `Contract #${loanId}`;

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/70 backdrop-blur-md p-4 md:p-6 animate-modal-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-5xl md:max-w-6xl shadow-2xl overflow-hidden animate-modal-pop flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low dark:bg-surface-container-high/40 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline font-bold text-lg md:text-xl text-on-surface dark:text-white flex items-center gap-2">
                Loan Billing Ledger
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {displayedBorrower && (
                  <span className="font-semibold text-on-surface dark:text-white">{displayedBorrower}</span>
                )}
                {displayedBorrower && displayedProduct && <span>•</span>}
                {displayedProduct && (
                  <span className="text-primary dark:text-secondary font-semibold">{displayedProduct}</span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-mono text-[11px]">
                  {displayedLaf}
                </span>
                {loanData?.payment_mode && (
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary dark:text-secondary font-mono text-[11px]">
                    {loanData.payment_mode}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="w-10 h-10 text-primary dark:text-secondary animate-spin" />
              <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                Loading complete billing ledger...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl flex items-center gap-3 text-xs font-semibold">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/50 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-neutral-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Amount Loaned</span>
                    <Banknote className="w-4 h-4 text-primary dark:text-secondary" />
                  </div>
                  <span className="font-headline text-lg md:text-xl font-extrabold text-on-surface dark:text-white">
                    {formatCurrency(amountLoaned)}
                  </span>
                </div>

                <div className="p-4 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/50 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-neutral-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Total Paid</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="font-headline text-lg md:text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalPaid)}
                  </span>
                </div>

                <div className="p-4 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/50 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-neutral-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Outstanding Balance</span>
                    <TrendingDown className="w-4 h-4 text-tertiary" />
                  </div>
                  <span
                    className={`font-headline text-lg md:text-xl font-extrabold ${
                      totalOutstanding > 0 ? 'text-tertiary' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatCurrency(totalOutstanding)}
                  </span>
                </div>

                <div className="p-4 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/50 rounded-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between text-neutral-400 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Overdue Items</span>
                    <AlertCircle
                      className={`w-4 h-4 ${
                        overdueCount > 0 ? 'text-tertiary' : 'text-emerald-500'
                      }`}
                    />
                  </div>
                  <span
                    className={`font-headline text-lg md:text-xl font-extrabold ${
                      overdueCount > 0 ? 'text-tertiary' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {overdueCount} {overdueCount === 1 ? 'Installment' : 'Installments'}
                  </span>
                </div>
              </div>

              {/* Installment Schedule Table */}
              <div className="border border-outline-variant/50 rounded-2xl overflow-hidden shadow-sm bg-surface-container-low/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low dark:bg-surface-container-high/60 border-b border-outline-variant/45">
                        <th className="px-4 py-3.5 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-4 py-3.5 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                          Due Date
                        </th>
                        <th className="px-4 py-3.5 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                          Date Paid
                        </th>
                        <th className="px-4 py-3.5 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                          Principal
                        </th>
                        <th className="px-4 py-3.5 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                          Interest
                        </th>
                        <th className="px-4 py-3.5 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                          Total Due
                        </th>
                        <th className="px-4 py-3.5 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                          Paid
                        </th>
                        <th className="px-4 py-3.5 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-center">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30 font-body text-xs text-on-surface dark:text-white/95">
                      {schedules.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-neutral-500 text-xs italic">
                            No installment records found for this contract.
                          </td>
                        </tr>
                      ) : (
                        schedules.map((row, idx) => {
                          const prevRow = idx > 0 ? schedules[idx - 1] : null;
                          const isSameMonthAsPrev =
                            Boolean(
                              prevRow?.due_date &&
                              row?.due_date &&
                              new Date(row.due_date).getMonth() === new Date(prevRow.due_date).getMonth() &&
                              new Date(row.due_date).getFullYear() === new Date(prevRow.due_date).getFullYear()
                            );
                          const isAdvanceCutoff = isSameMonthAsPrev && (parseFloat(row.interest_due) === 0 || !!row.date_paid);

                          return (
                            <tr
                              key={row.schedule_id}
                              className={`hover:bg-neutral/5 dark:hover:bg-white/5 transition-colors ${
                                row.days_overdue > 0 && row.installment_status !== 'paid'
                                  ? 'bg-red-50/60 dark:bg-red-950/20'
                                  : row.is_sub_row
                                  ? 'bg-neutral/5 dark:bg-white/2'
                                  : ''
                              }`}
                            >
                              <td className="px-4 py-3.5 font-mono font-bold text-neutral-500">
                                {row.installment_number}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-[11px] whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                                {row.is_sub_row || !row.due_date ? (
                                  <span className="text-neutral-400 dark:text-neutral-500 italic">—</span>
                                ) : (
                                  new Date(row.due_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                )}
                              </td>
                              <td className="px-4 py-3.5 font-mono text-[11px] whitespace-nowrap">
                                {row.date_paid ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {new Date(row.date_paid).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 dark:text-neutral-500 italic">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                                {row.is_sub_row || parseFloat(row.principal_due) === 0 ? (
                                  <span className="text-neutral-400 dark:text-neutral-500 italic">—</span>
                                ) : (
                                  formatCurrency(row.principal_due)
                                )}
                              </td>
                              <td className="px-4 py-3.5 font-mono whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                                {row.is_sub_row || parseFloat(row.interest_due) === 0 ? (
                                  <span className="text-neutral-400 dark:text-neutral-500 italic">—</span>
                                ) : (
                                  formatCurrency(row.interest_due)
                                )}
                              </td>
                              <td className="px-4 py-3.5 font-mono font-bold whitespace-nowrap">
                                {row.is_sub_row || parseFloat(row.total_due) === 0 ? (
                                  <span className="text-neutral-400 dark:text-neutral-500 italic font-normal">—</span>
                                ) : (
                                  formatCurrency(row.total_due)
                                )}
                              </td>
                              <td className="px-4 py-3.5 font-mono whitespace-nowrap font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(
                                  row.amount_paid || String(parseFloat(row.principal_paid) + parseFloat(row.interest_paid))
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getInstallmentStatusBadge(
                                  row.installment_status,
                                  row.days_overdue
                                )}`}
                              >
                                {row.installment_status === 'paid' && (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                {row.days_overdue > 0 && row.installment_status !== 'paid' && (
                                  <AlertCircle className="w-3 h-3" />
                                )}
                                {row.installment_status === 'partially_paid' && (
                                  <Clock className="w-3 h-3" />
                                )}
                                {getInstallmentLabel(row.installment_status, row.days_overdue)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/40 flex items-center justify-between bg-surface-container-low/50 dark:bg-surface-container-high/20 flex-shrink-0">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            {schedules.length > 0
              ? `${schedules.length} installment records scheduled`
              : 'Billing ledger overview'}
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
