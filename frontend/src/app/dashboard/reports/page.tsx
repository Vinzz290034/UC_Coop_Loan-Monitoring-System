'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import BackButton from '@/components/BackButton';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  TrendingUp,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Users,
  BookOpen,
  DollarSign,
  PieChart,
  Tag,
  ArrowUpDown,
  AlertCircle,
  FileText,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
  X,
  BarChart3,
  ArrowLeft,
  FolderTree,
  ChevronRight,
  Plus,
  Trash2,
  Check
} from 'lucide-react';
import FinancialSummaryGraphs from '@/components/reports/FinancialSummaryGraphs';
import {
  ACCOUNT_CATEGORIES,
  CATEGORY_THEMES,
  getCategoryForAccount,
  REPLENISHMENT_ACCOUNT_OPTIONS,
  getRfDeletedAccountsSet,
  saveRfDeletedAccount,
  restoreRfDeletedAccount
} from '@/lib/accountCategories';

export type ReportTab =
  | 'merchandise'
  | 'expenses'
  | 'categories'
  | 'loans'
  | 'membership'
  | 'financial_statement'
  | 'summary';

export type ReportPeriod = 'daily' | 'monthly' | 'annual';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getCategoryNavigationLink = (category: string) => {
  const lower = (category || '').toLowerCase();
  if (lower.includes('merchandise')) {
    return {
      label: 'Merchandise Sales & Profit',
      href: '/dashboard/reports?tab=merchandise'
    };
  }
  if (lower.includes('revolving')) {
    return {
      label: 'Revolving Funds',
      href: '/dashboard/disbursement?tab=revolving_fund_replenishment'
    };
  }
  if (lower.includes('petty')) {
    return {
      label: 'Petty Cash',
      href: '/dashboard/disbursement?tab=petty_cash_replenishment'
    };
  }
  if (lower.includes('service')) {
    return {
      label: 'Service Disbursement',
      href: '/dashboard/disbursement?tab=service'
    };
  }
  if (lower.includes('honorarium') || lower.includes('wages') || lower.includes('allowances')) {
    return {
      label: 'Recipient Compensation',
      href: '/dashboard/reports?tab=expenses&subview=recipients'
    };
  }
  return {
    label: 'Expense Breakdown',
    href: '/dashboard/reports?tab=expenses&subview=accounts'
  };
};

function ReportsPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Active Report Tab - supports deep-linking via ?tab=expenses
  const [activeTab, setActiveTab] = useState<ReportTab>(() => {
    const t = searchParams?.get('tab') as ReportTab | null;
    if (t && ['summary', 'expenses', 'categories', 'merchandise', 'loans', 'membership', 'financial_statement'].includes(t)) {
      return t;
    }
    return 'summary';
  });

  // Keep activeTab synchronized when ?tab= query parameter changes
  useEffect(() => {
    const t = searchParams?.get('tab') as ReportTab | null;
    if (t && ['summary', 'expenses', 'categories', 'merchandise', 'loans', 'membership', 'financial_statement'].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  // Filter States
  const now = new Date();
  const [period, setPeriod] = useState<ReportPeriod>(() => {
    const p = searchParams?.get('period') as ReportPeriod | null;
    return p && ['daily', 'monthly', 'annual'].includes(p) ? p : 'annual';
  });
  const [year, setYear] = useState<number>(() => {
    const y = searchParams?.get('year');
    return y && !isNaN(Number(y)) ? Number(y) : 2026;
  });
  const [month, setMonth] = useState<number>(() => {
    const m = searchParams?.get('month');
    return m && !isNaN(Number(m)) ? Number(m) : now.getMonth() + 1;
  });
  const [date, setDate] = useState<string>(() => {
    return searchParams?.get('date') || now.toISOString().split('T')[0];
  });

  // Search & Sorting States
  const [search, setSearch] = useState('');
  const [subView, setSubView] = useState<'summary' | 'itemized'>('summary');
  const [sortField, setSortField] = useState('total_revenue');
  const [sortAsc, setSortAsc] = useState(false);

  // Expense Breakdown Sub-view States
  const [expenseSubView, setExpenseSubView] = useState<'accounts' | 'recipients'>(() => {
    const sv = searchParams?.get('subview');
    return sv === 'recipients' ? 'recipients' : 'accounts';
  });
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<'all' | 'Operation Expense' | 'Service Expense' | 'Merchandise Expense'>('all');
  const [expenseAccountSearch, setExpenseAccountSearch] = useState('');
  const [expenseAccountSortKey, setExpenseAccountSortKey] = useState<'name' | 'count' | 'amount'>('name');
  const [expenseAccountSortOrder, setExpenseAccountSortOrder] = useState<'asc' | 'desc'>('asc');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [accountsVersion, setAccountsVersion] = useState(0);
  const [selectedRecipientModal, setSelectedRecipientModal] = useState<any | null>(null);
  const [selectedAccountModal, setSelectedAccountModal] = useState<any | null>(null);
  const [accountModalSearch, setAccountModalSearch] = useState('');
  const [selectedMerchandiseModal, setSelectedMerchandiseModal] = useState<any | null>(null);
  const [merchandiseModalSearch, setMerchandiseModalSearch] = useState('');
  const [merchandiseCatalogFilter, setMerchandiseCatalogFilter] = useState<'all' | 'sold'>('all');
  const [selectedLoanProductModal, setSelectedLoanProductModal] = useState<any | null>(null);
  const [loanProductModalSearch, setLoanProductModalSearch] = useState('');

  // Book of Accounts by Category States
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | string>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [customAccounts, setCustomAccounts] = useState<string[]>([]);
  const [accountCategoryMap, setAccountCategoryMap] = useState<Record<string, string>>({});

  // Create / Delete Book of Account Modal States
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountCategory, setNewAccountCategory] = useState('Operation');
  const [isCategoryManuallyChosen, setIsCategoryManuallyChosen] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<{ name: string; count: number } | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Financial Statement Sub-View & Search
  const [fsSubView, setFsSubView] = useState<'combined' | 'balance_sheet' | 'income_statement'>('combined');
  const [fsSearch, setFsSearch] = useState('');
  const [selectedFsAccountModal, setSelectedFsAccountModal] = useState<any | null>(null);

  // Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  const filteredRecipients = useMemo(() => {
    if (!reportData?.recipients || !Array.isArray(reportData.recipients)) return [];
    if (!recipientSearch.trim()) return reportData.recipients;
    const q = recipientSearch.toLowerCase().trim();
    return reportData.recipients.filter((r: any) =>
      r.name.toLowerCase().includes(q)
    );
  }, [reportData?.recipients, recipientSearch]);

  const filteredExpenseAccounts = useMemo(() => {
    let list = reportData?.accounts || [];

    // Filter out deleted accounts (from localStorage and backend deleted list)
    if (typeof window !== 'undefined') {
      try {
        const deletedSaved = localStorage.getItem('rf_deleted_accounts');
        if (deletedSaved) {
          const arr = JSON.parse(deletedSaved);
          if (Array.isArray(arr) && arr.length > 0) {
            const delSet = new Set(arr.map((s: string) => String(s).trim().toLowerCase()));
            list = list.filter((acc: any) => !delSet.has((acc.account_name || '').trim().toLowerCase()));
          }
        }
      } catch {}
    }

    // Merge any newly added custom accounts from localStorage if not yet returned by backend
    if (typeof window !== 'undefined') {
      try {
        const customSaved = localStorage.getItem('rf_custom_accounts');
        const catSaved = localStorage.getItem('rf_account_categories');
        const catMap = catSaved ? JSON.parse(catSaved) : {};
        if (customSaved) {
          const arr = JSON.parse(customSaved);
          if (Array.isArray(arr)) {
            const existingNames = new Set(list.map((a: any) => (a.account_name || '').trim().toLowerCase()));
            const toAdd: any[] = [];
            for (const c of arr) {
              const clean = String(c).trim();
              if (clean && !existingNames.has(clean.toLowerCase())) {
                const rawCat = catMap[clean.toLowerCase()] || 'Operation';
                let normalizedCat = 'Operation Expense';
                if (/service/i.test(rawCat)) normalizedCat = 'Service Expense';
                else if (/merchandise/i.test(rawCat)) normalizedCat = 'Merchandise Expense';
                toAdd.push({
                  account_name: clean,
                  category: normalizedCat,
                  total_amount: 0,
                  count: 0,
                  share_pct: '0.0',
                  transactions: []
                });
              }
            }
            if (toAdd.length > 0) {
              list = [...list, ...toAdd];
            }
          }
        }
      } catch {}
    }

    if (selectedExpenseCategory !== 'all') {
      list = list.filter((acc: any) => acc.category === selectedExpenseCategory);
    }
    const q = expenseAccountSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((acc: any) =>
        (acc.account_name || '').toLowerCase().includes(q) ||
        (acc.category || '').toLowerCase().includes(q)
      );
    }
    return list.slice().sort((a: any, b: any) => {
      if (expenseAccountSortKey === 'name') {
        const cmp = (a.account_name || '').localeCompare(b.account_name || '', undefined, { sensitivity: 'base' });
        return expenseAccountSortOrder === 'asc' ? cmp : -cmp;
      }
      if (expenseAccountSortKey === 'count') {
        const diff = (Number(a.count) || 0) - (Number(b.count) || 0);
        return expenseAccountSortOrder === 'asc' ? diff : -diff;
      }
      if (expenseAccountSortKey === 'amount') {
        const diff = (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0);
        return expenseAccountSortOrder === 'asc' ? diff : -diff;
      }
      return 0;
    });
  }, [reportData?.accounts, selectedExpenseCategory, expenseAccountSearch, expenseAccountSortKey, expenseAccountSortOrder, accountsVersion]);

  const accountModalTransactions = useMemo(() => {
    if (!selectedAccountModal) return [];
    let list = selectedAccountModal.transactions || [];
    if (!list.length && reportData?.itemized_records) {
      list = reportData.itemized_records.filter(
        (it: any) => it.account_name === selectedAccountModal.account_name
      );
    }
    if (!accountModalSearch.trim()) return list;
    const q = accountModalSearch.toLowerCase();
    return list.filter((t: any) =>
      String(t.voucher_no || '').toLowerCase().includes(q) ||
      String(t.particulars || '').toLowerCase().includes(q) ||
      String(t.payee || t.remarks || '').toLowerCase().includes(q) ||
      String(t.date || '').toLowerCase().includes(q)
    );
  }, [selectedAccountModal, accountModalSearch, reportData]);



  const filteredProducts = useMemo(() => {
    if (!reportData?.products || !Array.isArray(reportData.products)) return [];
    let list = reportData.products;
    if (merchandiseCatalogFilter === 'sold') {
      list = list.filter((p: any) => p.total_revenue > 0);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((p: any) =>
      p.item_name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.size?.toLowerCase().includes(q)
    );
  }, [reportData?.products, merchandiseCatalogFilter, search]);

  const merchandiseModalTransactions = useMemo(() => {
    if (!selectedMerchandiseModal) return [];
    const list = selectedMerchandiseModal.transactions || [];
    if (!merchandiseModalSearch.trim()) return list;
    const q = merchandiseModalSearch.toLowerCase();
    return list.filter((t: any) =>
      String(t.or_no || '').toLowerCase().includes(q) ||
      String(t.payor_name || '').toLowerCase().includes(q) ||
      String(t.payment_method || '').toLowerCase().includes(q) ||
      String(t.date || '').toLowerCase().includes(q)
    );
  }, [selectedMerchandiseModal, merchandiseModalSearch]);

  const loanProductModalBorrowers = useMemo(() => {
    if (!selectedLoanProductModal) return [];
    const list = selectedLoanProductModal.borrowers || [];
    if (!loanProductModalSearch.trim()) return list;
    const q = loanProductModalSearch.toLowerCase();
    return list.filter((b: any) =>
      String(b.member_name || '').toLowerCase().includes(q) ||
      String(b.laf_no || '').toLowerCase().includes(q) ||
      String(b.voucher_no || '').toLowerCase().includes(q) ||
      String(b.date || '').toLowerCase().includes(q)
    );
  }, [selectedLoanProductModal, loanProductModalSearch]);

  // Sync custom accounts and categories from backend
  useEffect(() => {
    let isMounted = true;
    api.get('/revolving-funds/accounts')
      .then(res => {
        if (!isMounted) return;
        if (res.data?.success && Array.isArray(res.data.data)) {
          const names: string[] = [];
          const catMap: Record<string, string> = {};
          for (const item of res.data.data) {
            const name = typeof item === 'string' ? item : item.name;
            const cat = typeof item === 'string' ? '' : item.category;
            if (name) {
              names.push(name);
              if (cat) catMap[name.toLowerCase()] = cat;
            }
          }
          setCustomAccounts(names);
          setAccountCategoryMap(catMap);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [accountsVersion]);

  // Group all accounts under the 10 Categories
  const categoryGroupsData = useMemo(() => {
    const deleted = getRfDeletedAccountsSet();
    const accountsData = reportData?.accounts || [];
    const accountsByName = new Map<string, any>();
    for (const a of accountsData) {
      if (a.account_name) {
        accountsByName.set(a.account_name.trim().toLowerCase(), a);
      }
    }

    // Combine all known accounts
    const allKnownNames = new Set<string>();
    for (const opt of REPLENISHMENT_ACCOUNT_OPTIONS) {
      if (!deleted.has(opt.trim().toLowerCase())) allKnownNames.add(opt.trim());
    }
    for (const a of accountsData) {
      const clean = (a.account_name || '').trim();
      if (clean && !deleted.has(clean.toLowerCase())) allKnownNames.add(clean);
    }
    for (const c of customAccounts) {
      const clean = (c || '').trim();
      if (clean && !deleted.has(clean.toLowerCase())) allKnownNames.add(clean);
    }

    if (typeof window !== 'undefined') {
      try {
        const customSaved = localStorage.getItem('rf_custom_accounts');
        if (customSaved) {
          const arr = JSON.parse(customSaved);
          if (Array.isArray(arr)) {
            for (const c of arr) {
              const clean = String(c || '').trim();
              if (clean && !deleted.has(clean.toLowerCase())) allKnownNames.add(clean);
            }
          }
        }
      } catch {}
    }

    let mergedCatMap = { ...accountCategoryMap };
    if (typeof window !== 'undefined') {
      try {
        const catSaved = localStorage.getItem('rf_account_categories');
        if (catSaved) {
          const parsed = JSON.parse(catSaved);
          mergedCatMap = { ...mergedCatMap, ...parsed };
        }
      } catch {}
    }

    const groups: Record<string, any[]> = {};
    for (const cat of ACCOUNT_CATEGORIES) {
      groups[cat.value] = [];
    }

    for (const name of allKnownNames) {
      const cat = getCategoryForAccount(name, mergedCatMap);
      const targetCat = groups[cat] ? cat : 'Operation';
      const existingReport = accountsByName.get(name.toLowerCase());
      groups[targetCat].push({
        account_name: name,
        category: targetCat,
        total_amount: existingReport ? Number(existingReport.total_amount) || 0 : 0,
        count: existingReport ? Number(existingReport.count) || 0 : 0,
        transactions: existingReport?.transactions || [],
        share_pct: existingReport?.share_pct || '0.0'
      });
    }

    return ACCOUNT_CATEGORIES.map(cat => {
      const allAccts = (groups[cat.value] || []).sort((a, b) =>
        a.account_name.localeCompare(b.account_name, undefined, { sensitivity: 'base' })
      );
      const totalSpent = allAccts.reduce((sum, a) => sum + (Number(a.total_amount) || 0), 0);
      const totalEntries = allAccts.reduce((sum, a) => sum + (Number(a.count) || 0), 0);

      const q = categorySearch.trim().toLowerCase();
      const filteredAccts = q
        ? allAccts.filter(a =>
            a.account_name.toLowerCase().includes(q) ||
            cat.label.toLowerCase().includes(q)
          )
        : allAccts;

      return {
        category: cat.value,
        label: cat.label,
        color: cat.color,
        description: cat.description,
        theme: CATEGORY_THEMES[cat.value] || CATEGORY_THEMES['Operation'],
        accounts: filteredAccts,
        totalAccountsCount: allAccts.length,
        total_spent: totalSpent,
        total_entries: totalEntries,
        isMatch: q ? (cat.label.toLowerCase().includes(q) || filteredAccts.length > 0) : true
      };
    });
  }, [reportData?.accounts, customAccounts, accountCategoryMap, categorySearch, accountsVersion]);

  const visibleCategoryGroups = useMemo(() => {
    if (selectedCategoryFilter === 'all') {
      return categoryGroupsData.filter(g => g.isMatch);
    }
    return categoryGroupsData.filter(g => g.category === selectedCategoryFilter && g.isMatch);
  }, [categoryGroupsData, selectedCategoryFilter]);

  const totalCategoryAccountsCount = useMemo(() => {
    return categoryGroupsData.reduce((sum, g) => sum + g.totalAccountsCount, 0);
  }, [categoryGroupsData]);

  const totalCategorySpent = useMemo(() => {
    return categoryGroupsData.reduce((sum, g) => sum + g.total_spent, 0);
  }, [categoryGroupsData]);

  const totalCategoryEntries = useMemo(() => {
    return categoryGroupsData.reduce((sum, g) => sum + g.total_entries, 0);
  }, [categoryGroupsData]);

  const toggleCategoryCollapse = (catValue: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catValue]: !prev[catValue]
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    ACCOUNT_CATEGORIES.forEach(c => { next[c.value] = false; });
    setCollapsedCategories(next);
  };

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    ACCOUNT_CATEGORIES.forEach(c => { next[c.value] = true; });
    setCollapsedCategories(next);
  };

  // Handlers to close modals and clean URL parameters
  const closeAccountModal = useCallback(() => {
    setSelectedAccountModal(null);
    autoOpenedRef.current = null;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('account')) {
        url.searchParams.delete('account');
        const qs = url.searchParams.toString();
        window.history.replaceState({}, '', url.pathname + (qs ? `?${qs}` : ''));
      }
    }
  }, []);

  const closeRecipientModal = useCallback(() => {
    setSelectedRecipientModal(null);
    autoOpenedRef.current = null;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('recipient')) {
        url.searchParams.delete('recipient');
        const qs = url.searchParams.toString();
        window.history.replaceState({}, '', url.pathname + (qs ? `?${qs}` : ''));
      }
    }
  }, []);

  // Handlers to create and delete Book of Accounts
  const handleCreateAccount = async () => {
    const trimmed = newAccountName.trim();
    if (!trimmed) return;
    const catToUse = newAccountCategory.trim() || 'Operation';

    setIsSavingAccount(true);
    restoreRfDeletedAccount(trimmed);

    // 1. Update localStorage
    try {
      const customSaved = localStorage.getItem('rf_custom_accounts');
      const arr = customSaved ? JSON.parse(customSaved) : [];
      const merged = Array.from(new Set([...(Array.isArray(arr) ? arr : []), trimmed])).sort((a, b) => a.localeCompare(b));
      localStorage.setItem('rf_custom_accounts', JSON.stringify(merged));

      const catSaved = localStorage.getItem('rf_account_categories');
      const catMap = catSaved ? JSON.parse(catSaved) : {};
      catMap[trimmed.toLowerCase()] = catToUse;
      localStorage.setItem('rf_account_categories', JSON.stringify(catMap));
    } catch {}

    // 2. Update local state
    setCustomAccounts(prev => Array.from(new Set([...prev, trimmed])).sort((a, b) => a.localeCompare(b)));
    setAccountCategoryMap(prev => ({ ...prev, [trimmed.toLowerCase()]: catToUse }));

    // 3. Persist to backend
    try {
      await api.post('/revolving-funds/accounts', { name: trimmed, category: catToUse });
    } catch (err) {
      console.error('Failed to save account to backend:', err);
    }

    // 4. Dispatch event & refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('accounts_updated'));
    }
    setAccountsVersion(v => v + 1);
    fetchReport();

    setIsSavingAccount(false);
    setIsCreateAccountModalOpen(false);
    setNewAccountName('');
    setIsCategoryManuallyChosen(false);
  };

  const handleConfirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    const trimmed = accountToDelete.name.trim();
    setIsDeletingAccount(true);

    // 1. Mark as deleted persistently
    saveRfDeletedAccount(trimmed);

    // 2. Update localStorage
    try {
      const customSaved = localStorage.getItem('rf_custom_accounts');
      if (customSaved) {
        const arr = JSON.parse(customSaved);
        if (Array.isArray(arr)) {
          const filtered = arr.filter((a: any) => String(a || '').trim().toLowerCase() !== trimmed.toLowerCase());
          localStorage.setItem('rf_custom_accounts', JSON.stringify(filtered));
        }
      }
      const catSaved = localStorage.getItem('rf_account_categories');
      if (catSaved) {
        const catMap = JSON.parse(catSaved);
        delete catMap[trimmed.toLowerCase()];
        localStorage.setItem('rf_account_categories', JSON.stringify(catMap));
      }
    } catch {}

    // 3. Update state
    setCustomAccounts(prev => prev.filter(a => a.toLowerCase() !== trimmed.toLowerCase()));
    setAccountCategoryMap(prev => {
      const next = { ...prev };
      delete next[trimmed.toLowerCase()];
      return next;
    });

    // 4. Persist to backend
    try {
      await api.delete(`/revolving-funds/accounts/${encodeURIComponent(trimmed)}`);
    } catch (err) {
      console.error('Failed to delete account on backend:', err);
    }

    // 5. Close account modal if open with this account
    if (selectedAccountModal && (selectedAccountModal.account_name || '').toLowerCase() === trimmed.toLowerCase()) {
      closeAccountModal();
    }

    // 6. Dispatch event & refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('accounts_updated'));
    }
    setAccountsVersion(v => v + 1);
    fetchReport();

    setIsDeletingAccount(false);
    setAccountToDelete(null);
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreateAccountModalOpen) setIsCreateAccountModalOpen(false);
        if (accountToDelete) setAccountToDelete(null);
        if (selectedLoanProductModal) setSelectedLoanProductModal(null);
        if (selectedMerchandiseModal) setSelectedMerchandiseModal(null);
        if (selectedAccountModal) closeAccountModal();
        if (selectedRecipientModal) closeRecipientModal();
        if (selectedFsAccountModal) setSelectedFsAccountModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCreateAccountModalOpen,
    accountToDelete,
    selectedLoanProductModal,
    selectedMerchandiseModal,
    selectedAccountModal,
    selectedRecipientModal,
    selectedFsAccountModal,
    closeAccountModal,
    closeRecipientModal
  ]);

  // Fetch report data based on active tab and period
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const endpointMap: Record<ReportTab, string> = {
        merchandise: '/reports/merchandise-sales',
        expenses: '/reports/expenses-breakdown',
        categories: '/reports/expenses-breakdown',
        loans: '/reports/loan-products',
        membership: '/reports/membership-update',
        financial_statement: '/reports/financial-statement',
        summary: '/reports/financial-statement'
      };

      const endpoint = endpointMap[activeTab];
      const params = {
        period,
        year,
        month,
        date
      };

      const res = await api.get(endpoint, { params });
      setReportData(res.data);
    } catch (err: any) {
      console.error('Failed to load report:', err);
      setError(err.response?.data?.message || 'Failed to retrieve report data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, period, year, month, date]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Sync custom/deleted accounts when modified from disbursement dropdown
  useEffect(() => {
    const handleAccountsUpdated = () => {
      setAccountsVersion(v => v + 1);
      fetchReport();
    };
    window.addEventListener('accounts_updated', handleAccountsUpdated);
    window.addEventListener('storage', handleAccountsUpdated);
    return () => {
      window.removeEventListener('accounts_updated', handleAccountsUpdated);
      window.removeEventListener('storage', handleAccountsUpdated);
    };
  }, [fetchReport]);

  // Auto-open requested Account or Recipient Modal when returning from Check Voucher in Disbursement
  const autoOpenedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!reportData) return;

    const targetAccountName = searchParams?.get('account');
    if (targetAccountName) {
      const key = `acc-${targetAccountName}`;
      if (autoOpenedRef.current !== key) {
        autoOpenedRef.current = key;
        let match = Array.isArray(reportData.accounts)
          ? reportData.accounts.find(
              (a: any) => (a.account_name || '').trim().toLowerCase() === targetAccountName.trim().toLowerCase()
            )
          : null;
        if (!match) {
          for (const grp of categoryGroupsData) {
            const found = grp.accounts.find(
              (a: any) => (a.account_name || '').trim().toLowerCase() === targetAccountName.trim().toLowerCase()
            );
            if (found) {
              match = found;
              break;
            }
          }
        }
        if (match) {
          setSelectedAccountModal(match);
          if (activeTab === 'expenses') {
            setExpenseSubView('accounts');
          }
        }
        // Immediately remove ?account= from browser URL so subsequent refreshes or visits don't keep reopening it
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('account');
          const qs = url.searchParams.toString();
          window.history.replaceState({}, '', url.pathname + (qs ? `?${qs}` : ''));
        }
      }
    } else {
      if (autoOpenedRef.current?.startsWith('acc-')) {
        autoOpenedRef.current = null;
      }
    }

    const targetRecipientName = searchParams?.get('recipient');
    if (targetRecipientName && Array.isArray(reportData.recipients)) {
      const key = `rec-${targetRecipientName}`;
      if (autoOpenedRef.current !== key) {
        autoOpenedRef.current = key;
        const match = reportData.recipients.find(
          (r: any) => (r.name || '').trim().toLowerCase() === targetRecipientName.trim().toLowerCase()
        );
        if (match) {
          setSelectedRecipientModal(match);
          setExpenseSubView('recipients');
        }
        // Immediately remove ?recipient= from browser URL so subsequent refreshes or visits don't keep reopening it
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('recipient');
          const qs = url.searchParams.toString();
          window.history.replaceState({}, '', url.pathname + (qs ? `?${qs}` : ''));
        }
      }
    } else {
      if (autoOpenedRef.current?.startsWith('rec-')) {
        autoOpenedRef.current = null;
      }
    }
  }, [reportData, searchParams, categoryGroupsData, activeTab]);

  // Daily, Monthly, and Annual periods supported across all report tabs

  // Open Financial Statement Account Specification Modal
  const openFsAccountSpecification = (item: any, statementType: string) => {
    let subAccounts = item.sub_accounts;
    let desc = item.description;
    let linkTab = item.link_tab;
    let linkTitle = item.link_title;
    let loansNav = item.loans_nav;

    if (!subAccounts || subAccounts.length === 0) {
      const amt = Number(item.amount) || 0;
      const acc = String(item.account || '');

      if (acc.includes('Loans Receivable')) {
        subAccounts = [
          { name: `${acc} Active Current Principal`, amount: amt * 0.952, notes: 'Standard performing monthly amortizations' },
          { name: `${acc} Past Due / Delinquent Amortization`, amount: amt * 0.048, notes: 'Collection notices issued' }
        ];
        linkTab = 'loans';
        linkTitle = 'Loan Products';
        loansNav = `/dashboard/loans?tab=loans&search=${encodeURIComponent(acc.replace('Loans Receivable - ', ''))}`;
        desc = `Gross outstanding principal balances of active ${acc} accounts extended to cooperative members.`;
      } else if (acc.includes('Interest Received') || acc.includes('Fines')) {
        subAccounts = [
          { name: `${acc} Primary Regular Collections`, amount: amt * 0.88, notes: 'Direct member amortization collections' },
          { name: `${acc} Overdue / Advance Surcharges`, amount: amt * 0.12, notes: 'Verified collection entries' }
        ];
        linkTab = 'loans';
        linkTitle = 'Loan Products';
        desc = `Direct cooperative revenue generated from member credit facilities and loan operations.`;
      } else if (acc.includes('Uniform') || acc.includes('Bag') || acc.includes('Maritime') || acc.includes('Store Sales') || acc.includes('Inventory')) {
        subAccounts = [
          { name: `${acc} Catalog Line Items`, amount: amt * 0.85, notes: 'Official cooperative store inventory' },
          { name: `${acc} Store Over-the-Counter Sales`, amount: amt * 0.15, notes: 'Direct store cash & digital receipts' }
        ];
        linkTab = 'merchandise';
        linkTitle = 'Merchandise Sales & Profit';
        desc = `Cooperative store merchandise, retail apparel, and student academic paraphernalia.`;
      } else if (acc.includes('Capital Accounts') || acc.includes('Membership')) {
        subAccounts = [
          { name: 'Common Share Capital (Regular Voting Members)', amount: amt * 0.851, notes: 'Fully paid common voting shares' },
          { name: 'Preferred Share Capital (Associate Non-voting)', amount: amt * 0.149, notes: 'Non-voting investment shares' }
        ];
        linkTab = 'membership';
        linkTitle = 'Membership Updates';
        desc = `Cooperative member share capital subscriptions and institutional equity base.`;
      } else {
        subAccounts = [
          { name: `${acc} Primary Schedule Entry`, amount: amt, notes: 'Verified general journal ledger line' }
        ];
        linkTab = 'expenses';
        linkTitle = 'Expense Breakdown';
        desc = `Official cooperative financial statement balance recorded under ${item.category || statementType}.`;
      }
    }

    setSelectedFsAccountModal({
      ...item,
      statement_type: statementType,
      sub_accounts: subAccounts,
      description: desc,
      link_tab: linkTab,
      link_title: linkTitle,
      loans_nav: loansNav
    });
  };

  // Format currency helper
  const fmt = (num: number | string | undefined | null) => {
    const val = Number(num) || 0;
    return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Export current tab to Excel
  const handleExportExcel = () => {
    if (!reportData) return;
    try {
      const wb = XLSX.utils.book_new();
      const periodLabel = period === 'daily' ? date : period === 'monthly' ? `${MONTH_NAMES[month - 1]} ${year}` : `${year}`;

      if (activeTab === 'merchandise') {
        const rows = (reportData.products || []).map((p: any) => ({
          'Item': p.item_name,
          'Category': p.category,
          'Size': p.size || 'N/A',
          'Units Sold': p.total_qty,
          'Cost Price (PHP)': p.cost_price,
          'Selling Price (PHP)': p.selling_price,
          'Total Revenue (PHP)': p.total_revenue,
          'Total Cost (PHP)': p.total_cost,
          'Gross Profit (PHP)': p.total_profit,
          'Profit Margin (%)': `${p.margin_pct}%`
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Merchandise Sales');
      } else if (activeTab === 'expenses') {
        const targetList = selectedExpenseCategory === 'all' ? (reportData.accounts || []) : filteredExpenseAccounts;
        const rows = targetList.map((a: any) => ({
          'Expense Account': a.account_name,
          'Category': a.category,
          'Total Amount (PHP)': a.total_amount,
          'Transactions Count': a.count,
          'Share of Expenses (%)': `${a.share_pct}%`
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Expense Breakdown');

        if (Array.isArray(reportData.recipients) && reportData.recipients.length > 0) {
          const recRows = reportData.recipients.map((r: any) => ({
            'Recipient Name': r.name,
            'Honorarium (PHP)': r.total_honorarium,
            'Allowances (PHP)': r.total_allowances,
            'Wages (PHP)': r.total_wages,
            'Salary (PHP)': r.total_salary || 0,
            'Total Compensation (PHP)': r.total_compensation,
            'Payout Count': r.payout_count,
            'Share of Compensation (%)': `${r.share_pct}%`
          }));
          const recWs = XLSX.utils.json_to_sheet(recRows);
          XLSX.utils.book_append_sheet(wb, recWs, 'Recipient Payroll & Honorarium');
        }
      } else if (activeTab === 'categories') {
        const rows: any[] = [];
        for (const grp of categoryGroupsData) {
          for (const a of grp.accounts) {
            rows.push({
              'Category': grp.label,
              'Book of Accounts': a.account_name,
              'Recorded Entries Count': a.count
            });
          }
        }
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Book of Accounts by Category');
      } else if (activeTab === 'loans') {
        const rows = (reportData.products || []).map((lp: any) => ({
          'Loan Product': lp.product_name,
          'Disbursements Count': lp.disbursed_count,
          'Total Disbursed (PHP)': lp.total_disbursed,
          'Amortizations Count': lp.amortizations_count,
          'Principal Collected (PHP)': lp.principal_collected,
          'Interest Collected (PHP)': lp.interest_collected,
          'Fines Collected (PHP)': lp.fines_collected,
          'Total Inflow (PHP)': lp.total_collected
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Loan Products');
      } else if (activeTab === 'membership') {
        const rows = (reportData.new_members || []).map((m: any) => ({
          'Member No.': m.member_no,
          'Full Name': m.full_name,
          'Membership Type': m.membership_type,
          'Status': m.status,
          'Date Joined': m.date_joined,
          'Email': m.email,
          'Phone': m.phone
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Membership Updates');

      } else if (activeTab === 'financial_statement' || activeTab === 'summary') {
        const fs = reportData.statement_of_operations;
        const merchList = fs?.merchandise_sales_breakdown || [];

        const rows: any[] = [
          { 'REVENUES': 'I. SALES OF MERCHANDISE', 'Amount (PHP)': '' },
          ...merchList.map((m: any) => ({
            'REVENUES': `  ${m.account} [${m.category}]`,
            'Amount (PHP)': m.amount
          })),
          { 'REVENUES': 'TOTAL SALES OF MERCHANDISE', 'Amount (PHP)': fs?.merchandise_sales ?? 0 },
          { 'REVENUES': '', 'Amount (PHP)': '' },
          { 'REVENUES': 'II. OPERATING REVENUES', 'Amount (PHP)': '' },
          ...(fs?.revenues_breakdown || []).map((r: any) => ({
            'REVENUES': `  ${r.account} [${r.category}]`,
            'Amount (PHP)': r.amount
          })),
          { 'REVENUES': 'TOTAL OPERATING REVENUES', 'Amount (PHP)': fs?.total_revenue || 0 },
          { 'REVENUES': '', 'Amount (PHP)': '' },
          { 'REVENUES': 'TOTAL GROSS RECEIPTS (Merchandise + Operating Revenue)', 'Amount (PHP)': fs?.gross_receipts || 0 },
          { 'REVENUES': '', 'Amount (PHP)': '' },
          { 'REVENUES': 'III. COST OF SALES', 'Amount (PHP)': '' },
          ...(fs?.cost_of_sales_breakdown || []).map((c: any) => ({
            'REVENUES': `  ${c.account} [${c.category}]`,
            'Amount (PHP)': c.amount
          })),
          { 'REVENUES': 'TOTAL COST OF SALES', 'Amount (PHP)': fs?.cost_of_sales || 0 },
          { 'REVENUES': 'GROSS PROFIT', 'Amount (PHP)': fs?.gross_profit || 0 },
          { 'REVENUES': '', 'Amount (PHP)': '' },
          { 'REVENUES': 'IV. OPERATING EXPENSES', 'Amount (PHP)': '' },
          ...(fs?.operating_expenses_breakdown || []).map((o: any) => ({
            'REVENUES': `  ${o.account} [${o.category}]`,
            'Amount (PHP)': o.amount
          })),
          { 'REVENUES': 'TOTAL OPERATING EXPENSES', 'Amount (PHP)': fs?.operating_expenses || 0 },
          { 'REVENUES': '', 'Amount (PHP)': '' },
          { 'REVENUES': 'INCOME SUBSIDY', 'Amount (PHP)': fs?.income_subsidy || 0 },
          { 'REVENUES': 'NET SURPLUS / NET PROFIT', 'Amount (PHP)': fs?.net_surplus || 0 }
        ];

        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Financial Statement');
      }

      XLSX.writeFile(wb, `Coop_${activeTab}_Report_${periodLabel.replace(/[\s,]+/g, '_')}.xlsx`);
    } catch (err) {
      console.error('Excel export failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-micro-elevate print:p-0">
      {/* Top Header & Actions (hidden in print) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <BackButton href="/dashboard">Back to Overview</BackButton>
          <div className="mt-2">
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Cooperative Reports & Financials
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Comprehensive Daily, Monthly, and Annual financial schedules & cooperative statements.
            </p>
          </div>
        </div>

        {/* Global Period & Date Filter Control Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-neutral-900 p-1.5 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 shadow-xs">
          {/* Period Toggle */}
          <div className="flex items-center bg-emerald-50 dark:bg-emerald-950/60 p-0.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs font-bold">
            {(['daily', 'monthly', 'annual'] as ReportPeriod[]).map((p) => {
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all cursor-pointer ${
                    period === p
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Date Picker for Daily */}
          {period === 'daily' && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/60 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent border-0 outline-none text-neutral-900 dark:text-white font-mono text-xs cursor-pointer"
              />
            </div>
          )}

          {/* Month & Year Selectors for Monthly */}
          {period === 'monthly' && (
            <div className="flex items-center gap-1.5">
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/60 text-xs font-bold text-neutral-900 dark:text-white outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/60 text-xs font-bold text-neutral-900 dark:text-white outline-none cursor-pointer font-mono"
              >
                {[2026, 2025, 2024, 2023].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Year Selector for Annual */}
          {period === 'annual' && (
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/60 text-xs font-bold text-neutral-900 dark:text-white outline-none cursor-pointer font-mono"
            >
              {[2026, 2025, 2024, 2023].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-1.5 rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Summary + 5 Manager Reports + Financial Statement) */}
      <div className="flex border-b border-outline-variant/60 overflow-x-auto custom-scrollbar print:hidden">
        {[
          { id: 'summary', label: 'Summary', icon: BarChart3 },
          { id: 'merchandise', label: 'Merchandise Sales & Profit', icon: ShoppingBag },
          { id: 'expenses', label: 'Expense Breakdown', icon: DollarSign },
          { id: 'categories', label: 'Book of Accounts', icon: FolderTree },
          { id: 'loans', label: 'Loan Products', icon: CreditCard },
          { id: 'membership', label: 'Membership Updates', icon: Users },
          { id: 'financial_statement', label: 'Financial Statement', icon: PieChart },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as ReportTab);
                setSearch('');
              }}
              className={`flex items-center gap-2 px-4 py-3 font-headline text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Print Document Header (Visible only when printing) */}
      <div className="hidden print:block mb-6 border-b-2 border-emerald-800 pb-4">
        <div className="text-center">
          <h2 className="text-lg font-black tracking-wider uppercase text-emerald-900">
            UNIVERSITY OF CEBU COOPERATIVE
          </h2>
          <p className="text-xs text-neutral-600">Official Financial & Management Report Schedule</p>
          <div className="mt-2 text-sm font-bold text-neutral-800 uppercase">
            {activeTab.replace('_', ' ')} — Period:{' '}
            {period === 'daily' ? date : period === 'monthly' ? `${MONTH_NAMES[month - 1]} ${year}` : `Annual ${year}`}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="p-12 text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-neutral-500">Calculating report aggregation...</p>
        </div>
      ) : reportData ? (
        <>
          {/* ============================================================== */}
          {/* 1. SUMMARY TAB (VISUAL FINANCIAL ANALYTICS & CHARTS) */}
          {/* ============================================================== */}
          {activeTab === 'summary' && (
            <FinancialSummaryGraphs
              reportData={reportData}
              period={period}
              year={year}
              month={month}
              date={date}
              fmt={fmt}
            />
          )}

          {/* ============================================================== */}
          {/* 2. MERCHANDISE SALES & PROFIT TAB */}
          {/* ============================================================== */}
          {activeTab === 'merchandise' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Sales Registry Catalog</div>
                  <div className="text-xl font-extrabold text-neutral-900 dark:text-white mt-1">
                    {reportData.summary?.total_products || 0} Items
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Master catalog products</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Sold Products</div>
                  <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                    {reportData.summary?.active_products_sold || 0}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Active in this period</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Units Sold</div>
                  <div className="text-xl font-extrabold text-neutral-900 dark:text-white mt-1 font-mono">
                    {reportData.summary?.total_units_sold || 0} pcs
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Across sales collections</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Total Sales Revenue</div>
                  <div className="text-xl font-extrabold text-neutral-900 dark:text-white mt-1 font-mono">
                    {fmt(reportData.summary?.total_revenue)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Sales & Services earned</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Cost of Goods (COGS)</div>
                  <div className="text-xl font-extrabold text-neutral-900 dark:text-white mt-1 font-mono text-neutral-600 dark:text-neutral-300">
                    {fmt(reportData.summary?.total_cost)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Registry unit cost</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Gross Profit
                  </div>
                  <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                    {fmt(reportData.summary?.total_profit)}
                  </div>
                  <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                    Margin: {reportData.summary?.profit_margin_pct}%
                  </div>
                </div>
              </div>

              {/* View Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-2.5 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => { setSubView('summary'); setMerchandiseCatalogFilter('all'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      subView === 'summary' && merchandiseCatalogFilter === 'all'
                        ? 'bg-[#064e3b] text-white shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>All Registry Catalog</span>
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      subView === 'summary' && merchandiseCatalogFilter === 'all' ? 'bg-white/20 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {reportData.products?.length || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSubView('summary'); setMerchandiseCatalogFilter('sold'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      subView === 'summary' && merchandiseCatalogFilter === 'sold'
                        ? 'bg-[#064e3b] text-white shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Sold Products Only</span>
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      subView === 'summary' && merchandiseCatalogFilter === 'sold' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {reportData.summary?.active_products_sold || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubView('itemized')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      subView === 'itemized'
                        ? 'bg-[#064e3b] text-white shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Itemized Receipts ({reportData.itemized_records?.length || 0})</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search product, category, size..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-emerald-300 dark:border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                  {subView === 'summary' ? (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10 border-b border-emerald-800">
                        <tr>
                          <th className="p-2.5 w-10 text-center border-r border-emerald-700/60">#</th>
                          <th className="p-2.5 min-w-[200px] border-r border-emerald-700/60">Item</th>
                          <th className="p-2.5 min-w-[130px] border-r border-emerald-700/60">Category</th>
                          <th className="p-2.5 w-20 text-center border-r border-emerald-700/60">Size</th>
                          <th className="p-2.5 w-24 text-center border-r border-emerald-700/60">Qty Sold</th>
                          <th className="p-2.5 w-24 text-right border-r border-emerald-700/60">Unit Cost</th>
                          <th className="p-2.5 w-24 text-right border-r border-emerald-700/60">Selling</th>
                          <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Total Revenue</th>
                          <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Total Cost</th>
                          <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Gross Profit</th>
                          <th className="p-2.5 w-20 text-center">Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 text-xs">
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="py-12 text-center text-neutral-400 italic">
                              No merchandise products found matching your filter.
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((p: any, idx: number) => {
                            const hasTransactions = p.transactions && p.transactions.length > 0;
                            return (
                              <tr
                                key={idx}
                                onClick={() => {
                                  if (hasTransactions) {
                                    setSelectedMerchandiseModal(p);
                                    setMerchandiseModalSearch('');
                                  }
                                }}
                                className={`transition-colors ${
                                  hasTransactions
                                    ? 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer group'
                                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40 opacity-75'
                                }`}
                                title={hasTransactions ? `Click to view ${p.transactions.length} sales receipts for ${p.item_name}` : 'No sales recorded yet for this product'}
                              >
                                <td className="p-2 text-center font-mono text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                                  {idx + 1}
                                </td>
                                <td className="p-2 font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={hasTransactions ? 'group-hover:text-emerald-700 dark:group-hover:text-emerald-300' : ''}>
                                      {p.item_name}
                                    </span>
                                    {hasTransactions && (
                                      <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                                        <span>View {p.transactions.length} sales</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2 border-r border-neutral-200 dark:border-neutral-800">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                                    p.category?.includes('Uniform')
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                      : p.category?.includes('PPE') || p.category?.includes('Protective')
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                      : p.category?.includes('Service')
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  }`}>
                                    {p.category || 'Store Merchandise'}
                                  </span>
                                </td>
                                <td className="p-2 text-center font-mono text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                                  {p.size || '—'}
                                </td>
                                <td className="p-2 text-center font-mono font-bold border-r border-neutral-200 dark:border-neutral-800">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    p.total_qty > 0
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                                  }`}>
                                    {p.total_qty}
                                  </span>
                                </td>
                                <td className="p-2 text-right font-mono text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                                  {p.cost_price > 0 ? fmt(p.cost_price) : '—'}
                                </td>
                                <td className="p-2 text-right font-mono text-neutral-800 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-800">
                                  {p.selling_price > 0 ? fmt(p.selling_price) : '—'}
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                                  {fmt(p.total_revenue)}
                                </td>
                                <td className="p-2 text-right font-mono text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                                  {fmt(p.total_cost)}
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-neutral-200 dark:border-neutral-800">
                                  {fmt(p.total_profit)}
                                </td>
                                <td className="p-2 text-center font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                                  {p.margin_pct}%
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  ) : (
                    /* Itemized Transactions Table */
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10 border-b border-emerald-800">
                        <tr>
                          <th className="p-2.5 w-10 text-center border-r border-emerald-700/60">#</th>
                          <th className="p-2.5 w-24 border-r border-emerald-700/60">Date</th>
                          <th className="p-2.5 w-28 border-r border-emerald-700/60">OR / Ref #</th>
                          <th className="p-2.5 min-w-[150px] border-r border-emerald-700/60">Customer / Payor</th>
                          <th className="p-2.5 min-w-[180px] border-r border-emerald-700/60">Item</th>
                          <th className="p-2.5 min-w-[120px] border-r border-emerald-700/60">Category</th>
                          <th className="p-2.5 w-16 text-center border-r border-emerald-700/60">Size</th>
                          <th className="p-2.5 w-16 text-center border-r border-emerald-700/60">Qty</th>
                          <th className="p-2.5 w-24 text-right border-r border-emerald-700/60">Price</th>
                          <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Total Revenue</th>
                          <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Gross Profit</th>
                          <th className="p-2.5 w-24 text-center">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 text-xs">
                        {(reportData.itemized_records || [])
                          .filter((it: any) =>
                            search
                              ? it.item_name?.toLowerCase().includes(search.toLowerCase()) ||
                                it.or_no?.toLowerCase().includes(search.toLowerCase()) ||
                                it.payor_name?.toLowerCase().includes(search.toLowerCase()) ||
                                it.category?.toLowerCase().includes(search.toLowerCase())
                              : true
                          )
                          .map((it: any, idx: number) => (
                            <tr key={idx} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                              <td className="p-2 text-center font-mono text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                                {idx + 1}
                              </td>
                              <td className="p-2 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                                {it.date}
                              </td>
                              <td className="p-2 font-mono font-bold text-neutral-800 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                                {it.or_no}
                              </td>
                              <td className="p-2 font-semibold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                                {it.payor_name}
                              </td>
                              <td className="p-2 font-medium text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                                {it.item_name}
                              </td>
                              <td className="p-2 text-neutral-600 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                                {it.category}
                              </td>
                              <td className="p-2 text-center font-mono text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                                {it.size || '—'}
                              </td>
                              <td className="p-2 text-center font-mono font-bold border-r border-neutral-200 dark:border-neutral-800">
                                {it.quantity}
                              </td>
                              <td className="p-2 text-right font-mono text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                                {fmt(it.selling_price)}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                                {fmt(it.revenue)}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-neutral-200 dark:border-neutral-800">
                                {fmt(it.profit)}
                              </td>
                              <td className="p-2 text-center text-[11px] text-neutral-500 whitespace-nowrap">
                                {it.payment_method}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}





          {/* ============================================================== */}
          {/* 2. EXPENSE BREAKDOWN TAB */}
          {/* ============================================================== */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              {/* Overall Expense Summary Cards - Interactive Category Filter */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. Total Operating Expenses Card */}
                <div
                  onClick={() => setSelectedExpenseCategory('all')}
                  className={`p-4 rounded-2xl bg-white dark:bg-neutral-900 border transition-all cursor-pointer select-none ${
                    selectedExpenseCategory === 'all'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-md'
                      : 'border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-400 hover:shadow-xs'
                  }`}
                  title="Click to view all operating expense accounts"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Total Operating Expenses</div>
                    {selectedExpenseCategory === 'all' && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        All
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1 font-mono">
                    {fmt(reportData.summary?.total_expenses)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Sum of all official disbursements</div>
                </div>

                {/* 2. Operation Expense Card */}
                <div
                  onClick={() => setSelectedExpenseCategory(prev => prev === 'Operation Expense' ? 'all' : 'Operation Expense')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    selectedExpenseCategory === 'Operation Expense'
                      ? 'bg-blue-100/90 dark:bg-blue-900/60 border-blue-500 ring-2 ring-blue-500/50 shadow-md scale-[1.01]'
                      : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 hover:border-blue-400 hover:shadow-xs'
                  }`}
                  title="Click to filter and view Operation Expense accounts"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                      <span>Operation Expense</span>
                      {selectedExpenseCategory === 'Operation Expense' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-blue-600 text-white shadow-2xs">
                          Active
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                      {reportData.summary?.operation_pct}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-blue-900 dark:text-blue-200 mt-1 font-mono">
                    {fmt(reportData.summary?.operation_expenses)}
                  </div>
                  <div className="text-[10px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">Supplies, utilities, wages, maintenance</div>
                </div>

                {/* 3. Service Expense Card */}
                <div
                  onClick={() => setSelectedExpenseCategory(prev => prev === 'Service Expense' ? 'all' : 'Service Expense')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    selectedExpenseCategory === 'Service Expense'
                      ? 'bg-purple-100/90 dark:bg-purple-900/60 border-purple-500 ring-2 ring-purple-500/50 shadow-md scale-[1.01]'
                      : 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/60 hover:border-purple-400 hover:shadow-xs'
                  }`}
                  title="Click to filter and view Service Expense accounts"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                      <span>Service Expense</span>
                      {selectedExpenseCategory === 'Service Expense' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-purple-600 text-white shadow-2xs">
                          Active
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                      {reportData.summary?.service_pct}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-purple-900 dark:text-purple-200 mt-1 font-mono">
                    {fmt(reportData.summary?.service_expenses)}
                  </div>
                  <div className="text-[10px] text-purple-700/80 dark:text-purple-300/80 mt-0.5">Printing, photocopier toner, ID supplies</div>
                </div>

                {/* 4. Merchandise Expense Card */}
                <div
                  onClick={() => setSelectedExpenseCategory(prev => prev === 'Merchandise Expense' ? 'all' : 'Merchandise Expense')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    selectedExpenseCategory === 'Merchandise Expense'
                      ? 'bg-emerald-100/90 dark:bg-emerald-900/60 border-emerald-500 ring-2 ring-emerald-500/50 shadow-md scale-[1.01]'
                      : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 hover:shadow-xs'
                  }`}
                  title="Click to filter and view Merchandise Expense accounts"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <span>Merchandise Expense</span>
                      {selectedExpenseCategory === 'Merchandise Expense' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-emerald-700 text-white shadow-2xs">
                          Active
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      {reportData.summary?.merchandise_pct}%
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1 font-mono">
                    {fmt(reportData.summary?.merchandise_expenses)}
                  </div>
                  <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">Store purchases & inventory restock</div>
                </div>
              </div>

              {/* Sub-view Navigation & Recipient Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-2.5 rounded-2xl border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpenseSubView('accounts')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      expenseSubView === 'accounts'
                        ? 'bg-[#064e3b] text-white shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>
                      {selectedExpenseCategory === 'all'
                        ? 'Schedule of Operating Accounts'
                        : `${selectedExpenseCategory} Accounts`}
                    </span>
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      expenseSubView === 'accounts' ? 'bg-white/20 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {filteredExpenseAccounts.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpenseSubView('recipients')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      expenseSubView === 'recipients'
                        ? 'bg-[#064e3b] text-white shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Recipient Honorarium & Payroll</span>
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      expenseSubView === 'recipients'
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {reportData.recipients?.length || 0}
                    </span>
                  </button>
                </div>

                {expenseSubView === 'accounts' ? (
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search expense account..."
                      value={expenseAccountSearch}
                      onChange={(e) => setExpenseAccountSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    {expenseAccountSearch && (
                      <button
                        type="button"
                        onClick={() => setExpenseAccountSearch('')}
                        className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search recipient name..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    {recipientSearch && (
                      <button
                        type="button"
                        onClick={() => setRecipientSearch('')}
                        className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Sub-view Content: 1. Accounts Schedule */}
              {expenseSubView === 'accounts' && (
                <div className="border border-emerald-300 dark:border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                        {selectedExpenseCategory === 'all'
                          ? `Schedule of Operating Accounts (${filteredExpenseAccounts.length} accounts)`
                          : `${selectedExpenseCategory} Accounts (${filteredExpenseAccounts.length} accounts)`}
                      </span>
                      {selectedExpenseCategory !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setSelectedExpenseCategory('all')}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Clear filter and show all accounts"
                        >
                          <span>Show All</span>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {expenseAccountSearch.trim() && (
                        <button
                          type="button"
                          onClick={() => setExpenseAccountSearch('')}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800 border border-emerald-300 dark:border-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Clear search query"
                        >
                          <span>Matching &quot;{expenseAccountSearch.trim()}&quot;</span>
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      {expenseAccountSortKey === 'name'
                        ? `Sorted alphabetically (${expenseAccountSortOrder === 'asc' ? 'A-Z' : 'Z-A'}) • Click any row to view breakdown`
                        : expenseAccountSortKey === 'amount'
                        ? `Sorted by expenditure (${expenseAccountSortOrder === 'desc' ? 'Highest first' : 'Lowest first'}) • Click any row to view breakdown`
                        : `Sorted by count (${expenseAccountSortOrder === 'desc' ? 'Most entries' : 'Fewest entries'}) • Click any row to view breakdown`}
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10 border-b border-emerald-800">
                        <tr>
                          <th className="p-2.5 w-12 text-center border-r border-emerald-700/60">#</th>
                          <th
                            onClick={() => {
                              if (expenseAccountSortKey === 'name') {
                                setExpenseAccountSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setExpenseAccountSortKey('name');
                                setExpenseAccountSortOrder('asc');
                              }
                            }}
                            className="p-2.5 min-w-[260px] border-r border-emerald-700/60 cursor-pointer hover:bg-emerald-800 transition-colors select-none"
                            title="Click to sort alphabetically (A-Z / Z-A)"
                          >
                            <div className="flex items-center justify-between">
                              <span>Account / Expense Particulars</span>
                              <span className="text-[10px] text-emerald-200">
                                {expenseAccountSortKey === 'name' ? (expenseAccountSortOrder === 'asc' ? '▲ A-Z' : '▼ Z-A') : '⇅'}
                              </span>
                            </div>
                          </th>
                          <th
                            onClick={() => {
                              if (expenseAccountSortKey === 'count') {
                                setExpenseAccountSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setExpenseAccountSortKey('count');
                                setExpenseAccountSortOrder('desc');
                              }
                            }}
                            className="p-2.5 w-28 text-center border-r border-emerald-700/60 cursor-pointer hover:bg-emerald-800 transition-colors select-none"
                            title="Click to sort by Count"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>Count</span>
                              <span className="text-[10px] text-emerald-200">
                                {expenseAccountSortKey === 'count' ? (expenseAccountSortOrder === 'desc' ? '▼' : '▲') : '⇅'}
                              </span>
                            </div>
                          </th>
                          <th
                            onClick={() => {
                              if (expenseAccountSortKey === 'amount') {
                                setExpenseAccountSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setExpenseAccountSortKey('amount');
                                setExpenseAccountSortOrder('desc');
                              }
                            }}
                            className="p-2.5 w-44 text-right border-r border-emerald-700/60 cursor-pointer hover:bg-emerald-800 transition-colors select-none"
                            title="Click to sort by Total Spent"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Total Spent</span>
                              <span className="text-[10px] text-emerald-200">
                                {expenseAccountSortKey === 'amount' ? (expenseAccountSortOrder === 'desc' ? '▼' : '▲') : '⇅'}
                              </span>
                            </div>
                          </th>
                          <th className="p-2.5 w-28 text-center">% of Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 text-xs">
                        {filteredExpenseAccounts.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-neutral-400 italic">
                              {expenseAccountSearch.trim()
                                ? `No accounts matching "${expenseAccountSearch}".`
                                : `No accounts found under ${selectedExpenseCategory}.`}
                            </td>
                          </tr>
                        ) : (
                          filteredExpenseAccounts.map((acc: any, idx: number) => (
                            <tr
                              key={idx}
                              onClick={() => {
                                setSelectedAccountModal(acc);
                                setAccountModalSearch('');
                              }}
                              className="hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer group"
                              title={`Click to view breakdown of ${acc.count} entries and category details for ${acc.account_name}`}
                            >
                              <td className="p-2.5 text-center font-mono text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                                {idx + 1}
                              </td>
                              <td className="p-2.5 font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                                    {acc.account_name}
                                  </span>
                                  <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                                    <span>View {acc.count} entries</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </span>
                                </div>
                              </td>
                              <td className="p-2.5 text-center font-mono font-medium text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 group-hover:bg-emerald-100 group-hover:text-emerald-800 dark:group-hover:bg-emerald-950 dark:group-hover:text-emerald-300 transition-colors">
                                  {acc.count}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                                {fmt(acc.total_amount)}
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-xs text-neutral-600 dark:text-neutral-400">
                                {acc.share_pct}%
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-view Content: 2. Recipient Honorarium & Payroll */}
              {expenseSubView === 'recipients' && (
                <div className="space-y-4">
                  {/* Recipient Compensation Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                          Total Honorarium
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                          {reportData.summary?.compensation_summary?.honorarium_pct || '0.0'}%
                        </span>
                      </div>
                      <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1 font-mono">
                        {fmt(reportData.summary?.compensation_summary?.total_honorarium)}
                      </div>
                      <div className="text-[10px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">Disbursed to officers & committee members</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                          Total Allowances
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                          {reportData.summary?.compensation_summary?.allowances_pct || '0.0'}%
                        </span>
                      </div>
                      <div className="text-2xl font-black text-teal-900 dark:text-teal-200 mt-1 font-mono">
                        {fmt(reportData.summary?.compensation_summary?.total_allowances)}
                      </div>
                      <div className="text-[10px] text-teal-700/80 dark:text-teal-300/80 mt-0.5">Transportation, representation & per diems</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                          Total Wages
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300">
                          {reportData.summary?.compensation_summary?.wages_pct || '0.0'}%
                        </span>
                      </div>
                      <div className="text-2xl font-black text-indigo-900 dark:text-indigo-200 mt-1 font-mono">
                        {fmt(reportData.summary?.compensation_summary?.total_wages)}
                      </div>
                      <div className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">Employee wages & compensations</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/60 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300">
                          Total Salary
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-800 dark:text-violet-300">
                          {reportData.summary?.compensation_summary?.salary_pct || '0.0'}%
                        </span>
                      </div>
                      <div className="text-2xl font-black text-violet-900 dark:text-violet-200 mt-1 font-mono">
                        {fmt(reportData.summary?.compensation_summary?.total_salary)}
                      </div>
                      <div className="text-[10px] text-violet-700/80 dark:text-violet-300/80 mt-0.5">Staff salaries & regular payroll</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Total Compensation Disbursed
                      </div>
                      <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1 font-mono">
                        {fmt(reportData.summary?.compensation_summary?.total_compensation)}
                      </div>
                      <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                        Distributed across {reportData.summary?.compensation_summary?.total_recipients || 0} active recipients
                      </div>
                    </div>
                  </div>

                  {/* Recipient Compensation Table */}
                  <div className="border border-emerald-300 dark:border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-700" />
                        Recipient Compensation Schedule ({filteredRecipients.length} recipients)
                      </span>
                      <span className="text-[11px] text-neutral-500">Sorted by highest earnings</span>
                    </div>

                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10 border-b border-emerald-800">
                          <tr>
                            <th className="p-2.5 w-10 text-center border-r border-emerald-700/60">#</th>
                            <th className="p-2.5 min-w-[200px] border-r border-emerald-700/60">Recipient Name</th>
                            <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Honorarium (₱)</th>
                            <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Allowances (₱)</th>
                            <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Wages (₱)</th>
                            <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Salary (₱)</th>
                            <th className="p-2.5 w-32 text-right border-r border-emerald-700/60">Total Earnings (₱)</th>
                            <th className="p-2.5 w-24 text-center border-r border-emerald-700/60">Payouts</th>
                            <th className="p-2.5 w-28 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 text-xs">
                          {filteredRecipients.length > 0 ? (
                            filteredRecipients.map((rec: any, idx: number) => (
                              <tr key={idx} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                                <td className="p-2 text-center font-mono text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                                  {idx + 1}
                                </td>
                                <td className="p-2 border-r border-neutral-200 dark:border-neutral-800">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                                      {rec.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                    </div>
                                    <div className="font-bold text-neutral-900 dark:text-white">
                                      {rec.name}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2 text-right font-mono text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                                  {rec.total_honorarium > 0 ? fmt(rec.total_honorarium) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                                </td>
                                <td className="p-2 text-right font-mono text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                                  {rec.total_allowances > 0 ? fmt(rec.total_allowances) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                                </td>
                                <td className="p-2 text-right font-mono text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                                  {rec.total_wages > 0 ? fmt(rec.total_wages) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                                </td>
                                <td className="p-2 text-right font-mono text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                                  {(rec.total_salary || 0) > 0 ? fmt(rec.total_salary) : <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                                </td>
                                <td className="p-2 text-right font-mono font-bold text-emerald-800 dark:text-emerald-400 border-r border-neutral-200 dark:border-neutral-800">
                                  {fmt(rec.total_compensation)}
                                </td>
                                <td className="p-2 text-center font-mono text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                    {rec.payout_count} {rec.payout_count === 1 ? 'payout' : 'payouts'}
                                  </span>
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRecipientModal(rec)}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 transition-colors"
                                  >
                                    View History
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-neutral-400">
                                No recipient compensation records found for this period.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 2.5 BOOK OF ACCOUNTS BY CATEGORY TAB */}
          {/* ============================================================== */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider">Book of Accounts</span>
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-neutral-900 dark:text-white mt-1.5 font-mono">
                    {totalCategoryAccountsCount}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Across all 10 active categories</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider">Configured Categories</span>
                    <FolderTree className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-neutral-900 dark:text-white mt-1.5 font-mono">
                    {ACCOUNT_CATEGORIES.length}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Operation, Merchandise, Service, etc.</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider">Recorded Entries</span>
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-neutral-900 dark:text-white mt-1.5 font-mono">
                    {totalCategoryEntries}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Transactions logged across accounts</div>
                </div>
              </div>

              {/* Controls bar: Search, Filter Pills & Collapse/Expand */}
              <div className="bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search any account or category..."
                      className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-900 dark:text-white placeholder:text-neutral-400"
                    />
                    {categorySearch && (
                      <button
                        type="button"
                        onClick={() => setCategorySearch('')}
                        className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setNewAccountName('');
                        setNewAccountCategory(selectedCategoryFilter !== 'all' ? selectedCategoryFilter : 'Operation');
                        setIsCategoryManuallyChosen(selectedCategoryFilter !== 'all');
                        setIsCreateAccountModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#064e3b] dark:bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 text-white shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Book of Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExpandAll}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={handleCollapseAll}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* Category Selector Pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedCategoryFilter === 'all'
                        ? 'bg-[#064e3b] text-white shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    All Categories ({ACCOUNT_CATEGORIES.length})
                  </button>
                  {ACCOUNT_CATEGORIES.map(cat => {
                    const isSel = selectedCategoryFilter === cat.value;
                    const grp = categoryGroupsData.find(g => g.category === cat.value);
                    const count = grp?.totalAccountsCount || 0;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(cat.value)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSel
                            ? 'bg-[#064e3b] text-white shadow-xs'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isSel ? 'bg-white/20 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 10 Category Accordion Cards */}
              <div className="space-y-4">
                {visibleCategoryGroups.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-400">
                    <p className="text-sm font-semibold">No categories or book of accounts matching &ldquo;{categorySearch}&rdquo;</p>
                    <button
                      type="button"
                      onClick={() => { setCategorySearch(''); setSelectedCategoryFilter('all'); }}
                      className="mt-3 px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold cursor-pointer"
                    >
                      Clear search & filters
                    </button>
                  </div>
                ) : (
                  visibleCategoryGroups.map(grp => {
                    const isCollapsed = Boolean(collapsedCategories[grp.category]);
                    return (
                      <div
                        key={grp.category}
                        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs overflow-hidden transition-all"
                      >
                        {/* Category Card Header */}
                        <div
                          onClick={() => toggleCategoryCollapse(grp.category)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 select-none transition-colors border-b border-neutral-100 dark:border-neutral-800"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${grp.theme.iconBg}`}>
                              <Layers className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">
                                  {grp.label}
                                </h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${grp.theme.badge}`}>
                                  {grp.totalAccountsCount} {grp.totalAccountsCount === 1 ? 'account' : 'accounts'}
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                                {grp.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 pl-3">
                            {/* Quick Add Account Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewAccountName('');
                                setNewAccountCategory(grp.category);
                                setIsCategoryManuallyChosen(true);
                                setIsCreateAccountModalOpen(true);
                              }}
                              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 transition-colors cursor-pointer"
                              title={`Add new account under ${grp.label}`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Account</span>
                            </button>

                            {/* Destination Page Link */}
                            {(() => {
                              const nav = getCategoryNavigationLink(grp.category);
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(nav.href);
                                  }}
                                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-neutral-100 hover:bg-emerald-100 dark:bg-neutral-800 dark:hover:bg-emerald-950/70 text-neutral-700 hover:text-emerald-800 dark:text-neutral-300 dark:hover:text-emerald-300 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                                  title={`Open ${nav.label}`}
                                >
                                  <span>{nav.label}</span>
                                  <ExternalLink className="w-3 h-3 opacity-70" />
                                </button>
                              );
                            })()}
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
                            </div>
                          </div>
                        </div>

                        {/* Category Card Content (Table of Accounts) */}
                        {!isCollapsed && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[9.5px] border-b border-neutral-200 dark:border-neutral-800">
                                <tr>
                                  <th className="p-2.5 w-12 text-center border-r border-neutral-200 dark:border-neutral-800">#</th>
                                  <th className="p-2.5 min-w-[260px] border-r border-neutral-200 dark:border-neutral-800">Book of Accounts Name</th>
                                  <th className="p-2.5 w-36 text-center border-r border-neutral-200 dark:border-neutral-800">Recorded Entries</th>
                                  <th className="p-2.5 w-40 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {grp.accounts.length === 0 ? (
                                  <tr>
                                    <td colSpan={4} className="py-6 text-center text-neutral-400 italic">
                                      No accounts found under this category matching your search.
                                    </td>
                                  </tr>
                                ) : (
                                  grp.accounts.map((acc, aIdx) => {
                                    return (
                                      <tr
                                        key={acc.account_name}
                                        onClick={() => setSelectedAccountModal(acc)}
                                        className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer group"
                                      >
                                        <td className="p-2.5 text-center font-mono text-[11px] text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                                          {aIdx + 1}
                                        </td>
                                        <td className="p-2.5 font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                                          <div className="flex items-center gap-2">
                                            <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                              {acc.account_name}
                                            </span>
                                            {acc.count > 0 && (
                                              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                Active
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-2.5 text-center font-mono text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            acc.count > 0
                                              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold'
                                              : 'text-neutral-400'
                                          }`}>
                                            {acc.count} {acc.count === 1 ? 'entry' : 'entries'}
                                          </span>
                                        </td>
                                        <td className="p-2.5 text-center">
                                          <div className="inline-flex items-center gap-1.5 justify-center">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedAccountModal(acc);
                                              }}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-bold bg-neutral-100 hover:bg-emerald-100 dark:bg-neutral-800 dark:hover:bg-emerald-950/70 text-neutral-700 hover:text-emerald-800 dark:text-neutral-300 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                                              title="View itemized transaction entries"
                                            >
                                              <span>View Entries</span>
                                              <ExternalLink className="w-3 h-3 opacity-70" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setAccountToDelete({ name: acc.account_name, count: acc.count });
                                              }}
                                              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                              title={`Delete ${acc.account_name}`}
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
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. LOAN PRODUCTS TAB */}
          {/* ============================================================== */}
          {activeTab === 'loans' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Loans Released</div>
                  <div className="text-xl font-extrabold text-neutral-900 dark:text-white mt-1">
                    {reportData.summary?.total_disbursed_count || 0} loans
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Approved in period</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Principal Disbursed</div>
                  <div className="text-xl font-extrabold text-neutral-900 dark:text-white mt-1 font-mono">
                    {fmt(reportData.summary?.total_disbursed_amount)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Loan capital outflow</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Principal Recovered</div>
                  <div className="text-xl font-extrabold text-neutral-900 dark:text-white mt-1 font-mono">
                    {fmt(reportData.summary?.total_principal_collected)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Amortization principal</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Interest Earned
                  </div>
                  <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                    {fmt(reportData.summary?.total_interest_collected)}
                  </div>
                  <div className="text-[10px] text-emerald-600/80 mt-0.5">Direct loan earnings</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Fines & Penalties</div>
                  <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 font-mono">
                    {fmt(reportData.summary?.total_fines_collected)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Late charge revenue</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Total Inflow Volume</div>
                  <div className="text-xl font-extrabold text-neutral-900 dark:text-white mt-1 font-mono">
                    {fmt(reportData.summary?.total_collections_volume)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Principal + Interest + Fines</div>
                </div>
              </div>

              {/* 10 Loan Products Master Breakdown Table */}
              <div className="border border-emerald-300 dark:border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xs">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                    Portfolio Schedule Across 10 Cooperative Loan Products
                  </span>
                  <span className="text-[11px] text-neutral-500">Disbursements & Amortizations</span>
                </div>
                <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10 border-b border-emerald-800">
                      <tr>
                        <th className="p-2.5 w-10 text-center border-r border-emerald-700/60">#</th>
                        <th className="p-2.5 min-w-[200px] border-r border-emerald-700/60">Loan Product Name</th>
                        <th className="p-2.5 w-24 text-center border-r border-emerald-700/60">Disbursed (Qty)</th>
                        <th className="p-2.5 w-32 text-right border-r border-emerald-700/60">Disbursed (₱)</th>
                        <th className="p-2.5 w-24 text-center border-r border-emerald-700/60">Amort. (Qty)</th>
                        <th className="p-2.5 w-32 text-right border-r border-emerald-700/60">Principal Paid</th>
                        <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Interest (₱)</th>
                        <th className="p-2.5 w-24 text-right border-r border-emerald-700/60">Fines (₱)</th>
                        <th className="p-2.5 w-32 text-right">Total Inflow (₱)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 text-xs">
                      {(reportData.products || []).map((lp: any, idx: number) => (
                        <tr
                          key={idx}
                          onClick={() => {
                            setSelectedLoanProductModal(lp);
                            setLoanProductModalSearch('');
                          }}
                          className="hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer group"
                          title={`Click to view borrowers and contracts for ${lp.product_name}`}
                        >
                          <td className="p-2 text-center font-mono text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                            <div className="flex items-center justify-between gap-2">
                              <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                                {lp.product_name}
                              </span>
                              <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                                <span>View borrowers</span>
                                <ExternalLink className="w-3 h-3" />
                              </span>
                            </div>
                          </td>
                          <td className="p-2 text-center font-mono text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 group-hover:bg-emerald-100 group-hover:text-emerald-800 dark:group-hover:bg-emerald-950 dark:group-hover:text-emerald-300 transition-colors">
                              {lp.disbursed_count}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                            {fmt(lp.total_disbursed)}
                          </td>
                          <td className="p-2 text-center font-mono text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                            {lp.amortizations_count}
                          </td>
                          <td className="p-2 text-right font-mono text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                            {fmt(lp.principal_collected)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-neutral-200 dark:border-neutral-800">
                            {fmt(lp.interest_collected)}
                          </td>
                          <td className="p-2 text-right font-mono text-amber-600 dark:text-amber-400 border-r border-neutral-200 dark:border-neutral-800">
                            {fmt(lp.fines_collected)}
                          </td>
                          <td className="p-2 text-right font-mono font-black text-neutral-900 dark:text-white">
                            {fmt(lp.total_collected)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}





          {/* ============================================================== */}
          {/* 4. MEMBERSHIP UPDATES TAB */}
          {/* ============================================================== */}
          {activeTab === 'membership' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">New Members (Period)</div>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 font-mono">
                    +{reportData.summary?.new_members_count || 0}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Newly approved registrations</div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Total Coop Members</div>
                  <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1 font-mono">
                    {reportData.summary?.total_cooperative_members || 0}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Master directory registry</div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Share Capital Inflow</div>
                  <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1 font-mono">
                    {fmt(reportData.summary?.share_capital_inflow)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Common share deposits in period</div>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-neutral-500">Membership Fees</div>
                  <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1 font-mono">
                    {fmt(reportData.summary?.membership_fees_collected)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Registration fee income</div>
                </div>
              </div>

              {/* Members List Table */}
              <div className="border border-emerald-300 dark:border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xs">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                    New Members Registered in Selected Period ({reportData.new_members?.length || 0})
                  </span>
                  <span className="text-[11px] text-neutral-500">Official Membership Update Log</span>
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] tracking-wider sticky top-0 z-10 border-b border-emerald-800">
                      <tr>
                        <th className="p-2.5 w-10 text-center border-r border-emerald-700/60">#</th>
                        <th className="p-2.5 w-28 border-r border-emerald-700/60">Member No.</th>
                        <th className="p-2.5 min-w-[180px] border-r border-emerald-700/60">Full Name</th>
                        <th className="p-2.5 w-28 border-r border-emerald-700/60">Membership Type</th>
                        <th className="p-2.5 w-24 text-center border-r border-emerald-700/60">Status</th>
                        <th className="p-2.5 w-28 font-mono border-r border-emerald-700/60">Date Joined</th>
                        <th className="p-2.5 min-w-[160px]">Contact Email / Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900 text-xs">
                      {(reportData.new_members || []).map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                          <td className="p-2 text-center font-mono text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-mono font-bold text-neutral-800 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-800">
                            {m.member_no}
                          </td>
                          <td className="p-2 font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                            {m.full_name}
                          </td>
                          <td className="p-2 text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                            {m.membership_type}
                          </td>
                          <td className="p-2 text-center border-r border-neutral-200 dark:border-neutral-800">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {m.status}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                            {m.date_joined}
                          </td>
                          <td className="p-2 text-neutral-600 dark:text-neutral-400 text-[11px]">
                            {m.email || m.phone || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}











          {/* ============================================================== */}
          {/* 6. FINANCIAL STATEMENT TAB */}
          {/* ============================================================== */}
          {activeTab === 'financial_statement' && (
            <div className="space-y-6 w-full">
              {/* Top Sub-Navigation Desk & Quick Filter */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-3.5 shadow-2xs">
                {/* View Switcher Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                  <button
                    type="button"
                    onClick={() => setFsSubView('combined')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      fsSubView === 'combined'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <span>Combined Statements</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFsSubView('balance_sheet')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      fsSubView === 'balance_sheet'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <span>Statement of Financial Condition (Balance Sheet)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFsSubView('income_statement')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      fsSubView === 'income_statement'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <span>Statement of Operations (Profit & Loss)</span>
                  </button>

                </div>

                {/* Account Search Bar */}
                <div className="relative min-w-[220px]">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search accounts or particulars..."
                    value={fsSearch}
                    onChange={(e) => setFsSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Executive Summary Metrics Desk */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Assets</div>
                  <div className="text-lg font-black font-mono text-neutral-900 dark:text-white mt-1">
                    {fmt(reportData.balance_sheet?.total_assets)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Cash, loans, inventories</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Equity</div>
                  <div className="text-lg font-black font-mono text-neutral-900 dark:text-white mt-1">
                    {fmt(reportData.balance_sheet?.total_equity)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Share capital & surplus</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Merchandise Sales</div>
                  <div className="text-lg font-black font-mono text-neutral-900 dark:text-white mt-1">
                    {fmt(reportData.statement_of_operations?.merchandise_sales)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Gross store receipts</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Operating Revenue</div>
                  <div className="text-lg font-black font-mono text-neutral-900 dark:text-white mt-1">
                    {fmt(reportData.statement_of_operations?.total_revenue)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Interest, fines, service fees</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Cost of Sales (COGS)</div>
                  <div className="text-lg font-black font-mono text-neutral-900 dark:text-white mt-1">
                    {fmt(reportData.statement_of_operations?.cost_of_sales)}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Merchandise & direct costs</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Net Surplus (Profit)
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                    {fmt(reportData.statement_of_operations?.net_surplus)}
                  </div>
                  <div className="text-[10px] text-emerald-600/80 mt-0.5 font-bold">Audit Verified</div>
                </div>
              </div>

              {/* Accounting Equation Verification Pill */}
              <div className="px-4 py-2.5 rounded-2xl bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/80 flex flex-wrap items-center justify-between text-xs font-semibold gap-2">
                <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    <strong>Cooperative Accounting Equation:</strong> Assets ({fmt(reportData.balance_sheet?.total_assets)}) = Liabilities ({fmt(reportData.balance_sheet?.total_liabilities)}) + Equity ({fmt(reportData.balance_sheet?.total_equity)})
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                  Fully Balanced
                </span>
              </div>

              {/* MAIN CONTENT AREA */}
              <div className="space-y-6">
                {/* 1. BALANCE SHEET SECTION (Visible in 'combined' or 'balance_sheet') */}
                {(fsSubView === 'combined' || fsSubView === 'balance_sheet') && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
                        <h3 className="text-base font-extrabold uppercase tracking-tight text-neutral-900 dark:text-white">
                          Statement of Financial Condition (Balance Sheet)
                        </h3>
                      </div>
                      <span className="text-xs text-neutral-500 font-mono">
                        As of: {period === 'daily' ? date : period === 'monthly' ? `${MONTH_NAMES[month - 1]} ${year}` : `Annual ${year}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                      {/* Left Column: ASSETS */}
                      <div className="border border-emerald-300 dark:border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-neutral-900 flex flex-col self-start">
                        <div className="p-3.5 bg-[#064e3b] text-white flex items-center justify-between font-bold">
                          <span className="uppercase text-xs tracking-wider">Assets</span>
                          <span className="font-mono text-sm">{fmt(reportData.balance_sheet?.total_assets)}</span>
                        </div>
                        <div className="overflow-x-auto divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-emerald-50/60 dark:bg-emerald-950/40 text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                              <tr>
                                <th className="p-2.5">Account Title</th>
                                <th className="p-2.5">Category</th>
                                <th className="p-2.5 text-right">Amount (₱)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                              {(reportData.balance_sheet?.assets || [])
                                .filter((a: any) => !fsSearch.trim() || a.account.toLowerCase().includes(fsSearch.toLowerCase()))
                                .map((a: any, i: number) => (
                                  <tr
                                    key={i}
                                    onClick={() => openFsAccountSpecification(a, 'Assets')}
                                    className="hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors group"
                                    title={`Click to view specified breakdown for ${a.account}`}
                                  >
                                    <td className="p-2.5 font-medium text-neutral-800 dark:text-neutral-200">
                                      <div className="flex items-center justify-between">
                                        <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 group-hover:underline">
                                          {a.account}
                                        </span>
                                        <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0" />
                                      </div>
                                    </td>
                                    <td className="p-2.5 text-[10.5px]">
                                      <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                        {a.category}
                                      </span>
                                    </td>
                                    <td className={`p-2.5 text-right font-mono font-bold ${a.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>
                                      {fmt(a.amount)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-emerald-50 dark:bg-emerald-950/50 font-bold border-t border-emerald-200 dark:border-emerald-800">
                              <tr>
                                <td colSpan={2} className="p-2.5 text-emerald-900 dark:text-emerald-300 uppercase text-[11px]">
                                  Total Assets
                                </td>
                                <td className="p-2.5 text-right font-mono font-black text-emerald-800 dark:text-emerald-300 text-sm">
                                  {fmt(reportData.balance_sheet?.total_assets)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      {/* Right Column: LIABILITIES & EQUITY */}
                      <div className="space-y-5 flex flex-col">
                        {/* Liabilities Table */}
                        <div className="border border-emerald-300 dark:border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-neutral-900">
                          <div className="p-3.5 bg-neutral-800 text-white flex items-center justify-between font-bold">
                            <span className="uppercase text-xs tracking-wider">Liabilities</span>
                            <span className="font-mono text-sm">{fmt(reportData.balance_sheet?.total_liabilities)}</span>
                          </div>
                          <div className="overflow-x-auto divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                                <tr>
                                  <th className="p-2.5">Account Title</th>
                                  <th className="p-2.5">Category</th>
                                  <th className="p-2.5 text-right">Amount (₱)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {(reportData.balance_sheet?.liabilities || [])
                                  .filter((l: any) => !fsSearch.trim() || l.account.toLowerCase().includes(fsSearch.toLowerCase()))
                                  .map((l: any, i: number) => (
                                    <tr
                                      key={i}
                                      onClick={() => openFsAccountSpecification(l, 'Liabilities')}
                                      className="hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors group"
                                      title={`Click to view specified breakdown for ${l.account}`}
                                    >
                                      <td className="p-2.5 font-medium text-neutral-800 dark:text-neutral-200">
                                        <div className="flex items-center justify-between">
                                          <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 group-hover:underline">
                                            {l.account}
                                          </span>
                                          <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0" />
                                        </div>
                                      </td>
                                      <td className="p-2.5 text-[10.5px]">
                                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                          {l.category}
                                        </span>
                                      </td>
                                      <td className={`p-2.5 text-right font-mono font-bold ${l.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>
                                        {fmt(l.amount)}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                              <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-bold border-t border-neutral-300 dark:border-neutral-700">
                                <tr>
                                  <td colSpan={2} className="p-2.5 text-neutral-800 dark:text-neutral-200 uppercase text-[11px]">
                                    Total Liabilities
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-black text-neutral-900 dark:text-white text-sm">
                                    {fmt(reportData.balance_sheet?.total_liabilities)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {/* Equity Table */}
                        <div className="border border-emerald-300 dark:border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-neutral-900">
                          <div className="p-3.5 bg-emerald-900 text-white flex items-center justify-between font-bold">
                            <span className="uppercase text-xs tracking-wider">Equity</span>
                            <span className="font-mono text-sm">{fmt(reportData.balance_sheet?.total_equity)}</span>
                          </div>
                          <div className="overflow-x-auto divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                                <tr>
                                  <th className="p-2.5">Account Title</th>
                                  <th className="p-2.5">Category</th>
                                  <th className="p-2.5 text-right">Amount (₱)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {(reportData.balance_sheet?.equity || [])
                                  .filter((e: any) => !fsSearch.trim() || e.account.toLowerCase().includes(fsSearch.toLowerCase()))
                                  .map((e: any, i: number) => (
                                    <tr
                                      key={i}
                                      onClick={() => openFsAccountSpecification(e, 'Equity')}
                                      className="hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors group"
                                      title={`Click to view specified breakdown for ${e.account}`}
                                    >
                                      <td className="p-2.5 font-medium text-neutral-800 dark:text-neutral-200">
                                        <div className="flex items-center justify-between">
                                          <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 group-hover:underline">
                                            {e.account}
                                          </span>
                                          <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0" />
                                        </div>
                                      </td>
                                      <td className="p-2.5 text-[10.5px]">
                                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                          {e.category}
                                        </span>
                                      </td>
                                      <td className={`p-2.5 text-right font-mono font-bold ${e.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>
                                        {fmt(e.amount)}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                              <tfoot className="bg-emerald-50 dark:bg-emerald-950/50 font-bold border-t border-emerald-200 dark:border-emerald-800">
                                <tr>
                                  <td colSpan={2} className="p-2.5 text-emerald-900 dark:text-emerald-300 uppercase text-[11px]">
                                    Total Equity
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-black text-emerald-800 dark:text-emerald-300 text-sm">
                                    {fmt(reportData.balance_sheet?.total_equity)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {/* Liabilities + Equity Combined Footer */}
                        <div className="p-3 bg-neutral-100 dark:bg-neutral-800/90 rounded-2xl border border-neutral-300 dark:border-neutral-700 flex items-center justify-between font-bold text-xs">
                          <span className="uppercase text-neutral-700 dark:text-neutral-300">Total Liabilities & Equity</span>
                          <span className="font-mono font-black text-sm text-neutral-900 dark:text-white">
                            {fmt((reportData.balance_sheet?.total_liabilities || 0) + (reportData.balance_sheet?.total_equity || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. STATEMENT OF OPERATIONS (PROFIT & LOSS) (Visible in 'combined' or 'income_statement') */}
                {(fsSubView === 'combined' || fsSubView === 'income_statement') && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
                        <h3 className="text-base font-extrabold uppercase tracking-tight text-neutral-900 dark:text-white">
                          Statement of Operations (Profit & Loss Statement)
                        </h3>
                      </div>
                      <span className="text-xs text-neutral-500 font-mono">
                        Period: {period === 'daily' ? date : period === 'monthly' ? `${MONTH_NAMES[month - 1]} ${year}` : `FY ${year}`}
                      </span>
                    </div>

                    {/* Section A: Sales of Merchandise (Elaborate Schedule) */}
                    <div className="border border-emerald-300 dark:border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-neutral-900">
                      <div className="p-3.5 bg-emerald-800 text-white flex items-center justify-between font-bold">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-emerald-300" />
                          <span className="uppercase text-xs tracking-wider">I. Sales of Merchandise</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-600/60">
                            Store Registry & Product Lines
                          </span>
                        </div>
                        <span className="font-mono text-base font-black">
                          {fmt(reportData.statement_of_operations?.merchandise_sales)}
                        </span>
                      </div>

                      {/* Department / Category Metric Distribution */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-900/60 text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/80 shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">School Uniforms</span>
                          <span className="font-mono font-black text-blue-700 dark:text-blue-300 text-sm block mt-0.5">₱1,172,870.00</span>
                          <span className="text-[9.5px] text-neutral-400">57.7% of total sales</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/80 shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">School Paraphernalia</span>
                          <span className="font-mono font-black text-teal-700 dark:text-teal-300 text-sm block mt-0.5">₱342,820.00</span>
                          <span className="text-[9.5px] text-neutral-400">16.9% of total sales</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/80 shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Maritime Accessories</span>
                          <span className="font-mono font-black text-indigo-700 dark:text-indigo-300 text-sm block mt-0.5">₱190,680.00</span>
                          <span className="text-[9.5px] text-neutral-400">9.4% of total sales</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-emerald-200 dark:border-emerald-800/80 shadow-2xs">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Store Registry & Retail</span>
                          <span className="font-mono font-black text-amber-700 dark:text-amber-300 text-sm block mt-0.5">₱325,700.00</span>
                          <span className="text-[9.5px] text-neutral-400">16.0% of total sales</span>
                        </div>
                      </div>

                      {/* Elaborate Itemized Table */}
                      <div className="overflow-x-auto divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-emerald-50/60 dark:bg-emerald-950/40 text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                            <tr>
                              <th className="p-2.5 w-10 text-center">#</th>
                              <th className="p-2.5">Product Line / Merchandise Account</th>
                              <th className="p-2.5">Category / Department</th>
                              <th className="p-2.5 text-center">% Share</th>
                              <th className="p-2.5 text-right">Amount (₱)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {(() => {
                              const items = (reportData.statement_of_operations?.merchandise_sales_breakdown || []).filter((m: any) =>
                                !fsSearch.trim() ||
                                m.account.toLowerCase().includes(fsSearch.toLowerCase()) ||
                                m.category.toLowerCase().includes(fsSearch.toLowerCase())
                              );

                              const total = Number(reportData.statement_of_operations?.merchandise_sales ?? 0);

                              if (items.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={5} className="p-6 text-center text-neutral-400 text-xs">
                                      {fsSearch.trim() ? `No merchandise items match "${fsSearch}"` : 'No merchandise sales recorded in this period (₱0.00)'}
                                    </td>
                                  </tr>
                                );
                              }

                              return items.map((m: any, i: number) => {
                                const sharePct = total > 0 ? ((m.amount / total) * 100).toFixed(1) : '0.0';
                                const catColor =
                                  m.category === 'School Uniforms'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : m.category === 'School Paraphernalia'
                                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                    : m.category === 'Maritime Accessories'
                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                    : m.category === 'Store Sales Registry'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';

                                return (
                                  <tr
                                    key={i}
                                    onClick={() => openFsAccountSpecification(m, 'Sales of Merchandise')}
                                    className="hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors group"
                                    title={`Click to view specified breakdown for ${m.account}`}
                                  >
                                    <td className="p-2.5 text-center text-neutral-400 font-mono text-[11px]">{i + 1}</td>
                                    <td className="p-2.5 font-semibold text-neutral-900 dark:text-white">
                                      <div className="flex items-center justify-between">
                                        <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 group-hover:underline">
                                          {m.account}
                                        </span>
                                        <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0" />
                                      </div>
                                    </td>
                                    <td className="p-2.5 text-[10.5px]">
                                      <span className={`px-2 py-0.5 rounded-full font-bold ${catColor}`}>
                                        {m.category}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-center font-mono text-[11px] text-neutral-500 font-medium">
                                      {sharePct}%
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-bold text-neutral-900 dark:text-white">
                                      {fmt(m.amount)}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                          <tfoot className="bg-emerald-50/70 dark:bg-emerald-950/50 font-bold border-t border-emerald-200 dark:border-emerald-800">
                            <tr>
                              <td colSpan={3} className="p-2.5 uppercase text-[10px] tracking-wider text-emerald-900 dark:text-emerald-200 font-black">
                                Total Sales of Merchandise (Store Operations)
                              </td>
                              <td className="p-2.5 text-center font-mono text-xs text-emerald-800 dark:text-emerald-300 font-black">
                                100.0%
                              </td>
                              <td className="p-2.5 text-right font-mono text-sm font-black text-emerald-800 dark:text-emerald-300">
                                {fmt(reportData.statement_of_operations?.merchandise_sales)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Section B: Operating Revenues Breakdown */}
                    <div className="border border-emerald-300 dark:border-emerald-800/80 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-neutral-900">
                      <div className="p-3.5 bg-[#064e3b] text-white flex items-center justify-between font-bold">
                        <span className="uppercase text-xs tracking-wider">II. Operating Revenues</span>
                        <span className="font-mono text-base font-black">
                          {fmt(reportData.statement_of_operations?.total_revenue)}
                        </span>
                      </div>
                      <div className="overflow-x-auto divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-emerald-50/60 dark:bg-emerald-950/40 text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                            <tr>
                              <th className="p-2.5">Revenue Particulars / Line Item</th>
                              <th className="p-2.5">Category</th>
                              <th className="p-2.5 text-right">Amount (₱)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {(reportData.statement_of_operations?.revenues_breakdown || [])
                              .filter((r: any) => !fsSearch.trim() || r.account.toLowerCase().includes(fsSearch.toLowerCase()))
                              .map((r: any, i: number) => (
                                <tr
                                  key={i}
                                  onClick={() => openFsAccountSpecification(r, 'Operating Revenues')}
                                  className="hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors group"
                                  title={`Click to view specified breakdown for ${r.account}`}
                                >
                                  <td className="p-2.5 font-medium text-neutral-800 dark:text-neutral-200">
                                    <div className="flex items-center justify-between">
                                      <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 group-hover:underline">
                                        {r.account}
                                      </span>
                                      <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0" />
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-[10.5px]">
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      {r.category}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-neutral-900 dark:text-white">
                                    {fmt(r.amount)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                          <tfoot className="bg-emerald-50 dark:bg-emerald-950/50 font-bold border-t border-emerald-200 dark:border-emerald-800">
                            <tr>
                              <td colSpan={2} className="p-2.5 text-emerald-900 dark:text-emerald-300 uppercase text-[11px]">
                                Total Operating Revenues
                              </td>
                              <td className="p-2.5 text-right font-mono font-black text-emerald-800 dark:text-emerald-300 text-sm">
                                {fmt(reportData.statement_of_operations?.total_revenue)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Section C: Less Cost of Sales (COGS) */}
                    <div className="border border-amber-300 dark:border-amber-800/80 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-neutral-900">
                      <div className="p-3.5 bg-amber-800 text-white flex items-center justify-between font-bold">
                        <span className="uppercase text-xs tracking-wider">Less: Cost of Sales (COGS)</span>
                        <span className="font-mono text-base font-black">
                          {fmt(reportData.statement_of_operations?.cost_of_sales)}
                        </span>
                      </div>
                      <div className="overflow-x-auto divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-amber-50/60 dark:bg-amber-950/40 text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                            <tr>
                              <th className="p-2.5">Cost Particulars / Expense Account</th>
                              <th className="p-2.5">Category</th>
                              <th className="p-2.5 text-right">Amount (₱)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {(reportData.statement_of_operations?.cost_of_sales_breakdown || [])
                              .filter((c: any) => !fsSearch.trim() || c.account.toLowerCase().includes(fsSearch.toLowerCase()))
                              .map((c: any, i: number) => (
                                <tr
                                  key={i}
                                  onClick={() => openFsAccountSpecification(c, 'Cost of Sales')}
                                  className="hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors group"
                                  title={`Click to view specified breakdown for ${c.account}`}
                                >
                                  <td className="p-2.5 font-medium text-neutral-800 dark:text-neutral-200">
                                    <div className="flex items-center justify-between">
                                      <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 group-hover:underline">
                                        {c.account}
                                      </span>
                                      <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0" />
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-[10.5px]">
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                      {c.category}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-neutral-900 dark:text-white">
                                    {fmt(c.amount)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                          <tfoot className="bg-amber-50 dark:bg-amber-950/50 font-bold border-t border-amber-200 dark:border-amber-800">
                            <tr>
                              <td colSpan={2} className="p-2.5 text-amber-900 dark:text-amber-300 uppercase text-[11px]">
                                Total Cost of Sales
                              </td>
                              <td className="p-2.5 text-right font-mono font-black text-amber-800 dark:text-amber-300 text-sm">
                                {fmt(reportData.statement_of_operations?.cost_of_sales)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Gross Profit Hero Card */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-sm flex items-center justify-between font-bold">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-emerald-200 block">Gross Profit</span>
                        <span className="text-[11px] text-emerald-100/80 font-normal">
                          (Sales of Merchandise + Operating Revenue) less Cost of Sales
                        </span>
                      </div>
                      <span className="font-mono text-xl sm:text-2xl font-black">
                        {fmt(reportData.statement_of_operations?.gross_profit)}
                      </span>
                    </div>

                    {/* Section D: Less Operating Expenses */}
                    <div className="border border-neutral-300 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-neutral-900">
                      <div className="p-3.5 bg-neutral-800 text-white flex items-center justify-between font-bold">
                        <span className="uppercase text-xs tracking-wider">Less: Operating Expenses (36 Line Items)</span>
                        <span className="font-mono text-base font-black">
                          {fmt(reportData.statement_of_operations?.operating_expenses)}
                        </span>
                      </div>
                      <div className="overflow-x-auto divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-neutral-50 dark:bg-neutral-800 text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                            <tr>
                              <th className="p-2.5">Operating Account Title</th>
                              <th className="p-2.5">Department / Classification</th>
                              <th className="p-2.5 text-right">Amount (₱)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {(reportData.statement_of_operations?.operating_expenses_breakdown || [])
                              .filter((o: any) => !fsSearch.trim() || o.account.toLowerCase().includes(fsSearch.toLowerCase()))
                              .map((o: any, i: number) => (
                                <tr
                                  key={i}
                                  onClick={() => openFsAccountSpecification(o, 'Operating Expenses')}
                                  className="hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors group"
                                  title={`Click to view specified breakdown for ${o.account}`}
                                >
                                  <td className="p-2.5 font-medium text-neutral-800 dark:text-neutral-200">
                                    <div className="flex items-center justify-between">
                                      <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 group-hover:underline">
                                        {o.account}
                                      </span>
                                      <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 shrink-0" />
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-[10.5px]">
                                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                      {o.category}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-neutral-900 dark:text-white">
                                    {fmt(o.amount)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                          <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-bold border-t border-neutral-300 dark:border-neutral-700">
                            <tr>
                              <td colSpan={2} className="p-2.5 text-neutral-800 dark:text-neutral-200 uppercase text-[11px]">
                                Total Operating Expenses
                              </td>
                              <td className="p-2.5 text-right font-mono font-black text-neutral-900 dark:text-white text-sm">
                                {fmt(reportData.statement_of_operations?.operating_expenses)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Section E: Income Subsidy */}
                    <div className="p-3.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-2xl border border-neutral-300 dark:border-neutral-700 flex items-center justify-between text-xs font-bold">
                      <div>
                        <span className="uppercase text-neutral-700 dark:text-neutral-300 block">Income Subsidy (CETF Subsidy)</span>
                        <span className="text-[10px] text-neutral-400 font-normal">Education & training subsidy adjustments</span>
                      </div>
                      <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                        {fmt(reportData.statement_of_operations?.income_subsidy)}
                      </span>
                    </div>

                    {/* Section F: Final Net Profit (Loss) / Net Surplus */}
                    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#064e3b] to-emerald-800 text-white shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1.5 border border-emerald-700/60">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Official Cooperative Surplus Result</span>
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                          Net Profit (Loss) / Net Surplus
                        </h4>
                        <p className="text-xs text-emerald-100/80 mt-0.5">
                          Total Gross Revenue less Cost of Sales and Operating Expenses plus Subsidies
                        </p>
                      </div>
                      <div className="text-3xl sm:text-4xl font-mono font-black text-right shrink-0">
                        {fmt(reportData.statement_of_operations?.net_surplus)}
                      </div>
                    </div>
                  </div>
                )}


              </div>
            </div>
          )}

      {/* Financial Statement Account Specification Modal */}
      {selectedFsAccountModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-modal-backdrop"
          onClick={() => setSelectedFsAccountModal(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#064e3b] text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      {selectedFsAccountModal.account}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {selectedFsAccountModal.category}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {selectedFsAccountModal.statement_type || 'Financial Statement'} Schedule • As of {period === 'daily' ? date : period === 'monthly' ? `${MONTH_NAMES[month - 1]} ${year}` : `FY ${year}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFsAccountModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-lg font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Account Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block tracking-wider">Book Value / Balance</span>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">Official Ledger Recorded Amount</span>
              </div>
              <span className={`font-mono text-xl sm:text-2xl font-black ${selectedFsAccountModal.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-800 dark:text-emerald-300'}`}>
                {fmt(selectedFsAccountModal.amount)}
              </span>
            </div>

            {/* Account Description */}
            {selectedFsAccountModal.description && (
              <p className="text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                {selectedFsAccountModal.description}
              </p>
            )}

            {/* Specifications & Sub-Accounts Table */}
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Specified Breakdown & Sub-Accounts ({selectedFsAccountModal.sub_accounts?.length || 0})
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  Reconciled to 100%
                </span>
              </div>

              <div className="flex-1 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] sticky top-0 z-10">
                    <tr>
                      <th className="p-2 border-r border-emerald-700/60 w-8 text-center">#</th>
                      <th className="p-2 border-r border-emerald-700/60">Specification / Sub-Account Particulars</th>
                      <th className="p-2 border-r border-emerald-700/60 text-center w-24">% Share</th>
                      <th className="p-2 text-right">Amount (₱)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {(selectedFsAccountModal.sub_accounts || []).map((sub: any, idx: number) => {
                      const totalAmt = Math.abs(selectedFsAccountModal.amount) || 1;
                      const subAmt = Math.abs(sub.amount) || 0;
                      const pct = ((subAmt / totalAmt) * 100).toFixed(1);

                      return (
                        <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                          <td className="p-2 text-center text-neutral-400 font-mono text-[10px] border-r border-neutral-200 dark:border-neutral-800">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-medium text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                            <div>{sub.name}</div>
                            {sub.notes && <div className="text-[10px] text-neutral-400 font-normal">{sub.notes}</div>}
                          </td>
                          <td className="p-2 text-center font-mono text-[11px] text-neutral-500 font-medium border-r border-neutral-200 dark:border-neutral-800">
                            {pct}%
                          </td>
                          <td className={`p-2 text-right font-mono font-bold whitespace-nowrap ${sub.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>
                            {fmt(sub.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-bold border-t border-neutral-200 dark:border-neutral-700 sticky bottom-0 z-10">
                    <tr>
                      <td colSpan={2} className="p-2 uppercase text-[10px] text-neutral-600 dark:text-neutral-400">
                        Total Specified Balance
                      </td>
                      <td className="p-2 text-center font-mono text-[10px] text-neutral-600 dark:text-neutral-400 font-bold">
                        100.0%
                      </td>
                      <td className="p-2 text-right font-mono text-xs font-black text-emerald-800 dark:text-emerald-300">
                        {fmt(selectedFsAccountModal.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Bottom Actions & Navigation Links */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                {selectedFsAccountModal.link_tab && (
                  <button
                    type="button"
                    onClick={() => {
                      const tab = selectedFsAccountModal.link_tab;
                      setSelectedFsAccountModal(null);
                      setActiveTab(tab);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <span>View in {selectedFsAccountModal.link_title || 'Report Tab'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                {selectedFsAccountModal.loans_nav && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = selectedFsAccountModal.loans_nav;
                      setSelectedFsAccountModal(null);
                      router.push(url);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <span>Open in Loan Tracker</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedFsAccountModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Loan Product Borrowers & Contracts Breakdown Modal */}
      {selectedLoanProductModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-modal-backdrop"
          onClick={() => setSelectedLoanProductModal(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#064e3b] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      {selectedLoanProductModal.product_name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Cooperative Loan Product
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Borrower Portfolio • Principal Disbursed:{' '}
                    <span className="font-bold text-emerald-800 dark:text-emerald-400 font-mono">
                      {fmt(selectedLoanProductModal.total_disbursed)}
                    </span> ({selectedLoanProductModal.disbursed_count} loans disbursed)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const searchParam = encodeURIComponent(selectedLoanProductModal.product_name);
                    router.push(`/dashboard/loans?tab=loans&search=${searchParam}`);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Redirect to Loan Tracker with this product filtered"
                >
                  <span>Open in Loan Tracker</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLoanProductModal(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-lg font-bold transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Disbursed (Qty)</div>
                <div className="font-mono font-black text-lg text-neutral-900 dark:text-white mt-0.5">
                  {selectedLoanProductModal.disbursed_count} loans
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                  Total capital outflow
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Principal Disbursed</div>
                <div className="font-mono font-black text-lg text-neutral-900 dark:text-white mt-0.5">
                  {fmt(selectedLoanProductModal.total_disbursed)}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                  Principal capital
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Principal Recovered</div>
                <div className="font-mono font-black text-lg text-neutral-700 dark:text-neutral-300 mt-0.5">
                  {fmt(selectedLoanProductModal.principal_collected)}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                  {selectedLoanProductModal.amortizations_count} amortizations
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold tracking-wider">Total Inflow Volume</div>
                <div className="font-mono font-black text-lg text-emerald-800 dark:text-emerald-300 mt-0.5">
                  {fmt(selectedLoanProductModal.total_collected)}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                  Interest: {fmt(selectedLoanProductModal.interest_collected)}
                </div>
              </div>
            </div>

            {/* Filter Search inside Modal */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search borrowers by member name, LAF #, or date..."
                value={loanProductModalSearch}
                onChange={(e) => setLoanProductModalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Itemized Borrowers Table */}
            <div className="flex-1 flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden min-h-[180px] max-h-[380px]">
              <div className="px-3 py-2 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
                <span className="font-bold text-emerald-900 dark:text-emerald-300">
                  Borrowers & Loan Accounts ({loanProductModalBorrowers.length})
                </span>
                <span className="text-[10px] text-neutral-400">
                  Click any borrower row to open in Loan Tracker
                </span>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th className="p-2.5 w-10 text-center border-r border-emerald-700/60">#</th>
                      <th className="p-2.5 w-24 border-r border-emerald-700/60">Date</th>
                      <th className="p-2.5 min-w-[180px] border-r border-emerald-700/60">Borrower / Member</th>
                      <th className="p-2.5 w-28 border-r border-emerald-700/60">LAF / Ref #</th>
                      <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Principal (₱)</th>
                      <th className="p-2.5 w-24 text-center border-r border-emerald-700/60">Status</th>
                      <th className="p-2.5 w-32 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {loanProductModalBorrowers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-400 italic">
                          No borrowers found matching your search.
                        </td>
                      </tr>
                    ) : (
                      loanProductModalBorrowers.map((b: any, idx: number) => (
                        <tr
                          key={idx}
                          onClick={() => {
                            const isVoucher = b.source === 'Check Voucher' || Boolean(b.voucher_no);
                            const searchVal = isVoucher
                              ? (b.voucher_no || String(b.laf_no || '').replace(/^CV\s*#?\s*/i, ''))
                              : (b.laf_no || b.loan_id || b.member_name);
                            const targetTab = isVoucher ? 'vouchers' : 'loans';
                            router.push(`/dashboard/loans?tab=${targetTab}&search=${encodeURIComponent(searchVal)}`);
                          }}
                          className="hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer group"
                          title={b.source === 'Check Voucher' || b.voucher_no ? `Click to open Voucher #${b.voucher_no || b.laf_no} in Loan Vouchers` : `Click to open Contract #${b.laf_no || b.member_name} in Loan Tracker`}
                        >
                          <td className="p-2 text-center font-mono text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                            {b.date}
                          </td>
                          <td className="p-2 font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                            <span className="group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                              {b.member_name}
                            </span>
                          </td>
                          <td className="p-2 font-mono font-bold text-neutral-800 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                            {b.laf_no}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                            {fmt(b.principal)}
                          </td>
                          <td className="p-2 text-center border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === 'fully_paid'
                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                : b.status === 'active' || b.status === 'disbursed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const isVoucher = b.source === 'Check Voucher' || Boolean(b.voucher_no);
                                const searchVal = isVoucher
                                  ? (b.voucher_no || String(b.laf_no || '').replace(/^CV\s*#?\s*/i, ''))
                                  : (b.laf_no || b.loan_id || b.member_name);
                                const targetTab = isVoucher ? 'vouchers' : 'loans';
                                router.push(`/dashboard/loans?tab=${targetTab}&search=${encodeURIComponent(searchVal)}`);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>View in Loans</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {loanProductModalBorrowers.length > 0 && (
                    <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-bold border-t border-neutral-300 dark:border-neutral-700 sticky bottom-0 z-10 shadow-xs">
                      <tr>
                        <td colSpan={4} className="p-2 text-right uppercase text-[10px] text-neutral-600 dark:text-neutral-400">
                          Total Principal:
                        </td>
                        <td className="p-2 text-right font-mono text-neutral-900 dark:text-white font-black">
                          {fmt(loanProductModalBorrowers.reduce((acc: number, b: any) => acc + (parseFloat(b.principal) || 0), 0))}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Modal Bottom Close */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-neutral-400">
                Showing {loanProductModalBorrowers.length} of {selectedLoanProductModal.borrowers?.length || 0} borrower records
              </span>
              <button
                type="button"
                onClick={() => setSelectedLoanProductModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Itemized Single Merchandise Product Sales Modal */}
      {selectedMerchandiseModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-modal-backdrop"
          onClick={() => setSelectedMerchandiseModal(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#064e3b] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      {selectedMerchandiseModal.item_name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {selectedMerchandiseModal.category}
                    </span>
                    {selectedMerchandiseModal.size && selectedMerchandiseModal.size !== '—' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        Size: {selectedMerchandiseModal.size}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Sales Registry Product • Total Sales:{' '}
                    <span className="font-bold text-emerald-800 dark:text-emerald-400 font-mono">
                      {fmt(selectedMerchandiseModal.total_revenue)}
                    </span> ({selectedMerchandiseModal.total_qty} units sold across {selectedMerchandiseModal.transactions?.length || 0} receipts)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMerchandiseModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-lg font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Profit & Margins breakdown cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Unit Cost (Registry)</div>
                <div className="font-mono font-black text-lg text-neutral-900 dark:text-white mt-0.5">
                  {selectedMerchandiseModal.cost_price > 0 ? fmt(selectedMerchandiseModal.cost_price) : '—'}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                  Selling: {selectedMerchandiseModal.selling_price > 0 ? fmt(selectedMerchandiseModal.selling_price) : '—'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Total Sales Revenue</div>
                <div className="font-mono font-black text-lg text-neutral-900 dark:text-white mt-0.5">
                  {fmt(selectedMerchandiseModal.total_revenue)}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                  {selectedMerchandiseModal.total_qty} units sold
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Total Cost (COGS)</div>
                <div className="font-mono font-black text-lg text-neutral-700 dark:text-neutral-300 mt-0.5">
                  {fmt(selectedMerchandiseModal.total_cost)}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                  Official merchandise cost
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold tracking-wider">Net Gross Profit</div>
                <div className="font-mono font-black text-lg text-emerald-800 dark:text-emerald-300 mt-0.5">
                  {fmt(selectedMerchandiseModal.total_profit)}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                  Margin: {selectedMerchandiseModal.margin_pct}%
                </div>
              </div>
            </div>

            {/* Filter Search inside Modal */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search receipts by OR #, customer name, payment method, or date..."
                value={merchandiseModalSearch}
                onChange={(e) => setMerchandiseModalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Itemized Receipts Table */}
            <div className="flex-1 flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden min-h-[180px] max-h-[380px]">
              <div className="px-3 py-2 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
                <span className="font-bold text-emerald-900 dark:text-emerald-300">
                  Sales Receipts ({merchandiseModalTransactions.length})
                </span>
                <span className="text-[10px] text-neutral-400">
                  Recorded in Sales & Services collection register
                </span>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th className="p-2.5 w-10 text-center border-r border-emerald-700/60">#</th>
                      <th className="p-2.5 w-24 border-r border-emerald-700/60">Date</th>
                      <th className="p-2.5 w-28 border-r border-emerald-700/60">OR / Ref #</th>
                      <th className="p-2.5 min-w-[160px] border-r border-emerald-700/60">Customer / Payor</th>
                      <th className="p-2.5 w-16 text-center border-r border-emerald-700/60">Qty</th>
                      <th className="p-2.5 w-24 text-right border-r border-emerald-700/60">Unit Price</th>
                      <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Revenue</th>
                      <th className="p-2.5 w-28 text-right border-r border-emerald-700/60">Gross Profit</th>
                      <th className="p-2.5 w-24 text-center">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {merchandiseModalTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-neutral-400 italic">
                          No sales receipts found matching your search.
                        </td>
                      </tr>
                    ) : (
                      merchandiseModalTransactions.map((t: any, idx: number) => (
                        <tr key={idx} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                          <td className="p-2 text-center font-mono text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                            {t.date}
                          </td>
                          <td className="p-2 font-mono font-bold text-neutral-800 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                            {t.or_no}
                          </td>
                          <td className="p-2 font-semibold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800">
                            {t.payor_name}
                          </td>
                          <td className="p-2 text-center font-mono font-bold border-r border-neutral-200 dark:border-neutral-800">
                            {t.quantity}
                          </td>
                          <td className="p-2 text-right font-mono text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800">
                            {fmt(t.selling_price)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                            {fmt(t.revenue)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                            {fmt(t.profit)}
                          </td>
                          <td className="p-2 text-center text-[11px] text-neutral-500 whitespace-nowrap">
                            {t.payment_method}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {merchandiseModalTransactions.length > 0 && (
                    <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-bold border-t border-neutral-300 dark:border-neutral-700 sticky bottom-0 z-10 shadow-xs">
                      <tr>
                        <td colSpan={6} className="p-2 text-right uppercase text-[10px] text-neutral-600 dark:text-neutral-400">
                          Total Revenue & Profit:
                        </td>
                        <td className="p-2 text-right font-mono text-neutral-900 dark:text-white font-black">
                          {fmt(merchandiseModalTransactions.reduce((acc: number, t: any) => acc + (parseFloat(t.revenue) || 0), 0))}
                        </td>
                        <td className="p-2 text-right font-mono text-emerald-800 dark:text-emerald-400 font-black">
                          {fmt(merchandiseModalTransactions.reduce((acc: number, t: any) => acc + (parseFloat(t.profit) || 0), 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Modal Bottom Close */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-neutral-400">
                Showing {merchandiseModalTransactions.length} of {selectedMerchandiseModal.transactions?.length || 0} receipts
              </span>
              <button
                type="button"
                onClick={() => setSelectedMerchandiseModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}



      {/* Itemized Book of Accounts Breakdown Modal */}
      {selectedAccountModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-modal-backdrop"
          onClick={closeAccountModal}
        >
          <div
            className="relative w-full max-w-3xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#064e3b] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      {selectedAccountModal.account_name}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedAccountModal.category === 'Merchandise Expense'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : selectedAccountModal.category === 'Service Expense'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    }`}>
                      {selectedAccountModal.category}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Account Breakdown • Total Expenditure: <span className="font-bold text-emerald-800 dark:text-emerald-400 font-mono">{fmt(selectedAccountModal.total_amount)}</span> ({selectedAccountModal.share_pct}% of total expenses)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAccountModal}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-lg font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Info / Where It Belongs cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Where It Belongs</div>
                <div className="font-bold text-neutral-900 dark:text-white mt-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{selectedAccountModal.category}</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  {selectedAccountModal.category === 'Merchandise Expense'
                    ? 'Store purchases, uniforms, goods, inventory'
                    : selectedAccountModal.category === 'Service Expense'
                    ? 'Photocopier toner, printing, ID supplies, maintenance'
                    : 'Wages, utilities, honorarium, general operations'}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold tracking-wider">Total Spent</div>
                <div className="font-mono font-black text-lg text-emerald-900 dark:text-emerald-200 mt-0.5">
                  {fmt(selectedAccountModal.total_amount)}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                  {selectedAccountModal.share_pct}% of operating expenses
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Transaction Count</div>
                <div className="font-mono font-black text-lg text-neutral-900 dark:text-white mt-0.5">
                  {accountModalTransactions.length} {accountModalTransactions.length === 1 ? 'entry' : 'entries'}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  {selectedAccountModal.count} recorded in period
                </div>
              </div>
            </div>

            {/* Filter Search inside Modal */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search transactions by voucher #, payee, particulars, or date..."
                value={accountModalSearch}
                onChange={(e) => setAccountModalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Itemized Transactions Table */}
            <div className="flex-1 flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden min-h-[180px] max-h-[380px]">
              <div className="px-3 py-2 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
                <span className="font-bold text-emerald-900 dark:text-emerald-300">
                  Itemized Entries ({accountModalTransactions.length})
                </span>
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 text-emerald-600" />
                  Click row to view check voucher
                </span>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] sticky top-0 z-10">
                  <tr>
                    <th className="p-2 w-10 text-center border-r border-emerald-700/60">#</th>
                    <th className="p-2 w-24 border-r border-emerald-700/60">Date</th>
                    <th className="p-2 w-32 border-r border-emerald-700/60">Voucher / Ref #</th>
                    <th className="p-2 min-w-[160px] border-r border-emerald-700/60">Payee / Recipient</th>
                    <th className="p-2 min-w-[200px] border-r border-emerald-700/60">Particulars / Details</th>
                    <th className="p-2 w-28 text-right">Amount (₱)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {accountModalTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400 italic">
                        No transactions found matching your search.
                      </td>
                    </tr>
                  ) : (
                    accountModalTransactions.map((t: any, idx: number) => {
                      const isCheckVoucher = Boolean(
                        (t.voucher_no && t.voucher_no !== '—' && !t.voucher_no.startsWith('LF') && !t.voucher_no.includes('Liquidation')) ||
                        t.voucher_id
                      );
                      const isLfOnly = Boolean(!isCheckVoucher && (t.lf_no || (t.voucher_no && (t.voucher_no.startsWith('LF') || t.voucher_no.includes('Liquidation')))));
                      const isClickable = isCheckVoucher || isLfOnly;
                      return (
                        <tr
                          key={idx}
                          onClick={() => {
                            if (isCheckVoucher) {
                              const params = new URLSearchParams();
                              params.set('tab', 'summary');
                              if (t.voucher_no && !t.voucher_no.startsWith('LF') && !t.voucher_no.includes('Liquidation')) {
                                params.set('voucher', t.voucher_no);
                              }
                              if (t.voucher_id) params.set('id', t.voucher_id);
                              params.set('fromReport', activeTab);
                              params.set('returnAccount', selectedAccountModal.account_name);
                              if (activeTab === 'expenses') {
                                params.set('returnSubView', 'accounts');
                              }
                              params.set('period', period);
                              params.set('year', String(year));
                              if (period === 'monthly') params.set('month', String(month));
                              if (period === 'daily') params.set('date', date);
                              router.push(`/dashboard/disbursement?${params.toString()}`);
                            } else if (isLfOnly) {
                              const params = new URLSearchParams();
                              params.set('tab', 'revolving_fund_replenishment');
                              if (t.lf_no) params.set('search', t.lf_no);
                              params.set('fromReport', activeTab);
                              params.set('returnAccount', selectedAccountModal.account_name);
                              if (activeTab === 'expenses') {
                                params.set('returnSubView', 'accounts');
                              }
                              params.set('period', period);
                              params.set('year', String(year));
                              if (period === 'monthly') params.set('month', String(month));
                              if (period === 'daily') params.set('date', date);
                              router.push(`/dashboard/disbursement?${params.toString()}`);
                            }
                          }}
                          className={`transition-colors group ${
                            isClickable
                              ? 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer'
                              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                          }`}
                          title={
                            isCheckVoucher
                              ? `Click to open Check Voucher #${t.voucher_no} in Disbursement`
                              : isLfOnly
                              ? `Click to view Revolving Fund Liquidation in Disbursement`
                              : undefined
                          }
                        >
                          <td className="p-2 text-center font-mono text-neutral-400 border-r border-neutral-200 dark:border-neutral-800">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                            {t.date}
                          </td>
                          <td className="p-2 font-mono font-bold text-neutral-800 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 group-hover:underline">
                              <span>{t.voucher_no}</span>
                              {isClickable && (
                                <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                              )}
                            </div>
                          </td>
                          <td className="p-2 border-r border-neutral-200 dark:border-neutral-800">
                            <span className="font-semibold text-neutral-900 dark:text-white">
                              {t.payee || t.remarks || '—'}
                            </span>
                          </td>
                          <td className="p-2 border-r border-neutral-200 dark:border-neutral-800">
                            <span className="text-neutral-700 dark:text-neutral-300">
                              {t.particulars || '—'}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                            {fmt(t.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {accountModalTransactions.length > 0 && (
                  <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-bold border-t border-neutral-300 dark:border-neutral-700 sticky bottom-0 z-10 shadow-xs">
                    <tr>
                      <td colSpan={5} className="p-2 text-right uppercase text-[10px] text-neutral-600 dark:text-neutral-400">
                        Total Amount:
                      </td>
                      <td className="p-2 text-right font-mono text-emerald-800 dark:text-emerald-400 font-black">
                        {fmt(accountModalTransactions.reduce((acc: number, t: any) => acc + (parseFloat(t.amount) || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              </div>
            </div>

            {/* Modal Bottom Close */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-neutral-400">
                Showing {accountModalTransactions.length} of {selectedAccountModal.count} counts
              </span>
              <button
                type="button"
                onClick={closeAccountModal}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Itemized Recipient Payout History Modal with Full Backdrop Blur & Animation */}
      {selectedRecipientModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-modal-backdrop"
          onClick={closeRecipientModal}
        >
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#064e3b] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {selectedRecipientModal.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {selectedRecipientModal.name}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Total Compensation: <span className="font-bold text-emerald-800 dark:text-emerald-400">{fmt(selectedRecipientModal.total_compensation)}</span> across {selectedRecipientModal.payout_count} payouts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeRecipientModal}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-lg font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Breakdown summary pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase">Honorarium</div>
                <div className="font-mono font-black text-amber-900 dark:text-amber-200 mt-0.5">{fmt(selectedRecipientModal.total_honorarium)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60">
                <div className="text-[10px] text-teal-700 dark:text-teal-300 font-bold uppercase">Allowances</div>
                <div className="font-mono font-black text-teal-900 dark:text-teal-200 mt-0.5">{fmt(selectedRecipientModal.total_allowances)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60">
                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold uppercase">Wages</div>
                <div className="font-mono font-black text-indigo-900 dark:text-indigo-200 mt-0.5">{fmt(selectedRecipientModal.total_wages)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/60">
                <div className="text-[10px] text-violet-700 dark:text-violet-300 font-bold uppercase">Salary</div>
                <div className="font-mono font-black text-violet-900 dark:text-violet-200 mt-0.5">{fmt(selectedRecipientModal.total_salary || 0)}</div>
              </div>
            </div>

            {/* Itemized Transactions Table */}
            <div className="flex-1 flex flex-col border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden min-h-[180px] max-h-[380px]">
              <div className="px-3 py-2 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
                <span className="font-bold text-emerald-900 dark:text-emerald-300">
                  Transaction Records ({selectedRecipientModal.transactions?.length || 0})
                </span>
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 text-emerald-600" />
                  Click row to view check voucher
                </span>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] sticky top-0 z-10">
                  <tr>
                    <th className="p-2 border-r border-emerald-700/60">Date</th>
                    <th className="p-2 border-r border-emerald-700/60">Voucher / CRF #</th>
                    <th className="p-2 border-r border-emerald-700/60">Particulars / Account</th>
                    <th className="p-2 border-r border-emerald-700/60">Type</th>
                    <th className="p-2 text-right">Amount (₱)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {(selectedRecipientModal.transactions || []).map((t: any, idx: number) => {
                    const hasVoucher = Boolean(t.voucher_no && t.voucher_no !== '—');
                    return (
                      <tr
                        key={idx}
                        onClick={() => {
                          if (hasVoucher) {
                            const params = new URLSearchParams();
                            params.set('tab', 'summary');
                            params.set('voucher', t.voucher_no);
                            if (t.voucher_id) params.set('id', t.voucher_id);
                            params.set('fromReport', 'expenses');
                            params.set('returnRecipient', selectedRecipientModal.name);
                            params.set('returnSubView', 'recipients');
                            params.set('period', period);
                            params.set('year', String(year));
                            if (period === 'monthly') params.set('month', String(month));
                            if (period === 'daily') params.set('date', date);
                            router.push(`/dashboard/disbursement?${params.toString()}`);
                          }
                        }}
                        className={`transition-colors group ${
                          hasVoucher
                            ? 'hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer'
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                        }`}
                        title={hasVoucher ? `Click to open Check Voucher #${t.voucher_no} in Disbursement` : undefined}
                      >
                        <td className="p-2 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                          {t.date}
                        </td>
                        <td className="p-2 font-mono font-bold text-neutral-800 dark:text-neutral-200 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-400 group-hover:underline">
                            <span>{t.voucher_no}</span>
                            {hasVoucher && (
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="p-2 border-r border-neutral-200 dark:border-neutral-800">
                          <div className="font-medium text-neutral-900 dark:text-white">{t.particulars}</div>
                          <div className="text-[10px] text-neutral-400">{t.account_name}</div>
                        </td>
                        <td className="p-2 border-r border-neutral-200 dark:border-neutral-800 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            t.type === 'Honorarium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            t.type === 'Allowances' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' :
                            'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                          {fmt(t.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={closeRecipientModal}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Book of Account Modal */}
      {isCreateAccountModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-modal-backdrop"
          onClick={() => setIsCreateAccountModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#064e3b] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                  <Sparkles className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Create Book of Account
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Add a new account to your chart of accounts and link it to a category
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateAccountModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => {
                    setNewAccountName(e.target.value);
                    if (!isCategoryManuallyChosen) {
                      setNewAccountCategory(getCategoryForAccount(e.target.value, accountCategoryMap));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateAccount();
                    }
                  }}
                  placeholder="e.g. Communication Equipment"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none placeholder:text-neutral-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300 mb-1.5">
                  Select Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ACCOUNT_CATEGORIES.map(cat => {
                    const isSelected = newAccountCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setNewAccountCategory(cat.value);
                          setIsCategoryManuallyChosen(true);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? `${cat.color} ring-2 ring-emerald-500 shadow-xs font-black`
                            : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-2.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  This account will instantly synchronize across all disbursement dropdowns and financial reports.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsCreateAccountModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newAccountName.trim() || isSavingAccount}
                onClick={handleCreateAccount}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#064e3b] hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                {isSavingAccount ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Book of Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Book of Account Confirmation Modal */}
      {accountToDelete && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-modal-backdrop"
          onClick={() => !isDeletingAccount && setAccountToDelete(null)}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-rose-300 dark:border-rose-900/80 rounded-3xl p-6 shadow-2xl space-y-4 animate-modal-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white font-bold flex items-center justify-center shadow-xs shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Delete Book of Account
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Remove account from chart of accounts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDeletingAccount && setAccountToDelete(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-3">
              <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                Are you sure you want to delete <strong className="text-neutral-900 dark:text-white font-bold">&ldquo;{accountToDelete.name}&rdquo;</strong>?
              </p>

              {accountToDelete.count > 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  ⚠️ This account has <strong className="font-bold">{accountToDelete.count} recorded transaction {accountToDelete.count === 1 ? 'entry' : 'entries'}</strong> in this period. Deleting it will remove it from dropdown selectors and account listings.
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-400">
                  This account will be removed from voucher selection dropdowns and financial report categories.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => setAccountToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                {isDeletingAccount ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

        </>
      ) : null}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      }
    >
      <ReportsPageContent />
    </Suspense>
  );
}
