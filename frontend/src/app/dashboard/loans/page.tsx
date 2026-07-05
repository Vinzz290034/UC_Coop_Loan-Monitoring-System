'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import {
  Banknote,
  Percent,
  Calendar,
  AlertTriangle,
  PlusCircle,
  FileCheck,
  CheckCircle,
  XCircle,
  CreditCard,
  DollarSign,
  User,
  Clock,
  Eye,
  EyeOff,
  Search,
  X,
  ArrowLeft
} from 'lucide-react';

interface LoanProduct {
  id: number;
  name: string;
  interest_rate: string;
  term_months: number;
  amortization_type: 'flat_rate' | 'reducing_balance';
  min_amount: string;
  max_amount: string;
  is_active: boolean;
}

interface Loan {
  id: number;
  member_id: number;
  first_name?: string;
  last_name?: string;
  product_name?: string;
  principal_amount: string;
  interest_rate: string;
  term_months: number;
  amortization_type: string;
  status: 'pending_approval' | 'disbursed' | 'fully_paid' | 'rejected' | 'defaulted';
  created_at: string;
}

export default function LoansPage() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [activeTab, setActiveTab] = useState<'loans' | 'products'>('loans');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [members, setMembers] = useState<any[]>([]); // for apply dropdown

  // Loading & error state
  const [loansLoading, setLoansLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Loan Details Drawer/Collapsible state
  const [expandedLoanId, setExpandedLoanId] = useState<number | null>(null);
  const [loanDetails, setLoanDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);

  // Form Fields: Product
  const [prodName, setProdName] = useState('');
  const [prodInterestRate, setProdInterestRate] = useState('');
  const [prodTermMonths, setProdTermMonths] = useState('');
  const [prodAmortType, setProdAmortType] = useState<'flat_rate' | 'reducing_balance'>('flat_rate');
  const [prodMinAmount, setProdMinAmount] = useState('');
  const [prodMaxAmount, setProdMaxAmount] = useState('');
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Form Fields: Apply
  const [applyMemberId, setApplyMemberId] = useState('');
  const [applyProductId, setApplyProductId] = useState('');
  const [applyAmount, setApplyAmount] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Form Fields: Repayment
  const [repayLoanId, setRepayLoanId] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState('Cash');
  const [repayRefNo, setRepayRefNo] = useState('');
  const [repaySubmitting, setRepaySubmitting] = useState(false);
  const [repayError, setRepayError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');

  const fetchLoans = useCallback(async () => {
    try {
      setLoansLoading(true);
      setError(null);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/loans', { params });
      setLoans(response.data.data || []);
    } catch (err: any) {
      console.error('Error fetching loans:', err);
      setError(err.response?.data?.message || 'Failed to retrieve active credit ledger.');
    } finally {
      setLoansLoading(false);
    }
  }, [statusFilter]);

  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const response = await api.get('/loans/products');
      setProducts(response.data.data || []);
    } catch (err) {
      console.error('Error fetching loan products:', err);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Pre-load members list for dropdown autocomplete
  const fetchMembersList = async () => {
    try {
      const response = await api.get('/members');
      setMembers(response.data.data || []);
    } catch (err) {
      console.error('Error pre-loading members:', err);
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchProducts();
    if (isAdminOrManager) {
      fetchMembersList();
    }
  }, [fetchLoans, fetchProducts, isAdminOrManager]);

  const toggleLoanExpand = async (loanId: number) => {
    if (expandedLoanId === loanId) {
      setExpandedLoanId(null);
      setLoanDetails(null);
      return;
    }

    setExpandedLoanId(loanId);
    setLoadingDetails(true);
    setLoanDetails(null);

    try {
      const response = await api.get(`/loans/${loanId}`);
      setLoanDetails(response.data.data);
    } catch (err) {
      console.error('Failed to load loan details:', err);
      alert('Failed to load amortization schedules.');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Actions
  const handleDisburseLoan = async (loanId: number) => {
    if (!window.confirm('Verify that principal funds are ready for disbursement. Proceed?')) return;
    try {
      await api.post(`/loans/${loanId}/disburse`);
      alert('Loan successfully disbursed! Amortization schedules generated.');
      fetchLoans();
      if (expandedLoanId === loanId) {
        // reload details
        const response = await api.get(`/loans/${loanId}`);
        setLoanDetails(response.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to disburse credit.');
    }
  };

  const handleRejectLoan = async (loanId: number) => {
    if (!window.confirm('Are you sure you want to reject this application?')) return;
    try {
      await api.patch(`/loans/${loanId}/reject`);
      alert('Application rejected.');
      fetchLoans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject application.');
    }
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodInterestRate || !prodTermMonths || !prodMaxAmount) {
      setProductError('Please fill out all required attributes.');
      return;
    }

    setProductError(null);
    setProductSubmitting(true);

    try {
      await api.post('/loans/products', {
        name: prodName,
        interest_rate: parseFloat(prodInterestRate),
        term_months: parseInt(prodTermMonths, 10),
        amortization_type: prodAmortType,
        min_amount: prodMinAmount ? parseFloat(prodMinAmount) : undefined,
        max_amount: parseFloat(prodMaxAmount)
      });

      setProdName('');
      setProdInterestRate('');
      setProdTermMonths('');
      setProdAmortType('flat_rate');
      setProdMinAmount('');
      setProdMaxAmount('');
      setIsProductModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setProductError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create product.');
    } finally {
      setProductSubmitting(false);
    }
  };

  const handleApplyLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyMemberId || !applyProductId || !applyAmount) {
      setApplyError('Please fill in all requested fields.');
      return;
    }

    setApplyError(null);
    setApplySubmitting(true);

    try {
      await api.post('/loans', {
        member_id: parseInt(applyMemberId, 10),
        loan_product_id: parseInt(applyProductId, 10),
        principal_amount: parseFloat(applyAmount)
      });

      setApplyMemberId('');
      setApplyProductId('');
      setApplyAmount('');
      setIsApplyModalOpen(false);
      fetchLoans();
    } catch (err: any) {
      setApplyError(err.response?.data?.error?.message || err.response?.data?.message || 'Application creation failed.');
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleRepaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayLoanId || !repayAmount || !repayMethod) {
      setRepayError('Loan ID, Amount, and Payment Method are required.');
      return;
    }

    setRepayError(null);
    setRepaySubmitting(true);

    try {
      await api.post('/loans/repayments', {
        loan_id: parseInt(repayLoanId, 10),
        amount: parseFloat(repayAmount),
        payment_method: repayMethod,
        reference_no: repayRefNo || undefined
      });

      setRepayLoanId('');
      setRepayAmount('');
      setRepayMethod('Cash');
      setRepayRefNo('');
      setIsRepaymentModalOpen(false);
      fetchLoans();
    } catch (err: any) {
      setRepayError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to record repayment.');
    } finally {
      setRepaySubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(val || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disbursed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
            <CheckCircle className="w-3.5 h-3.5" />
            Active / Disbursed
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500">
            <Clock className="w-3.5 h-3.5" />
            Pending Approval
          </span>
        );
      case 'fully_paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/15 text-primary">
            <CheckCircle className="w-3.5 h-3.5" />
            Fully Paid
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral/15 text-neutral-600 dark:text-neutral-400">
            <X className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-tertiary/10 text-tertiary">
            <AlertTriangle className="w-3.5 h-3.5" />
            Defaulted
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-neutral-500 hover:text-primary dark:hover:text-secondary transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to System Dashboard
        </Link>
      </div>

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface dark:text-white">Credit Portfolio Ledger</h1>
          <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
            Manage credit products, loan instantiation, approvals, and repayment bookings.
          </p>
        </div>
        {isAdminOrManager && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsRepaymentModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral/5 transition-all shadow-sm"
            >
              <CreditCard className="w-4 h-4 text-tertiary" />
              Book Repayment
            </button>
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Apply for Loan
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/50">
        <button
          onClick={() => setActiveTab('loans')}
          className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all ${activeTab === 'loans'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
            }`}
        >
          Credit Contracts List
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all ${activeTab === 'products'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
            }`}
        >
          Loan Products Registry
        </button>
      </div>

      {/* TABS CONTAINER */}
      {activeTab === 'loans' ? (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4 bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm">
            <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 font-label">Contract Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-outline-variant rounded-xl bg-white dark:bg-surface-container-low focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
            >
              <option value="">All Loans</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="disbursed">Active / Disbursed</option>
              <option value="fully_paid">Fully Paid</option>
              <option value="rejected">Rejected</option>
              <option value="defaulted">Defaulted</option>
            </select>
          </div>

          {/* Loans List */}
          {loansLoading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : error ? (
            <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl">
              <p className="text-sm font-bold">{error}</p>
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
              <AlertTriangle className="w-8 h-8 text-neutral-600 dark:text-neutral-400/45 mx-auto mb-2" />
              <h3 className="font-headline font-bold text-on-surface dark:text-white">No Loans Registered</h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">No loans found matching the status filter.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low dark:bg-surface-container-high/55 border-b border-outline-variant/50">
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">ID</th>
                      {isAdminOrManager && (
                        <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Borrower Member</th>
                      )}
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Loan Product</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Principal Amount</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Interest (Term)</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Status</th>
                      <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 font-body text-xs text-on-surface dark:text-white/95">
                    {loans.map((loan) => {
                      const isExpanded = expandedLoanId === loan.id;
                      return (
                        <React.Fragment key={loan.id}>
                          <tr className="hover:bg-neutral/5 dark:hover:bg-neutral/10 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold">#{loan.id}</td>
                            {isAdminOrManager && (
                              <td className="px-6 py-4 font-semibold">
                                {loan.last_name}, {loan.first_name}
                              </td>
                            )}
                            <td className="px-6 py-4 font-semibold text-primary dark:text-secondary">{loan.product_name || 'Legacy Product'}</td>
                            <td className="px-6 py-4 font-bold">{formatCurrency(parseFloat(loan.principal_amount))}</td>
                            <td className="px-6 py-4 font-mono">
                              {parseFloat(loan.interest_rate)}% ({loan.term_months}mo)
                            </td>
                            <td className="px-6 py-4">{getStatusBadge(loan.status)}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => toggleLoanExpand(loan.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant hover:bg-neutral/5 transition-all text-[11px] font-bold"
                              >
                                {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                Amortization
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={isAdminOrManager ? 7 : 6} className="px-6 py-6 bg-surface dark:bg-surface-container-high/30 border-y border-outline-variant/40">
                                {loadingDetails ? (
                                  <div className="flex items-center gap-2 py-4 justify-center">
                                    <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                                    <span className="text-neutral-600 dark:text-neutral-400 font-semibold text-xs">Loading schedules and ledger data...</span>
                                  </div>
                                ) : !loanDetails ? (
                                  <p className="text-center text-xs text-neutral-600 dark:text-neutral-400">Failed to parse loan details.</p>
                                ) : (
                                  <div className="space-y-6">
                                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/40 pb-4">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
                                        <div>
                                          <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Interest Amortization Type</span>
                                          <p className="font-semibold text-on-surface dark:text-white capitalize mt-0.5">
                                            {loanDetails.amortization_type?.replace('_', ' ')}
                                          </p>
                                        </div>
                                        <div>
                                          <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Registered Date</span>
                                          <p className="font-semibold text-on-surface dark:text-white mt-0.5">
                                            {new Date(loanDetails.created_at).toLocaleDateString()}
                                          </p>
                                        </div>
                                        <div>
                                          <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Disbursement Date</span>
                                          <p className="font-semibold text-on-surface dark:text-white mt-0.5">
                                            {loanDetails.disbursement_date
                                              ? new Date(loanDetails.disbursement_date).toLocaleDateString()
                                              : <span className="italic text-neutral-600 dark:text-neutral-400/50">Un-disbursed</span>}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Disbursement / Rejection actions */}
                                      {isAdminOrManager && loan.status === 'pending_approval' && (
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleRejectLoan(loan.id)}
                                            className="px-4 py-2 border border-tertiary/40 hover:bg-tertiary/10 text-tertiary font-bold rounded-full text-[11px] transition-colors"
                                          >
                                            Reject Credit Request
                                          </button>
                                          <button
                                            onClick={() => handleDisburseLoan(loan.id)}
                                            className="px-4 py-2 bg-primary text-white font-bold rounded-full text-[11px] shadow hover:translate-y-[-1px] transition-all"
                                          >
                                            Verify & Disburse Funds
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Amortization Schedule */}
                                    <div className="space-y-3">
                                      <h4 className="font-headline font-bold text-xs text-on-surface dark:text-white flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-primary dark:text-secondary" />
                                        Amortization Schedule Matrices
                                      </h4>
                                      {loanDetails.schedule && loanDetails.schedule.length === 0 ? (
                                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 italic">No schedules generated yet (needs disbursement).</p>
                                      ) : (
                                        <div className="border border-outline-variant/60 rounded-2xl overflow-hidden bg-white dark:bg-surface">
                                          <table className="w-full text-left border-collapse text-[11px]">
                                            <thead>
                                              <tr className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/40">
                                                <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Inst #</th>
                                                <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Principal Due</th>
                                                <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Interest Due</th>
                                                <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Total Due</th>
                                                <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Paid Principal</th>
                                                <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Paid Interest</th>
                                                <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Due Date</th>
                                                <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Status</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-outline-variant/35 font-mono">
                                              {loanDetails.schedule?.map((sch: any) => (
                                                <tr key={sch.id} className="hover:bg-neutral/5">
                                                  <td className="px-4 py-2 font-bold">Installment #{sch.installment_number}</td>
                                                  <td className="px-4 py-2">{formatCurrency(parseFloat(sch.principal_due))}</td>
                                                  <td className="px-4 py-2">{formatCurrency(parseFloat(sch.interest_due))}</td>
                                                  <td className="px-4 py-2 font-bold">{formatCurrency(parseFloat(sch.principal_due) + parseFloat(sch.interest_due))}</td>
                                                  <td className="px-4 py-2 text-primary">{formatCurrency(parseFloat(sch.principal_paid))}</td>
                                                  <td className="px-4 py-2 text-primary">{formatCurrency(parseFloat(sch.interest_paid))}</td>
                                                  <td className="px-4 py-2 font-sans">{new Date(sch.due_date).toLocaleDateString()}</td>
                                                  <td className="px-4 py-2 font-sans">
                                                    {sch.status === 'paid' ? (
                                                      <span className="text-primary font-bold">Paid</span>
                                                    ) : sch.status === 'partially_paid' ? (
                                                      <span className="text-amber-500 font-bold">Partial</span>
                                                    ) : (
                                                      <span className="text-tertiary font-bold">Unpaid</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>

                                    {/* Payments History */}
                                    <div className="space-y-3">
                                      <h4 className="font-headline font-bold text-xs text-on-surface dark:text-white flex items-center gap-1.5">
                                        <CreditCard className="w-4 h-4 text-primary dark:text-secondary" />
                                        Posted Ledger Payments History
                                      </h4>
                                      {loanDetails.payments && loanDetails.payments.length === 0 ? (
                                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 italic">No payments logged yet.</p>
                                      ) : (
                                        <div className="border border-outline-variant/60 rounded-2xl overflow-hidden bg-white dark:bg-surface">
                                          <table className="w-full text-left border-collapse text-[11px]">
                                            <thead>
                                              <tr className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/40">
                                                <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Ref No</th>
                                                <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Amount Paid</th>
                                                <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Payment Method</th>
                                                <th className="px-4 py-2.5 font-bold text-neutral-600 dark:text-neutral-400">Booking Date</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-outline-variant/35 font-mono">
                                              {loanDetails.payments?.map((pay: any) => (
                                                <tr key={pay.id} className="hover:bg-neutral/5">
                                                  <td className="px-4 py-2 font-bold">{pay.reference_no || 'N/A'}</td>
                                                  <td className="px-4 py-2 text-primary font-bold">{formatCurrency(parseFloat(pay.amount))}</td>
                                                  <td className="px-4 py-2 font-sans">{pay.payment_method}</td>
                                                  <td className="px-4 py-2 font-sans">{new Date(pay.payment_date).toLocaleString()}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* PRODUCTS TAB */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-base text-on-surface dark:text-white">Active Loan Templates Catalog</h3>
            {isAdminOrManager && (
              <button
                onClick={() => setIsProductModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                Configure New Product
              </button>
            )}
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
              <AlertTriangle className="w-8 h-8 text-neutral-600 dark:text-neutral-400/45 mx-auto mb-2" />
              <h3 className="font-headline font-bold text-on-surface dark:text-white">No Products Registered</h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">No credit products configured yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {products.map((prod) => (
                <div key={prod.id} className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-headline font-bold text-base text-on-surface dark:text-white">{prod.name}</h4>
                      <p className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-0.5 capitalize">{prod.amortization_type?.replace('_', ' ')} Formula</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-outline-variant/40 pt-4 text-xs font-body">
                    <div>
                      <span className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-bold">Interest Rate</span>
                      <p className="font-headline text-base font-extrabold text-primary dark:text-secondary mt-0.5 flex items-center gap-0.5">
                        <Percent className="w-4 h-4" /> {parseFloat(prod.interest_rate)}% p.a.
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-bold">Term Limit</span>
                      <p className="font-headline text-base font-extrabold text-on-surface dark:text-white mt-0.5">
                        {prod.term_months} Months
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-outline-variant/40 pt-4 text-[11px] text-neutral-600 dark:text-neutral-400">
                    <span>Borrowing Range Limits:</span>
                    <p className="font-mono font-bold text-on-surface dark:text-white mt-0.5">
                      {formatCurrency(parseFloat(prod.min_amount))} - {formatCurrency(parseFloat(prod.max_amount))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE LOAN PRODUCT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-fade-in">
            <button
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral/10 text-neutral-600 dark:text-neutral-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Configure Loan Product</h2>

            {productError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{productError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProductSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Product Template Name *</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Regular Salary Loan"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Interest Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodInterestRate}
                    onChange={(e) => setProdInterestRate(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Term Duration (Months) *</label>
                  <input
                    type="number"
                    required
                    value={prodTermMonths}
                    onChange={(e) => setProdTermMonths(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Amortization Computation Method *</label>
                <select
                  value={prodAmortType}
                  onChange={(e: any) => setProdAmortType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                >
                  <option value="flat_rate">Flat Amortization (Monthly Flat Rate)</option>
                  <option value="reducing_balance">Diminishing Balance (Reducing Capital Interest)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Minimum Amount (₱)</label>
                  <input
                    type="number"
                    value={prodMinAmount}
                    onChange={(e) => setProdMinAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Maximum Amount (₱) *</label>
                  <input
                    type="number"
                    required
                    value={prodMaxAmount}
                    onChange={(e) => setProdMaxAmount(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={productSubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
                >
                  {productSubmitting ? 'Registering...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: APPLY FOR LOAN */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-fade-in">
            <button
              onClick={() => setIsApplyModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral/10 text-neutral-600 dark:text-neutral-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Apply for Loan</h2>

            {applyError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplyLoanSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Select Member Borrower *</label>
                <select
                  required
                  value={applyMemberId}
                  onChange={(e) => setApplyMemberId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                >
                  <option value="">-- Choose Member Profile --</option>
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.last_name}, {m.first_name} (ID: #{m.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Select Loan Product *</label>
                <select
                  required
                  value={applyProductId}
                  onChange={(e) => setApplyProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                >
                  <option value="">-- Choose Credit Template --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({parseFloat(p.interest_rate)}% interest / {p.term_months} months)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Principal Borrowing Amount (₱) *</label>
                <input
                  type="number"
                  required
                  value={applyAmount}
                  onChange={(e) => setApplyAmount(e.target.value)}
                  placeholder="e.g. 20000"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applySubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
                >
                  {applySubmitting ? 'Submitting Application...' : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD REPAYMENT */}
      {isRepaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-fade-in">
            <button
              onClick={() => setIsRepaymentModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral/10 text-neutral-600 dark:text-neutral-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Book Loan Repayment</h2>

            {repayError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{repayError}</span>
              </div>
            )}

            <form onSubmit={handleRepaymentSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Select Credit Contract *</label>
                <select
                  required
                  value={repayLoanId}
                  onChange={(e) => setRepayLoanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                >
                  <option value="">-- Choose Contract ID --</option>
                  {loans
                    .filter((l) => l.status === 'disbursed' || l.status === 'defaulted')
                    .map((l: any) => (
                      <option key={l.id} value={l.id}>
                        Contract #{l.id} - {l.last_name}, {l.first_name} ({l.product_name} - Principal: ₱{parseFloat(l.principal_amount).toLocaleString()})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Repayment Payment Amount (₱) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Payment Method *</label>
                  <select
                    value={repayMethod}
                    onChange={(e) => setRepayMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  >
                    <option value="Cash">Cash Ledger</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Cooperative Check</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1">Reference No / Receipt No</label>
                  <input
                    type="text"
                    value={repayRefNo}
                    onChange={(e) => setRepayRefNo(e.target.value)}
                    placeholder="e.g. TXN-1082"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRepaymentModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={repaySubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
                >
                  {repaySubmitting ? 'Recording Repayment...' : 'Book Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
