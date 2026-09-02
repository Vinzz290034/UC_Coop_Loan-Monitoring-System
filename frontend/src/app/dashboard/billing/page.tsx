'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import SearchInput from '@/components/SearchInput';
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
  Maximize2,
  Minimize2
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
  const [dueSearch, setDueSearch] = useState('');
  const [dueSortBy, setDueSortBy] = useState('maturity_asc');
  const [isDueExpandedAll, setIsDueExpandedAll] = useState(false);

  // Aging report state
  const [agingData, setAgingData] = useState<any>(null);
  const [agingLoading, setAgingLoading] = useState(true);
  const [selectedTranche, setSelectedTranche] = useState<string>('tranche_30');
  const [agingPage, setAgingPage] = useState(1);
  const [agingSearch, setAgingSearch] = useState('');
  const [agingSortBy, setAgingSortBy] = useState('dpd_desc');
  const [isAgingExpandedAll, setIsAgingExpandedAll] = useState(false);

  // Smart windowed pagination helper matching Members Directory
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
                const filteredDueList = dueList
                  .filter((row: any) => {
                    const q = dueSearch.toLowerCase().trim();
                    if (q) {
                      const bName = `${row.last_name || ''} ${row.first_name || ''}`.toLowerCase();
                      const pName = (row.product_name || '').toLowerCase();
                      const laf = (row.laf_no || String(row.loan_id) || '').toLowerCase();
                      const phone = (row.phone || '').toLowerCase();
                      const email = (row.email || '').toLowerCase();
                      const matches = bName.includes(q) || pName.includes(q) || laf.includes(q) || phone.includes(q) || email.includes(q);
                      if (!matches) return false;
                    }
                    return true;
                  })
                  .sort((a: any, b: any) => {
                    if (dueSortBy === 'maturity_asc') {
                      return new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();
                    }
                    if (dueSortBy === 'maturity_desc') {
                      return new Date(b.due_date || 0).getTime() - new Date(a.due_date || 0).getTime();
                    }
                    if (dueSortBy === 'due_desc') {
                      return parseFloat(b.amount_remaining || 0) - parseFloat(a.amount_remaining || 0);
                    }
                    if (dueSortBy === 'due_asc') {
                      return parseFloat(a.amount_remaining || 0) - parseFloat(b.amount_remaining || 0);
                    }
                    if (dueSortBy === 'name_asc') {
                      const nameA = `${a.last_name || ''}, ${a.first_name || ''}`.toLowerCase();
                      const nameB = `${b.last_name || ''}, ${b.first_name || ''}`.toLowerCase();
                      return nameA.localeCompare(nameB);
                    }
                    if (dueSortBy === 'name_desc') {
                      const nameA = `${a.last_name || ''}, ${a.first_name || ''}`.toLowerCase();
                      const nameB = `${b.last_name || ''}, ${b.first_name || ''}`.toLowerCase();
                      return nameB.localeCompare(nameA);
                    }
                    return 0;
                  });

                const totalDueItems = filteredDueList.length;
                const DUE_PER_PAGE = 8;
                const totalDuePages = Math.ceil(totalDueItems / DUE_PER_PAGE) || 1;
                const dueStartIdx = (duePage - 1) * DUE_PER_PAGE;
                const visibleDueItems = isDueExpandedAll
                  ? filteredDueList
                  : filteredDueList.slice(dueStartIdx, dueStartIdx + DUE_PER_PAGE);

                return (
                  <div className="space-y-4">
                    {/* Search & Sort Desk */}
                    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm">
                      <div className="w-full lg:w-auto flex-1 max-w-md">
                        <SearchInput
                          placeholder="Search borrower, loan product, LAF No, contact..."
                          onSearch={(val) => {
                            setDueSearch(val);
                            setDuePage(1);
                          }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold font-label text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Sort By:</label>
                          <select
                            value={dueSortBy}
                            onChange={(e) => {
                              setDueSortBy(e.target.value);
                              setDuePage(1);
                            }}
                            className="px-3 py-2 text-xs border border-outline-variant rounded-xl bg-white dark:bg-surface-container-low focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white cursor-pointer"
                          >
                            <option value="maturity_asc">Maturity Date (Earliest First)</option>
                            <option value="maturity_desc">Maturity Date (Latest First)</option>
                            <option value="due_desc">Remaining Due (Highest First)</option>
                            <option value="due_asc">Remaining Due (Lowest First)</option>
                            <option value="name_asc">Borrower (A → Z)</option>
                            <option value="name_desc">Borrower (Z → A)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Table Header Bar with Count & Expand All Toggle */}
                    <div className="flex items-center justify-between px-1 flex-wrap gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface dark:text-white">
                          Scheduled Installments Table
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold border border-outline-variant/30">
                          {isDueExpandedAll ? `Showing all ${totalDueItems} dues (Full Table)` : `Showing ${visibleDueItems.length} of ${totalDueItems} dues`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsDueExpandedAll((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-2xl border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                          isDueExpandedAll
                            ? 'bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary border-primary/30 hover:bg-primary/20'
                            : 'bg-white dark:bg-surface-container-low text-neutral-700 dark:text-neutral-300 border-outline-variant hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                        title={isDueExpandedAll ? 'Restore pagination (8 per page)' : 'Expand table to display all dues on page'}
                      >
                        {isDueExpandedAll ? (
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
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-neutral-50/80 dark:bg-neutral-800/60 border-b border-outline-variant/50 text-[11px] font-headline font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                              <th className="px-5 py-3.5">Borrower Member</th>
                              <th className="px-5 py-3.5 hidden sm:table-cell">Loan Product</th>
                              <th className="px-5 py-3.5 font-mono hidden md:table-cell">LAF No</th>
                              <th className="px-5 py-3.5 hidden lg:table-cell">Month</th>
                              <th className="px-5 py-3.5">Remaining Due</th>
                              <th className="px-5 py-3.5">Maturity Date</th>
                              <th className="px-5 py-3.5 hidden md:table-cell">Contacts</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/30 font-body text-xs text-on-surface dark:text-white/90">
                            {visibleDueItems.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-neutral-500 italic">
                                  No dues found matching search criteria.
                                </td>
                              </tr>
                            ) : (
                              visibleDueItems.map((row: any) => (
                                <tr
                                  key={row.schedule_id}
                                  className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
                                  onClick={() => setSelectedLoan({
                                    loanId: row.loan_id,
                                    borrowerName: `${row.last_name}, ${row.first_name}`,
                                    productName: row.product_name,
                                  })}
                                >
                                  <td className="px-5 py-3.5 font-semibold">
                                    {row.last_name}, {row.first_name}
                                  </td>
                                  <td className="px-5 py-3.5 text-primary dark:text-secondary font-semibold hidden sm:table-cell">{row.product_name}</td>
                                  <td className="px-5 py-3.5 font-mono font-bold hidden md:table-cell text-primary dark:text-secondary">
                                    {row.laf_no ? `LAF #${row.laf_no}` : `#${row.loan_id.slice(0, 8)}`}
                                  </td>
                                  <td className="px-5 py-3.5 hidden lg:table-cell font-bold">{row.installment_number}</td>
                                  <td className="px-5 py-3.5 font-bold text-tertiary">
                                    {formatCurrency(parseFloat(row.amount_remaining))}
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                                      <Clock className="w-3.5 h-3.5" />
                                      {new Date(row.due_date).toLocaleDateString()}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 hidden md:table-cell">
                                    <div className="space-y-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                                      {row.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {row.phone}</span>}
                                      {row.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {row.email}</span>}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Table Footer: Pagination or Expanded Banner */}
                    {isDueExpandedAll ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                          <span className="w-2 h-2 rounded-full bg-primary dark:bg-secondary animate-pulse" />
                          <span>Expanded Full Table: Displaying all {totalDueItems} dues</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsDueExpandedAll(false)}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-outline-variant rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Restore pagination (8 dues per page)"
                        >
                          <Minimize2 className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                          <span>Minimize Table</span>
                        </button>
                      </div>
                    ) : totalDuePages > 1 ? (
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm">
                        <span className="font-body text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                          Displaying {dueStartIdx + 1} - {Math.min(dueStartIdx + DUE_PER_PAGE, totalDueItems)} of {totalDueItems} dues
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 justify-center">
                          <button
                            disabled={duePage === 1}
                            onClick={() => setDuePage(p => Math.max(1, p - 1))}
                            className="px-3.5 py-1.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-colors disabled:opacity-40 cursor-pointer text-neutral-700 dark:text-neutral-300"
                          >
                            Previous
                          </button>
                          {getPaginationNumbers(duePage, totalDuePages).map((p, idx) => {
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
                                onClick={() => setDuePage(pageNum)}
                                className={`w-8 h-8 rounded-full text-xs font-bold border transition-all cursor-pointer ${duePage === pageNum
                                  ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border-primary dark:border-secondary shadow-xs'
                                  : 'border-outline-variant hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400'
                                  }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            disabled={duePage >= totalDuePages}
                            onClick={() => setDuePage(p => Math.min(totalDuePages, p + 1))}
                            className="px-3.5 py-1.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-colors disabled:opacity-40 cursor-pointer text-neutral-700 dark:text-neutral-300"
                          >
                            Next
                          </button>

                          {/* Expand All Button */}
                          <button
                            type="button"
                            onClick={() => setIsDueExpandedAll(true)}
                            className="ml-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 dark:bg-secondary/10 dark:hover:bg-secondary/20 text-primary dark:text-secondary text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Expand table to display all dues on page"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Expand All</span>
                          </button>
                        </div>
                      </div>
                    ) : totalDueItems > 0 ? (
                      <div className="flex items-center justify-between border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm">
                        <span className="font-body text-xs text-neutral-600 dark:text-neutral-400">
                          Displaying all {totalDueItems} dues
                        </span>
                      </div>
                    ) : null}
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
                  const allItems = (agingData.tranches?.[selectedTranche]?.items || [])
                    .filter((item: any) => {
                      const q = agingSearch.toLowerCase().trim();
                      if (q) {
                        const bName = `${item.last_name || ''} ${item.first_name || ''}`.toLowerCase();
                        const pName = (item.product_name || '').toLowerCase();
                        const laf = (item.laf_no || String(item.loan_id) || '').toLowerCase();
                        const matches = bName.includes(q) || pName.includes(q) || laf.includes(q);
                        if (!matches) return false;
                      }
                      return true;
                    })
                    .sort((a: any, b: any) => {
                      if (agingSortBy === 'dpd_desc') {
                        return (parseInt(b.days_past_due) || 0) - (parseInt(a.days_past_due) || 0);
                      }
                      if (agingSortBy === 'dpd_asc') {
                        return (parseInt(a.days_past_due) || 0) - (parseInt(b.days_past_due) || 0);
                      }
                      if (agingSortBy === 'amount_desc') {
                        return parseFloat(b.amount_past_due || 0) - parseFloat(a.amount_past_due || 0);
                      }
                      if (agingSortBy === 'amount_asc') {
                        return parseFloat(a.amount_past_due || 0) - parseFloat(b.amount_past_due || 0);
                      }
                      if (agingSortBy === 'name_asc') {
                        const nameA = `${a.last_name || ''}, ${a.first_name || ''}`.toLowerCase();
                        const nameB = `${b.last_name || ''}, ${b.first_name || ''}`.toLowerCase();
                        return nameA.localeCompare(nameB);
                      }
                      if (agingSortBy === 'name_desc') {
                        const nameA = `${a.last_name || ''}, ${a.first_name || ''}`.toLowerCase();
                        const nameB = `${b.last_name || ''}, ${b.first_name || ''}`.toLowerCase();
                        return nameB.localeCompare(nameA);
                      }
                      return 0;
                    });

                  const totalAgingItems = allItems.length;
                  const AGING_PER_PAGE = 8;
                  const totalAgingPages = Math.ceil(totalAgingItems / AGING_PER_PAGE) || 1;
                  const agingStartIdx = (agingPage - 1) * AGING_PER_PAGE;
                  const visibleAgingItems = isAgingExpandedAll
                    ? allItems
                    : allItems.slice(agingStartIdx, agingStartIdx + AGING_PER_PAGE);

                  return (
                    <div className="space-y-4">
                      {/* Search & Sort Desk for Tranche */}
                      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm">
                        <div className="w-full lg:w-auto flex-1 max-w-md">
                          <SearchInput
                            placeholder="Search overdue borrower, loan product, LAF No..."
                            onSearch={(val) => {
                              setAgingSearch(val);
                              setAgingPage(1);
                            }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold font-label text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Sort By:</label>
                            <select
                              value={agingSortBy}
                              onChange={(e) => {
                                setAgingSortBy(e.target.value);
                                setAgingPage(1);
                              }}
                              className="px-3 py-2 text-xs border border-outline-variant rounded-xl bg-white dark:bg-surface-container-low focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white cursor-pointer"
                            >
                              <option value="dpd_desc">Days Past Due (Highest First)</option>
                              <option value="dpd_asc">Days Past Due (Lowest First)</option>
                              <option value="amount_desc">Amount Overdue (Highest First)</option>
                              <option value="amount_asc">Amount Overdue (Lowest First)</option>
                              <option value="name_asc">Borrower (A → Z)</option>
                              <option value="name_desc">Borrower (Z → A)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Table Header Bar with Count & Expand All Toggle */}
                      <div className="flex items-center justify-between px-1 flex-wrap gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-on-surface dark:text-white">
                            {agingData.tranches?.[selectedTranche]?.label || 'Delinquency Accounts'} Table
                          </span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold border border-outline-variant/30">
                            {isAgingExpandedAll ? `Showing all ${totalAgingItems} items (Full Table)` : `Showing ${visibleAgingItems.length} of ${totalAgingItems} items`}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsAgingExpandedAll((prev) => !prev)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-2xl border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                            isAgingExpandedAll
                              ? 'bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary border-primary/30 hover:bg-primary/20'
                              : 'bg-white dark:bg-surface-container-low text-neutral-700 dark:text-neutral-300 border-outline-variant hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                          title={isAgingExpandedAll ? 'Restore pagination (8 per page)' : 'Expand table to display all accounts on page'}
                        >
                          {isAgingExpandedAll ? (
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
                          <table className="w-full text-left border-collapse min-w-[850px]">
                            <thead>
                              <tr className="bg-neutral-50/80 dark:bg-neutral-800/60 border-b border-outline-variant/50 text-[11px] font-headline font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                <th className="px-5 py-3.5">Borrower Member</th>
                                <th className="px-5 py-3.5">Loan Product</th>
                                <th className="px-5 py-3.5 font-mono">LAF No</th>
                                <th className="px-5 py-3.5 whitespace-nowrap">Installment</th>
                                <th className="px-5 py-3.5 whitespace-nowrap">Due Date</th>
                                <th className="px-5 py-3.5 whitespace-nowrap">Days Past Due</th>
                                <th className="px-5 py-3.5 whitespace-nowrap">Amount Overdue</th>
                                <th className="px-5 py-3.5 whitespace-nowrap">Whole Balance</th>
                                <th className="px-5 py-3.5 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/30 font-body text-xs text-on-surface dark:text-white/90">
                              {visibleAgingItems.length === 0 ? (
                                <tr>
                                  <td colSpan={9} className="px-6 py-8 text-center text-neutral-500 italic">
                                    No delinquent accounts classified in this tranche matching search criteria.
                                  </td>
                                </tr>
                              ) : (
                                visibleAgingItems.map((item: any, idx: number) => (
                                  <tr
                                    key={`${item.loan_id}-${item.installment_number || idx}`}
                                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
                                    onClick={() => setSelectedLoan({
                                      loanId: item.loan_id,
                                      borrowerName: `${item.last_name}, ${item.first_name}`,
                                      productName: item.product_name,
                                    })}
                                  >
                                    <td className="px-5 py-3.5 font-semibold">
                                      {item.last_name}, {item.first_name}
                                    </td>
                                    <td className="px-5 py-3.5 font-semibold text-primary dark:text-secondary whitespace-nowrap">{item.product_name}</td>
                                    <td className="px-5 py-3.5 font-mono font-bold text-primary dark:text-secondary whitespace-nowrap">
                                      {item.laf_no ? `LAF #${item.laf_no}` : `#${item.loan_id.slice(0, 8)}`}
                                    </td>
                                    <td className="px-5 py-3.5 font-mono font-bold text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                                      {item.installment_number ? `Inst #${item.installment_number}` : '—'}
                                    </td>
                                    <td className="px-5 py-3.5 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                                      {item.due_date ? new Date(item.due_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      }) : '—'}
                                    </td>
                                    <td className="px-5 py-3.5 font-bold font-mono text-tertiary whitespace-nowrap">{item.days_past_due} Days P.D.</td>
                                    <td className="px-5 py-3.5 font-bold text-tertiary whitespace-nowrap">{formatCurrency(parseFloat(item.amount_past_due))}</td>
                                    <td className="px-5 py-3.5 font-bold whitespace-nowrap">{formatCurrency(parseFloat(item.total_outstanding_loan_balance))}</td>
                                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
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
                      </div>

                      {/* Table Footer: Pagination or Expanded Banner */}
                      {isAgingExpandedAll ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm animate-in fade-in duration-200">
                          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                            <span className="w-2 h-2 rounded-full bg-primary dark:bg-secondary animate-pulse" />
                            <span>Expanded Full Table: Displaying all {totalAgingItems} overdue items</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsAgingExpandedAll(false)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-outline-variant rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            title="Restore pagination (8 items per page)"
                          >
                            <Minimize2 className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                            <span>Minimize Table</span>
                          </button>
                        </div>
                      ) : totalAgingPages > 1 ? (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm">
                          <span className="font-body text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                            Showing {agingStartIdx + 1} - {Math.min(agingStartIdx + AGING_PER_PAGE, totalAgingItems)} of {totalAgingItems} overdue items
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5 justify-center">
                            <button
                              type="button"
                              disabled={agingPage === 1}
                              onClick={() => setAgingPage(p => Math.max(1, p - 1))}
                              className="px-3.5 py-1.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-colors disabled:opacity-40 cursor-pointer text-neutral-700 dark:text-neutral-300"
                            >
                              Previous
                            </button>
                            {getPaginationNumbers(agingPage, totalAgingPages).map((p, idx) => {
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
                                  onClick={() => setAgingPage(pageNum)}
                                  className={`w-8 h-8 rounded-full text-xs font-bold border transition-all cursor-pointer ${agingPage === pageNum
                                    ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border-primary dark:border-secondary shadow-xs'
                                    : 'border-outline-variant hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400'
                                    }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              disabled={agingPage >= totalAgingPages}
                              onClick={() => setAgingPage(p => Math.min(totalAgingPages, p + 1))}
                              className="px-3.5 py-1.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-colors disabled:opacity-40 cursor-pointer text-neutral-700 dark:text-neutral-300"
                            >
                              Next
                            </button>

                            {/* Expand All Button */}
                            <button
                              type="button"
                              onClick={() => setIsAgingExpandedAll(true)}
                              className="ml-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 dark:bg-secondary/10 dark:hover:bg-secondary/20 text-primary dark:text-secondary text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Expand table to display all accounts on page"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>Expand All</span>
                            </button>
                          </div>
                        </div>
                      ) : totalAgingItems > 0 ? (
                        <div className="flex items-center justify-between border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm">
                          <span className="font-body text-xs text-neutral-600 dark:text-neutral-400">
                            Displaying all {totalAgingItems} overdue items
                          </span>
                        </div>
                      ) : null}
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
