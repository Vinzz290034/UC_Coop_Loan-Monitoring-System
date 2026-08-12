'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import * as XLSX from 'xlsx';
import {
  MessageSquare,
  Search,
  Mail,
  User,
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  MailOpen,
  Inbox,
  X,
  RotateCw,
  Plus,
  HelpCircle,
  ShieldAlert,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';

interface ContactMessage {
  id: string;
  full_name: string;
  email: string;
  message_content: string;
  status: 'unread' | 'read' | 'resolved';
  created_at: string;
  resolved_at: string | null;
}

const STATUS_CONFIG = {
  unread: { label: 'Unread', color: 'bg-tertiary/10 text-tertiary border-tertiary/20', dot: 'bg-tertiary' },
  read: { label: 'Read', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  resolved: { label: 'Resolved', color: 'bg-primary/10 text-primary dark:text-secondary border-primary/20 dark:border-secondary/20', dot: 'bg-primary dark:bg-secondary' },
};

function StatusBadge({ status }: { status: 'unread' | 'read' | 'resolved' }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  // Admin Reply States
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  // Member Inquiry States
  const [isNewInquiryOpen, setIsNewInquiryOpen] = useState(false);
  const [inquiryContent, setInquiryContent] = useState('');
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // FIXED: Moved useRef to the top level of the component with other hooks
  const replyPanelRef = useRef<HTMLDivElement>(null);

  const isMember = user?.role === 'member';

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await api.get(`/auth/contact-messages?${params.toString()}`);
      setMessages(res.data.data || []);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: { message?: string } } } };
      setError(errorObj.response?.data?.error?.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [fetchMessages, user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Admin Actions
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingStatus(id);
    try {
      await api.put(`/auth/contact-messages/${id}`, { status: newStatus });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus as ContactMessage['status'] } : m))
      );
      if (selectedMessage?.id === id) {
        setSelectedMessage((prev) => prev ? { ...prev, status: newStatus as ContactMessage['status'] } : null);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: { message?: string } } } };
      setError(errorObj.response?.data?.error?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim()) return;
    setReplying(true);
    setError(null);
    try {
      await api.post(`/auth/contact-messages/${selectedMessage.id}/reply`, {
        reply_content: replyContent.trim(),
      });
      setReplySuccess(true);
      setReplyContent('');
      setMessages((prev) =>
        prev.map((m) => (m.id === selectedMessage.id ? { ...m, status: 'resolved' } : m))
      );
      setSelectedMessage((prev) => prev ? { ...prev, status: 'resolved' } : null);
      setTimeout(() => setReplySuccess(false), 3000);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: { message?: string } } } };
      setError(errorObj.response?.data?.error?.message || 'Failed to send reply.');
    } finally {
      setReplying(false);
    }
  };

  // Member Action: Submit Message
  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryContent.trim()) return;
    setSendingInquiry(true);
    setError(null);
    try {
      const name = user.profile
        ? `${user.profile.first_name} ${user.profile.last_name}`
        : user.username || 'Coop Member';
      const email = user.profile?.email || '';

      await api.post('/auth/contact', {
        full_name: name,
        email: email,
        message_content: inquiryContent.trim(),
      });

      setInquiryContent('');
      setIsNewInquiryOpen(false);
      setInquirySuccess(true);
      setTimeout(() => setInquirySuccess(false), 4000);
      fetchMessages();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: { message?: string } } } };
      setError(errorObj.response?.data?.error?.message || 'Failed to submit inquiry.');
    } finally {
      setSendingInquiry(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const dataToExport = messages.map((m) => ({
      ID: m.id,
      'Full Name': m.full_name,
      Email: m.email,
      Message: m.message_content,
      Status: m.status,
      'Date Submitted': formatDate(m.created_at),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contact Messages');
    XLSX.writeFile(workbook, `Contact_Messages_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleOpenMessage = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setReplyContent('');
    setReplySuccess(false);
    setError(null);

    if (!isMember && msg.status === 'unread') {
      handleUpdateStatus(msg.id, 'read');
    }

    setTimeout(() => {
      replyPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const tabs = [
    { key: '', label: 'All', count: messages.length },
    { key: 'unread', label: 'Unread' },
    { key: 'read', label: 'Read' },
    { key: 'resolved', label: 'Resolved' },
  ];

  const unreadCount = messages.filter((m) => m.status === 'unread').length;

  return (
    <div className="space-y-6 animate-micro-elevate">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface dark:text-white flex items-center gap-2.5">

            {isMember ? 'Support messages' : 'Contact Messages'}
          </h1>
          <p className="font-body text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-13">
            {isMember
              ? 'Send inquiries or request support from the cooperative management.'
              : 'Manage and respond to public inquiries from the contact form.'}
          </p>
        </div>

        {isMember ? (
          <button
            onClick={() => setIsNewInquiryOpen(true)}
            className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Compose Message
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            {unreadCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/20 text-xs font-bold">
                <Inbox className="w-3.5 h-3.5" />
                {unreadCount} unread
              </div>
            )}
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
          </div>
        )}
      </div>

      {/* Success notification banner for member */}
      {inquirySuccess && (
        <div className="p-4 bg-primary/15 dark:bg-secondary/15 border border-primary/30 dark:border-secondary/30 rounded-2xl text-xs font-bold text-primary dark:text-secondary flex items-center gap-2.5 animate-micro-elevate">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Message submitted successfully! The cooperative management has been notified and will reply to your registered email.
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Message List Panel */}
        <div className="flex-1 min-w-0">
          {/* Search & Filters */}
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-4 space-y-3 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isMember ? "Search inquiry content..." : "Search by name, email or content..."}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-surface border border-outline-variant rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white placeholder:text-neutral-400"
              />
            </div>

            <div className="flex gap-1 flex-wrap items-center">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${statusFilter === tab.key
                    ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral/5 dark:hover:bg-neutral/10'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                onClick={fetchMessages}
                className="ml-auto p-2 rounded-xl text-neutral-450 hover:text-primary dark:hover:text-secondary hover:bg-neutral/5 transition-colors cursor-pointer"
                title="Refresh"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Message List */}
          <div className="mt-3 space-y-2.5">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-3 border-neutral-200 border-t-primary dark:border-neutral-700 dark:border-t-secondary animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-12 flex flex-col items-center gap-3 text-neutral-400 dark:text-neutral-500 shadow-sm">
                <Inbox className="w-10 h-10 opacity-30" />
                <p className="text-sm font-semibold">No messages found</p>
                <p className="text-xs">
                  {isMember
                    ? "You haven't submitted any messages yet. Click 'Compose Message' to start."
                    : "Contact form submissions will appear here."}
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleOpenMessage(msg)}
                  className={`w-full text-left bg-white dark:bg-surface-container-low border rounded-3xl p-5 transition-all hover:shadow-md cursor-pointer ${selectedMessage?.id === msg.id
                    ? 'border-primary dark:border-secondary ring-2 ring-primary/10 dark:ring-secondary/10'
                    : 'border-outline-variant/65 hover:border-primary/30 dark:hover:border-secondary/30'
                    } ${msg.status === 'unread' ? 'bg-primary/1 dark:bg-secondary/1' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${msg.status === 'unread'
                        ? 'bg-tertiary/10 text-tertiary'
                        : msg.status === 'read'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary'
                        }`}>
                        {msg.status === 'unread' ? <Mail className="w-4.5 h-4.5" /> : <MailOpen className="w-4.5 h-4.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-sm truncate ${msg.status === 'unread' ? 'font-bold text-on-surface dark:text-white' : 'font-semibold text-neutral-700 dark:text-neutral-200'}`}>
                          {isMember ? 'Support Request Inquiry' : msg.full_name}
                        </h4>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {msg.email}
                        </p>
                        <p className="text-xs text-neutral-450 dark:text-neutral-450 mt-2 line-clamp-1 leading-relaxed">
                          {msg.message_content}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge status={msg.status} />
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold whitespace-nowrap">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:w-105 shrink-0">
          {selectedMessage ? (
            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl overflow-hidden sticky top-6 shadow-md animate-micro-elevate">
              <div className="px-5 py-4.5 border-b border-outline-variant/40 flex items-center justify-between">
                <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white">Message Details</h3>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[calc(100vh-300px)] overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface dark:text-white">{selectedMessage.full_name}</h4>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{selectedMessage.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={selectedMessage.status} />
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(selectedMessage.created_at)}
                    </span>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-surface rounded-2xl p-4 border border-outline-variant/30 space-y-1">
                  <span className="text-[8px] uppercase tracking-wider text-neutral-400 font-bold font-label block">Inquiry Body</span>
                  <p className="text-xs text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap font-body">
                    {selectedMessage.message_content}
                  </p>
                </div>

                {!isMember ? (
                  <>
                    <div className="flex gap-2">
                      {selectedMessage.status !== 'read' && selectedMessage.status !== 'resolved' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedMessage.id, 'read')}
                          disabled={updatingStatus === selectedMessage.id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl hover:bg-amber-500/25 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Mark as Read
                        </button>
                      )}
                      {selectedMessage.status !== 'resolved' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedMessage.id, 'resolved')}
                          disabled={updatingStatus === selectedMessage.id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold text-primary dark:text-secondary bg-primary/10 dark:bg-secondary/10 border border-primary/20 dark:border-secondary/20 rounded-xl hover:bg-primary/20 dark:hover:bg-secondary/20 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                        </button>
                      )}
                    </div>

                    <div className="border-t border-outline-variant/30 pt-4 space-y-3" ref={replyPanelRef}>
                      <h4 className="text-[10px] font-bold text-on-surface dark:text-white uppercase tracking-wider font-label">Reply to Inquirer</h4>

                      {error && (
                        <div className="p-3 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-xl text-[11px] font-bold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          {error}
                        </div>
                      )}

                      {replySuccess && (
                        <div className="p-3 bg-primary/10 dark:bg-secondary/10 border border-primary/20 dark:border-secondary/20 text-primary dark:text-secondary rounded-xl text-[11px] font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          Reply sent successfully and message resolved.
                        </div>
                      )}

                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={4}
                        placeholder="Type your reply..."
                        className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-surface border border-outline-variant rounded-2xl text-xs font-body outline-none focus:ring-2 focus:ring-primary/20 resize-none text-on-surface dark:text-white"
                      />
                      <button
                        onClick={handleReply}
                        disabled={replying || !replyContent.trim()}
                        className="w-full py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-xs font-bold rounded-2xl shadow hover:-translate-y-px active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Reply
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="border-t border-outline-variant/30 pt-4 space-y-3">
                    {selectedMessage.status === 'resolved' ? (
                      <div className="bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-2xl p-4.5 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-primary dark:text-secondary font-label uppercase">
                          <CheckCircle2 className="w-4.5 h-4.5" /> Response Submitted
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed font-body">
                          An official response has been emailed to your registered email: <strong>{selectedMessage.email}</strong>.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-neutral-50 dark:bg-surface border border-outline-variant/40 rounded-2xl p-4.5 space-y-2 flex items-start gap-2.5">
                        <HelpCircle className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-bold text-neutral-600 dark:text-neutral-300 text-xs">Ticket Under Review</h5>
                          <p className="text-[11px] text-neutral-500 leading-normal mt-1">
                            Cooperative management has received your inquiry and is currently reviewing it.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-neutral-400 dark:text-neutral-500 sticky top-6 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 opacity-30" />
              </div>
              <p className="text-sm font-semibold text-center">Select a message</p>
              <p className="text-xs text-center">Click on a message to view details and reply.</p>
            </div>
          )}
        </div>
      </div>

      {/* MEMBER NEW INQUIRY MODAL */}
      {isNewInquiryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative">
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30 mb-4">
              <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> Compose Support Message
              </h3>
              <button
                onClick={() => { setIsNewInquiryOpen(false); setInquiryContent(''); setError(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 text-neutral-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendInquiry} className="space-y-4 text-xs">
              {error && (
                <div className="p-3.5 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-[11px] font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-600 uppercase tracking-wider font-label text-[9px]">Sender Name</label>
                  <input
                    type="text"
                    disabled
                    value={user.profile ? `${user.profile.first_name} ${user.profile.last_name}` : user.username}
                    className="w-full px-3.5 py-2.5 bg-neutral-100 dark:bg-surface border border-outline-variant rounded-xl font-semibold text-neutral-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-neutral-600 uppercase tracking-wider font-label text-[9px]">Registered Email</label>
                  <input
                    type="text"
                    disabled
                    value={user.profile?.email || 'N/A'}
                    className="w-full px-3.5 py-2.5 bg-neutral-100 dark:bg-surface border border-outline-variant rounded-xl font-semibold text-neutral-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-600 uppercase tracking-wider font-label text-[9px]">Message *</label>
                <textarea
                  required
                  value={inquiryContent}
                  onChange={(e) => setInquiryContent(e.target.value)}
                  rows={6}
                  placeholder="Type your support message here..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary outline-none font-semibold text-on-surface dark:text-white resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => { setIsNewInquiryOpen(false); setInquiryContent(''); setError(null); }}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingInquiry || !inquiryContent.trim()}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  {sendingInquiry ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}