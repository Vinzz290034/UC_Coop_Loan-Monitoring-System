'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Percent,
  Calendar,
  Layers,
  FileText,
  Plus,
  Trash2,
  CreditCard,
  Building,
  Info,
  Save,
  RotateCw,
  Hash,
  Scissors
} from 'lucide-react';

export interface DeductionRow {
  id: string;
  name: string;
  amount: string;
}

interface LoanApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: any;
  onSuccess: (updatedLoan: any, message: string) => void;
}

export default function LoanApprovalModal({
  isOpen,
  onClose,
  loan,
  onSuccess,
}: LoanApprovalModalProps) {
  if (!isOpen || !loan) return null;

  // Form State
  const [principalAmount, setPrincipalAmount] = useState<string>('');
  const [lafNo, setLafNo] = useState<string>('');
  const [termMonths, setTermMonths] = useState<number>(12);
  const [interestRate, setInterestRate] = useState<string>('');
  const [amortizationType, setAmortizationType] = useState<string>('diminishing_balance');
  const [paymentMode, setPaymentMode] = useState<string>('Salary Deduction');
  const [disbursementDate, setDisbursementDate] = useState<string>('');
  const [disbursementMethod, setDisbursementMethod] = useState<string>('Check');
  const [disbursementReference, setDisbursementReference] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Deductions State
  const [deductions, setDeductions] = useState<DeductionRow[]>([]);
  const [activeTab, setActiveTab] = useState<'adjustments' | 'deductions' | 'preview'>('adjustments');

  // Loading & Feedback
  const [loadingNextLaf, setLoadingNextLaf] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize values when modal opens or loan changes
  useEffect(() => {
    if (!loan) return;

    const initialPrincipal = String(loan.principal_amount || '');
    setPrincipalAmount(initialPrincipal);

    const rateNum = parseFloat(String(loan.interest_rate || 0));
    const rateDisplay = rateNum > 0 && rateNum <= 1 ? (rateNum * 100).toFixed(2) : rateNum.toString();
    setInterestRate(rateDisplay);

    setTermMonths(loan.term_months || 12);
    setAmortizationType(loan.amortization_type || 'diminishing_balance');
    setPaymentMode(loan.payment_mode || 'Salary Deduction');
    setRemarks(loan.disbursement_remarks || '');

    const isShortTerm = (loan.product_name || '').toLowerCase().includes('stl') || (loan.product_name || '').toLowerCase().includes('short term');
    let initialMethod = 'Check';
    if (!isShortTerm) {
      initialMethod = 'Check';
    } else {
      const existing = loan.disbursement_method;
      if (existing === 'Cash' || existing === 'GCash' || existing === 'Check') {
        initialMethod = existing;
      } else {
        initialMethod = 'Check';
      }
    }
    setDisbursementMethod(initialMethod);

    if (initialMethod === 'GCash') {
      setBankName(loan.phone || '');
    } else if (initialMethod === 'Check') {
      setBankName('BDO');
    } else {
      setBankName('');
    }

    setDisbursementReference(loan.disbursement_reference || '');

    const todayStr = new Date().toISOString().split('T')[0];
    setDisbursementDate(loan.disbursed_at ? loan.disbursed_at.split('T')[0] : todayStr);

    // If loan has no LAF No, fetch the next suggested LAF
    if (loan.laf_no) {
      setLafNo(loan.laf_no);
    } else {
      fetchNextLaf();
    }

    // Initialize Deductions (empty by default unless already saved on loan)
    let parsedDeds: DeductionRow[] = [];
    if (loan.deductions_breakdown) {
      try {
        const raw = typeof loan.deductions_breakdown === 'string'
          ? JSON.parse(loan.deductions_breakdown)
          : loan.deductions_breakdown;
        if (Array.isArray(raw) && raw.length > 0) {
          parsedDeds = raw.map((d: any, idx: number) => ({
            id: `ded-${idx}-${Date.now()}`,
            name: d.name || 'Deduction',
            amount: String(d.amount || ''),
          }));
        }
      } catch (e) {
        console.warn('Failed to parse existing deductions:', e);
      }
    }

    setDeductions(parsedDeds);
    setErrorMessage(null);
  }, [loan]);

  const fetchNextLaf = async () => {
    try {
      setLoadingNextLaf(true);
      const res = await api.get('/loans/next-laf-no');
      if (res.data?.data?.next_laf_no) {
        setLafNo(res.data.data.next_laf_no);
      }
    } catch (err) {
      console.warn('Could not auto-fetch LAF:', err);
    } finally {
      setLoadingNextLaf(false);
    }
  };

  // Check if current loan is STL / Short Term Loan
  const isSTL = useMemo(() => {
    const name = (loan?.product_name || '').toLowerCase();
    return name.includes('stl') || name.includes('short term');
  }, [loan?.product_name]);

  // Calculations
  const principalNum = parseFloat(principalAmount) || 0;
  const totalDeductions = useMemo(() => {
    return deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  }, [deductions]);
  const netProceeds = Math.max(0, principalNum - totalDeductions);

  // Amortization Preview Estimate
  const estimatedMonthlyAmortization = useMemo(() => {
    if (principalNum <= 0 || termMonths <= 0) return 0;
    const rateVal = parseFloat(interestRate) || 0;
    const monthlyRate = rateVal > 1 ? (rateVal / 100) / 12 : rateVal / 12;
    if (amortizationType === 'flat_rate') {
      const totalInt = principalNum * (rateVal > 1 ? rateVal / 100 : rateVal) * (termMonths / 12);
      return (principalNum + totalInt) / termMonths;
    } else {
      // Diminishing balance installment formula
      if (monthlyRate === 0) return principalNum / termMonths;
      return (principalNum * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    }
  }, [principalNum, termMonths, interestRate, amortizationType]);

  // Deductions Handlers
  const handleAddDeduction = (presetName = '', presetAmount = '') => {
    setDeductions((prev) => [
      ...prev,
      {
        id: `ded-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: presetName,
        amount: presetAmount,
      },
    ]);
  };

  const handleRemoveDeduction = (id: string) => {
    setDeductions((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDeductionChange = (id: string, field: 'name' | 'amount', value: string) => {
    setDeductions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  // Submit Actions
  const handleSubmit = async (mode: 'disburse' | 'save_pending') => {
    setErrorMessage(null);

    if (principalNum <= 0) {
      setErrorMessage('Please specify a valid loan principal amount greater than 0.');
      return;
    }
    if (!termMonths || termMonths <= 0) {
      setErrorMessage('Please specify a loan term duration.');
      return;
    }

    const cleanDeductions = deductions
      .filter((d) => d.name.trim() && !isNaN(parseFloat(d.amount)) && parseFloat(d.amount) > 0)
      .map((d) => ({
        name: d.name.trim(),
        amount: parseFloat(d.amount),
      }));

    let finalRemarks = remarks.trim();
    if (disbursementMethod === 'GCash' && bankName.trim()) {
      const gcashNote = `Member GCash: ${bankName.trim()}`;
      if (!finalRemarks.includes(gcashNote)) {
        finalRemarks = finalRemarks ? `${finalRemarks} | ${gcashNote}` : gcashNote;
      }
    } else if (disbursementMethod === 'Check' && bankName.trim()) {
      const bankNote = `Bank: ${bankName.trim()}`;
      if (!finalRemarks.includes(bankNote)) {
        finalRemarks = finalRemarks ? `${finalRemarks} | ${bankNote}` : bankNote;
      }
    }

    const payload = {
      principal_amount: principalNum,
      laf_no: lafNo.trim() || undefined,
      term_months: termMonths,
      interest_rate: parseFloat(interestRate) || undefined,
      amortization_type: amortizationType,
      payment_mode: paymentMode,
      deductions: cleanDeductions,
      disbursement_method: disbursementMethod,
      disbursement_reference: disbursementReference.trim() || undefined,
      bank_name: bankName.trim() || undefined,
      disbursement_remarks: finalRemarks || undefined,
      disbursement_date: disbursementDate || undefined,
    };

    setSubmitting(true);
    try {
      if (mode === 'disburse') {
        const res = await api.post(`/loans/${loan.id}/disburse`, payload);
        onSuccess(
          res.data.loan,
          `Loan approved and disbursed! Net proceeds of ₱${netProceeds.toLocaleString('en-US', { minimumFractionDigits: 2 })} released.`
        );
      } else {
        const res = await api.put(`/loans/${loan.id}`, {
          ...payload,
          status: 'pending_approval',
          remarks: 'Adjusted loan application terms & deductions prior to disbursement approval',
        });
        onSuccess(
          res.data.data,
          `Loan application updated and saved. Remains in review awaiting disbursement.`
        );
      }
      onClose();
    } catch (err: any) {
      console.error('Action failed:', err);
      setErrorMessage(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Operation failed. Please verify input fields and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const borrowerFullName = [loan.last_name, loan.first_name].filter(Boolean).join(', ') || 'Borrower';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-modal-backdrop font-sans">
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-modal-pop max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/40 flex justify-between items-center bg-neutral-50/70 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-secondary/15 flex items-center justify-center text-primary dark:text-secondary shadow-inner">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline font-bold text-sm sm:text-base text-on-surface dark:text-white">
                  Loan Review, Adjustment & Deductions
                </h3>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Pending Review
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Borrower: <span className="font-bold text-neutral-800 dark:text-neutral-200">{borrowerFullName}</span> • ID: {loan.member_no || 'N/A'} • {loan.product_name || 'Loan'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-outline-variant/40 bg-neutral-100/60 dark:bg-neutral-900/40 px-6 pt-2 text-xs font-bold gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('adjustments')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'adjustments'
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            1. Approved Loan Terms
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deductions')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'deductions'
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            2. Deductions ({deductions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            3. Disbursement Details
          </button>
        </div>

        {/* Net Proceeds Summary Strip */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800/60 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block">
                Approved Principal
              </span>
              <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                ₱{principalNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-neutral-300 dark:text-neutral-700 font-bold text-sm">−</span>
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block">
                Total Deductions
              </span>
              <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                ₱{totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-neutral-300 dark:text-neutral-700 font-bold text-sm">=</span>
          </div>

          <div className="flex items-center gap-2 bg-emerald-100/70 dark:bg-emerald-900/50 px-3.5 py-1.5 rounded-xl border border-emerald-300/60 dark:border-emerald-700/60">
            <span className="text-[11px] font-extrabold uppercase text-emerald-800 dark:text-emerald-300">
              Net Take-Home Proceeds:
            </span>
            <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-300">
              ₱{netProceeds.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: APPROVED LOAN TERMS */}
          {activeTab === 'adjustments' && (
            <div className="space-y-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-900/40 border border-outline-variant/40 rounded-2xl flex items-start gap-2.5 text-xs text-neutral-600 dark:text-neutral-400">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  Adjust granted loan parameters here. If the cooperative approved an amount different from what was applied for, update the Approved Principal. Amortization and dues will compute on this principal.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Approved Principal */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Approved Principal Amount (₱) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₱</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={principalAmount}
                      onChange={(e) => setPrincipalAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-primary"
                      placeholder="3000.00"
                      required
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">Applied amount: ₱{parseFloat(loan.principal_amount || 0).toLocaleString()}</span>
                </div>

                {/* LAF No. */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center justify-between">
                    <span>Assigned LAF No.</span>
                    <button
                      type="button"
                      onClick={fetchNextLaf}
                      disabled={loadingNextLaf}
                      className="text-[10px] text-primary hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RotateCw className={`w-2.5 h-2.5 ${loadingNextLaf ? 'animate-spin' : ''}`} />
                      Auto-generate
                    </button>
                  </label>
                  <input
                    type="text"
                    value={lafNo}
                    onChange={(e) => setLafNo(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:border-primary"
                    placeholder="e.g. 26-001"
                  />
                </div>

                {/* Term Months */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Term (Months) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={termMonths}
                    onChange={(e) => setTermMonths(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl text-xs font-mono focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                {/* Interest Rate */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Interest Rate (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="w-full px-3 pr-8 py-2 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl text-xs font-mono focus:outline-none focus:border-primary"
                      placeholder="2.0"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">%</span>
                  </div>
                </div>

                {/* Amortization Type */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Amortization Method
                  </label>
                  <select
                    value={amortizationType}
                    onChange={(e) => setAmortizationType(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl text-xs focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="diminishing_balance">Diminishing Balance (Coop Standard)</option>
                    <option value="flat_rate">Flat Rate / Straight Line</option>
                  </select>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl text-xs focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Salary Deduction">Salary Deduction</option>
                    <option value="Semi-Monthly">Semi-Monthly Payroll</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Over the Counter">Over the Counter</option>
                    <option value="Post-Dated Check">Post-Dated Check</option>
                  </select>
                </div>
              </div>

              {/* Installment Projection Card */}
              <div className="p-4 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/60 border border-outline-variant/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Estimated Monthly Amortization</span>
                  <p className="font-bold text-xs text-neutral-800 dark:text-neutral-200">
                    ₱{estimatedMonthlyAmortization.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('deductions')}
                  className="px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary dark:text-secondary font-bold text-xs transition-colors cursor-pointer"
                >
                  Configure Deductions →
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DEDUCTIONS */}
          {activeTab === 'deductions' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Scissors className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Deductions (such as processing fees, CBU retention, and insurance) reduce the net cash/check released to the member. You can add, customize, or remove any deduction items.
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-neutral-500">Quick Add:</span>
                <button
                  type="button"
                  onClick={() => handleAddDeduction('Service / Processing Fee', String(Math.round(principalNum * 0.02) || 100))}
                  className="px-2.5 py-1 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-lg text-xs font-semibold hover:border-primary text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  + Service Fee (2%)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddDeduction('Capital Build-Up (CBU)', String(Math.round(principalNum * 0.02) || 100))}
                  className="px-2.5 py-1 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-lg text-xs font-semibold hover:border-primary text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  + CBU Retention (2%)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddDeduction('Loan Protection Insurance (CLPP)', '50')}
                  className="px-2.5 py-1 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-lg text-xs font-semibold hover:border-primary text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  + Insurance (₱50)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddDeduction('Savings Retention', '100')}
                  className="px-2.5 py-1 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-lg text-xs font-semibold hover:border-primary text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  + Savings Retention
                </button>
              </div>

              {/* Deductions List */}
              <div className="space-y-2 border border-outline-variant/40 rounded-2xl p-3 bg-neutral-50/50 dark:bg-neutral-900/30">
                {deductions.length === 0 ? (
                  <div className="py-6 text-center text-neutral-400 text-xs">
                    <p className="font-semibold">No deductions configured.</p>
                    <p className="text-[11px]">Member will receive the full 100% of the loan principal.</p>
                  </div>
                ) : (
                  deductions.map((ded, idx) => (
                    <div
                      key={ded.id}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-neutral-800 border border-outline-variant/40 shadow-2xs"
                    >
                      <span className="w-5 text-center font-mono text-[10px] text-neutral-400 font-bold">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={ded.name}
                        onChange={(e) => handleDeductionChange(ded.id, 'name', e.target.value)}
                        placeholder="Deduction Name / Fee Reason"
                        className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40 rounded-lg text-xs font-medium focus:outline-none focus:border-primary"
                      />
                      <div className="relative w-32 sm:w-36">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">₱</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={ded.amount}
                          onChange={(e) => handleDeductionChange(ded.id, 'amount', e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-6 pr-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40 rounded-lg text-xs font-mono font-bold text-right focus:outline-none focus:border-primary"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDeduction(ded.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Remove deduction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}

                <button
                  type="button"
                  onClick={() => handleAddDeduction('', '')}
                  className="w-full py-2 border border-dashed border-outline-variant/80 hover:border-primary rounded-xl text-xs font-bold text-primary dark:text-secondary flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white/50 dark:bg-neutral-800/40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Deduction Row
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DISBURSEMENT DETAILS */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Disbursement Method */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Release Method
                    </label>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      {isSTL ? 'Short Term Loan (STL)' : 'Regular Loan'}
                    </span>
                  </div>
                  <select
                    value={disbursementMethod}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDisbursementMethod(val);
                      if (val === 'GCash') {
                        if (!bankName || bankName === 'BDO') {
                          setBankName(loan?.phone || '');
                        }
                      } else if (val === 'Check') {
                        if (!bankName || bankName === loan?.phone) {
                          setBankName('BDO');
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Check">Check Voucher</option>
                    {isSTL && (
                      <>
                        <option value="Cash">Cash on Hand</option>
                        <option value="GCash">GCash</option>
                      </>
                    )}
                  </select>
                  {!isSTL ? (
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      Policy: Regular loans are released via Check Voucher only.
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      Options for STL: Check Voucher, Cash on Hand, or GCash only.
                    </span>
                  )}
                </div>

                {/* Disbursement Date */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Disbursement Date
                  </label>
                  <input
                    type="date"
                    value={disbursementDate}
                    onChange={(e) => setDisbursementDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl text-xs font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Check No / Ref No */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {disbursementMethod === 'Check'
                      ? 'Check Number'
                      : disbursementMethod === 'GCash'
                      ? 'GCash Reference Number'
                      : 'Cash Voucher'}
                  </label>
                  <input
                    type="text"
                    value={disbursementReference}
                    onChange={(e) => setDisbursementReference(e.target.value)}
                    placeholder={
                      disbursementMethod === 'Check'
                        ? 'e.g. 0082348'
                        : disbursementMethod === 'GCash'
                        ? 'e.g. 90123849102'
                        : 'e.g. Cash Voucher'
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl text-xs font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Bank / Member GCash — hidden for Cash on Hand */}
                {disbursementMethod !== 'Cash' && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                      {disbursementMethod === 'Check'
                        ? 'Disbursing Bank'
                        : 'Member GCash / Mobile No.'}
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder={
                        disbursementMethod === 'Check'
                          ? 'BDO / Landbank'
                          : (loan?.phone || 'e.g. 0917 123 4567')
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl text-xs focus:outline-none focus:border-primary"
                    />
                    {disbursementMethod === 'GCash' && (
                      <span className="text-[10px] text-neutral-500 mt-1 block">
                        Loan proceeds will be sent to the member's personal GCash number.
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Remarks / Particulars */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  Disbursement Remarks & Accounting Particulars
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Notes for credit committee, check voucher description, or disbursement conditions..."
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl text-xs focus:outline-none focus:border-primary"
                />
              </div>

              {/* Comprehensive Summary Voucher */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Gross Approved Principal:</span>
                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    ₱{principalNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {deductions.map((d) => (
                  <div key={d.id} className="flex justify-between text-neutral-500 dark:text-neutral-400 text-[11px] pl-3 border-l-2 border-outline-variant/40">
                    <span>Less: {d.name || 'Deduction'}</span>
                    <span className="font-mono text-amber-700 dark:text-amber-400">
                      -₱{(parseFloat(d.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <div className="border-t border-outline-variant/40 pt-2 flex justify-between font-bold text-sm text-emerald-700 dark:text-emerald-300">
                  <span>Net Disbursed Take-Home:</span>
                  <span className="font-mono">
                    ₱{netProceeds.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-outline-variant/40 bg-neutral-50/70 dark:bg-neutral-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 border border-outline-variant rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Save Application Edits Only (Keep Pending) */}
            <button
              type="button"
              onClick={() => handleSubmit('save_pending')}
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary dark:text-secondary text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              title="Save adjusted loan amount, terms, and planned deductions while keeping loan in pending review"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : 'Save Edits (Keep Pending)'}</span>
            </button>

            {/* Approve & Disburse Now */}
            <button
              type="button"
              onClick={() => handleSubmit('disburse')}
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-primary dark:bg-secondary text-white dark:text-neutral-950 text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? 'Disbursing...'
                  : `Approve & Disburse (₱${netProceeds.toLocaleString('en-US', { minimumFractionDigits: 2 })} Net)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
