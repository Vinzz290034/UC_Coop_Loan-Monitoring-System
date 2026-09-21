'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import api from '@/lib/api';
import {
  FileSpreadsheet,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Printer,
  Link2,
  Unlink,
  FileCheck,
  Receipt,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Layers,
  Banknote,
  DollarSign,
  Calendar,
  ChevronUp,
  PieChart,
  Sparkles,
  Edit3
} from 'lucide-react';

interface LiquidationItem {
  id?: string;
  item_date?: string | null;
  item_date_raw?: string | null;
  particulars: string;
  amount: number;
  account_name?: string;
  category?: string;
  remarks?: string;
  is_cancelled?: boolean;
  sort_order?: number;
}

interface LiquidationForm {
  id: string;
  lf_no: string;
  sheet_name?: string;
  check_voucher_id?: string | null;
  voucher_no?: string | null;
  authorized_amount: number | string;
  total_liquidated: number | string;
  balance_remaining?: number | string;
  status: 'open' | 'replenished' | 'closed' | string;
  custodian_name?: string;
  period_start?: string | null;
  period_end?: string | null;
  notes?: string | null;
  created_at: string;
  cv_voucher_no?: string;
  cv_check_no?: string;
  cv_payee?: string;
  cv_bank?: string;
  cv_amount?: number;
  cv_voucher_date?: string;
  item_count?: number;
}

interface RevolvingFundsTabProps {
  isAdminOrManager: boolean;
  onViewCheckVoucher?: (voucherIdOrNo: string, fallbackVoucherNo?: string) => void;
  initialSearch?: string;
  targetLiquidationId?: string;
  onClearTarget?: () => void;
}

export const CATEGORY_OPTIONS = [
  {
    value: 'CETF',
    bgBadge: 'bg-emerald-50 dark:bg-emerald-950/30',
    textBadge: 'text-emerald-700 dark:text-emerald-300',
    iconColor: 'text-emerald-400',
    activeCls: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300',
    dotCls: 'bg-emerald-500'
  },
  {
    value: 'Operation',
    bgBadge: 'bg-blue-50 dark:bg-blue-950/30',
    textBadge: 'text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-400',
    activeCls: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300',
    dotCls: 'bg-blue-500'
  },
  {
    value: 'Service',
    bgBadge: 'bg-purple-50 dark:bg-purple-950/30',
    textBadge: 'text-purple-700 dark:text-purple-300',
    iconColor: 'text-purple-400',
    activeCls: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300',
    dotCls: 'bg-purple-500'
  },
  {
    value: 'Merchandise',
    bgBadge: 'bg-amber-50 dark:bg-amber-950/30',
    textBadge: 'text-amber-700 dark:text-amber-300',
    iconColor: 'text-amber-400',
    activeCls: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300',
    dotCls: 'bg-amber-500'
  },
  {
    value: 'CDF',
    bgBadge: 'bg-rose-50 dark:bg-rose-950/30',
    textBadge: 'text-rose-700 dark:text-rose-300',
    iconColor: 'text-rose-400',
    activeCls: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300',
    dotCls: 'bg-rose-500'
  }
];

export const ACCOUNT_OPTIONS = [
  'Advances to employee',
  'Seminar & Training',
  'Professional Fee',
  'SSS premium-EE Share',
  'COS -water',
  'Transportation',
  'Honorarium',
  'Representation',
  'COS- hardbound',
  'Inventory-handbag',
  'Wages',
  'Communication',
  'Repair & Maintenance',
  'COS- printing',
  'Office supplies',
  'Hygiene expense',
  'Insurance payable- Climbs',
  'Licenses & Taxes',
  'Inventory-hardhat',
  'Inventory-safety goggles',
  'Miscellaneous',
  'Freight in',
  'Porterage',
  'Meeting & conferences',
  'loan receivable',
  'COGS-Pershing cap',
  'COGS-handbag',
  'COS-Wifi',
  'SSS premium-ER share',
  'Pag-ibig premium ER share',
  'Pag-ibig premium- EE share',
  'Service charge',
  'Philhealth -EE share',
  'Philhealth-ER share',
  'Inventory-Pershing cap',
  'Refund Payable',
  'Meeting meals',
  'Incentive',
  'key locker duplicate',
  'Commission- Participation Card',
  'Insurance Payable- 1CISP',
  'COS- Insurance',
  'Commission- ROTC Manual',
  'Office Use',
  'labor',
  'Fixture & Furniture',
  'Account Payable',
  'Donation Expense'
];

export const getCategoryForAccount = (acct: string): string => {
  if (['COS-Wifi', 'COS -water', 'COS- Insurance', 'COS- hardbound', 'COS- printing', 'Service charge', 'key locker duplicate'].includes(acct)) {
    return 'Service';
  }
  if (acct.startsWith('Inventory-') || acct.startsWith('COGS-') || acct.startsWith('Commission-')) {
    return 'Merchandise';
  }
  return 'Operation';
};

