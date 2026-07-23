'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
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
  Globe,
  Monitor,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AuditLog {
  id: string;
  user_id: string | null;
  username: string | null;
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

interface Pagination {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
}

export default function AuditTrailPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total_records: 0, total_pages: 0 });
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filter options
  const [filterOptions, setFilterOptions] = useState<{ modules: string[]; actions: string[] }>({ modules: [], actions: [] });

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch filter options
  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/audit/filters')
        .then(res => setFilterOptions(res.data.data))
        .catch(() => {});
    }
  }, [user]);

  const fetchLogs = useCallback(async (page = 1) => {
    if (user?.role !== 'admin') return;
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '30');
      if (searchQuery) params.set('search', searchQuery);
      if (moduleFilter) params.set('module', moduleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const response = await api.get(`/audit/logs?${params.toString()}`);
      setLogs(response.data.data);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [user, searchQuery, moduleFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    if (user?.role === 'admin') {
      const debounce = setTimeout(() => fetchLogs(1), 400);
      return () => clearTimeout(debounce);
    }
  }, [searchQuery, moduleFilter, statusFilter, startDate, endDate, user]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (moduleFilter) params.set('module', moduleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const response = await api.get(`/audit/logs/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Audit_Trail_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      POST: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      PUT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      PATCH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${colors[method] || 'bg-neutral/10 text-neutral-600'}`}>
        {method}
      </span>
    );
  };

  if (user?.role !== 'admin') return null;

  return (
    <div className="space-y-6 animate-micro-elevate">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-on-surface dark:text-white flex items-center gap-3">
            <ScrollText className="w-7 h-7 sm:w-8 sm:h-8 text-primary dark:text-secondary flex-shrink-0" />
            Audit Trail
          </h1>
          <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Immutable chronological log of all system actions and administrative operations
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary dark:bg-secondary text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search actions, users, modules..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface dark:bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1 block">Module</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface dark:bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Modules</option>
              {filterOptions.modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface dark:bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1 block">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface dark:bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1 block">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-surface dark:bg-surface-container-high border border-outline-variant/50 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between text-xs font-bold text-neutral-600 dark:text-neutral-400">
        <span className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> {pagination.total_records} records found
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
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                className="w-full text-left p-4 hover:bg-neutral/5 dark:hover:bg-neutral/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {/* Status Indicator */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getMethodBadge(log.method)}
                      <span className="font-body text-sm font-bold text-on-surface dark:text-white">{log.action}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral/5 dark:bg-neutral/10 text-neutral-500 font-semibold">{log.module}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDateTime(log.created_at)}</span>
                      <span className="font-semibold">{log.username || 'System'}</span>
                      <span className={`font-bold ${log.status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                        {log.status_code}
                      </span>
                    </div>
                  </div>

                  {/* Status Icon */}
                  {log.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {expandedRow === log.id && (
                <div className="px-4 pb-4 border-t border-outline-variant/30 pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="font-bold text-neutral-600 dark:text-neutral-300">Endpoint:</span>
                      <span className="ml-2 font-mono text-neutral-500">{log.endpoint}</span>
                    </div>
                    <div>
                      <span className="font-bold text-neutral-600 dark:text-neutral-300">Status Code:</span>
                      <span className="ml-2">{log.status_code} ({log.status})</span>
                    </div>
                    {log.ip_address && (
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-neutral-500" />
                        <span className="font-bold text-neutral-600 dark:text-neutral-300">IP Address:</span>
                        <span className="ml-1 font-mono">{log.ip_address}</span>
                      </div>
                    )}
                    {log.user_agent && (
                      <div className="flex items-start gap-1 col-span-full">
                        <Monitor className="w-3 h-3 text-neutral-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-neutral-600 dark:text-neutral-300">User Agent:</span>
                          <span className="ml-1 text-neutral-500 break-all">{log.user_agent}</span>
                        </div>
                      </div>
                    )}
                    {log.details && (
                      <div className="col-span-full">
                        <span className="font-bold text-neutral-600 dark:text-neutral-300">Request Details:</span>
                        <pre className="mt-1 p-2 rounded-lg bg-neutral/5 dark:bg-neutral/10 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 overflow-x-auto max-h-40">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {logs.length === 0 && !loading && (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
              <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-body text-sm">No audit logs found matching your filters.</p>
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
