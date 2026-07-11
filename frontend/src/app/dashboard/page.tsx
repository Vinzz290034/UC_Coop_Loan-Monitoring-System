'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { SkeletonCard } from '@/components/ui/Skeleton';
import KpiCard from '@/components/charts/KpiCard';
import ChartContainer from '@/components/charts/ChartContainer';
import LoanStatusChart from '@/components/charts/LoanStatusChart';
import MonthlyTrendsChart from '@/components/charts/MonthlyTrendsChart';
import MemberGrowthChart from '@/components/charts/MemberGrowthChart';
import RepaymentChart from '@/components/charts/RepaymentChart';
import FinancialSummaryChart from '@/components/charts/FinancialSummaryChart';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Coins,
  ShieldCheck,
  Building,
  PiggyBank,
  CheckCircle2,
  Percent,
  Users,
  UserCheck,
  UserX,
  Banknote,
  FileCheck,
  PlusCircle,
  CalendarCheck,
  User as UserIcon,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function OverviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Member-specific data
  const [memberMetrics, setMemberMetrics] = useState<any>(null);

  // Admin/Manager analytics data
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [loanTrends, setLoanTrends] = useState<any[]>([]);
  const [repaymentTrends, setRepaymentTrends] = useState<any[]>([]);
  const [memberGrowth, setMemberGrowth] = useState<any[]>([]);
  const [loanDistribution, setLoanDistribution] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any[]>([]);

  // --- MEMBER WIZARD FORM STATES ---
  // (Must be declared at the top level alongside other hooks, never after
  //  conditional returns, to satisfy React's Rules of Hooks.)
  const [activeModal, setActiveModal] = useState<'loan' | 'investment' | 'appointment' | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Loan Form States
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loanAmount, setLoanAmount] = useState<number>(0);

  // Investment Form States
  const [investmentType, setInvestmentType] = useState<'capital' | 'fixed_deposit'>('capital');
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [fdDuration, setFdDuration] = useState<string>('12'); // months

  // Appointment Form States
  const [appointmentPurpose, setAppointmentPurpose] = useState<string>('Loan Application Consultation');
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [appointmentSlot, setAppointmentSlot] = useState<'morning' | 'afternoon'>('morning');

  const fetchDashboardData = async (isRefresh = false) => {
    if (!user) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      if (user.role === 'admin' || user.role === 'manager') {
        // Fetch all analytics endpoints in parallel
        const [summaryRes, trendsRes, repaymentRes, growthRes, distRes, finRes] = await Promise.all([
          api.get('/analytics/dashboard-summary'),
          api.get('/analytics/loan-trends'),
          api.get('/analytics/repayment-trends'),
          api.get('/analytics/member-growth'),
          api.get('/analytics/loan-status-distribution'),
          api.get('/analytics/financial-summary'),
        ]);

        setDashboardSummary(summaryRes.data.data);
        setLoanTrends(trendsRes.data.data);
        setRepaymentTrends(repaymentRes.data.data);
        setMemberGrowth(growthRes.data.data);
        setLoanDistribution(distRes.data.data);
        setFinancialSummary(finRes.data.data);
      } else if (user.role === 'member') {
        const memberId = user.profile?.id;
        if (memberId) {
          const response = await api.get(`/members/${memberId}/dashboard-summary`);
          setMemberMetrics(response.data.data);
        } else {
          setError('Could not associate authenticated session with member profile.');
        }
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Error loading dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-neutral/20 w-48 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-neutral/10 rounded-3xl animate-pulse"></div>
          <div className="h-80 bg-neutral/10 rounded-3xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl">
        <h4 className="font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Data Fetch Error
        </h4>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  // --- MEMBER VIEW & WIZARD FLOWS ---

  // Fetch products when opening loan modal
  const openLoanModal = async () => {
    try {
      setModalError(null);
      setSubmitting(true);
      setActiveModal('loan');
      setWizardStep(1);
      setSuccessData(null);
      const res = await api.get('/loans/products');
      const activeProducts = res.data.data.filter((p: any) => p.is_active);
      setProducts(activeProducts);
      if (activeProducts.length > 0) {
        setSelectedProduct(activeProducts[0]);
        setLoanAmount(parseFloat(activeProducts[0].min_amount));
      }
    } catch (err: any) {
      setModalError('Failed to fetch available loan products. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyLoan = async () => {
    if (!selectedProduct || loanAmount <= 0) return;
    try {
      setSubmitting(true);
      setModalError(null);
      const res = await api.post('/loans', {
        loan_product_id: selectedProduct.id,
        principal_amount: loanAmount
      });
      setSuccessData(res.data.data);
      setWizardStep(3); // Go to success step
      fetchDashboardData();
    } catch (err: any) {
      setModalError(err.response?.data?.error?.message || 'Failed to submit loan application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiateInvestment = async () => {
    const amount = parseFloat(investmentAmount);
    if (isNaN(amount) || amount <= 0) {
      setModalError('Please enter a valid amount.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);
      let res;
      if (investmentType === 'capital') {
        res = await api.post('/accounts/share-capital', {
          transaction_type: 'credit',
          amount: amount,
          remarks: 'Member Share Capital Placement'
        });
      } else {
        res = await api.post('/accounts/fixed-deposits', {
          principal_amount: amount,
          interest_rate: 0.05, // 5% default
          duration_months: parseInt(fdDuration, 10)
        });
      }
      setSuccessData({
        ...res.data.data,
        type: investmentType,
        amount: amount,
        reference_code: `TXN-${Math.floor(100000 + Math.random() * 900000)}`
      });
      setWizardStep(3);
      fetchDashboardData();
    } catch (err: any) {
      setModalError(err.response?.data?.error?.message || 'Failed to initiate investment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!appointmentDate || !appointmentPurpose) {
      setModalError('Please select a date and purpose.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);
      const res = await api.post('/appointments', {
        purpose: appointmentPurpose,
        appointment_date: appointmentDate,
        time_slot: appointmentSlot
      });
      setSuccessData(res.data.data);
      setWizardStep(3);
    } catch (err: any) {
      setModalError(err.response?.data?.error?.message || 'Failed to book appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setWizardStep(1);
    setSuccessData(null);
    setModalError(null);
    setInvestmentAmount('');
    setAppointmentDate('');
  };

  if (user?.role === 'member') {
    const balances = memberMetrics?.balances || { share_capital: 0, fixed_deposits: 0, investments: 0, total_assets: 0 };
    const loans = memberMetrics?.loans || { active_count: 0, original_principal: 0, outstanding_balance: 0 };

    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface dark:text-white">
            Welcome back, {memberMetrics?.full_name || user.username}!
          </h1>
          <p className="font-body text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Cooperative Member Ledger Account Summary
          </p>
        </div>

        {/* Account Balances Section */}
        <div className="space-y-4">
          <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white">Account Balances</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KpiCard label="Share Capital" value={formatCurrency(balances.share_capital)} icon={Building} description="Cumulative equity contributions" />
            <KpiCard label="Fixed Deposit" value={formatCurrency(balances.fixed_deposits)} icon={PiggyBank} description="High-yield timed placements" />
            <KpiCard label="MyCooP Investments" value={formatCurrency(balances.investments)} icon={Coins} description="Member-backed investment portfolios" />
            <KpiCard label="Total Net Assets" value={formatCurrency(balances.total_assets)} icon={ShieldCheck} variant="primary" description="Total non-loan asset valuation" />
          </div>
        </div>

        {/* Quick Transactions Section */}
        <div className="space-y-4">
          <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">Quick Transactions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Apply for Loan */}
            <button
              onClick={openLoanModal}
              className="flex items-center justify-between p-6 bg-white dark:bg-surface-container-low border-2 border-primary/80 dark:border-secondary/80 ring-4 ring-primary/20 dark:ring-secondary/15 rounded-3xl hover:bg-primary/5 dark:hover:bg-secondary/5 transition-all text-left group shadow-lg cursor-pointer focus:outline-none focus:ring-secondary/40"
            >
              <div className="space-y-1">
                <h4 className="font-headline font-black text-base text-primary dark:text-secondary transition-colors">
                  Apply for a Loan
                </h4>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                  Submit a new credit application request.
                </p>
                <span className="inline-block pt-1 text-xs font-extrabold text-primary dark:text-secondary group-hover:underline">
                  Proceed &rarr;
                </span>
              </div>
              <div className="p-3.5 bg-primary text-white dark:bg-secondary dark:text-neutral-950 rounded-2xl shadow-md flex-shrink-0 ml-4 group-hover:scale-105 transition-transform">
                <PlusCircle className="w-6 h-6" />
              </div>
            </button>

            {/* Initiate Investment */}
            <button
              onClick={() => {
                setActiveModal('investment');
                setWizardStep(1);
                setSuccessData(null);
                setModalError(null);
              }}
              className="flex items-center justify-between p-6 bg-white dark:bg-surface-container-low border-2 border-primary/80 dark:border-secondary/80 ring-4 ring-primary/20 dark:ring-secondary/15 rounded-3xl hover:bg-primary/5 dark:hover:bg-secondary/5 transition-all text-left group shadow-lg cursor-pointer focus:outline-none focus:ring-secondary/40"
            >
              <div className="space-y-1">
                <h4 className="font-headline font-black text-base text-primary dark:text-secondary transition-colors">
                  Initiate Investment
                </h4>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                  Add capital or start fixed deposit placement.
                </p>
                <span className="inline-block pt-1 text-xs font-extrabold text-primary dark:text-secondary group-hover:underline">
                  Proceed &rarr;
                </span>
              </div>
              <div className="p-3.5 bg-primary text-white dark:bg-secondary dark:text-neutral-950 rounded-2xl shadow-md flex-shrink-0 ml-4 group-hover:scale-105 transition-transform">
                <Coins className="w-6 h-6" />
              </div>
            </button>

            {/* Book Appointment */}
            <button
              onClick={() => {
                setActiveModal('appointment');
                setWizardStep(1);
                setSuccessData(null);
                setModalError(null);
              }}
              className="flex items-center justify-between p-6 bg-white dark:bg-surface-container-low border-2 border-primary/80 dark:border-secondary/80 ring-4 ring-primary/20 dark:ring-secondary/15 rounded-3xl hover:bg-primary/5 dark:hover:bg-secondary/5 transition-all text-left group shadow-lg cursor-pointer focus:outline-none focus:ring-secondary/40"
            >
              <div className="space-y-1">
                <h4 className="font-headline font-black text-base text-primary dark:text-secondary transition-colors">
                  Book Appointment
                </h4>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                  Schedule an office consultation or cash transaction.
                </p>
                <span className="inline-block pt-1 text-xs font-extrabold text-primary dark:text-secondary group-hover:underline">
                  Proceed &rarr;
                </span>
              </div>
              <div className="p-3.5 bg-primary text-white dark:bg-secondary dark:text-neutral-950 rounded-2xl shadow-md flex-shrink-0 ml-4 group-hover:scale-105 transition-transform">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </button>

          </div>
        </div>

        {/* Active Loan Account Section */}
        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-2">
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white">Active Loan Account</h2>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
              Your ongoing active repayment obligations and outstanding balance matrix.
            </p>
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface dark:bg-surface-container-high border border-outline-variant text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />
              {loans.active_count} Active Debt Contracts
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-neutral/5 dark:bg-neutral/10 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Original Principal</span>
            <div className="font-headline text-lg font-extrabold text-on-surface dark:text-white mt-1">
              {formatCurrency(loans.original_principal)}
            </div>
            <span className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-1">Borrowed Loan volume</span>
          </div>

          <div className="p-4 rounded-2xl bg-tertiary/10 border border-tertiary/20 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-tertiary uppercase font-label">Outstanding Balance</span>
            <div className="font-headline text-2xl font-extrabold text-tertiary mt-1">
              {formatCurrency(loans.outstanding_balance)}
            </div>
            <span className="text-[10px] text-tertiary/85 mt-1">Remaining payment principal</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TRANSACTIONS MODAL OVERLAYS (ELDERLY ACCESSIBLE DESIGN) */}
        {/* ======================================================== */}
        {activeModal && (
          <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-5 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low dark:bg-surface-container-high/40">
                <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white capitalize">
                  {activeModal === 'loan' && 'Apply for a Loan'}
                  {activeModal === 'investment' && 'Initiate Investment'}
                  {activeModal === 'appointment' && 'Book Office Appointment'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-full hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-xl font-bold font-mono">&times;</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {modalError && (
                  <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-sm font-semibold flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* ----------------- LOAN WIZARD ----------------- */}
                {activeModal === 'loan' && (
                  <div className="space-y-6">
                    {/* Step Indicators */}
                    <div className="flex items-center justify-center gap-4 text-xs font-bold text-neutral-500">
                      <span className={`${wizardStep === 1 ? 'text-primary dark:text-secondary' : 'text-neutral-400'}`}>1. Choose Product</span>
                      <span className="text-neutral-300">&bull;&bull;&bull;</span>
                      <span className={`${wizardStep === 2 ? 'text-primary dark:text-secondary' : 'text-neutral-400'}`}>2. Amount & Term</span>
                      <span className="text-neutral-300">&bull;&bull;&bull;</span>
                      <span className={`${wizardStep === 3 ? 'text-primary dark:text-secondary' : 'text-neutral-400'}`}>3. Confirmation</span>
                    </div>

                    {/* Step 1: Choose Product */}
                    {wizardStep === 1 && (
                      <div className="space-y-4">
                        <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400">Select the type of loan you need:</span>
                        {products.length === 0 ? (
                          <div className="text-center py-6 text-sm text-neutral-500">No active loan products available.</div>
                        ) : (
                          <div className="space-y-3">
                            {products.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setLoanAmount(parseFloat(p.min_amount));
                                }}
                                className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedProduct?.id === p.id
                                  ? 'border-primary/60 bg-primary/5 dark:border-secondary/60 dark:bg-secondary/5 ring-2 ring-primary/20 dark:ring-secondary/20'
                                  : 'border-outline-variant/65 bg-transparent hover:border-neutral/30'
                                  }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-on-surface dark:text-white text-base">{p.name}</span>
                                  <span className="text-xs font-bold bg-neutral/10 dark:bg-neutral/20 text-neutral-600 dark:text-neutral-300 px-2.5 py-1 rounded-full uppercase">
                                    {p.amortization_type.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 flex justify-between">
                                  <span>Interest: <strong className="text-on-surface dark:text-white font-semibold">{(parseFloat(p.interest_rate) * 100).toFixed(1)}%</strong></span>
                                  <span>Term: <strong className="text-on-surface dark:text-white font-semibold">{p.term_months} months</strong></span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          disabled={!selectedProduct}
                          onClick={() => setWizardStep(2)}
                          className="w-full mt-4 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-center text-base"
                        >
                          Continue to Amount
                        </button>
                      </div>
                    )}

                    {/* Step 2: Amount & Term Slider */}
                    {wizardStep === 2 && selectedProduct && (
                      <div className="space-y-6">
                        <div className="bg-neutral/5 dark:bg-neutral/10 p-4 rounded-2xl text-center space-y-1">
                          <span className="text-xs text-neutral-600 dark:text-neutral-400 uppercase font-bold tracking-wider">Requested Amortization Principal</span>
                          <div className="font-headline text-3xl font-extrabold text-primary dark:text-secondary">
                            {formatCurrency(loanAmount)}
                          </div>
                        </div>

                        {/* Large Accessible Slider */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400 flex justify-between">
                            <span>Adjust Amount:</span>
                            <span>Min: {formatCurrency(parseFloat(selectedProduct.min_amount))}</span>
                          </label>
                          <input
                            type="range"
                            min={selectedProduct.min_amount}
                            max={selectedProduct.max_amount}
                            step="1000"
                            value={loanAmount}
                            onChange={(e) => setLoanAmount(parseFloat(e.target.value))}
                            className="w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary dark:accent-secondary"
                          />
                          <div className="text-right text-xs font-bold text-neutral-600 dark:text-neutral-400">
                            Max: {formatCurrency(parseFloat(selectedProduct.max_amount))}
                          </div>
                        </div>

                        {/* Estimated Repayment Math block */}
                        <div className="border border-outline-variant/65 rounded-2xl p-4 space-y-2 text-sm bg-surface-container-low">
                          <h5 className="font-bold text-on-surface dark:text-white border-b border-outline-variant/30 pb-1.5 mb-2">Estimated Monthly Repayments</h5>
                          <div className="flex justify-between">
                            <span className="text-neutral-600 dark:text-neutral-400">Loan Product</span>
                            <span className="font-semibold">{selectedProduct.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600 dark:text-neutral-400">Amortization Method</span>
                            <span className="font-semibold uppercase">{selectedProduct.amortization_type.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600 dark:text-neutral-400">Duration Term</span>
                            <span className="font-semibold">{selectedProduct.term_months} Months</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-outline-variant/20 font-bold text-base text-primary dark:text-secondary">
                            <span>Est. Monthly Due</span>
                            <span>
                              {formatCurrency(
                                selectedProduct.amortization_type === 'flat_rate'
                                  ? (loanAmount + (loanAmount * parseFloat(selectedProduct.interest_rate) * (selectedProduct.term_months / 12))) / selectedProduct.term_months
                                  : (loanAmount * (parseFloat(selectedProduct.interest_rate) / 12) * Math.pow(1 + (parseFloat(selectedProduct.interest_rate) / 12), selectedProduct.term_months)) / (Math.pow(1 + (parseFloat(selectedProduct.interest_rate) / 12), selectedProduct.term_months) - 1)
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <button
                            onClick={() => setWizardStep(1)}
                            className="flex-1 py-3 bg-neutral/10 hover:bg-neutral/15 dark:bg-neutral/20 dark:hover:bg-neutral/25 text-on-surface dark:text-white rounded-2xl font-bold transition-colors cursor-pointer text-center"
                          >
                            Back
                          </button>
                          <button
                            disabled={submitting}
                            onClick={handleApplyLoan}
                            className="flex-1 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-center"
                          >
                            {submitting ? 'Submitting...' : 'Apply Now'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Success Screen */}
                    {wizardStep === 3 && successData && (
                      <div className="text-center space-y-4 py-4">
                        <div className="w-16 h-16 bg-primary/20 dark:bg-secondary/20 text-primary dark:text-secondary rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">
                          ✓
                        </div>
                        <h4 className="font-headline font-bold text-xl text-on-surface dark:text-white">Loan Application Submitted!</h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
                          Your application has been received with status <strong className="text-primary font-bold">Pending Review</strong>. Please visit the cooperative office to complete physical requirements.
                        </p>
                        <div className="pt-4">
                          <button
                            onClick={closeModal}
                            className="px-8 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Go Back to Dashboard
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ----------------- INVESTMENT WIZARD ----------------- */}
                {activeModal === 'investment' && (
                  <div className="space-y-6">
                    {/* Step 1 & 2: Forms */}
                    {wizardStep === 1 && (
                      <div className="space-y-6">
                        {/* Type Picker */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">Select Asset Portfolio Type:</label>
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => setInvestmentType('capital')}
                              className={`p-4 rounded-2xl border text-center transition-all ${investmentType === 'capital'
                                ? 'border-primary bg-primary/5 dark:border-secondary dark:bg-secondary/5 ring-2 ring-primary/25 dark:ring-secondary/25'
                                : 'border-outline-variant/65'
                                }`}
                            >
                              <Building className="w-6 h-6 mx-auto mb-2 text-neutral-600 dark:text-neutral-300" />
                              <span className="font-bold text-sm block">Share Capital</span>
                              <span className="text-[10px] text-neutral-500 block mt-0.5">Coop equity shares</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setInvestmentType('fixed_deposit')}
                              className={`p-4 rounded-2xl border text-center transition-all ${investmentType === 'fixed_deposit'
                                ? 'border-primary bg-primary/5 dark:border-secondary dark:bg-secondary/5 ring-2 ring-primary/25 dark:ring-secondary/25'
                                : 'border-outline-variant/65'
                                }`}
                            >
                              <PiggyBank className="w-6 h-6 mx-auto mb-2 text-neutral-600 dark:text-neutral-300" />
                              <span className="font-bold text-sm block">Fixed Deposit</span>
                              <span className="text-[10px] text-neutral-500 block mt-0.5">High-yield placements</span>
                            </button>
                          </div>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">Enter Placement Amount (₱):</label>
                          <input
                            type="number"
                            placeholder="e.g. 5000"
                            value={investmentAmount}
                            onChange={(e) => setInvestmentAmount(e.target.value)}
                            className="w-full px-4 py-3 border border-outline-variant/65 rounded-2xl bg-transparent font-bold text-lg focus:outline-none focus:border-primary"
                          />
                        </div>

                        {/* Fixed Deposit extra fields */}
                        {investmentType === 'fixed_deposit' && (
                          <div className="space-y-4 p-4 border border-outline-variant/50 rounded-2xl bg-neutral/5">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Interest Rate Yield</label>
                              <div className="font-bold text-sm">5.0% Per Annum</div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Duration Term:</label>
                              <select
                                value={fdDuration}
                                onChange={(e) => setFdDuration(e.target.value)}
                                className="w-full px-3 py-2 border border-outline-variant/65 rounded-xl bg-transparent focus:outline-none"
                              >
                                <option value="6">6 Months Placement</option>
                                <option value="12">12 Months (1 Year)</option>
                                <option value="24">24 Months (2 Years)</option>
                              </select>
                            </div>
                          </div>
                        )}

                        <button
                          disabled={submitting || !investmentAmount}
                          onClick={handleInitiateInvestment}
                          className="w-full mt-4 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-center text-base"
                        >
                          {submitting ? 'Processing...' : 'Submit Placement'}
                        </button>
                      </div>
                    )}

                    {/* Step 3: Success Screen with payment reference instruction */}
                    {wizardStep === 3 && successData && (
                      <div className="space-y-5 text-center py-2">
                        <div className="w-16 h-16 bg-primary/20 dark:bg-secondary/20 text-primary dark:text-secondary rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">
                          ✓
                        </div>
                        <h4 className="font-headline font-bold text-xl text-on-surface dark:text-white">Transaction Requested!</h4>

                        {/* Reference Ticket info */}
                        <div className="p-5 border border-dashed border-outline-variant rounded-2xl bg-neutral/5 text-left space-y-2.5 max-w-sm mx-auto">
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-500 font-bold uppercase">Transaction Type:</span>
                            <span className="font-bold uppercase text-primary">{successData.type === 'capital' ? 'Share Capital' : 'Fixed Deposit'}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-500 font-bold uppercase">Payment Code:</span>
                            <span className="font-mono font-bold text-sm tracking-wider">{successData.reference_code}</span>
                          </div>
                          <div className="flex justify-between text-xs pt-1 border-t border-outline-variant/30">
                            <span className="text-neutral-500 font-bold uppercase">Amount Due:</span>
                            <span className="font-extrabold text-base text-on-surface dark:text-white">{formatCurrency(successData.amount)}</span>
                          </div>
                        </div>

                        <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1 max-w-md mx-auto pt-2">
                          <p className="font-semibold text-on-surface dark:text-white">How to settle your deposit:</p>
                          <p>1. Present this payment code over-the-counter to the cooperative cashier.</p>
                          <p>2. Keep your transaction receipt until the cashier updates your ledger balance.</p>
                        </div>

                        <div className="pt-4">
                          <button
                            onClick={closeModal}
                            className="px-8 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Finish
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ----------------- APPOINTMENT WIZARD ----------------- */}
                {activeModal === 'appointment' && (
                  <div className="space-y-6">
                    {wizardStep === 1 && (
                      <div className="space-y-5">
                        {/* Purpose Selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">Purpose of Consultation:</label>
                          <select
                            value={appointmentPurpose}
                            onChange={(e) => setAppointmentPurpose(e.target.value)}
                            className="w-full px-4 py-3 border border-outline-variant/65 rounded-2xl bg-transparent focus:outline-none focus:border-primary text-base font-medium"
                          >
                            <option value="Loan Application Consultation">Discuss a Loan Application</option>
                            <option value="Fixed Deposit Account Placement">Open a new Fixed Deposit</option>
                            <option value="Capital Placement Deposit">Share Capital Deposit</option>
                            <option value="General Inquiry">General Cooperative Inquiry</option>
                          </select>
                        </div>

                        {/* Date Selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">Select Date:</label>
                          <input
                            type="date"
                            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Min is tomorrow
                            value={appointmentDate}
                            onChange={(e) => setAppointmentDate(e.target.value)}
                            className="w-full px-4 py-3 border border-outline-variant/65 rounded-2xl bg-transparent focus:outline-none focus:border-primary text-base font-medium"
                          />
                        </div>

                        {/* Time Slot Toggle */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400 font-label">Select Preferred Schedule Time:</label>
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              type="button"
                              onClick={() => setAppointmentSlot('morning')}
                              className={`py-3 rounded-2xl border font-bold text-sm text-center transition-all ${appointmentSlot === 'morning'
                                ? 'border-primary bg-primary/5 dark:border-secondary dark:bg-secondary/5 ring-2 ring-primary/25 dark:ring-secondary/25'
                                : 'border-outline-variant/65'
                                }`}
                            >
                              Morning (8:00 AM - 12:00 PM)
                            </button>

                            <button
                              type="button"
                              onClick={() => setAppointmentSlot('afternoon')}
                              className={`py-3 rounded-2xl border font-bold text-sm text-center transition-all ${appointmentSlot === 'afternoon'
                                ? 'border-primary bg-primary/5 dark:border-secondary dark:bg-secondary/5 ring-2 ring-primary/25 dark:ring-secondary/25'
                                : 'border-outline-variant/65'
                                }`}
                            >
                              Afternoon (1:00 PM - 5:00 PM)
                            </button>
                          </div>
                        </div>

                        <button
                          disabled={submitting || !appointmentDate}
                          onClick={handleBookAppointment}
                          className="w-full mt-4 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-center text-base"
                        >
                          {submitting ? 'Booking...' : 'Confirm Appointment Booking'}
                        </button>
                      </div>
                    )}

                    {/* Step 3: Success Screen */}
                    {wizardStep === 3 && successData && (
                      <div className="text-center space-y-4 py-4">
                        <div className="w-16 h-16 bg-primary/20 dark:bg-secondary/20 text-primary dark:text-secondary rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">
                          ✓
                        </div>
                        <h4 className="font-headline font-bold text-xl text-on-surface dark:text-white">Appointment Scheduled!</h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
                          Your appointment for <strong className="text-on-surface dark:text-white font-semibold">{successData.purpose}</strong> has been successfully booked on <strong className="text-on-surface dark:text-white font-semibold">{successData.appointment_date}</strong> ({successData.time_slot}).
                        </p>
                        <div className="pt-4">
                          <button
                            onClick={closeModal}
                            className="px-8 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Finish
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- ADMIN / MANAGER VIEW ---
  const ds = dashboardSummary || {};
  const recoveryRate = ds.total_capital_ever_deployed > 0
    ? ((ds.total_repayments_collected / ds.total_capital_ever_deployed) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface dark:text-white">
            System Overview
          </h1>
          <p className="font-body text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Cooperative Credit Monitoring & Portfolio Analytics
          </p>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface dark:bg-surface-container-high border border-outline-variant/50 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral/10 transition-colors active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Administrative Actions Quick-Desk */}
      <div className="p-6 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm space-y-4">
        <h2 className="font-headline text-base font-bold text-on-surface dark:text-white flex items-center gap-2">
          <span className="text-lg"></span> Administrative Actions Quick-Desk
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/dashboard/members')}
            className="flex flex-col items-center gap-2 p-4 border border-outline-variant/50 hover:border-primary/50 dark:hover:border-secondary/50 rounded-2xl text-center hover:bg-neutral/5 transition-all group active:scale-95"
          >
            <UserIcon className="w-6 h-6 text-primary dark:text-secondary group-hover:scale-115 transition-transform" />
            <span className="font-body text-xs font-bold text-on-surface dark:text-white">Register Member</span>
          </button>

          <button
            onClick={() => router.push('/dashboard/loans')}
            className="flex flex-col items-center gap-2 p-4 border border-outline-variant/50 hover:border-primary/50 dark:hover:border-secondary/50 rounded-2xl text-center hover:bg-neutral/5 transition-all group active:scale-95"
          >
            <PlusCircle className="w-6 h-6 text-primary dark:text-secondary group-hover:scale-115 transition-transform" />
            <span className="font-body text-xs font-bold text-on-surface dark:text-white">Configure Product</span>
          </button>

          <button
            onClick={() => router.push('/dashboard/billing')}
            className="flex flex-col items-center gap-2 p-4 border border-outline-variant/50 hover:border-primary/50 dark:hover:border-secondary/50 rounded-2xl text-center hover:bg-neutral/5 transition-all group active:scale-95"
          >
            <CalendarCheck className="w-6 h-6 text-primary dark:text-secondary group-hover:scale-115 transition-transform" />
            <span className="font-body text-xs font-bold text-on-surface dark:text-white">Billing Collection Queue</span>
          </button>

          <button
            onClick={() => router.push('/dashboard/reports')}
            className="flex flex-col items-center gap-2 p-4 border border-outline-variant/50 hover:border-primary/50 dark:hover:border-secondary/50 rounded-2xl text-center hover:bg-neutral/5 transition-all group active:scale-95"
          >
            <FileCheck className="w-6 h-6 text-primary dark:text-secondary group-hover:scale-115 transition-transform" />
            <span className="font-body text-xs font-bold text-on-surface dark:text-white">Export Reports</span>
          </button>
        </div>
      </div>

      {/* Financial Health */}
      <div className="space-y-4">
        <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white">Financial Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KpiCard
            label="Total Capital Deployed"
            value={formatCurrency(ds.total_capital_ever_deployed)}
            icon={TrendingUp}
            description="Cumulative disbursed principal volume"
          />
          <KpiCard
            label="Outstanding Balance"
            value={formatCurrency(ds.total_outstanding_balance)}
            icon={TrendingDown}
            variant="danger"
            description="Remaining active credit exposure"
          />
          <KpiCard
            label="Interest Earned"
            value={formatCurrency(ds.total_interest_earned)}
            icon={Percent}
            variant="warning"
            description="Cumulative interest collected"
          />
          <KpiCard
            label="Recovery Rate"
            value={`${recoveryRate.toFixed(1)}%`}
            icon={ShieldCheck}
            variant="primary"
            description={`Recovered ${formatCurrency(ds.total_repayments_collected)}`}
          />
        </div>
      </div>

      {/* Operational Status */}
      <div className="space-y-4">
        <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white">Operational Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary dark:text-secondary" />
              <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Total Members</span>
            </div>
            <div className="font-headline text-xl font-extrabold text-on-surface dark:text-white">{ds.total_member_profiles || 0}</div>
            <div className="flex items-center gap-2 mt-1.5 text-[10px]">
              <span className="flex items-center gap-0.5 text-green-600"><UserCheck className="w-3 h-3" />{ds.active_members || 0} active</span>
              <span className="flex items-center gap-0.5 text-neutral-500"><UserX className="w-3 h-3" />{ds.inactive_members || 0} inactive</span>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="w-4 h-4 text-primary dark:text-secondary" />
              <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Active Loans</span>
            </div>
            <div className="font-headline text-xl font-extrabold text-on-surface dark:text-white">{ds.disbursed_loans || 0}</div>
          </div>

          <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Pending Approval</span>
            </div>
            <div className={`font-headline text-xl font-extrabold ${(ds.pending_loans || 0) > 0 ? 'text-amber-500' : 'text-on-surface dark:text-white'}`}>
              {ds.pending_loans || 0}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Fully Paid</span>
            </div>
            <div className="font-headline text-xl font-extrabold text-green-600 dark:text-green-400">{ds.fully_paid_loans || 0}</div>
          </div>

          <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Defaulted</span>
            </div>
            <div className={`font-headline text-xl font-extrabold ${(ds.defaulted_loans || 0) > 0 ? 'text-red-500' : 'text-on-surface dark:text-white'}`}>
              {ds.defaulted_loans || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Assets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          label="Total Share Capital"
          value={formatCurrency(ds.total_share_capital)}
          icon={Building}
          description="Combined member equity contributions"
        />
        <KpiCard
          label="Active Fixed Deposits"
          value={formatCurrency(ds.total_active_fixed_deposits)}
          icon={PiggyBank}
          description="Timed deposit placements"
        />
        <KpiCard
          label="Active Investments"
          value={formatCurrency(ds.total_active_investments)}
          icon={Coins}
          description="Member-backed investment portfolios"
        />
      </div>

      {/* Analytics Performance */}
      <div className="space-y-6">
        <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white">Analytics Performance</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer
            title="Monthly Loan Activity"
            subtitle="Applications, disbursements & completions over the last 12 months"
          >
            <MonthlyTrendsChart data={loanTrends} />
          </ChartContainer>

          <ChartContainer title="Loan Status Distribution" subtitle="Current loan portfolio by status">
            <LoanStatusChart data={loanDistribution} />
          </ChartContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartContainer title="Monthly Repayments" subtitle="Payment collection amounts over the last 12 months">
            <RepaymentChart data={repaymentTrends} />
          </ChartContainer>

          <ChartContainer title="Member Growth" subtitle="New registrations and cumulative membership over time">
            <MemberGrowthChart data={memberGrowth} />
          </ChartContainer>
        </div>
      </div>

      {/* Financial Flow Analysis */}
      <div className="space-y-4">
        <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white">Financial Flow Analysis</h2>
        <ChartContainer title="Capital Flow" subtitle="Share capital contributions vs loan disbursements over time">
          <FinancialSummaryChart data={financialSummary} />
        </ChartContainer>
      </div>
    </div>
  );
}