export default function RevolvingFundsTab({
  isAdminOrManager,
  onViewCheckVoucher,
  initialSearch,
  targetLiquidationId,
  onClearTarget
}: RevolvingFundsTabProps) {
  const [liquidations, setLiquidations] = useState<LiquidationForm[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(initialSearch || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'replenished' | 'closed'>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [summary, setSummary] = useState({
    total_forms: 0,
    total_authorized: 0,
    total_liquidated: 0,
    total_balance: 0
  });

  // Expanded LF IDs for inline accordion breakdown
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [expandedDetailsMap, setExpandedDetailsMap] = useState<Record<string, {
    items: LiquidationItem[];
    accountSummary: Record<string, number>;
    categorySummary: Record<string, number>;
    loading: boolean;
  }>>({});
  const [expandedAccountPills, setExpandedAccountPills] = useState<Record<string, boolean>>({});

  // Modals state
  const [linkingLf, setLinkingLf] = useState<LiquidationForm | null>(null);
  const [checkVouchersList, setCheckVouchersList] = useState<any[]>([]);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvSearch, setCvSearch] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [autoSyncOnLink, setAutoSyncOnLink] = useState(true);
  const [syncingVoucherId, setSyncingVoucherId] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<{ id: string; text: string } | null>(null);

  // Print state
  const [printingLf, setPrintingLf] = useState<{
    form: LiquidationForm;
    items: LiquidationItem[];
    accountSummary: Record<string, number>;
    categorySummary?: Record<string, number>;
  } | null>(null);

  // Delete state
  const [lfToDelete, setLfToDelete] = useState<LiquidationForm | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create / Edit modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingLf, setEditingLf] = useState<LiquidationForm | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    lf_no: '',
    sheet_name: '',
    authorized_amount: '',
    custodian_name: '',
    status: 'open',
    notes: '',
    items: [] as LiquidationItem[]
  });
  const [savingForm, setSavingForm] = useState(false);
  const [openCategoryIdx, setOpenCategoryIdx] = useState<number | null>(null);
  const [openAccountIdx, setOpenAccountIdx] = useState<number | null>(null);
  const [accountSearch, setAccountSearch] = useState('');

  // Load Liquidations
  const loadLiquidations = useCallback(async (pageNum = page) => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: pageNum,
        limit,
        status: statusFilter
      };
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/revolving-funds', { params });
      if (res.data.success) {
        setLiquidations(res.data.data || []);
        if (res.data.summary) {
          setSummary({
            total_forms: parseInt(res.data.summary.total_forms || '0', 10),
            total_authorized: parseFloat(res.data.summary.total_authorized || '0'),
            total_liquidated: parseFloat(res.data.summary.total_liquidated || '0'),
            total_balance: parseFloat(res.data.summary.total_balance || '0')
          });
        }
        if (res.data.pagination) {
          setTotalCount(res.data.pagination.total);
          setTotalPages(res.data.pagination.totalPages);
          setPage(res.data.pagination.page);
        }
      }
    } catch (error) {
      console.error('Failed to load revolving fund liquidations:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, search]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    loadLiquidations(1);
  }, [loadLiquidations, statusFilter]);

  // Synchronize when initialSearch is provided from parent
  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  // Auto-expand targeted liquidation form once loaded
  useEffect(() => {
    if ((targetLiquidationId || initialSearch) && liquidations.length > 0) {
      const match = liquidations.find(l => 
        (targetLiquidationId && l.id === targetLiquidationId) || 
        (initialSearch && (
          l.lf_no.toLowerCase().includes(initialSearch.toLowerCase()) || 
          (l.sheet_name && l.sheet_name.toLowerCase().includes(initialSearch.toLowerCase())) ||
          (l.voucher_no && l.voucher_no.toLowerCase().includes(initialSearch.toLowerCase()))
        ))
      );
      if (match && !expandedIds.includes(match.id)) {
        toggleExpand(match);
      }
    }
  }, [liquidations, targetLiquidationId, initialSearch]);

  // Close active dropdowns when clicking outside
  useEffect(() => {
    if (openAccountIdx === null && openCategoryIdx === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-dropdown-container]')) {
        return;
      }
      setOpenAccountIdx(null);
      setOpenCategoryIdx(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openAccountIdx, openCategoryIdx]);

  // Toggle inline expansion & fetch full items
  const toggleExpand = async (lf: LiquidationForm) => {
    const isExpanded = expandedIds.includes(lf.id);
    if (isExpanded) {
      setExpandedIds(prev => prev.filter(id => id !== lf.id));
      return;
    }

    setExpandedIds(prev => [...prev, lf.id]);

    // If not already fetched, load items
    if (!expandedDetailsMap[lf.id] || expandedDetailsMap[lf.id].items.length === 0) {
      setExpandedDetailsMap(prev => ({
        ...prev,
        [lf.id]: { items: [], accountSummary: {}, categorySummary: {}, loading: true }
      }));

      try {
        const res = await api.get(`/revolving-funds/${lf.id}`);
        if (res.data.success && res.data.data) {
          const { items, accountSummary, categorySummary } = res.data.data;
          setExpandedDetailsMap(prev => ({
            ...prev,
            [lf.id]: {
              items: items || [],
              accountSummary: accountSummary || {},
              categorySummary: categorySummary || {},
              loading: false
            }
          }));
        }
      } catch (err) {
        console.error('Failed to fetch liquidation details:', err);
        setExpandedDetailsMap(prev => ({
          ...prev,
          [lf.id]: { items: [], accountSummary: {}, categorySummary: {}, loading: false }
        }));
      }
    }
  };

  // Open Link Voucher modal
  const openLinkModal = async (lf: LiquidationForm) => {
    setLinkingLf(lf);
    setAutoSyncOnLink(true);
    setCvLoading(true);
    try {
      // Query check vouchers
      const res = await api.get('/accounts/check-vouchers', {
        params: { limit: 100 }
      });
      setCheckVouchersList(res.data.data || []);
    } catch (err) {
      console.error('Failed to load check vouchers for linking:', err);
    } finally {
      setCvLoading(false);
    }
  };

  const handleSaveLink = async (cvId: string | null) => {
    if (!linkingLf) return;
    try {
      setSavingLink(true);
      await api.post(`/revolving-funds/${linkingLf.id}/link-voucher`, {
        check_voucher_id: cvId,
        auto_sync_amounts: cvId ? autoSyncOnLink : false
      });
      setLinkingLf(null);
      await loadLiquidations(page);
    } catch (err: any) {
      console.error('Failed to link check voucher:', err);
      alert(err?.response?.data?.message || 'Failed to link check voucher');
    } finally {
      setSavingLink(false);
    }
  };

  // Quick sync liquidation breakdown amounts to linked check voucher
  const handleSyncVoucherAmounts = async (lf: LiquidationForm, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setSyncingVoucherId(lf.id);
      const res = await api.post(`/revolving-funds/${lf.id}/sync-voucher-amounts`);
      if (res.data.success) {
        setSyncSuccessMsg({
          id: lf.id,
          text: `Successfully synced ₱${Number(res.data.data?.amount || lf.total_liquidated).toLocaleString('en-US', { minimumFractionDigits: 2 })} into CV #${res.data.data?.voucher_no || lf.voucher_no}!`
        });
        setTimeout(() => setSyncSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      console.error('Failed to sync amounts to check voucher:', err);
      alert(err?.response?.data?.message || 'Failed to sync amounts to check voucher.');
    } finally {
      setSyncingVoucherId(null);
    }
  };

  // Delete LF
  const handleDeleteLf = async () => {
    if (!lfToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/revolving-funds/${lfToDelete.id}`);
      setLfToDelete(null);
      await loadLiquidations(page);
    } catch (err) {
      console.error('Failed to delete liquidation form:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Print LF
  const handlePrint = async (lf: LiquidationForm, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      let details = expandedDetailsMap[lf.id];
      if (!details || details.items.length === 0) {
        const res = await api.get(`/revolving-funds/${lf.id}`);
        if (res.data.success && res.data.data) {
          details = {
            items: res.data.data.items || [],
            accountSummary: res.data.data.accountSummary || {},
            categorySummary: res.data.data.categorySummary || {},
            loading: false
          };
        }
      }

      setPrintingLf({
        form: lf,
        items: details?.items || [],
        accountSummary: details?.accountSummary || {},
        categorySummary: details?.categorySummary || {}
      });

      const cleanup = () => {
        window.removeEventListener('afterprint', cleanup);
        setPrintingLf(null);
      };
      window.addEventListener('afterprint', cleanup);
      setTimeout(() => {
        window.print();
      }, 250);
    } catch (err) {
      console.error('Failed to prepare print view:', err);
    }
  };

  // Open Edit / Create Form
  const openCreateModal = () => {
    setEditingLf(null);
    setFormData({
      lf_no: '',
      sheet_name: '',
      authorized_amount: '',
      custodian_name: '',
      status: 'open',
      notes: '',
      items: [
        {
          item_date_raw: '',
          particulars: '',
          amount: 0,
          account_name: 'Office supplies',
          category: 'Operation',
          remarks: ''
        }
      ]
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (lf: LiquidationForm) => {
    setEditingLf(lf);

    const mapItems = (rawItems: LiquidationItem[]) =>
      rawItems.length > 0 ? rawItems.map((it: any) => ({
        ...it,
        particulars: (!it.particulars || /^item\s*#\d+$/i.test(it.particulars.trim())) ? '' : it.particulars,
        amount: Number(it.amount) || 0,
        item_date_raw: it.item_date_raw || (it.item_date ? String(it.item_date).split('T')[0] : '')
      })) : [
        {
          item_date_raw: '',
          particulars: '',
          amount: 0,
          account_name: 'Office supplies',
          category: 'Operation',
          remarks: ''
        }
      ];

    const existingItems = expandedDetailsMap[lf.id]?.items || [];

    // INSTANT: Immediately open modal using in-memory cached items
    setFormData({
      lf_no: lf.lf_no,
      sheet_name: lf.sheet_name || '',
      authorized_amount: String(lf.authorized_amount ?? '100000'),
      custodian_name: lf.custodian_name || 'Michelle M. Pable',
      status: lf.status || 'open',
      notes: lf.notes || '',
      items: mapItems(existingItems)
    });
    setIsFormModalOpen(true);

    // If items were not yet cached for this LF, load in the background
    if (existingItems.length === 0) {
      setLoadingEditId(lf.id);
      api.get(`/revolving-funds/${lf.id}`)
        .then(res => {
          if (res.data?.success && res.data?.data) {
            const fetchedItems = res.data.data.items || [];
            setExpandedDetailsMap(prev => ({
              ...prev,
              [lf.id]: {
                items: fetchedItems,
                accountSummary: res.data.data.accountSummary || {},
                categorySummary: res.data.data.categorySummary || {},
                loading: false
              }
            }));
            setFormData(prev => ({
              ...prev,
              items: mapItems(fetchedItems)
            }));
          }
        })
        .catch(err => console.error('Failed to load items in background:', err))
        .finally(() => setLoadingEditId(null));
    }
  };

  const handleSaveForm = async () => {
    if (!formData.lf_no.trim()) return;
    try {
      setSavingForm(true);
      if (editingLf) {
        await api.put(`/revolving-funds/${editingLf.id}`, {
          lf_no: formData.lf_no.trim(),
          sheet_name: formData.sheet_name.trim() || null,
          authorized_amount: parseFloat(formData.authorized_amount) || 0,
          custodian_name: formData.custodian_name.trim(),
          status: formData.status,
          notes: formData.notes.trim() || null,
          items: formData.items
        });

        // Refetch details for this liquidation so the breakdown accordion immediately reflects changes
        try {
          const detailRes = await api.get(`/revolving-funds/${editingLf.id}`);
          if (detailRes.data?.success && detailRes.data?.data) {
            const { items, accountSummary, categorySummary } = detailRes.data.data;
            setExpandedDetailsMap(prev => ({
              ...prev,
              [editingLf.id]: {
                items: items || [],
                accountSummary: accountSummary || {},
                categorySummary: categorySummary || {},
                loading: false
              }
            }));
          }
        } catch (e) {
          console.error('Failed to reload details:', e);
        }
      } else {
        await api.post('/revolving-funds', {
          lf_no: formData.lf_no.trim(),
          sheet_name: formData.sheet_name.trim() || null,
          authorized_amount: parseFloat(formData.authorized_amount) || 0,
          custodian_name: formData.custodian_name.trim(),
          notes: formData.notes.trim() || null,
          items: formData.items
        });
      }
      setIsFormModalOpen(false);
      await loadLiquidations(page);
    } catch (err: any) {
      console.error('Failed to save liquidation form:', err);
      alert(err.response?.data?.error?.message || 'Failed to save liquidation form.');
    } finally {
      setSavingForm(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Top Stat Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Liquidation Forms
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-headline text-on-surface dark:text-white mt-2">
            {summary.total_forms}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Registered RF Forms
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Authorized Fund
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-headline text-on-surface dark:text-white mt-2">
            ₱{summary.total_authorized.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Revolving fund allocation
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Liquidated
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-headline text-emerald-600 dark:text-emerald-400 mt-2">
            ₱{summary.total_liquidated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Vouched expenses liquidated
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Replenishment Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-headline text-amber-600 dark:text-amber-400 mt-2">
            ₱{summary.total_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Remaining unreplenished
          </div>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/60 shadow-sm">
        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
          {/* Status Tabs */}
          <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold">
            {(['all', 'open', 'replenished', 'closed'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white dark:bg-neutral-900 text-on-surface dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-on-surface'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  setPage(1);
                  loadLiquidations(1);
                }
              }}
              placeholder="Search LF #, CV #, payee, custodian..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 border border-outline-variant/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-on-surface dark:text-white placeholder:text-neutral-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                  loadLiquidations(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setPage(1);
              loadLiquidations(1);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Search</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end flex-wrap">
          <Link
            href="/dashboard/import?mode=revolving_funds"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-full transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import Liquidation (.xlsx)</span>
          </Link>

          {isAdminOrManager && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Liquidation Form</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between">
          <h4 className="font-headline text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" /> Revolving Fund Liquidation Forms (LF)
          </h4>
          <span className="text-xs text-neutral-500 font-medium">
            {totalCount > 0 ? `${totalCount} total forms` : `${liquidations.length} forms`}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Loading liquidation forms...</span>
          </div>
        ) : liquidations.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <p className="font-semibold text-sm text-neutral-700 dark:text-neutral-300">
              No Revolving Fund Liquidation Forms found.
            </p>
            <p className="text-neutral-500 max-w-md mx-auto">
              Import liquidation sheets (e.g. RF-35, RF-48) directly from your Excel workbook or click &ldquo;New Liquidation Form&rdquo; to create one manually.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/import?mode=revolving_funds"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs transition-all shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Go to Excel Import Hub</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low dark:bg-surface-container-high/40 border-b border-outline-variant/45">
                  <th className="px-3 py-3 w-10 text-center"></th>
                  <th className="px-4 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase whitespace-nowrap">
                    LF No.
                  </th>
                  <th className="px-4 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase whitespace-nowrap">
                    Linked Check Voucher
                  </th>
                  <th className="px-4 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase whitespace-nowrap">
                    Custodian
                  </th>
                  <th className="px-4 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-right whitespace-nowrap">
                    Authorized Amt
                  </th>
                  <th className="px-4 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-right whitespace-nowrap">
                    Liquidated
                  </th>
                  <th className="px-4 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-right whitespace-nowrap">
                    Balance
                  </th>
                  <th className="px-4 py-3 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/35 font-body text-xs text-on-surface dark:text-white/95">
                {liquidations.map(lf => {
                  const isExpanded = expandedIds.includes(lf.id);
                  const details = expandedDetailsMap[lf.id];
                  const authAmt = parseFloat(String(lf.authorized_amount || 0));
                  const liqAmt = parseFloat(String(lf.total_liquidated || 0));
                  const balAmt = authAmt - liqAmt;

                  return (
                    <React.Fragment key={lf.id}>
                      <tr
                        onClick={() => toggleExpand(lf)}
                        className={`transition-colors cursor-pointer hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 ${
                          isExpanded ? 'bg-emerald-50/50 dark:bg-emerald-950/30 font-medium' : ''
                        }`}
                      >
                        <td className="px-3 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              toggleExpand(lf);
                            }}
                            className="p-1 rounded text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* LF No */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                              {lf.lf_no}
                            </span>
                            {lf.sheet_name && lf.sheet_name !== lf.lf_no && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 font-mono">
                                {lf.sheet_name}
                              </span>
                            )}
                          </div>
                          {lf.period_start && (
                            <div className="text-[10px] text-neutral-500 mt-0.5">
                              {new Date(lf.period_start).toLocaleDateString()}
                              {lf.period_end && ` – ${new Date(lf.period_end).toLocaleDateString()}`}
                            </div>
                          )}
                        </td>

                        {/* Linked Check Voucher */}
                        <td className="px-4 py-3.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          {lf.check_voucher_id || lf.voucher_no ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onViewCheckVoucher?.(lf.check_voucher_id || '', lf.voucher_no || lf.cv_voucher_no || '')}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-2xs group"
                                title="Click to view Check Voucher modal"
                              >
                                <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                                <span>CV #{lf.voucher_no || lf.cv_voucher_no}</span>
                                <ExternalLink className="w-3 h-3 text-emerald-600/70 dark:text-emerald-400/70" />
                              </button>
                              {isAdminOrManager && (
                                <button
                                  type="button"
                                  onClick={() => openLinkModal(lf)}
                                  className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                  title="Change linked voucher"
                                >
                                  <Link2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            isAdminOrManager ? (
                              <button
                                type="button"
                                onClick={() => openLinkModal(lf)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-500 hover:text-emerald-700 dark:hover:text-emerald-400 bg-neutral-100 hover:bg-emerald-50 dark:bg-neutral-800 dark:hover:bg-emerald-950/40 border border-dashed border-outline-variant rounded-xl transition-all"
                              >
                                <Link2 className="w-3 h-3" />
                                <span>+ Link Check Voucher</span>
                              </button>
                            ) : (
                              <span className="text-neutral-400 italic text-[11px]">Unlinked</span>
                            )
                          )}
                        </td>

                        {/* Custodian */}
                        <td className="px-4 py-3.5 font-medium whitespace-nowrap">
                          {lf.custodian_name || 'Michelle M. Pable'}
                        </td>

                        {/* Authorized Amount */}
                        <td className="px-4 py-3.5 font-mono font-bold text-right whitespace-nowrap">
                          ₱{authAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Liquidated Amount */}
                        <td className="px-4 py-3.5 font-mono font-bold text-right text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          ₱{liqAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Remaining Balance */}
                        <td className="px-4 py-3.5 font-mono font-bold text-right text-amber-700 dark:text-amber-400 whitespace-nowrap">
                          ₱{balAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleExpand(lf)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-900/60 rounded-xl transition-all shadow-2xs cursor-pointer"
                              title="Toggle item breakdown"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>{isExpanded ? 'Hide' : 'Breakdown'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={e => handlePrint(lf, e)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl transition-all cursor-pointer"
                              title="Print Liquidation Form"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print</span>
                            </button>

                            {isAdminOrManager && (
                              <button
                                type="button"
                                disabled={loadingEditId === lf.id}
                                onClick={() => openEditModal(lf)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl transition-all cursor-pointer"
                                title="Edit Liquidation Form & Vouchers"
                              >
                                {loadingEditId === lf.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
                                ) : (
                                  <Edit3 className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                                )}
                                <span>Edit</span>
                              </button>
                            )}

                            {isAdminOrManager && (
                              <button
                                type="button"
                                onClick={() => setLfToDelete(lf)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-600 hover:text-rose-800 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                                title="Delete Liquidation Form"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* INLINE EXPANDED BREAKDOWN ACCORDION */}
                      {isExpanded && (
                        <tr className="bg-neutral-50/95 dark:bg-neutral-900/90 border-b border-outline-variant/35 animate-fadeIn">
                          <td colSpan={8} className="px-4 sm:px-6 py-4">
                            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
                              {/* Header info */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                                    <Receipt className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h5 className="font-headline font-bold text-sm text-on-surface dark:text-white flex items-center gap-2">
                                      Liquidation Items Breakdown
                                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                        ({lf.lf_no})
                                      </span>
                                    </h5>
                                    <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                                      Custodian: <strong>{lf.custodian_name || 'Michelle M. Pable'}</strong>
                                      {lf.voucher_no && ` • Linked to Check Voucher: #${lf.voucher_no}`}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {isAdminOrManager && (
                                    <button
                                      type="button"
                                      disabled={loadingEditId === lf.id}
                                      onClick={() => openEditModal(lf)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-white bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-xl transition-all cursor-pointer shadow-xs"
                                      title="Edit this Liquidation Form and its Vouchers"
                                    >
                                      {loadingEditId === lf.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                      ) : (
                                        <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                      )}
                                      <span>Edit Form</span>
                                    </button>
                                  )}
                                  {(lf.check_voucher_id || lf.voucher_no) && (
                                    <button
                                      type="button"
                                      disabled={syncingVoucherId === lf.id}
                                      onClick={e => handleSyncVoucherAmounts(lf, e)}
                                      title={`Auto-sync category debit & bank credit rows totaling ₱${Number(lf.total_liquidated || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} into CV #${lf.voucher_no || ''}`}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 rounded-xl transition-all shadow-xs"
                                    >
                                      {syncingVoucherId === lf.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                      ) : (
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                      )}
                                      <span>{syncingVoucherId === lf.id ? 'Syncing...' : `Sync Amounts to CV #${lf.voucher_no}`}</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={e => handlePrint(lf, e)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:text-neutral-800 dark:text-neutral-300 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl transition-all"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print Form</span>
                                  </button>
                                </div>
                              </div>

                              {/* Sync Success Message Banner */}
                              {syncSuccessMsg && syncSuccessMsg.id === lf.id && (
                                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-700 dark:text-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>{syncSuccessMsg.text}</span>
                                </div>
                              )}

                              {/* Clean Structured Category Expense Grid */}
                              {details && (() => {
                                const totalExpense = parseFloat(String(lf.total_liquidated || 0)) || 1;
                                const catSummary: Record<string, number> = (details.categorySummary && Object.keys(details.categorySummary).length > 0)
                                  ? details.categorySummary
                                  : (details.items || []).reduce((acc, it) => {
                                      if (!it.is_cancelled && Number(it.amount) > 0) {
                                        const cat = (it.category || 'Operation').trim();
                                        acc[cat] = (acc[cat] || 0) + Number(it.amount);
                                      }
                                      return acc;
                                    }, {} as Record<string, number>);

                                const filteredSortedCategories = Object.entries(catSummary)
                                  .filter(([cat, amt]) => Number(amt) > 0)
                                  .sort((a, b) => Number(b[1]) - Number(a[1]));

                                if (filteredSortedCategories.length === 0) return null;

                                const isShowAll = Boolean(expandedAccountPills[lf.id]);
                                const displayCategories = isShowAll ? filteredSortedCategories : filteredSortedCategories.slice(0, 8);
                                const remainingCount = filteredSortedCategories.length - 8;

                                return (
                                  <div className="bg-neutral-50/80 dark:bg-neutral-900/60 p-4 rounded-2xl border border-outline-variant/40 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 font-headline">
                                          Expense Breakdown by Category
                                        </span>
                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                          {filteredSortedCategories.length} {filteredSortedCategories.length === 1 ? 'Category' : 'Categories'}
                                        </span>
                                      </div>

                                      {filteredSortedCategories.length > 8 && (
                                        <button
                                          type="button"
                                          onClick={() => setExpandedAccountPills(prev => ({ ...prev, [lf.id]: !prev[lf.id] }))}
                                          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                          {isShowAll ? (
                                            <>Show Top 8 <ChevronUp className="w-3.5 h-3.5" /></>
                                          ) : (
                                            <>View All {filteredSortedCategories.length} Categories (+{remainingCount}) <ChevronDown className="w-3.5 h-3.5" /></>
                                          )}
                                        </button>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                      {displayCategories.map(([category, amt]) => {
                                        const numAmt = Number(amt);
                                        const percent = Math.min(100, Math.round((numAmt / totalExpense) * 1000) / 10);

                                        return (
                                          <div
                                            key={category}
                                            className="p-2.5 rounded-xl bg-white dark:bg-surface-container-low border border-outline-variant/50 shadow-2xs hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-1.5"
                                          >
                                            <div className="flex items-start justify-between gap-1">
                                              <span
                                                className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 truncate"
                                                title={category}
                                              >
                                                {category}
                                              </span>
                                              <span className="text-[10px] font-mono font-bold text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                                                {percent}%
                                              </span>
                                            </div>

                                            <div>
                                              <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                                ₱{numAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </div>
                                              <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                                                <div
                                                  className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full transition-all duration-300"
                                                  style={{ width: `${Math.max(4, percent)}%` }}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Items Table */}
                              {details?.loading ? (
                                <div className="p-6 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                                  <span>Loading voucher items...</span>
                                </div>
                              ) : (!details || details.items.length === 0) ? (
                                <div className="p-6 text-center text-xs text-neutral-400 italic">
                                  No line items recorded for this liquidation form.
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-xl border border-outline-variant/40">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-neutral-100/90 dark:bg-neutral-800/90 border-b border-outline-variant/40 text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                                      <tr>
                                        <th className="px-3 py-2.5">Date</th>
                                        <th className="px-3 py-2.5">Particulars / Voucher #</th>
                                        <th className="px-4 py-2.5 text-right">Amount</th>
                                        <th className="px-3 py-2.5">Account</th>
                                        <th className="px-3 py-2.5">Category</th>
                                        <th className="px-4 py-2.5">Remarks / Details</th>
                                        {isAdminOrManager && <th className="px-3 py-2.5 text-center w-14">Action</th>}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant/20 font-body">
                                      {details.items.map((item, idx) => (
                                        <tr
                                          key={item.id || idx}
                                          className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/30 ${
                                            item.is_cancelled ? 'opacity-50 line-through text-neutral-400' : ''
                                          }`}
                                        >
                                          <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px]">
                                            {item.item_date_raw || (item.item_date ? new Date(item.item_date).toLocaleDateString() : '—')}
                                          </td>
                                          <td className="px-3 py-2 font-semibold">
                                            {(!item.particulars || /^item\s*#\d+$/i.test(item.particulars.trim())) ? (
                                              <span className="text-neutral-400 font-normal italic">—</span>
                                            ) : (
                                              item.particulars
                                            )}
                                            {item.is_cancelled && (
                                              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 no-underline">
                                                CANCELLED
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-4 py-2 font-mono font-bold text-right whitespace-nowrap">
                                            {item.amount > 0 ? (
                                              `₱${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                            ) : (
                                              '—'
                                            )}
                                          </td>
                                          <td className="px-3 py-2 font-medium text-neutral-700 dark:text-neutral-300">
                                            {item.account_name || '—'}
                                          </td>
                                          <td className="px-3 py-2">
                                            {item.category ? (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                                                {item.category}
                                              </span>
                                            ) : '—'}
                                          </td>
                                          <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                                            {item.remarks || '—'}
                                          </td>
                                          {isAdminOrManager && (
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                              <button
                                                type="button"
                                                onClick={() => openEditModal(lf)}
                                                className="p-1 rounded-lg text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer"
                                                title="Edit in Liquidation Form"
                                              >
                                                <Edit3 className="w-3.5 h-3.5" />
                                              </button>
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-neutral-100/60 dark:bg-neutral-800/60 font-bold border-t border-outline-variant/40">
                                      <tr>
                                        <td colSpan={2} className="px-3 py-2.5 text-right uppercase text-[11px]">
                                          Total Liquidated:
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-right text-emerald-700 dark:text-emerald-400 text-sm">
                                          ₱{Number(lf.total_liquidated).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td colSpan={3 + (isAdminOrManager ? 1 : 0)}></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-neutral-500">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> · Showing {liquidations.length} of {totalCount} forms
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => { const p = 1; setPage(p); loadLiquidations(p); }}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 disabled:opacity-40"
              >«</button>
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => { const p = page - 1; setPage(p); loadLiquidations(p); }}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 disabled:opacity-40"
              >‹ Prev</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={loading}
                    onClick={() => { setPage(p); loadLiquidations(p); }}
                    className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                      p === page ? 'bg-emerald-600 text-white' : 'border border-outline-variant/60 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => { const p = page + 1; setPage(p); loadLiquidations(p); }}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 disabled:opacity-40"
              >Next ›</button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => { const p = totalPages; setPage(p); loadLiquidations(p); }}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-outline-variant/60 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 disabled:opacity-40"
              >»</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: LINK CHECK VOUCHER */}
      {linkingLf && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-xl shadow-2xl relative animate-modal-pop overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-sm text-on-surface dark:text-white">
                    Link Check Voucher to {linkingLf.lf_no}
                  </h4>
                  <p className="text-xs text-neutral-500">
                    Connect this liquidation form to its replenishment check voucher
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkingLf(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cvSearch}
                  onChange={e => setCvSearch(e.target.value)}
                  placeholder="Filter by voucher #, payee, or particulars..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 border border-outline-variant/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Auto-Add Category Amounts Toggle */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                      Auto-Add Category Amounts to Voucher
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-tight block">
                      Auto-fills CV rows with breakdown totaling <strong>₱{Number(linkingLf.total_liquidated || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> and balances bank credit.
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={autoSyncOnLink}
                    onChange={e => setAutoSyncOnLink(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {cvLoading ? (
                <div className="p-6 text-center text-xs text-neutral-500">
                  Loading vouchers...
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {/* Option to Unlink if already linked */}
                  {linkingLf.check_voucher_id && (
                    <button
                      type="button"
                      disabled={savingLink}
                      onClick={() => handleSaveLink(null)}
                      className="w-full text-left p-3 rounded-xl border border-dashed border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Unlink className="w-3.5 h-3.5" />
                        Unlink Current Voucher (#{linkingLf.voucher_no})
                      </span>
                    </button>
                  )}

                  {checkVouchersList
                    .filter(v => {
                      if (!cvSearch.trim()) return true;
                      const q = cvSearch.toLowerCase();
                      return (
                        (v.voucher_no && v.voucher_no.toLowerCase().includes(q)) ||
                        (v.payee && v.payee.toLowerCase().includes(q)) ||
                        (v.particulars && v.particulars.toLowerCase().includes(q))
                      );
                    })
                    .map(v => {
                      const isSelected = linkingLf.check_voucher_id === v.id;
                      const isRevolving = /revolving|replenishment/i.test(v.particulars || '');

                      return (
                        <div
                          key={v.id}
                          onClick={() => handleSaveLink(v.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                              : isRevolving
                              ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                              : 'border-outline-variant/40 hover:border-outline-variant bg-surface-container-lowest'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300">
                                CV #{v.voucher_no}
                              </span>
                              {isRevolving && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  RF Replenishment
                                </span>
                              )}
                              <span className="text-[10px] text-neutral-500">
                                {v.bank} {v.check_no ? `(Check #${v.check_no})` : ''}
                              </span>
                            </div>
                            <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mt-0.5">
                              {v.payee}
                            </div>
                            {v.particulars && (
                              <div className="text-[10px] text-neutral-500 italic mt-0.5 truncate max-w-sm">
                                {v.particulars}
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-xs">
                              ₱{Number(v.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            {isSelected && (
                              <span className="text-[10px] text-emerald-600 font-bold">Linked</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-outline-variant/30 flex justify-end">
              <button
                type="button"
                onClick={() => setLinkingLf(null)}
                className="px-4 py-2 text-xs font-bold rounded-full border border-outline-variant text-neutral-600 hover:bg-neutral-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: CREATE / EDIT LIQUIDATION FORM */}
      {isFormModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-[98vw] xl:max-w-7xl max-h-[92vh] shadow-2xl relative animate-modal-pop flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/40 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-sm text-on-surface dark:text-white">
                    {editingLf ? `Edit Liquidation Form — ${editingLf.lf_no}` : 'New Revolving Fund Liquidation Form'}
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Fill in the header details then add line items below</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">

              {/* Header Meta — LF info */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">LF Number *</label>
                  <input
                    type="text"
                    value={formData.lf_no}
                    onChange={e => setFormData(prev => ({ ...prev, lf_no: e.target.value }))}
                    placeholder="e.g. LF-49"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Sheet / Tab Ref</label>
                  <input
                    type="text"
                    value={formData.sheet_name}
                    onChange={e => setFormData(prev => ({ ...prev, sheet_name: e.target.value }))}
                    placeholder="e.g. RF-49"
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Authorized Amount (₱) *</label>
                  <input
                    type="number"
                    value={formData.authorized_amount}
                    onChange={e => setFormData(prev => ({ ...prev, authorized_amount: e.target.value }))}
                    placeholder="e.g. 100000"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Custodian Name</label>
                  <input
                    type="text"
                    value={formData.custodian_name}
                    onChange={e => setFormData(prev => ({ ...prev, custodian_name: e.target.value }))}
                    placeholder="e.g. Michelle M. Pable"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-neutral-800 border border-outline-variant/60 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="replenished">Replenished</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Line Items Spreadsheet Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Line Items / Expenses
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-mono">
                      {formData.items.filter(i => !i.is_cancelled).length} items
                    </span>
                  </h5>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-500">Total:</span>
                    <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300">
                      ₱{formData.items.filter(i => !i.is_cancelled).reduce((s, i) => s + (parseFloat(String(i.amount)) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="border border-outline-variant/50 rounded-2xl flex flex-col bg-white dark:bg-neutral-900/20">
                  <div className="overflow-x-auto min-h-[380px]">
                    <table className="w-full text-xs min-w-[860px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-neutral-100 dark:bg-neutral-800 border-b border-outline-variant/40 text-neutral-600 dark:text-neutral-300 font-bold uppercase tracking-wide text-[10px]">
                          <th className="px-3 py-2.5 text-left w-8">#</th>
                          <th className="px-3 py-2.5 text-left w-32">Date</th>
                          <th className="px-3 py-2.5 text-left w-40">Particulars / Voucher #</th>
                          <th className="px-3 py-2.5 text-right w-28">Amount (₱)</th>
                          <th className="px-3 py-2.5 text-left">Account</th>
                          <th className="px-3 py-2.5 text-left w-32">Category</th>
                          <th className="px-3 py-2.5 text-left">Remarks / Details</th>
                          <th className="px-3 py-2.5 text-center w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20">
                        {formData.items.map((item, idx) => {
                          const isDropdownActive = openAccountIdx === idx || openCategoryIdx === idx;
                          const openUpward = formData.items.length > 2 && idx >= formData.items.length - 2;

                          return (
                          <tr
                            key={idx}
                            className={`group transition-colors ${
                              isDropdownActive ? 'relative z-30' : 'relative z-0'
                            } ${item.is_cancelled
                              ? 'bg-neutral-50/60 dark:bg-neutral-900/30 opacity-50 line-through'
                              : 'hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10'
                            }`}
                          >
                            <td className="px-3 py-1.5 text-neutral-400 font-mono text-[11px] text-center">{idx + 1}</td>

                            {/* Date */}
                            <td className="px-2 py-1">
                              <input
                                type="date"
                                value={item.item_date_raw ? String(item.item_date_raw).split('T')[0] : (item.item_date ? String(item.item_date).split('T')[0] : '')}
                                onChange={e => {
                                  const updated = [...formData.items];
                                  updated[idx] = { ...updated[idx], item_date_raw: e.target.value, item_date: e.target.value || null };
                                  setFormData(prev => ({ ...prev, items: updated }));
                                }}
                                disabled={item.is_cancelled}
                                className="w-full px-2 py-1 text-[11px] font-mono bg-white dark:bg-neutral-800 border border-outline-variant/40 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50"
                              />
                            </td>

                            {/* Particulars */}
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={(!item.particulars || /^item\s*#\d+$/i.test(item.particulars.trim())) ? '' : item.particulars}
                                onChange={e => {
                                  const updated = [...formData.items];
                                  updated[idx] = { ...updated[idx], particulars: e.target.value };
                                  setFormData(prev => ({ ...prev, items: updated }));
                                }}
                                disabled={item.is_cancelled}
                                placeholder="RF Voucher"
                                className="w-full px-2 py-1 text-[11px] font-mono bg-white dark:bg-neutral-800 border border-outline-variant/40 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50"
                              />
                            </td>

                            {/* Amount */}
                            <td className="px-2 py-1">
                              <input
                                type="number"
                                step="0.01"
                                value={item.amount === 0 ? '' : item.amount}
                                onChange={e => {
                                  const updated = [...formData.items];
                                  updated[idx] = { ...updated[idx], amount: parseFloat(e.target.value) || 0 };
                                  setFormData(prev => ({ ...prev, items: updated }));
                                }}
                                disabled={item.is_cancelled}
                                placeholder="0.00"
                                className="w-full px-2 py-1 text-[11px] text-right font-mono font-bold bg-white dark:bg-neutral-800 border border-outline-variant/40 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50"
                              />
                            </td>

                            {/* Account — custom animated dropdown */}
                            <td className={`px-2 py-1 ${openAccountIdx === idx ? 'relative z-40' : ''}`}>
                              <div className="relative" data-dropdown-container>
                                <button
                                  type="button"
                                  disabled={item.is_cancelled}
                                  onClick={() => {
                                    if (openAccountIdx === idx) {
                                      setOpenAccountIdx(null);
                                    } else {
                                      setOpenAccountIdx(idx);
                                      setAccountSearch('');
                                    }
                                    setOpenCategoryIdx(null);
                                  }}
                                  className={`w-full flex items-center justify-between gap-1 px-2 py-1 text-[11px] text-left
                                    bg-white dark:bg-neutral-800 border rounded-lg outline-none transition-all duration-150 cursor-pointer
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    ${openAccountIdx === idx
                                      ? 'border-emerald-400 ring-1 ring-emerald-400/60 shadow-sm'
                                      : 'border-outline-variant/40 hover:border-emerald-300'
                                    }`}
                                >
                                  <span className={item.account_name ? 'text-on-surface dark:text-white font-medium' : 'text-neutral-400'}>
                                    {item.account_name || 'Select account…'}
                                  </span>
                                  <ChevronDown className={`w-3 h-3 flex-shrink-0 text-neutral-400 transition-transform duration-200
                                    ${openAccountIdx === idx ? 'rotate-180 text-emerald-500' : ''}`} />
                                </button>

                                {/* Dropdown list */}
                                <div
                                  style={openUpward ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }}
                                  className={`absolute left-0 z-[200] min-w-[280px] w-max max-w-sm bg-white dark:bg-neutral-800
                                  border border-outline-variant/60 rounded-xl shadow-2xl overflow-hidden
                                  transition-all duration-200 ${openUpward ? 'origin-bottom' : 'origin-top'}
                                  ${openAccountIdx === idx
                                    ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
                                    : `opacity-0 scale-y-95 ${openUpward ? 'translate-y-1' : '-translate-y-1'} pointer-events-none`
                                  }`}>
                                  {/* Quick search inside dropdown */}
                                  <div className="p-2 border-b border-outline-variant/20 sticky top-0 bg-white dark:bg-neutral-800 z-10">
                                    <div className="relative">
                                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                                      <input
                                        type="text"
                                        placeholder="Search 48 accounts..."
                                        value={accountSearch}
                                        onChange={e => setAccountSearch(e.target.value)}
                                        className="w-full pl-8 pr-2.5 py-1 text-[11px] bg-neutral-100 dark:bg-neutral-700/50 border border-outline-variant/30 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-on-surface dark:text-neutral-100 placeholder-neutral-400"
                                        onClick={e => e.stopPropagation()}
                                      />
                                    </div>
                                  </div>

                                  {/* Accounts list */}
                                  <div className="max-h-60 overflow-y-auto py-1 divide-y divide-outline-variant/10">
                                    {(() => {
                                      const filtered = ACCOUNT_OPTIONS.filter(acct =>
                                        acct.toLowerCase().includes(accountSearch.toLowerCase().trim())
                                      );
                                      if (filtered.length === 0) {
                                        return (
                                          <div className="px-3 py-4 text-center text-[11px] text-neutral-400 italic">
                                            No matching accounts found
                                          </div>
                                        );
                                      }
                                      return filtered.map(acct => {
                                        const autoCat = getCategoryForAccount(acct);
                                        return (
                                          <button
                                            key={acct}
                                            type="button"
                                            onClick={() => {
                                              const updated = [...formData.items];
                                              updated[idx] = { ...updated[idx], account_name: acct, category: autoCat };
                                              setFormData(prev => ({ ...prev, items: updated }));
                                              setOpenAccountIdx(null);
                                            }}
                                            className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center justify-between gap-3
                                              transition-colors duration-100 cursor-pointer
                                              ${item.account_name === acct
                                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                                                : 'text-on-surface dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/60'
                                              }`}
                                          >
                                            <span className="truncate">{acct}</span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0
                                              ${autoCat === 'Service' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                                : autoCat === 'Merchandise' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                              }`}>
                                              {autoCat}
                                            </span>
                                          </button>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Category — custom animated dropdown */}
                            <td className={`px-2 py-1 ${openCategoryIdx === idx ? 'relative z-40' : ''}`}>
                              <div className="relative" data-dropdown-container>
                                {(() => {
                                  const catConfig = CATEGORY_OPTIONS.find(c => c.value === item.category) || CATEGORY_OPTIONS[1];
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        disabled={item.is_cancelled}
                                        onClick={() => {
                                          setOpenCategoryIdx(openCategoryIdx === idx ? null : idx);
                                          setOpenAccountIdx(null);
                                        }}
                                        className={`w-full flex items-center justify-between gap-1 px-2 py-1 text-[11px] rounded-lg
                                          border outline-none transition-all duration-150 cursor-pointer
                                          disabled:opacity-50 disabled:cursor-not-allowed
                                          ${openCategoryIdx === idx
                                            ? 'border-emerald-400 ring-1 ring-emerald-400/60 shadow-sm'
                                            : 'border-outline-variant/40 hover:border-emerald-300'
                                          }
                                          ${catConfig.bgBadge}`}
                                      >
                                        <span className={`font-semibold ${catConfig.textBadge}`}>
                                          {item.category || 'Operation'}
                                        </span>
                                        <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform duration-200
                                          ${openCategoryIdx === idx ? 'rotate-180' : ''}
                                          ${catConfig.iconColor}`} />
                                      </button>

                                      {/* Dropdown options */}
                                      <div
                                        style={openUpward ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }}
                                        className={`absolute left-0 z-[200] min-w-full w-40 bg-white dark:bg-neutral-800
                                        border border-outline-variant/60 rounded-xl shadow-2xl overflow-hidden
                                        transition-all duration-200 ${openUpward ? 'origin-bottom' : 'origin-top'}
                                        ${openCategoryIdx === idx
                                          ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
                                          : `opacity-0 scale-y-95 ${openUpward ? 'translate-y-1' : '-translate-y-1'} pointer-events-none`
                                        }`}>
                                        {CATEGORY_OPTIONS.map(({ value, activeCls, dotCls }) => (
                                          <button
                                            key={value}
                                            type="button"
                                            onClick={() => {
                                              const updated = [...formData.items];
                                              updated[idx] = { ...updated[idx], category: value };
                                              setFormData(prev => ({ ...prev, items: updated }));
                                              setOpenCategoryIdx(null);
                                            }}
                                            className={`w-full px-3 py-2 text-left text-[11px] font-semibold flex items-center gap-2
                                              transition-colors duration-100 cursor-pointer
                                              ${(item.category === value || (!item.category && value === 'Operation'))
                                                ? activeCls
                                                : 'text-on-surface dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/60'
                                              }`}
                                          >
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />
                                            {value}
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </td>

                            {/* Remarks */}
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={item.remarks || ''}
                                onChange={e => {
                                  const updated = [...formData.items];
                                  updated[idx] = { ...updated[idx], remarks: e.target.value };
                                  setFormData(prev => ({ ...prev, items: updated }));
                                }}
                                disabled={item.is_cancelled}
                                placeholder="Details or description..."
                                className="w-full px-2 py-1 text-[11px] bg-white dark:bg-neutral-800 border border-outline-variant/40 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50"
                              />
                            </td>

                            {/* Cancel / Remove */}
                            <td className="px-2 py-1 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                {item.id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...formData.items];
                                      updated[idx] = { ...updated[idx], is_cancelled: !item.is_cancelled };
                                      setFormData(prev => ({ ...prev, items: updated }));
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                      item.is_cancelled
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        : 'text-neutral-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                    }`}
                                    title={item.is_cancelled ? 'Restore voucher' : 'Mark as Cancelled voucher'}
                                  >
                                    {item.is_cancelled ? 'Restore' : 'Void'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = formData.items.filter((_, i) => i !== idx);
                                    setFormData(prev => ({ ...prev, items: updated }));
                                  }}
                                  className="p-1 rounded-md text-neutral-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                                  title="Delete row"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Dedicated Table Footer Total Liquidated Bar */}
                  <div className="border-t border-outline-variant/40 bg-neutral-50/90 dark:bg-neutral-800/80 px-4 py-2.5 flex items-center justify-between z-10 rounded-b-2xl">
                    <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                      Total Liquidated:
                    </span>
                    <span className="font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-300">
                      ₱{formData.items.filter(i => !i.is_cancelled).reduce((s, i) => s + (parseFloat(String(i.amount)) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Add Row Button */}
                <button
                  type="button"
                  onClick={() => {
                    const lastItem = formData.items[formData.items.length - 1];
                    // Auto-increment RF Voucher number if present, otherwise leave blank
                    const lastVoucherNum = lastItem?.particulars?.match(/RF Voucher (\d+)/i);
                    const nextParticulars = lastVoucherNum ? `RF Voucher ${parseInt(lastVoucherNum[1]) + 1}` : '';
                    setFormData(prev => ({
                      ...prev,
                      items: [...prev.items, {
                        item_date_raw: lastItem?.item_date_raw || '',
                        particulars: nextParticulars,
                        amount: 0,
                        account_name: '',
                        category: 'Operation',
                        remarks: ''
                      }]
                    }));
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60 rounded-xl transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-outline-variant/30 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/40 flex-shrink-0">
              <span className="text-[11px] text-neutral-500">
                {formData.items.filter(i => !i.is_cancelled).length} active items
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={savingForm}
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-full border border-outline-variant text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingForm || !formData.lf_no.trim()}
                  onClick={handleSaveForm}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingForm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{editingLf ? 'Update Liquidation Form' : 'Save Liquidation Form'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {lfToDelete && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4 animate-modal-pop">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-headline font-bold text-sm text-on-surface dark:text-white">
                Delete Liquidation Form {lfToDelete.lf_no}?
              </h4>
              <p className="text-xs text-neutral-500 mt-1">
                This will permanently delete this liquidation form and all of its recorded voucher line items.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setLfToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-full border border-outline-variant text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteLf}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PRINT VIEW: LIQUIDATION FORM (CO-OP OFFICIAL FORMAT) */}
      {printingLf && typeof document !== 'undefined' && createPortal(
        <div
          id="coop-printable-lf-sheet"
          className="hidden print:block text-black bg-white"
          style={{
            fontFamily: 'Arial, sans-serif',
            color: '#111827',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box',
            width: '100%',
            padding: '14mm 24mm 20mm 24mm'
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: portrait;
                margin: 0;
              }
              #coop-printable-lf-sheet {
                display: block !important;
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                background: #ffffff !important;
                color: #111827 !important;
                padding: 14mm 24mm 20mm 24mm !important;
                margin: 0 auto !important;
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-content-wrapper {
                padding: 0 !important;
                margin: 0 auto !important;
                box-sizing: border-box !important;
                width: 100% !important;
              }
              #coop-printable-lf-sheet table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: auto;
              }
              #coop-printable-lf-sheet tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              #coop-printable-lf-sheet thead {
                display: table-header-group;
              }
              #coop-printable-lf-sheet tfoot {
                display: table-footer-group;
              }
              .no-print-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}} />

          <div
            className="print-content-wrapper"
            style={{
              padding: 0,
              boxSizing: 'border-box',
              width: '100%'
            }}
          >
            {/* Official Brand Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #064e3b', paddingBottom: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/Coop.jpeg" alt="UC-METC MPC Logo" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#064e3b', margin: 0 }}>
                  University of Cebu - METC Multipurpose Cooperative (UC-METC MPC)
                </h2>
                <p style={{ fontSize: '10px', color: '#4b5563', margin: '2px 0 0 0' }}>
                  UC-METC Campus, Alumnos, Mambaling, Cebu City • Tel: (032) 410-8811 local 5155
                </p>
                <p style={{ fontSize: '9px', color: '#6b7280', margin: '1px 0 0 0' }}>
                  Email: ucmetc.ecc@gmail.com • CDA Reg. No. 9520-1070000000029729
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h1 style={{ fontSize: '16px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827', margin: 0 }}>
                Liquidation Form
              </h1>
              <div style={{ fontSize: '15px', fontFamily: 'monospace', fontWeight: 'bold', color: '#b91c1c', marginTop: '2px' }}>
                {printingLf.form.lf_no}
              </div>
            </div>
          </div>

          {/* Metadata Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '9px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '14px', fontSize: '11px' }}>
            <div>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', color: '#6b7280', display: 'block' }}>Custodian</span>
              <strong style={{ fontSize: '11.5px', color: '#111827' }}>{printingLf.form.custodian_name || 'Michelle M. Pable'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', color: '#6b7280', display: 'block' }}>Sheet / Reference</span>
              <strong style={{ fontSize: '11.5px', color: '#111827' }}>{printingLf.form.sheet_name || '—'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', color: '#6b7280', display: 'block' }}>Linked Check Voucher</span>
              <strong style={{ fontSize: '11.5px', color: '#064e3b' }}>
                {printingLf.form.voucher_no || printingLf.form.cv_voucher_no ? `CV #${printingLf.form.voucher_no || printingLf.form.cv_voucher_no}` : 'Unlinked'}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', color: '#6b7280', display: 'block' }}>Status</span>
              <strong style={{ fontSize: '11.5px', color: printingLf.form.status === 'replenished' ? '#059669' : '#d97706', textTransform: 'uppercase' }}>
                {printingLf.form.status || 'OPEN'}
              </strong>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6', borderTop: '1.5px solid #111827', borderBottom: '1.5px solid #111827' }}>
                <th style={{ padding: '6px 6px', textAlign: 'center', width: '28px', borderRight: '1px solid #d1d5db' }}>#</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', width: '80px', borderRight: '1px solid #d1d5db' }}>Date</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', width: '135px', borderRight: '1px solid #d1d5db' }}>Particulars / Voucher #</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', width: '95px', borderRight: '1px solid #d1d5db' }}>Amount (₱)</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', borderRight: '1px solid #d1d5db' }}>Account</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: '85px', borderRight: '1px solid #d1d5db' }}>Category</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Remarks / Details</th>
              </tr>
            </thead>
            <tbody>
              {printingLf.items.map((item, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    textDecoration: item.is_cancelled ? 'line-through' : 'none',
                    color: item.is_cancelled ? '#9ca3af' : 'inherit'
                  }}
                >
                  <td style={{ padding: '5px 6px', textAlign: 'center', borderRight: '1px solid #e5e7eb', color: '#6b7280', fontSize: '9px' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #e5e7eb', fontFamily: 'monospace' }}>
                    {item.item_date_raw ? String(item.item_date_raw).split('T')[0] : (item.item_date ? new Date(item.item_date).toLocaleDateString() : '—')}
                  </td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #e5e7eb', fontWeight: item.is_cancelled ? 'normal' : '600' }}>
                    {(!item.particulars || /^item\s*#\d+$/i.test(item.particulars.trim())) ? '—' : item.particulars}
                    {item.is_cancelled && ' (CANCELLED)'}
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', borderRight: '1px solid #e5e7eb', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {item.amount > 0 ? Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                  </td>
                  <td style={{ padding: '5px 8px', borderRight: '1px solid #e5e7eb' }}>
                    {item.account_name}
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '8.5px', padding: '2px 5px', borderRadius: '4px', backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                      {item.category || 'Operation'}
                    </span>
                  </td>
                  <td style={{ padding: '5px 8px', color: '#4b5563' }}>
                    {item.remarks || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #111827', backgroundColor: '#f9fafb', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ padding: '7px 10px', textAlign: 'right', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.04em' }}>
                  Total Amount Liquidated:
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '11.5px', fontWeight: 'bold' }}>
                  ₱{Number(printingLf.form.total_liquidated).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>

          {/* Financial Reconciliation Summary Box */}
          <div className="no-print-break" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff' }}>
              <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280', display: 'block' }}>
                Authorized Fund Amount
              </span>
              <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace', color: '#111827', marginTop: '2px' }}>
                ₱{Number(printingLf.form.authorized_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff' }}>
              <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280', display: 'block' }}>
                Total Liquidated ({printingLf.items.filter(i => !i.is_cancelled).length} active items)
              </span>
              <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace', color: '#047857', marginTop: '2px' }}>
                ₱{Number(printingLf.form.total_liquidated).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ padding: '8px 12px', border: '1.5px solid #059669', borderRadius: '6px', backgroundColor: '#ecfdf5' }}>
              <span style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#047857', display: 'block' }}>
                Balance to Replenish / Net Due
              </span>
              <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace', color: '#065f46', marginTop: '2px' }}>
                ₱{(Number(printingLf.form.authorized_amount) - Number(printingLf.form.total_liquidated)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Category Summaries Box */}
          {(() => {
            const catSummary = (printingLf.categorySummary && Object.keys(printingLf.categorySummary).length > 0)
              ? printingLf.categorySummary
              : printingLf.items.reduce((acc, it) => {
                  if (!it.is_cancelled && Number(it.amount) > 0) {
                    const cat = (it.category || 'Operation').trim();
                    acc[cat] = (acc[cat] || 0) + Number(it.amount);
                  }
                  return acc;
                }, {} as Record<string, number>);

            const catEntries = Object.entries(catSummary)
              .filter(([_, amt]) => Number(amt) > 0)
              .sort((a, b) => Number(b[1]) - Number(a[1]));

            if (catEntries.length === 0) return null;

            return (
              <div className="no-print-break" style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px 12px', marginBottom: '16px', backgroundColor: '#fafafa', fontSize: '9.5px' }}>
                <div style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#374151', marginBottom: '6px', fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Expense Breakdown by Category ({catEntries.length} {catEntries.length === 1 ? 'Category' : 'Categories'})</span>
                  <span>Total: ₱{Number(printingLf.form.total_liquidated).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, Math.max(2, catEntries.length))}, 1fr)`, gap: '4px 14px' }}>
                  {catEntries.map(([cat, amt]) => {
                    const pct = printingLf.form.total_liquidated ? ((Number(amt) / Number(printingLf.form.total_liquidated)) * 100).toFixed(1) : '0';
                    return (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e5e7eb', padding: '2px 0' }}>
                        <span style={{ color: '#4b5563', fontWeight: '600' }}>
                          {cat}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#111827', marginLeft: '4px' }}>
                          ₱{Number(amt).toLocaleString('en-US', { minimumFractionDigits: 2 })} <small style={{ color: '#6b7280', fontWeight: 'normal' }}>({pct}%)</small>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Signatures */}
          <div className="no-print-break" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px', marginTop: '22px', fontSize: '10.5px' }}>
            <div>
              <span style={{ fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', fontSize: '9px', display: 'block', letterSpacing: '0.04em' }}>
                SUBMITTED BY (CUSTODIAN):
              </span>
              <div style={{ height: '34px' }}></div>
              <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 2px 0', fontSize: '11px', color: '#111827' }}>
                {printingLf.form.custodian_name || 'MICHELLE M. PABLE'}
              </p>
              <div style={{ borderBottom: '1.5px solid #111827', width: '100%' }}></div>
              <span style={{ fontSize: '8.5px', color: '#6b7280', marginTop: '2px', display: 'block' }}>
                Signature over Printed Name
              </span>
            </div>

            <div>
              <span style={{ fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', fontSize: '9px', display: 'block', letterSpacing: '0.04em' }}>
                CHECKED & VERIFIED BY:
              </span>
              <div style={{ height: '34px' }}></div>
              <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 2px 0', fontSize: '11px', color: '#111827' }}>
                MANILYN VELOS
              </p>
              <div style={{ borderBottom: '1.5px solid #111827', width: '100%' }}></div>
              <span style={{ fontSize: '8.5px', color: '#6b7280', marginTop: '2px', display: 'block' }}>
                Audit & Inventory Committee
              </span>
            </div>

            <div>
              <span style={{ fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', fontSize: '9px', display: 'block', letterSpacing: '0.04em' }}>
                APPROVED FOR REPLENISHMENT:
              </span>
              <div style={{ height: '34px' }}></div>
              <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 2px 0', fontSize: '11px', color: '#111827' }}>
                BOARD OF DIRECTORS / TREASURER
              </p>
              <div style={{ borderBottom: '1.5px solid #111827', width: '100%' }}></div>
              <span style={{ fontSize: '8.5px', color: '#6b7280', marginTop: '2px', display: 'block' }}>
                Cooperative Management
              </span>
            </div>
          </div>

          {/* Print Footer */}
          <div className="no-print-break" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '16px', fontSize: '8px', color: '#9ca3af' }}>
            <div>Generated via UC-METC MPC Portal • Revolving Fund Liquidation System</div>
            <div>Printed on: {new Date().toLocaleString()}</div>
          </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
