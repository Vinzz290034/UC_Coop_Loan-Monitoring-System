'use client';

import React, { useState } from 'react';
import api from '@/lib/api';
import {
  Calculator,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Percent,
  Banknote,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ScheduleItem {
  installment_number: number;
  due_date: string;
  principal_due: number;
  interest_due: number;
  total_due: number;
  running_balance?: number;
}

interface PreviewResult {
  principal_amount: number;
  total_interest: number;
  total_repayment: number;
  term_months: number;
  amortization_type: string;
  schedule: ScheduleItem[];
}

export default function LoanAmortizationCalculator() {
  const [form, setForm] = useState({
    principal_amount: '',
    interest_rate: '',
    term_months: '',
    amortization_type: 'flat_rate',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const principal = parseFloat(form.principal_amount);
    const rate = parseFloat(form.interest_rate);
    const term = parseInt(form.term_months, 10);

    if (!principal || principal <= 0) {
      setError('Please enter a valid principal amount.');
      return;
    }
    if (rate === undefined || rate < 0) {
      setError('Please enter a valid interest rate.');
      return;
    }
    if (!term || term <= 0) {
      setError('Please enter a valid loan term in months.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await api.post('/loans/preview-schedule', {
        principal_amount: principal,
        interest_rate: rate / 100, // Convert percentage to decimal for backend
        term_months: term,
        amortization_type: form.amortization_type,
      });

      if (res.data && res.data.success) {
        setResult(res.data.data);
        setShowSchedule(false);
      }
    } catch (err: any) {
      console.error('Amortization preview error:', err);
      setError(err.response?.data?.error?.message || 'Failed to generate amortization preview.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(val || 0);
  };

  const handleReset = () => {
    setForm({ principal_amount: '', interest_rate: '', term_months: '', amortization_type: 'flat_rate' });
    setResult(null);
    setError(null);
    setShowSchedule(false);
  };

  return (
    <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-outline-variant/40 bg-surface-container-low dark:bg-surface-container-high/40 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary dark:text-secondary" />
        <h3 className="font-headline font-bold text-base text-on-surface dark:text-white">Amortization Calculator</h3>
        <span className="text-[10px] bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary font-bold px-2.5 py-0.5 rounded-full ml-auto">
          Preview Tool
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Principal Amount */}
          <div className="space-y-1.5">
            <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5" />
              Loan Principal (₱) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={form.principal_amount}
              onChange={(e) => setForm(prev => ({ ...prev, principal_amount: e.target.value }))}
              placeholder="e.g. 100,000"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
            />
          </div>

          {/* Interest Rate */}
          <div className="space-y-1.5">
            <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" />
              Interest Rate (% p.a.) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={form.interest_rate}
              onChange={(e) => setForm(prev => ({ ...prev, interest_rate: e.target.value }))}
              placeholder="e.g. 12"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
            />
          </div>

          {/* Term Months */}
          <div className="space-y-1.5">
            <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Loan Term (Months) *
            </label>
            <input
              type="number"
              step="1"
              min="1"
              required
              value={form.term_months}
              onChange={(e) => setForm(prev => ({ ...prev, term_months: e.target.value }))}
              placeholder="e.g. 12"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
            />
          </div>

          {/* Amortization Type */}
          <div className="space-y-1.5">
            <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Amortization Type *
            </label>
            <select
              value={form.amortization_type}
              onChange={(e) => setForm(prev => ({ ...prev, amortization_type: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
            >
              <option value="flat_rate">Flat Rate</option>
              <option value="diminishing_balance">Diminishing Balance</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Computing...
              </>
            ) : (
              <>
                <Calculator className="w-3.5 h-3.5" />
                Calculate Schedule
              </>
            )}
          </button>
          {result && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Results */}
      {result && (
        <div className="border-t border-outline-variant/40 p-6 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/40 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Principal</span>
              <span className="font-headline text-sm font-extrabold text-on-surface dark:text-white">{formatCurrency(result.principal_amount)}</span>
            </div>
            <div className="p-3 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/40 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Interest</span>
              <span className="font-headline text-sm font-extrabold text-amber-600 dark:text-amber-400">{formatCurrency(result.total_interest)}</span>
            </div>
            <div className="p-3 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/40 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Repayment</span>
              <span className="font-headline text-sm font-extrabold text-primary dark:text-secondary">{formatCurrency(result.total_repayment)}</span>
            </div>
            <div className="p-3 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/40 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Monthly Payment</span>
              <span className="font-headline text-sm font-extrabold text-on-surface dark:text-white">
                {result.schedule.length > 0
                  ? formatCurrency(result.schedule[0].total_due)
                  : '—'}
              </span>
            </div>
          </div>

          {/* Amortization Type Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">Method:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary dark:text-secondary">
              {result.amortization_type === 'flat_rate' ? 'Flat Rate' : 'Diminishing Balance'}
            </span>
            <span className="text-[10px] font-bold text-neutral-500 uppercase ml-2">Term:</span>
            <span className="text-[10px] font-bold text-on-surface dark:text-white">{result.term_months} Months</span>
          </div>

          {/* Toggle Full Schedule Table */}
          <button
            type="button"
            onClick={() => setShowSchedule(!showSchedule)}
            className="w-full py-3 bg-neutral/5 dark:bg-neutral/10 border border-outline-variant/50 rounded-2xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral/10 dark:hover:bg-neutral/15 transition-colors flex items-center justify-center gap-2"
          >
            {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showSchedule ? 'Hide Full Installment Schedule' : `View Full Installment Schedule (${result.schedule.length} Items)`}
          </button>

          {/* Full Schedule Table */}
          {showSchedule && (
            <div className="border border-outline-variant/50 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-surface-container-low dark:bg-surface-container-high/55 border-b border-outline-variant/45">
                      <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">#</th>
                      <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">Due Date</th>
                      <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">Principal</th>
                      <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">Interest</th>
                      <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase">Total Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 font-body text-xs text-on-surface dark:text-white/95">
                    {result.schedule.map((item) => (
                      <tr key={item.installment_number} className="hover:bg-neutral/5">
                        <td className="px-4 py-2.5 font-mono font-bold text-neutral-500">{item.installment_number}</td>
                        <td className="px-4 py-2.5 font-mono text-[11px]">
                          {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-2.5">{formatCurrency(item.principal_due)}</td>
                        <td className="px-4 py-2.5 text-amber-600 dark:text-amber-400 font-semibold">{formatCurrency(item.interest_due)}</td>
                        <td className="px-4 py-2.5 font-bold">{formatCurrency(item.total_due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
