'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import BackButton from '@/components/BackButton';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Users,
  Banknote,
  WalletCards,
  Receipt,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Info,
  Layers,
  HelpCircle,
  Trash2,
  UserMinus,
} from 'lucide-react';

interface ShareCapitalDeposit {
  row: number;
  date: string | null;
  invoiceNo: string;
  amount: number;
}

interface InstallmentRecord {
  installmentNumber: number;
  row: number;
  dueDate: string;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  finesDue: number;
  amountPaid: number;
  principalPaid: number;
  interestPaid: number;
  balanceAfter: number;
  principalBalanceAfter: number;
  invoiceNo: string;
  datePaid: string | null;
  isPaid: boolean;
}

interface LoanRecord {
  row: number;
  lafNo: string;
  principalAmount: number;
  mode: string;
  terms: number;
  disbursedAt: string | null;
  maturityDate: string | null;
  initialMonthlyDue: number | null;
  installments: InstallmentRecord[];
  totalPaid: number;
  remainingBalance: number;
  status: 'disbursed' | 'fully_paid';
}

interface ParsedMember {
  sheetName: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  birthDate: string | null;
  shareCapitalDeposits: ShareCapitalDeposit[];
  shareCapitalTotal: number;
  loans: LoanRecord[];
  existingMember?: boolean;
  memberId?: string | null;
}

interface ImportSummary {
  totalSheetsFound: number;
  totalParsedMembers: number;
  newMembersCount: number;
  existingMembersCount: number;
  totalShareCapitalDeposits: number;
  totalShareCapitalSum: number;
  totalLoans: number;
  totalLoanAmount: number;
  totalPayments: number;
  totalPaymentsSum: number;
}

interface ExecutionResult {
  membersCreated: number;
  membersUpdated: number;
  shareDepositsCreated: number;
  loansCreated: number;
  schedulesCreated: number;
  paymentsCreated: number;
}

