'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  Filter,
  RotateCw,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Calendar,
  User,
  Hash,
  Clock,
  ShieldCheck,
  Percent,
  Layers,
  HelpCircle,
  X,
  FileCheck2,
  Sliders,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface LoanItem {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  member_no: string | null;
  laf_no: string | null;
  product_name: string;
  loan_product_id: string;
  principal_amount: string | number;
  interest_rate: string | number;
  term_months: number;
  amortization_type: string;
  status: string;
  disbursed_at: string | null;
  maturity_date: string | null;
  co_maker_name: string | null;
  co_maker_phone: string | null;
  payment_mode: string | null;
  total_paid: string | number;
  remaining_balance: string | number;
  total_due: string | number;
  created_at: string;
}

export default function LoanEditorTab() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [products, setProducts] = useState<any[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, productFilter, itemsPerPage]);

  // Feedback Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Modal State
  const [editingLoan, setEditingLoan] = useState<LoanItem | null>(null);
  const [formData, setFormData] = useState({
    laf_no: '',
    principal_amount: '',
    interest_rate: '',
    term_months: 12,
    amortization_type: 'diminishing_balance',
    status: 'disbursed',
    disbursed_at: '',
    maturity_date: '',
    co_maker_name: '',
    co_maker_phone: '',
    payment_mode: '',
    mark_fully_paid: false,
    recalculate_schedules: false,
    remarks: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [deletingLoan, setDeletingLoan] = useState<LoanItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all loans & products
  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const [loansRes, productsRes] = await Promise.all([
        api.get('/loans'),
        api.get('/loans/products').catch(() => ({ data: { data: [] } })),
      ]);
      setLoans(loansRes.data.data || []);
      setProducts(productsRes.data.data || []);
    } catch (err: any) {
      console.error('Failed to load loans:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to load member loans.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  // Open edit modal
  const openEditModal = (loan: LoanItem) => {
    setEditingLoan(loan);
    const rateNum = parseFloat(String(loan.interest_rate || 0));
    const rateDisplay = rateNum > 0 && rateNum <= 1 ? (rateNum * 100).toFixed(2) : rateNum.toString();

    setFormData({
      laf_no: loan.laf_no || '',
      principal_amount: String(loan.principal_amount || ''),
      interest_rate: rateDisplay,
      term_months: loan.term_months || 12,
      amortization_type: loan.amortization_type || 'diminishing_balance',
      status: loan.status || 'disbursed',
      disbursed_at: loan.disbursed_at ? loan.disbursed_at.split('T')[0] : '',
      maturity_date: loan.maturity_date ? loan.maturity_date.split('T')[0] : '',
      co_maker_name: loan.co_maker_name || '',
      co_maker_phone: loan.co_maker_phone || '',
      payment_mode: loan.payment_mode || 'Semi-Monthly',
      mark_fully_paid: loan.status === 'fully_paid',
      recalculate_schedules: false,
      remarks: '',
    });
  };

  // Submit edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoan) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        laf_no: formData.laf_no.trim() || null,
        principal_amount: parseFloat(formData.principal_amount),
        interest_rate: parseFloat(formData.interest_rate) / 100,
        term_months: parseInt(String(formData.term_months), 10),
        amortization_type: formData.amortization_type,
        status: formData.mark_fully_paid ? 'fully_paid' : formData.status,
        disbursed_at: formData.disbursed_at ? new Date(formData.disbursed_at).toISOString() : null,
        maturity_date: formData.maturity_date || null,
        co_maker_name: formData.co_maker_name.trim() || null,
        co_maker_phone: formData.co_maker_phone.trim() || null,
        payment_mode: formData.payment_mode.trim() || null,
        mark_fully_paid: formData.mark_fully_paid,
        recalculate_schedules: formData.recalculate_schedules,
        remarks: formData.remarks.trim() || 'Manual adjustment via Data Import Loan Editor',
      };

      const res = await api.put(`/loans/${editingLoan.id}`, payload);
      const updatedLoan = res.data.data;

      // Update state
      setLoans((prev) => prev.map((l) => (l.id === updatedLoan.id ? updatedLoan : l)));

      setNotification({
        type: 'success',
        message: `Loan for ${editingLoan.first_name} ${editingLoan.last_name} (LAF: ${updatedLoan.laf_no || 'N/A'}) updated successfully. Changes are now reflected system-wide.`,
      });

      setEditingLoan(null);
    } catch (err: any) {
      console.error('Failed to update loan:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update loan.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete loan
  const handleDeleteLoan = async () => {
    if (!deletingLoan) return;

    setIsDeleting(true);
    try {
      await api.delete(`/loans/${deletingLoan.id}`);
      setLoans((prev) => prev.filter((l) => l.id !== deletingLoan.id));

      setNotification({
        type: 'success',
        message: `Loan for ${deletingLoan.first_name} ${deletingLoan.last_name} (LAF: ${deletingLoan.laf_no || 'N/A'}) deleted successfully.`,
      });

      setDeletingLoan(null);
    } catch (err: any) {
      console.error('Failed to delete loan:', err);
      setNotification({
        type: 'error',
        message: err.response?.data?.error?.message || err.response?.data?.message || 'Failed to delete loan.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered loans
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        loan.first_name?.toLowerCase().includes(q) ||
        loan.last_name?.toLowerCase().includes(q) ||
        loan.member_no?.toLowerCase().includes(q) ||
        loan.laf_no?.toLowerCase().includes(q) ||
        loan.product_name?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && loan.status === 'disbursed') ||
        (statusFilter === 'fully_paid' && loan.status === 'fully_paid') ||
        (statusFilter === 'overdue' && (loan.status === 'defaulted' || loan.status === 'overdue')) ||
        (statusFilter === 'pending' && (loan.status === 'pending_approval' || loan.status === 'approved'));

      const matchesProduct =
        productFilter === 'all' || loan.loan_product_id === productFilter || loan.product_name === productFilter;

      return matchesSearch && matchesStatus && matchesProduct;
    });
  }, [loans, searchQuery, statusFilter, productFilter]);

  // Pagination calculations
  const totalItems = filteredLoans.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);
  const indexOfFirstItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage;
  const paginatedLoans = useMemo(() => {
    return filteredLoans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredLoans, currentPage, itemsPerPage]);

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

  // Metrics
  const metrics = useMemo(() => {
    const totalCount = loans.length;
    const activeLoans = loans.filter((l) => l.status === 'disbursed');
    const fullyPaidLoans = loans.filter((l) => l.status === 'fully_paid');
    const totalPrincipal = loans.reduce((sum, l) => sum + parseFloat(String(l.principal_amount || 0)), 0);
    const totalOutstanding = loans.reduce((sum, l) => sum + parseFloat(String(l.remaining_balance || 0)), 0);

    return {
      totalCount,
      activeCount: activeLoans.length,
      paidCount: fullyPaidLoans.length,
      totalPrincipal,
      totalOutstanding,
    };
  }, [loans]);

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-start justify-between gap-3 border shadow-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400" />
            )}
            <p className="text-xs font-semibold leading-relaxed">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 shadow-xs">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Total Loans</span>
          <p className="font-headline text-xl sm:text-2xl font-extrabold text-on-surface dark:text-white mt-1">
            {metrics.totalCount}
          </p>
          <span className="text-[10px] text-neutral-400 font-medium">All imported & active records</span>
        </div>

        <div className="bg-white dark:bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Active Loans</span>
          <p className="font-headline text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
            {metrics.activeCount}
          </p>
          <span className="text-[10px] text-neutral-400 font-medium">Disbursed with running terms</span>
        </div>

        <div className="bg-white dark:bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 shadow-xs">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Fully Paid</span>
          <p className="font-headline text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white mt-1">
            {metrics.paidCount}
          </p>
          <span className="text-[10px] text-neutral-400 font-medium">Completed & closed</span>
        </div>

        <div className="bg-white dark:bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 shadow-xs">
          <span className="text-[11px] font-bold text-primary dark:text-secondary uppercase tracking-wider block">Total Outstanding</span>
          <p className="font-headline text-lg sm:text-xl font-extrabold text-primary dark:text-secondary mt-1">
            ₱{metrics.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-neutral-400 font-medium">Current collective balance</span>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Refresh */}
      <div className="bg-white dark:bg-surface-container-low p-4 sm:p-5 rounded-3xl border border-outline-variant/60 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Member Name, Member ID, or LAF No..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-outline-variant rounded-xl bg-neutral-50/50 dark:bg-neutral-900/50 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 focus:ring-1 focus:ring-primary outline-none text-neutral-700 dark:text-neutral-300 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active (Disbursed)</option>
            <option value="fully_paid">Fully Paid</option>
            <option value="overdue">Overdue / Defaulted</option>
            <option value="pending">Pending Approval</option>
          </select>

          {/* Product Filter */}
          {products.length > 0 && (
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 focus:ring-1 focus:ring-primary outline-none text-neutral-700 dark:text-neutral-300 font-medium"
            >
              <option value="all">All Loan Products</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchLoans}
            disabled={loading}
            className="p-2 rounded-xl border border-outline-variant hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-300 disabled:opacity-50 cursor-pointer"
            title="Refresh list"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Loans Table */}
      <div className="bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-outline-variant/40 text-neutral-600 dark:text-neutral-300 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Member Name / ID</th>
                <th className="py-3 px-3">LAF No.</th>
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3 text-right">Principal</th>
                <th className="py-3 px-3 text-right">Total Paid</th>
                <th className="py-3 px-3 text-right">Remaining Balance</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Maturity</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-body">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading loan records...</span>
                  </td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <Banknote className="w-8 h-8 opacity-30 mx-auto mb-2" />
                    <p className="font-bold text-neutral-600 dark:text-neutral-300">No loan records found</p>
                    <p className="text-[11px]">Try adjusting your search criteria or filters.</p>
                  </td>
                </tr>
              ) : (
                paginatedLoans.map((loan) => {
                  const remBal = parseFloat(String(loan.remaining_balance || 0));
                  const totPaid = parseFloat(String(loan.total_paid || 0));
                  const princ = parseFloat(String(loan.principal_amount || 0));

                  return (
                    <tr
                      key={loan.id}
                      className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-on-surface dark:text-white">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">
                            {loan.last_name}, {loan.first_name}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            ID: {loan.member_no || 'N/A'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold font-mono bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary border border-primary/20">
                          {loan.laf_no || 'UNASSIGNED'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-neutral-700 dark:text-neutral-300">
                        <span className="font-semibold">{loan.product_name || 'Standard Loan'}</span>
                        <span className="block text-[10px] text-neutral-400">
                          {loan.term_months} mos • {(parseFloat(String(loan.interest_rate || 0)) * 100).toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        ₱{princ.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        ₱{totPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold">
                        {remBal <= 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-[11px]">
                            ₱0.00
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400">
                            ₱{remBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            loan.status === 'fully_paid'
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : loan.status === 'disbursed'
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : loan.status === 'defaulted'
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300'
                          }`}
                        >
                          {loan.status === 'fully_paid' ? 'Fully Paid' : loan.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-neutral-500 font-mono text-[10.5px]">
                        {loan.maturity_date ? new Date(loan.maturity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(loan)}
                            className="p-1.5 rounded-lg bg-primary/10 dark:bg-secondary/10 hover:bg-primary/20 dark:hover:bg-secondary/20 text-primary dark:text-secondary transition-colors cursor-pointer"
                            title="Edit Loan Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => setDeletingLoan(loan)}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                              title="Delete Loan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-outline-variant/40 p-4 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-body text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
              {totalItems === 0
                ? 'No matching loans'
                : `Displaying ${indexOfFirstItem + 1} - ${indexOfLastItem} of ${totalItems.toLocaleString()} loans`}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span>• Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200 focus:outline-none focus:border-primary cursor-pointer shadow-2xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 justify-center">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-outline-variant/60 rounded-full text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-neutral-700 dark:text-neutral-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              {getPaginationNumbers(currentPage, totalPages).map((page, idx) => {
                if (page === '...') {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="w-8 h-8 flex items-center justify-center text-xs text-neutral-400 font-bold select-none"
                    >
                      ...
                    </span>
                  );
                }
                const pageNum = Number(page);
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border-primary dark:border-secondary shadow-xs'
                        : 'border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-outline-variant/60 rounded-full text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-neutral-700 dark:text-neutral-300"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* EDIT LOAN MODAL */}
      {editingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-modal-pop max-h-[92vh] flex flex-col font-sans">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/40 flex justify-between items-center bg-neutral-50/60 dark:bg-neutral-900/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-sm text-on-surface dark:text-white">
                    Edit & Correct Member Loan
                  </h3>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    {editingLoan.last_name}, {editingLoan.first_name} (ID: {editingLoan.member_no || 'N/A'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingLoan(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Member Card Banner */}
              <div className="bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-secondary block">Loan Product</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{editingLoan.product_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-secondary block">Recorded Balance</span>
                  <span className="font-mono font-extrabold text-neutral-900 dark:text-white">
                    ₱{parseFloat(String(editingLoan.remaining_balance || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* LAF No */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">LAF No.</label>
                  <input
                    type="text"
                    value={formData.laf_no}
                    onChange={(e) => setFormData({ ...formData, laf_no: e.target.value })}
                    placeholder="e.g. 952"
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-primary font-mono text-xs text-on-surface dark:text-white"
                  />
                </div>

                {/* Principal Amount */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Principal Amount (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.principal_amount}
                    onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-primary font-mono text-xs text-on-surface dark:text-white"
                  />
                </div>

                {/* Status Dropdown */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Loan Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value, mark_fully_paid: e.target.value === 'fully_paid' })}
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-primary text-xs text-on-surface dark:text-white font-medium"
                  >
                    <option value="disbursed">Active (Disbursed)</option>
                    <option value="fully_paid">Fully Paid (Completed)</option>
                    <option value="defaulted">Overdue / Defaulted</option>
                    <option value="approved">Approved (Awaiting Disbursement)</option>
                    <option value="pending_approval">Pending Approval</option>
                  </select>
                </div>

                {/* Term Months */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Term (Months)</label>
                  <input
                    type="number"
                    value={formData.term_months}
                    onChange={(e) => setFormData({ ...formData, term_months: parseInt(e.target.value, 10) || 1 })}
                    min="1"
                    max="120"
                    required
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-primary font-mono text-xs text-on-surface dark:text-white"
                  />
                </div>

                {/* Interest Rate (%) */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                    placeholder="e.g. 2.0"
                    required
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-primary font-mono text-xs text-on-surface dark:text-white"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Payment Mode</label>
                  <input
                    type="text"
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    placeholder="e.g. Semi-Monthly, Salary Deduction"
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-primary text-xs text-on-surface dark:text-white"
                  />
                </div>

                {/* Disbursed Date */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Disbursement Date</label>
                  <input
                    type="date"
                    value={formData.disbursed_at}
                    onChange={(e) => setFormData({ ...formData, disbursed_at: e.target.value })}
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-primary text-xs text-on-surface dark:text-white font-mono"
                  />
                </div>

                {/* Maturity Date */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Maturity Date</label>
                  <input
                    type="date"
                    value={formData.maturity_date}
                    onChange={(e) => setFormData({ ...formData, maturity_date: e.target.value })}
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-primary text-xs text-on-surface dark:text-white font-mono"
                  />
                </div>

                {/* Co-Maker Name */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Co-Maker Name</label>
                  <input
                    type="text"
                    value={formData.co_maker_name}
                    onChange={(e) => setFormData({ ...formData, co_maker_name: e.target.value })}
                    placeholder="Optional co-maker name"
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-primary text-xs text-on-surface dark:text-white"
                  />
                </div>

                {/* Co-Maker Phone */}
                <div>
                  <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">Co-Maker Contact</label>
                  <input
                    type="text"
                    value={formData.co_maker_phone}
                    onChange={(e) => setFormData({ ...formData, co_maker_phone: e.target.value })}
                    placeholder="Optional co-maker phone"
                    className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-primary text-xs text-on-surface dark:text-white"
                  />
                </div>
              </div>

              {/* Special Action: Mark as Fully Paid (Zero Out Balance) */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="mark_fully_paid"
                  checked={formData.mark_fully_paid}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mark_fully_paid: e.target.checked,
                      status: e.target.checked ? 'fully_paid' : 'disbursed',
                    })
                  }
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="mark_fully_paid" className="cursor-pointer">
                  <strong className="text-emerald-800 dark:text-emerald-300 block font-bold">
                    Mark Loan as Fully Paid (Zero Out Remaining Balance)
                  </strong>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block leading-relaxed">
                    Check this if the member has settled all obligations for this loan. This automatically reconciles unpaid amortization installments and sets remaining balance to ₱0 across the entire system.
                  </span>
                </label>
              </div>

              {/* Reason / Remarks for Audit Trail */}
              <div>
                <label className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Correction Reason / Audit Note
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Corrected principal and LAF from legacy passbook; member verified fully paid."
                  rows={2}
                  className="w-full px-3 py-2 border border-outline-variant rounded-xl bg-white dark:bg-neutral-900 outline-none focus:ring-1 focus:ring-primary text-xs text-on-surface dark:text-white"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-outline-variant/40 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingLoan(null)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-3.5 h-3.5" /> Save Loan Adjustments
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deletingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4 animate-modal-pop">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-headline font-bold text-base text-neutral-900 dark:text-white">Delete Loan Record?</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Are you sure you want to delete loan <strong>LAF: {deletingLoan.laf_no || 'UNASSIGNED'}</strong> for{' '}
                <strong>{deletingLoan.first_name} {deletingLoan.last_name}</strong>? This action will remove its schedule matrix and cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLoan(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteLoan}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
