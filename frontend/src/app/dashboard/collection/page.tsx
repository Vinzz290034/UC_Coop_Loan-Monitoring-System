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
  FolderOpen
} from 'lucide-react';

export type CollectionTab = 'all' | 'credit' | 'sales' | 'services';

export interface TabConfig {
  id: CollectionTab;
  label: string;
  description: string;
}

export const COLLECTION_TABS: TabConfig[] = [
  { id: 'all', label: 'All Collections', description: 'Consolidated master collection registry across all revenue categories' },
  { id: 'credit', label: 'Credit', description: 'Daily member loan amortizations, credit repayments, share capital & deposits' },
  { id: 'sales', label: 'Sales', description: 'Itemized merchandise sales, student uniforms, and store inventory' },
  { id: 'services', label: 'Services', description: 'Photocopying, ID packages, document printing, and service charges' },
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
  tab: 'credit' | 'sales' | 'services' | 'others';
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
  status?: 'completed' | 'on process';
  remarks?: string;
  collected_by: string;
}

export type PaymentMethod = 'Cash' | 'GCash' | 'Bank Transfer' | 'Cheque' | 'Cash in Vault' | 'Check' | 'Payroll Deduction';

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
  { value: 'Loans Payable - Regular', label: 'Loans Payable - Regular' },
  { value: 'Loans Payable - Cash Express', label: 'Loans Payable - Cash Express' },
  { value: 'Loans Payable - Emergency', label: 'Loans Payable - Emergency' },
  { value: 'Loans Payable - Special Occasion', label: 'Loans Payable - Special Occasion' },
  { value: 'Loans Payable - Utility', label: 'Loans Payable - Utility' },
];

export const INTEREST_RECEIVED_OPTIONS: SelectOption[] = [
  { value: 'Interest Received - Regular', label: 'Interest Received - Regular' },
  { value: 'Interest Received - Cash Express', label: 'Interest Received - Cash Express' },
  { value: 'Interest Received - Emergency', label: 'Interest Received - Emergency' },
  { value: 'Interest Received - Special Occasion', label: 'Interest Received - Special Occasion' },
  { value: 'Interest Received - Utility', label: 'Interest Received - Utility' },
];

