'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import LoanApprovalModal from '@/components/loans/LoanApprovalModal';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Printer,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
  Unlink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  Layers,
  Eye,
  X,
  Check,
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export interface StlLiquidationItem {
  id?: string;
  liquidation_id?: string;
  release_date: string | null;
  release_date_raw: string | null;
  particulars: string;
  amount: number;
  remarks: string | null;
  sort_order?: number;
  loan_id?: string | null;
  loan_laf_no?: string | null;
  loan_status?: string | null;
  borrower_name?: string | null;
  product_name?: string | null;
}

export interface StlLiquidationForm {
  id: string;
  lf_no: string;
  check_voucher_id: string | null;
  voucher_no: string | null;
  authorized_amount: number | string;
  total_expense: number | string;
  cash_on_hand: number | string;
  status: 'open' | 'replenished' | 'cancelled' | string;
  prepared_by: string;
  prepared_designation: string;
  date_submitted: string | null;
  approved_by: string;
  approved_designation: string;
  date_approved: string | null;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  cv_voucher_no?: string | null;
  cv_check_no?: string | null;
  cv_payee?: string | null;
  cv_bank?: string | null;
  cv_amount?: number | string | null;
  cv_voucher_date?: string | null;
  item_count?: number;
}

interface StlLiquidationsTabProps {
  isAdminOrManager?: boolean;
  onViewCheckVoucher?: (voucherIdOrNo: string) => void;
  initialSearch?: string;
  targetLiquidationId?: string;
  onClearTarget?: () => void;
}

