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
  WalletCards,
  Lock,
  Info,
  Target,
  Award,
  Sparkles,
  PhoneCall,
  Mail,
  CalendarDays,
  ChevronDown,
  Check,
  X,
  ArrowRight,
  Pencil,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const LOAN_CATEGORIES = {
  REGULAR: 'Regular Loan',
  STL: 'Short Term Loan or STL',
};

const getProductCategory = (productName: string) => {
  const name = productName.toLowerCase();
  if (name.includes('regular loan')) return LOAN_CATEGORIES.REGULAR;
  if (name.includes('short term loan') || name.includes('stl')) return LOAN_CATEGORIES.STL;
  return 'Other Loans';
};

const LOAN_DESCRIPTIONS: Record<string, { desc: string; helper?: string }> = {
  'Regular Loan - Salary Deduction': {
    desc: 'Regular salary-based credit line with automatic payroll deduction.',
    helper: '₱10,000 to ₱75,000. Maximum term: 1 year (12 months).'
  },
  'Regular Loan - Project Loan': {
    desc: 'Project or entrepreneurial funding for business expansions or asset acquisitions.',
    helper: '₱76,000 to ₱300,000. Maximum term: 2 years (24 months).'
  },
  'Short Term Loan (STL) - Utility Loan': {
    desc: 'Quick cash relief for paying electricity, water, internet, or other home utilities.',
    helper: 'Fixed amount: ₱3,000. Term: 1 month.'
  },
  'Short Term Loan (STL) - Emergency Loan': {
    desc: 'Emergency funding for medical needs or unplanned urgent expenses.',
    helper: 'Fixed amount: ₱5,000. Term: 2 months.'
  },
  'Short Term Loan (STL) - Cash Express': {
    desc: 'Quick cash release to bridge short-term financing gaps.',
    helper: 'Fixed amount: ₱7,000. Term: 2 months.'
  },
  'Short Term Loan (STL) - Special Occasion': {
    desc: 'Financial support for seasonal expenses, holidays, and school registration periods.',
    helper: 'Fixed amount: ₱10,000. Term: 3 months.'
  }
};

interface DropdownOption {
  value: string;
  label: string;
}

function AnimatedSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option'
}: {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-2xl border border-outline-variant/65 bg-white dark:bg-surface-container-high text-on-surface dark:text-white font-bold text-sm flex items-center justify-between shadow-xs hover:border-primary/60 dark:hover:border-secondary/60 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-250 ${isOpen ? 'rotate-180 text-primary dark:text-secondary' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop blur/overlay to dismiss on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Animated Options Menu */}
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 p-1.5 bg-white dark:bg-surface-container-high border border-outline-variant/60 rounded-2xl shadow-xl space-y-1 animate-dropdown-pop max-h-56 overflow-y-auto">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer ${isSelected
                    ? 'bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary font-extrabold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary dark:text-secondary" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function OverviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tomorrowStr, setTomorrowStr] = useState('');
  useEffect(() => {
    setTomorrowStr(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  }, []);

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
  const [activeModal, setActiveModal] = useState<'loan' | 'investment' | 'appointment' | 'welcome' | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Loan Form States
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedLoanCategory, setSelectedLoanCategory] = useState<string>('');
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [coMakerName, setCoMakerName] = useState<string>('');
  const [coMakerPhone, setCoMakerPhone] = useState<string>('');

  // Investment Form States
  const [investmentType, setInvestmentType] = useState<'share_capital' | 'fixed_deposit' | 'payday'>('share_capital');
  const [paydayCycle, setPaydayCycle] = useState<'15' | '30'>('15');
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [fdDuration, setFdDuration] = useState<string>('12'); // months
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'bank_transfer' | 'payroll' | 'otc'>('otc');
  const [paymentRefNo, setPaymentRefNo] = useState<string>('');

  // Milestone goal editing states
  const [newGoalAmount, setNewGoalAmount] = useState<string>('');

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
          const metricsData = response.data.data;
          setMemberMetrics(metricsData);
          if (metricsData && Number(metricsData.investment_goal) === 0) {
            setActiveModal('welcome');
            setWizardStep(1);
          }
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
      setCoMakerName('');
      setCoMakerPhone('');
      const res = await api.get('/loans/products');
      const activeProducts = res.data.data.filter((p: any) => p.is_active);
      setProducts(activeProducts);
      if (activeProducts.length > 0) {
        setSelectedProduct(activeProducts[0]);
        setLoanAmount(parseFloat(activeProducts[0].min_amount));
        setSelectedLoanCategory(getProductCategory(activeProducts[0].name));
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
        principal_amount: loanAmount,
        co_maker_name: coMakerName || undefined,
        co_maker_phone: coMakerPhone || undefined
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

    if ((paymentMethod === 'gcash' || paymentMethod === 'bank_transfer') && !paymentRefNo.trim()) {
      setModalError('Please enter the transaction reference number.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);
      
      const methodLabel = paymentMethod === 'gcash' ? 'GCash' : paymentMethod === 'bank_transfer' ? 'Bank Transfer' : paymentMethod === 'payroll' ? 'Salary Deduction' : 'Hand-in';
      const remarksString = `Capital build-up deposit via ${methodLabel}${paymentRefNo ? ' (Ref: ' + paymentRefNo + ')' : ''}`;
      
      const res = await api.post('/accounts/share-capital', {
        transaction_type: 'credit',
        amount: amount,
        remarks: remarksString
      });

      setSuccessData({
        ...(res?.data?.data || {}),
        type: 'share_capital',
        amount: amount,
        reference_code: `TXN-${Math.floor(100000 + Math.random() * 900000)}`
      });
      setWizardStep(2);
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
    setPaymentRefNo('');
    setPaymentMethod('otc');
    setInvestmentType('share_capital');
    setCoMakerName('');
    setCoMakerPhone('');
  };

  if (user?.role === 'member') {
    const balances = memberMetrics?.balances || { share_capital: 0, fixed_deposits: 0, investments: 0, total_assets: 0 };
    const loans = memberMetrics?.loans || { active_count: 0, original_principal: 0, outstanding_balance: 0 };

    return (
      <div className="space-y-8">
        {/* Header Greeting */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 dark:bg-secondary/15 border border-primary/20 dark:border-secondary/20 text-xs font-bold text-primary dark:text-secondary mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Member Session</span>
          </div>
          <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface dark:text-white tracking-tight">
            Welcome back, {user?.profile?.first_name || memberMetrics?.first_name || (memberMetrics?.full_name || user?.username || '').trim().split(' ')[0]}!
          </h1>
          <p className="font-body text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Cooperative Member Ledger Account Summary
          </p>
        </div>

        {/* Account Balances Section */}
        <div className="space-y-4">
          <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white">Account Balances</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard
              label="Share Capital"
              value={formatCurrency(balances.share_capital)}
              icon={Building}
              href="/dashboard/accounting"
              description="Cumulative equity contributions"
            />
            <KpiCard
              label="Loan Balance"
              value={formatCurrency(loans.outstanding_balance)}
              icon={Banknote}
              variant="primary"
              href="/dashboard/loans"
              description="Total active credit balance due"
            />
            <KpiCard
              label="Active Credit Lines"
              value={`${loans.active_count} ${loans.active_count === 1 ? 'Active Loan' : 'Active Loans'}`}
              icon={FileCheck}
              href="/dashboard/loans"
              description="Disbursed accounts in good standing"
            />
          </div>
        </div>

        {/* Quick Transactions Section */}
        <div className="space-y-4">
          <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">Quick Transactions</h3>
          <div className={`grid grid-cols-1 ${balances.total_assets === 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>

            {/* Apply for Loan */}
            <button
              onClick={openLoanModal}
              className="flex items-center justify-between p-6 bg-white dark:bg-surface-container-low border-2 border-primary/80 dark:border-secondary/80 ring-4 ring-primary/20 dark:ring-secondary/15 rounded-3xl hover:bg-primary/5 dark:hover:bg-secondary/5 hover:scale-[1.01] active:scale-95 transition-all text-left group shadow-lg cursor-pointer focus:outline-none focus:ring-secondary/40"
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
            {balances.total_assets === 0 && (
              <button
                onClick={() => {
                  setActiveModal('investment');
                  setWizardStep(1);
                  setSuccessData(null);
                  setModalError(null);
                }}
                className="flex items-center justify-between p-6 bg-white dark:bg-surface-container-low border-2 border-primary/80 dark:border-secondary/80 ring-4 ring-primary/20 dark:ring-secondary/15 rounded-3xl hover:bg-primary/5 dark:hover:bg-secondary/5 hover:scale-[1.01] active:scale-95 transition-all text-left group shadow-lg cursor-pointer focus:outline-none focus:ring-secondary/40"
              >
                <div className="space-y-1">
                  <h4 className="font-headline font-black text-base text-primary dark:text-secondary transition-colors">
                    Initiate Investment
                  </h4>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                    Add capital placement to your share equity.
                  </p>
                  <span className="inline-block pt-1 text-xs font-extrabold text-primary dark:text-secondary group-hover:underline">
                    Proceed &rarr;
                  </span>
                </div>
                <div className="p-3.5 bg-primary text-white dark:bg-secondary dark:text-neutral-950 rounded-2xl shadow-md flex-shrink-0 ml-4 group-hover:scale-105 transition-transform">
                  <Coins className="w-6 h-6" />
                </div>
              </button>
            )}

            {/* Book Appointment */}
            <button
              onClick={() => {
                setActiveModal('appointment');
                setWizardStep(1);
                setSuccessData(null);
                setModalError(null);
              }}
              className="flex items-center justify-between p-6 bg-white dark:bg-surface-container-low border-2 border-primary/80 dark:border-secondary/80 ring-4 ring-primary/20 dark:ring-secondary/15 rounded-3xl hover:bg-primary/5 dark:hover:bg-secondary/5 hover:scale-[1.01] active:scale-95 transition-all text-left group shadow-lg cursor-pointer focus:outline-none focus:ring-secondary/40"
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

        {/* Member Equity & Investment Goal Milestone Card */}
        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 dark:bg-secondary/15 border border-primary/20 dark:border-secondary/20 text-xs font-bold text-primary dark:text-secondary">
                <Award className="w-3.5 h-3.5" />
                <span>Co-op Equity & Investment Milestone</span>
              </div>
              <h3 className="font-headline text-xl font-bold text-on-surface dark:text-white pt-1">
                Member Investment Goal & Dividend Tracker
              </h3>
              <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
                Track your target capital placements. Reaching your goal notifies the Coop Office for call/email payout options.
              </p>
            </div>

            <button
              onClick={() => {
                setActiveModal('investment');
                setWizardStep(1);
                setSuccessData(null);
                setModalError(null);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-xs hover:opacity-95 transition-all shadow-md active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <Coins className="w-4 h-4" />
              <span>Add Capital Placement +</span>
            </button>
          </div>

          {/* Progress Bar & Target Math */}
          {(() => {
            const currentEquity = balances.share_capital || 0;
            const milestoneTarget = memberMetrics?.investment_goal ?? 0;
            const progressPercent = milestoneTarget > 0 ? Math.min(100, Math.round((currentEquity / milestoneTarget) * 100)) : 0;
            const estAnnualDividend = currentEquity * 0.065;
            const isGoalReached = milestoneTarget > 0 && progressPercent >= 100;

            return (
              <div className="space-y-5">
                {/* Progress labels */}
                <div className="flex justify-between items-end text-xs font-bold">
                  <div className="space-y-0.5">
                    <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Accumulated Equity Capital</span>
                    <div className="font-headline text-lg font-extrabold text-primary dark:text-secondary">
                      {formatCurrency(currentEquity)}
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Target Milestone Goal</span>
                    <div className="flex items-center justify-end gap-1.5 min-h-[28px]">
                      <div className="font-headline text-base font-bold text-on-surface dark:text-white">
                        {formatCurrency(milestoneTarget)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="relative w-full h-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-outline-variant/30">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000 ease-out shadow-xs"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Call/Email Notification Banner when goal is reached or in progress */}
                {isGoalReached ? (
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl flex items-start gap-3 text-xs text-primary dark:text-secondary font-semibold">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary dark:text-secondary" />
                    <div>
                      <strong className="block text-sm font-bold">🎉 Milestone Goal Reached!</strong>
                      Our Cooperative Officers have been notified. A staff member will reach out via <span className="underline font-extrabold font-mono">Phone Call</span> or <span className="underline font-extrabold font-mono">Email</span> regarding your total investment payout or rollover options.
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-neutral-50 dark:bg-surface-container-high/40 border border-outline-variant/50 rounded-2xl flex items-center justify-between flex-wrap gap-3 text-xs text-neutral-600 dark:text-neutral-300">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-primary dark:text-secondary flex-shrink-0" />
                      <Mail className="w-4 h-4 text-primary dark:text-secondary flex-shrink-0" />
                      <span><strong>Officer Contact Protocol:</strong> Once your investment hits 100%, a staff will call or email you.</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-primary dark:text-secondary bg-primary/10 dark:bg-secondary/15 px-2.5 py-1 rounded-full">
                      {100 - progressPercent}% remaining to goal
                    </span>
                  </div>
                )}

                {/* Dynamic Milestone & Annual General Assembly Dividend Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-500 block">Milestone Status</span>
                      <span className="text-xs font-extrabold text-on-surface dark:text-white">{progressPercent}% Completed</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-500 block">Est. Annual Dividend</span>
                      <span className="text-xs font-extrabold text-primary dark:text-secondary">{formatCurrency(estAnnualDividend)} / yr</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-500 block">Dividend Payout</span>
                      <span className="text-xs font-extrabold text-on-surface dark:text-white">Annual General Assembly</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ======================================================== */}
        {/* TRANSACTIONS MODAL OVERLAYS (ELDERLY ACCESSIBLE DESIGN) */}
        {/* ======================================================== */}
        {activeModal && (
          <div key={activeModal} className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-modal-backdrop">
            <div key={`${activeModal}-${wizardStep}`} className={`bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-modal-pop ${
              activeModal === 'loan'
                ? (wizardStep === 3 ? 'max-w-md' : (wizardStep === 1 ? 'max-w-3xl' : 'max-w-5xl'))
                : 'max-w-xl'
            }`}>
              {/* Header */}
              <div className="px-6 py-5 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low dark:bg-surface-container-high/40">
                <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white capitalize">
                  {activeModal === 'loan' && 'Apply for a Loan'}
                  {activeModal === 'investment' && 'Initiate Investment'}
                  {activeModal === 'appointment' && 'Book Office Appointment'}
                  {activeModal === 'welcome' && (wizardStep === 1 ? 'Welcome to UC COOP!' : 'Set Your Investment Goal')}
                </h3>
                {activeModal !== 'welcome' && (
                  <button
                    onClick={closeModal}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
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
                    {/* Step 1: Choose Product */}
                    {wizardStep === 1 && (() => {
                      const activeRegularCount = memberMetrics?.loans?.active_regular_count || 0;
                      const activeStlCount = memberMetrics?.loans?.active_stl_count || 0;
                      const isRegularLocked = selectedLoanCategory === LOAN_CATEGORIES.REGULAR && activeRegularCount >= 1;
                      const isStlLocked = selectedLoanCategory === LOAN_CATEGORIES.STL && activeStlCount >= 3;
                      const filteredProducts = products.filter(p => getProductCategory(p.name) === selectedLoanCategory);

                      return (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Select Loan Category:</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              {Object.entries(LOAN_CATEGORIES).map(([key, label]) => {
                                const isActive = selectedLoanCategory === label;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                      setSelectedLoanCategory(label);
                                      const filtered = products.filter(p => getProductCategory(p.name) === label);
                                      if (filtered.length > 0) {
                                        setSelectedProduct(filtered[0]);
                                        setLoanAmount(parseFloat(filtered[0].min_amount));
                                      } else {
                                        setSelectedProduct(null);
                                      }
                                    }}
                                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer text-xs font-bold ${
                                      isActive
                                        ? 'bg-primary/10 border-primary text-primary dark:bg-secondary/15 dark:border-secondary dark:text-secondary'
                                        : 'border-outline-variant/65 text-neutral-600 dark:text-neutral-400 hover:border-neutral/30'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <div className="text-[11px] font-bold text-neutral-500/90 flex items-center gap-2 mt-2.5 bg-neutral/5 dark:bg-neutral/10 p-2 px-3.5 rounded-2xl border border-outline-variant/30">
                              <Info className="w-4 h-4 text-primary dark:text-secondary flex-shrink-0" />
                              {selectedLoanCategory === LOAN_CATEGORIES.REGULAR ? (
                                <span>Coop Policy Limit: <strong className="text-primary dark:text-secondary font-extrabold">1 active Regular Loan</strong> at a time. <span className="text-neutral-500 dark:text-neutral-400 font-medium">(Current: {activeRegularCount} / 1)</span></span>
                              ) : (
                                <span>Coop Policy Limit: Up to <strong className="text-primary dark:text-secondary font-extrabold">3 active Short Term Loans (STLs)</strong> concurrently. <span className="text-neutral-500 dark:text-neutral-400 font-medium">(Current: {activeStlCount} / 3)</span></span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase font-label">Available Loan Products:</span>
                            {isRegularLocked && (
                              <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2.5 font-semibold">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <span>You cannot apply for a new Regular Loan because you already have an active Regular Loan.</span>
                              </div>
                            )}
                            {isStlLocked && (
                              <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2.5 font-semibold">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <span>You cannot apply for a new Short Term Loan (STL) because you have reached the maximum limit of 3 active Short Term Loans.</span>
                              </div>
                            )}

                            {filteredProducts.length === 0 ? (
                              <div className="text-center py-8 text-xs text-neutral-500 italic bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl border border-dashed border-outline-variant/60">
                                No active loan products in this category.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pr-1 pt-1">
                                {filteredProducts.map((p) => {
                                  const details = LOAN_DESCRIPTIONS[p.name] || { desc: 'Standard cooperative credit option.' };
                                  const isSelected = selectedProduct?.id === p.id;
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      disabled={isRegularLocked || isStlLocked}
                                      onClick={() => {
                                        setSelectedProduct(p);
                                        setLoanAmount(parseFloat(p.min_amount));
                                      }}
                                      className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                        isSelected
                                          ? 'border-primary bg-primary/5 dark:border-secondary dark:bg-secondary/5 ring-2 ring-primary/20 dark:ring-secondary/20 shadow-sm'
                                          : 'border-outline-variant/65 bg-transparent hover:border-primary/45 dark:hover:border-secondary/45 hover:bg-neutral/5'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center mb-2.5">
                                        <span className="font-bold text-on-surface dark:text-white text-sm block tracking-tight">
                                          {p.name
                                            .replace(/Short Term Loan\s*\(STL\)\s*-\s*/gi, '')
                                            .replace(/Short Term Loan\s*-\s*/gi, '')
                                            .replace(/Regular Loan\s*-\s*/gi, '')}
                                        </span>
                                        <span className="text-[9px] font-black bg-neutral/10 dark:bg-neutral/20 text-neutral-600 dark:text-neutral-300 px-2.5 py-0.5 rounded-full uppercase whitespace-nowrap tracking-wider">
                                          {p.amortization_type === 'flat_rate' ? 'Flat Rate' : 'Diminishing'}
                                        </span>
                                      </div>
                                      
                                      <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-neutral/5 dark:bg-neutral/10 p-2 rounded-xl">
                                          <span className="text-[8px] text-neutral-500 uppercase font-black block tracking-wider mb-0.5">Amount</span>
                                          <strong className="text-on-surface dark:text-white font-bold block text-[11px] leading-tight">
                                            {p.min_amount === p.max_amount 
                                              ? `₱${parseFloat(p.min_amount).toLocaleString()}`
                                              : `₱${parseFloat(p.min_amount).toLocaleString()} - ₱${parseFloat(p.max_amount).toLocaleString()}`}
                                          </strong>
                                        </div>
                                        <div className="bg-neutral/5 dark:bg-neutral/10 p-2 rounded-xl">
                                          <span className="text-[8px] text-neutral-500 uppercase font-black block tracking-wider mb-0.5">Interest</span>
                                          <strong className="text-on-surface dark:text-white font-bold block text-[11px] leading-tight">
                                            {(parseFloat(p.interest_rate) * 100).toFixed(1)}% p.a.
                                          </strong>
                                        </div>
                                        <div className="bg-neutral/5 dark:bg-neutral/10 p-2 rounded-xl">
                                          <span className="text-[8px] text-neutral-500 uppercase font-black block tracking-wider mb-0.5">Term</span>
                                          <strong className="text-on-surface dark:text-white font-bold block text-[11px] leading-tight">
                                            {p.term_months} {p.term_months === 1 ? 'Month' : 'Months'}
                                          </strong>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <button
                            disabled={!selectedProduct || isRegularLocked || isStlLocked}
                            onClick={() => {
                              if (selectedProduct) {
                                const shareCapital = memberMetrics?.balances?.share_capital || 0;
                                const historicalCount = memberMetrics?.loans?.historical_count || 0;
                                let borrowLimit = 0;
                                if (historicalCount === 0) {
                                  borrowLimit = 0.8 * shareCapital;
                                } else if (historicalCount === 1) {
                                  borrowLimit = 2.0 * shareCapital;
                                } else {
                                  borrowLimit = 3.0 * shareCapital;
                                }
                                const maxSliderCap = Math.min(parseFloat(selectedProduct.max_amount), borrowLimit);
                                setLoanAmount(maxSliderCap);
                              }
                              setWizardStep(2);
                            }}
                            className="w-full mt-2 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-center text-base"
                          >
                            Continue to Amount
                          </button>
                        </div>
                      );
                    })()}

                    {/* Step 2: Amount & Term Slider */}
                    {wizardStep === 2 && selectedProduct && (() => {
                      const shareCapital = memberMetrics?.balances?.share_capital || 0;
                      const historicalCount = memberMetrics?.loans?.historical_count || 0;
                      
                      let borrowLimit = 0;
                      let multiplierText = '';
                      let tierName = '';
                      
                      if (historicalCount === 0) {
                        borrowLimit = 0.8 * shareCapital;
                        multiplierText = '80% (0.8x)';
                        tierName = '1st Loan (First-Time Borrower)';
                      } else if (historicalCount === 1) {
                        borrowLimit = 2.0 * shareCapital;
                        multiplierText = '200% (2.0x)';
                        tierName = '2nd Loan (Established Track Record)';
                      } else {
                        borrowLimit = 3.0 * shareCapital;
                        multiplierText = '300% (3.0x)';
                        tierName = '3rd Loan & Onwards (Maximum Tier)';
                      }

                      // Adjust range max and loan amount if they exceed borrowLimit
                      const maxProductCap = parseFloat(selectedProduct.max_amount);
                      const maxSliderCap = Math.min(maxProductCap, borrowLimit);
                      
                      // Safeguard current slider value
                      const currentLoanAmount = Math.min(loanAmount, maxSliderCap);

                      // Co-maker is required if amount > shareCapital
                      const coMakerRequired = currentLoanAmount > shareCapital;
                      
                      // Submit button validation: if coMakerRequired is true, name is required
                      const submitDisabled = submitting || (coMakerRequired && !coMakerName.trim());

                      return (
                        <div className="space-y-6">
                          {/* Progressive Policy Info banner */}
                          <div className="bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-3xl p-5 space-y-2.5">
                            <div className="flex items-center gap-2 font-bold text-sm text-primary dark:text-secondary">
                              <Info className="w-5 h-5" /> Progressive Loan Policy Overview
                            </div>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                              You are currently categorized under the <strong className="text-on-surface dark:text-white font-bold">{tierName}</strong>. 
                              Based on your paid-up Share Capital of <strong className="text-on-surface dark:text-white font-bold">{formatCurrency(shareCapital)}</strong>, 
                              your maximum borrow limit for this loan is capped at <strong className="text-on-surface dark:text-white font-bold">{multiplierText} ({formatCurrency(borrowLimit)})</strong>.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left column: Slider and Repayments */}
                            <div className="space-y-5">
                              <div className="bg-neutral/5 dark:bg-neutral/10 p-4 rounded-2xl text-center space-y-1">
                                <span className="text-xs text-neutral-600 dark:text-neutral-400 uppercase font-bold tracking-wider">Requested Amortization Principal</span>
                                <div className="font-headline text-3xl font-extrabold text-primary dark:text-secondary">
                                  {formatCurrency(currentLoanAmount)}
                                </div>
                              </div>

                              {/* Large Accessible Slider */}
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 flex justify-between">
                                  <span>Adjust Amount:</span>
                                  <span>Min: {formatCurrency(Math.min(parseFloat(selectedProduct.min_amount), maxSliderCap))}</span>
                                </label>
                                <input
                                  type="range"
                                  min={Math.min(parseFloat(selectedProduct.min_amount), maxSliderCap)}
                                  max={maxSliderCap}
                                  step="1000"
                                  value={currentLoanAmount}
                                  onChange={(e) => setLoanAmount(parseFloat(e.target.value))}
                                  className="w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary dark:accent-secondary"
                                />
                                <div className="text-right text-xs font-bold text-neutral-600 dark:text-neutral-400">
                                  Max Allowed: {formatCurrency(maxSliderCap)}
                                </div>
                              </div>

                              {/* Estimated Repayment Math block */}
                              <div className="border border-outline-variant/65 rounded-2xl p-4 space-y-2 text-sm bg-surface-container-low">
                                <h5 className="font-bold text-on-surface dark:text-white border-b border-outline-variant/30 pb-1.5 mb-2">Estimated Monthly Repayments</h5>
                                <div className="flex justify-between text-xs">
                                  <span className="text-neutral-600 dark:text-neutral-400">Loan Product</span>
                                  <span className="font-semibold">{selectedProduct.name}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-neutral-600 dark:text-neutral-400">Amortization Method</span>
                                  <span className="font-semibold uppercase">{selectedProduct.amortization_type.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-neutral-600 dark:text-neutral-400">Duration Term</span>
                                  <span className="font-semibold">{selectedProduct.term_months} Months</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-outline-variant/20 font-bold text-base text-primary dark:text-secondary">
                                  <span>Est. Monthly Due</span>
                                  <span>
                                    {formatCurrency(
                                      selectedProduct.amortization_type === 'flat_rate'
                                        ? (currentLoanAmount + (currentLoanAmount * parseFloat(selectedProduct.interest_rate) * (selectedProduct.term_months / 12))) / selectedProduct.term_months
                                        : (currentLoanAmount * (parseFloat(selectedProduct.interest_rate) / 12) * Math.pow(1 + (parseFloat(selectedProduct.interest_rate) / 12), selectedProduct.term_months)) / (Math.pow(1 + (parseFloat(selectedProduct.interest_rate) / 12), selectedProduct.term_months) - 1)
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right column: Co-Maker & Requirements info */}
                            <div className="space-y-5">
                              {coMakerRequired ? (
                                <div className="p-5 border border-amber-500/20 dark:border-amber-400/20 bg-amber-500/5 dark:bg-amber-400/5 rounded-3xl space-y-4">
                                  <div className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                                    <Users className="w-5 h-5" /> Co-Maker Required
                                  </div>
                                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    Your requested loan of <strong className="text-on-surface dark:text-white font-bold">{formatCurrency(currentLoanAmount)}</strong> exceeds your Share Capital collateral (<strong className="text-on-surface dark:text-white font-bold">{formatCurrency(shareCapital)}</strong>). 
                                    Please supply a co-maker to guarantee the outstanding amount.
                                  </p>
                                  <div className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Co-Maker Full Name *</label>
                                      <input
                                        type="text"
                                        required
                                        value={coMakerName}
                                        onChange={(e) => setCoMakerName(e.target.value)}
                                        placeholder="Full name of cooperative member"
                                        className="w-full px-4 py-3 rounded-2xl border border-outline-variant/65 bg-white dark:bg-surface-container-high/40 text-sm text-on-surface dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Co-Maker Phone/Contact</label>
                                      <input
                                        type="tel"
                                        value={coMakerPhone}
                                        onChange={(e) => setCoMakerPhone(e.target.value)}
                                        placeholder="Mobile phone number"
                                        className="w-full px-4 py-3 rounded-2xl border border-outline-variant/65 bg-white dark:bg-surface-container-high/40 text-sm text-on-surface dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-5 border border-green-500/20 dark:border-green-400/20 bg-green-500/5 dark:bg-green-400/5 rounded-3xl space-y-3 flex flex-col justify-center h-full">
                                  <div className="flex items-center gap-2 text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">
                                    <ShieldCheck className="w-5 h-5" /> Fully Collateralized
                                  </div>
                                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    Your requested loan is fully covered by your current Share Capital of <strong className="text-on-surface dark:text-white font-bold">{formatCurrency(shareCapital)}</strong>.
                                  </p>
                                  <p className="text-xs text-neutral-500 dark:text-neutral-500 leading-relaxed italic">
                                    No co-maker guarantee or additional assets are required for this application.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-4 pt-2 border-t border-outline-variant/30">
                            <button
                              type="button"
                              onClick={() => setWizardStep(1)}
                              className="flex-1 py-3.5 bg-neutral/10 hover:bg-neutral/15 dark:bg-neutral/20 dark:hover:bg-neutral/25 text-on-surface dark:text-white rounded-2xl font-bold transition-colors cursor-pointer text-center"
                            >
                              Back to Categories
                            </button>
                            <button
                              type="button"
                              disabled={submitDisabled}
                              onClick={() => {
                                handleApplyLoan();
                              }}
                              className="flex-1 py-3.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-center shadow-md"
                            >
                              {submitting ? 'Submitting...' : 'Submit Application'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

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
                    {/* Step 1: Placement Details & Payment Channel */}
                    {wizardStep === 1 && (
                      <div className="space-y-6">
                        {/* Selected Type summary banner */}
                        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl text-xs">
                          <div>
                            <span className="text-neutral-500 block">Investment Type</span>
                            <span className="font-bold font-headline text-on-surface dark:text-white capitalize">
                              Share Capital (Capital Build-Up)
                            </span>
                          </div>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                            Placement Amount (₱):
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 5000"
                            value={investmentAmount}
                            onChange={(e) => setInvestmentAmount(e.target.value)}
                            className="w-full px-4 py-3 border border-outline-variant/65 rounded-2xl bg-transparent font-bold text-lg focus:outline-none focus:border-primary"
                          />
                        </div>

                        {/* Payment Channel Options */}
                        <div className="space-y-3">
                          <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">Select Deposit Channel:</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentMethod('gcash');
                                setPaymentRefNo('');
                              }}
                              className={`p-3.5 rounded-xl border transition-all text-left flex items-start gap-2 cursor-pointer ${paymentMethod === 'gcash'
                                ? 'bg-primary/5 dark:bg-secondary/5 border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/20'
                                : 'border-outline-variant/65 bg-transparent hover:border-neutral/30'
                                }`}
                            >
                              <WalletCards className="w-4 h-4 mt-0.5 text-primary dark:text-secondary flex-shrink-0" />
                              <div>
                                <span className="font-bold text-xs block">GCash</span>
                                <span className="text-[9px] text-neutral-500 block leading-tight mt-0.5">Instant online GCash mobile wallet transfer</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPaymentMethod('bank_transfer');
                                setPaymentRefNo('');
                              }}
                              className={`p-3.5 rounded-xl border transition-all text-left flex items-start gap-2 cursor-pointer ${paymentMethod === 'bank_transfer'
                                ? 'bg-primary/5 dark:bg-secondary/5 border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/20'
                                : 'border-outline-variant/65 bg-transparent hover:border-neutral/30'
                                }`}
                            >
                              <Building className="w-4 h-4 mt-0.5 text-primary dark:text-secondary flex-shrink-0" />
                              <div>
                                <span className="font-bold text-xs block">Bank Transfer</span>
                                <span className="text-[9px] text-neutral-500 block leading-tight mt-0.5">Direct deposit to BDO Account</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPaymentMethod('payroll');
                                setPaymentRefNo('');
                              }}
                              className={`p-3.5 rounded-xl border transition-all text-left flex items-start gap-2 cursor-pointer ${paymentMethod === 'payroll'
                                ? 'bg-primary/5 dark:bg-secondary/5 border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/20'
                                : 'border-outline-variant/65 bg-transparent hover:border-neutral/30'
                                }`}
                            >
                              <Lock className="w-4 h-4 mt-0.5 text-primary dark:text-secondary flex-shrink-0" />
                              <div>
                                <span className="font-bold text-xs block">Salary Deduction</span>
                                <span className="text-[9px] text-neutral-500 block leading-tight mt-0.5">Deduct from upcoming payslip</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPaymentMethod('otc');
                                setPaymentRefNo('');
                              }}
                              className={`p-3.5 rounded-xl border transition-all text-left flex items-start gap-2 cursor-pointer ${paymentMethod === 'otc'
                                ? 'bg-primary/5 dark:bg-secondary/5 border-primary dark:border-secondary ring-2 ring-primary/20 dark:ring-secondary/20'
                                : 'border-outline-variant/65 bg-transparent hover:border-neutral/30'
                                }`}
                            >
                              <Users className="w-4 h-4 mt-0.5 text-primary dark:text-secondary flex-shrink-0" />
                              <div>
                                <span className="font-bold text-xs block">Hand-in</span>
                                <span className="text-[9px] text-neutral-500 block leading-tight mt-0.5">Hand-in cash to the co-op cashier</span>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* GCash Details */}
                        {paymentMethod === 'gcash' && (
                          <div className="p-3.5 border border-outline-variant/65 rounded-xl bg-neutral/5 space-y-2 text-xs">
                            <div className="flex justify-between items-center font-bold">
                              <span>GCash Account Name:</span>
                              <span className="text-on-surface dark:text-white font-extrabold">Michelle Pable</span>
                            </div>
                            <div className="flex justify-between items-center font-bold">
                              <span>Co-op GCash Number:</span>
                              <span className="font-mono text-primary dark:text-secondary font-extrabold">09498664041</span>
                            </div>
                            <input
                              type="text"
                              placeholder="Enter GCash Reference No. (e.g. 10029384)"
                              value={paymentRefNo}
                              onChange={(e) => setPaymentRefNo(e.target.value)}
                              className="w-full px-3 py-2 border border-outline-variant/65 rounded-lg bg-white dark:bg-surface-container-high text-xs font-mono font-bold focus:outline-none focus:border-primary"
                            />
                          </div>
                        )}

                        {/* Bank Transfer Details */}
                        {paymentMethod === 'bank_transfer' && (
                          <div className="p-3.5 border border-outline-variant/65 rounded-xl bg-neutral/5 space-y-2 text-xs">
                            <div className="flex justify-between items-center font-bold">
                              <span>BDO Account No:</span>
                              <span className="font-mono text-primary dark:text-secondary font-extrabold">0012-3456-7890</span>
                            </div>
                            <input
                              type="text"
                              placeholder="Enter Bank Deposit/Ref No. (e.g. BDO-98213)"
                              value={paymentRefNo}
                              onChange={(e) => setPaymentRefNo(e.target.value)}
                              className="w-full px-3 py-2 border border-outline-variant/65 rounded-lg bg-white dark:bg-surface-container-high text-xs font-mono font-bold focus:outline-none focus:border-primary"
                            />
                          </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={closeModal}
                            className="flex-1 py-3 bg-neutral/10 hover:bg-neutral/15 dark:bg-neutral/20 dark:hover:bg-neutral/25 text-on-surface dark:text-white rounded-2xl font-bold transition-colors cursor-pointer text-center text-sm"
                          >
                            Cancel
                          </button>

                          <button
                            disabled={submitting || !investmentAmount}
                            onClick={handleInitiateInvestment}
                            className="flex-1 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer text-center text-sm shadow-md"
                          >
                            {submitting ? 'Processing...' : 'Confirm Capital Placement'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Success Screen */}
                    {wizardStep === 2 && successData && (
                      <div className="space-y-5 text-center py-2">
                        <div className="w-16 h-16 bg-primary/20 dark:bg-secondary/20 text-primary dark:text-secondary rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">
                          ✓
                        </div>
                        <h4 className="font-headline font-bold text-xl text-on-surface dark:text-white">Capital Placement Submitted!</h4>

                        {/* Reference Ticket info */}
                        <div className="p-5 border border-dashed border-outline-variant rounded-2xl bg-neutral/5 text-left space-y-2.5 max-w-sm mx-auto">
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-500 font-bold uppercase">Placement Type:</span>
                            <span className="font-bold uppercase text-primary dark:text-secondary">
                              Share Capital (CBU)
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-500 font-bold uppercase">Payment Channel:</span>
                            <span className="font-bold uppercase text-on-surface dark:text-white">
                              {paymentMethod === 'gcash' ? 'GCash' : paymentMethod === 'bank_transfer' ? 'Bank Transfer' : paymentMethod === 'payroll' ? 'Salary Deduction' : 'Hand-in'}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-neutral-500 font-bold uppercase">Reference Code:</span>
                            <span className="font-mono font-bold text-sm tracking-wider text-on-surface dark:text-white">{successData.reference_code}</span>
                          </div>
                          {paymentRefNo && (
                            <div className="flex justify-between text-xs">
                              <span className="text-neutral-500 font-bold uppercase">Payment Ref No:</span>
                              <span className="font-mono font-bold text-xs text-on-surface dark:text-white">{paymentRefNo}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs pt-1 border-t border-outline-variant/30">
                            <span className="text-neutral-500 font-bold uppercase">Amount Credited:</span>
                            <span className="font-extrabold text-base text-primary dark:text-secondary">{formatCurrency(successData.amount)}</span>
                          </div>
                        </div>

                        <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5 max-w-md mx-auto pt-2">
                          <p className="font-semibold text-on-surface dark:text-white">What happens next?</p>
                          {paymentMethod === 'payroll' ? (
                            <p>Our payroll administrator will reflect this deduction on your upcoming payroll slip. Once validated, your ledger balance will be credited.</p>
                          ) : paymentMethod === 'otc' ? (
                            <p>Hand-in your cash payment and present the Reference Code <strong>{successData.reference_code}</strong> to the cooperative cashier to settle your payment.</p>
                          ) : (
                            <p>Our cooperative admin will verify your reference code <strong>{paymentRefNo}</strong>. Your Share Capital & Dividend tracker will update once confirmed.</p>
                          )}
                        </div>

                        <div className="pt-4">
                          <button
                            onClick={closeModal}
                            className="px-8 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-2xl font-bold hover:opacity-90 transition-opacity cursor-pointer text-sm"
                          >
                            Done
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
                          <AnimatedSelect
                            value={appointmentPurpose}
                            onChange={setAppointmentPurpose}
                            options={[
                              { value: 'Loan Application Consultation', label: 'Discuss a Loan Application' },
                              { value: 'Fixed Deposit Account Placement', label: 'Open a new Fixed Deposit' },
                              { value: 'Capital Placement Deposit', label: 'Share Capital Deposit' },
                              { value: 'General Inquiry', label: 'General Cooperative Inquiry' }
                            ]}
                          />
                        </div>

                        {/* Date Selection */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-neutral-600 dark:text-neutral-400">Select Date:</label>
                          <input
                            type="date"
                            min={tomorrowStr} // Min is tomorrow
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

                {/* ----------------- WELCOME & GOAL SETTING WIZARD ----------------- */}
                {activeModal === 'welcome' && (
                  <div className="space-y-6">
                    {wizardStep === 1 && (
                      <div className="space-y-4 text-center py-4">
                        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary flex items-center justify-center mb-2">
                          <Sparkles className="w-8 h-8" />
                        </div>
                        <h4 className="font-headline font-extrabold text-xl text-primary dark:text-secondary">
                          Hello, {user?.profile?.first_name || 'Member'}!
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-md mx-auto">
                          Welcome to the **University Cooperative Loan Monitoring & Financial Management System**. 
                          We are excited to help you track your share capital, fixed deposits, investments, and loan applications in one unified, secure platform.
                        </p>
                        <div className="pt-4">
                          <button
                            onClick={() => setWizardStep(2)}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-sm hover:opacity-95 transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            <span>Get Started</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="space-y-5">
                        <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                          Setting an investment milestone goal helps you visualize and track your accumulated equity capital (Share Capital + Fixed Deposits). Once your investment hits 100% of your milestone goal, our Cooperative Office will be automatically notified to coordinate payout or rollover options.
                        </p>
                        
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">
                            Your Target Investment Goal (PHP)
                          </label>
                          <div className="relative rounded-2xl border border-outline-variant/60 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 overflow-hidden bg-neutral-50 dark:bg-neutral-900 transition-all">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₱</span>
                            <input
                              type="number"
                              value={newGoalAmount}
                              onChange={(e) => setNewGoalAmount(e.target.value)}
                              placeholder="e.g. 50000"
                              className="w-full bg-transparent pl-8 pr-4 py-3 text-sm font-bold text-on-surface dark:text-white focus:outline-none placeholder-neutral-400"
                            />
                          </div>
                        </div>

                        <div className="pt-3">
                          <button
                            onClick={async () => {
                              const goalVal = parseFloat(newGoalAmount);
                              if (isNaN(goalVal) || goalVal <= 0) {
                                setModalError('Please enter a valid target goal amount (greater than 0).');
                                return;
                              }
                              setSubmitting(true);
                              setModalError(null);
                              try {
                                const memberId = user?.profile?.id;
                                const response = await api.patch(`/members/${memberId}/milestone-goal`, {
                                  investment_goal: goalVal
                                });
                                setMemberMetrics((prev: any) => prev ? {
                                  ...prev,
                                  investment_goal: response.data.data.investment_goal
                                } : null);
                                closeModal();
                              } catch (err: any) {
                                setModalError(err.response?.data?.error?.message || 'Failed to save milestone goal.');
                              } finally {
                                setSubmitting(false);
                              }
                            }}
                            disabled={submitting}
                            className="w-full py-3 px-4 rounded-2xl bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-sm hover:opacity-95 transition-all active:scale-95 shadow-md disabled:opacity-50 cursor-pointer text-center"
                          >
                            {submitting ? 'Saving...' : 'Save & Finish'}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/dashboard/members')}
            className="flex flex-col items-center gap-2 p-4 border border-outline-variant/50 hover:border-primary/50 dark:hover:border-secondary/50 rounded-2xl text-center hover:bg-neutral/5 transition-all group active:scale-95"
          >
            <UserIcon className="w-6 h-6 text-primary dark:text-secondary group-hover:scale-115 transition-transform" />
            <span className="font-body text-xs font-bold text-on-surface dark:text-white">Register Member</span>
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
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white">Operational Status</h2>
          <span className="text-xs text-neutral-500 font-semibold hidden sm:inline">Click any card to filter view</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Members -> Redirect to /dashboard/members */}
          <button
            type="button"
            onClick={() => router.push('/dashboard/members')}
            className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-xs hover:shadow-md hover:border-primary/50 dark:hover:border-secondary/50 transition-all cursor-pointer text-left w-full group active:scale-98 focus:outline-none focus:ring-2 focus:ring-primary/20"
            title="Click to view Members Directory"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary dark:text-secondary group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Total Members</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="font-headline text-xl font-extrabold text-on-surface dark:text-white">{ds.total_member_profiles || 0}</div>
            <div className="flex items-center gap-2 mt-1.5 text-[10px]">
              <span className="flex items-center gap-0.5 text-green-600"><UserCheck className="w-3 h-3" />{ds.active_members || 0} active</span>
              <span className="flex items-center gap-0.5 text-neutral-500"><UserX className="w-3 h-3" />{ds.inactive_members || 0} inactive</span>
            </div>
          </button>

          {/* Active Loans -> Redirect to /dashboard/loans?status=disbursed */}
          <button
            type="button"
            onClick={() => router.push('/dashboard/loans?status=disbursed')}
            className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-xs hover:shadow-md hover:border-primary/50 dark:hover:border-secondary/50 transition-all cursor-pointer text-left w-full group active:scale-98 focus:outline-none focus:ring-2 focus:ring-primary/20"
            title="Click to view Active/Disbursed Loans"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-primary dark:text-secondary group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Active Loans</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="font-headline text-xl font-extrabold text-on-surface dark:text-white">{ds.disbursed_loans || 0}</div>
          </button>

          {/* Pending Approval -> Redirect to /dashboard/loans?status=pending_approval */}
          <button
            type="button"
            onClick={() => router.push('/dashboard/loans?status=pending_approval')}
            className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-xs hover:shadow-md hover:border-amber-500/50 transition-all cursor-pointer text-left w-full group active:scale-98 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            title="Click to view Pending Approval Loans"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Pending Approval</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className={`font-headline text-xl font-extrabold ${(ds.pending_loans || 0) > 0 ? 'text-amber-500' : 'text-on-surface dark:text-white'}`}>
              {ds.pending_loans || 0}
            </div>
          </button>

          {/* Defaulted -> Redirect to /dashboard/loans?status=defaulted */}
          <button
            type="button"
            onClick={() => router.push('/dashboard/loans?status=defaulted')}
            className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-xs hover:shadow-md hover:border-red-500/50 transition-all cursor-pointer text-left w-full group active:scale-98 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            title="Click to view Defaulted Loans"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase">Defaulted</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className={`font-headline text-xl font-extrabold ${(ds.defaulted_loans || 0) > 0 ? 'text-red-500' : 'text-on-surface dark:text-white'}`}>
              {ds.defaulted_loans || 0}
            </div>
          </button>
        </div>
      </div>

      {/* Financial Assets */}
      <div className="grid grid-cols-1 gap-6">
        <KpiCard
          label="Total Share Capital"
          value={formatCurrency(ds.total_share_capital)}
          icon={Building}
          description="Combined member equity contributions"
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
