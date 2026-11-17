'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  ShieldCheck,
  User as UserIcon,
  Users,
  ChevronDown,
  RotateCcw,
  RefreshCw,
  Monitor,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AuditLog {
  id: string;
  user_id: string | null;
  username: string | null;
  user_role?: string | null;
  action: string;
  module: string;
  method: string;
  endpoint: string;
  status_code: number;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  details: any;
  created_at: string;
}

interface AuditUserSummary {
  username: string;
  role: string;
  total_actions: number;
  last_activity: string;
}

interface Pagination {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
}

const formatDeviceName = (ua?: string | null): string => {
  if (!ua) return 'Unknown device';
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  let os = '';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS/i.test(ua)) os = 'Mac';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return os ? `${browser} on ${os}` : browser;
};

const formatReadableFieldName = (key: string): string => {
  const map: Record<string, string> = {
    voucher_no: 'Check Voucher #',
    voucher_date: 'Voucher Date',
    date_released: 'Date Disbursed',
    check_no: 'Check #',
    payee: 'Payee',
    payor_name: 'Customer / Payor',
    or_no: 'Receipt # (OR)',
    lf_no: 'Liquidation #',
    bank: 'Bank',
    bank_name: 'Bank',
    amount: 'Amount',
    fund_amount: 'Fund Amount',
    particulars: 'Description',
    folder_name: 'Category / Folder',
    status: 'Status',
    remarks: 'Remarks',
    username: 'Account Username',
    role: 'Role',
    payment_method: 'Payment Mode',
    collected_by: 'Cashier / Collector',
    date: 'Date',
  };
  if (map[key]) return map[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const extractFriendlyDetails = (details: any): { label: string; value: string }[] => {
  if (!details || typeof details !== 'object') return [];
  const skipKeys = new Set(['password', 'password_hash', 'token', 'secret', 'credit_card', 'id', 'loan_id', 'user_id', 'signatories']);
  const priorityOrder = [
    'username', 'role', 'voucher_no', 'or_no', 'lf_no', 'payee', 'payor_name',
    'folder_name', 'bank', 'bank_name', 'amount', 'fund_amount', 'particulars',
    'status', 'payment_method', 'date', 'voucher_date', 'date_released', 'remarks', 'collected_by'
  ];

  const entries: { label: string; value: string }[] = [];
  const added = new Set<string>();

  const pushEntry = (k: string, val: any) => {
    if (skipKeys.has(k) || val === null || val === undefined || val === '') return;
    if (typeof val === 'string' && val.includes('REDACTED')) return;
    if (Array.isArray(val)) {
      if (val.length === 0) return;
      entries.push({ label: formatReadableFieldName(k), value: `${val.length} item(s)` });
      added.add(k);
      return;
    }
    if (typeof val === 'object') return;
    let formatted = String(val);
    if ((k === 'amount' || k === 'fund_amount') && !isNaN(Number(val))) {
      formatted = `â‚±${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    entries.push({ label: formatReadableFieldName(k), value: formatted });
    added.add(k);
  };

  for (const key of priorityOrder) {
    if (key in details) pushEntry(key, details[key]);
  }
  for (const [key, val] of Object.entries(details)) {
    if (!added.has(key) && entries.length < 10) pushEntry(key, val);
  }
  return entries;
};

const buildHumanActivity = (log: AuditLog): {
  actor: string;
  actionBadge: string;
  badgeColor: string;
  headline: string;
  area: string;
  summary: string;
} => {
  const ep = (log.endpoint || '').toLowerCase();
  const d = log.details && typeof log.details === 'object' ? log.details : {};
  const actor = log.username || (typeof d.username === 'string' && d.username.trim()) || 'System';

  let area = log.module || 'System';
  if (area === 'System' || area === 'Authentication') {
    if (ep.includes('/auth/login') || ep.includes('/auth/logout') || ep.includes('password')) area = 'Account Access';
    else if (ep.includes('/auth/register') || ep.includes('/auth/users')) area = 'User Management';
    else if (ep.includes('/collections')) area = 'Collection';
    else if (ep.includes('/check-vouchers')) area = 'Disbursement';
    else if (ep.includes('/revolving-fund')) area = 'Revolving Fund';
    else if (ep.includes('/stl-liquidations')) area = 'STL Liquidation';
    else if (ep.includes('/bank-recon')) area = 'Bank Recon';
    else if (ep.includes('/members')) area = 'Members';
    else if (ep.includes('/loans')) area = 'Loans';
    else if (ep.includes('/billing')) area = 'Billings';
    else if (ep.includes('/dividends')) area = 'Dividend';
    else if (ep.includes('/import')) area = 'Data Import';
    else if (ep.includes('/support')) area = 'Support Desk';
  }

  let actionBadge = 'Activity';
  let badgeColor = 'bg-neutral-500/15 text-neutral-700 dark:text-neutral-300 border-neutral-500/20';
  let headline = log.action || 'Updated record';

  if (ep.includes('/auth/login')) {
    actionBadge = 'Signed In';
    badgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    headline = log.status === 'success' ? 'Signed in to Coop Sync' : 'Failed sign-in attempt';
  } else if (ep.includes('/auth/logout')) {
    actionBadge = 'Signed Out';
    badgeColor = 'bg-neutral-500/15 text-neutral-700 dark:text-neutral-300 border-neutral-500/25';
    headline = 'Signed out of Coop Sync';
  } else if (ep.includes('/auth/register')) {
    actionBadge = 'Added';
    badgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    headline = d.username ? `Created account "${d.username}"${d.role ? ` (${d.role})` : ''}` : 'Created a user account';
  } else if (ep.includes('/auth/users')) {
    if (log.method === 'DELETE') {
      actionBadge = 'Deleted';
      badgeColor = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
      headline = 'Deleted a user account';
    } else {
      actionBadge = 'Updated';
      badgeColor = 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
      headline = d.username ? `Updated user account "${d.username}"` : 'Updated user account';
    }
  } else {
    if (log.method === 'POST') {
      actionBadge = 'Added';
      badgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    } else if (log.method === 'PUT') {
      actionBadge = 'Updated';
      badgeColor = 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
    } else if (log.method === 'PATCH') {
      actionBadge = 'Edited';
      badgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    } else if (log.method === 'DELETE') {
      actionBadge = 'Deleted';
      badgeColor = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
    }

    const itemLabel =
      ep.includes('/check-vouchers') ? (d.voucher_no ? `Check Voucher #${d.voucher_no}` : 'Check Voucher') :
      ep.includes('/collections') ? (d.or_no ? `Collection Receipt #${d.or_no}` : 'Collection Receipt') :
      ep.includes('/revolving-fund') ? (d.lf_no ? `Revolving Fund #${d.lf_no}` : 'Revolving Fund') :
      ep.includes('/stl-liquidations') ? (d.lf_no ? `STL Liquidation #${d.lf_no}` : 'STL Liquidation') :
      ep.includes('/bank-recon') ? 'Bank Recon Entry' :
      area;

    if (/^(POST|PUT|PATCH|DELETE) Operation$/i.test(headline) || headline.startsWith('Create ') || headline.startsWith('Update ') || headline.startsWith('Modify ') || headline.startsWith('Delete ')) {
      const verb =
        log.method === 'POST' ? 'Added' :
        log.method === 'PUT' ? 'Updated' :
        log.method === 'PATCH' ? 'Edited' :
        log.method === 'DELETE' ? 'Deleted' : 'Updated';
      headline = `${verb} ${itemLabel}`;
    }
  }

  const parts: string[] = [];
  if (d.payee) parts.push(`Payee: ${d.payee}`);
  if (d.payor_name) parts.push(`Customer: ${d.payor_name}`);
  if (d.folder_name) parts.push(d.folder_name);
  if (d.bank || d.bank_name) parts.push(d.bank || d.bank_name);
  if (d.amount !== undefined && d.amount !== null && d.amount !== '') {
    const num = Number(d.amount);
    if (!isNaN(num) && num !== 0) {
      parts.push(`â‚±${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
  }
  if (d.particulars && parts.length < 3) parts.push(String(d.particulars));

  return {
    actor,
    actionBadge,
    badgeColor,
    headline,
    area,
    summary: parts.length > 0 ? parts.join(' â€¢ ') : '',
  };
};

export default function AuditTrailPage() {
  const { user } = useAuth();
  const router = useRouter();

  const isOrpheusAdmin = useMemo(
    () => user?.role === 'admin' && (user?.username || '').trim().toLowerCase() === 'orpheus',
    [user]
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total_records: 0, total_pages: 0 });
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showTechDetailsId, setShowTechDetailsId] = useState<string | null>(null);

  // Filter options
  const [filterOptions, setFilterOptions] = useState<{
    modules: string[];
    actions: string[];
    users: AuditUserSummary[];
  }>({ modules: [], actions: [], users: [] });

  // Strictly restrict to Orpheus admin account
  useEffect(() => {
    if (user && !isOrpheusAdmin) {
      router.push('/dashboard');
    }
  }, [user, isOrpheusAdmin, router]);

  const fetchFilterOptions = useCallback(async () => {
    if (!isOrpheusAdmin) return;
    try {
      const res = await api.get('/audit/filters');
      setFilterOptions({
        modules: res.data?.data?.modules || [],
        actions: res.data?.data?.actions || [],
        users: res.data?.data?.users || [],
      });
    } catch {
      // ignore
    }
  }, [isOrpheusAdmin]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  const fetchLogs = useCallback(async (page = 1, silent = false) => {
    if (!isOrpheusAdmin) return;
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '30');
      if (searchQuery) params.set('search', searchQuery);
      if (usernameFilter) params.set('username', usernameFilter);
      if (roleFilter) params.set('user_role', roleFilter);
      if (moduleFilter) params.set('module', moduleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const response = await api.get(`/audit/logs?${params.toString()}`);
      setLogs(response.data.data || []);
      setPagination(response.data.pagination || { page: 1, limit: 30, total_records: 0, total_pages: 0 });
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      if (!silent) {
        setError(err.response?.data?.error?.message || 'Failed to load audit logs.');
      }
    } finally {
      if (!silent) setLoading(false);
      else setRefreshing(false);
    }
  }, [isOrpheusAdmin, searchQuery, usernameFilter, roleFilter, moduleFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    if (isOrpheusAdmin) {
      const debounce = setTimeout(() => fetchLogs(1), 300);
      return () => clearTimeout(debounce);
    }
  }, [fetchLogs, isOrpheusAdmin]);

  // Real-time live polling every 5 seconds when enabled
  useEffect(() => {
    if (!isOrpheusAdmin || !isLive) return;
    const interval = setInterval(() => {
      fetchLogs(pagination.page, true);
      fetchFilterOptions();
    }, 5000);
    return () => clearInterval(interval);
  }, [isOrpheusAdmin, isLive, pagination.page, fetchLogs, fetchFilterOptions]);

  const handleExport = async () => {
    if (!isOrpheusAdmin) return;
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (usernameFilter) params.set('username', usernameFilter);
      if (roleFilter) params.set('user_role', roleFilter);
      if (moduleFilter) params.set('module', moduleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const response = await api.get(`/audit/logs/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export audit logs.');
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setUsernameFilter('');
    setRoleFilter('');
    setModuleFilter('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
  };

  const getRoleBadge = (role?: string | null) => {
    const r = (role || 'system').toLowerCase();
    const styles: Record<string, string> = {
      admin: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      staff: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
      member: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
      system: 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${styles[r] || styles.system}`}>
        {r}
      </span>
    );
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return 'â€”';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (!user || !isOrpheusAdmin) return null;

  const hasActiveFilters = Boolean(searchQuery || usernameFilter || roleFilter || moduleFilter || statusFilter || startDate || endDate);

  return (
    <div className="space-y-5 animate-micro-elevate">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <BackButton href="/dashboard">Back to Overview</BackButton>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Audit Trail &amp; Activity Log
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" /> Orpheus Exclusive
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            See who signed in and what changes each admin, staff, or member made â€” in plain English.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setIsLive(v => !v)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isLive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-surface-container-low border-outline-variant/60 text-neutral-600 dark:text-neutral-300'
            }`}
            title="Toggle automatic 5-second live updates"
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
            <span>{isLive ? 'Live (5s)' : 'Paused'}</span>
            {lastUpdated && <span className="text-[10px] opacity-75">â€¢ {lastUpdated}</span>}
          </button>
          <button
            type="button"
            onClick={() => { fetchLogs(pagination.page, true); fetchFilterOptions(); }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant/60 bg-white dark:bg-surface-container-low text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral/5 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary dark:bg-secondary text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Retention Notice */}
      <div className="p-3 bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-xl flex items-center gap-2.5 text-xs text-neutral-600 dark:text-neutral-300">
        <Info className="w-4 h-4 text-primary dark:text-secondary flex-shrink-0" />
        <span>
          <strong>Note:</strong> Activity records are kept for <strong>30 days</strong>. Click any person below to see only the changes they made.
        </span>
      </div>

      {/* Per-Account Activity Strip */}
      {filterOptions.users.length > 0 && (
        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
              <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Filter by Person ({filterOptions.users.length})
            </span>
            {usernameFilter && (
              <button
                type="button"
                onClick={() => setUsernameFilter('')}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Show Everyone
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {filterOptions.users.map(u => {
              const active = usernameFilter.toLowerCase() === u.username.toLowerCase();
              return (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => setUsernameFilter(active ? '' : u.username)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-surface dark:bg-surface-container-high border-outline-variant/50 text-neutral-700 dark:text-neutral-200 hover:border-emerald-500/60'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5 opacity-80" />
                  <span>{u.username}</span>
                  {!active && getRoleBadge(u.role)}
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${active ? 'bg-white/20 text-white' : 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400'}`}>
                    {u.total_actions}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search person, voucher #, receipt #, payee..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface dark:bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1 block">Account Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface dark:bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="member">Member</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1 block">Section</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface dark:bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Sections</option>
              {filterOptions.modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1 block">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface dark:bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1 block">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface dark:bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 pt-2.5 border-t border-outline-variant/30 flex items-center justify-between text-xs">
            <span className="text-neutral-500">
              Showing filtered results
              {usernameFilter ? ` â€¢ Person: ${usernameFilter}` : ''}
              {roleFilter ? ` â€¢ Role: ${roleFilter}` : ''}
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between text-xs font-bold text-neutral-600 dark:text-neutral-400">
        <span className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> {pagination.total_records.toLocaleString()} activities recorded
        </span>
        <span>Page {pagination.page} of {pagination.total_pages || 1}</span>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl flex items-center gap-2 text-sm font-bold">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Logs List */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const activity = buildHumanActivity(log);
            const isExpanded = expandedRow === log.id;
            const friendlyDetails = isExpanded ? extractFriendlyDetails(log.details) : [];
            const showTech = showTechDetailsId === log.id;

            return (
              <div
                key={log.id}
                className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                  className="w-full text-left p-4 hover:bg-neutral/5 dark:hover:bg-neutral/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs font-extrabold text-neutral-900 dark:text-white">
                          <UserIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          {activity.actor}
                        </span>
                        {getRoleBadge(log.user_role)}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${activity.badgeColor}`}>
                          {activity.actionBadge}
                        </span>
                        <span className="font-body text-sm font-bold text-on-surface dark:text-white">
                          {activity.headline}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
                          {activity.area}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDateTime(log.created_at)}
                        </span>
                        {activity.summary && (
                          <span className="truncate max-w-2xl font-medium text-neutral-700 dark:text-neutral-300">
                            â€¢ {activity.summary}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        log.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {log.status === 'success' ? 'Success' : 'Failed'}
                      </span>
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                      <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {/* Human-Friendly Expanded Summary */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-outline-variant/30 pt-3 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-surface dark:bg-surface-container-high p-3 rounded-xl border border-outline-variant/30">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-neutral-500 block">Done By</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{activity.actor}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-neutral-500 block">Section</span>
                        <span className="font-bold text-neutral-900 dark:text-white">{activity.area}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-neutral-500 block">Result</span>
                        <span className={`font-bold ${log.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          {log.status === 'success' ? 'Completed Successfully' : 'Action Failed'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-neutral-500 block">Device Used</span>
                        <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                          <Monitor className="w-3 h-3 text-neutral-400" />
                          {formatDeviceName(log.user_agent)}
                        </span>
                      </div>
                    </div>

                    {friendlyDetails.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-neutral-500 block mb-1.5">What Was Entered / Changed</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {friendlyDetails.map((item, idx) => (
                            <div key={idx} className="px-3 py-2 rounded-lg bg-neutral/5 dark:bg-neutral/10 border border-outline-variant/20">
                              <span className="text-[10px] font-bold text-neutral-500 block">{item.label}</span>
                              <span className="font-semibold text-neutral-900 dark:text-neutral-100 break-words">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowTechDetailsId(showTech ? null : log.id)}
                        className="text-[10px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 underline cursor-pointer"
                      >
                        {showTech ? 'Hide Technical Log' : 'Show Technical Log'}
                      </button>
                    </div>

                    {showTech && (
                      <div className="p-3 rounded-xl bg-neutral/5 dark:bg-neutral/10 border border-outline-variant/30 space-y-2 text-[11px] font-mono text-neutral-500">
                        <div><strong>Endpoint:</strong> {log.method} {log.endpoint} (HTTP {log.status_code})</div>
                        {log.ip_address && <div><strong>IP:</strong> {log.ip_address}</div>}
                        {log.details && (
                          <pre className="overflow-x-auto max-h-40">{JSON.stringify(log.details, null, 2)}</pre>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {logs.length === 0 && !loading && (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
              <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-body text-sm">No activity records match your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => fetchLogs(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-outline-variant/50 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral/5 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
              let pageNum: number;
              if (pagination.total_pages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.total_pages - 2) {
                pageNum = pagination.total_pages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => fetchLogs(pageNum)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    pageNum === pagination.page
                      ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral/5'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => fetchLogs(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-outline-variant/50 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral/5 disabled:opacity-30 transition-colors cursor-pointer"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