export default function StlLiquidationsTab({
  isAdminOrManager = false,
  onViewCheckVoucher,
  initialSearch = '',
  targetLiquidationId,
  onClearTarget
}: StlLiquidationsTabProps) {
  // State
  const [liquidations, setLiquidations] = useState<StlLiquidationForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'replenished'>('all');

  // Summary Metrics
  const [summary, setSummary] = useState({
    total_forms: 0,
    open_forms: 0,
    replenished_forms: 0,
    total_authorized: 0,
    total_expense: 0,
    total_cash_on_hand: 0
  });

  // Expanded Rows & loaded items cache
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<string, { items: StlLiquidationItem[]; loading: boolean }>>({});

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<{
    lf_no: string;
    authorized_amount: string;
    date_submitted: string;
    date_approved: string;
    prepared_by: string;
    prepared_designation: string;
    approved_by: string;
    approved_designation: string;
    notes: string;
    items: {
      release_date: string;
      release_date_raw: string;
      particulars: string;
      amount: string;
      remarks: string;
      loan_id?: string | null;
      borrower_name?: string | null;
    }[];
  }>({
    lf_no: '',
    authorized_amount: '100000.00',
    date_submitted: new Date().toISOString().split('T')[0],
    date_approved: new Date().toISOString().split('T')[0],
    prepared_by: 'Vanessa Mae A. Mondrano',
    prepared_designation: 'Staff',
    approved_by: 'Michelle Pable',
    approved_designation: 'Manager',
    notes: '',
    items: [
      { release_date: '', release_date_raw: '', particulars: '', amount: '', remarks: '', loan_id: null, borrower_name: null }
    ]
  });

  // Loan Detail Slip Modal State
  const [viewingLoan, setViewingLoan] = useState<any | null>(null);
  const [loadingLoanId, setLoadingLoanId] = useState<string | null>(null);

  // Loan Application Picker State (for attaching loan to a row)
  const [isLoanPickerOpen, setIsLoanPickerOpen] = useState(false);
  const [loanPickerRowIdx, setLoanPickerRowIdx] = useState<number | null>(null);
  const [loanSearchQuery, setLoanSearchQuery] = useState('');
  const [loanSearchResults, setLoanSearchResults] = useState<any[]>([]);
  const [isSearchingLoans, setIsSearchingLoans] = useState(false);

  // Link Check Voucher Modal
  const [linkingLf, setLinkingLf] = useState<StlLiquidationForm | null>(null);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  // Delete Confirmation Modal
  const [deletingLf, setDeletingLf] = useState<StlLiquidationForm | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Print State
  const [printingLf, setPrintingLf] = useState<{
    form: StlLiquidationForm;
    items: StlLiquidationItem[];
  } | null>(null);

  // Load Liquidations List
  const fetchLiquidations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { limit: 100 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await api.get('/stl-liquidations', { params });
      if (res.data && res.data.success) {
        setLiquidations(res.data.data || []);
        if (res.data.summary) {
          setSummary({
            total_forms: Number(res.data.summary.total_forms) || 0,
            open_forms: Number(res.data.summary.open_forms) || 0,
            replenished_forms: Number(res.data.summary.replenished_forms) || 0,
            total_authorized: Number(res.data.summary.total_authorized) || 0,
            total_expense: Number(res.data.summary.total_expense) || 0,
            total_cash_on_hand: Number(res.data.summary.total_cash_on_hand) || 0
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch STL liquidations:', err);
      setError(err?.response?.data?.error?.message || 'Failed to load STL liquidation records.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchLiquidations();
  }, [fetchLiquidations]);

  // Target Liquidation Auto-open
  useEffect(() => {
    if (targetLiquidationId && liquidations.length > 0) {
      const match = liquidations.find(l => l.id === targetLiquidationId || l.lf_no === targetLiquidationId);
      if (match) {
        setExpandedId(match.id);
        fetchItemsForLiquidation(match.id);
      }
    }
  }, [targetLiquidationId, liquidations]);

  // Fetch Items for a specific Liquidation (for accordion view)
  const fetchItemsForLiquidation = async (id: string) => {
    if (itemsMap[id] && itemsMap[id].items.length > 0) return itemsMap[id];
    setItemsMap(prev => ({ ...prev, [id]: { items: [], loading: true } }));
    try {
      const res = await api.get(`/stl-liquidations/${id}`);
      if (res.data && res.data.success && res.data.data) {
        const fullData = res.data.data;
        const loadedItems = fullData.items || [];
        setItemsMap(prev => ({
          ...prev,
          [id]: { items: loadedItems, loading: false }
        }));
        return { items: loadedItems, loading: false };
      }
    } catch (err) {
      console.error(`Failed to fetch items for STL liquidation ${id}:`, err);
      setItemsMap(prev => ({ ...prev, [id]: { items: [], loading: false } }));
    }
    return { items: [], loading: false };
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      await fetchItemsForLiquidation(id);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const yr = String(new Date().getFullYear()).slice(-2);
    // suggest next LF number
    const existingNos = liquidations
      .map(l => {
        const m = l.lf_no.match(/(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => n > 0);
    const maxNo = existingNos.length > 0 ? Math.max(...existingNos) : 58;
    const nextLfNo = `${yr}-${maxNo + 1}`;

    setEditingId(null);
    setFormData({
      lf_no: nextLfNo,
      authorized_amount: '100000.00',
      date_submitted: today,
      date_approved: today,
      prepared_by: 'Vanessa Mae A. Mondrano',
      prepared_designation: 'Staff',
      approved_by: 'Michelle Pable',
      approved_designation: 'Manager',
      notes: '',
      items: [
        { release_date: today, release_date_raw: formatRawDate(today), particulars: 'LAF no. ', amount: '', remarks: '', loan_id: null, borrower_name: null }
      ]
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = async (lf: StlLiquidationForm) => {
    setEditingId(lf.id);
    const details = await fetchItemsForLiquidation(lf.id);
    const items = details?.items || [];

    setFormData({
      lf_no: lf.lf_no || '',
      authorized_amount: String(lf.authorized_amount || '100000.00'),
      date_submitted: lf.date_submitted ? lf.date_submitted.split('T')[0] : '',
      date_approved: lf.date_approved ? lf.date_approved.split('T')[0] : '',
      prepared_by: lf.prepared_by || 'Vanessa Mae A. Mondrano',
      prepared_designation: lf.prepared_designation || 'Staff',
      approved_by: lf.approved_by || 'Michelle Pable',
      approved_designation: lf.approved_designation || 'Manager',
      notes: lf.notes || '',
      items: items.length > 0
        ? items.map((it: StlLiquidationItem) => ({
            release_date: it.release_date ? it.release_date.split('T')[0] : '',
            release_date_raw: it.release_date_raw || (it.release_date ? formatRawDate(it.release_date) : ''),
            particulars: it.particulars || '',
            amount: it.amount ? String(it.amount) : '',
            remarks: it.remarks || '',
            loan_id: it.loan_id || null,
            borrower_name: it.borrower_name || null
          }))
        : [{ release_date: '', release_date_raw: '', particulars: '', amount: '', remarks: '', loan_id: null, borrower_name: null }]
    });
    setIsModalOpen(true);
  };

  // Search loans for picker
  const fetchLoanOptions = useCallback(async (queryStr: string = '') => {
    try {
      setIsSearchingLoans(true);
      const res = await api.get('/stl-liquidations/loans', {
        params: { query: queryStr }
      });
      if (res.data && res.data.success) {
        setLoanSearchResults(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to search loans for liquidation:', err);
    } finally {
      setIsSearchingLoans(false);
    }
  }, []);

  const openLoanPicker = (rowIdx: number) => {
    setLoanPickerRowIdx(rowIdx);
    setLoanSearchQuery('');
    setIsLoanPickerOpen(true);
    fetchLoanOptions('');
  };

  const handleSelectLoanForRow = (loan: any) => {
    if (loanPickerRowIdx === null) return;
    const releaseDate = loan.disbursed_at
      ? loan.disbursed_at.split('T')[0]
      : (loan.created_at ? loan.created_at.split('T')[0] : '');
    const rawDate = releaseDate ? formatRawDate(releaseDate) : '';
    const netAmount = loan.net_proceeds ? String(loan.net_proceeds) : (loan.principal_amount ? String(loan.principal_amount) : '');

    setFormData(prev => ({
      ...prev,
      items: prev.items.map((it, i) => {
        if (i !== loanPickerRowIdx) return it;
        return {
          ...it,
          release_date: it.release_date || releaseDate,
          release_date_raw: it.release_date_raw || rawDate,
          particulars: `LAF no. ${loan.laf_no || ''}`,
          amount: it.amount || netAmount,
          loan_id: loan.id,
          borrower_name: loan.borrower_name
        };
      })
    }));
    setIsLoanPickerOpen(false);
    setLoanPickerRowIdx(null);
  };

  // Open loan slip in full LoanApprovalModal
  const handleOpenLoanSlip = async (particularsStr?: string | null, loanId?: string | null) => {
    try {
      let targetLoanId = loanId;

      if (!targetLoanId && particularsStr) {
        const m = particularsStr.match(/(\d+-\d+|\d+)/);
        if (m) {
          const queryLaf = m[1];
          setLoadingLoanId(particularsStr);
          const searchRes = await api.get('/stl-liquidations/loans', { params: { query: queryLaf } });
          if (searchRes.data?.success && searchRes.data.data?.length > 0) {
            const match = searchRes.data.data.find((l: any) =>
              l.laf_no === queryLaf ||
              l.laf_no?.toLowerCase().includes(queryLaf.toLowerCase())
            ) || searchRes.data.data[0];
            targetLoanId = match.id;
          }
        }
      }

      if (!targetLoanId) {
        alert('No matching loan application could be found for this item.');
        return;
      }

      setLoadingLoanId(targetLoanId);
      const res = await api.get(`/loans/${targetLoanId}`);
      if (res.data && res.data.success && res.data.data) {
        setViewingLoan(res.data.data);
      } else {
        alert('Failed to load loan application slip.');
      }
    } catch (err: any) {
      console.error('Failed to open loan slip:', err);
      alert(err?.response?.data?.error?.message || 'Could not load loan application details.');
    } finally {
      setLoadingLoanId(null);
    }
  };

  // Save (Create or Update)
  const handleSaveLiquidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lf_no.trim()) {
      alert('Please enter a Liquidation Form number (LF no.)');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        lf_no: formData.lf_no.trim(),
        authorized_amount: parseFloat(formData.authorized_amount) || 100000.00,
        date_submitted: formData.date_submitted || null,
        date_approved: formData.date_approved || null,
        prepared_by: formData.prepared_by.trim() || 'Vanessa Mae A. Mondrano',
        prepared_designation: formData.prepared_designation.trim() || 'Staff',
        approved_by: formData.approved_by.trim() || 'Michelle Pable',
        approved_designation: formData.approved_designation.trim() || 'Manager',
        notes: formData.notes.trim() || null,
        items: formData.items
          .filter(it => it.particulars && it.particulars.trim())
          .map(it => ({
            release_date: it.release_date || null,
            release_date_raw: it.release_date_raw || (it.release_date ? formatRawDate(it.release_date) : null),
            particulars: it.particulars.trim(),
            amount: parseFloat(it.amount) || 0,
            remarks: it.remarks.trim() || null,
            loan_id: it.loan_id || null
          }))
      };

      if (editingId) {
        await api.put(`/stl-liquidations/${editingId}`, payload);
        delete itemsMap[editingId];
      } else {
        await api.post('/stl-liquidations', payload);
      }

      setIsModalOpen(false);
      await fetchLiquidations();
    } catch (err: any) {
      console.error('Failed to save STL liquidation form:', err);
      alert(err?.response?.data?.error?.message || 'Error saving STL liquidation form.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deletingLf) return;
    try {
      setIsDeleting(true);
      await api.delete(`/stl-liquidations/${deletingLf.id}`);
      setDeletingLf(null);
      await fetchLiquidations();
    } catch (err: any) {
      console.error('Failed to delete STL liquidation form:', err);
      alert(err?.response?.data?.error?.message || 'Error deleting form.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Print Handler
  const handlePrint = async (lf: StlLiquidationForm) => {
    try {
      let items = itemsMap[lf.id]?.items;
      if (!items) {
        const details = await fetchItemsForLiquidation(lf.id);
        items = details?.items || [];
      }
      setPrintingLf({
        form: lf,
        items: items || []
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

  // Link Check Voucher Flow
  const openLinkVoucherModal = async (lf: StlLiquidationForm) => {
    setLinkingLf(lf);
    try {
      setLoadingVouchers(true);
      const res = await api.get('/accounts/check-vouchers', {
        params: { folder: 'STL', limit: 50, sort: 'desc' }
      });
      if (res.data && res.data.success) {
        setAvailableVouchers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load check vouchers for linking:', err);
    } finally {
      setLoadingVouchers(false);
    }
  };

  const handleLinkVoucher = async (voucherId: string | null) => {
    if (!linkingLf) return;
    try {
      await api.post(`/stl-liquidations/${linkingLf.id}/link-voucher`, {
        check_voucher_id: voucherId
      });
      setLinkingLf(null);
      await fetchLiquidations();
    } catch (err: any) {
      console.error('Failed to link check voucher:', err);
      alert(err?.response?.data?.error?.message || 'Error linking check voucher.');
    }
  };

  // Helper date formatter
  function formatRawDate(dateStr: string) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = String(d.getDate()).padStart(2, '0');
      const mon = months[d.getMonth()];
      return `${day}-${mon}`;
    } catch {
      return dateStr;
    }
  }

  function formatLongDate(dateStr: string | null) {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  // Live modal totals
  const liveTotalExpense = useMemo(() => {
    return formData.items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);
  }, [formData.items]);

  const liveCashOnHand = useMemo(() => {
    const auth = parseFloat(formData.authorized_amount) || 0;
    return auth - liveTotalExpense;
  }, [formData.authorized_amount, liveTotalExpense]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
            Total Forms
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-neutral-900 dark:text-white">
              {summary.total_forms}
            </span>
            <FileText className="w-4 h-4 text-neutral-400" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
            Open Forms
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">
              {summary.open_forms}
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
            Replenished
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {summary.replenished_forms}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
            Authorized Fund
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-black text-neutral-900 dark:text-white truncate">
              ₱{Number(summary.total_authorized).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <DollarSign className="w-4 h-4 text-neutral-400" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-primary dark:text-secondary">
            Total Disbursed
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-black text-primary dark:text-secondary truncate">
              ₱{Number(summary.total_expense).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <Layers className="w-4 h-4 text-primary dark:text-secondary" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
            Cash On Hand
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 truncate">
              ₱{Number(summary.total_cash_on_hand).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by LF no., LAF no., particulars, remarks, staff..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 focus:outline-none focus:border-primary text-neutral-900 dark:text-white placeholder:text-neutral-400"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/60 text-neutral-900 dark:text-white cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="replenished">Replenished</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={fetchLiquidations}
            disabled={loading}
            className="p-2 rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>

          {isAdminOrManager && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-xs rounded-xl shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Liquidation Form</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-outline-variant/60 rounded-2xl overflow-hidden bg-surface-container-lowest dark:bg-surface-container-low shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="w-10 px-3 py-3 text-center"></th>
                <th className="px-4 py-3">LF Number</th>
                <th className="px-4 py-3 text-right">Amount for Liquidation</th>
                <th className="px-4 py-3 text-right">Total Expense</th>
                <th className="px-4 py-3 text-right">Cash on Hand</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Date Submitted</th>
                <th className="px-4 py-3">Linked Check Voucher</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {loading && liquidations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading STL Liquidation forms...</span>
                  </td>
                </tr>
              ) : liquidations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-neutral-600 dark:text-neutral-300">
                      No STL liquidation forms found
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      {search ? 'Try clearing your search query.' : 'Click "New Liquidation Form" to add your first record.'}
                    </p>
                  </td>
                </tr>
              ) : (
                liquidations.map(lf => {
                  const isExpanded = expandedId === lf.id;
                  const authAmt = parseFloat(String(lf.authorized_amount)) || 0;
                  const expAmt = parseFloat(String(lf.total_expense)) || 0;
                  const cohAmt = parseFloat(String(lf.cash_on_hand)) || 0;

                  return (
                    <React.Fragment key={lf.id}>
                      <tr
                        className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${
                          isExpanded ? 'bg-neutral-50/80 dark:bg-neutral-800/40' : ''
                        }`}
                      >
                        {/* Expand Button */}
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(lf.id)}
                            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse breakdown' : 'Expand breakdown'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-primary dark:text-secondary" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* LF Number with red emphasis matching physical form */}
                        <td className="px-4 py-3 font-bold font-mono">
                          <span className="text-neutral-500 font-normal">LF no. </span>
                          <span className="text-red-600 dark:text-red-400 text-sm font-extrabold">{lf.lf_no}</span>
                          {lf.item_count !== undefined && (
                            <span className="block text-[10px] font-normal text-neutral-400 mt-0.5">
                              {lf.item_count} {lf.item_count === 1 ? 'item' : 'items'}
                            </span>
                          )}
                        </td>

                        {/* Authorized Amount */}
                        <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100 font-mono">
                          ₱{authAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Total Expense */}
                        <td className="px-4 py-3 text-right font-bold text-primary dark:text-secondary font-mono">
                          ₱{expAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Cash on Hand */}
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          ₱{cohAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              lf.status === 'replenished'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {lf.status === 'replenished' ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {lf.status}
                          </span>
                        </td>

                        {/* Date Submitted */}
                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                          {formatLongDate(lf.date_submitted)}
                          <span className="block text-[10px] text-neutral-400">
                            By {lf.prepared_by || 'Staff'}
                          </span>
                        </td>

                        {/* Linked Check Voucher */}
                        <td className="px-4 py-3">
                          {lf.check_voucher_id || lf.voucher_no || lf.cv_voucher_no ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onViewCheckVoucher &&
                                  onViewCheckVoucher(lf.check_voucher_id || lf.voucher_no || lf.cv_voucher_no || '')
                                }
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary dark:text-secondary font-mono font-bold text-[11px] hover:underline cursor-pointer"
                              >
                                <FileText className="w-3 h-3" />
                                CV #{lf.voucher_no || lf.cv_voucher_no}
                              </button>
                              {isAdminOrManager && (
                                <button
                                  type="button"
                                  onClick={() => handleLinkVoucher(null)}
                                  className="text-neutral-400 hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                                  title="Unlink voucher"
                                >
                                  <Unlink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            isAdminOrManager ? (
                              <button
                                type="button"
                                onClick={() => openLinkVoucherModal(lf)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-400 hover:text-primary dark:hover:text-secondary transition-colors cursor-pointer"
                              >
                                <LinkIcon className="w-3 h-3" />
                                <span>Link CV</span>
                              </button>
                            ) : (
                              <span className="text-neutral-400 italic">Unlinked</span>
                            )
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {/* Print */}
                            <button
                              type="button"
                              onClick={() => handlePrint(lf)}
                              className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer"
                              title="Print Liquidation Form"
                            >
                              <Printer className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                            </button>

                            {/* Edit */}
                            {isAdminOrManager && (
                              <button
                                type="button"
                                onClick={() => openEditModal(lf)}
                                className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer"
                                title="Edit Liquidation Form"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                              </button>
                            )}

                            {/* Delete */}
                            {isAdminOrManager && (
                              <button
                                type="button"
                                onClick={() => setDeletingLf(lf)}
                                className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete Liquidation Form"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Breakdown Drawer */}
                      {isExpanded && (
                        <tr className="bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-outline-variant/40">
                          <td colSpan={9} className="p-4 sm:p-6">
                            <div className="max-w-4xl mx-auto space-y-4">
                              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
                                <div>
                                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                                    <span>Liquidation Breakdown:</span>
                                    <span className="text-red-600 dark:text-red-400 font-mono font-black">
                                      LF no. {lf.lf_no}
                                    </span>
                                  </h4>
                                  <span className="text-[11px] text-neutral-500">
                                    Physical liquidation voucher itemized entries matching the official UC-METC MPC format.
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handlePrint(lf)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer text-neutral-700 dark:text-neutral-200"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print Form</span>
                                  </button>
                                  {isAdminOrManager && (
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(lf)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-secondary hover:bg-primary/20 transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Edit Entries</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Breakdown Table (Matching the 4 columns from photo) */}
                              {itemsMap[lf.id]?.loading ? (
                                <div className="py-6 text-center text-neutral-400">
                                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-primary" />
                                  <span>Loading breakdown items...</span>
                                </div>
                              ) : (itemsMap[lf.id]?.items || []).length === 0 ? (
                                <div className="py-6 text-center text-neutral-400 italic">
                                  No items recorded for this liquidation form yet.
                                </div>
                              ) : (
                                <div className="border border-outline-variant/60 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-neutral-800">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-outline-variant/60 bg-neutral-100 dark:bg-neutral-700/50 font-bold uppercase tracking-wider text-[10px] text-neutral-600 dark:text-neutral-300">
                                        <th className="px-4 py-2.5 text-center w-28">Release Date</th>
                                        <th className="px-4 py-2.5 text-left">Particulars</th>
                                        <th className="px-4 py-2.5 text-right w-36">Amount</th>
                                        <th className="px-4 py-2.5 text-left w-48">Remarks</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant/20 font-medium">
                                      {itemsMap[lf.id].items.map((item, idx) => (
                                        <tr
                                          key={item.id || idx}
                                          className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors"
                                        >
                                          <td className="px-4 py-2 text-center text-neutral-700 dark:text-neutral-300 font-mono">
                                            {item.release_date_raw || (item.release_date ? formatRawDate(item.release_date) : '—')}
                                          </td>
                                          <td className="px-4 py-2 font-semibold text-neutral-900 dark:text-white">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span>{item.particulars}</span>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenLoanSlip(item.particulars, item.loan_id)}
                                                disabled={loadingLoanId === (item.loan_id || item.particulars)}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary dark:bg-primary/20 dark:text-secondary hover:bg-primary/20 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                                                title={`View Loan Application Slip (${item.loan_laf_no || item.particulars})`}
                                              >
                                                {loadingLoanId === (item.loan_id || item.particulars) ? (
                                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                                ) : (
                                                  <ExternalLink className="w-3 h-3" />
                                                )}
                                                <span>View Loan Slip</span>
                                              </button>
                                              {item.borrower_name && (
                                                <span className="text-[11px] font-normal text-neutral-400">
                                                  • {item.borrower_name}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-4 py-2 text-right font-bold font-mono text-neutral-900 dark:text-neutral-100">
                                            ₱{Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                          </td>
                                          <td className="px-4 py-2 text-neutral-500 italic">
                                            {item.remarks || '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t-2 border-outline-variant/60 bg-neutral-50 dark:bg-neutral-750 font-bold text-xs">
                                        <td colSpan={2} className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300 uppercase">
                                          Total Expense
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono text-primary dark:text-secondary text-sm">
                                          ₱{expAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td></td>
                                      </tr>
                                      <tr className="border-t border-outline-variant/40 bg-neutral-50 dark:bg-neutral-750 font-bold text-xs">
                                        <td colSpan={2} className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300 uppercase">
                                          Cash on Hand
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                                          ₱{cohAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )}

                              {/* Signatories Footer Note */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-neutral-100/60 dark:bg-neutral-800/60 border border-outline-variant/40 text-[11px]">
                                <div>
                                  <span className="text-neutral-400 block font-medium">Prepared by:</span>
                                  <span className="font-bold text-neutral-800 dark:text-neutral-100">
                                    {lf.prepared_by}
                                  </span>{' '}
                                  <span className="text-neutral-500">({lf.prepared_designation})</span>
                                  <span className="text-neutral-400 block text-[10px]">
                                    Submitted: {formatLongDate(lf.date_submitted)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-neutral-400 block font-medium">Approved by:</span>
                                  <span className="font-bold text-neutral-800 dark:text-neutral-100">
                                    {lf.approved_by}
                                  </span>{' '}
                                  <span className="text-neutral-500">({lf.approved_designation})</span>
                                  <span className="text-neutral-400 block text-[10px]">
                                    Approved: {formatLongDate(lf.date_approved)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/60 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-neutral-900 dark:text-white flex items-center gap-2">
                  <span>{editingId ? 'Edit STL Liquidation Form' : 'New STL Liquidation Form'}</span>
                  {formData.lf_no && (
                    <span className="text-red-600 dark:text-red-400 font-mono text-sm">
                      (LF no. {formData.lf_no})
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Fill in the liquidation header and add disbursed short-term loan particulars.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveLiquidation} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar text-xs">
              {/* Header Fields Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-surface-container-low dark:bg-surface-container border border-outline-variant/40">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-700 dark:text-neutral-300 mb-1">
                    LF No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 26-58"
                    value={formData.lf_no}
                    onChange={e => setFormData({ ...formData, lf_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest dark:bg-neutral-800 font-mono font-bold text-red-600 dark:text-red-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-700 dark:text-neutral-300 mb-1">
                    Amount for Liquidation (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.authorized_amount}
                    onChange={e => setFormData({ ...formData, authorized_amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest dark:bg-neutral-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-700 dark:text-neutral-300 mb-1">
                    Date Submitted
                  </label>
                  <input
                    type="date"
                    value={formData.date_submitted}
                    onChange={e => setFormData({ ...formData, date_submitted: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest dark:bg-neutral-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-700 dark:text-neutral-300 mb-1">
                    Date Approved
                  </label>
                  <input
                    type="date"
                    value={formData.date_approved}
                    onChange={e => setFormData({ ...formData, date_approved: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest dark:bg-neutral-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-700 dark:text-neutral-300 mb-1">
                    Prepared By
                  </label>
                  <input
                    type="text"
                    value={formData.prepared_by}
                    onChange={e => setFormData({ ...formData, prepared_by: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest dark:bg-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-700 dark:text-neutral-300 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={formData.prepared_designation}
                    onChange={e => setFormData({ ...formData, prepared_designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest dark:bg-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-700 dark:text-neutral-300 mb-1">
                    Approved By
                  </label>
                  <input
                    type="text"
                    value={formData.approved_by}
                    onChange={e => setFormData({ ...formData, approved_by: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest dark:bg-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-700 dark:text-neutral-300 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={formData.approved_designation}
                    onChange={e => setFormData({ ...formData, approved_designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest dark:bg-neutral-800"
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[11px] text-neutral-900 dark:text-white">
                      Disbursement Entries (Particulars &amp; Amounts)
                    </span>
                    <span className="block text-[10px] text-neutral-500">
                      Matches Release Date, Particulars (LAF #), Amount, and Remarks from the official form.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const lastItem = formData.items[formData.items.length - 1];
                      let nextParticulars = 'LAF no. ';
                      if (lastItem && lastItem.particulars) {
                        const m = lastItem.particulars.match(/(.*?no\.?\s*)(\d+-\d+|\d+)/i);
                        if (m) {
                          const numPart = m[2];
                          if (numPart.includes('-')) {
                            const [p1, p2] = numPart.split('-');
                            nextParticulars = `${m[1]}${p1}-${parseInt(p2, 10) + 1}`;
                          } else {
                            nextParticulars = `${m[1]}${parseInt(numPart, 10) + 1}`;
                          }
                        }
                      }
                      setFormData(prev => ({
                        ...prev,
                        items: [
                          ...prev.items,
                          {
                            release_date: lastItem ? lastItem.release_date : '',
                            release_date_raw: lastItem ? lastItem.release_date_raw : '',
                            particulars: nextParticulars,
                            amount: '',
                            remarks: ''
                          }
                        ]
                      }));
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary dark:text-secondary hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Row</span>
                  </button>
                </div>

                <div className="border border-outline-variant/60 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-12 px-3 py-2.5 bg-surface-container-low dark:bg-surface-container font-bold text-[10px] uppercase tracking-wider text-neutral-500 border-b border-outline-variant/60">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-3">Release Date</div>
                    <div className="col-span-4">Particulars (LAF no.)</div>
                    <div className="col-span-2 text-right">Amount (₱)</div>
                    <div className="col-span-2 text-center">Remarks</div>
                  </div>

                  <div className="divide-y divide-outline-variant/30 max-h-72 overflow-y-auto custom-scrollbar">
                    {formData.items.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-12 px-3 py-2 items-center gap-2 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                        <div className="col-span-1 text-center font-mono text-neutral-400 text-[11px]">
                          {idx + 1}
                        </div>

                        {/* Release Date */}
                        <div className="col-span-3 flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="e.g. 07-Sep"
                            value={row.release_date_raw}
                            onChange={e => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                items: prev.items.map((it, i) => (i === idx ? { ...it, release_date_raw: val } : it))
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-mono"
                          />
                          <input
                            type="date"
                            value={row.release_date}
                            onChange={e => {
                              const dateVal = e.target.value;
                              const rawVal = formatRawDate(dateVal);
                              setFormData(prev => ({
                                ...prev,
                                items: prev.items.map((it, i) =>
                                  i === idx ? { ...it, release_date: dateVal, release_date_raw: rawVal } : it
                                )
                              }));
                            }}
                            className="w-7 h-7 p-1 rounded-lg border border-outline-variant/60 bg-transparent cursor-pointer"
                            title="Pick calendar date"
                          />
                        </div>

                        {/* Particulars */}
                        <div className="col-span-4 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="LAF no. 26-407"
                              value={row.particulars}
                              onChange={e => {
                                const val = e.target.value;
                                setFormData(prev => ({
                                  ...prev,
                                  items: prev.items.map((it, i) => (i === idx ? { ...it, particulars: val } : it))
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() => openLoanPicker(idx)}
                              className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-primary/40 text-primary dark:text-secondary hover:bg-primary/10 transition-colors cursor-pointer text-[10px] font-bold"
                              title="Search and link loan application"
                            >
                              <LinkIcon className="w-3 h-3" />
                              <span className="hidden sm:inline">Link</span>
                            </button>
                          </div>
                          {row.borrower_name && (
                            <div className="flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              <span className="truncate">🔗 Linked: {row.borrower_name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    items: prev.items.map((it, i) => i === idx ? { ...it, loan_id: null, borrower_name: null } : it)
                                  }));
                                }}
                                className="text-neutral-400 hover:text-rose-500 ml-1 cursor-pointer"
                                title="Unlink loan"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={row.amount}
                            onChange={e => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                items: prev.items.map((it, i) => (i === idx ? { ...it, amount: val } : it))
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-right font-mono font-bold text-xs"
                          />
                        </div>

                        {/* Remarks & Delete */}
                        <div className="col-span-2 flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Optional"
                            value={row.remarks}
                            onChange={e => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                items: prev.items.map((it, i) => (i === idx ? { ...it, remarks: val } : it))
                              }));
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs"
                          />
                          <button
                            type="button"
                            disabled={formData.items.length <= 1}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                items: prev.items.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="p-1 rounded-md text-neutral-400 hover:text-rose-500 disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Running Summary Totals */}
              <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-outline-variant/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                    Amount For Liquidation
                  </span>
                  <span className="text-base font-black font-mono text-neutral-900 dark:text-white">
                    ₱{(parseFloat(formData.authorized_amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-primary dark:text-secondary block">
                    Total Expense ({formData.items.filter(it => it.particulars.trim()).length} entries)
                  </span>
                  <span className="text-base font-black font-mono text-primary dark:text-secondary">
                    ₱{liveTotalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                    Cash on Hand (Balance)
                  </span>
                  <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                    ₱{liveCashOnHand.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-300 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingId ? 'Update Liquidation Form' : 'Save Liquidation Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINK CHECK VOUCHER MODAL */}
      {linkingLf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                Link Check Voucher to LF no. {linkingLf.lf_no}
              </h3>
              <button
                type="button"
                onClick={() => setLinkingLf(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Select an approved Short Term Loan (STL) Check Voucher to link with this liquidation form.
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-outline-variant/20 custom-scrollbar">
              {loadingVouchers ? (
                <div className="py-6 text-center text-neutral-400">Loading check vouchers...</div>
              ) : availableVouchers.length === 0 ? (
                <div className="py-6 text-center text-neutral-400">No STL check vouchers found.</div>
              ) : (
                availableVouchers.map(cv => (
                  <div
                    key={cv.id}
                    className="pt-2 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 p-2 rounded-xl"
                  >
                    <div>
                      <div className="font-bold font-mono text-xs text-neutral-900 dark:text-white">
                        CV #{cv.voucher_no} {cv.check_no ? `• Check #${cv.check_no}` : ''}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {cv.payee} • ₱{Number(cv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLinkVoucher(cv.id)}
                      className="px-3 py-1 bg-primary text-white text-[11px] font-bold rounded-lg hover:opacity-90 cursor-pointer"
                    >
                      Link
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setLinkingLf(null)}
                className="px-4 py-2 text-xs font-bold text-neutral-500 hover:text-neutral-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingLf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                Delete Liquidation Form?
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Are you sure you want to delete <span className="font-bold text-red-600">LF no. {deletingLf.lf_no}</span>? All line items and recorded entries will be permanently deleted.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLf(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOAN APPLICATION SELECTOR MODAL (FOR LIQUIDATION ROW) */}
      {isLoanPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-2xl overflow-hidden animate-modal-pop">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/60 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-neutral-900 dark:text-white flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-primary dark:text-secondary" />
                  <span>Select Loan Application to Link</span>
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Search approved or disbursed loans by LAF No., borrower name, or member ID.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLoanPickerOpen(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-outline-variant/40 bg-surface-container-low dark:bg-surface-container">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by LAF # (e.g. 25-407), Member Name, or Member ID..."
                  value={loanSearchQuery}
                  onChange={e => {
                    const q = e.target.value;
                    setLoanSearchQuery(q);
                    fetchLoanOptions(q);
                  }}
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white"
                />
                {loanSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoanSearchQuery('');
                      fetchLoanOptions('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar min-h-[260px] max-h-[50vh]">
              {isSearchingLoans ? (
                <div className="py-12 text-center text-neutral-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <span className="text-xs">Searching loan records...</span>
                </div>
              ) : loanSearchResults.length === 0 ? (
                <div className="py-12 text-center text-neutral-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    No loan applications found
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {loanSearchQuery ? `No records matched "${loanSearchQuery}". Try a different keyword.` : 'No loans available to link.'}
                  </p>
                </div>
              ) : (
                loanSearchResults.map(loan => {
                  const netAmount = Number(loan.net_proceeds || loan.principal_amount || 0);
                  const isSelected =
                    loanPickerRowIdx !== null && formData.items[loanPickerRowIdx]?.loan_id === loan.id;

                  return (
                    <div
                      key={loan.id}
                      onClick={() => handleSelectLoanForRow(loan)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-xs'
                          : 'border-outline-variant/50 hover:border-primary/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                            LAF #{loan.laf_no}
                          </span>
                          <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                            {loan.borrower_name || 'Unnamed Member'}
                          </span>
                          {loan.member_no && (
                            <span className="text-[10px] text-neutral-400">
                              (ID: {loan.member_no})
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              loan.status === 'disbursed'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-primary/10 text-primary dark:text-secondary'
                            }`}
                          >
                            {loan.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-neutral-500 flex-wrap">
                          <span>{loan.product_name || 'Short-Term Loan'}</span>
                          <span>•</span>
                          <span>
                            Net: <strong className="text-neutral-800 dark:text-neutral-200 font-mono">₱{netAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                          </span>
                          {loan.disbursed_at && (
                            <>
                              <span>•</span>
                              <span>Disbursed: {formatLongDate(loan.disbursed_at)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleSelectLoanForRow(loan);
                        }}
                        className="shrink-0 px-3 py-1.5 rounded-xl bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
                      >
                        Select
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-outline-variant/60 bg-surface-container-low dark:bg-surface-container flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                Selecting will automatically fill LAF No., amount, and release date into the row.
              </span>
              <button
                type="button"
                onClick={() => setIsLoanPickerOpen(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-xl text-neutral-600 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOAN DETAIL / OFFICIAL SLIP MODAL */}
      {viewingLoan && (
        <LoanApprovalModal
          isOpen={!!viewingLoan}
          loan={viewingLoan}
          onClose={() => setViewingLoan(null)}
          onSuccess={() => {
            setViewingLoan(null);
            fetchLiquidations();
          }}
        />
      )}

      {/* PRINT VIEW: 1:1 REPLICA OF THE PHYSICAL OFFICIAL DOCUMENT */}
      {printingLf && typeof document !== 'undefined' && createPortal(
        <div
          id="stl-printable-lf-sheet"
          className="hidden print:block text-black bg-white"
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#000000',
            backgroundColor: '#ffffff',
            boxSizing: 'border-box',
            width: '100%',
            padding: '12mm 18mm 16mm 18mm'
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: portrait;
                margin: 0;
              }
              body > *:not(#stl-printable-lf-sheet) {
                display: none !important;
              }
              #stl-printable-lf-sheet {
                display: block !important;
                position: static !important;
                width: 100% !important;
                background: #ffffff !important;
                color: #000000 !important;
                padding: 12mm 18mm 16mm 18mm !important;
                margin: 0 auto !important;
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #stl-printable-lf-sheet table {
                width: 100% !important;
                border-collapse: collapse !important;
                page-break-inside: auto;
              }
              #stl-printable-lf-sheet tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
            }
          `}} />

          {/* 1. Header with Cooperative Details */}
          <div style={{ textAlign: 'center', marginBottom: '14px', lineHeight: '1.35' }}>
            <div style={{ fontSize: '11.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
              University of Cebu -METC Multipurpose Cooperative (UC-METC MPC)
            </div>
            <div style={{ fontSize: '9pt', color: '#1f2937' }}>
              UC-METC Campus, Alumnos, Mambaling, Cebu City
            </div>
            <div style={{ fontSize: '8.5pt', color: '#374151' }}>
              ucmetc.ecc@gmail.com tel no.410-8811 local 5155
            </div>
            <div style={{ fontSize: '7.5pt', color: '#4b5563' }}>
              Reg. No. 9520-1070000000029729
            </div>
          </div>

          {/* 2. Document Title */}
          <div style={{ textAlign: 'center', margin: '14px 0 16px 0' }}>
            <span style={{ fontSize: '13pt', fontWeight: 'bold', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              LIQUIDATION FORM
            </span>
          </div>

          {/* 3. LF Number (Red text) & Amount for liquidation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
            <div>
              <span style={{ fontSize: '10.5pt', fontWeight: 'bold' }}>LF no. </span>
              <span style={{ fontSize: '11.5pt', fontWeight: 'bold', color: '#dc2626' }}>
                {printingLf.form.lf_no}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '10pt', fontWeight: 'bold' }}>Amount for liquidation:</span>
              <span style={{ fontSize: '11pt', fontWeight: 'bold', marginLeft: '32px' }}>
                {Number(printingLf.form.authorized_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* 4. Table with 4 columns: Release Date | Particulars | Amount | Remarks */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', border: '1px solid #000' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <th style={{ borderRight: '1px solid #000', padding: '6px 8px', textAlign: 'center', width: '20%', fontWeight: 'bold' }}>
                  Release Date
                </th>
                <th style={{ borderRight: '1px solid #000', padding: '6px 8px', textAlign: 'center', width: '38%', fontWeight: 'bold' }}>
                  Particulars
                </th>
                <th style={{ borderRight: '1px solid #000', padding: '6px 8px', textAlign: 'center', width: '22%', fontWeight: 'bold' }}>
                  Amount
                </th>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: '20%', fontWeight: 'bold' }}>
                  Remarks
                </th>
              </tr>
            </thead>
            <tbody>
              {printingLf.items.map((item, idx) => (
                <tr key={idx} style={{ minHeight: '22px' }}>
                  <td style={{ borderRight: '1px solid #000', padding: '3.5px 8px', textAlign: 'center' }}>
                    {item.release_date_raw || (item.release_date ? formatRawDate(item.release_date) : '')}
                  </td>
                  <td style={{ borderRight: '1px solid #000', padding: '3.5px 8px', textAlign: 'center' }}>
                    {item.particulars}
                  </td>
                  <td style={{ borderRight: '1px solid #000', padding: '3.5px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '3.5px 8px', textAlign: 'left' }}>
                    {item.remarks || ''}
                  </td>
                </tr>
              ))}

              {/* Extra spacing / blank rows to fill page nicely if items count is small */}
              {Array.from({ length: Math.max(0, 16 - printingLf.items.length) }).map((_, bIdx) => (
                <tr key={`blank-${bIdx}`} style={{ height: '22px' }}>
                  <td style={{ borderRight: '1px solid #000', padding: '3.5px 8px' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000', padding: '3.5px 8px' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000', padding: '3.5px 8px' }}>&nbsp;</td>
                  <td style={{ padding: '3.5px 8px' }}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* Total Expense Row */}
              <tr style={{ borderTop: '1px solid #000' }}>
                <td colSpan={2} style={{ borderRight: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'left' }}>
                  Total Expense
                </td>
                <td style={{ borderRight: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {Number(printingLf.form.total_expense).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '6px 8px' }}></td>
              </tr>
              {/* Cash on hand Row */}
              <tr style={{ borderTop: '1px solid #000' }}>
                <td colSpan={2} style={{ borderRight: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'left' }}>
                  Cash on hand
                </td>
                <td style={{ borderRight: '1px solid #000', padding: '6px 8px', fontWeight: 'bold', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {Number(printingLf.form.cash_on_hand).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '6px 8px' }}></td>
              </tr>
            </tfoot>
          </table>

          {/* 5. Signatories Section */}
          <div style={{ marginTop: '26px', fontSize: '9.5pt', lineHeight: '1.4' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '36% 32% 32%', alignItems: 'baseline', marginBottom: '22px' }}>
              <div>
                <span>Prepared by:</span>
                <div style={{ fontWeight: 'bold', marginTop: '16px' }}>{printingLf.form.prepared_by}</div>
              </div>
              <div>
                <span>Designation:</span>
                <div style={{ fontWeight: 'bold', marginTop: '16px' }}>{printingLf.form.prepared_designation}</div>
              </div>
              <div>
                <span>Date Submitted:</span>
                <div style={{ marginTop: '16px' }}>{formatLongDate(printingLf.form.date_submitted)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '36% 32% 32%', alignItems: 'baseline', marginBottom: '20px' }}>
              <div>
                <span>Approved by:</span>
                <div style={{ fontWeight: 'bold', marginTop: '16px' }}>{printingLf.form.approved_by}</div>
              </div>
              <div>
                <span>Designation:</span>
                <div style={{ fontWeight: 'bold', marginTop: '16px' }}>{printingLf.form.approved_designation}</div>
              </div>
              <div>
                <span>Date Approved:</span>
                <div style={{ marginTop: '16px' }}>{formatLongDate(printingLf.form.date_approved)}</div>
              </div>
            </div>
          </div>

          {/* 6. Footer Note */}
          <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '9pt', color: '#1f2937', marginTop: '22px', marginBottom: '16px' }}>
            Note: Attach original receipts as proof
          </div>

          {/* 7. Document Revision bottom-left & Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '16px', fontSize: '8.5pt', color: '#4b5563' }}>
            <div>
              <div style={{ fontSize: '8pt', color: '#6b7280' }}>Generated via UC-METC MPC Portal • Short-Term Loan Liquidation System</div>
              <div style={{ marginTop: '2px', color: '#6b7280', fontSize: '8pt' }}>KADT Solutions</div>
              <div style={{ fontSize: '7.5pt', color: '#9ca3af', marginTop: '4px' }}>Rev-061025</div>
            </div>
            <div style={{ fontSize: '8pt', color: '#6b7280' }}>Printed on: {new Date().toLocaleString()}</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
