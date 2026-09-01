'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import LoanBillingLedgerModal from '@/components/billing/LoanBillingLedgerModal';
import PayrollCollectionTab from '@/components/billing/PayrollCollectionTab';
import {
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  CalendarCheck,
  Phone,
  Mail,
  Clock,
  Filter,
  FileSpreadsheet,
} from 'lucide-react';


export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'due' | 'aging' | 'payroll'>('due');

  // Dates state for billing due queue
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const get30DaysAheadStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(get30DaysAheadStr());

  // Billing queue state
  const [dueList, setDueList] = useState<any[]>([]);
  const [dueSummary, setDueSummary] = useState<any>(null);
  const [dueLoading, setDueLoading] = useState(true);
  const [duePage, setDuePage] = useState(1);

  // Aging report state
  const [agingData, setAgingData] = useState<any>(null);
  const [agingLoading, setAgingLoading] = useState(true);
  const [selectedTranche, setSelectedTranche] = useState<string>('tranche_30');
  const [agingPage, setAgingPage] = useState(1);

  const [error, setError] = useState<string | null>(null);

  // Loan ledger modal state
  const [selectedLoan, setSelectedLoan] = useState<{
    loanId: string | number;
    borrowerName?: string;
    productName?: string;
  } | null>(null);

  // Load Installments Due
  const loadDueBilling = useCallback(async () => {
    try {
      setDueLoading(true);
      setError(null);
      const response = await api.get('/billing/due', {
        params: { start_date: startDate, end_date: endDate }
      });
      setDueList(response.data.data || []);
      setDueSummary(response.data.summary || null);
    } catch (err: any) {
      console.error('Error loading due billing queue:', err);
      setError(err.response?.data?.message || 'Failed to retrieve due installments queue.');
    } finally {
      setDueLoading(false);
    }
  }, [startDate, endDate]);

  // Load Aging Report
  const loadAgingReport = useCallback(async () => {
    try {
      setAgingLoading(true);
      setError(null);
      const response = await api.get('/billing/aging');
      setAgingData(response.data.data || null);
    } catch (err: any) {
      console.error('Error loading aging report:', err);
      setError(err.response?.data?.message || 'Failed to retrieve delinquency aging report.');
    } finally {
      setAgingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'due') {
      loadDueBilling();
    } else if (activeTab === 'aging') {
      loadAgingReport();
    }
  }, [activeTab, loadDueBilling, loadAgingReport]);


  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(val || 0);
  };

  return (
    <>
      <div className="space-y-6 animate-micro-elevate">
        <div>
          <BackButton href="/dashboard">Back to System Dashboard</BackButton>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface dark:text-white flex items-center gap-3">Billing & Collection Desk</h1>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Monitor chronological payments falling due, track aging tranches, and print payroll collection endorsement lists.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('due')}
            className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'due'
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
              }`}
          >
            Scheduled Installments Due
          </button>
          <button
            onClick={() => setActiveTab('aging')}
            className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'aging'
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
              }`}
          >
            Delinquency Aging Brackets
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${activeTab === 'payroll'
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
              }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Payroll Collection List (METC Form)
          </button>
        </div>

        {/* ERROR DISPLAY */}
        {error && (
          <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl flex items-center gap-3 text-xs font-semibold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB CONTENTS */}
        {activeTab === 'due' ? (
          <div className="space-y-6">
            {/* Date Filter & Summaries */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Filter Date Desk */}
              <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary dark:text-secondary" /> Adjust Billing Period
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-label text-neutral-600 dark:text-neutral-400 font-semibold">Start Date:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-surface-container-low focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label text-neutral-600 dark:text-neutral-400 font-semibold">End Date:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-surface-container-low focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface dark:text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={loadDueBilling}
                  className="w-full py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-xs font-bold rounded-xl shadow-md hover:scale-[1.01] transition-all active:scale-95 mt-2"
                >
                  Reload Period Dues
                </button>
              </div>

              {/* Aggregated Summaries cards */}
              {dueSummary && (
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Period Due Installments</span>
                      <h3 className="font-headline text-3xl font-extrabold text-on-surface dark:text-white mt-1">
                        {dueSummary.records_count}
                      </h3>
                    </div>
                    <p className="text-[10px] text-neutral-600 dark:text-neutral-400">Unpaid records maturing in dates range</p>
                  </div>

                  <div className="p-6 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-3xl shadow-md border border-primary-container flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold opacity-90 font-label">Total Outstanding Dues</span>
                      <h3 className="font-headline text-3xl font-extrabold mt-1">
                        {formatCurrency(dueSummary.total_amount_due)}
                      </h3>
                    </div>
                    <div className="text-[10px] opacity-80 grid grid-cols-2 gap-2 mt-2">
                      <span>Principal: {formatCurrency(dueSummary.total_principal_remaining)}</span>
                      <span>Interest: {formatCurrency(dueSummary.total_interest_remaining)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dues Listings Table */}
            {dueLoading ? (
              <SkeletonTable rows={5} cols={6} />
            ) : dueList.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
                <CalendarCheck className="w-8 h-8 text-neutral-600 dark:text-neutral-400/45 mx-auto mb-2" />
                <h3 className="font-headline font-bold text-on-surface dark:text-white">All Accounts Current</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">No installments falling due within this period range.</p>
              </div>
            ) : (
              (() => {
                const totalDueItems = dueList.length;
                const DUE_PER_PAGE = 25;
                const totalDuePages = Math.ceil(totalDueItems / DUE_PER_PAGE) || 1;
                const dueStartIdx = (duePage - 1) * DUE_PER_PAGE;
                const visibleDueItems = dueList.slice(dueStartIdx, dueStartIdx + DUE_PER_PAGE);

                return (
                  <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-surface-container-low dark:bg-surface-container-high/55 border-b border-outline-variant/50">
                            <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Borrower Member</th>
                            <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden sm:table-cell">Loan Product</th>
                            <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-mono hidden md:table-cell">LAF No</th>
                            <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden lg:table-cell">Month</th>
                            <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Remaining Due</th>
                            <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Maturity Date</th>
                            <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden md:table-cell">Contacts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/40 font-body text-xs text-on-surface dark:text-white/95">
                          {visibleDueItems.map((row: any) => (
                            <tr
                              key={row.schedule_id}
                              className="hover:bg-neutral/5 cursor-pointer"
                              onClick={() => setSelectedLoan({
                                loanId: row.loan_id,
                                borrowerName: `${row.last_name}, ${row.first_name}`,
                                productName: row.product_name,
                              })}
                            >
                              <td className="px-4 sm:px-6 py-4 font-semibold">
                                {row.last_name}, {row.first_name}
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-primary dark:text-secondary font-semibold hidden sm:table-cell">{row.product_name}</td>
                              <td className="px-4 sm:px-6 py-4 font-mono font-bold hidden md:table-cell text-primary dark:text-secondary">
                                {row.laf_no ? `LAF #${row.laf_no}` : `#${row.loan_id.slice(0, 8)}`}
                              </td>
                              <td className="px-4 sm:px-6 py-4 hidden lg:table-cell font-bold">{row.installment_number}</td>
                              <td className="px-4 sm:px-6 py-4 font-bold text-tertiary">
                                {formatCurrency(parseFloat(row.amount_remaining))}
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                                  <Clock className="w-3.5 h-3.5" />
                                  {new Date(row.due_date).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                                <div className="space-y-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                                  {row.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {row.phone}</span>}
                                  {row.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {row.email}</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalDueItems > 0 && (
                      <div className="px-6 py-3.5 border-t border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-surface-container-low/30">
                        <div className="text-neutral-500 font-medium">
                          Showing <span className="font-bold text-on-surface dark:text-white">{dueStartIdx + 1}</span> to <span className="font-bold text-on-surface dark:text-white">{Math.min(dueStartIdx + DUE_PER_PAGE, totalDueItems)}</span> of <span className="font-bold text-on-surface dark:text-white">{totalDueItems}</span> dues
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={duePage === 1}
                            onClick={() => setDuePage(p => Math.max(1, p - 1))}
                            className="px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-surface-container-low text-on-surface dark:text-white font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                          >
                            Previous
                          </button>
                          <span className="px-2 font-bold font-mono text-neutral-600 dark:text-neutral-300">
                            Page {duePage} of {totalDuePages}
                          </span>
                          <button
                            type="button"
                            disabled={duePage >= totalDuePages}
                            onClick={() => setDuePage(p => Math.min(totalDuePages, p + 1))}
                            className="px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-surface-container-low text-on-surface dark:text-white font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        ) : activeTab === 'aging' ? (
          /* TAB 2: AGING REPORT BRACKETS */
          <div className="space-y-6">
            {agingLoading ? (
              <SkeletonTable rows={6} cols={7} />
            ) : !agingData ? (
              <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
                <AlertCircle className="w-8 h-8 text-neutral-600 dark:text-neutral-400/45 mx-auto mb-2" />
                <h3 className="font-headline font-bold text-on-surface dark:text-white">Delinquency Data Unavailable</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Could not retrieve portfolio aging brackets.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overall Portfolio Risk Summary Card */}
                <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">
                      Delinquency Portfolio Exposure
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                      Chronological tracking classification of overdue asset principal
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 font-label">Past Due Contracts</span>
                      <div className="font-headline text-xl font-extrabold text-tertiary">
                        {agingData.summary?.total_past_due_loans || 0} Accounts
                      </div>
                    </div>
                    <div className="text-right border-l border-outline-variant/40 pl-6">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 font-label">Delinquent Volume</span>
                      <div className="font-headline text-xl font-extrabold text-tertiary">
                        {formatCurrency(agingData.summary?.total_outstanding_delinquent_balance || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Aging Tranche Selector Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { key: 'tranche_30', border: 'border-emerald-500/30', ring: 'ring-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/5', dot: 'bg-emerald-500' },
                    { key: 'tranche_60', border: 'border-sky-500/30', ring: 'ring-sky-500', text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/5', dot: 'bg-sky-500' },
                    { key: 'tranche_90', border: 'border-amber-500/30', ring: 'ring-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/5', dot: 'bg-amber-500' },
                    { key: 'tranche_90_plus', border: 'border-tertiary/45', ring: 'ring-tertiary', text: 'text-tertiary', bg: 'bg-tertiary/5', dot: 'bg-tertiary' },
                  ].map((trancheObj) => {
                    const tData = agingData.tranches?.[trancheObj.key] || { label: '', count: 0, balance: 0 };
                    const isSelected = selectedTranche === trancheObj.key;
                    return (
                      <button
                        key={trancheObj.key}
                        onClick={() => {
                          setSelectedTranche(trancheObj.key);
                          setAgingPage(1);
                        }}
                        className={`p-5 rounded-3xl border-2 text-left transition-all active:scale-[0.98] shadow-sm flex flex-col justify-between ${trancheObj.border} ${trancheObj.bg} ${isSelected
                            ? `ring-2 ${trancheObj.ring} ring-offset-2 dark:ring-offset-neutral-900 scale-[1.02]`
                            : 'opacity-70 hover:opacity-100 bg-white dark:bg-surface-container-low'
                          }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${trancheObj.dot}`} />
                            <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 font-label">{tData.label}</span>
                          </div>
                          <h4 className={`font-headline text-xl font-extrabold mt-1 ${trancheObj.text}`}>
                            {formatCurrency(tData.balance)}
                          </h4>
                        </div>
                        <div className={`flex items-center justify-between mt-4 ${trancheObj.text}`}>
                          <span className="text-xs font-bold font-body">{tData.count} Contracts</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Tranche Accounts Table with Pagination */}
                {(() => {
                  const allItems = agingData.tranches?.[selectedTranche]?.items || [];
                  const totalItems = allItems.length;
                  const AGING_PER_PAGE = 25;
                  const totalPages = Math.ceil(totalItems / AGING_PER_PAGE) || 1;
                  const startIdx = (agingPage - 1) * AGING_PER_PAGE;
                  const visibleItems = allItems.slice(startIdx, startIdx + AGING_PER_PAGE);

                  return (
                    <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
                      <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between">
                        <h4 className="font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">
                          Accounts & Installments in {agingData.tranches?.[selectedTranche]?.label}
                        </h4>
                        <span className="text-xs text-neutral-500 font-mono font-bold">
                          {totalItems} overdue items
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[850px]">
                          <thead>
                            <tr className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/45">
                              <th className="px-5 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Borrower Member</th>
                              <th className="px-5 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Loan Product</th>
                              <th className="px-5 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-mono">LAF No</th>
                              <th className="px-5 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase whitespace-nowrap">Installment</th>
                              <th className="px-5 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase whitespace-nowrap">Due Date</th>
                              <th className="px-5 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase whitespace-nowrap">Days Past Due</th>
                              <th className="px-5 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase whitespace-nowrap">Amount Overdue</th>
                              <th className="px-5 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase whitespace-nowrap">Whole Balance</th>
                              <th className="px-5 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/35 font-body text-xs text-on-surface dark:text-white/95">
                            {totalItems === 0 ? (
                              <tr>
                                <td colSpan={9} className="px-6 py-6 text-center text-neutral-600 dark:text-neutral-400 italic">No delinquent accounts classified in this tranche.</td>
                              </tr>
                            ) : (
                              visibleItems.map((item: any, idx: number) => (
                                <tr
                                  key={`${item.loan_id}-${item.installment_number || idx}`}
                                  className="hover:bg-neutral/5 cursor-pointer"
                                  onClick={() => setSelectedLoan({
                                    loanId: item.loan_id,
                                    borrowerName: `${item.last_name}, ${item.first_name}`,
                                    productName: item.product_name,
                                  })}
                                >
                                  <td className="px-5 py-3 font-semibold">
                                    {item.last_name}, {item.first_name}
                                  </td>
                                  <td className="px-5 py-3 font-semibold text-primary dark:text-secondary whitespace-nowrap">{item.product_name}</td>
                                  <td className="px-5 py-3 font-mono font-bold text-primary dark:text-secondary whitespace-nowrap">
                                    {item.laf_no ? `LAF #${item.laf_no}` : `#${item.loan_id.slice(0, 8)}`}
                                  </td>
                                  <td className="px-5 py-3 font-mono font-bold text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                                    {item.installment_number ? `Inst #${item.installment_number}` : '—'}
                                  </td>
                                  <td className="px-5 py-3 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                                    {item.due_date ? new Date(item.due_date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    }) : '—'}
                                  </td>
                                  <td className="px-5 py-3 font-bold font-mono text-tertiary whitespace-nowrap">{item.days_past_due} Days P.D.</td>
                                  <td className="px-5 py-3 font-bold text-tertiary whitespace-nowrap">{formatCurrency(parseFloat(item.amount_past_due))}</td>
                                  <td className="px-5 py-3 font-bold whitespace-nowrap">{formatCurrency(parseFloat(item.total_outstanding_loan_balance))}</td>
                                  <td className="px-5 py-3 text-right whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLoan({
                                          loanId: item.loan_id,
                                          borrowerName: `${item.last_name}, ${item.first_name}`,
                                          productName: item.product_name,
                                        });
                                      }}
                                      className="px-3 py-1 bg-surface border border-outline-variant rounded-lg text-[11px] font-bold text-primary dark:text-secondary hover:bg-primary/10 transition-all cursor-pointer shadow-2xs"
                                    >
                                      View Ledger
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Control */}
                      {totalItems > 0 && (
                        <div className="px-6 py-3.5 border-t border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-surface-container-low/30">
                          <div className="text-neutral-500 font-medium">
                            Showing <span className="font-bold text-on-surface dark:text-white">{startIdx + 1}</span> to <span className="font-bold text-on-surface dark:text-white">{Math.min(startIdx + AGING_PER_PAGE, totalItems)}</span> of <span className="font-bold text-on-surface dark:text-white">{totalItems}</span> overdue items
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={agingPage === 1}
                              onClick={() => setAgingPage(p => Math.max(1, p - 1))}
                              className="px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-surface-container-low text-on-surface dark:text-white font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                            >
                              Previous
                            </button>
                            <span className="px-2 font-bold font-mono text-neutral-600 dark:text-neutral-300">
                              Page {agingPage} of {totalPages}
                            </span>
                            <button
                              type="button"
                              disabled={agingPage >= totalPages}
                              onClick={() => setAgingPage(p => Math.min(totalPages, p + 1))}
                              className="px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-surface-container-low text-on-surface dark:text-white font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <PayrollCollectionTab
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
        )}
        {/* Loan Billing Ledger Modal */}
        {selectedLoan && (
          <LoanBillingLedgerModal
            loanId={selectedLoan.loanId}
            borrowerName={selectedLoan.borrowerName}
            productName={selectedLoan.productName}
            onClose={() => setSelectedLoan(null)}
          />
        )}
      </div>
    </>
  );
}
