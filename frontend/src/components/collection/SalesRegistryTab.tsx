'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  FileSpreadsheet,
  Trash2,
  Edit3,
  Loader2,
  Layers,
  ArrowUpDown,
  Tag,
  DollarSign,
  Package,
  Calendar,
  X,
  Check,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import api from '@/lib/api';
import MerchandiseCatalogImportModal from './MerchandiseCatalogImportModal';

export interface MerchandiseCatalogItem {
  id: string;
  item_name: string;
  description?: string;
  size?: string;
  cost_price: number;
  selling_price: number;
  cost_price_2025?: number;
  selling_price_2025?: number;
  category: string;
  effective_date: string;
  created_at?: string;
  updated_at?: string;
}

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export const CLASSIFICATION_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'Uniform', label: 'Uniform' },
  { value: 'Personal Protective Equipment (PPE)', label: 'Personal Protective Equipment (PPE)' },
  { value: 'School Paraphernalia', label: 'School Paraphernalia' },
  { value: 'Services', label: 'Services' },
  { value: 'Maritime Accessories', label: 'Maritime Accessories' },
  { value: 'Essentials', label: 'Essentials' },
];

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
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer outline-none ${
          isOpen
            ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-white dark:bg-neutral-800 border-emerald-600 text-neutral-900 dark:text-white shadow-xs'
            : 'bg-white dark:bg-neutral-900 border border-outline-variant/60 hover:border-outline-variant text-neutral-900 dark:text-white'
        } ${buttonClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate ${selectedOption || value ? 'font-semibold' : 'text-neutral-400 font-normal'}`}>
          {selectedOption ? selectedOption.label : (value || placeholder)}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 text-neutral-400 transition-transform duration-200 ease-out ${
            isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
          }`}
        />
      </button>

      <div
        className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} w-full min-w-[200px] mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-neutral-800 border border-outline-variant/60 shadow-2xl py-1 custom-scrollbar transition-all duration-200 ease-out origin-top ${
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
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold'
                  : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'
              }`}
            >
              <span>{opt.label}</span>
              {isSelected && (
                <Check className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const getCategoryBadgeColor = (category: string) => {
  const c = (category || '').toLowerCase();
  if (c.includes('uniform')) return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300';
  if (c.includes('ppe') || c.includes('protective')) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
  if (c.includes('paraphernalia')) return 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300';
  if (c.includes('service')) return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';
  if (c.includes('maritime') || c.includes('accessories')) return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300';
  if (c.includes('essential')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
};

interface Props {
  isAdmin?: boolean;
  onCatalogLoaded?: (items: MerchandiseCatalogItem[]) => void;
  hideHeaderStats?: boolean;
}

export default function SalesRegistryTab({ isAdmin = false, onCatalogLoaded, hideHeaderStats = false }: Props) {
  const [catalog, setCatalog] = useState<MerchandiseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MerchandiseCatalogItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'item_name' | 'selling_price' | 'cost_price' | 'profit'>('item_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Form state for add/edit modal
  const [formState, setFormState] = useState({
    item_name: '',
    description: '',
    size: '',
    cost_price: '',
    selling_price: '',
    cost_price_2025: '',
    selling_price_2025: '',
    category: 'Uniform',
    effective_date: 'As of October 15, 2026'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await api.get('/collections/catalog');
      const data = res.data?.data || [];
      setCatalog(data);
      if (onCatalogLoaded) onCatalogLoaded(data);
    } catch (err: any) {
      console.error('Error loading merchandise catalog:', err);
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.error?.message || 'Failed to fetch sales registry catalog'
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleOpenCreateModal = () => {
    setFormState({
      item_name: '',
      description: '',
      size: '',
      cost_price: '',
      selling_price: '',
      cost_price_2025: '',
      selling_price_2025: '',
      category: 'Uniform',
      effective_date: 'As of October 15, 2026'
    });
    setEditingItem(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (item: MerchandiseCatalogItem) => {
    setEditingItem(item);
    setFormState({
      item_name: item.item_name || '',
      description: item.description || '',
      size: item.size || '',
      cost_price: String(item.cost_price || 0),
      selling_price: String(item.selling_price || 0),
      cost_price_2025: item.cost_price_2025 ? String(item.cost_price_2025) : '',
      selling_price_2025: item.selling_price_2025 ? String(item.selling_price_2025) : '',
      category: item.category || 'Uniform',
      effective_date: item.effective_date || 'As of October 15, 2026'
    });
    setIsCreateModalOpen(true);
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.item_name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        const res = await api.put(`/collections/catalog/${editingItem.id}`, formState);
        const updated = res.data?.data;
        setCatalog(prev => prev.map(it => (it.id === updated.id ? updated : it)));
        setActionFeedback({ type: 'success', message: `Item "${updated.item_name}" updated successfully.` });
      } else {
        const res = await api.post('/collections/catalog', formState);
        const created = res.data?.data;
        setCatalog(prev => [created, ...prev]);
        setActionFeedback({ type: 'success', message: `Item "${created.item_name}" added to sales registry.` });
      }
      setIsCreateModalOpen(false);
      setEditingItem(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Error saving catalog item:', err);
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.error?.message || 'Failed to save item.'
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the sales registry?`)) return;

    setIsDeletingId(id);
    try {
      await api.delete(`/collections/catalog/${id}`);
      setCatalog(prev => prev.filter(c => c.id !== id));
      setActionFeedback({ type: 'success', message: `Item "${name}" removed from catalog.` });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Error deleting catalog item:', err);
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.error?.message || 'Failed to delete item.'
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Filtered & Sorted catalog items
  const filteredCatalog = useMemo(() => {
    let result = catalog.filter(it => {
      if (selectedCategory !== 'all' && it.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (it.item_name || '').toLowerCase().includes(q);
        const matchesDesc = (it.description || '').toLowerCase().includes(q);
        const matchesSize = (it.size || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesSize) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'item_name') {
        cmp = (a.item_name || '').localeCompare(b.item_name || '');
      } else if (sortBy === 'selling_price') {
        cmp = (Number(a.selling_price) || 0) - (Number(b.selling_price) || 0);
      } else if (sortBy === 'cost_price') {
        cmp = (Number(a.cost_price) || 0) - (Number(b.cost_price) || 0);
      } else if (sortBy === 'profit') {
        const profitA = (Number(a.selling_price) || 0) - (Number(a.cost_price) || 0);
        const profitB = (Number(b.selling_price) || 0) - (Number(b.cost_price) || 0);
        cmp = profitA - profitB;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [catalog, selectedCategory, searchQuery, sortBy, sortOrder]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    CLASSIFICATION_CATEGORY_OPTIONS.forEach(opt => set.add(opt.value));
    catalog.forEach(it => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set);
  }, [catalog]);

  const filterOptions = useMemo<SelectOption[]>(() => [
    { value: 'all', label: 'All Categories' },
    ...categories.map(c => ({ value: c, label: c }))
  ], [categories]);

  const stats = useMemo(() => {
    const totalItems = catalog.length;
    const avgMargin = totalItems > 0
      ? catalog.reduce((acc, it) => {
          const sp = Number(it.selling_price) || 0;
          const cp = Number(it.cost_price) || 0;
          return acc + (sp - cp);
        }, 0) / totalItems
      : 0;
    const servicesCount = catalog.filter(c => c.category === 'Services' || c.category === 'Coop Services').length;
    const merchCount = catalog.filter(c => c.category !== 'Services' && c.category !== 'Coop Services').length;
    return { totalItems, avgMargin, servicesCount, merchCount };
  }, [catalog]);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Overview Cards (rendered if hideHeaderStats is false) */}
      {!hideHeaderStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Catalog Items</span>
              <p className="text-2xl font-black text-neutral-900 dark:text-white font-mono">{stats.totalItems}</p>
              <p className="text-[11px] text-neutral-500">Active items in master registry</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Merchandise Products</span>
              <p className="text-2xl font-black text-neutral-900 dark:text-white font-mono">{stats.merchCount}</p>
              <p className="text-[11px] text-neutral-500">Uniforms, caps, badges & supplies</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Average Profit / Unit</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ₱{stats.avgMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-neutral-500">Across all priced catalogue entries</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Search & Actions */}
      <div className="p-4 bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search sales registry by item name, description, size..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-outline-variant/60 bg-surface-container-low dark:bg-surface-container text-xs font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Category Filter Animated Dropdown */}
            <AnimatedSelect
              value={selectedCategory}
              onChange={val => setSelectedCategory(val)}
              options={filterOptions}
              className="min-w-48"
              buttonClassName="rounded-2xl border-outline-variant/60 bg-surface-container-low dark:bg-surface-container"
            />

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchCatalog}
              disabled={loading}
              className="p-2.5 rounded-2xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
              title="Refresh Sales Registry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Excel Import Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-emerald-600/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
                title="Import Excel Price List (Cost & Selling Price)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>
            )}

            {/* Add Item Manual Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-primary text-white dark:bg-secondary dark:text-neutral-950 font-bold text-xs hover:brightness-110 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-secondary mx-auto" />
            <p className="text-xs text-neutral-500 font-medium">Loading Sales Registry catalog...</p>
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <ShoppingBag className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-neutral-700 dark:text-neutral-300">No Catalog Items Found</h4>
              <p className="text-xs text-neutral-500">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try clearing your filters or search keywords.'
                  : 'Start by importing the master spreadsheet or adding items manually.'}
              </p>
            </div>
            {isAdmin && (
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                >
                  Import Price List
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white dark:bg-secondary dark:text-neutral-950 cursor-pointer"
                >
                  + Add First Item
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#064e3b] text-white font-extrabold uppercase text-[10px] tracking-wider border-b border-emerald-800">
                  <th className="py-3 px-3.5 text-center w-12">#</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-emerald-900/60 transition-colors select-none"
                    onClick={() => {
                      if (sortBy === 'item_name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('item_name'); setSortOrder('asc'); }
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Item Name</span>
                      <ArrowUpDown className="w-3 h-3 text-emerald-300" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Description / Dept</th>
                  <th className="py-3 px-3 text-center">Size</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-emerald-900/60 transition-colors select-none"
                    onClick={() => {
                      if (sortBy === 'cost_price') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('cost_price'); setSortOrder('asc'); }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>2026 Cost</span>
                      <ArrowUpDown className="w-3 h-3 text-emerald-300" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-emerald-900/60 transition-colors select-none"
                    onClick={() => {
                      if (sortBy === 'selling_price') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('selling_price'); setSortOrder('asc'); }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>2026 Selling</span>
                      <ArrowUpDown className="w-3 h-3 text-emerald-300" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:bg-emerald-900/60 transition-colors select-none"
                    onClick={() => {
                      if (sortBy === 'profit') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('profit'); setSortOrder('desc'); }
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Profit (₱)</span>
                      <ArrowUpDown className="w-3 h-3 text-emerald-300" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">2025 Cost</th>
                  <th className="py-3 px-3 text-right">2025 Selling</th>
                  <th className="py-3 px-3 text-center">Category</th>
                  {isAdmin && <th className="py-3 px-3 text-center w-20">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-medium">
                {filteredCatalog.map((item, index) => {
                  const cp = Number(item.cost_price) || 0;
                  const sp = Number(item.selling_price) || 0;
                  const profit = sp - cp;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-emerald-50/30 dark:hover:bg-neutral-800/40 transition-colors group"
                    >
                      <td className="py-3 px-3.5 text-center text-neutral-400 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3 font-bold text-neutral-900 dark:text-white">
                        {item.item_name}
                      </td>
                      <td className="py-3 px-3 text-neutral-700 dark:text-neutral-300">
                        {item.description || '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                        {item.size || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-neutral-900 dark:text-white">
                        ₱{cp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                        ₱{sp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${
                        profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        ₱{profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-neutral-500 text-[11px]">
                        {item.cost_price_2025 ? `₱${Number(item.cost_price_2025).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-neutral-500 text-[11px]">
                        {item.selling_price_2025 ? `₱${Number(item.selling_price_2025).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getCategoryBadgeColor(item.category)}`}>
                          {item.category}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 rounded-lg border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer"
                              title="Edit Item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isDeletingId === item.id}
                              onClick={() => handleDeleteItem(item.id, item.item_name)}
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                              title="Delete Item"
                            >
                              {isDeletingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary Bar */}
        {!loading && filteredCatalog.length > 0 && (
          <div className="p-4 border-t border-outline-variant/60 bg-neutral-50/60 dark:bg-neutral-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-neutral-500">
              Showing <span className="font-bold text-neutral-900 dark:text-white">{filteredCatalog.length}</span> of {catalog.length} total catalog records
            </span>
            <span className="text-neutral-400 font-mono text-[11px]">
              Active Version: {catalog[0]?.effective_date || 'October 2026 Price List'}
            </span>
          </div>
        )}
      </div>

      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <MerchandiseCatalogImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={fetchCatalog}
        />
      )}

      {/* Manual Create / Edit Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-modal-pop">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary dark:text-secondary flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                    {editingItem ? 'Edit Catalog Item' : 'Add New Item to Sales Registry'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Define official merchandise or service pricing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitItem} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Item Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.item_name}
                    onChange={e => setFormState({ ...formState, item_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 font-bold text-neutral-900 dark:text-white"
                    placeholder="e.g. Type C, Uniform Polo, ID Case"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Description / Category
                  </label>
                  <input
                    type="text"
                    value={formState.description}
                    onChange={e => setFormState({ ...formState, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    placeholder="e.g. BSMT, BSMARE, JHS, SHS"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Size / Variant
                  </label>
                  <input
                    type="text"
                    value={formState.size}
                    onChange={e => setFormState({ ...formState, size: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    placeholder="e.g. small, medium, large, xl, 2xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    2026 Cost Price (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formState.cost_price}
                    onChange={e => setFormState({ ...formState, cost_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 font-mono font-bold text-right text-neutral-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    2026 Selling Price (₱) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formState.selling_price}
                    onChange={e => setFormState({ ...formState, selling_price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 font-mono font-bold text-right text-emerald-600 dark:text-emerald-400"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Classification Category
                  </label>
                  <AnimatedSelect
                    value={formState.category}
                    onChange={val => setFormState({ ...formState, category: val })}
                    options={CLASSIFICATION_CATEGORY_OPTIONS}
                    placeholder="Select category..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Effective Version
                  </label>
                  <input
                    type="text"
                    value={formState.effective_date}
                    onChange={e => setFormState({ ...formState, effective_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    placeholder="e.g. As of October 15, 2026"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white dark:bg-secondary dark:text-neutral-950 hover:brightness-110 transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Save Changes' : 'Add to Catalog'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
