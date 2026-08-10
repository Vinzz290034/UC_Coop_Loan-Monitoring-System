'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
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
  const { user } = useAuth();
  const router = useRouter();

  // Redirect non-admin users from reports page
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const [activeTab, setActiveTab] = useState<'disbursement' | 'monitoring' | 'transactions'>('disbursement');

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Advanced Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Clear filters on tab change
  useEffect(() => {
    setStatusFilter('');
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
    setSortBy('date-desc');
  }, [activeTab]);

  // Excel Importer states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [savingImport, setSavingImport] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setPreviewData(null);
    setImportResult(null);
    setImportError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/reports/import-excel?dryRun=true', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000 // 5 minutes — large spreadsheets take time to parse
      });

      setPendingFile(file);
      setPreviewData(response.data.summary);
    } catch (err: any) {
      console.error('Import preview failed:', err);
      setImportError(err.response?.data?.error?.message || 'Failed to parse spreadsheet preview.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingFile) return;

    setSavingImport(true);
    setImportError(null);
    const formData = new FormData();
    formData.append('file', pendingFile);

    try {
      const response = await api.post('/reports/import-excel?dryRun=false', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000 // 5 minutes — large spreadsheets take time to write
      });

      setImportResult(response.data.summary);
      setPreviewData(null);
      setPendingFile(null);
      fetchReport();
    } catch (err: any) {
      console.error('Import commit failed:', err);
      setImportError(err.response?.data?.error?.message || 'Failed to save spreadsheet data.');
    } finally {
      setSavingImport(false);
    }
  };

  const handleRejectImport = () => {
    setPendingFile(null);
    setPreviewData(null);
    setImportResult(null);
    setImportError(null);
  };

  // Search filter
  const [search, setSearch] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
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
    } catch (err: unknown) {
      console.error('Error fetching report:', err);
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || 'Failed to retrieve report data.');
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

  // Local filtering based on query, status, category, date range, and sorting
  const filteredRecords = records
    .filter((row: any) => {
      // 1. Search Query
      const query = search.toLowerCase();
      const mName = (row.member_name || '').toLowerCase();
      const pName = (row.product_name || '').toLowerCase();
      const lType = (row.ledger_type || '').toLowerCase();
      const desc = (row.description || '').toLowerCase();
      const tId = (row.transaction_id || '').toLowerCase();
      const status = (row.status || '').toLowerCase();
      const action = (row.type || '').toLowerCase();

      const matchesSearch = !query || 
        mName.includes(query) || 
        pName.includes(query) || 
        lType.includes(query) || 
        desc.includes(query) || 
        tId.includes(query) || 
        status.includes(query) ||
        action.includes(query);

      if (!matchesSearch) return false;

      // 2. Status Filter
      if (statusFilter) {
        const rowStatus = (row.status || '').toLowerCase();
        if (rowStatus !== statusFilter.toLowerCase()) return false;
      }

      // 3. Category/Ledger Filter
      if (categoryFilter) {
        const rowLedger = (row.ledger_type || '').toLowerCase();
        if (rowLedger !== categoryFilter.toLowerCase()) return false;
      }

      // 4. Date Range
      const rowDateStr = row.transaction_date || row.disbursed_at || row.date_posted || row.created_at;
      if (rowDateStr) {
        const rowDate = new Date(rowDateStr);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0,0,0,0);
          if (rowDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23,59,59,999);
          if (rowDate > end) return false;
        }
      }

      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'date-desc') {
        const dateA = new Date(a.transaction_date || a.disbursed_at || a.date_posted || a.created_at || 0).getTime();
        const dateB = new Date(b.transaction_date || b.disbursed_at || b.date_posted || b.created_at || 0).getTime();
        return dateB - dateA;
      }
      if (sortBy === 'date-asc') {
        const dateA = new Date(a.transaction_date || a.disbursed_at || a.date_posted || a.created_at || 0).getTime();
        const dateB = new Date(b.transaction_date || b.disbursed_at || b.date_posted || b.created_at || 0).getTime();
        return dateA - dateB;
      }
      if (sortBy === 'amount-desc') {
        const amtA = parseFloat(a.amount || a.principal_amount || a.outstanding_balance || 0);
        const amtB = parseFloat(b.amount || b.principal_amount || b.outstanding_balance || 0);
        return amtB - amtA;
      }
      if (sortBy === 'amount-asc') {
        const amtA = parseFloat(a.amount || a.principal_amount || a.outstanding_balance || 0);
        const amtB = parseFloat(b.amount || b.principal_amount || b.outstanding_balance || 0);
        return amtA - amtB;
      }
      if (sortBy === 'name-asc') {
        const nameA = (a.member_name || '').toLowerCase();
        const nameB = (b.member_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'name-desc') {
        const nameA = (a.member_name || '').toLowerCase();
        const nameB = (b.member_name || '').toLowerCase();
        return nameB.localeCompare(nameA);
      }
      return 0;
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
      case 'approved':
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

      {/* Header and Download/Upload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface dark:text-white">Analytical Reports</h1>
          <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
            Query read-optimized financial audits and download institutional OpenXML files.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-white dark:bg-surface-container-low border border-outline-variant rounded-full hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 shadow-sm transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {importing ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4.5 h-4.5 text-primary" />
                Import Excel Ledger
              </>
            )}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={loading || records.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4.5 h-4.5" />
            Download Excel Spreadsheet
          </button>
        </div>
      </div>


      {/* Tabs — horizontally scrollable on mobile */}
      <div className="flex border-b border-outline-variant/50 overflow-x-auto">
        {[
          { key: 'disbursement', label: 'Disbursement Reports' },
          { key: 'monitoring', label: 'Loan Portfolio Status' },
          { key: 'transactions', label: 'Master Transactions Log' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 sm:px-5 py-3 font-headline text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters & Sorting Desk */}
      <div className="flex flex-col gap-4 bg-white dark:bg-surface-container-low p-5 rounded-3xl border border-outline-variant/50 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Text Search */}
          <div className="flex-1 min-w-[200px] flex items-center gap-3 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/50 rounded-2xl">
            <Search className="w-4 h-4 text-neutral-600 dark:text-neutral-400/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search member name, LAF/Ref, status..."
              className="w-full bg-transparent text-xs focus:outline-none placeholder-neutral-400 text-on-surface dark:text-white font-semibold"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="flex flex-col space-y-1">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/50 rounded-2xl outline-none font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>

          {/* Conditional Status Filter */}
          {activeTab === 'disbursement' && (
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/50 rounded-2xl outline-none font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="disbursed">Disbursed</option>
              <option value="fully_paid">Fully Paid</option>
              <option value="defaulted">Defaulted</option>
            </select>
          )}

          {/* Conditional Category Filter for Transactions */}
          {activeTab === 'transactions' && (
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/50 rounded-2xl outline-none font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="Share Capital">Share Capital</option>
              <option value="Loan Disbursement">Disbursements</option>
              <option value="Loan Repayment">Repayments</option>
              <option value="Fixed Deposit">Fixed Deposits</option>
            </select>
          )}

          {/* Clear Filters Button */}
          {(search || statusFilter || categoryFilter || startDate || endDate || sortBy !== 'date-desc') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setCategoryFilter('');
                setSortBy('date-desc');
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs text-primary dark:text-secondary font-bold hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Date Range Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-outline-variant/20">
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Date Range:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/50 rounded-2xl outline-none font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer"
            />
            <span className="text-xs text-neutral-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/50 rounded-2xl outline-none font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer"
            />
          </div>
        </div>
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
                      <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Borrower Member</th>
                      <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden sm:table-cell">Loan Product</th>
                      <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Principal Disbursed</th>
                      <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden md:table-cell">Interest Rate</th>
                      <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden lg:table-cell">Term</th>
                      <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden sm:table-cell">Disbursed Date</th>
                      <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden md:table-cell">Maturity Date</th>
                      <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 font-body text-xs text-on-surface dark:text-white/95">
                    {currentItems.map((row: any, index: number) => (
                      <tr key={index} className="hover:bg-neutral/5">
                        <td className="px-4 sm:px-6 py-3.5 font-semibold">{row.member_name}</td>
                        <td className="px-4 sm:px-6 py-3.5 text-primary dark:text-secondary font-semibold hidden sm:table-cell">{row.product_name}</td>
                        <td className="px-4 sm:px-6 py-3.5 font-bold">{formatCurrency(row.principal_amount)}</td>
                        <td className="px-4 sm:px-6 py-3.5 font-mono hidden md:table-cell">{row.interest_rate}</td>
                        <td className="px-4 sm:px-6 py-3.5 hidden lg:table-cell">{row.term_months} months</td>
                        <td className="px-4 sm:px-6 py-3.5 font-mono text-neutral-600 dark:text-neutral-400 hidden sm:table-cell">{row.disbursed_at}</td>
                        <td className="px-4 sm:px-6 py-3.5 font-mono text-neutral-600 dark:text-neutral-400 hidden md:table-cell">{row.maturity_date}</td>
                        <td className="px-4 sm:px-6 py-3.5">{getStatusBadge(row.status)}</td>
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm">
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

      {/* Preview Import Modal */}
      {previewData && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-2xl w-full max-w-2xl p-6 space-y-4 animate-modal-pop flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-6 h-6 text-primary dark:text-secondary" />
                <div>
                  <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">
                    Review Import Ledger Data
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Verify parsed members and accounts before persisting changes.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRejectImport}
                disabled={savingImport}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 text-neutral-500 font-extrabold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Scroller Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 font-body text-xs">
              {importError && (
                <div className="p-3 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl text-amber-800 dark:text-amber-400 font-medium">
                We found <strong>{previewData.membersCount} member tabs</strong> in the spreadsheet. Confirming will create user accounts and populate their respective share capital balances and credit portfolio details.
              </div>

              <div className="border border-outline-variant/40 rounded-2xl overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 dark:bg-neutral-800 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                      <th className="p-3">Member Name</th>
                      <th className="p-3">Birthdate</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3 text-right">Share Capital (Placements)</th>
                      <th className="p-3 text-center">Loans</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/35 text-on-surface dark:text-neutral-200 font-semibold">
                    {previewData.members.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-neutral/5">
                        <td className="p-3 font-bold text-neutral-800 dark:text-white">
                          {m.lastName}, {m.firstName}
                        </td>
                        <td className="p-3 text-neutral-600 dark:text-neutral-400 font-mono">
                          {m.birthDate || 'N/A'}
                        </td>
                        <td className="p-3 text-neutral-600 dark:text-neutral-400 font-mono">
                          {m.phone || 'N/A'}
                        </td>
                        <td className="p-3 text-right text-primary dark:text-secondary">
                          {formatCurrency(m.shareCapitalSum)} <span className="text-[10px] text-neutral-400 block font-normal font-sans">({m.shareCapitalCount} deposits)</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-[10px] font-bold">
                            {m.loans.length} loan(s)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/30 flex-shrink-0">
              <button
                onClick={handleRejectImport}
                disabled={savingImport}
                className="px-5 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Reject & Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={savingImport}
                className="px-5 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
              >
                {savingImport ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving Ledgers...
                  </>
                ) : (
                  <>
                    Confirm & Save to Database
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Success Modal */}
      {importResult && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-modal-pop text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">
                Import Successful!
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                All records have been successfully saved.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3.5 pt-2 text-xs font-body">
              <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-2xl border border-outline-variant/30 text-center">
                <span className="text-[10px] text-neutral-500 font-bold uppercase block tracking-wider">Members</span>
                <span className="text-sm font-extrabold text-on-surface dark:text-white block mt-1">{importResult.members_created} created</span>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-2xl border border-outline-variant/30 text-center">
                <span className="text-[10px] text-neutral-500 font-bold uppercase block tracking-wider">Shares Tx</span>
                <span className="text-sm font-extrabold text-on-surface dark:text-white block mt-1">{importResult.share_transactions_created} added</span>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-2xl border border-outline-variant/30 text-center">
                <span className="text-[10px] text-neutral-500 font-bold uppercase block tracking-wider">Loans</span>
                <span className="text-sm font-extrabold text-on-surface dark:text-white block mt-1">{importResult.loans_created} created</span>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-2xl border border-outline-variant/30 text-center">
                <span className="text-[10px] text-neutral-500 font-bold uppercase block tracking-wider">Payments</span>
                <span className="text-sm font-extrabold text-on-surface dark:text-white block mt-1">{importResult.payments_created} posted</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setImportResult(null)}
                className="w-full py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-xl text-sm font-bold hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Error Modal */}
      {importError && !previewData && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-modal-pop text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">
                Import Error
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                The spreadsheet could not be processed.
              </p>
            </div>
            
            <div className="p-3 bg-tertiary/5 border border-tertiary/15 text-xs text-tertiary rounded-2xl font-medium">
              {importError}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setImportError(null)}
                className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-on-surface dark:text-white rounded-xl text-sm font-bold transition-all cursor-pointer animate-button-bounce"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
