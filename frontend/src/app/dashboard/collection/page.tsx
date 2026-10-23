'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import InvoiceArExcelImportModal from '@/components/collection/InvoiceArExcelImportModal';
import CollectionReceiptPrint from '@/components/collection/CollectionReceiptPrint';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  HandCoins,
  CreditCard,
  ShoppingBag,
  Wrench,
  Layers,
  Search,
  Plus,
  Printer,
  Download,
  ArrowUpDown,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Receipt,
  DollarSign,
  Clock,
  Sparkles,
  ChevronDown,
  RefreshCw,
  Trash2,
  Eye,
  Check,
  AlertCircle,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Edit3,
  Lock,
  Loader2
} from 'lucide-react';

export type CollectionTab = 'all' | 'credit' | 'sales_services';

export interface TabConfig {
  id: CollectionTab;
  label: string;
  description: string;
}

export const COLLECTION_TABS: TabConfig[] = [
  { id: 'all', label: 'All Collections', description: 'Consolidated master collection registry across all revenue categories' },
  { id: 'credit', label: 'Credit', description: 'Daily member loan amortizations, credit repayments, share capital & deposits' },
  { id: 'sales_services', label: 'Sales & Services', description: 'Itemized merchandise sales, uniforms, store inventory, photocopying, and printing services' },
];

export interface CollectionLoanPayment {
  loan_account: string;
  principal_amount?: number;
  interest_account: string;
  interest_amount?: number;
  fines_account: string;
  fines_amount?: number;
}

export interface FormLoanEntry {
  id: string;
  loan_account: string;
  principal_amount: string;
  interest_account: string;
  interest_amount: string;
  fines_account: string;
  fines_amount: string;
}

export interface CollectionItem {
  id: string;
  tab: 'credit' | 'sales' | 'services' | 'sales_services' | 'others';
  date: string;
  or_no: string;
  payor_name: string;
  member_id?: string;
  // Credit specific
  loans?: CollectionLoanPayment[];
  loan_account?: string;
  principal_amount?: number;
  interest_account?: string;
  interest_amount?: number;
  fines_account?: string;
  fines_amount?: number;
  common_share_amount?: number;
  // Sales specific (itemized)
  item_name?: string;
  item_category?: string;
  quantity?: number;
  unit_price?: number;
  // Services specific
  service_type?: string;
  service_copies?: number;
  service_rate?: number;
  // Others specific
  particulars?: string;
  other_category?: string;
  // General
  amount: number;
  payment_method: PaymentMethod;
  reference_no?: string;
  bank_name?: string;
  status?: 'completed' | 'on process' | 'filed';
  remarks?: string;
  collected_by: string;
}

export type PaymentMethod = 'Cash' | 'GCash' | 'Bank Transfer' | 'Cheque' | 'Cash in Vault' | 'Check' | 'Payroll Deduction';

export const BANK_OPTIONS: SelectOption[] = [
  { value: 'BDO Unibank', label: 'BDO Unibank' },
  { value: 'Bank of the Philippine Islands (BPI)', label: 'Bank of the Philippine Islands (BPI)' },
  { value: 'Metrobank', label: 'Metrobank' },
  { value: 'Land Bank of the Philippines (LBP)', label: 'Land Bank of the Philippines (LBP)' },
  { value: 'Philippine National Bank (PNB)', label: 'Philippine National Bank (PNB)' },
  { value: 'China Banking Corporation', label: 'China Banking Corporation' },
  { value: 'Security Bank', label: 'Security Bank' },
  { value: 'Rizal Commercial Banking Corp (RCBC)', label: 'Rizal Commercial Banking Corp (RCBC)' },
  { value: 'Union Bank of the Philippines', label: 'Union Bank of the Philippines' },
  { value: 'Development Bank of the Philippines (DBP)', label: 'Development Bank of the Philippines (DBP)' },
  { value: 'EastWest Bank', label: 'EastWest Bank' },
  { value: 'PSBank', label: 'PSBank' },
  { value: 'Asia United Bank (AUB)', label: 'Asia United Bank (AUB)' },
  { value: 'Robinsons Bank', label: 'Robinsons Bank' },
  { value: 'Other Bank', label: 'Other Bank (Specify...)' },
];

export const CASHIER_OPTIONS: SelectOption[] = [
  { value: 'CHINNETTE A. LAMOSTE', label: 'CHINNETTE A. LAMOSTE' },
  { value: 'VANESSA MAE A. MONDRANO', label: 'VANESSA MAE A. MONDRANO' },
];

export const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: 'Cash', label: 'Cash' },
  { value: 'GCash', label: 'GCash' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Cash in Vault', label: 'Cash in Vault' },
];

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export const LOANS_PAYABLE_OPTIONS: SelectOption[] = [
  { value: 'Loans Payable - Salary', label: 'Loans Payable - Salary' },
  { value: 'Loans Payable - Project', label: 'Loans Payable - Project' },
  { value: 'Loans Payable - Product', label: 'Loans Payable - Product' },
  { value: 'Loans Payable - Calamity Loan', label: 'Loans Payable - Calamity Loan' },
  { value: 'Loans Payable - Mortuary Loan (Columbary Loan)', label: 'Loans Payable - Mortuary Loan (Columbary Loan)' },
  { value: 'Loans Payable - Cash Express', label: 'Loans Payable - Cash Express' },
  { value: 'Loans Payable - Emergency', label: 'Loans Payable - Emergency' },
  { value: 'Loans Payable - Special Occasion', label: 'Loans Payable - Special Occasion' },
  { value: 'Loans Payable - Utility', label: 'Loans Payable - Utility' },
];

export const INTEREST_RECEIVED_OPTIONS: SelectOption[] = [
  { value: 'Interest Received - Salary', label: 'Interest Received - Salary' },
  { value: 'Interest Received - Project', label: 'Interest Received - Project' },
  { value: 'Interest Received - Product', label: 'Interest Received - Product' },
  { value: 'Interest Received - Calamity Loan', label: 'Interest Received - Calamity Loan' },
  { value: 'Interest Received - Mortuary Loan (Columbary Loan)', label: 'Interest Received - Mortuary Loan (Columbary Loan)' },
  { value: 'Interest Received - Cash Express', label: 'Interest Received - Cash Express' },
  { value: 'Interest Received - Emergency', label: 'Interest Received - Emergency' },
  { value: 'Interest Received - Special Occasion', label: 'Interest Received - Special Occasion' },
  { value: 'Interest Received - Utility', label: 'Interest Received - Utility' },
];

export const FINES_OPTIONS: SelectOption[] = [
  { value: 'Fines - Salary', label: 'Fines - Salary' },
  { value: 'Fines - Project', label: 'Fines - Project' },
  { value: 'Fines - Product', label: 'Fines - Product' },
  { value: 'Fines - Calamity Loan', label: 'Fines - Calamity Loan' },
  { value: 'Fines - Mortuary Loan (Columbary Loan)', label: 'Fines - Mortuary Loan (Columbary Loan)' },
  { value: 'Fines - Cash Express', label: 'Fines - Cash Express' },
  { value: 'Fines - Emergency', label: 'Fines - Emergency' },
  { value: 'Fines - Special Occasion', label: 'Fines - Special Occasion' },
  { value: 'Fines - Utility', label: 'Fines - Utility' },
];

export interface MemberOption {
  id: string;
  name: string;
  member_no: string;
}

interface AnimatedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
}

function AnimatedSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left',
  disabled = false,
}: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div
      ref={containerRef}
      className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`}
      data-dropdown-container
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-all duration-150 cursor-pointer outline-none ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-surface-container-lowest dark:bg-neutral-800 border-primary text-neutral-900 dark:text-white'
            : 'bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 hover:border-outline-variant text-neutral-900 dark:text-white'
        } ${buttonClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate ${selectedOption || value ? '' : 'text-neutral-400 font-normal'}`}>
          {selectedOption ? selectedOption.label : (value || placeholder)}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 text-neutral-400 transition-transform duration-200 ease-out ${
            isOpen ? 'rotate-180 text-primary dark:text-secondary' : ''
          }`}
        />
      </button>

      <div
        className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} min-w-full w-max max-w-md mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-neutral-800 border border-outline-variant/60 shadow-2xl py-1 custom-scrollbar transition-all duration-200 ease-out origin-top ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        } ${menuClassName}`}
      >
        {options.map(opt => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-secondary font-bold'
                  : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'
              }`}
            >
              <div className="flex flex-col">
                <span>{opt.label}</span>
                {opt.description && (
                  <span className="text-[10px] text-neutral-400 font-normal truncate">{opt.description}</span>
                )}
              </div>
              {isSelected && (
                <Check className="w-3.5 h-3.5 flex-shrink-0 text-primary dark:text-secondary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CollectionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Role Guard: Staff & Admin Only
  const isAdmin = user?.role === 'admin';
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

  useEffect(() => {
    if (!authLoading && user && !isAdminOrStaff) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdminOrStaff, router]);

  // Active Tab: Defaults to 'all' for consolidated overview, identical to Disbursement
  const [activeTab, setActiveTab] = useState<CollectionTab>('all');
  const currentTabConfig = COLLECTION_TABS.find(t => t.id === activeTab) || COLLECTION_TABS[0];

  // Stored collections with server database integration
  const [collections, setCollections] = useState<CollectionItem[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('uc_coop_collections');
      if (stored) {
        try {
          const parsed: CollectionItem[] = JSON.parse(stored);
          return parsed
            .filter(item => !item.id.startsWith('col-'))
            .map(item => {
              if (item.tab === 'others') {
                return { ...item, tab: 'credit' as const };
              }
              return item;
            });
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [loadingCollections, setLoadingCollections] = useState(true);

  // Fetch collections from server with seamless auto-sync from localStorage if server is empty
  const fetchCollections = async () => {
    try {
      setLoadingCollections(true);
      const res = await api.get('/collections');
      const serverItems: CollectionItem[] = res.data?.data || [];

      // Check if local storage has existing collections that need migrating to cloud DB
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('uc_coop_collections');
        if (stored) {
          try {
            const localItems: CollectionItem[] = JSON.parse(stored);
            const validLocal = localItems
              .filter(item => !item.id.startsWith('col-'))
              .map(item => item.tab === 'others' ? { ...item, tab: 'credit' as const } : item);

            // Auto-sync existing local receipts to cloud DB if server has 0 items
            if (validLocal.length > 0 && serverItems.length === 0) {
              const syncRes = await api.post('/collections/bulk', { items: validLocal, mode: 'append' });
              const syncedItems: CollectionItem[] = syncRes.data?.data || validLocal;
              setCollections(syncedItems);
              localStorage.setItem('uc_coop_collections', JSON.stringify(syncedItems));
              setActionFeedback({ type: 'success', message: `Synced ${syncedItems.length} collection receipts to cloud database.` });
              setTimeout(() => setActionFeedback(null), 4000);
              return;
            }
          } catch (err) {
            console.error('Error parsing local collection cache:', err);
          }
        }
      }

      setCollections(serverItems);
      if (typeof window !== 'undefined') {
        localStorage.setItem('uc_coop_collections', JSON.stringify(serverItems));
      }
    } catch (err: any) {
      console.error('Failed to load collections from server:', err);
      // Fallback to local storage if network error
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('uc_coop_collections');
        if (stored) {
          try {
            setCollections(JSON.parse(stored));
          } catch {}
        }
      }
    } finally {
      setLoadingCollections(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && collections.length > 0) {
      localStorage.setItem('uc_coop_collections', JSON.stringify(collections));
    }
  }, [collections]);

  // Filter & Toolbar States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isCustomBank, setIsCustomBank] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [isExpandedAll, setIsExpandedAll] = useState(false);

  // Selected item for detail view modal
  const [selectedItemForModal, setSelectedItemForModal] = useState<CollectionItem | null>(null);

  // Edit & Seal/File Modal States (Admin Only)
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isEditCustomBank, setIsEditCustomBank] = useState(false);
  const [isEditMemberDropdownOpen, setIsEditMemberDropdownOpen] = useState(false);
  const editMemberComboboxRef = useRef<HTMLDivElement>(null);

  // Item currently being printed as an Acknowledgement Receipt
  const [printingReceipt, setPrintingReceipt] = useState<CollectionItem | null>(null);

  const handlePrintReceipt = (item: CollectionItem) => {
    setPrintingReceipt(item);
    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup);
      setTimeout(() => setPrintingReceipt(null), 300);
    };
    window.addEventListener('afterprint', cleanup);
    // Give React a moment to mount the print portal (and load the logo) before printing
    setTimeout(() => window.print(), 300);
  };

  // Current user display name
  const currentUserDisplayName = user?.profile?.first_name
    ? `${user.profile.first_name} ${user.profile.last_name || ''}`.trim()
    : (user?.username || 'Chinnette Lamoste');

  // Modals state
  const [mounted, setMounted] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CollectionItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isSealModalOpen, setIsSealModalOpen] = useState(false);

  // Pre-loaded members list for Member Name dropdown & automatic Member ID
  const [membersList, setMembersList] = useState<MemberOption[]>([]);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const memberComboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch members list on mount & when collections change
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await api.get('/members');
        const data = res.data?.data || [];
        const mapped: MemberOption[] = data.map((m: any) => {
          const fullName = `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.name || m.full_name || 'Member';
          return {
            id: String(m.id),
            name: fullName,
            member_no: m.member_no || m.member_id || '',
          };
        });

        // Also merge any existing members recorded in collections if not already in list
        collections.forEach(col => {
          if (col.payor_name && !mapped.some(m => m.name.toLowerCase() === col.payor_name.toLowerCase())) {
            mapped.push({
              id: `col-${col.payor_name}`,
              name: col.payor_name,
              member_no: col.member_id || '',
            });
          }
        });

        setMembersList(mapped);
      } catch (err) {
        console.error('Failed to load members from api:', err);
        const fallback: MemberOption[] = [];
        collections.forEach(col => {
          if (col.payor_name && !fallback.some(m => m.name.toLowerCase() === col.payor_name.toLowerCase())) {
            fallback.push({
              id: `col-${col.payor_name}`,
              name: col.payor_name,
              member_no: col.member_id || '',
            });
          }
        });
        setMembersList(fallback);
      }
    };
    fetchMembers();
  }, [collections]);

  // Click outside to close member dropdown
  useEffect(() => {
    if (!isMemberDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (memberComboboxRef.current && !memberComboboxRef.current.contains(e.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMemberDropdownOpen]);

  // Click outside to close edit member dropdown
  useEffect(() => {
    if (!isEditMemberDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (editMemberComboboxRef.current && !editMemberComboboxRef.current.contains(e.target as Node)) {
        setIsEditMemberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditMemberDropdownOpen]);

  // Form Data for adding a new collection
  const [formData, setFormData] = useState({
    tab: 'credit' as 'credit' | 'sales_services',
    sales_service_type: 'merchandise' as 'merchandise' | 'service',
    date: new Date().toISOString().split('T')[0],
    or_no: '',
    payor_name: '',
    member_id: '',
    // Credit Multi-Loan
    loans: [
      {
        id: 'loan-1',
        loan_account: 'Loans Payable - Salary',
        principal_amount: '',
        interest_account: 'Interest Received - Salary',
        interest_amount: '',
        fines_account: 'Fines - Salary',
        fines_amount: '',
      }
    ] as FormLoanEntry[],
    loan_account: 'Loans Payable - Salary',
    principal_amount: '',
    interest_account: 'Interest Received - Salary',
    interest_amount: '',
    fines_account: 'Fines - Salary',
    fines_amount: '',
    common_share_amount: '',
    // Sales
    item_name: '',
    item_category: 'Uniform',
    quantity: '1',
    unit_price: '',
    // Services
    service_type: 'Photocopying Services',
    service_copies: '1',
    service_rate: '',
    // Common
    amount: '',
    payment_method: 'Cash' as PaymentMethod,
    reference_no: '',
    bank_name: '',
    status: 'completed' as 'completed' | 'on process',
    remarks: '',
    collected_by: 'CHINNETTE A. LAMOSTE'
  });

  // Handler for updating a specific loan entry field and synchronizing interest/fines accounts
  const handleLoanFieldChange = (index: number, field: keyof FormLoanEntry, value: string) => {
    setFormData(prev => {
      const updatedLoans = prev.loans.map((loan, i) => {
        if (i !== index) return loan;
        if (field === 'loan_account') {
          const suffix = value.replace(/^Loans Payable\s*-\s*/, '');
          const matchingInterest = `Interest Received - ${suffix}`;
          const matchingFines = `Fines - ${suffix}`;
          return {
            ...loan,
            loan_account: value,
            interest_account: INTEREST_RECEIVED_OPTIONS.some(o => o.value === matchingInterest)
              ? matchingInterest
              : loan.interest_account,
            fines_account: FINES_OPTIONS.some(o => o.value === matchingFines)
              ? matchingFines
              : loan.fines_account,
          };
        }
        return { ...loan, [field]: value };
      });

      return {
        ...prev,
        loans: updatedLoans,
        loan_account: updatedLoans[0]?.loan_account || '',
        principal_amount: updatedLoans[0]?.principal_amount || '',
        interest_account: updatedLoans[0]?.interest_account || '',
        interest_amount: updatedLoans[0]?.interest_amount || '',
        fines_account: updatedLoans[0]?.fines_account || '',
        fines_amount: updatedLoans[0]?.fines_amount || '',
      };
    });
  };

  // Add another loan entry
  const handleAddLoan = () => {
    setFormData(prev => {
      const usedAccounts = prev.loans.map(l => l.loan_account);
      const nextOpt = LOANS_PAYABLE_OPTIONS.find(opt => !usedAccounts.includes(opt.value)) || LOANS_PAYABLE_OPTIONS[0];
      const suffix = nextOpt.value.replace(/^Loans Payable\s*-\s*/, '');
      const matchingInterest = `Interest Received - ${suffix}`;
      const matchingFines = `Fines - ${suffix}`;

      const newEntry: FormLoanEntry = {
        id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        loan_account: nextOpt.value,
        principal_amount: '',
        interest_account: matchingInterest,
        interest_amount: '',
        fines_account: matchingFines,
        fines_amount: '',
      };

      return {
        ...prev,
        loans: [...prev.loans, newEntry],
      };
    });
  };

  // Remove a loan entry
  const handleRemoveLoan = (index: number) => {
    setFormData(prev => {
      if (prev.loans.length <= 1) return prev;
      const updatedLoans = prev.loans.filter((_, i) => i !== index);
      return {
        ...prev,
        loans: updatedLoans,
        loan_account: updatedLoans[0]?.loan_account || '',
        principal_amount: updatedLoans[0]?.principal_amount || '',
        interest_account: updatedLoans[0]?.interest_account || '',
        interest_amount: updatedLoans[0]?.interest_amount || '',
        fines_account: updatedLoans[0]?.fines_account || '',
        fines_amount: updatedLoans[0]?.fines_amount || '',
      };
    });
  };

  // Legacy single loan handler for backward compatibility
  const handleLoanAccountChange = (val: string) => {
    handleLoanFieldChange(0, 'loan_account', val);
  };

  // Filtered members based on typed input
  const filteredMembers = useMemo(() => {
    const q = (formData.payor_name || '').toLowerCase().trim();
    if (!q) return membersList;
    return membersList.filter(
      m => m.name.toLowerCase().includes(q) || (m.member_no && m.member_no.toLowerCase().includes(q))
    );
  }, [membersList, formData.payor_name]);

  const handleMemberNameChange = (val: string) => {
    // Automatically match member ID if entered name matches an existing member
    const matched = membersList.find(m => m.name.toLowerCase() === val.trim().toLowerCase());
    setFormData(prev => ({
      ...prev,
      payor_name: val,
      member_id: matched ? (matched.member_no || prev.member_id) : prev.member_id,
    }));
    setIsMemberDropdownOpen(true);
  };

  const handleSelectMember = (member: MemberOption) => {
    setFormData(prev => ({
      ...prev,
      payor_name: member.name,
      member_id: member.member_no || '',
    }));
    setIsMemberDropdownOpen(false);
  };

  // Filtered members for Edit Modal
  const editFilteredMembers = useMemo(() => {
    const q = (editFormData?.payor_name || '').toLowerCase().trim();
    if (!q) return membersList;
    return membersList.filter(
      m => m.name.toLowerCase().includes(q) || (m.member_no && m.member_no.toLowerCase().includes(q))
    );
  }, [membersList, editFormData?.payor_name]);

  const handleEditMemberNameChange = (val: string) => {
    const matched = membersList.find(m => m.name.toLowerCase() === val.trim().toLowerCase());
    setEditFormData((prev: any) => ({
      ...prev,
      payor_name: val,
      member_id: matched ? (matched.member_no || prev?.member_id) : prev?.member_id,
    }));
    setIsEditMemberDropdownOpen(true);
  };

  const handleSelectEditMember = (member: MemberOption) => {
    setEditFormData((prev: any) => ({
      ...prev,
      payor_name: member.name,
      member_id: member.member_no || '',
    }));
    setIsEditMemberDropdownOpen(false);
  };

  // Open Edit & Seal/File Modal (Admin Only)
  const handleOpenEditModal = (item: CollectionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    let initialLoans: FormLoanEntry[] = [];
    if (item.loans && item.loans.length > 0) {
      initialLoans = item.loans.map((l, idx) => ({
        id: `edit-loan-${idx}-${Date.now()}`,
        loan_account: l.loan_account || 'Loans Payable - Salary',
        principal_amount: l.principal_amount ? String(l.principal_amount) : '',
        interest_account: l.interest_account || 'Interest Received - Salary',
        interest_amount: l.interest_amount ? String(l.interest_amount) : '',
        fines_account: l.fines_account || 'Fines - Salary',
        fines_amount: l.fines_amount ? String(l.fines_amount) : '',
      }));
    } else if (item.tab === 'credit') {
      initialLoans = [
        {
          id: `edit-loan-0-${Date.now()}`,
          loan_account: item.loan_account || 'Loans Payable - Salary',
          principal_amount: item.principal_amount ? String(item.principal_amount) : '',
          interest_account: item.interest_account || 'Interest Received - Salary',
          interest_amount: item.interest_amount ? String(item.interest_amount) : '',
          fines_account: item.fines_account || 'Fines - Salary',
          fines_amount: item.fines_amount ? String(item.fines_amount) : '',
        }
      ];
    } else {
      initialLoans = [
        {
          id: `edit-loan-0-${Date.now()}`,
          loan_account: 'Loans Payable - Salary',
          principal_amount: '',
          interest_account: 'Interest Received - Salary',
          interest_amount: '',
          fines_account: 'Fines - Salary',
          fines_amount: '',
        }
      ];
    }

    const isCustom = item.payment_method === 'Cheque' && item.bank_name
      ? !BANK_OPTIONS.some(b => b.value === item.bank_name)
      : false;
    setIsEditCustomBank(isCustom);

    const isService = item.tab === 'services' || (Boolean(item.service_type) && !item.item_name);
    setEditFormData({
      id: item.id,
      tab: (item.tab === 'sales' || item.tab === 'services') ? 'sales_services' : item.tab,
      sales_service_type: isService ? 'service' : 'merchandise',
      date: item.date ? item.date.split('T')[0] : new Date().toISOString().split('T')[0],
      or_no: item.or_no || '',
      payor_name: item.payor_name || '',
      member_id: item.member_id || '',
      loans: initialLoans,
      loan_account: item.loan_account || 'Loans Payable - Salary',
      principal_amount: item.principal_amount ? String(item.principal_amount) : '',
      interest_account: item.interest_account || 'Interest Received - Salary',
      interest_amount: item.interest_amount ? String(item.interest_amount) : '',
      fines_account: item.fines_account || 'Fines - Salary',
      fines_amount: item.fines_amount ? String(item.fines_amount) : '',
      common_share_amount: item.common_share_amount ? String(item.common_share_amount) : '',
      item_name: item.item_name || '',
      item_category: item.item_category || 'Uniform',
      quantity: item.quantity ? String(item.quantity) : '1',
      unit_price: item.unit_price ? String(item.unit_price) : '',
      service_type: item.service_type || 'Photocopying Services',
      service_copies: item.service_copies ? String(item.service_copies) : '1',
      service_rate: item.service_rate ? String(item.service_rate) : '',
      amount: item.amount ? String(item.amount) : '',
      payment_method: item.payment_method || 'Cash',
      reference_no: item.reference_no || '',
      bank_name: item.bank_name || '',
      status: item.status || 'completed',
      remarks: item.remarks || '',
      collected_by: item.collected_by || 'CHINNETTE A. LAMOSTE',
    });

    setEditingItem(item);
  };

  const handleEditLoanFieldChange = (index: number, field: keyof FormLoanEntry, val: string) => {
    setEditFormData((prev: any) => {
      const nextLoans = [...prev.loans];
      if (field === 'loan_account') {
        const suffix = val.replace(/^Loans Payable\s*-\s*/, '');
        const matchingInterest = `Interest Received - ${suffix}`;
        const matchingFines = `Fines - ${suffix}`;
        nextLoans[index] = {
          ...nextLoans[index],
          loan_account: val,
          interest_account: INTEREST_RECEIVED_OPTIONS.some(o => o.value === matchingInterest)
            ? matchingInterest
            : nextLoans[index].interest_account,
          fines_account: FINES_OPTIONS.some(o => o.value === matchingFines)
            ? matchingFines
            : nextLoans[index].fines_account,
        };
      } else {
        nextLoans[index] = { ...nextLoans[index], [field]: val };
      }
      return { ...prev, loans: nextLoans };
    });
  };

  const handleAddEditLoan = () => {
    setEditFormData((prev: any) => {
      const usedAccounts = (prev.loans || []).map((l: any) => l.loan_account);
      const nextOpt = LOANS_PAYABLE_OPTIONS.find(opt => !usedAccounts.includes(opt.value)) || LOANS_PAYABLE_OPTIONS[0];
      const suffix = nextOpt.value.replace(/^Loans Payable\s*-\s*/, '');
      const matchingInterest = `Interest Received - ${suffix}`;
      const matchingFines = `Fines - ${suffix}`;

      return {
        ...prev,
        loans: [
          ...prev.loans,
          {
            id: `edit-loan-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            loan_account: nextOpt.value,
            principal_amount: '',
            interest_account: matchingInterest,
            interest_amount: '',
            fines_account: matchingFines,
            fines_amount: '',
          }
        ]
      };
    });
  };

  const handleRemoveEditLoan = (index: number) => {
    setEditFormData((prev: any) => {
      if (prev.loans.length <= 1) return prev;
      return {
        ...prev,
        loans: prev.loans.filter((_: any, i: number) => i !== index),
      };
    });
  };

  // Update or Seal & File collection
  const handleUpdateCollection = async (markAsFiled: boolean = false) => {
    if (!editFormData || !editingItem) return;

    if (editingItem.status === 'filed') {
      setActionFeedback({ type: 'error', message: 'Filed collection entries are permanently locked and cannot be edited.' });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }

    // Validate Cheque fields
    if (editFormData.payment_method === 'Cheque') {
      if (!editFormData.reference_no?.trim()) {
        setActionFeedback({ type: 'error', message: 'Cheque number is required for Cheque payments.' });
        setTimeout(() => setActionFeedback(null), 4000);
        return;
      }
      if (!editFormData.bank_name?.trim() || editFormData.bank_name === 'Other Bank') {
        setActionFeedback({ type: 'error', message: 'Please select or specify the issuing bank.' });
        setTimeout(() => setActionFeedback(null), 4000);
        return;
      }
    }

    let calculatedAmount = parseFloat(editFormData.amount || '0') || 0;

    let savedLoans: CollectionLoanPayment[] = [];
    if (editFormData.tab === 'credit') {
      const loansSum = (editFormData.loans || []).reduce((acc: number, l: FormLoanEntry) => {
        return acc + (parseFloat(l.principal_amount || '0') || 0) +
                     (parseFloat(l.interest_amount || '0') || 0) +
                     (parseFloat(l.fines_amount || '0') || 0);
      }, 0);
      const cs = parseFloat(editFormData.common_share_amount || '0') || 0;
      if (loansSum + cs > 0) calculatedAmount = loansSum + cs;

      savedLoans = (editFormData.loans || [])
        .map((l: FormLoanEntry) => ({
          loan_account: l.loan_account,
          principal_amount: parseFloat(l.principal_amount || '0') || undefined,
          interest_account: l.interest_account,
          interest_amount: parseFloat(l.interest_amount || '0') || undefined,
          fines_account: l.fines_account,
          fines_amount: parseFloat(l.fines_amount || '0') || undefined,
        }))
        .filter((l: CollectionLoanPayment) => (l.principal_amount || 0) > 0 || (l.interest_amount || 0) > 0 || (l.fines_amount || 0) > 0);
    } else if (editFormData.tab === 'sales' || editFormData.tab === 'sales_services') {
      if (editFormData.sales_service_type === 'service' || (!editFormData.item_name && editFormData.service_type)) {
        const c = parseInt(editFormData.service_copies || '1', 10) || 1;
        const r = parseFloat(editFormData.service_rate || '0') || 0;
        if (r > 0) calculatedAmount = c * r;
      } else {
        const q = parseInt(editFormData.quantity || '1', 10) || 1;
        const u = parseFloat(editFormData.unit_price || '0') || 0;
        if (u > 0) calculatedAmount = q * u;
      }
    } else if (editFormData.tab === 'services') {
      const c = parseInt(editFormData.service_copies || '1', 10) || 1;
      const r = parseFloat(editFormData.service_rate || '0') || 0;
      if (r > 0) calculatedAmount = c * r;
    }

    const payload: Partial<CollectionItem> = {
      tab: editFormData.tab,
      date: editFormData.date,
      or_no: editFormData.or_no.trim(),
      payor_name: editFormData.payor_name.trim(),
      member_id: editFormData.member_id?.trim() || undefined,
      loans: savedLoans.length > 0 ? savedLoans : undefined,
      loan_account: savedLoans[0]?.loan_account || editFormData.loan_account,
      principal_amount: savedLoans.length > 0 ? (savedLoans.reduce((sum, l) => sum + (l.principal_amount || 0), 0) || undefined) : undefined,
      interest_account: savedLoans[0]?.interest_account || editFormData.interest_account,
      interest_amount: savedLoans.length > 0 ? (savedLoans.reduce((sum, l) => sum + (l.interest_amount || 0), 0) || undefined) : undefined,
      fines_account: savedLoans[0]?.fines_account || editFormData.fines_account,
      fines_amount: savedLoans.length > 0 ? (savedLoans.reduce((sum, l) => sum + (l.fines_amount || 0), 0) || undefined) : undefined,
      common_share_amount: parseFloat(editFormData.common_share_amount || '0') || undefined,
      item_name: (editFormData.tab === 'sales_services' && editFormData.sales_service_type === 'service')
        ? undefined
        : (editFormData.item_name?.trim() || undefined),
      item_category: (editFormData.tab === 'sales_services' && editFormData.sales_service_type === 'service')
        ? undefined
        : (editFormData.item_category?.trim() || undefined),
      quantity: (editFormData.tab === 'sales_services' && editFormData.sales_service_type === 'service')
        ? undefined
        : (parseInt(editFormData.quantity || '1', 10) || undefined),
      unit_price: (editFormData.tab === 'sales_services' && editFormData.sales_service_type === 'service')
        ? undefined
        : (parseFloat(editFormData.unit_price || '0') || undefined),
      service_type: (editFormData.tab === 'sales_services' && editFormData.sales_service_type === 'merchandise')
        ? undefined
        : (editFormData.service_type || undefined),
      service_copies: (editFormData.tab === 'sales_services' && editFormData.sales_service_type === 'merchandise')
        ? undefined
        : (parseInt(editFormData.service_copies || '1', 10) || undefined),
      service_rate: (editFormData.tab === 'sales_services' && editFormData.sales_service_type === 'merchandise')
        ? undefined
        : (parseFloat(editFormData.service_rate || '0') || undefined),
      particulars: editFormData.tab === 'credit'
        ? (() => {
            const parts: string[] = [];
            for (const l of savedLoans) {
              if (l.principal_amount && l.principal_amount > 0) parts.push(l.loan_account);
              if (l.interest_amount && l.interest_amount > 0) parts.push(l.interest_account);
              if (l.fines_amount && l.fines_amount > 0) parts.push(l.fines_account);
            }
            if (parseFloat(editFormData.common_share_amount || '0') > 0) parts.push('Common Share');
            return parts.length > 0 ? parts.join(' + ') : (editFormData.loans?.[0]?.loan_account || 'Credit Collection');
          })()
        : editFormData.tab === 'sales_services'
        ? (editFormData.sales_service_type === 'service' ? (editFormData.service_type || 'Services') : (editFormData.item_name || 'Store Sales'))
        : editFormData.particulars || undefined,
      amount: calculatedAmount,
      payment_method: editFormData.payment_method,
      reference_no: (editFormData.payment_method === 'GCash' || editFormData.payment_method === 'Bank Transfer' || editFormData.payment_method === 'Cheque')
        ? editFormData.reference_no?.trim() || undefined
        : undefined,
      bank_name: editFormData.payment_method === 'Cheque' ? editFormData.bank_name?.trim() || undefined : undefined,
      status: markAsFiled ? 'filed' : (editFormData.status || 'completed'),
      remarks: editFormData.remarks?.trim() || undefined,
      collected_by: editFormData.collected_by?.trim() || 'CHINNETTE A. LAMOSTE',
    };

    setIsSavingEdit(true);
    try {
      const res = await api.put(`/collections/${editFormData.id}`, payload);
      const updated: CollectionItem = res.data?.data || { ...editingItem, ...payload };
      setCollections(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditingItem(null);
      setEditFormData(null);
      setIsSealModalOpen(false);
      if (selectedItemForModal?.id === updated.id) {
        setSelectedItemForModal(updated);
      }
      setActionFeedback({
        type: 'success',
        message: markAsFiled
          ? `Collection receipt #${updated.or_no} is now sealed & filed (locked).`
          : `Collection receipt #${updated.or_no} updated successfully.`
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to update collection entry:', err);
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.error?.message || 'Failed to update collection receipt.'
      });
      setTimeout(() => setActionFeedback(null), 5000);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filtered and Sorted Collections
  const filteredCollections = useMemo(() => {
    let result = collections.filter(item => {
      // Tab filter
      if (activeTab !== 'all') {
        if (activeTab === 'sales_services') {
          if (item.tab !== 'sales_services' && item.tab !== 'sales' && item.tab !== 'services') return false;
        } else if (item.tab !== activeTab) {
          return false;
        }
      }

      // Method filter
      if (selectedMethod !== 'all' && item.payment_method !== selectedMethod) return false;

      // Status filter
      if (selectedStatus !== 'all') {
        const itemStat = item.status || 'completed';
        if (itemStat !== selectedStatus) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesOr = item.or_no.toLowerCase().includes(q);
        const matchesName = item.payor_name.toLowerCase().includes(q);
        const matchesRemarks = item.remarks?.toLowerCase().includes(q) || false;
        const matchesItem = item.item_name?.toLowerCase().includes(q) || false;
        const matchesAccount = item.loan_account?.toLowerCase().includes(q) || false;
        const matchesInterest = item.interest_account?.toLowerCase().includes(q) || false;
        const matchesFines = item.fines_account?.toLowerCase().includes(q) || false;
        const matchesService = item.service_type?.toLowerCase().includes(q) || false;
        const matchesParticulars = item.particulars?.toLowerCase().includes(q) || false;
        if (!matchesOr && !matchesName && !matchesRemarks && !matchesItem && !matchesAccount && !matchesInterest && !matchesFines && !matchesService && !matchesParticulars) {
          return false;
        }
      }

      return true;
    });

    // Sorting by date & receipt number
    result.sort((a, b) => {
      const cmpDate = b.date.localeCompare(a.date);
      if (cmpDate !== 0) return sortOrder === 'desc' ? cmpDate : -cmpDate;
      return sortOrder === 'desc' ? b.or_no.localeCompare(a.or_no) : a.or_no.localeCompare(b.or_no);
    });

    return result;
  }, [collections, activeTab, selectedMethod, selectedStatus, searchQuery, sortOrder]);

  // Tab Stats for 4 KPI Cards (Calculated over current tab's scope or all)
  const tabStats = useMemo(() => {
    const scopeItems = activeTab === 'all'
      ? collections
      : activeTab === 'sales_services'
      ? collections.filter(c => c.tab === 'sales_services' || c.tab === 'sales' || c.tab === 'services')
      : collections.filter(c => c.tab === activeTab);
    const count = scopeItems.length;
    const totalAmount = scopeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const avgAmount = count > 0 ? totalAmount / count : 0;
    const maxAmount = count > 0 ? Math.max(...scopeItems.map(i => i.amount || 0)) : 0;

    return {
      count,
      totalAmount,
      avgAmount,
      maxAmount
    };
  }, [collections, activeTab]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedMethod, selectedStatus, sortOrder, itemsPerPage]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredCollections.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedCollections = isExpandedAll
    ? filteredCollections
    : filteredCollections.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  // Selection handlers: Filed items cannot be selected for deletion
  const toggleSelectAll = () => {
    const pageItems = (isExpandedAll ? filteredCollections : paginatedCollections).filter(c => c.status !== 'filed');
    const pageIds = pageItems.map(c => c.id);
    if (pageIds.length === 0) return;
    const allPageSelected = pageIds.every(id => selectedIds.includes(id));
    if (allPageSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: string) => {
    const item = collections.find(c => c.id === id);
    if (item?.status === 'filed') return;
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  // Open Add Modal with auto-generated receipt number
  const openRecordModal = async () => {
    const targetCategory = (activeTab === 'all' ? 'credit' : activeTab) as 'credit' | 'sales_services';

    // Instant optimistic calculation from loaded collections
    const maxLocalNo = collections.reduce((max, c) => {
      const clean = (c.or_no || '').replace(/\D/g, '');
      const n = parseInt(clean, 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    const initialNo = maxLocalNo > 0 ? String(maxLocalNo + 1) : '1001';

    setFormData({
      tab: targetCategory,
      sales_service_type: 'merchandise',
      date: new Date().toISOString().split('T')[0],
      or_no: initialNo,
      payor_name: '',
      member_id: '',
      loans: [
        {
          id: `loan-${Date.now()}`,
          loan_account: 'Loans Payable - Salary',
          principal_amount: '',
          interest_account: 'Interest Received - Salary',
          interest_amount: '',
          fines_account: 'Fines - Salary',
          fines_amount: '',
        }
      ],
      loan_account: 'Loans Payable - Salary',
      principal_amount: '',
      interest_account: 'Interest Received - Salary',
      interest_amount: '',
      fines_account: 'Fines - Salary',
      fines_amount: '',
      common_share_amount: '',
      item_name: '',
      item_category: 'Uniform',
      quantity: '1',
      unit_price: '',
      service_type: 'Photocopying Services',
      service_copies: '1',
      service_rate: '',
      amount: '',
      payment_method: 'Cash',
      reference_no: '',
      bank_name: '',
      status: 'completed',
      remarks: '',
      collected_by: 'CHINNETTE A. LAMOSTE'
    });
    setIsCustomBank(false);
    setIsAddModalOpen(true);

    // Fetch authoritative sequence from server to guarantee sync with other staff
    try {
      const res = await api.get('/collections/next-receipt-no');
      if (res.data?.data?.next_receipt_no) {
        setFormData(prev => ({ ...prev, or_no: String(res.data.data.next_receipt_no) }));
      }
    } catch (err) {
      console.warn('Failed to fetch authoritative next receipt number:', err);
    }
  };

  // Save new collection
  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    let calculatedAmount = parseFloat(formData.amount || '0') || 0;

    if (formData.tab === 'credit') {
      const loansSum = formData.loans.reduce((acc, l) => {
        return acc + (parseFloat(l.principal_amount || '0') || 0) +
                     (parseFloat(l.interest_amount || '0') || 0) +
                     (parseFloat(l.fines_amount || '0') || 0);
      }, 0);
      const cs = parseFloat(formData.common_share_amount || '0') || 0;
      if (loansSum + cs > 0) calculatedAmount = loansSum + cs;
    } else if (formData.tab === 'sales_services' || (formData.tab as any) === 'sales') {
      if (formData.sales_service_type === 'service') {
        const c = parseInt(formData.service_copies || '1', 10) || 1;
        const r = parseFloat(formData.service_rate || '0') || 0;
        if (r > 0) calculatedAmount = c * r;
      } else {
        const q = parseInt(formData.quantity || '1', 10) || 1;
        const u = parseFloat(formData.unit_price || '0') || 0;
        if (u > 0) calculatedAmount = q * u;
      }
    } else if ((formData.tab as any) === 'services') {
      const c = parseInt(formData.service_copies || '1', 10) || 1;
      const r = parseFloat(formData.service_rate || '0') || 0;
      if (r > 0) calculatedAmount = c * r;
    }

    const savedLoans: CollectionLoanPayment[] = formData.loans
      .map(l => ({
        loan_account: l.loan_account,
        principal_amount: parseFloat(l.principal_amount || '0') || undefined,
        interest_account: l.interest_account,
        interest_amount: parseFloat(l.interest_amount || '0') || undefined,
        fines_account: l.fines_account,
        fines_amount: parseFloat(l.fines_amount || '0') || undefined,
      }))
      .filter(l => (l.principal_amount || 0) > 0 || (l.interest_amount || 0) > 0 || (l.fines_amount || 0) > 0);

    const newItem: CollectionItem = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tab: formData.tab,
      date: formData.date,
      or_no: formData.or_no.trim(),
      payor_name: formData.payor_name.trim(),
      member_id: formData.member_id.trim() || undefined,
      loans: savedLoans.length > 0 ? savedLoans : undefined,
      loan_account: savedLoans[0]?.loan_account,
      principal_amount: savedLoans.length > 0 ? (savedLoans.reduce((sum, l) => sum + (l.principal_amount || 0), 0) || undefined) : undefined,
      interest_account: savedLoans[0]?.interest_account,
      interest_amount: savedLoans.length > 0 ? (savedLoans.reduce((sum, l) => sum + (l.interest_amount || 0), 0) || undefined) : undefined,
      fines_account: savedLoans[0]?.fines_account,
      fines_amount: savedLoans.length > 0 ? (savedLoans.reduce((sum, l) => sum + (l.fines_amount || 0), 0) || undefined) : undefined,
      common_share_amount: parseFloat(formData.common_share_amount || '0') || undefined,
      item_name: (formData.tab === 'sales_services' && formData.sales_service_type === 'service')
        ? undefined
        : (formData.item_name.trim() || undefined),
      item_category: (formData.tab === 'sales_services' && formData.sales_service_type === 'service')
        ? undefined
        : (formData.item_category.trim() || undefined),
      quantity: (formData.tab === 'sales_services' && formData.sales_service_type === 'service')
        ? undefined
        : (parseInt(formData.quantity || '1', 10) || undefined),
      unit_price: (formData.tab === 'sales_services' && formData.sales_service_type === 'service')
        ? undefined
        : (parseFloat(formData.unit_price || '0') || undefined),
      service_type: (formData.tab === 'sales_services' && formData.sales_service_type === 'merchandise')
        ? undefined
        : (formData.service_type || undefined),
      service_copies: (formData.tab === 'sales_services' && formData.sales_service_type === 'merchandise')
        ? undefined
        : (parseInt(formData.service_copies || '1', 10) || undefined),
      service_rate: (formData.tab === 'sales_services' && formData.sales_service_type === 'merchandise')
        ? undefined
        : (parseFloat(formData.service_rate || '0') || undefined),
      particulars: formData.tab === 'credit'
        ? (() => {
            const parts: string[] = [];
            for (const l of savedLoans) {
              if (l.principal_amount && l.principal_amount > 0) parts.push(l.loan_account);
              if (l.interest_amount && l.interest_amount > 0) parts.push(l.interest_account);
              if (l.fines_amount && l.fines_amount > 0) parts.push(l.fines_account);
            }
            if (parseFloat(formData.common_share_amount || '0') > 0) parts.push('Common Share');
            return parts.length > 0 ? parts.join(' + ') : (formData.loans[0]?.loan_account || 'Credit Collection');
          })()
        : formData.tab === 'sales_services'
        ? (formData.sales_service_type === 'service' ? (formData.service_type || 'Services') : (formData.item_name || 'Store Sales'))
        : undefined,
      other_category: undefined,
      amount: calculatedAmount,
      payment_method: formData.payment_method,
      reference_no: (formData.payment_method === 'GCash' || formData.payment_method === 'Bank Transfer' || formData.payment_method === 'Cheque')
        ? formData.reference_no.trim() || undefined
        : undefined,
      bank_name: formData.payment_method === 'Cheque' ? formData.bank_name.trim() || undefined : undefined,
      status: 'completed',
      remarks: formData.remarks.trim() || undefined,
      collected_by: formData.collected_by.trim() || 'CHINNETTE A. LAMOSTE'
    };

    if (formData.payment_method === 'Cheque') {
      if (!formData.reference_no.trim()) {
        setActionFeedback({ type: 'error', message: 'Cheque number is required for Cheque payments.' });
        setTimeout(() => setActionFeedback(null), 4000);
        return;
      }
      if (!formData.bank_name.trim() || formData.bank_name === 'Other Bank') {
        setActionFeedback({ type: 'error', message: 'Please select or specify the issuing bank.' });
        setTimeout(() => setActionFeedback(null), 4000);
        return;
      }
    }

    try {
      const res = await api.post('/collections', newItem);
      const savedItem: CollectionItem = res.data?.data || newItem;
      setCollections(prev => [savedItem, ...prev]);
      setIsAddModalOpen(false);
      setActionFeedback({ type: 'success', message: `Collection receipt ${savedItem.or_no} recorded successfully!` });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to create collection entry:', err);
      setActionFeedback({ type: 'error', message: err?.response?.data?.error?.message || 'Failed to save collection receipt to database.' });
      setTimeout(() => setActionFeedback(null), 5000);
    }
  };

  // Open single collection delete confirmation modal
  const handleDeleteItem = (idOrItem: string | CollectionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = typeof idOrItem === 'string' ? collections.find(c => c.id === idOrItem) : idOrItem;
    if (!target) return;
    if (target.status === 'filed') {
      setActionFeedback({ type: 'error', message: 'Filed collection receipts are permanently locked and cannot be deleted.' });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }
    setItemToDelete(target);
  };

  // Perform single collection deletion after modal confirmation
  const confirmDeleteSingleItem = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.status === 'filed') {
      setActionFeedback({ type: 'error', message: 'Filed collection receipts are permanently locked and cannot be deleted.' });
      setTimeout(() => setActionFeedback(null), 4000);
      setItemToDelete(null);
      return;
    }

    setIsDeletingItem(true);
    try {
      await api.delete(`/collections/${itemToDelete.id}`);
      setCollections(prev => prev.filter(c => c.id !== itemToDelete.id));
      if (selectedItemForModal?.id === itemToDelete.id) setSelectedItemForModal(null);
      if (editingItem?.id === itemToDelete.id) setEditingItem(null);
      setSelectedIds(prev => prev.filter(x => x !== itemToDelete.id));
      setActionFeedback({ type: 'success', message: `Collection receipt #${itemToDelete.or_no} removed successfully.` });
      setTimeout(() => setActionFeedback(null), 4000);
      setItemToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete collection entry:', err);
      setActionFeedback({ type: 'error', message: err?.response?.data?.error?.message || 'Failed to delete collection entry.' });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Bulk delete selected
  const handleBulkDelete = async () => {
    const nonFiledIds = selectedIds.filter(id => {
      const c = collections.find(item => item.id === id);
      return c && c.status !== 'filed';
    });
    if (nonFiledIds.length === 0) {
      setIsBulkDeleteModalOpen(false);
      setActionFeedback({ type: 'error', message: 'Filed collection receipts cannot be deleted.' });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }
    try {
      await api.post('/collections/bulk-delete', { ids: nonFiledIds });
      setCollections(prev => prev.filter(c => !nonFiledIds.includes(c.id)));
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      setActionFeedback({ type: 'success', message: `${nonFiledIds.length} collection entries deleted.` });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to bulk delete collections:', err);
      setActionFeedback({ type: 'error', message: err?.response?.data?.error?.message || 'Failed to bulk delete collections.' });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Date', 'Receipt #', 'Payor / Member', 'Category', 'Particulars / Description', 'Amount', 'Payment Method', 'Reference #', 'Status', 'Collected By', 'Remarks'];
    const rows = filteredCollections.map(item => {
      let desc = '';
      if (item.tab === 'credit') {
        const parts: string[] = [];
        if (item.loans && item.loans.length > 0) {
          for (const loan of item.loans) {
            if (loan.principal_amount && loan.principal_amount > 0) parts.push(loan.loan_account);
            if (loan.interest_amount && loan.interest_amount > 0) parts.push(loan.interest_account || 'Interest');
            if (loan.fines_amount && loan.fines_amount > 0) parts.push(loan.fines_account || 'Fines & Late Charges');
          }
        } else {
          if (item.principal_amount && item.principal_amount > 0) parts.push(item.loan_account || 'Principal');
          if (item.interest_amount && item.interest_amount > 0) parts.push(item.interest_account || 'Interest');
          if (item.fines_amount && item.fines_amount > 0) parts.push(item.fines_account || 'Fines & Late Charges');
        }
        if (item.fines_amount && item.fines_amount > 0 && !parts.some(p => /fine|penalty|charge/i.test(p))) {
          parts.push(item.fines_account || 'Fines & Late Charges');
        }
        if (item.common_share_amount && item.common_share_amount > 0) parts.push('Common Share');
        desc = parts.length > 0 ? parts.join(' + ') : (item.loan_account || 'Credit Collection');
      } else if (item.tab === 'sales' || (item.tab === 'sales_services' && item.item_name)) {
        desc = `${item.item_name || 'Store Item'} (${item.quantity || 1} pcs @ ₱${item.unit_price || 0})`;
      } else if (item.tab === 'services' || (item.tab === 'sales_services' && item.service_type)) {
        desc = `${item.service_type || 'Service'} (${item.service_copies || 1} @ ₱${item.service_rate || 0})`;
      } else if (item.tab === 'sales_services') {
        desc = item.particulars || item.item_name || item.service_type || 'Sales & Services';
      } else if (item.tab === 'others') {
        desc = item.particulars || 'Miscellaneous';
      }

      const catLabel = (item.tab === 'sales' || item.tab === 'services' || item.tab === 'sales_services')
        ? 'SALES & SERVICES'
        : item.tab.toUpperCase();

      return [
        item.date,
        item.or_no,
        item.payor_name,
        catLabel,
        desc,
        item.amount.toFixed(2),
        item.payment_method,
        item.payment_method === 'Cheque'
          ? `${item.bank_name ? `${item.bank_name} ` : ''}Chk #${item.reference_no || ''}`
          : (item.reference_no || ''),
        item.status || 'completed',
        item.collected_by,
        item.remarks || ''
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `UC_Coop_Collection_${activeTab.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Summary
  const handlePrintSummary = () => {
    window.print();
  };

  // Import handler with smart deduplication
  const handleImportComplete = async (importedItems: CollectionItem[]) => {
    try {
      const res = await api.post('/collections/bulk', { items: importedItems });
      const savedItems: CollectionItem[] = res.data?.data || importedItems;
      const { inserted = 0, updated = 0, skipped = 0 } = res.data || {};

      setCollections(prev => {
        const savedMap = new Map(savedItems.map(s => [s.id, s]));
        const updatedList = prev.map(p => savedMap.get(p.id) || p);
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = savedItems.filter(s => !existingIds.has(s.id));
        return [...newItems, ...updatedList];
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('uc_coop_collections', JSON.stringify(savedItems));
      }

      let feedbackMsg = `Processed ${importedItems.length} records`;
      if (inserted > 0 && updated > 0) {
        feedbackMsg = `Import completed: ${inserted} new records added, ${updated} existing records updated.`;
      } else if (updated > 0 && inserted === 0) {
        feedbackMsg = `All ${updated} existing records updated without duplicates.`;
      } else if (inserted > 0) {
        feedbackMsg = `Imported ${inserted} new collection records saved to database.`;
      }
      if (skipped > 0) {
        feedbackMsg += ` (${skipped} filed records preserved)`;
      }

      setActionFeedback({ type: 'success', message: feedbackMsg });
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err: any) {
      console.error('Failed to save imported collections to database:', err);
      setActionFeedback({ type: 'error', message: err?.response?.data?.error?.message || 'Failed to save imported collections to cloud database.' });
      setTimeout(() => setActionFeedback(null), 5000);
      throw err;
    }
  };

  // Helper format Category Label
  const formatCategoryBadge = (tab: 'credit' | 'sales' | 'services' | 'sales_services' | 'others') => {
    switch (tab) {
      case 'credit':
        return 'CREDIT / LOAN';
      case 'sales':
      case 'services':
      case 'sales_services':
        return 'SALES & SERVICES';
      case 'others':
        return 'OTHER RECEIPTS';
    }
  };

  // Status Badge Renderer matching Disbursement
  const renderStatusBadge = (status?: string) => {
    const s = (status || 'completed').toLowerCase();
    switch (s) {
      case 'filed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600/15 text-emerald-800 dark:text-emerald-200 border border-emerald-600/30">
            <Lock className="w-3 h-3 text-emerald-700 dark:text-emerald-300" />
            <span>Filed</span>
          </span>
        );
      case 'on process':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25">
            <Clock className="w-3 h-3" />
            <span>On Process</span>
          </span>
        );
      case 'completed':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border border-neutral-500/25">
            <CheckCircle2 className="w-3 h-3 text-neutral-500" />
            <span>Completed</span>
          </span>
        );
    }
  };

  if (authLoading) return null;
  if (!isAdminOrStaff) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Actions (Matching Disbursement Format) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <BackButton href="/dashboard" label="Back to Overview" />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
          <button
            type="button"
            onClick={openRecordModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-headline font-bold text-xs rounded-xl shadow-xs hover:shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Collection</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg transition-all animate-in slide-in-from-top duration-200 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 KPI Overview Cards (Identical Layout to Disbursement) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        {/* Card 1: Total Collections */}
        <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {activeTab === 'all' ? 'Total Collections' : `Total ${currentTabConfig.label} Collected`}
            </span>
            <p className="text-xl sm:text-2xl font-headline font-black text-primary dark:text-secondary">
              ₱{tabStats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-neutral-500">
              {activeTab === 'all'
                ? `Across ${tabStats.count} total collections in system`
                : `Across ${tabStats.count} recorded collection receipts`}
            </p>
          </div>
          <div className="p-3 bg-primary/10 dark:bg-secondary/10 rounded-2xl text-primary dark:text-secondary">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Receipts */}
        <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Total Receipts
            </span>
            <p className="text-xl sm:text-2xl font-headline font-black text-neutral-900 dark:text-white">
              {tabStats.count}
            </p>
            <p className="text-[10px] text-neutral-500">
              {activeTab === 'all' ? 'All collections in master registry' : 'In current category registry'}
            </p>
          </div>
          <div className="p-3 bg-emerald-700/10 dark:bg-emerald-400/10 rounded-2xl text-emerald-700 dark:text-emerald-400">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Average Release / Collection */}
        <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Average Collection
            </span>
            <p className="text-xl sm:text-2xl font-headline font-black text-neutral-900 dark:text-white">
              ₱{tabStats.avgAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-neutral-500">Mean collection receipt value</p>
          </div>
          <div className="p-3 bg-blue-700/10 dark:bg-blue-400/10 rounded-2xl text-blue-700 dark:text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Largest Collection */}
        <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Largest Collection
            </span>
            <p className="text-xl sm:text-2xl font-headline font-black text-neutral-900 dark:text-white">
              ₱{tabStats.maxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-neutral-500">Peak single collection receipt</p>
          </div>
          <div className="p-3 bg-amber-700/10 dark:bg-amber-400/10 rounded-2xl text-amber-700 dark:text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Header - Same format as Disbursement & Loans pages */}
      <div className="flex border-b border-outline-variant/50 overflow-x-auto">
        {COLLECTION_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedIds([]);
              }}
              className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Context Subtitle */}
      {currentTabConfig.id !== 'all' && (
        <div className="pt-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {currentTabConfig.description}
          </p>
        </div>
      )}

      {/* Table Filters & Toolbar */}
      <div className="space-y-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Box */}
            <div className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'all'
                    ? 'Search all collections by receipt #, payor, or description...'
                    : `Search ${currentTabConfig.label} by receipt #, payor, or description...`
                }
                className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters & Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Payment Method Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Method:</span>
                <AnimatedSelect
                  value={selectedMethod}
                  onChange={setSelectedMethod}
                  options={[
                    { value: 'all', label: 'All Methods' },
                    { value: 'Cash', label: 'Cash' },
                    { value: 'GCash', label: 'GCash' },
                    { value: 'Bank Transfer', label: 'Bank Transfer' },
                    { value: 'Cheque', label: 'Cheque' },
                    { value: 'Cash in Vault', label: 'Cash in Vault' },
                  ]}
                  className="w-40"
                  buttonClassName="font-medium text-xs py-1.5"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Status:</span>
                <AnimatedSelect
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'filed', label: 'Filed' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'on process', label: 'On Process' },
                  ]}
                  className="w-36"
                  buttonClassName="font-medium text-xs py-1.5"
                />
              </div>

              {/* Import Excel */}
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-600/30 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 transition-all cursor-pointer shadow-2xs"
                title="Import Excel records (INVOICE & Acknowledgement Receipt)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>

              {/* Export CSV */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="p-2.5 rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
                title="Export filtered records to CSV"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Reload / Refresh Button */}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMethod('all');
                  setSelectedStatus('all');
                }}
                className="p-2.5 rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
                title="Reset filters"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Bulk Actions */}
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-rose-700 active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedIds.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Master Registry Table Container */}
        <div className="rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/60 bg-surface-container-low/70 dark:bg-surface-container/70 text-neutral-600 dark:text-neutral-300 font-headline uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        (isExpandedAll ? filteredCollections : paginatedCollections).filter(c => c.status !== 'filed').length > 0 &&
                        (isExpandedAll ? filteredCollections : paginatedCollections).filter(c => c.status !== 'filed').every(c => selectedIds.includes(c.id))
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="py-3 px-3 font-bold cursor-pointer select-none hover:text-primary dark:hover:text-secondary transition-colors group whitespace-nowrap"
                    title="Click to sort by receipt number"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Receipt No.</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-primary dark:text-secondary shrink-0" />
                    </div>
                  </th>
                  <th className="py-3 px-3 font-bold whitespace-nowrap">Date</th>
                  <th className="py-3 px-3 font-bold whitespace-nowrap">Member Name</th>
                  <th className="py-3 px-3 font-bold text-center whitespace-nowrap">Payment Method</th>
                  <th className="py-3 px-3 font-bold">Description / Details</th>
                  <th className="py-3 px-3 font-bold text-right whitespace-nowrap">Collected Amount</th>
                  <th className="py-3 px-3 font-bold text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 font-bold text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {loadingCollections && collections.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-neutral-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 text-primary dark:text-secondary animate-spin" />
                        <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                          Loading collection records from database...
                        </p>
                        <p className="text-xs text-neutral-400">
                          Retrieving real-time official receipts across all staff & admin devices.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredCollections.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-neutral-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FolderOpen className="w-8 h-8 text-neutral-400" />
                        <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                          {activeTab === 'all'
                            ? 'No collection records found in master registry.'
                            : `No ${currentTabConfig.label} collection records found.`}
                        </p>
                        <p className="text-xs text-neutral-400">
                          Click &quot;Record Collection&quot; or &quot;Import&quot; to register official receipts.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCollections.map(item => {
                    const isSelected = selectedIds.includes(item.id);

                    // Formulate primary description
                    let primaryDesc = '';
                    if (item.tab === 'credit') {
                      const parts: string[] = [];
                      if (item.loans && item.loans.length > 0) {
                        for (const loan of item.loans) {
                          if (loan.principal_amount && loan.principal_amount > 0) parts.push(loan.loan_account);
                          if (loan.interest_amount && loan.interest_amount > 0) parts.push(loan.interest_account || 'Interest');
                          if (loan.fines_amount && loan.fines_amount > 0) parts.push(loan.fines_account || 'Fines & Late Charges');
                        }
                      } else {
                        if (item.principal_amount && item.principal_amount > 0) parts.push(item.loan_account || 'Principal');
                        if (item.interest_amount && item.interest_amount > 0) parts.push(item.interest_account || 'Interest');
                        if (item.fines_amount && item.fines_amount > 0) parts.push(item.fines_account || 'Fines & Late Charges');
                      }
                      if (item.fines_amount && item.fines_amount > 0 && !parts.some(p => /fine|penalty|charge/i.test(p))) {
                        parts.push(item.fines_account || 'Fines & Late Charges');
                      }
                      if (item.common_share_amount && item.common_share_amount > 0) parts.push('Common Share');
                      primaryDesc = parts.length > 0 ? parts.join(' + ') : (item.loan_account || item.particulars || 'Loan Repayment');
                    } else if (item.tab === 'sales' || (item.tab === 'sales_services' && item.item_name)) {
                      primaryDesc = `${item.item_name || 'Store Item'}${item.quantity ? ` (${item.quantity} pcs)` : ''}`;
                    } else if (item.tab === 'services' || (item.tab === 'sales_services' && item.service_type)) {
                      primaryDesc = `${item.service_type || 'Service'}${item.service_copies ? ` (${item.service_copies} units)` : ''}`;
                    } else if (item.tab === 'sales_services') {
                      primaryDesc = item.particulars || item.item_name || item.service_type || 'Sales & Services';
                    } else {
                      primaryDesc = item.particulars || 'Collection Receipt';
                    }

                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          if (isAdmin) {
                            handleOpenEditModal(item);
                          } else {
                            setSelectedItemForModal(item);
                          }
                        }}
                        className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer ${
                          isSelected ? 'bg-primary/5 dark:bg-secondary/5' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={item.status === 'filed'}
                            onChange={() => toggleSelectRow(item.id)}
                            className="rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={item.status === 'filed' ? 'Filed collections cannot be deleted' : undefined}
                          />
                        </td>
                        <td className="py-3 px-3 font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                          <span className="font-mono text-primary dark:text-secondary hover:underline">
                            {item.or_no ? item.or_no.replace(/^INV#\s*/i, '') : ''}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                          {item.date ? new Date(item.date).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-3 font-semibold text-neutral-900 dark:text-white max-w-[200px] truncate" title={item.payor_name}>
                          <div>{item.payor_name || '—'}</div>
                          {item.member_id && (
                            <div className="text-[10px] text-neutral-400 font-mono">{item.member_id}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                          <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px] font-bold">
                            {item.payment_method}
                          </span>
                          {item.payment_method === 'Cheque' ? (
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold mt-0.5">
                              {item.bank_name ? `${item.bank_name} ` : ''}Chk #{item.reference_no || '—'}
                            </div>
                          ) : item.reference_no ? (
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold mt-0.5">
                              {item.payment_method === 'GCash' ? `****${item.reference_no}` : item.reference_no}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 px-3 text-neutral-700 dark:text-neutral-300" title={primaryDesc}>
                          <div className="truncate font-medium">{primaryDesc}</div>
                          <div className="mt-1">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                              {formatCategoryBadge(item.tab)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-headline font-bold text-right text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          ₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          {renderStatusBadge(item.status)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {isAdmin ? (
                              <>
                                {/* Admin Edit Button (Replaces Print & Eye) */}
                                <button
                                  type="button"
                                  onClick={e => handleOpenEditModal(item, e)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    item.status === 'filed'
                                      ? 'border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                                      : 'border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-primary dark:text-secondary'
                                  }`}
                                  title={item.status === 'filed' ? 'View Sealed & Filed Collection' : 'Edit Collection & Seal/File'}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete or Locked Indicator */}
                                {item.status === 'filed' ? (
                                  <span
                                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/60 text-neutral-400 cursor-not-allowed inline-flex items-center justify-center"
                                    title="Collection receipt is Sealed & Filed (Locked - cannot be deleted)"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={e => handleDeleteItem(item.id, e)}
                                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                                    title="Delete Collection Item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                {/* Non-Admin Staff: Print Receipt */}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handlePrintReceipt(item);
                                  }}
                                  className="p-1.5 rounded-lg border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
                                  title="Print Collection Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                                </button>

                                {/* View Details */}
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedItemForModal(item);
                                  }}
                                  className="p-1.5 rounded-lg border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
                                  title="View Collection Details"
                                >
                                  <Eye className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                                </button>

                                {/* Delete or Locked Indicator */}
                                {item.status === 'filed' ? (
                                  <span
                                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/60 text-neutral-400 cursor-not-allowed inline-flex items-center justify-center"
                                    title="Collection receipt is Sealed & Filed (Locked - cannot be deleted)"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={e => handleDeleteItem(item.id, e)}
                                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                                    title="Delete Collection Item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
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
          {filteredCollections.length > 0 && (
            <div className="border-t border-outline-variant/60 px-4 py-3 bg-neutral-50/50 dark:bg-surface-container-low/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-neutral-600 dark:text-neutral-400">
                <span>
                  {isExpandedAll ? (
                    <>Displaying all <strong className="font-bold text-neutral-900 dark:text-white font-mono">{filteredCollections.length}</strong> collections</>
                  ) : (
                    <>
                      Displaying{' '}
                      <strong className="font-bold text-neutral-900 dark:text-white font-mono">
                        {indexOfFirstItem + 1}
                      </strong>{' '}
                      -{' '}
                      <strong className="font-bold text-neutral-900 dark:text-white font-mono">
                        {Math.min(indexOfLastItem, filteredCollections.length)}
                      </strong>{' '}
                      of{' '}
                      <strong className="font-bold text-neutral-900 dark:text-white font-mono">
                        {filteredCollections.length}
                      </strong>{' '}
                      collections
                    </>
                  )}
                </span>

                {/* Items per page selector */}
                {!isExpandedAll && (
                  <div className="flex items-center gap-1.5 ml-0 sm:ml-2 pl-0 sm:pl-2 border-l-0 sm:border-l border-outline-variant/60">
                    <span className="text-neutral-500 text-[11px]">Rows:</span>
                    <select
                      value={itemsPerPage}
                      onChange={e => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Page navigation controls */}
              <div className="flex flex-wrap items-center gap-1.5 justify-center">
                {isExpandedAll ? (
                  <button
                    type="button"
                    onClick={() => setIsExpandedAll(false)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-outline-variant/60 rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Restore pagination"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                    <span>Minimize Table</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-outline-variant/60 rounded-full text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-neutral-700 dark:text-neutral-300"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    {getPaginationNumbers(currentPage, totalPages).map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span
                            key={`ellipsis-${idx}`}
                            className="w-7 h-7 flex items-center justify-center text-xs text-neutral-400 font-bold select-none"
                          >
                            ...
                          </span>
                        );
                      }
                      const pageNum = Number(p);
                      return (
                        <button
                          key={`page-${pageNum}`}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-full text-xs font-bold border transition-all cursor-pointer ${
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
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-outline-variant/60 rounded-full text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-neutral-700 dark:text-neutral-300"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {filteredCollections.length > itemsPerPage && (
                      <button
                        type="button"
                        onClick={() => setIsExpandedAll(true)}
                        className="ml-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 dark:bg-secondary/10 dark:hover:bg-secondary/20 text-primary dark:text-secondary text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="Expand table to display all records on one page"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>All</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RECORD NEW COLLECTION MODAL */}
      {isAddModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-pop">
            {/* Modal Header */}
            <div className="p-5 border-b border-outline-variant/60 flex items-center justify-between bg-surface-container-lowest dark:bg-neutral-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary dark:text-secondary flex items-center justify-center">
                  <HandCoins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">
                    Record New Collection
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Add official collection receipt into the cooperative register.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCollection} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Category / Tab Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                  Collection Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'credit', label: 'Credit' },
                    { id: 'sales_services', label: 'Sales & Services' },
                  ].map(tabOpt => (
                    <button
                      key={tabOpt.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tab: tabOpt.id as any }))}
                      className={`py-2 px-2.5 rounded-xl font-bold uppercase text-[11px] transition-all cursor-pointer border ${
                        formData.tab === tabOpt.id
                          ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border-primary dark:border-secondary shadow-2xs'
                          : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-outline-variant/60 hover:bg-neutral-100'
                      }`}
                    >
                      {tabOpt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300">
                      Receipt #
                    </label>
                    <span className="text-[10px] font-semibold text-primary dark:text-secondary flex items-center gap-1">
                      Auto-generated
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.or_no}
                    onChange={e => setFormData({ ...formData, or_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-transparent font-mono font-bold text-xs text-neutral-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    placeholder="Auto-generated"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-transparent text-xs text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div ref={memberComboboxRef} className="relative">
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Member Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.payor_name}
                      onFocus={() => setIsMemberDropdownOpen(true)}
                      onChange={e => handleMemberNameChange(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 rounded-xl border border-outline-variant/60 bg-transparent text-xs text-neutral-900 dark:text-white font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Search or enter member name..."
                    />
                    <button
                      type="button"
                      onClick={() => setIsMemberDropdownOpen(prev => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMemberDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Dropdown list */}
                  {isMemberDropdownOpen && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl bg-white dark:bg-neutral-800 border border-outline-variant/60 shadow-2xl py-1 custom-scrollbar origin-top">
                      {filteredMembers.length === 0 ? (
                        <div className="px-3 py-3 text-center text-xs text-neutral-400">
                          No matching member found. You can keep typing custom name.
                        </div>
                      ) : (
                        filteredMembers.map(m => {
                          const isSelected = m.name.toLowerCase() === (formData.payor_name || '').toLowerCase();
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSelectMember(m)}
                              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-secondary font-bold'
                                  : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'
                              }`}
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold truncate">{m.name}</span>
                                {m.member_no && (
                                  <span className="text-[10px] font-mono text-neutral-400">ID: {m.member_no}</span>
                                )}
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary dark:text-secondary shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Member ID
                  </label>
                  <input
                    type="text"
                    value={formData.member_id}
                    onChange={e => setFormData({ ...formData, member_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-transparent font-mono text-xs text-neutral-900 dark:text-white"
                    placeholder="Auto-filled on member select"
                  />
                </div>
              </div>

              {/* Dynamic Fields for Credit */}
              {formData.tab === 'credit' && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-300/70 dark:border-emerald-800/40 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-200/80 dark:border-emerald-800/50 pb-2 gap-1">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block">
                        Credit & Loan Repayment Breakdown
                      </span>
                      <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-medium">
                        Pay Principal, Interest, Fines, or Common Share (leave unneeded fields at 0.00)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      Total: ₱{(formData.loans.reduce((acc, l) => acc + (parseFloat(l.principal_amount || '0') || 0) + (parseFloat(l.interest_amount || '0') || 0) + (parseFloat(l.fines_amount || '0') || 0), 0) + (parseFloat(formData.common_share_amount || '0') || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Multi-Loan Cards List */}
                  <div className="space-y-3">
                    {formData.loans.map((loan, idx) => (
                      <div
                        key={loan.id}
                        className={`p-3 rounded-xl bg-white/80 dark:bg-neutral-900/70 border border-emerald-200/90 dark:border-emerald-800/50 space-y-2.5 transition-all ${
                          formData.loans.length > 1 ? 'shadow-xs' : ''
                        }`}
                      >
                        {formData.loans.length > 1 && (
                          <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/50 pb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                              Loan / Payment Item #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLoan(idx)}
                              className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Remove this loan"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          </div>
                        )}

                        {/* 1. Account / Particulars (Principal) */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                            Account / Particulars (Principal)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2 items-center">
                            <AnimatedSelect
                              value={loan.loan_account}
                              onChange={val => handleLoanFieldChange(idx, 'loan_account', val)}
                              options={LOANS_PAYABLE_OPTIONS}
                              placeholder="Select Loans Payable..."
                              buttonClassName="bg-white dark:bg-neutral-900 border-emerald-300 dark:border-emerald-800 font-medium py-2"
                            />
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">₱</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={loan.principal_amount}
                                onChange={e => handleLoanFieldChange(idx, 'principal_amount', e.target.value)}
                                className="w-full pl-6 pr-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-right text-neutral-900 dark:text-white"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 2. Interest Received */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                            Interest Received
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2 items-center">
                            <AnimatedSelect
                              value={loan.interest_account}
                              onChange={val => handleLoanFieldChange(idx, 'interest_account', val)}
                              options={INTEREST_RECEIVED_OPTIONS}
                              placeholder="Select Interest Received..."
                              buttonClassName="bg-white dark:bg-neutral-900 border-emerald-300 dark:border-emerald-800 font-medium py-2"
                            />
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">₱</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={loan.interest_amount}
                                onChange={e => handleLoanFieldChange(idx, 'interest_amount', e.target.value)}
                                className="w-full pl-6 pr-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-right text-neutral-900 dark:text-white"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 3. Fines & Penalties */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                            Fines & Penalties
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2 items-center">
                            <AnimatedSelect
                              value={loan.fines_account}
                              onChange={val => handleLoanFieldChange(idx, 'fines_account', val)}
                              options={FINES_OPTIONS}
                              placeholder="Select Fines..."
                              buttonClassName="bg-white dark:bg-neutral-900 border-emerald-300 dark:border-emerald-800 font-medium py-2"
                            />
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">₱</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={loan.fines_amount}
                                onChange={e => handleLoanFieldChange(idx, 'fines_amount', e.target.value)}
                                className="w-full pl-6 pr-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-right text-neutral-900 dark:text-white"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* "+ Add Another Loan / Payment Item" button */}
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={handleAddLoan}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-emerald-500/70 dark:border-emerald-500/50 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Another Loan / Payment Item
                    </button>
                  </div>

                  {/* 4. Common Share */}
                  <div className="space-y-1 pt-2.5 border-t border-emerald-200/80 dark:border-emerald-800/50">
                    <label className="block text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                      Common Share
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2 items-center">
                      <div className="px-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                        <span>Common Share</span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-100/80 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">
                          Share Capital
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">₱</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.common_share_amount}
                          onChange={e => setFormData({ ...formData, common_share_amount: e.target.value })}
                          className="w-full pl-6 pr-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-right text-neutral-900 dark:text-white"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Fields for Sales & Services */}
              {(formData.tab === 'sales_services' || (formData.tab as any) === 'sales' || (formData.tab as any) === 'services') && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300/60 dark:border-emerald-800/40 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/40">
                    <span className="text-[11px] font-bold uppercase text-emerald-900 dark:text-emerald-300">
                      Transaction Type
                    </span>
                    <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-300/40 dark:border-emerald-700/40 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, sales_service_type: 'merchandise' }))}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          formData.sales_service_type !== 'service'
                            ? 'bg-white dark:bg-neutral-800 text-emerald-950 dark:text-emerald-200 shadow-2xs'
                            : 'text-emerald-800 dark:text-emerald-300 hover:text-emerald-950'
                        }`}
                      >
                        Store Merchandise / Sales
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, sales_service_type: 'service' }))}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          formData.sales_service_type === 'service'
                            ? 'bg-white dark:bg-neutral-800 text-emerald-950 dark:text-emerald-200 shadow-2xs'
                            : 'text-emerald-800 dark:text-emerald-300 hover:text-emerald-950'
                        }`}
                      >
                        Coop Services / Fees
                      </button>
                    </div>
                  </div>

                  {formData.sales_service_type !== 'service' ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            Item Description
                          </label>
                          <input
                            type="text"
                            value={formData.item_name}
                            onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white"
                            placeholder="e.g. BSMT Gala Uniform Set"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            Category
                          </label>
                          <select
                            value={formData.item_category}
                            onChange={e => setFormData({ ...formData, item_category: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white"
                          >
                            <option value="Uniform">Uniform</option>
                            <option value="Coverall">Coverall</option>
                            <option value="Pants">Pants</option>
                            <option value="Shoulder Board">Shoulder Board</option>
                            <option value="Nameplate / Pin">Nameplate / Pin</option>
                            <option value="Store Merchandise">Store Merchandise</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.quantity}
                            onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-center text-neutral-900 dark:text-white"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            Unit Price (₱)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.unit_price}
                            onChange={e => setFormData({ ...formData, unit_price: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-right text-neutral-900 dark:text-white"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                          Service Type
                        </label>
                        <select
                          value={formData.service_type}
                          onChange={e => setFormData({ ...formData, service_type: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white"
                        >
                          <option value="Photocopying Services">Photocopying Services</option>
                          <option value="Document Printing & Lamination">Document Printing & Lamination</option>
                          <option value="2x2 ID Photo Package">2x2 ID Photo Package</option>
                          <option value="Membership Application Fee">Membership Application Fee</option>
                          <option value="Passbook Replacement Fee">Passbook Replacement Fee</option>
                          <option value="Notarial / Processing Fee">Notarial / Processing Fee</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            Copies / Count
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.service_copies}
                            onChange={e => setFormData({ ...formData, service_copies: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-center text-neutral-900 dark:text-white"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            Rate per Unit (₱)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.service_rate}
                            onChange={e => setFormData({ ...formData, service_rate: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-right text-neutral-900 dark:text-white"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}



              {/* Payment Method, Reference, Cashier, and Remarks */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                      Payment Method
                    </label>
                    <AnimatedSelect
                      value={formData.payment_method}
                      onChange={val => setFormData({ ...formData, payment_method: val as any, reference_no: '' })}
                      options={PAYMENT_METHOD_OPTIONS}
                      buttonClassName="bg-white dark:bg-neutral-900 border-outline-variant/60 font-semibold py-2.5"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                      Collected By / Cashier
                    </label>
                    <AnimatedSelect
                      value={formData.collected_by}
                      onChange={val => setFormData({ ...formData, collected_by: val })}
                      options={CASHIER_OPTIONS}
                      buttonClassName="bg-white dark:bg-neutral-900 border-outline-variant/60 font-semibold py-2.5 text-xs"
                    />
                  </div>
                </div>

                {/* Conditional Reference No for GCash, Bank Transfer, or Cheque */}
                {formData.payment_method === 'GCash' && (
                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                      GCash Reference (Last 4 Digits) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={formData.reference_no}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setFormData({ ...formData, reference_no: val });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 font-mono text-xs font-bold tracking-widest text-neutral-900 dark:text-white"
                      placeholder="e.g. 1234"
                    />
                  </div>
                )}

                {formData.payment_method === 'Bank Transfer' && (
                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                      Bank Transfer Reference (Full) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.reference_no}
                      onChange={e => setFormData({ ...formData, reference_no: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-neutral-900 dark:text-white"
                      placeholder="Enter full transaction reference"
                    />
                  </div>
                )}

                {formData.payment_method === 'Cheque' && (
                  <div className="p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                      <div>
                        <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                          Cheque Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.reference_no}
                          onChange={e => setFormData({ ...formData, reference_no: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-neutral-900 dark:text-white"
                          placeholder="e.g. 0001234567"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                          Bank Name <span className="text-rose-500">*</span>
                        </label>
                        <AnimatedSelect
                          value={
                            BANK_OPTIONS.some(b => b.value === formData.bank_name)
                              ? formData.bank_name
                              : formData.bank_name
                              ? 'Other Bank'
                              : ''
                          }
                          onChange={val => {
                            if (val === 'Other Bank') {
                              setIsCustomBank(true);
                              if (BANK_OPTIONS.some(b => b.value === formData.bank_name)) {
                                setFormData({ ...formData, bank_name: '' });
                              }
                            } else {
                              setIsCustomBank(false);
                              setFormData({ ...formData, bank_name: val });
                            }
                          }}
                          options={BANK_OPTIONS}
                          placeholder="Select Bank"
                          buttonClassName="bg-white dark:bg-neutral-900 border-outline-variant/60 font-semibold py-2.5 text-xs"
                          menuClassName="w-72"
                        />
                      </div>
                    </div>

                    {isCustomBank && (
                      <div className="animate-in fade-in duration-150">
                        <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                          Specify Other Bank Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          autoFocus
                          value={formData.bank_name}
                          onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-xs font-bold text-neutral-900 dark:text-white"
                          placeholder="Enter issuing bank name"
                        />
                      </div>
                    )}

                    <p className="text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1 font-medium">
                      <span>💡</span> Cheque number and issuing bank will be saved and printed on the official receipt.
                    </p>
                  </div>
                )}

                {/* Remarks Field (Bigger Textarea) */}
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                    Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={formData.remarks}
                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white resize-y min-h-[72px]"
                    placeholder="Enter remarks or additional details..."
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-primary dark:bg-secondary text-white dark:text-neutral-950 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Save Collection Entry
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT & SEAL/FILE COLLECTION MODAL (ADMIN ONLY) */}
      {editingItem && editFormData && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-pop">
            {/* Modal Header */}
            <div className="p-5 border-b border-outline-variant/60 flex items-center justify-between bg-surface-container-lowest dark:bg-neutral-900">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  editingItem.status === 'filed'
                    ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-primary/10 text-primary dark:text-secondary'
                }`}>
                  {editingItem.status === 'filed' ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    <Edit3 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">
                      {editingItem.status === 'filed' ? 'Sealed & Filed Collection' : 'Edit Collection Receipt'}
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 font-bold text-primary dark:text-secondary">
                      {editFormData.or_no}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {editingItem.status === 'filed'
                      ? 'This collection entry is permanently filed and locked in the official registry.'
                      : 'Modify collection receipt details or seal as filed into master registry.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setEditFormData(null);
                }}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleUpdateCollection(false);
              }}
              className="p-5 overflow-y-auto space-y-4 text-xs"
            >
              {/* Permanent Lock Banner if already filed */}
              {editingItem.status === 'filed' && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-900 dark:text-emerald-200">
                      Collection Entry is Sealed &amp; Filed (Locked)
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-300 text-[11px] mt-0.5">
                      Identical to the disbursement registry, this entry cannot be edited or deleted once filed.
                    </p>
                  </div>
                </div>
              )}


              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Receipt #
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingItem.status === 'filed'}
                    value={editFormData.or_no}
                    onChange={e => setEditFormData({ ...editFormData, or_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-transparent font-mono font-bold text-xs text-neutral-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="Enter receipt number"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    required
                    disabled={editingItem.status === 'filed'}
                    value={editFormData.date}
                    onChange={e => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-transparent text-xs text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div ref={editMemberComboboxRef} className="relative">
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Member Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      disabled={editingItem.status === 'filed'}
                      value={editFormData.payor_name}
                      onFocus={() => {
                        if (editingItem.status !== 'filed') setIsEditMemberDropdownOpen(true);
                      }}
                      onChange={e => handleEditMemberNameChange(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 rounded-xl border border-outline-variant/60 bg-transparent text-xs text-neutral-900 dark:text-white font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Search or enter member name..."
                    />
                    {editingItem.status !== 'filed' && (
                      <button
                        type="button"
                        onClick={() => setIsEditMemberDropdownOpen(prev => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isEditMemberDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown list */}
                  {isEditMemberDropdownOpen && editingItem.status !== 'filed' && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl bg-white dark:bg-neutral-800 border border-outline-variant/60 shadow-2xl py-1 custom-scrollbar origin-top">
                      {editFilteredMembers.length === 0 ? (
                        <div className="px-3 py-3 text-center text-xs text-neutral-400">
                          No matching member found. You can keep typing custom name.
                        </div>
                      ) : (
                        editFilteredMembers.map(m => {
                          const isSelected = m.name.toLowerCase() === (editFormData.payor_name || '').toLowerCase();
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSelectEditMember(m)}
                              className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-secondary font-bold'
                                  : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'
                              }`}
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold truncate">{m.name}</span>
                                {m.member_no && (
                                  <span className="text-[10px] font-mono text-neutral-400">ID: {m.member_no}</span>
                                )}
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary dark:text-secondary shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Member ID
                  </label>
                  <input
                    type="text"
                    disabled={editingItem.status === 'filed'}
                    value={editFormData.member_id}
                    onChange={e => setEditFormData({ ...editFormData, member_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-transparent font-mono text-xs text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="Auto-filled on member select"
                  />
                </div>
              </div>

              {/* Dynamic Fields for Credit */}
              {editFormData.tab === 'credit' && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-300/70 dark:border-emerald-800/40 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-200/80 dark:border-emerald-800/50 pb-2 gap-1">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block">
                        Credit &amp; Loan Repayment Breakdown
                      </span>
                      <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-medium">
                        Pay Principal, Interest, Fines, or Common Share
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      Total: ₱{(editFormData.loans.reduce((acc: number, l: FormLoanEntry) => acc + (parseFloat(l.principal_amount || '0') || 0) + (parseFloat(l.interest_amount || '0') || 0) + (parseFloat(l.fines_amount || '0') || 0), 0) + (parseFloat(editFormData.common_share_amount || '0') || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Multi-Loan Cards List */}
                  <div className="space-y-3">
                    {editFormData.loans.map((loan: FormLoanEntry, idx: number) => (
                      <div
                        key={loan.id}
                        className={`p-3 rounded-xl bg-white/80 dark:bg-neutral-900/70 border border-emerald-200/90 dark:border-emerald-800/50 space-y-2.5 transition-all ${
                          editFormData.loans.length > 1 ? 'shadow-xs' : ''
                        }`}
                      >
                        {editFormData.loans.length > 1 && (
                          <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/50 pb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                              Loan / Payment Item #{idx + 1}
                            </span>
                            {editingItem.status !== 'filed' && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEditLoan(idx)}
                                className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                                title="Remove this loan"
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove
                              </button>
                            )}
                          </div>
                        )}

                        {/* Principal */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                            Account / Particulars (Principal)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2 items-center">
                            <AnimatedSelect
                              value={loan.loan_account}
                              onChange={val => handleEditLoanFieldChange(idx, 'loan_account', val)}
                              options={LOANS_PAYABLE_OPTIONS}
                              placeholder="Select Loans Payable..."
                              disabled={editingItem.status === 'filed'}
                              buttonClassName="bg-white dark:bg-neutral-900 border-emerald-300 dark:border-emerald-800 font-medium py-2"
                            />
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">₱</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={editingItem.status === 'filed'}
                                value={loan.principal_amount}
                                onChange={e => handleEditLoanFieldChange(idx, 'principal_amount', e.target.value)}
                                className="w-full pl-6 pr-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-right text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Interest */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                            Interest Received
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2 items-center">
                            <AnimatedSelect
                              value={loan.interest_account}
                              onChange={val => handleEditLoanFieldChange(idx, 'interest_account', val)}
                              options={INTEREST_RECEIVED_OPTIONS}
                              placeholder="Select Interest Received..."
                              disabled={editingItem.status === 'filed'}
                              buttonClassName="bg-white dark:bg-neutral-900 border-emerald-300 dark:border-emerald-800 font-medium py-2"
                            />
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">₱</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={editingItem.status === 'filed'}
                                value={loan.interest_amount}
                                onChange={e => handleEditLoanFieldChange(idx, 'interest_amount', e.target.value)}
                                className="w-full pl-6 pr-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-right text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Fines */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                            Fines &amp; Penalties
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2 items-center">
                            <AnimatedSelect
                              value={loan.fines_account}
                              onChange={val => handleEditLoanFieldChange(idx, 'fines_account', val)}
                              options={FINES_OPTIONS}
                              placeholder="Select Fines..."
                              disabled={editingItem.status === 'filed'}
                              buttonClassName="bg-white dark:bg-neutral-900 border-emerald-300 dark:border-emerald-800 font-medium py-2"
                            />
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">₱</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={editingItem.status === 'filed'}
                                value={loan.fines_amount}
                                onChange={e => handleEditLoanFieldChange(idx, 'fines_amount', e.target.value)}
                                className="w-full pl-6 pr-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-right text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Another Loan Item */}
                  {editingItem.status !== 'filed' && (
                    <div className="flex justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={handleAddEditLoan}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-emerald-500/70 dark:border-emerald-500/50 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Another Loan / Payment Item
                      </button>
                    </div>
                  )}

                  {/* Common Share */}
                  <div className="space-y-1 pt-2.5 border-t border-emerald-200/80 dark:border-emerald-800/50">
                    <label className="block text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
                      Common Share
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2 items-center">
                      <div className="px-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                        <span>Common Share</span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-100/80 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">
                          Share Capital
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-bold">₱</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={editingItem.status === 'filed'}
                          value={editFormData.common_share_amount}
                          onChange={e => setEditFormData({ ...editFormData, common_share_amount: e.target.value })}
                          className="w-full pl-6 pr-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-right text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Fields for Sales & Services */}
              {(editFormData.tab === 'sales_services' || editFormData.tab === 'sales' || editFormData.tab === 'services') && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300/60 dark:border-emerald-800/40 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/40">
                    <span className="text-[11px] font-bold uppercase text-emerald-900 dark:text-emerald-300">
                      Transaction Type
                    </span>
                    <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-300/40 dark:border-emerald-700/40 text-[11px]">
                      <button
                        type="button"
                        disabled={editingItem.status === 'filed'}
                        onClick={() => setEditFormData((prev: any) => ({ ...prev, sales_service_type: 'merchandise' }))}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                          editFormData.sales_service_type !== 'service'
                            ? 'bg-white dark:bg-neutral-800 text-emerald-950 dark:text-emerald-200 shadow-2xs'
                            : 'text-emerald-800 dark:text-emerald-300 hover:text-emerald-950'
                        }`}
                      >
                        Store Merchandise / Sales
                      </button>
                      <button
                        type="button"
                        disabled={editingItem.status === 'filed'}
                        onClick={() => setEditFormData((prev: any) => ({ ...prev, sales_service_type: 'service' }))}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                          editFormData.sales_service_type === 'service'
                            ? 'bg-white dark:bg-neutral-800 text-emerald-950 dark:text-emerald-200 shadow-2xs'
                            : 'text-emerald-800 dark:text-emerald-300 hover:text-emerald-950'
                        }`}
                      >
                        Coop Services / Fees
                      </button>
                    </div>
                  </div>

                  {editFormData.sales_service_type !== 'service' ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            Item Description
                          </label>
                          <input
                            type="text"
                            disabled={editingItem.status === 'filed'}
                            value={editFormData.item_name}
                            onChange={e => setEditFormData({ ...editFormData, item_name: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder="e.g. BSMT Gala Uniform Set"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            Category
                          </label>
                          <select
                            disabled={editingItem.status === 'filed'}
                            value={editFormData.item_category}
                            onChange={e => setEditFormData({ ...editFormData, item_category: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <option value="Uniform">Uniform</option>
                            <option value="Coverall">Coverall</option>
                            <option value="Pants">Pants</option>
                            <option value="Shoulder Board">Shoulder Board</option>
                            <option value="Nameplate / Pin">Nameplate / Pin</option>
                            <option value="Store Merchandise">Store Merchandise</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            disabled={editingItem.status === 'filed'}
                            value={editFormData.quantity}
                            onChange={e => setEditFormData({ ...editFormData, quantity: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-center text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            Unit Price (₱)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            disabled={editingItem.status === 'filed'}
                            value={editFormData.unit_price}
                            onChange={e => setEditFormData({ ...editFormData, unit_price: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-right text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                          Service Type
                        </label>
                        <select
                          disabled={editingItem.status === 'filed'}
                          value={editFormData.service_type}
                          onChange={e => setEditFormData({ ...editFormData, service_type: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="Photocopying Services">Photocopying Services</option>
                          <option value="Document Printing & Lamination">Document Printing & Lamination</option>
                          <option value="2x2 ID Photo Package">2x2 ID Photo Package</option>
                          <option value="Membership Application Fee">Membership Application Fee</option>
                          <option value="Passbook Replacement Fee">Passbook Replacement Fee</option>
                          <option value="Notarial / Processing Fee">Notarial / Processing Fee</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            Copies / Count
                          </label>
                          <input
                            type="number"
                            min="1"
                            disabled={editingItem.status === 'filed'}
                            value={editFormData.service_copies}
                            onChange={e => setEditFormData({ ...editFormData, service_copies: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-center text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-emerald-900 dark:text-emerald-300 mb-1">
                            Rate per Unit (₱)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            disabled={editingItem.status === 'filed'}
                            value={editFormData.service_rate}
                            onChange={e => setEditFormData({ ...editFormData, service_rate: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-right text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Payment Method, Reference, Cashier, and Remarks */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                      Payment Method
                    </label>
                    <AnimatedSelect
                      value={editFormData.payment_method}
                      onChange={val => setEditFormData({ ...editFormData, payment_method: val as PaymentMethod })}
                      options={PAYMENT_METHOD_OPTIONS}
                      placeholder="Select Payment Method..."
                      disabled={editingItem.status === 'filed'}
                      buttonClassName="bg-white dark:bg-neutral-900 border-outline-variant/60 font-semibold py-2"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                      Cashier / Collector
                    </label>
                    <AnimatedSelect
                      value={editFormData.collected_by}
                      onChange={val => setEditFormData({ ...editFormData, collected_by: val })}
                      options={CASHIER_OPTIONS}
                      placeholder="Select Cashier..."
                      disabled={editingItem.status === 'filed'}
                      buttonClassName="bg-white dark:bg-neutral-900 border-outline-variant/60 font-semibold py-2"
                    />
                  </div>
                </div>

                {editFormData.payment_method === 'GCash' && (
                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                      GCash Reference (Last 4 Digits) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      disabled={editingItem.status === 'filed'}
                      value={editFormData.reference_no}
                      onChange={e => setEditFormData({ ...editFormData, reference_no: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="e.g. 1234"
                    />
                  </div>
                )}

                {editFormData.payment_method === 'Bank Transfer' && (
                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                      Bank Transfer Reference (Full) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={editingItem.status === 'filed'}
                      value={editFormData.reference_no}
                      onChange={e => setEditFormData({ ...editFormData, reference_no: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                      placeholder="Enter full transaction reference"
                    />
                  </div>
                )}

                {editFormData.payment_method === 'Cheque' && (
                  <div className="p-3 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                      <div>
                        <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                          Cheque Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          disabled={editingItem.status === 'filed'}
                          value={editFormData.reference_no}
                          onChange={e => setEditFormData({ ...editFormData, reference_no: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 font-mono text-xs font-bold text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                          placeholder="e.g. 0001234567"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                          Bank Name <span className="text-rose-500">*</span>
                        </label>
                        <AnimatedSelect
                          value={
                            BANK_OPTIONS.some(b => b.value === editFormData.bank_name)
                              ? editFormData.bank_name
                              : editFormData.bank_name
                              ? 'Other Bank'
                              : ''
                          }
                          onChange={val => {
                            if (val === 'Other Bank') {
                              setIsEditCustomBank(true);
                              if (BANK_OPTIONS.some(b => b.value === editFormData.bank_name)) {
                                setEditFormData({ ...editFormData, bank_name: '' });
                              }
                            } else {
                              setIsEditCustomBank(false);
                              setEditFormData({ ...editFormData, bank_name: val });
                            }
                          }}
                          options={BANK_OPTIONS}
                          placeholder="Select Bank"
                          disabled={editingItem.status === 'filed'}
                          buttonClassName="bg-white dark:bg-neutral-900 border-outline-variant/60 font-semibold py-2.5 text-xs"
                          menuClassName="w-72"
                        />
                      </div>
                    </div>

                    {isEditCustomBank && (
                      <div className="animate-in fade-in duration-150">
                        <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                          Specify Other Bank Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          autoFocus
                          disabled={editingItem.status === 'filed'}
                          value={editFormData.bank_name}
                          onChange={e => setEditFormData({ ...editFormData, bank_name: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-xs font-bold text-neutral-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                          placeholder="Enter issuing bank name"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Remarks Field */}
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                    Remarks
                  </label>
                  <textarea
                    rows={3}
                    disabled={editingItem.status === 'filed'}
                    value={editFormData.remarks}
                    onChange={e => setEditFormData({ ...editFormData, remarks: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white resize-y min-h-[72px] disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="Enter remarks or additional details..."
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(editingItem)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
                  title="Print collection receipt"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>

                <div className="flex items-center gap-2">
                  {editingItem.status === 'filed' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(null);
                        setEditFormData(null);
                      }}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(null);
                          setEditFormData(null);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="px-4 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        {isSavingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Save Changes</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSavingEdit}
                        onClick={() => setIsSealModalOpen(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                        title="Seal and file this collection entry into master registry (Locks editing and deleting)"
                      >
                        {isSavingEdit ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                        <span>Seal &amp; File</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* VIEW COLLECTION DETAIL MODAL */}
      {selectedItemForModal && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-modal-pop">
            <div className="p-5 border-b border-outline-variant/60 flex items-center justify-between bg-surface-container-lowest dark:bg-neutral-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary dark:text-secondary flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">
                    Collection Receipt Details
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    {selectedItemForModal.or_no}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForModal(null)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-surface-container-low border border-outline-variant/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Date</span>
                  <p className="font-semibold text-neutral-900 dark:text-white mt-0.5">{selectedItemForModal.date}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Category</span>
                  <p className="font-semibold text-primary dark:text-secondary mt-0.5">{formatCategoryBadge(selectedItemForModal.tab)}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Member Name</span>
                  <p className="font-semibold text-neutral-900 dark:text-white mt-0.5">{selectedItemForModal.payor_name}</p>
                  {selectedItemForModal.member_id && <p className="font-mono text-[10px] text-neutral-400">{selectedItemForModal.member_id}</p>}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Payment Method</span>
                  <p className="font-semibold text-neutral-900 dark:text-white mt-0.5">{selectedItemForModal.payment_method}</p>
                  {selectedItemForModal.payment_method === 'Cheque' ? (
                    <div className="text-[10px] text-neutral-600 dark:text-neutral-400 font-mono mt-0.5 space-y-0.5">
                      {selectedItemForModal.bank_name && (
                        <div>Bank: <span className="font-bold text-neutral-900 dark:text-white">{selectedItemForModal.bank_name}</span></div>
                      )}
                      <div>Cheque #: <span className="font-bold text-neutral-900 dark:text-white">{selectedItemForModal.reference_no || '—'}</span></div>
                    </div>
                  ) : selectedItemForModal.reference_no ? (
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      Ref: {selectedItemForModal.payment_method === 'GCash' ? `****${selectedItemForModal.reference_no}` : selectedItemForModal.reference_no}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Category specifics */}
              <div className="p-4 rounded-2xl border border-outline-variant/60 space-y-2">
                <span className="text-[10px] uppercase font-bold text-neutral-400">Particulars Breakdown</span>
                {selectedItemForModal.tab === 'credit' && (
                  <div className="space-y-2">
                    {selectedItemForModal.loans && selectedItemForModal.loans.length > 0 ? (
                      selectedItemForModal.loans
                        .filter(loan => (loan.principal_amount || 0) > 0 || (loan.interest_amount || 0) > 0 || (loan.fines_amount || 0) > 0)
                        .map((loan, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-outline-variant/40 space-y-1">
                            <p className="font-bold text-neutral-900 dark:text-white">
                              {loan.loan_account || `Loan #${idx + 1}`}
                            </p>
                            {loan.principal_amount !== undefined && loan.principal_amount > 0 && (
                              <p className="text-neutral-500">Principal: ₱{loan.principal_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            )}
                            {loan.interest_amount !== undefined && loan.interest_amount > 0 && (
                              <p className="text-neutral-500">{loan.interest_account || 'Interest'}: ₱{loan.interest_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            )}
                            {loan.fines_amount !== undefined && loan.fines_amount > 0 && (
                              <p className="text-neutral-500">{loan.fines_account || 'Fines & Penalties'}: ₱{loan.fines_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            )}
                          </div>
                        ))
                    ) : (
                      (selectedItemForModal.principal_amount || selectedItemForModal.interest_amount || selectedItemForModal.fines_amount) ? (
                        <div className="space-y-1">
                          <p className="font-medium text-neutral-800 dark:text-neutral-200">Account: {selectedItemForModal.loan_account || 'Loans Payable'}</p>
                          {selectedItemForModal.principal_amount !== undefined && selectedItemForModal.principal_amount > 0 && (
                            <p className="text-neutral-500">Principal: ₱{selectedItemForModal.principal_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          )}
                          {selectedItemForModal.interest_amount !== undefined && selectedItemForModal.interest_amount > 0 && (
                            <p className="text-neutral-500">{selectedItemForModal.interest_account || 'Interest'}: ₱{selectedItemForModal.interest_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          )}
                          {selectedItemForModal.fines_amount !== undefined && selectedItemForModal.fines_amount > 0 && (
                            <p className="text-neutral-500">{selectedItemForModal.fines_account || 'Fines & Penalties'}: ₱{selectedItemForModal.fines_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          )}
                        </div>
                      ) : null
                    )}
                    {selectedItemForModal.common_share_amount !== undefined && selectedItemForModal.common_share_amount > 0 && (
                      <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-emerald-950 dark:text-emerald-200">Common Share</p>
                          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400">Share Capital Contribution</p>
                        </div>
                        <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300">
                          ₱{selectedItemForModal.common_share_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {(selectedItemForModal.tab === 'sales' || (selectedItemForModal.tab === 'sales_services' && selectedItemForModal.item_name)) && (
                  <div className="space-y-1">
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">Item: {selectedItemForModal.item_name || 'Store Item'}</p>
                    <p className="text-neutral-500">Category: {selectedItemForModal.item_category || 'Uniform'}</p>
                    <p className="text-neutral-500">Quantity: {selectedItemForModal.quantity || 1} pcs @ ₱{(selectedItemForModal.unit_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
                {(selectedItemForModal.tab === 'services' || (selectedItemForModal.tab === 'sales_services' && selectedItemForModal.service_type)) && (
                  <div className="space-y-1">
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">Service: {selectedItemForModal.service_type || 'Services'}</p>
                    <p className="text-neutral-500">Count / Units: {selectedItemForModal.service_copies || 1} @ ₱{(selectedItemForModal.service_rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
                {selectedItemForModal.tab === 'others' && (
                  <div className="space-y-1">
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">{selectedItemForModal.particulars || 'General Miscellaneous'}</p>
                    {selectedItemForModal.other_category && <p className="text-neutral-500">Classification: {selectedItemForModal.other_category}</p>}
                  </div>
                )}
                {selectedItemForModal.remarks && (
                  <p className="text-neutral-400 italic text-[11px] pt-1 border-t border-outline-variant/40">
                    Remarks: {selectedItemForModal.remarks}
                  </p>
                )}
              </div>

              {/* Total Amount Box */}
              <div className="p-4 rounded-2xl bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Total Collected</span>
                  <div className="text-xl font-headline font-black text-primary dark:text-secondary mt-0.5">
                    ₱{selectedItemForModal.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Cashier</span>
                  <div className="font-medium text-neutral-800 dark:text-neutral-200 text-xs mt-0.5">
                    {selectedItemForModal.collected_by}
                  </div>
                </div>
              </div>

              {/* Actions inside Detail Modal */}
              <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between">
                {selectedItemForModal.status === 'filed' ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed border border-neutral-200 dark:border-neutral-700"
                    title="Filed collections cannot be deleted"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Locked / Filed</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(selectedItemForModal.id)}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                  >
                    Delete Entry
                  </button>
                )}
                <div className="flex items-center gap-2">
                  {isAdmin && selectedItemForModal.status !== 'filed' && (
                    <button
                      type="button"
                      onClick={() => {
                        const itemToEdit = selectedItemForModal;
                        setSelectedItemForModal(null);
                        handleOpenEditModal(itemToEdit);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-white dark:bg-secondary dark:text-neutral-950 hover:brightness-110 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit &amp; Seal</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(selectedItemForModal)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedItemForModal(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SINGLE ITEM DELETE CONFIRMATION MODAL */}
      {itemToDelete && mounted && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-modal-pop">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">Delete Collection Entry</h3>
                <p className="text-xs text-neutral-500 font-mono">Receipt #{itemToDelete.or_no}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container-low/60 dark:bg-neutral-800/60 border border-outline-variant/60 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Payor / Member:</span>
                <span className="font-semibold text-neutral-900 dark:text-white text-right max-w-[200px] truncate">{itemToDelete.payor_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Amount Collected:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  ₱{itemToDelete.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Transaction Date:</span>
                <span className="text-neutral-700 dark:text-neutral-300">{itemToDelete.date ? new Date(itemToDelete.date).toLocaleDateString() : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Payment Method:</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{itemToDelete.payment_method}</span>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Are you sure you want to permanently delete this collection receipt? This action cannot be undone.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={confirmDeleteSingleItem}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SEAL & FILE CONFIRMATION MODAL (ADMIN ONLY) */}
      {isSealModalOpen && editFormData && mounted && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-modal-pop">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">Seal &amp; File Collection Receipt</h3>
                <p className="text-xs text-neutral-500 font-mono">Receipt #{editFormData.or_no}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5">
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                Warning: Permanent Lock
              </p>
              <p className="text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
                Once sealed and filed, this collection entry status will become <span className="font-bold uppercase tracking-wider">Filed</span> and will be permanently locked against all future edits and deletions (identical to check vouchers on the disbursement page).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low/60 dark:bg-neutral-800/60 border border-outline-variant/60 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Payor / Member:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{editFormData.payor_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Total Amount:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  ₱{(parseFloat(editFormData.amount || '0') || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => setIsSealModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => handleUpdateCollection(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Confirm &amp; File</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {isBulkDeleteModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-modal-pop">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">Delete Selected Items</h3>
                <p className="text-xs text-neutral-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Are you sure you want to permanently delete <span className="font-bold text-rose-600">{selectedIds.length}</span> selected collection entries?
            </p>
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PRINT-ONLY OFFICIAL UC-METC MPC DAILY COLLECTION SUMMARY SHEET */}
      <div className="hidden print:block text-black p-4 font-sans space-y-4">
        <div className="text-center border-b pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider">
            UNIVERSITY OF CEBU - METC MULTIPURPOSE COOPERATIVE (UC-METC MPC)
          </h2>
          <p className="text-[10px] text-neutral-600">Alumnos, Mambaling, Cebu City • CDA Reg. No. 9520-1070000000029729</p>
          <h3 className="text-base font-black mt-2 uppercase tracking-wide">
            DAILY COLLECTION & CASH SUMMARY REPORT
          </h3>
          <p className="text-xs font-mono text-neutral-700">Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs border p-3 rounded bg-neutral-50 font-bold">
          <div>Credit Collections: ₱{collections.filter(c => c.tab === 'credit').reduce((s, c) => s + c.amount, 0).toFixed(2)}</div>
          <div>Sales & Services: ₱{collections.filter(c => c.tab === 'sales' || c.tab === 'services' || c.tab === 'sales_services').reduce((s, c) => s + c.amount, 0).toFixed(2)}</div>
          <div className="col-span-2 text-sm font-black text-right border-t pt-1">
            GRAND TOTAL COLLECTED: ₱{collections.reduce((s, c) => s + c.amount, 0).toFixed(2)}
          </div>
        </div>

        <div className="pt-8 grid grid-cols-3 gap-6 text-xs text-center">
          <div>
            <div className="border-b border-black pb-1 font-bold">CHINNETTE A. LAMOSTE</div>
            <div className="text-[10px] text-neutral-600 mt-0.5">Cashier / Collector</div>
          </div>
          <div>
            <div className="border-b border-black pb-1 font-bold">MARILOU LARIOSA</div>
            <div className="text-[10px] text-neutral-600 mt-0.5">Bookkeeper</div>
          </div>
          <div>
            <div className="border-b border-black pb-1 font-bold">MICHELLE M. PABLE</div>
            <div className="text-[10px] text-neutral-600 mt-0.5">General Manager</div>
          </div>
        </div>
      </div>

      {/* Print-only Acknowledgement Receipt */}
      <CollectionReceiptPrint item={printingReceipt} />

      {/* Invoice & AR Excel Import Modal */}
      {isImportModalOpen && (
        <InvoiceArExcelImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={handleImportComplete}
          currentUser={currentUserDisplayName}
        />
      )}
    </div>
  );
}