export default function ImportPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect non-admin/staff
  if (user && user.role !== 'admin' && user.role !== 'staff') {
    router.push('/dashboard');
  }

  const [step, setStep] = useState<'upload' | 'preview' | 'executing' | 'success'>('upload');
  const [importMode, setImportMode] = useState<'loans' | 'members_registry'>('loans');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Registry Update Result State
  const [registryResult, setRegistryResult] = useState<{
    updatedCount: number;
    createdCount: number;
    totalProcessed: number;
    details: any[];
  } | null>(null);

  // Preview Data
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [parsedMembers, setParsedMembers] = useState<ParsedMember[]>([]);
  const [excludedCount, setExcludedCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});
  const [selectedTab, setSelectedTab] = useState<'all' | 'to_ingest' | 'linked'>('all');

  // Execution
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Drop & Selection Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setErrorMsg('Please upload a valid Excel spreadsheet (.xlsx or .xls).');
      return;
    }

    if (importMode === 'members_registry') {
      setSelectedFile(file);
      setErrorMsg(null);
      setIsScanning(true);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/import/members-registry', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data.success && response.data.data) {
          setRegistryResult(response.data.data);
          setStep('success');
        } else {
          setErrorMsg(response.data.error?.message || 'Failed to update members registry from Excel.');
        }
      } catch (err: any) {
        console.error('Registry import error:', err);
        setErrorMsg(err.response?.data?.error?.message || 'Failed to update members registry from Excel.');
      } finally {
        setIsScanning(false);
      }
      return;
    }

    setSelectedFile(file);
    setErrorMsg(null);
    setIsScanning(true);
    setExcludedCount(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success && response.data.data) {
        setSummary(response.data.data.summary);
        setParsedMembers(response.data.data.members || []);
        setStep('preview');
      } else {
        setErrorMsg(response.data.error?.message || 'Failed to parse the Excel workbook.');
      }
    } catch (err: any) {
      console.error('Import parse error:', err);
      setErrorMsg(
        err.response?.data?.error?.message ||
          'Failed to scan workbook. Please ensure the format matches the Cooperative ledger sheet structure.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const toggleExpand = (sheetName: string) => {
    setExpandedMembers((prev) => ({
      ...prev,
      [sheetName]: !prev[sheetName],
    }));
  };

  // Remove / Exclude a member sheet from import queue
  const handleRemoveMember = (sheetName: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    setParsedMembers((prev) => {
      const updated = prev.filter((m) => m.sheetName !== sheetName);
      setExcludedCount((c) => c + 1);

      // Recalculate summary metrics dynamically
      let totalScCount = 0;
      let totalScSum = 0;
      let totalLoans = 0;
      let totalLoanAmount = 0;
      let totalPayments = 0;
      let totalPaymentsSum = 0;
      let newCount = 0;
      let existingCount = 0;

      for (const m of updated) {
        if (m.existingMember) existingCount++;
        else newCount++;
        totalScCount += m.shareCapitalDeposits.length;
        totalScSum += m.shareCapitalTotal;
        totalLoans += m.loans.length;
        for (const l of m.loans) {
          totalLoanAmount += l.principalAmount;
          totalPayments += l.installments.filter((i) => i.isPaid).length;
          totalPaymentsSum += l.totalPaid;
        }
      }

      setSummary({
        totalSheetsFound: summary?.totalSheetsFound || updated.length,
        totalParsedMembers: updated.length,
        newMembersCount: newCount,
        existingMembersCount: existingCount,
        totalShareCapitalDeposits: totalScCount,
        totalShareCapitalSum: Math.round(totalScSum * 100) / 100,
        totalLoans: totalLoans,
        totalLoanAmount: Math.round(totalLoanAmount * 100) / 100,
        totalPayments: totalPayments,
        totalPaymentsSum: Math.round(totalPaymentsSum * 100) / 100,
      });

      return updated;
    });
  };

  const handleExecuteImport = async () => {
    if (!parsedMembers.length) return;
    setShowConfirmModal(false);
    setStep('executing');
    setExecuting(true);
    setErrorMsg(null);

    try {
      const response = await api.post('/import/execute', {
        membersData: parsedMembers,
      });

      if (response.data.success) {
        setExecutionResult(response.data.data);
        setStep('success');
      } else {
        setErrorMsg(response.data.error?.message || 'Import failed.');
        setStep('preview');
      }
    } catch (err: any) {
      console.error('Execute import error:', err);
      const errMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Database error occurred during batch ingestion.';
      setErrorMsg(errMsg);
      setStep('preview');
    } finally {
      setExecuting(false);
    }
  };

  const resetImporter = () => {
    setSelectedFile(null);
    setSummary(null);
    setParsedMembers([]);
    setExcludedCount(0);
    setExecutionResult(null);
    setRegistryResult(null);
    setErrorMsg(null);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter members list
  const filteredMembers = parsedMembers.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sheetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.loans.some((l) => l.lafNo.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedTab === 'to_ingest') return !m.existingMember;
    if (selectedTab === 'linked') return m.existingMember;
    return true;
  });

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-container-lowest p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface dark:text-white flex items-center gap-2.5">
                <FileSpreadsheet className="w-8 h-8 text-primary dark:text-secondary" />
                Data Migration & Import Hub
              </h1>
              <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Batch import legacy member profiles, share capital ledgers, and historical loan repayments from Excel.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowGuideModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all shadow-sm"
          >
            <HelpCircle className="w-4 h-4 text-primary dark:text-secondary" />
            Format Guide & Cheat Sheet
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-error/10 border border-error/20 flex items-start gap-3 text-error dark:text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm font-medium">{errorMsg}</div>
          </div>
        )}

        {/* STEP 1: FILE UPLOAD & DROPZONE */}
        {step === 'upload' && (
          <div className="space-y-6">
            {/* Mode Selection Cards */}
            <div className="bg-white dark:bg-surface-container-low p-5 rounded-3xl border border-outline-variant/60 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary dark:text-secondary" />
                  Select Excel Import Purpose
                </h3>
                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mt-1">
                  Choose your spreadsheet layout type before uploading.
                </p>
              </div>

              <div className="flex bg-neutral-100 dark:bg-neutral-800/80 p-1.5 rounded-2xl border border-outline-variant/40 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setImportMode('loans')}
                  className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    importMode === 'loans'
                      ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-md scale-[1.02]'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
                  }`}
                >
                  Loan Ledgers & Accounts
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('members_registry')}
                  className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    importMode === 'members_registry'
                      ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-md scale-[1.02]'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
                  }`}
                >
                  Member IDs & Credentials (Registry)
                </button>
              </div>
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-300 ${
                isDragging
                  ? 'border-primary dark:border-secondary bg-primary/5 dark:bg-secondary/10 scale-[1.01]'
                  : 'border-outline-variant/60 hover:border-primary dark:hover:border-secondary bg-white dark:bg-surface-container-low hover:shadow-lg'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-secondary/15 flex items-center justify-center text-primary dark:text-secondary shadow-inner">
                  {isScanning ? (
                    <RefreshCw className="w-10 h-10 animate-spin" />
                  ) : (
                    <Upload className="w-10 h-10" />
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-headline text-lg sm:text-xl font-bold text-on-surface dark:text-white">
                    {isScanning ? 'Scanning & Parsing Workbook...' : 'Upload Files Here'}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
                    Drag and drop your cooperative Excel workbook (.xlsx or .xls) here, or click to browse files from your computer.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  Safe Dry-Run: No database changes will occur until you confirm after preview.
                </div>
              </div>
            </div>

            {/* Quick Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-surface-container-low border border-outline-variant/50 shadow-sm flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface dark:text-white">Member Auto-Discovery</h4>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                    Parses sheet tabs (e.g. <code>SARMIENTO, JONATHAN</code>) to ingest cooperative accounts.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-surface-container-low border border-outline-variant/50 shadow-sm flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <WalletCards className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface dark:text-white">Shared Capital Ledger</h4>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                    Extracts columns A–C deposits with dates and running equity balances.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-surface-container-low border border-outline-variant/50 shadow-sm flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface dark:text-white">Loans & Repayments</h4>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                    Captures LAF numbers, amounts, amortized schedules, invoices, and payment receipts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & VERIFICATION DESK */}
        {step === 'preview' && summary && (
          <div className="space-y-6">
            {/* Top Bar Summary & Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-surface-container-low p-5 rounded-3xl border border-outline-variant/60 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary">
                    Inspection Stage (Dry Run)
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    File: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedFile?.name}</span>
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold font-headline text-on-surface dark:text-white mt-1">
                  Ready to Ingest {parsedMembers.length} Member Accounts
                </h2>
                {excludedCount > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                    ({excludedCount} non-member / summary sheet{excludedCount > 1 ? 's' : ''} excluded from import)
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={resetImporter}
                  className="px-4 py-2 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Upload Different File
                </button>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={parsedMembers.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileCheck className="w-4 h-4" />
                  Confirm & Ingest to Database
                </button>
              </div>
            </div>

            {/* Metrics Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-surface-container-low border border-outline-variant/50 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Members to Ingest
                </div>
                <div className="text-xl sm:text-2xl font-bold font-headline text-on-surface dark:text-white mt-1">
                  {summary.totalParsedMembers}
                </div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 flex gap-2">
                  <span className="text-emerald-600 font-medium">{summary.newMembersCount} to ingest</span>
                  <span>•</span>
                  <span className="text-amber-600 font-medium">{summary.existingMembersCount} linked</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-surface-container-low border border-outline-variant/50 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Share Capital Records
                </div>
                <div className="text-xl sm:text-2xl font-bold font-headline text-on-surface dark:text-white mt-1">
                  {summary.totalShareCapitalDeposits}
                </div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1">
                  Total: ₱{summary.totalShareCapitalSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-surface-container-low border border-outline-variant/50 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Loan Applications
                </div>
                <div className="text-xl sm:text-2xl font-bold font-headline text-on-surface dark:text-white mt-1">
                  {summary.totalLoans}
                </div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1">
                  Volume: ₱{summary.totalLoanAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-surface-container-low border border-outline-variant/50 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Payment History Logs
                </div>
                <div className="text-xl sm:text-2xl font-bold font-headline text-on-surface dark:text-white mt-1">
                  {summary.totalPayments}
                </div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1">
                  Collected: ₱{summary.totalPaymentsSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Filter & Search Bar with Instructions */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-surface-container-low p-4 rounded-2xl border border-outline-variant/50 shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search member name, sheet tab, or LAF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-outline-variant bg-neutral-50 dark:bg-surface-container text-on-surface dark:text-white outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setSelectedTab('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedTab === 'all'
                      ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  All ({parsedMembers.length})
                </button>
                <button
                  onClick={() => setSelectedTab('to_ingest')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedTab === 'to_ingest'
                      ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  To Ingest ({summary.newMembersCount})
                </button>
                <button
                  onClick={() => setSelectedTab('linked')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    selectedTab === 'linked'
                      ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  Linked Accounts ({summary.existingMembersCount})
                </button>
              </div>
            </div>

            {/* Member Record Accordions */}
            <div className="space-y-3">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-surface-container-low rounded-2xl border border-outline-variant/40 text-neutral-500 text-xs">
                  No member records matched your search query.
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isExpanded = !!expandedMembers[member.sheetName];
                  return (
                    <div
                      key={member.sheetName}
                      className="bg-white dark:bg-surface-container-low rounded-2xl border border-outline-variant/50 shadow-sm overflow-hidden transition-all"
                    >
                      {/* Accordion Header */}
                      <div
                        onClick={() => toggleExpand(member.sheetName)}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-secondary/15 flex items-center justify-center text-primary dark:text-secondary font-bold text-xs">
                            {member.firstName.charAt(0)}
                            {member.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold font-headline text-on-surface dark:text-white">
                                {member.fullName}
                              </h3>
                              {member.existingMember ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  Linked Account (Will Append)
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  Coop Member
                                </span>
                              )}
                            </div>
                            {member.phone && (
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                                Phone: {member.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quick Stats Badges & Actions */}
                        <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto">
                          <div className="text-right text-xs">
                            <span className="text-neutral-500 dark:text-neutral-400 block text-[10px] uppercase font-semibold">
                              Share Capital
                            </span>
                            <span className="font-bold text-on-surface dark:text-white">
                              ₱{member.shareCapitalTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="text-right text-xs">
                            <span className="text-neutral-500 dark:text-neutral-400 block text-[10px] uppercase font-semibold">
                              Loans Found
                            </span>
                            <span className="font-bold text-on-surface dark:text-white">
                              {member.loans.length} {member.loans.length === 1 ? 'Loan' : 'Loans'}
                            </span>
                          </div>

                          {/* Delete / Exclude Button */}
                          <button
                            type="button"
                            onClick={(e) => handleRemoveMember(member.sheetName, e)}
                            title="Exclude this sheet from import"
                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Accordion Expanded Content */}
                      {isExpanded && (
                        <div className="p-4 sm:p-6 border-t border-outline-variant/40 bg-neutral-50/50 dark:bg-surface-container space-y-6">
                          {/* Share Capital Section */}
                          <div>
                            <h4 className="text-xs font-bold font-headline uppercase tracking-wider text-primary dark:text-secondary mb-3 flex items-center gap-2">
                              <WalletCards className="w-4 h-4" />
                              Share Capital Contributions ({member.shareCapitalDeposits.length} entries)
                            </h4>

                            {member.shareCapitalDeposits.length === 0 ? (
                              <p className="text-xs text-neutral-500 italic">No initial or running share capital deposits recorded in columns A–C.</p>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-outline-variant/50 bg-white dark:bg-surface-container-low">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold border-b border-outline-variant/40">
                                    <tr>
                                      <th className="p-2.5">Row</th>
                                      <th className="p-2.5">Date Deposited</th>
                                      <th className="p-2.5">Invoice / LAF Reference</th>
                                      <th className="p-2.5 text-right">Deposit Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-outline-variant/30">
                                    {member.shareCapitalDeposits.map((sc, idx) => (
                                      <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                        <td className="p-2.5 font-mono text-neutral-400">#{sc.row}</td>
                                        <td className="p-2.5">
                                          {sc.date || 'Initial / System Date'}
                                        </td>
                                        <td className="p-2.5 font-mono font-medium">{sc.invoiceNo}</td>
                                        <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                          ₱{sc.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* Loans & Repayments Section */}
                          <div>
                            <h4 className="text-xs font-bold font-headline uppercase tracking-wider text-primary dark:text-secondary mb-3 flex items-center gap-2">
                              <Banknote className="w-4 h-4" />
                              Loan Applications & Historical Repayments ({member.loans.length} loans)
                            </h4>

                            {member.loans.length === 0 ? (
                              <p className="text-xs text-neutral-500 italic">No loan accounts found in columns D–R.</p>
                            ) : (
                              <div className="space-y-4">
                                {member.loans.map((loan, lIdx) => (
                                  <div
                                    key={lIdx}
                                    className="p-4 rounded-xl border border-outline-variant/60 bg-white dark:bg-surface-container-low space-y-3"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/40 pb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-on-surface dark:text-white">
                                          LAF: {loan.lafNo}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                                          Mode: {loan.mode}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                                          {loan.terms} Months
                                        </span>
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            loan.status === 'fully_paid'
                                              ? 'bg-emerald-500/10 text-emerald-600'
                                              : 'bg-primary/10 text-primary dark:text-secondary'
                                          }`}
                                        >
                                          {loan.status === 'fully_paid' ? 'Fully Paid' : 'Active / Disbursed'}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-4 text-xs">
                                        <div>
                                          <span className="text-neutral-400 text-[10px]">Principal: </span>
                                          <span className="font-bold">
                                            ₱{loan.principalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-neutral-400 text-[10px]">Repaid: </span>
                                          <span className="font-bold text-emerald-600">
                                            ₱{loan.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-neutral-400 text-[10px]">Remaining: </span>
                                          <span className="font-bold text-amber-600">
                                            ₱{loan.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Installments Table */}
                                    {loan.installments.length > 0 && (
                                      <div className="overflow-x-auto rounded-lg border border-outline-variant/40">
                                        <table className="w-full text-left text-[11px]">
                                          <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 font-semibold border-b border-outline-variant/30">
                                            <tr>
                                              <th className="p-1.5">#</th>
                                              <th className="p-1.5">Due / Repay Date</th>
                                              <th className="p-1.5 text-right">Principal</th>
                                              <th className="p-1.5 text-right">Interest</th>
                                              <th className="p-1.5 text-right">Total Due</th>
                                              <th className="p-1.5 text-right">Amount Paid</th>
                                              <th className="p-1.5 text-right">Balance After</th>
                                              <th className="p-1.5">Invoice / OR</th>
                                              <th className="p-1.5 text-center">Status</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-outline-variant/20">
                                            {loan.installments.map((inst, iIdx) => (
                                              <tr key={iIdx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                                                <td className="p-1.5 font-mono text-neutral-400">{inst.installmentNumber}</td>
                                                <td className="p-1.5 font-mono">{inst.datePaid || inst.dueDate}</td>
                                                <td className="p-1.5 text-right">₱{inst.principalDue.toFixed(2)}</td>
                                                <td className="p-1.5 text-right">₱{inst.interestDue.toFixed(2)}</td>
                                                <td className="p-1.5 text-right font-medium">₱{inst.totalDue.toFixed(2)}</td>
                                                <td className="p-1.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                  ₱{inst.amountPaid.toFixed(2)}
                                                </td>
                                                <td className="p-1.5 text-right font-mono text-neutral-600 dark:text-neutral-300">
                                                  ₱{inst.balanceAfter.toFixed(2)}
                                                </td>
                                                <td className="p-1.5 font-mono text-neutral-500">{inst.invoiceNo}</td>
                                                <td className="p-1.5 text-center">
                                                  {inst.isPaid ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                      <CheckCircle2 className="w-3 h-3" /> Paid
                                                    </span>
                                                  ) : (
                                                    <span className="text-[10px] font-medium text-neutral-400">Unpaid</span>
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* STEP 3: EXECUTING INGESTION */}
        {step === 'executing' && (
          <div className="bg-white dark:bg-surface-container-low rounded-3xl p-12 border border-outline-variant/50 shadow-lg text-center space-y-6 max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-secondary/15 flex items-center justify-center text-primary dark:text-secondary mx-auto">
              <RefreshCw className="w-10 h-10 animate-spin" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold font-headline text-on-surface dark:text-white">
                Ingesting Data into PostgreSQL...
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
                Writing member records, calculating running share capital balances, generating loan amortization matrix, and logging transactions.
              </p>
            </div>

            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
              <div className="bg-primary dark:bg-secondary h-2 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS SUMMARY */}
        {step === 'success' && registryResult && (
          <div className="bg-white dark:bg-surface-container-low rounded-3xl p-8 sm:p-12 border border-outline-variant/50 shadow-lg space-y-8 max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold font-headline text-on-surface dark:text-white">
                Member Registry & Credentials Updated!
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto">
                Updated Member IDs, membership types (Regular/Associate), TINs, and middle names for {registryResult.updatedCount} existing members and created {registryResult.createdCount} new member records.
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto border border-outline-variant/40 rounded-2xl text-left p-4 space-y-2 bg-neutral-50 dark:bg-neutral-900 font-mono text-xs">
              {registryResult.details.map((d: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-1.5 border-b border-outline-variant/20 last:border-0">
                  <span className="font-bold text-on-surface dark:text-white">{d.name}</span>
                  <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400 text-[11px]">
                    <span>ID: <strong className="text-primary dark:text-secondary">{d.memberNo || 'N/A'}</strong></span>
                    <span>Type: <strong className="text-purple-600 dark:text-purple-400">{d.membershipType || 'Regular'}</strong></span>
                    <span className="text-emerald-500 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10">{d.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-outline-variant/40">
              <Link
                href="/dashboard/members"
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all"
              >
                <Users className="w-4 h-4" />
                View Updated Members Directory
              </Link>
              <button
                onClick={resetImporter}
                className="px-6 py-2.5 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}

        {step === 'success' && executionResult && !registryResult && (
          <div className="bg-white dark:bg-surface-container-low rounded-3xl p-8 sm:p-12 border border-outline-variant/50 shadow-lg space-y-8 max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold font-headline text-on-surface dark:text-white">
                Excel Data Ingested Successfully!
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto">
                All cooperative member profiles, share capital balances, active/historical loans, and payment allocations have been synchronized into the cooperative database.
              </p>
            </div>

            {/* Ingestion Report Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-surface-container border border-outline-variant/40">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Members Synchronized
                </div>
                <div className="text-xl font-bold text-on-surface dark:text-white mt-1">
                  {executionResult.membersCreated + executionResult.membersUpdated}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">
                  {executionResult.membersCreated} created, {executionResult.membersUpdated} updated
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-surface-container border border-outline-variant/40">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Share Capital Deposits
                </div>
                <div className="text-xl font-bold text-on-surface dark:text-white mt-1">
                  {executionResult.shareDepositsCreated}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">Ledger entries posted</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-surface-container border border-outline-variant/40">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Loan Applications
                </div>
                <div className="text-xl font-bold text-on-surface dark:text-white mt-1">
                  {executionResult.loansCreated}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  {executionResult.schedulesCreated} schedules generated
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-surface-container border border-outline-variant/40 col-span-2 sm:col-span-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Payment History Ingested
                </div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {executionResult.paymentsCreated} Verified Transactions
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  Allocated to installment amortizations with audit trail logs.
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-outline-variant/40">
              <Link
                href="/dashboard/members"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all"
              >
                <Users className="w-4 h-4" />
                View Members Roster
              </Link>
              <Link
                href="/dashboard/loans"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-white dark:bg-surface-container-low border border-outline-variant/60 text-neutral-800 dark:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
              >
                <Banknote className="w-4 h-4" />
                View Loan Accounts
              </Link>
              <button
                onClick={resetImporter}
                className="px-5 py-2.5 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                Import Another Sheet
              </button>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-container-low rounded-3xl p-6 sm:p-8 max-w-md w-full border border-outline-variant/50 shadow-2xl space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-secondary/15 flex items-center justify-center text-primary dark:text-secondary mx-auto">
                <FileCheck className="w-7 h-7" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg sm:text-xl font-bold font-headline text-on-surface dark:text-white">
                  Confirm Database Ingestion
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  You are about to commit <strong>{summary?.totalParsedMembers} member accounts</strong>,{' '}
                  <strong>{summary?.totalShareCapitalDeposits} share capital records</strong>, and{' '}
                  <strong>{summary?.totalLoans} loan applications</strong> into the system.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-surface-container text-xs space-y-2 border border-outline-variant/40">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Members to Ingest:</span>
                  <span className="font-bold text-emerald-600">{summary?.newMembersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Existing Accounts Linked:</span>
                  <span className="font-bold text-amber-600">{summary?.existingMembersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Share Capital Volume:</span>
                  <span className="font-bold">
                    ₱{summary?.totalShareCapitalSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Loan Amount:</span>
                  <span className="font-bold">
                    ₱{summary?.totalLoanAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteImport}
                  className="flex-1 py-2.5 text-xs font-bold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all"
                >
                  Proceed & Commit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GUIDE MODAL */}
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-container-low rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-outline-variant/50 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
                <h3 className="text-lg font-bold font-headline text-on-surface dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary dark:text-secondary" />
                  Excel Format Guide & Mappings
                </h3>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs space-y-4 text-neutral-600 dark:text-neutral-300">
                <p>
                  This importer is configured to parse cooperative ledger workbooks like{' '}
                  <code className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono">
                    INDIVIDUAL LOAN & INVESTMENT ACCOUNTS.xlsx
                  </code>
                  .
                </p>

                <div className="space-y-2">
                  <h4 className="font-bold text-on-surface dark:text-white uppercase tracking-wider text-[11px]">
                    Expected Structure:
                  </h4>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                      <strong>Sheet Tabs:</strong> Each sheet tab should represent an individual member name in{' '}
                      <code>LASTNAME, FIRSTNAME</code> or <code>FIRSTNAME LASTNAME</code> format. Summary tabs like <code>SUM-SC</code> are automatically skipped.
                    </li>
                    <li>
                      <strong>Columns A–C (Shared Capital):</strong> Col A = Deposit Date, Col B = Invoice/LAF No, Col C = Shared Capital Amount.
                    </li>
                    <li>
                      <strong>Columns D–I (Loan Details):</strong> Col D = Date, Col E = LAF No, Col F = Amount Loaned, Col G = Mode (e.g. SD), Col H = Terms (months), Col I = End of Term.
                    </li>
                    <li>
                      <strong>Columns J–M (Amortization):</strong> Col J = Interest, Col K = Principal, Col L = Monthly Due, Col M = Fines.
                    </li>
                    <li>
                      <strong>Columns N–R (Repayment Receipts):</strong> Col N = Amount Paid, Col O = Balance, Col P = Principal Loan Balance, Col Q = Invoice No, Col R = Date Paid.
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-primary/5 dark:bg-secondary/10 border border-primary/20 dark:border-secondary/20 text-neutral-700 dark:text-neutral-300">
                  <div className="font-bold flex items-center gap-1.5 text-primary dark:text-secondary mb-1">
                    <ShieldCheck className="w-4 h-4" /> Non-Destructive Ingestion
                  </div>
                  Data ingestion uses safe PostgreSQL transactions. If an error occurs, changes are rolled back. Re-importing the same sheet will update running balances without creating duplicate payments or duplicate loans.
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="px-5 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