export const FINES_OPTIONS: SelectOption[] = [
  { value: 'Fines - Regular', label: 'Fines - Regular' },
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
        <span className={`truncate ${selectedOption ? '' : 'text-neutral-400 font-normal'}`}>
          {selectedOption ? selectedOption.label : placeholder}
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

  // Selected item for detail view modal
  const [selectedItemForModal, setSelectedItemForModal] = useState<CollectionItem | null>(null);

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

  // Form Data for adding a new collection
  const [formData, setFormData] = useState({
    tab: 'credit' as 'credit' | 'sales' | 'services',
    date: new Date().toISOString().split('T')[0],
    or_no: '',
    payor_name: '',
    member_id: '',
    // Credit Multi-Loan
    loans: [
      {
        id: 'loan-1',
        loan_account: 'Loans Payable - Regular',
        principal_amount: '',
        interest_account: 'Interest Received - Regular',
        interest_amount: '',
        fines_account: 'Fines - Regular',
        fines_amount: '',
      }
    ] as FormLoanEntry[],
    loan_account: 'Loans Payable - Regular',
    principal_amount: '',
    interest_account: 'Interest Received - Regular',
    interest_amount: '',
    fines_account: 'Fines - Regular',
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

  // Filtered and Sorted Collections
  const filteredCollections = useMemo(() => {
    let result = collections.filter(item => {
      // Tab filter
      if (activeTab !== 'all' && item.tab !== activeTab) return false;

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
    const scopeItems = activeTab === 'all' ? collections : collections.filter(c => c.tab === activeTab);
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

  // Selection handlers
  const toggleSelectAll = () => {
    if (filteredCollections.length > 0 && selectedIds.length === filteredCollections.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCollections.map(c => c.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  // Open Add Modal
  const openRecordModal = () => {
    const targetCategory = (activeTab === 'all' ? 'credit' : activeTab) as 'credit' | 'sales' | 'services';
    setFormData({
      tab: targetCategory,
      date: new Date().toISOString().split('T')[0],
      or_no: '',
      payor_name: '',
      member_id: '',
      loans: [
        {
          id: `loan-${Date.now()}`,
          loan_account: 'Loans Payable - Regular',
          principal_amount: '',
          interest_account: 'Interest Received - Regular',
          interest_amount: '',
          fines_account: 'Fines - Regular',
          fines_amount: '',
        }
      ],
      loan_account: 'Loans Payable - Regular',
      principal_amount: '',
      interest_account: 'Interest Received - Regular',
      interest_amount: '',
      fines_account: 'Fines - Regular',
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
      status: 'completed',
      remarks: '',
      collected_by: 'CHINNETTE A. LAMOSTE'
    });
    setIsAddModalOpen(true);
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
    } else if (formData.tab === 'sales') {
      const q = parseInt(formData.quantity || '1', 10) || 1;
      const u = parseFloat(formData.unit_price || '0') || 0;
      if (u > 0) calculatedAmount = q * u;
    } else if (formData.tab === 'services') {
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
      item_name: formData.item_name.trim() || undefined,
      item_category: formData.item_category.trim() || undefined,
      quantity: parseInt(formData.quantity || '1', 10) || undefined,
      unit_price: parseFloat(formData.unit_price || '0') || undefined,
      service_type: formData.service_type || undefined,
      service_copies: parseInt(formData.service_copies || '1', 10) || undefined,
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
        : undefined,
      other_category: undefined,
      amount: calculatedAmount,
      payment_method: formData.payment_method,
      reference_no: (formData.payment_method === 'GCash' || formData.payment_method === 'Bank Transfer')
        ? formData.reference_no.trim() || undefined
        : undefined,
      status: 'completed',
      remarks: formData.remarks.trim() || undefined,
      collected_by: formData.collected_by.trim() || 'CHINNETTE A. LAMOSTE'
    };

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

  // Delete single collection
  const handleDeleteItem = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this collection entry?')) {
      try {
        await api.delete(`/collections/${id}`);
        setCollections(prev => prev.filter(c => c.id !== id));
        if (selectedItemForModal?.id === id) setSelectedItemForModal(null);
        setSelectedIds(prev => prev.filter(x => x !== id));
        setActionFeedback({ type: 'success', message: 'Collection entry removed.' });
        setTimeout(() => setActionFeedback(null), 4000);
      } catch (err: any) {
        console.error('Failed to delete collection entry:', err);
        setActionFeedback({ type: 'error', message: 'Failed to delete collection entry.' });
        setTimeout(() => setActionFeedback(null), 4000);
      }
    }
  };

  // Bulk delete selected
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.post('/collections/bulk-delete', { ids: selectedIds });
      setCollections(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      setActionFeedback({ type: 'success', message: `${selectedIds.length} collection entries deleted.` });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to bulk delete collections:', err);
      setActionFeedback({ type: 'error', message: 'Failed to bulk delete collections.' });
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
            if (loan.fines_amount && loan.fines_amount > 0) parts.push(loan.fines_account || 'Fines');
          }
        } else {
          if (item.principal_amount && item.principal_amount > 0) parts.push(item.loan_account || 'Principal');
          if (item.interest_amount && item.interest_amount > 0) parts.push(item.interest_account || 'Interest');
          if (item.fines_amount && item.fines_amount > 0) parts.push(item.fines_account || 'Fines');
        }
        if (item.common_share_amount && item.common_share_amount > 0) parts.push('Common Share');
        desc = parts.length > 0 ? parts.join(' + ') : (item.loan_account || 'Credit Collection');
      } else if (item.tab === 'sales') desc = `${item.item_name || 'Store Item'} (${item.quantity || 1} pcs @ ₱${item.unit_price || 0})`;
      else if (item.tab === 'services') desc = `${item.service_type || 'Service'} (${item.service_copies || 1} @ ₱${item.service_rate || 0})`;
      else if (item.tab === 'others') desc = item.particulars || 'Miscellaneous';

      return [
        item.date,
        item.or_no,
        item.payor_name,
        item.tab.toUpperCase(),
        desc,
        item.amount.toFixed(2),
        item.payment_method,
        item.reference_no || '',
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

  // Import handler
  const handleImportComplete = async (importedItems: CollectionItem[], mode: 'append' | 'replace') => {
    try {
      const res = await api.post('/collections/bulk', { items: importedItems, mode });
      const savedItems: CollectionItem[] = res.data?.data || importedItems;
      if (mode === 'replace') {
        setCollections(savedItems);
      } else {
        setCollections(prev => {
          const existingIds = new Set(savedItems.map(s => s.id));
          return [...savedItems, ...prev.filter(p => !existingIds.has(p.id))];
        });
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('uc_coop_collections', JSON.stringify(savedItems));
      }
      setActionFeedback({ type: 'success', message: `Imported ${importedItems.length} collection items saved to cloud database!` });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to save imported collections to database:', err);
      setActionFeedback({ type: 'error', message: err?.response?.data?.error?.message || 'Failed to save imported collections to cloud database.' });
      setTimeout(() => setActionFeedback(null), 5000);
      throw err;
    }
  };

  // Helper format Category Label
  const formatCategoryBadge = (tab: 'credit' | 'sales' | 'services' | 'others') => {
    switch (tab) {
      case 'credit':
        return 'CREDIT / LOAN';
      case 'sales':
        return 'SALES';
      case 'services':
        return 'SERVICES';
      case 'others':
        return 'OTHER RECEIPTS';
    }
  };

  // Status Badge Renderer matching Disbursement
  const renderStatusBadge = (status?: string) => {
    const s = (status || 'completed').toLowerCase();
    switch (s) {
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
            <CheckCircle2 className="w-3 h-3" />
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
                      checked={filteredCollections.length > 0 && selectedIds.length === filteredCollections.length}
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
                  filteredCollections.map(item => {
                    const isSelected = selectedIds.includes(item.id);

                    // Formulate primary description
                    let primaryDesc = '';
                    if (item.tab === 'credit') {
                      const parts: string[] = [];
                      if (item.loans && item.loans.length > 0) {
                        for (const loan of item.loans) {
                          if (loan.principal_amount && loan.principal_amount > 0) parts.push(loan.loan_account);
                          if (loan.interest_amount && loan.interest_amount > 0) parts.push(loan.interest_account || 'Interest');
                          if (loan.fines_amount && loan.fines_amount > 0) parts.push(loan.fines_account || 'Fines');
                        }
                      } else {
                        if (item.principal_amount && item.principal_amount > 0) parts.push(item.loan_account || 'Principal');
                        if (item.interest_amount && item.interest_amount > 0) parts.push(item.interest_account || 'Interest');
                        if (item.fines_amount && item.fines_amount > 0) parts.push(item.fines_account || 'Fines');
                      }
                      if (item.common_share_amount && item.common_share_amount > 0) parts.push('Common Share');
                      primaryDesc = parts.length > 0 ? parts.join(' + ') : (item.loan_account || item.particulars || 'Loan Repayment');
                    } else if (item.tab === 'sales') {
                      primaryDesc = `${item.item_name || 'Store Item'}${item.quantity ? ` (${item.quantity} pcs)` : ''}`;
                    } else if (item.tab === 'services') {
                      primaryDesc = `${item.service_type || 'Service'}${item.service_copies ? ` (${item.service_copies} units)` : ''}`;
                    } else {
                      primaryDesc = item.particulars || 'Collection Receipt';
                    }

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItemForModal(item)}
                        className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer ${
                          isSelected ? 'bg-primary/5 dark:bg-secondary/5' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(item.id)}
                            className="rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3 font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                          <span className="font-mono text-primary dark:text-secondary hover:underline">
                            {item.or_no}
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
                          {item.reference_no && (
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold mt-0.5">
                              {item.payment_method === 'GCash' ? `****${item.reference_no}` : item.reference_no}
                            </div>
                          )}
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
                            {/* Print Receipt */}
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

                            {/* Delete Item */}
                            <button
                              type="button"
                              onClick={e => handleDeleteItem(item.id, e)}
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                              title="Delete Collection Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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
                <div className="grid grid-cols-3 gap-2">
                  {(['credit', 'sales', 'services'] as const).map(tabKey => (
                    <button
                      key={tabKey}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tab: tabKey }))}
                      className={`py-2 px-2.5 rounded-xl font-bold uppercase text-[11px] transition-all cursor-pointer border ${
                        formData.tab === tabKey
                          ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border-primary dark:border-secondary shadow-2xs'
                          : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-outline-variant/60 hover:bg-neutral-100'
                      }`}
                    >
                      {tabKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Receipt
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.or_no}
                    onChange={e => setFormData({ ...formData, or_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-transparent font-mono font-bold text-xs text-neutral-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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

              {/* Dynamic Fields for Sales */}
              {formData.tab === 'sales' && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300/60 dark:border-emerald-800/40 space-y-3">
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
                </div>
              )}

              {/* Dynamic Fields for Services */}
              {formData.tab === 'services' && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300/60 dark:border-emerald-800/40 space-y-3">
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

                {/* Conditional Reference No for GCash or Bank Transfer */}
                {formData.payment_method === 'GCash' && (
                  <div>
                    <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1 text-xs">
                      GCash Reference (Last 4 Digits)
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
                      Bank Transfer Reference (Full)
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
                  {selectedItemForModal.reference_no && (
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      Ref: {selectedItemForModal.payment_method === 'GCash' ? `****${selectedItemForModal.reference_no}` : selectedItemForModal.reference_no}
                    </p>
                  )}
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
                {selectedItemForModal.tab === 'sales' && (
                  <div className="space-y-1">
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">Item: {selectedItemForModal.item_name || 'Store Item'}</p>
                    <p className="text-neutral-500">Category: {selectedItemForModal.item_category || 'Uniform'}</p>
                    <p className="text-neutral-500">Quantity: {selectedItemForModal.quantity || 1} pcs @ ₱{(selectedItemForModal.unit_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
                {selectedItemForModal.tab === 'services' && (
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
                <button
                  type="button"
                  onClick={() => handleDeleteItem(selectedItemForModal.id)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                >
                  Delete Entry
                </button>
                <div className="flex items-center gap-2">
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

        <div className="grid grid-cols-3 gap-2 text-xs border p-3 rounded bg-neutral-50 font-bold">
          <div>Credit Collections: ₱{collections.filter(c => c.tab === 'credit').reduce((s, c) => s + c.amount, 0).toFixed(2)}</div>
          <div>Sales: ₱{collections.filter(c => c.tab === 'sales').reduce((s, c) => s + c.amount, 0).toFixed(2)}</div>
          <div>Services: ₱{collections.filter(c => c.tab === 'services').reduce((s, c) => s + c.amount, 0).toFixed(2)}</div>
          <div className="col-span-3 text-sm font-black text-right border-t pt-1">
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
