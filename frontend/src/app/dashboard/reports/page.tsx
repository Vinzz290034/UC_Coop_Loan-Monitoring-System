'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { SkeletonTable } from '@/components/ui/Skeleton';
import {
  FileText,
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp,
  Search,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRightLeft,
  ArrowLeft
} from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'disbursement' | 'monitoring' | 'transactions'>('disbursement');

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [search, setSearch] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let endpoint = '';
      if (activeTab === 'disbursement') {
        endpoint = '/reports/cash-disbursement';
      } else if (activeTab === 'monitoring') {
        endpoint = '/reports/loan-monitoring';
      } else if (activeTab === 'transactions') {
        endpoint = '/reports/transactions';
      }

      const response = await api.get(endpoint);
      setRecords(response.data.data || []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Error fetching report:', err);
      setError(err.response?.data?.message || 'Failed to retrieve report data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportExcel = async () => {
    try {
      let endpoint = '';
      let filename = '';
      if (activeTab === 'disbursement') {
        endpoint = '/reports/cash-disbursement';
        filename = 'Cash_Disbursements_Report';
      } else if (activeTab === 'monitoring') {
        endpoint = '/reports/loan-monitoring';
        filename = 'Loan_Monitoring_Report';
      } else if (activeTab === 'transactions') {
        endpoint = '/reports/transactions';
        filename = 'Master_Transactions_Report';
      }

      const response = await api.get(endpoint, {
        params: { export: 'excel' },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Excel export failed:', err);
      alert('Failed to export Excel spreadsheet. Please try again.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(val || 0);
  };

  // Local filtering based on search query
  const filteredRecords = records.filter((row: any) => {
    const query = search.toLowerCase();
    if (!query) return true;
    
    // search across multiple columns depending on row values
    const mName = (row.member_name || '').toLowerCase();
    const pName = (row.product_name || '').toLowerCase();
    const lType = (row.ledger_type || '').toLowerCase();
    const desc = (row.description || '').toLowerCase();
    const tId = (row.transaction_id || '').toLowerCase();
    const status = (row.status || '').toLowerCase();
    const action = (row.type || '').toLowerCase();

    return mName.includes(query) || 
           pName.includes(query) || 
           lType.includes(query) || 
           desc.includes(query) || 
           tId.includes(query) || 
           status.includes(query) ||
           action.includes(query);
  });

  // Pagination index calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disbursed':
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
            Active
          </span>
        );
      case 'fully_paid':
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-primary">
            Fully Paid
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tertiary/10 text-tertiary">
            Overdue
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-micro-elevate">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Header and Download Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface dark:text-white">Analytical Reports</h1>
          <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
            Query read-optimized financial audits and download institutional OpenXML files.
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={loading || records.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all disabled:opacity-50 active:scale-95 self-start sm:self-center cursor-pointer"
        >
          <FileSpreadsheet className="w-4.5 h-4.5" />
          Download Excel Spreadsheet
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/50">
        {[
          { key: 'disbursement', label: 'Disbursement Reports' },
          { key: 'monitoring', label: 'Loan Portfolio Status' },
          { key: 'transactions', label: 'Master Transactions Log' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-5 py-3 font-headline text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter desk */}
      <div className="flex items-center gap-3 bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm max-w-md">
        <Search className="w-4 h-4 text-neutral-600 dark:text-neutral-400/50" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter report records..."
          className="w-full text-xs bg-transparent text-on-surface dark:text-white placeholder:text-neutral-400 focus:outline-none"
        />
      </div>

      {/* TABLES VIEW */}
      {loading ? (
        <SkeletonTable rows={itemsPerPage} cols={5} />
      ) : error ? (
        <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
          <FileText className="w-8 h-8 text-neutral-600 dark:text-neutral-400/45 mx-auto mb-2" />
          <h3 className="font-headline font-bold text-on-surface dark:text-white">No Records Found</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">No entries match the report search filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              
              {/* TABLE 1: CASH DISBURSEMENT REPORT */}
              {activeTab === 'disbursement' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low dark:bg-surface-container-high/55 border-b border-outline-variant/50">
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Borrower Member</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Loan Product</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Principal Disbursed</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Interest Rate</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Term</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Disbursed Date</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Maturity Date</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 font-body text-xs text-on-surface dark:text-white/95">
                    {currentItems.map((row: any, index: number) => (
                      <tr key={index} className="hover:bg-neutral/5">
                        <td className="px-6 py-3.5 font-semibold">{row.member_name}</td>
                        <td className="px-6 py-3.5 text-primary dark:text-secondary font-semibold">{row.product_name}</td>
                        <td className="px-6 py-3.5 font-bold">{formatCurrency(row.principal_amount)}</td>
                        <td className="px-6 py-3.5 font-mono">{row.interest_rate}</td>
                        <td className="px-6 py-3.5">{row.term_months} months</td>
                        <td className="px-6 py-3.5 font-mono text-neutral-600 dark:text-neutral-400">{row.disbursed_at}</td>
                        <td className="px-6 py-3.5 font-mono text-neutral-600 dark:text-neutral-400">{row.maturity_date}</td>
                        <td className="px-6 py-3.5">{getStatusBadge(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* TABLE 2: PORTFOLIO MONITORING */}
              {activeTab === 'monitoring' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low dark:bg-surface-container-high/55 border-b border-outline-variant/50">
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Borrower Member</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Loan Product</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Original Capital</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-primary">Principal Recovered</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-tertiary">Outstanding Capital</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Interest Paid</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-tertiary">Outstanding Interest</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-tertiary">Total Exposure</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Past Due</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 font-body text-xs text-on-surface dark:text-white/95">
                    {currentItems.map((row: any, index: number) => (
                      <tr key={index} className="hover:bg-neutral/5">
                        <td className="px-6 py-3.5 font-semibold">{row.member_name}</td>
                        <td className="px-6 py-3.5 text-primary dark:text-secondary font-semibold">{row.product_name}</td>
                        <td className="px-6 py-3.5 font-mono">{formatCurrency(row.principal_amount)}</td>
                        <td className="px-6 py-3.5 font-mono text-primary">{formatCurrency(row.principal_paid)}</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-tertiary">{formatCurrency(row.outstanding_principal)}</td>
                        <td className="px-6 py-3.5 font-mono text-primary">{formatCurrency(row.interest_paid)}</td>
                        <td className="px-6 py-3.5 font-mono text-tertiary">{formatCurrency(row.outstanding_interest)}</td>
                        <td className="px-6 py-3.5 font-mono font-bold text-tertiary">{formatCurrency(row.total_outstanding)}</td>
                        <td className="px-6 py-3.5 font-bold text-tertiary">
                          {row.days_past_due > 0 ? `${row.days_past_due} days` : <span className="text-primary">Current</span>}
                        </td>
                        <td className="px-6 py-3.5">{getStatusBadge(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* TABLE 3: MASTER TRANSACTIONS LOG */}
              {activeTab === 'transactions' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low dark:bg-surface-container-high/55 border-b border-outline-variant/50">
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Ledger category</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-mono">Transaction ID</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Member Name</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Type / Method</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Amount</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Date & Time</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Log Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 font-body text-xs text-on-surface dark:text-white/95">
                    {currentItems.map((row: any, index: number) => (
                      <tr key={index} className="hover:bg-neutral/5">
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            row.ledger_type === 'Share Capital' ? 'bg-primary/10 text-primary' : 
                            row.ledger_type === 'Fixed Deposit' ? 'bg-indigo-600/10 text-indigo-600' :
                            row.ledger_type === 'Investment' ? 'bg-amber-500/10 text-amber-600' : 'bg-neutral/15 text-neutral-600 dark:text-neutral-400'
                          }`}>
                            {row.ledger_type}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-mono truncate max-w-xs">{row.transaction_id}</td>
                        <td className="px-6 py-3.5 font-semibold">{row.member_name}</td>
                        <td className="px-6 py-3.5 font-semibold uppercase">{row.type}</td>
                        <td className="px-6 py-3.5 font-bold font-mono text-primary">{formatCurrency(row.amount)}</td>
                        <td className="px-6 py-3.5 font-mono text-neutral-600 dark:text-neutral-400">{row.date}</td>
                        <td className="px-6 py-3.5 text-neutral-600 dark:text-neutral-400">{row.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>
          </div>

          {/* Bordered Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm">
              <span className="font-body text-xs text-neutral-600 dark:text-neutral-400">
                Displaying {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredRecords.length)} of {filteredRecords.length} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-4 py-1.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-colors disabled:opacity-40"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`w-8 h-8 rounded-full text-xs font-bold border transition-colors ${
                      currentPage === idx + 1
                        ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border-primary dark:border-secondary'
                        : 'border-outline-variant hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-4 py-1.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-colors disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
