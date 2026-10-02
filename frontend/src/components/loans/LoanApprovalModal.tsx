'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@/lib/api';
import {
  X,
  AlertCircle,
  RotateCw,
  Loader2,
  Save,
  Calendar,
  FileText,
  User,
  DollarSign,
  ReceiptText,
  CreditCard,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2
} from 'lucide-react';

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

  // Slip Header
  const [applyDate, setApplyDate] = useState<string>('');
  const [applyLafNo, setApplyLafNo] = useState<string>('');
  const [loadingLafNo, setLoadingLafNo] = useState(false);

  // Borrower's Part
  const [borrowerName, setBorrowerName] = useState<string>('');
  const [borrowerAge, setBorrowerAge] = useState<string>('');
  const [investmentAmount, setInvestmentAmount] = useState<string>('');

  // Loan Amount & Term
  const [applyAmount, setApplyAmount] = useState<number>(0);
  const [applyTermMonths, setApplyTermMonths] = useState<number>(12);

  // Deductions
  const [applyServiceFee, setApplyServiceFee] = useState<string>('100');
  const [applyInsurance, setApplyInsurance] = useState<string>('11');
  const [applyFixedDeposit, setApplyFixedDeposit] = useState<string>('0');
  const [applyOtherCharges, setApplyOtherCharges] = useState<string>('0');

  // Multi-Previous Active Loan selection
  interface PrevLoanDeductionItem {
    id: string;
    loanId: string;
    amount: string;
  }
  const [memberActiveLoans, setMemberActiveLoans] = useState<any[]>([]);
  const [prevLoanDeductions, setPrevLoanDeductions] = useState<PrevLoanDeductionItem[]>([
    { id: 'pld-1', loanId: '', amount: '0' }
  ]);
  const [loadingMemberLoans, setLoadingMemberLoans] = useState(false);
  const [openPrevLoanDropdownId, setOpenPrevLoanDropdownId] = useState<string | null>(null);
  const prevLoanSectionRef = useRef<HTMLDivElement>(null);

  // Custom Monthly Payment Schedule
  const [applyScheduleAmounts, setApplyScheduleAmounts] = useState<Record<number, string>>({});

  // Loading & Error Feedback
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (prevLoanSectionRef.current && !prevLoanSectionRef.current.contains(e.target as Node)) {
        setOpenPrevLoanDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Fetch active loans of the borrower for the previous loan deduction dropdown
  useEffect(() => {
    if (!loan?.member_id) return;
    const fetchMemberLoans = async () => {
      try {
        setLoadingMemberLoans(true);
        const res = await api.get('/loans', { params: { member_id: loan.member_id } });
        const allLoans = res.data?.data || [];
        const activeLoans = allLoans.filter((l: any) => {
          if (String(l.id) === String(loan.id)) return false; // don't deduct current loan from itself
          const isFinished = l.status === 'fully_paid' || l.status === 'rejected';
          const rem = parseFloat(l.remaining_balance);
          return !isFinished && (isNaN(rem) || rem > 0);
        });
        setMemberActiveLoans(activeLoans);
      } catch (err) {
        console.error('Error fetching member loans for deductions:', err);
      } finally {
        setLoadingMemberLoans(false);
      }
    };
    fetchMemberLoans();
  }, [loan?.member_id, loan?.id]);

  // Initialize all values when modal opens or loan changes
  useEffect(() => {
    if (!loan) return;

    // Slip Header
    const appDate = loan.created_at
      ? new Date(loan.created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setApplyDate(appDate);
    setApplyLafNo(loan.laf_no || '');

    // Borrower Info
    const bName =
      [loan.first_name, loan.middle_name, loan.last_name].filter(Boolean).join(' ') ||
      loan.borrower_name ||
      '';
    setBorrowerName(bName);
    setBorrowerAge(loan.age ? String(loan.age) : '');
    setInvestmentAmount(loan.share_capital ? String(loan.share_capital) : '');

    // Principal & Term
    setApplyAmount(parseFloat(loan.principal_amount) || 0);
    setApplyTermMonths(parseInt(loan.term_months, 10) || 12);

    // Parse existing deductions
    let deds: Array<{ name: string; amount: number }> = [];
    if (loan.deductions_breakdown) {
      if (typeof loan.deductions_breakdown === 'string') {
        try {
          deds = JSON.parse(loan.deductions_breakdown);
        } catch {
          deds = [];
        }
      } else if (Array.isArray(loan.deductions_breakdown)) {
        deds = loan.deductions_breakdown;
      }
    }

    const serviceFeeItem = deds.find((d) => d.name?.toLowerCase().includes('service fee'));
    setApplyServiceFee(serviceFeeItem ? String(serviceFeeItem.amount) : '100');

    const insuranceItem = deds.find((d) => d.name?.toLowerCase().includes('insurance'));
    setApplyInsurance(insuranceItem ? String(insuranceItem.amount) : '11');

    const fixedDepItem = deds.find((d) => d.name?.toLowerCase().includes('fixed deposit'));
    setApplyFixedDeposit(fixedDepItem ? String(fixedDepItem.amount) : '0');

    const othersItem = deds.find((d) => d.name?.toLowerCase().includes('other'));
    setApplyOtherCharges(othersItem ? String(othersItem.amount) : '0');

    const prevBalItems = deds.filter((d) => d.name?.toLowerCase().includes('previous loan balance'));
    if (prevBalItems.length > 0) {
      setPrevLoanDeductions(
        prevBalItems.map((pb, idx) => ({
          id: `pld-init-${idx}-${Date.now()}`,
          loanId: '',
          amount: String(pb.amount || 0)
        }))
      );
    } else {
      setPrevLoanDeductions([{ id: 'pld-1', loanId: '', amount: '0' }]);
    }

    // Parse custom schedule
    let sched: any[] = [];
    if (loan.custom_schedule) {
      if (typeof loan.custom_schedule === 'string') {
        try {
          sched = JSON.parse(loan.custom_schedule);
        } catch {
          sched = [];
        }
      } else if (Array.isArray(loan.custom_schedule)) {
        sched = loan.custom_schedule;
      }
    }

    const customObj: Record<number, string> = {};
    sched.forEach((item, idx) => {
      if (item && item.payment !== undefined) {
        customObj[idx] = String(item.payment);
      }
    });
    setApplyScheduleAmounts(customObj);

    setErrorMessage(null);
  }, [loan]);

  // Auto-match prevLoanDeductions to memberActiveLoans when memberActiveLoans load
  useEffect(() => {
    if (memberActiveLoans.length === 0) return;
    setPrevLoanDeductions((prev) =>
      prev.map((p) => {
        if (p.loanId) return p;
        const matched = memberActiveLoans.find(
          (al) => Math.abs(parseFloat(al.remaining_balance || 0) - (parseFloat(p.amount) || 0)) < 0.01
        );
        if (matched) {
          return { ...p, loanId: String(matched.id) };
        }
        return p;
      })
    );
  }, [memberActiveLoans]);

  // Auto-generate next sequential LAF number
  const fetchNextLafNo = async () => {
    try {
      setLoadingLafNo(true);
      const res = await api.get('/loans/next-laf');
      if (res.data?.laf_no) {
        setApplyLafNo(res.data.laf_no);
      }
    } catch (err) {
      console.warn('Could not auto-fetch LAF:', err);
    } finally {
      setLoadingLafNo(false);
    }
  };

  // Handlers for previous active loan deductions list
  const handleAddPrevLoanDeduction = () => {
    const unselected = memberActiveLoans.find(
      (l) => !prevLoanDeductions.some((p) => String(p.loanId) === String(l.id))
    );
    const newLoanId = unselected ? String(unselected.id) : '';
    const newAmount = unselected ? String(unselected.remaining_balance ?? unselected.principal_amount ?? 0) : '0';
    setPrevLoanDeductions((prev) => [
      ...prev,
      {
        id: `pld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        loanId: newLoanId,
        amount: newAmount
      }
    ]);
  };

  const handleRemovePrevLoanDeduction = (id: string) => {
    setPrevLoanDeductions((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      return updated.length > 0 ? updated : [{ id: `pld-${Date.now()}`, loanId: '', amount: '0' }];
    });
  };

  const handlePrevLoanSelect = (rowId: string, loanId: string) => {
    setPrevLoanDeductions((prev) =>
      prev.map((item) => {
        if (item.id !== rowId) return item;
        if (!loanId) {
          return { ...item, loanId: '', amount: '0' };
        }
        const found = memberActiveLoans.find((l) => String(l.id) === String(loanId));
        const bal = found ? (found.remaining_balance ?? found.principal_amount ?? 0) : 0;
        return {
          ...item,
          loanId,
          amount: String(!isNaN(bal) ? bal : 0)
        };
      })
    );
    setOpenPrevLoanDropdownId(null);
  };

  const handlePrevLoanAmountChange = (rowId: string, amount: string) => {
    setPrevLoanDeductions((prev) =>
      prev.map((item) => (item.id === rowId ? { ...item, amount } : item))
    );
  };

  const totalPrevBalanceCalc = useMemo(() => {
    return prevLoanDeductions.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);
  }, [prevLoanDeductions]);

  const selectedPrevLoanObj = useMemo(() => {
    const first = prevLoanDeductions.find((p) => p.loanId);
    if (!first) return null;
    return memberActiveLoans.find((l: any) => String(l.id) === String(first.loanId)) || null;
  }, [memberActiveLoans, prevLoanDeductions]);

  const prevLoanFines = useMemo(() => {
    return prevLoanDeductions.reduce((sum, item) => {
      if (!item.loanId) return sum;
      const found = memberActiveLoans.find((l: any) => String(l.id) === String(item.loanId));
      return sum + parseFloat(found?.total_fines || 0);
    }, 0);
  }, [memberActiveLoans, prevLoanDeductions]);

  const prevLoanInterest = useMemo(() => {
    return prevLoanDeductions.reduce((sum, item) => {
      if (!item.loanId) return sum;
      const found = memberActiveLoans.find((l: any) => String(l.id) === String(item.loanId));
      return sum + parseFloat(found?.remaining_interest || 0);
    }, 0);
  }, [memberActiveLoans, prevLoanDeductions]);

  // Calculations
  const totalDeductionsCalc = useMemo(() => {
    return (
      (parseFloat(String(applyServiceFee)) || 0) +
      (parseFloat(String(applyInsurance)) || 0) +
      (parseFloat(String(applyFixedDeposit)) || 0) +
      totalPrevBalanceCalc +
      (parseFloat(String(applyOtherCharges)) || 0)
    );
  }, [applyServiceFee, applyInsurance, applyFixedDeposit, totalPrevBalanceCalc, applyOtherCharges]);

  const netProceedsCalc = useMemo(() => {
    return Math.max(0, (applyAmount || 0) - totalDeductionsCalc);
  }, [applyAmount, totalDeductionsCalc]);

  // Compute monthly payment schedule preview
  const monthlySchedulePreview = useMemo(() => {
    const principal = applyAmount || 0;
    const terms = applyTermMonths || 1;
    if (principal <= 0 || terms <= 0) return [];

    const parsedRate = parseFloat(String(loan?.interest_rate || 0.02));
    const rate =
      parsedRate > 1
        ? parsedRate / 100
        : parsedRate > 0
        ? parsedRate
        : terms === 36
        ? 0.15
        : 0.02;

    const monthlyPrincipal = principal / terms;
    const schedule: { monthLabel: string; payment: number }[] = [];

    let remaining = principal;
    for (let i = 1; i <= terms; i++) {
      let interest = 0;
      if (loan?.amortization_type === 'flat_rate') {
        interest = principal * rate;
      } else {
        interest = remaining * rate;
      }
      const rawPayment = monthlyPrincipal + interest;
      const roundedPayment = Math.round(rawPayment * 100) / 100;

      let label = `${i}th Month`;
      if (i === 1) label = '1st Month';
      else if (i === 2) label = '2nd Month';
      else if (i === 3) label = '3rd Month';

      schedule.push({
        monthLabel: label,
        payment: roundedPayment,
      });

      remaining = Math.max(0, remaining - monthlyPrincipal);
    }
    return schedule;
  }, [applyAmount, applyTermMonths, loan?.interest_rate, loan?.amortization_type]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(val || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (applyAmount <= 0) {
      setErrorMessage('Please specify a valid loan principal amount greater than 0.');
      return;
    }
    if (!applyTermMonths || applyTermMonths <= 0) {
      setErrorMessage('Please specify a valid loan term (months) duration.');
      return;
    }

    let othersLabel = 'Others';
    const curOther = parseFloat(String(applyOtherCharges)) || 0;
    if (curOther > 0) {
      if (prevLoanFines > 0 && Math.abs(curOther - prevLoanFines) < 0.01) {
        othersLabel = 'Others (Fines)';
      } else if (prevLoanInterest > 0 && Math.abs(curOther - prevLoanInterest) < 0.01) {
        othersLabel = 'Others (Interest)';
      } else if (prevLoanFines > 0 && prevLoanInterest > 0 && Math.abs(curOther - (prevLoanFines + prevLoanInterest)) < 0.01) {
        othersLabel = 'Others (Fines + Interest)';
      }
    }

    const prevLoanDeductionItems = prevLoanDeductions
      .map((item) => {
        const amt = parseFloat(String(item.amount)) || 0;
        if (amt <= 0) return null;
        const found = memberActiveLoans.find((l: any) => String(l.id) === String(item.loanId));
        const label = found
          ? `Previous Loan Balance (${found.laf_no ? `LAF: ${found.laf_no}` : found.product_name || 'Active Loan'})`
          : 'Previous Loan Balance';
        return { name: label, amount: amt };
      })
      .filter((d): d is { name: string; amount: number } => d !== null);

    const deductionsPayload = [
      { name: 'Service Fee', amount: parseFloat(String(applyServiceFee)) || 0 },
      { name: 'Insurance', amount: parseFloat(String(applyInsurance)) || 0 },
      { name: 'Fixed Deposit', amount: parseFloat(String(applyFixedDeposit)) || 0 },
      ...prevLoanDeductionItems,
      { name: othersLabel, amount: parseFloat(String(applyOtherCharges)) || 0 },
    ].filter((d) => d.amount > 0);

    const customSchedulePayload = monthlySchedulePreview.map((item, idx) => {
      const customVal = applyScheduleAmounts[idx];
      const paymentAmount =
        customVal !== undefined && !isNaN(parseFloat(customVal))
          ? parseFloat(customVal)
          : item.payment;
      return {
        month_index: idx + 1,
        month_label: item.monthLabel,
        payment: paymentAmount,
      };
    });

    const payload = {
      principal_amount: applyAmount,
      laf_no: applyLafNo.trim() || undefined,
      term_months: applyTermMonths,
      application_date: applyDate || undefined,
      deductions: deductionsPayload,
      custom_schedule: customSchedulePayload,
      status: loan.status || 'approved',
      recalculate_schedules: true,
      remarks: 'Adjusted loan application terms & details from desk slip',
    };

    setSubmitting(true);
    try {
      const res = await api.put(`/loans/${loan.id}`, payload);
      onSuccess(res.data.data, 'Loan application slip updated successfully!');
      onClose();
    } catch (err: any) {
      console.error('Update failed:', err);
      setErrorMessage(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to update loan application. Please check values and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/60 backdrop-blur-sm animate-modal-backdrop">
      <div className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-pop">
        {/* Sticky Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-outline-variant/40 bg-neutral-50/70 dark:bg-neutral-800/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-secondary/15 flex items-center justify-center text-primary dark:text-secondary flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline font-bold text-base sm:text-lg text-on-surface dark:text-white">
                  Edit Loan Application Slip
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Desk Slip Override
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Borrower: <span className="font-bold text-neutral-800 dark:text-neutral-200">{borrowerName}</span> • {loan.product_name || 'Loan'} ({loan.amortization_type === 'flat_rate' ? 'Flat Rate' : 'Diminishing Balance'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="loan-edit-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-0">
          {errorMessage && (
            <div className="p-3 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2.5 items-center">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-tertiary" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

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
                  title="Auto-suggest next sequential LAF No."
                >
                  {loadingLafNo ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Auto-Suggest'
                  )}
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
              <span className="text-[11px] text-neutral-500">From Physical Slip</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                  Borrower Name
                </label>
                <input
                  type="text"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  placeholder="Borrower Full Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/40 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                  Age
                </label>
                <input
                  type="number"
                  value={borrowerAge}
                  onChange={(e) => setBorrowerAge(e.target.value)}
                  placeholder="e.g. 38"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/40 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                    Investment Amount (CBU)
                  </label>
                </div>
                <input
                  type="number"
                  step="any"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  placeholder="e.g. 22000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/40 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Loan Amount & Term Selection */}
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
                <span className="absolute left-4 font-headline text-2xl font-black text-primary dark:text-secondary">
                  ₱
                </span>
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
            </div>

            {/* Quick Presets for STL Types */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                Quick Presets / STL Types:
              </span>
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
                      <div className="text-[10px] uppercase font-bold tracking-tight">
                        {preset.label}
                      </div>
                      <div className="text-xs font-extrabold">
                        {formatCurrency(preset.amount)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Term Selection */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
                <span>Loan Term Duration:</span>
                <span className="font-extrabold text-primary dark:text-secondary">
                  {applyTermMonths} {applyTermMonths === 1 ? 'Month' : 'Months'}
                </span>
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
                <div className="flex items-center">
                  <input
                    type="number"
                    min="1"
                    value={applyTermMonths}
                    onChange={(e) => setApplyTermMonths(parseInt(e.target.value, 10) || 1)}
                    placeholder="Months"
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/60 text-xs font-bold text-center text-on-surface dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: For Staff Only - Less Charges & Net Proceeds */}
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
                <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                  Service Fee
                </label>
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
                <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                  Insurance
                </label>
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
                <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                  Fixed Deposit
                </label>
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

            {/* Previous Loan Balance Deduction */}
            <div className="p-3 bg-white dark:bg-surface-container-high/40 rounded-xl border border-outline-variant/60 space-y-3" ref={prevLoanSectionRef}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <ReceiptText className="w-3.5 h-3.5 text-primary" />
                  Previous Loan Balance Deduction
                  {prevLoanDeductions.filter((p) => p.loanId).length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-secondary text-[9px] font-bold">
                      {prevLoanDeductions.filter((p) => p.loanId).length}
                    </span>
                  )}
                </label>
                {totalPrevBalanceCalc > 0 && (
                  <span className="text-[10px] text-primary dark:text-secondary font-semibold font-mono">
                    Total Deducted: ₱{totalPrevBalanceCalc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              {/* List of Previous Loan Deductions */}
              <div className="space-y-2.5">
                {prevLoanDeductions.map((item, idx) => {
                  const selectedLoan = memberActiveLoans.find((l: any) => String(l.id) === String(item.loanId));
                  const isDropdownOpen = openPrevLoanDropdownId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-outline-variant/60 bg-neutral-50/70 dark:bg-surface-container-high/30 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-[10px] font-mono font-bold text-neutral-700 dark:text-neutral-300">
                            #{idx + 1}
                          </span>
                          {selectedLoan ? (
                            <span className="text-[10px] font-semibold text-primary dark:text-secondary">
                              Current Bal: ₱{Number(selectedLoan.remaining_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-400 italic">
                              Select a loan to deduct
                            </span>
                          )}
                        </div>
                        {prevLoanDeductions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePrevLoanDeduction(item.id)}
                            className="text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Remove this deduction row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Loan Selector Dropdown */}
                        <div className="sm:col-span-2 space-y-1 relative">
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
                            Select Active Loan to Deduct
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              if (!loadingMemberLoans && memberActiveLoans.length > 0) {
                                setOpenPrevLoanDropdownId(isDropdownOpen ? null : item.id);
                              }
                            }}
                            disabled={loadingMemberLoans || memberActiveLoans.length === 0}
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer bg-white dark:bg-surface-container-high/60 ${
                              isDropdownOpen
                                ? 'border-primary ring-2 ring-primary/20 shadow-sm'
                                : 'border-outline-variant hover:border-primary/40'
                            } ${loadingMemberLoans || memberActiveLoans.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <CreditCard
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  selectedLoan ? 'text-primary dark:text-secondary' : 'text-neutral-400'
                                }`}
                              />
                              <span
                                className={`truncate ${
                                  selectedLoan
                                    ? 'text-on-surface dark:text-white font-semibold'
                                    : 'text-neutral-500 font-normal'
                                }`}
                              >
                                {loadingMemberLoans
                                  ? "Loading member's active loans..."
                                  : memberActiveLoans.length === 0
                                  ? 'No other active loans found'
                                  : selectedLoan
                                  ? `${selectedLoan.laf_no ? `[${selectedLoan.laf_no}] ` : ''}${selectedLoan.product_name || 'Loan'} — Bal: ₱${Number(selectedLoan.remaining_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : '-- None / No previous loan deduction --'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {loadingMemberLoans && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
                              )}
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                                  isDropdownOpen ? 'rotate-180 text-primary dark:text-secondary' : ''
                                }`}
                              />
                            </div>
                          </button>

                          {/* Dropdown Popover */}
                          {isDropdownOpen && (
                            <div
                              className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white dark:bg-surface-container-high border border-outline-variant/70 rounded-2xl shadow-2xl overflow-hidden p-1 max-h-56 overflow-y-auto"
                              style={{
                                boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.3), 0 4px 16px -2px rgba(0, 0, 0, 0.2)'
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handlePrevLoanSelect(item.id, '')}
                                className={`w-full px-3 py-2 text-left text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                                  !item.loanId
                                    ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary font-bold'
                                    : 'hover:bg-neutral-100 dark:hover:bg-surface-container-highest text-neutral-600 dark:text-neutral-300'
                                }`}
                              >
                                <span className="italic">-- None / No previous loan deduction --</span>
                                {!item.loanId && <CheckCircle2 className="w-4 h-4 text-primary dark:text-secondary shrink-0" />}
                              </button>

                              {memberActiveLoans.map((l: any) => {
                                const isCurrentSelected = String(l.id) === String(item.loanId);
                                const isSelectedInOtherRow = prevLoanDeductions.some(
                                  (p) => p.id !== item.id && String(p.loanId) === String(l.id)
                                );

                                return (
                                  <button
                                    key={l.id}
                                    type="button"
                                    disabled={isSelectedInOtherRow}
                                    onClick={() => handlePrevLoanSelect(item.id, String(l.id))}
                                    className={`w-full px-3 py-2 text-left rounded-xl flex items-center justify-between gap-3 transition-colors ${
                                      isSelectedInOtherRow
                                        ? 'opacity-40 cursor-not-allowed bg-neutral-100/50 dark:bg-neutral-900/30'
                                        : isCurrentSelected
                                        ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary font-bold cursor-pointer'
                                        : 'hover:bg-neutral-100 dark:hover:bg-surface-container-highest text-neutral-800 dark:text-neutral-200 cursor-pointer'
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
                                        {isSelectedInOtherRow && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold">
                                            Already added
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                        <span>Status: <span className="capitalize">{l.status}</span></span>
                                        {parseFloat(l.remaining_interest || 0) > 0 && (
                                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                            • Int: ₱{Number(l.remaining_interest).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                        )}
                                        {parseFloat(l.total_fines || 0) > 0 && (
                                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                            • Fines: ₱{Number(l.total_fines).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
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
                                      {isCurrentSelected && <CheckCircle2 className="w-4 h-4 text-primary dark:text-secondary shrink-0" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Prev Loan Amount Input */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                            <span>Prev. Loan Balance (₱)</span>
                            {selectedLoan && (
                              <button
                                type="button"
                                onClick={() => handlePrevLoanAmountChange(item.id, String(selectedLoan.remaining_balance ?? selectedLoan.principal_amount ?? 0))}
                                className="text-[9px] text-primary dark:text-secondary hover:underline cursor-pointer"
                                title="Reset to full balance"
                              >
                                Full Bal
                              </button>
                            )}
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={item.amount}
                            onChange={(e) => handlePrevLoanAmountChange(item.id, e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-high/60 text-xs font-bold text-primary dark:text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Another Previous Loan Button */}
              {memberActiveLoans.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddPrevLoanDeduction}
                  disabled={prevLoanDeductions.length >= memberActiveLoans.length}
                  className={`w-full py-2 px-3 rounded-xl border-2 border-dashed text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    prevLoanDeductions.length >= memberActiveLoans.length
                      ? 'border-neutral-200 dark:border-neutral-800 text-neutral-400 opacity-60 cursor-not-allowed'
                      : 'border-primary/40 hover:border-primary/70 dark:border-primary/50 dark:hover:border-primary/90 bg-primary/5 hover:bg-primary/10 text-primary dark:text-emerald-300'
                  }`}
                  title={
                    prevLoanDeductions.length >= memberActiveLoans.length
                      ? 'All active loans for this member have already been added'
                      : 'Add another active loan to deduct'
                  }
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {prevLoanDeductions.length >= memberActiveLoans.length
                      ? 'All Active Loans Added'
                      : '+ Add Another Previous Loan Balance'}
                  </span>
                </button>
              )}
            </div>

            {/* Summary of Charges & Net Proceeds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                    Total Charges
                  </span>
                  <span className="text-xs text-neutral-500">Less from principal</span>
                </div>
                <span className="text-base font-black font-headline text-amber-800 dark:text-amber-300">
                  {formatCurrency(totalDeductionsCalc)}
                </span>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                    Net Loan Proceeds
                  </span>
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
                  {loan?.amortization_type === 'flat_rate'
                    ? 'Flat Rate'
                    : 'Diminishing Balance'}
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
              {monthlySchedulePreview.map((item, idx) => {
                const currentVal =
                  applyScheduleAmounts[idx] !== undefined
                    ? applyScheduleAmounts[idx]
                    : item.payment;
                return (
                  <div
                    key={idx}
                    className="bg-white dark:bg-surface-container-high/60 border border-outline-variant/50 rounded-xl p-2.5 space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        {item.monthLabel}:
                      </span>
                      <span className="text-[9px] text-neutral-400 font-mono">
                        Auto: ₱{item.payment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-bold text-neutral-400">
                        ₱
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={currentVal}
                        onChange={(e) =>
                          setApplyScheduleAmounts((prev) => ({
                            ...prev,
                            [idx]: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-outline-variant bg-white dark:bg-surface-container-high/80 text-xs font-bold font-mono text-primary dark:text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Dedicated Fixed Footer - Never overlaps content */}
        <div className="flex items-center gap-3 p-4 sm:px-6 py-3.5 border-t border-outline-variant/40 bg-neutral-50/90 dark:bg-neutral-800/80 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 px-4 rounded-xl border border-outline-variant/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="loan-edit-form"
            disabled={submitting || applyAmount <= 0}
            className="flex-1 py-2.5 px-4 rounded-xl bg-primary dark:bg-secondary text-white dark:text-neutral-950 text-sm font-bold shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Loan Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
