'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';

interface LoanBillingLedgerModalProps {
  loanId: string | number;
  borrowerName?: string;
  productName?: string;
  onClose: () => void;
}

interface ScheduleRow {
  schedule_id: number;
  installment_number: number;
  due_date: string;
  principal_due: string;
  interest_due: string;
  total_due: string;
  principal_paid: string;
  interest_paid: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);

  useEffect(() => {
    async function fetchLedger() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/billing/loan/${loanId}`);
        if (res.data && res.data.success) {
          setSchedules(res.data.data || []);
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

  // Compute summary totals from schedule data
  const totalDue = schedules.reduce((s, r) => s + parseFloat(r.total_due), 0);
  const totalPaid = schedules.reduce((s, r) => s + parseFloat(r.principal_paid) + parseFloat(r.interest_paid), 0);
  const totalOutstanding = schedules.reduce((s, r) => s + parseFloat(r.outstanding_remaining), 0);
  const overdueCount = schedules.filter(r => r.days_overdue > 0 && ['unpaid', 'partially_paid'].includes(r.installment_status)).length;

  const getInstallmentStatusBadge = (status: string, daysOverdue: number) => {
    if (status === 'paid') {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    }
    if (daysOverdue > 0) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }
    if (status === 'partially_paid') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    }
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  };

  const getInstallmentLabel = (status: string, daysOverdue: number) => {
    if (status === 'paid') return 'Paid';
    if (daysOverdue > 0) return `${daysOverdue}d Overdue`;
    if (status === 'partially_paid') return 'Partial';
    return 'Pending';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-modal-pop flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low dark:bg-surface-container-high/40 flex-shrink-0">
          <div>
            <h3 className="font-headline font-bold text-base text-on-surface dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary dark:text-secondary" />
              Loan Billing Ledger
            </h3>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {borrowerName && <span className="font-semibold">{borrowerName}</span>}
              {borrowerName && productName && <span>•</span>}
              {productName && <span className="text-primary dark:text-secondary font-semibold">{productName}</span>}
              <span className="font-mono">Contract #{loanId}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-10 h-10 text-primary dark:text-secondary animate-spin" />
              <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Loading installment schedule...</p>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl flex items-center gap-3 text-xs font-semibold">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/40 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Loan Due</span>
                  <span className="font-headline text-sm font-extrabold text-on-surface dark:text-white">{formatCurrency(totalDue)}</span>
                </div>
                <div className="p-3 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/40 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Paid</span>
                  <span className="font-headline text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="p-3 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/40 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Outstanding</span>
                  <span className="font-headline text-sm font-extrabold text-tertiary">{formatCurrency(totalOutstanding)}</span>
                </div>
                <div className="p-3 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/40 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Overdue Items</span>
                  <span className={`font-headline text-sm font-extrabold ${overdueCount > 0 ? 'text-tertiary' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {overdueCount} {overdueCount === 1 ? 'Installment' : 'Installments'}
                  </span>
                </div>
              </div>

              {/* Installment Schedule Table */}
              <div className="border border-outline-variant/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/45">
                        <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">#</th>
                        <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">Due Date</th>
                        <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase hidden sm:table-cell">Principal</th>
                        <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase hidden sm:table-cell">Interest</th>
                        <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">Total Due</th>
                        <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase hidden md:table-cell">Paid</th>
                        <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">Remaining</th>
                        <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30 font-body text-xs text-on-surface dark:text-white/95">
                      {schedules.map((row) => (
                        <tr key={row.schedule_id} className={`hover:bg-neutral/5 transition-colors ${row.days_overdue > 0 && row.installment_status !== 'paid' ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}>
                          <td className="px-4 py-3 font-mono font-bold text-neutral-500">{row.installment_number}</td>
                          <td className="px-4 py-3 font-mono text-[11px]">
                            {new Date(row.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">{formatCurrency(row.principal_due)}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">{formatCurrency(row.interest_due)}</td>
                          <td className="px-4 py-3 font-bold">{formatCurrency(row.total_due)}</td>
                          <td className="px-4 py-3 hidden md:table-cell font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(parseFloat(row.principal_paid) + parseFloat(row.interest_paid))}
                          </td>
                          <td className="px-4 py-3 font-bold text-tertiary">{formatCurrency(row.outstanding_remaining)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${getInstallmentStatusBadge(row.installment_status, row.days_overdue)}`}>
                              {row.installment_status === 'paid' && <CheckCircle2 className="w-2.5 h-2.5" />}
                              {row.days_overdue > 0 && row.installment_status !== 'paid' && <AlertCircle className="w-2.5 h-2.5" />}
                              {row.installment_status === 'partially_paid' && row.days_overdue <= 0 && <Clock className="w-2.5 h-2.5" />}
                              {getInstallmentLabel(row.installment_status, row.days_overdue)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/40 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
}
