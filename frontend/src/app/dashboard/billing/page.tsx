'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import {
  CalendarCheck,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Phone,
  Mail,
  User,
  Clock,
  Search,
  Filter,
  DollarSign,
  ArrowLeft
} from 'lucide-react';

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'due' | 'aging'>('due');

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

  // Aging report state
  const [agingData, setAgingData] = useState<any>(null);
  const [agingLoading, setAgingLoading] = useState(true);
  const [selectedTranche, setSelectedTranche] = useState<string>('tranche_30');

  const [error, setError] = useState<string | null>(null);

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
    } else {
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
    <div className="space-y-6">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="font-headline text-2xl font-bold text-on-surface dark:text-white">Billing & Collection Desk</h1>
        <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
          Monitor chronological payments falling due and track capital risk aging tranches.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/50">
        <button
          onClick={() => setActiveTab('due')}
          className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all ${
            activeTab === 'due'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
          }`}
        >
          Scheduled Installments Due
        </button>
        <button
          onClick={() => setActiveTab('aging')}
          className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all ${
            activeTab === 'aging'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
          }`}
        >
          Delinquency aging brackets
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
            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low dark:bg-surface-container-high/55 border-b border-outline-variant/50">
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Borrower Member</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Loan Product</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-mono">Contract ID</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Inst #</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Remaining Due</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Maturity Date</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Contacts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 font-body text-xs text-on-surface dark:text-white/95">
                    {dueList.map((row: any) => (
                      <tr key={row.schedule_id} className="hover:bg-neutral/5">
                        <td className="px-6 py-4 font-semibold">
                          {row.last_name}, {row.first_name}
                        </td>
                        <td className="px-6 py-4 text-primary dark:text-secondary font-semibold">{row.product_name}</td>
                        <td className="px-6 py-4 font-mono font-bold">#{row.loan_id}</td>
                        <td className="px-6 py-4">Installment #{row.installment_number}</td>
                        <td className="px-6 py-4 font-bold text-tertiary">
                          {formatCurrency(parseFloat(row.amount_remaining))}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(row.due_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                          <div className="flex flex-col gap-0.5 text-[10px]">
                            {row.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {row.phone}</span>}
                            {row.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {row.email}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: AGING REPORT BRACKETS */
        <div className="space-y-6">
          {agingLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
              <SkeletonTable rows={4} cols={5} />
            </div>
          ) : !agingData ? (
            <p className="text-center text-xs text-neutral-600 dark:text-neutral-400">Failed to parse aging report.</p>
          ) : (
            <div className="space-y-6">
              {/* Aggregated Totals */}
              <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-headline text-base font-bold text-on-surface dark:text-white">Delinquency Portfolio Exposure</h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">Chronological tracking classification of overdue asset principal</p>
                </div>
                <div className="grid grid-cols-2 gap-6 text-right">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Past Due Contracts</span>
                    <p className="font-headline text-lg font-extrabold text-tertiary mt-0.5">
                      {agingData.summary?.total_past_due_loans} Accounts
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Delinquent Volume</span>
                    <p className="font-headline text-lg font-extrabold text-tertiary mt-0.5">
                      {formatCurrency(agingData.summary?.total_outstanding_delinquent_balance)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tranche Cards selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: 'tranche_30', color: 'border-yellow-400 text-yellow-600' },
                  { key: 'tranche_60', color: 'border-orange-400 text-orange-600' },
                  { key: 'tranche_90', color: 'border-amber-600 text-amber-700' },
                  { key: 'tranche_90_plus', color: 'border-tertiary text-tertiary bg-tertiary/5' }
                ].map((trancheObj) => {
                  const tData = agingData.tranches?.[trancheObj.key] || { label: '', count: 0, balance: 0 };
                  const isSelected = selectedTranche === trancheObj.key;
                  return (
                    <button
                      key={trancheObj.key}
                      onClick={() => setSelectedTranche(trancheObj.key)}
                      className={`p-5 rounded-3xl border-2 text-left transition-all active:scale-98 shadow-sm flex flex-col justify-between ${trancheObj.color} ${
                        isSelected
                          ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-neutral-900 border-opacity-100 scale-102 bg-white dark:bg-surface-container-high'
                          : 'border-opacity-30 opacity-70 bg-white dark:bg-surface-container-low hover:opacity-100'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">{tData.label}</span>
                        <h4 className="font-headline text-xl font-extrabold mt-1">
                          {formatCurrency(tData.balance)}
                        </h4>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs font-bold font-body">{tData.count} Contracts</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Tranche Accounts Table */}
              <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
                <h4 className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase border-b border-outline-variant/40">
                  Accounts aged: {agingData.tranches?.[selectedTranche]?.label}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/45">
                        <th className="px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Borrower Member</th>
                        <th className="px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Loan Product</th>
                        <th className="px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-mono">Contract ID</th>
                        <th className="px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Days Past Due</th>
                        <th className="px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Amount Overdue</th>
                        <th className="px-6 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Whole Loan Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/35 font-body text-xs text-on-surface dark:text-white/95">
                      {agingData.tranches?.[selectedTranche]?.items?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-6 text-center text-neutral-600 dark:text-neutral-400 italic">No delinquent accounts classified in this tranche.</td>
                        </tr>
                      ) : (
                        agingData.tranches?.[selectedTranche]?.items?.map((item: any) => (
                          <tr key={item.loan_id} className="hover:bg-neutral/5">
                            <td className="px-6 py-3 font-semibold">
                              {item.last_name}, {item.first_name}
                            </td>
                            <td className="px-6 py-3 font-semibold text-primary dark:text-secondary">{item.product_name}</td>
                            <td className="px-6 py-3 font-mono font-bold">#{item.loan_id}</td>
                            <td className="px-6 py-3 font-bold font-mono text-tertiary">{item.days_past_due} Days P.D.</td>
                            <td className="px-6 py-3 font-bold text-tertiary">{formatCurrency(parseFloat(item.amount_past_due))}</td>
                            <td className="px-6 py-3 font-bold">{formatCurrency(parseFloat(item.total_outstanding_loan_balance))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
