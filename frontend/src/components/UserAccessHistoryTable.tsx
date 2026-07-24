'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Monitor,
  Tablet as TabletIcon,
  Smartphone,
  Globe,
  Clock,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Loader2,
  Cpu
} from 'lucide-react';

interface AccessLog {
  id: string;
  user_id: string;
  username: string;
  login_at: string;
  logout_at: string | null;
  session_duration: number | null;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  operating_system: string | null;
  user_agent: string | null;
  status: string;
}

interface UserAccessHistoryTableProps {
  userId?: string;
  title?: string;
}

export default function UserAccessHistoryTable({
  userId,
  title = 'Login & Logout History'
}: UserAccessHistoryTableProps) {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAccessLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        page,
        limit,
      };
      if (userId) params.user_id = userId;
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/auth/access-history', { params });
      if (response.data.success) {
        setLogs(response.data.data || []);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalRecords(response.data.pagination.totalRecords || 0);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load access history logs.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, userId, search, statusFilter]);

  useEffect(() => {
    fetchAccessLogs();
  }, [fetchAccessLogs]);

  // Format timestamp consistently
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Format session duration cleanly
  const formatDuration = (seconds?: number | null, logoutAt?: string | null, status?: string) => {
    if (status === 'Failed Login') return 'N/A';
    if (!logoutAt && status === 'Success') {
      return <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs animate-pulse"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Active Session</span>;
    }
    if (seconds == null || seconds < 0) return '—';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getDeviceIcon = (device?: string | null) => {
    const dev = (device || '').toLowerCase();
    if (dev.includes('mobile')) return <Smartphone className="w-4 h-4 text-primary dark:text-secondary" />;
    if (dev.includes('tablet')) return <TabletIcon className="w-4 h-4 text-primary dark:text-secondary" />;
    return <Monitor className="w-4 h-4 text-primary dark:text-secondary" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Active / Success
          </span>
        );
      case 'Logged Out':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
            <LogOut className="w-3.5 h-3.5 text-neutral-500" />
            Logged Out
          </span>
        );
      case 'Failed Login':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Failed Login
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-surface dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm p-5 space-y-4">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/40 pb-4">
        <div>
          <h3 className="font-headline text-base font-bold text-on-surface dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary dark:text-secondary" />
            {title}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Recorded user login, logout, session duration, and device access logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAccessLogs}
            disabled={loading}
            className="p-2 rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh logs"
            aria-label="Refresh access logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search IP, browser, device..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-outline-variant/60 bg-surface dark:bg-surface-container-high/40 text-xs text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl border border-outline-variant/60 bg-surface dark:bg-surface-container-high/40 text-xs text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Success">Success / Active</option>
            <option value="Logged Out">Logged Out</option>
            <option value="Failed Login">Failed Login</option>
          </select>
        </div>
      </div>

      {/* Content state */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-500 dark:text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin text-primary dark:text-secondary" />
          <span className="text-xs font-semibold">Loading access history...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-tertiary/10 border border-tertiary/20 text-tertiary text-xs font-semibold text-center">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-xs text-neutral-500 dark:text-neutral-400">
          No access history logs found.
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-outline-variant/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low dark:bg-surface-container-high/50 text-neutral-600 dark:text-neutral-300 font-bold border-b border-outline-variant/40">
                  <th className="p-3">Status</th>
                  <th className="p-3">Login Time</th>
                  <th className="p-3">Logout Time</th>
                  <th className="p-3">Session Duration</th>
                  <th className="p-3">Device & OS</th>
                  <th className="p-3">Browser</th>
                  <th className="p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-on-surface dark:text-neutral-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="p-3 whitespace-nowrap">{getStatusBadge(log.status)}</td>
                    <td className="p-3 font-mono text-[11px] whitespace-nowrap">{formatDateTime(log.login_at)}</td>
                    <td className="p-3 font-mono text-[11px] whitespace-nowrap">{formatDateTime(log.logout_at)}</td>
                    <td className="p-3 whitespace-nowrap font-medium">{formatDuration(log.session_duration, log.logout_at, log.status)}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getDeviceIcon(log.device_type)}
                        <span className="font-semibold text-xs">{log.device_type || 'Desktop'}</span>
                        <span className="text-neutral-400 text-[10px]">({log.operating_system || 'Unknown OS'})</span>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                        <Globe className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{log.browser || 'Browser'}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (< md) */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low dark:bg-surface-container-high/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  {getStatusBadge(log.status)}
                  <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
                    {log.ip_address || '127.0.0.1'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-outline-variant/30">
                  <div>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-bold uppercase">Login</span>
                    <span className="font-mono text-[11px] font-medium text-on-surface dark:text-neutral-200">
                      {formatDateTime(log.login_at)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-bold uppercase">Logout</span>
                    <span className="font-mono text-[11px] font-medium text-on-surface dark:text-neutral-200">
                      {formatDateTime(log.logout_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 text-neutral-600 dark:text-neutral-300">
                  <div className="flex items-center gap-1.5">
                    {getDeviceIcon(log.device_type)}
                    <span className="font-semibold">{log.device_type} • {log.browser}</span>
                  </div>

                  <div>
                    <span className="font-semibold text-primary dark:text-secondary">
                      {formatDuration(log.session_duration, log.logout_at, log.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs">
            <span className="text-neutral-500 dark:text-neutral-400">
              Showing page <strong className="text-on-surface dark:text-white">{page}</strong> of <strong className="text-on-surface dark:text-white">{totalPages}</strong> ({totalRecords} total events)
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
