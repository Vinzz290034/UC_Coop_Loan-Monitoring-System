'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { SkeletonTable } from '@/components/ui/Skeleton';
import {
  LifeBuoy,
  AlertTriangle,
  PlusCircle,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  Loader2,
  X,
  MessageSquareText,
  Tag,
  User,
  Inbox,
  Send,
} from 'lucide-react';

interface SupportTicket {
  id: number;
  user_id: number;
  subject: string;
  message: string;
  category: string;
  status: string;
  created_at: string;
  // Joined fields (admin/manager view)
  email?: string;
  first_name?: string;
  last_name?: string;
}

export default function SupportPage() {
  const { user } = useAuth();
  const { setBreadcrumbLabel } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbLabel('support', 'Support Desk');
  }, [setBreadcrumbLabel]);

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Data state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    subject: '',
    message: '',
    category: 'general',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Detail view modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get('/support/tickets');
      if (res.data && res.data.success) {
        setTickets(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching support tickets:', err);
      setError(err.response?.data?.error?.message || 'Failed to load support tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Create ticket
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.subject.trim() || !createForm.message.trim()) {
      setCreateError('Subject and message are required.');
      return;
    }

    if (createForm.message.trim().length < 10) {
      setCreateError('Message must be at least 10 characters long.');
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateError(null);

      await api.post('/support/contact', {
        subject: createForm.subject.trim(),
        message: createForm.message.trim(),
        category: createForm.category,
      });

      setIsCreateOpen(false);
      setCreateForm({ subject: '', message: '', category: 'general' });
      await fetchTickets();
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || 'Failed to submit support ticket.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Filter logic
  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const memberName = `${ticket.first_name || ''} ${ticket.last_name || ''}`.toLowerCase();
      return (
        ticket.subject.toLowerCase().includes(q) ||
        ticket.category.toLowerCase().includes(q) ||
        memberName.includes(q)
      );
    }
    return true;
  });

  // Status badge styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200/50';
      case 'in_progress':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200/50';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200/50';
      case 'closed':
        return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800/40 dark:text-neutral-400 border-neutral-200/50';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  // Category label styles
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'account':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'loan':
        return 'bg-primary/10 text-primary dark:text-secondary';
      case 'technical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'billing':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
    }
  };

  // Category options
  const categoryOptions = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'account', label: 'Account Issue' },
    { value: 'loan', label: 'Loan Concern' },
    { value: 'billing', label: 'Billing & Payment' },
    { value: 'technical', label: 'Technical / System Bug' },
  ];

  // Status summary counts
  const statusCounts = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  return (
    <div className="space-y-6 animate-micro-elevate">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface dark:text-white flex items-center gap-2">
            <LifeBuoy className="w-7 h-7 text-primary dark:text-secondary" />
            {isAdminOrManager ? 'Support Desk Queue' : 'Help & Support'}
          </h1>
          <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            {isAdminOrManager
              ? 'Review, manage, and resolve member support requests.'
              : 'Submit questions or report issues to the coop administrative team.'}
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          New Support Ticket
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open', count: statusCounts.open, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', icon: MessageSquareText },
          { label: 'In Progress', count: statusCounts.in_progress, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
          { label: 'Resolved', count: statusCounts.resolved, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-sm flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 font-label">{stat.label}</span>
              <h3 className={`font-headline text-xl font-extrabold ${stat.color}`}>{stat.count}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-400">
          <Filter className="w-4 h-4 text-primary dark:text-secondary" />
          <span>Status:</span>
        </div>

        <div className="flex flex-wrap gap-2 flex-1">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border-primary dark:border-secondary shadow-sm'
                  : 'bg-transparent text-neutral-600 dark:text-neutral-300 border-outline-variant/50 hover:bg-neutral/5 dark:hover:bg-neutral/10'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {isAdminOrManager && (
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-3 py-2 text-xs border border-outline-variant/60 rounded-xl bg-white dark:bg-surface-container-high focus:ring-1 focus:ring-primary dark:focus:ring-secondary outline-none text-on-surface dark:text-white"
            />
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={fetchTickets} className="ml-auto px-3 py-1 bg-tertiary/10 hover:bg-tertiary/20 rounded-lg font-bold transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <SkeletonTable rows={5} cols={isAdminOrManager ? 5 : 4} />
      ) : filteredTickets.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
          <Inbox className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <h3 className="font-headline font-bold text-on-surface dark:text-white text-sm">
            {statusFilter !== 'all' ? `No ${statusFilter.replace('_', ' ')} tickets.` : 'No support tickets yet.'}
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            {user?.role === 'member'
              ? 'Have a question? Create your first support ticket.'
              : 'No member tickets to review at this time.'}
          </p>
        </div>
      ) : (
        /* Tickets Table */
        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low dark:bg-surface-container-high/55 border-b border-outline-variant/50">
                  {isAdminOrManager && (
                    <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Submitted By</th>
                  )}
                  <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Subject</th>
                  <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden sm:table-cell">Category</th>
                  <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Status</th>
                  <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden md:table-cell">Date</th>
                  <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-body text-xs text-on-surface dark:text-white/95">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-neutral/5 transition-colors">
                    {isAdminOrManager && (
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary flex-shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold block">
                              {ticket.first_name ? `${ticket.first_name} ${ticket.last_name}` : 'System User'}
                            </span>
                            {ticket.email && (
                              <span className="text-[10px] text-neutral-400 font-mono">{ticket.email}</span>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-4 sm:px-6 py-4">
                      <span className="font-semibold">{ticket.subject}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${getCategoryBadge(ticket.category)}`}>
                        <Tag className="w-2.5 h-2.5" />
                        {ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(ticket.status)}`}>
                        {ticket.status === 'open' && <MessageSquareText className="w-3 h-3" />}
                        {ticket.status === 'in_progress' && <Clock className="w-3 h-3" />}
                        {ticket.status === 'resolved' && <CheckCircle2 className="w-3 h-3" />}
                        {ticket.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden md:table-cell font-mono text-[11px] text-neutral-500">
                      {new Date(ticket.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary dark:text-secondary rounded-lg text-[10px] font-bold transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isCreateOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-1 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-primary dark:text-secondary" />
              New Support Ticket
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Describe your issue and our team will review and respond promptly.
            </p>

            {createError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Subject */}
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">Subject *</label>
                <input
                  type="text"
                  required
                  value={createForm.subject}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief summary of your issue..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">Category</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">Detailed Message *</label>
                <textarea
                  required
                  rows={4}
                  value={createForm.message}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Describe the issue you are experiencing, steps to reproduce, and any error messages..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {createSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <Send className="w-3.5 h-3.5" />
                  {createSubmitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-modal-pop">
            {/* Header */}
            <div className="px-6 py-4 border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-low dark:bg-surface-container-high/40">
              <h3 className="font-headline font-bold text-base text-on-surface dark:text-white flex items-center gap-2">
                <MessageSquareText className="w-5 h-5 text-primary dark:text-secondary" />
                Ticket Details
              </h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Meta info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">Ticket ID</span>
                  <span className="font-mono font-bold text-on-surface dark:text-white">#{selectedTicket.id}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">Status</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(selectedTicket.status)}`}>
                    {selectedTicket.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">Category</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${getCategoryBadge(selectedTicket.category)}`}>
                    {selectedTicket.category.charAt(0).toUpperCase() + selectedTicket.category.slice(1)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-0.5">Submitted</span>
                  <span className="font-mono text-neutral-600 dark:text-neutral-400">
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Submitter Info (admin view) */}
              {isAdminOrManager && selectedTicket.first_name && (
                <div className="p-3 bg-primary/5 dark:bg-secondary/5 border border-primary/15 dark:border-secondary/15 rounded-2xl flex items-center gap-3 text-xs">
                  <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-on-surface dark:text-white">{selectedTicket.first_name} {selectedTicket.last_name}</span>
                    {selectedTicket.email && (
                      <span className="text-[10px] text-neutral-500 block font-mono">{selectedTicket.email}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Subject */}
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Subject</span>
                <p className="text-sm font-bold text-on-surface dark:text-white">{selectedTicket.subject}</p>
              </div>

              {/* Message */}
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">Message</span>
                <div className="p-4 bg-neutral-50 dark:bg-surface-container-high/40 border border-outline-variant/30 rounded-2xl text-xs text-on-surface dark:text-white/90 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-outline-variant/40 flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
