'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import * as XLSX from 'xlsx';
import {
  CalendarCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  User,
  Loader2,
  X,
  PlusCircle,
  CalendarDays,
  FileText,
  Ban,
  RotateCw,
  Inbox,
  FileSpreadsheet,
} from 'lucide-react';

interface Appointment {
  id: number;
  member_id: number;
  purpose: string;
  appointment_date: string;
  time_slot: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  // Joined fields for admin/manager view
  first_name?: string;
  last_name?: string;
  username?: string;
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { setBreadcrumbLabel } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbLabel('appointments', 'Appointments');
  }, [setBreadcrumbLabel]);

  // Redirect staff from appointments
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'staff';

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Data state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Action loading state
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Create appointment modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    purpose: 'Discuss a Loan Application',
    specific_reason: '',
    appointment_date: '',
    time_slot: '9:00 AM - 10:00 AM',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = isAdminOrManager ? '/appointments' : '/appointments/me';
      const res = await api.get(endpoint);

      if (res.data && res.data.success) {
        setAppointments(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError(err.response?.data?.error?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, [isAdminOrManager]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Update appointment status
  const handleStatusUpdate = async (appointmentId: number, newStatus: string) => {
    if (newStatus === 'cancelled' && !window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      setActionLoadingId(appointmentId);
      await api.patch(`/appointments/${appointmentId}/status`, { status: newStatus });
      await fetchAppointments();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update appointment status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Create appointment
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.appointment_date || !createForm.time_slot || !createForm.purpose) {
      setCreateError('All fields are required.');
      return;
    }

    let finalPurpose = createForm.purpose;
    if (createForm.purpose === 'Other / Specify Reason') {
      if (!createForm.specific_reason.trim()) {
        setCreateError('Please specify your specific reason for the appointment.');
        return;
      }
      finalPurpose = `Other: ${createForm.specific_reason.trim()}`;
    }

    // Prevent past dates
    const today = new Date().toISOString().split('T')[0];
    if (createForm.appointment_date < today) {
      setCreateError('Appointment date cannot be in the past.');
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateError(null);

      await api.post('/appointments', {
        purpose: finalPurpose,
        appointment_date: createForm.appointment_date,
        time_slot: createForm.time_slot,
      });

      setIsCreateOpen(false);
      setCreateForm({ purpose: 'Discuss a Loan Application', specific_reason: '', appointment_date: '', time_slot: '9:00 AM - 10:00 AM' });
      await fetchAppointments();
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || 'Failed to create appointment.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Filter logic
  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const memberName = `${apt.first_name || ''} ${apt.last_name || ''}`.toLowerCase();
      return (
        memberName.includes(q) ||
        apt.purpose.toLowerCase().includes(q) ||
        apt.time_slot.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Export to Excel handler
  const handleExportExcel = () => {
    const dataToExport = filteredAppointments.map((apt) => ({
      ID: apt.id,
      ...(isAdminOrManager ? { 'Member Name': `${apt.first_name || ''} ${apt.last_name || ''}`.trim() } : {}),
      Purpose: formatPurpose(apt.purpose),
      'Appointment Date': apt.appointment_date,
      'Time Slot': apt.time_slot,
      Status: apt.status.toUpperCase(),
      'Created At': new Date(apt.created_at).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Appointments');
    XLSX.writeFile(workbook, `Appointments_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Status badge styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200/50';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200/50';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200/50';
      case 'cancelled':
        return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800/40 dark:text-neutral-400 border-neutral-200/50';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'scheduled': return <CalendarCheck className="w-3 h-3" />;
      case 'completed': return <CheckCircle2 className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  // Purpose label formatting
  const formatPurpose = (purpose: string) => {
    return purpose.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Summary stats
  const statusCounts = {
    pending: appointments.filter(a => a.status === 'pending').length,
    scheduled: appointments.filter(a => a.status === 'scheduled').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  // Time slot options
  const timeSlots = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '1:00 PM - 2:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM',
  ];

  // Purpose options
  const purposeOptions = [
    { value: 'Discuss a Loan Application', label: 'Discuss a Loan Application' },
    { value: 'System Inquiries', label: 'System Inquiries' },
    { value: 'General Cooperative Inquiry', label: 'General Cooperative Inquiry' },
    { value: 'Other / Specify Reason', label: 'Other / Specify Reason' },
  ];

  return (
    <div className="space-y-6 animate-micro-elevate">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface dark:text-white flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-primary dark:text-secondary" />
            {isAdminOrManager ? 'Appointment Desk' : 'My Appointments'}
          </h1>
          <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            {isAdminOrManager
              ? 'Manage and process member appointment requests and scheduling queue.'
              : 'Schedule and track your coop consultation appointments.'}
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2">
          {/* Export Excel Button */}
          {filteredAppointments.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Download Excel Report"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
          )}

          {/* Create Appointment Button — Members */}
          {user?.role === 'member' && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Book Appointment
            </button>
          )}
        </div>
      </div>

      {/* Summary Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending', count: statusCounts.pending, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
          { label: 'Scheduled', count: statusCounts.scheduled, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', icon: CalendarCheck },
          { label: 'Completed', count: statusCounts.completed, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
          { label: 'Cancelled', count: statusCounts.cancelled, color: 'text-neutral-500 dark:text-neutral-400', bg: 'bg-neutral-500/10', icon: XCircle },
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
          <span>Filter:</span>
        </div>

        <div className="flex flex-wrap gap-2 flex-1">
          {['all', 'pending', 'scheduled', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                statusFilter === status
                  ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border-primary dark:border-secondary shadow-sm'
                  : 'bg-transparent text-neutral-600 dark:text-neutral-300 border-outline-variant/50 hover:bg-neutral/5 dark:hover:bg-neutral/10'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Search for admin/manager */}
        {isAdminOrManager && (
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by name or purpose..."
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
          <button onClick={fetchAppointments} className="ml-auto px-3 py-1 bg-tertiary/10 hover:bg-tertiary/20 rounded-lg font-bold transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <SkeletonTable rows={5} cols={isAdminOrManager ? 6 : 5} />
      ) : filteredAppointments.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
          <Inbox className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <h3 className="font-headline font-bold text-on-surface dark:text-white text-sm">
            {statusFilter !== 'all' ? `No ${statusFilter} appointments found.` : 'No appointments found.'}
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            {user?.role === 'member'
              ? 'Book your first appointment with the coop office.'
              : 'No member appointment requests in queue.'}
          </p>
        </div>
      ) : (
        /* Appointments Table */
        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low dark:bg-surface-container-high/55 border-b border-outline-variant/50">
                  {isAdminOrManager && (
                    <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Member</th>
                  )}
                  <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Purpose</th>
                  <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Date</th>
                  <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase hidden sm:table-cell">Time Slot</th>
                  <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Status</th>
                  <th className="px-4 sm:px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40 font-body text-xs text-on-surface dark:text-white/95">
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-neutral/5 transition-colors">
                    {isAdminOrManager && (
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary flex-shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-semibold">{apt.first_name} {apt.last_name}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary dark:text-secondary flex-shrink-0" />
                        <span className="font-semibold">{formatPurpose(apt.purpose)}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 font-mono text-xs">
                      {new Date(apt.appointment_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                        <Clock className="w-3 h-3" />
                        {apt.time_slot}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(apt.status)}`}>
                        {getStatusIcon(apt.status)}
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {actionLoadingId === apt.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary dark:text-secondary" />
                        ) : (
                          <>
                            {/* Member actions: Cancel only on pending/scheduled */}
                            {!isAdminOrManager && ['pending', 'scheduled'].includes(apt.status) && (
                              <button
                                onClick={() => handleStatusUpdate(apt.id, 'cancelled')}
                                className="px-2.5 py-1 bg-tertiary/10 hover:bg-tertiary/20 text-tertiary rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                                title="Cancel appointment"
                              >
                                <Ban className="w-3 h-3" />
                                Cancel
                              </button>
                            )}

                            {/* Admin/Manager actions: Status transitions */}
                            {isAdminOrManager && apt.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(apt.id, 'scheduled')}
                                  className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold transition-colors"
                                  title="Confirm and schedule"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(apt.id, 'cancelled')}
                                  className="px-2.5 py-1 bg-tertiary/10 hover:bg-tertiary/20 text-tertiary rounded-lg text-[10px] font-bold transition-colors"
                                  title="Reject appointment"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {isAdminOrManager && apt.status === 'scheduled' && (
                              <button
                                onClick={() => handleStatusUpdate(apt.id, 'completed')}
                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                                title="Mark as completed"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Complete
                              </button>
                            )}

                            {/* No actions for completed/cancelled */}
                            {['completed', 'cancelled'].includes(apt.status) && (
                              <span className="text-[10px] text-neutral-400 italic">—</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Appointment Modal (Members) */}
      {isCreateOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-1 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary dark:text-secondary" />
              Book Appointment
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Schedule a consultation visit to the UC METC Cooperative office.
            </p>

            {createError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Purpose */}
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">
                  Appointment Purpose *
                </label>
                <select
                  value={createForm.purpose}
                  onChange={(e) => setCreateForm(prev => ({
                    ...prev,
                    purpose: e.target.value,
                    specific_reason: e.target.value === 'Other / Specify Reason' ? prev.specific_reason : ''
                  }))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                >
                  {purposeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Specific Reason */}
              {createForm.purpose === 'Other / Specify Reason' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">
                    Specific Reason for Appointment *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={createForm.specific_reason}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, specific_reason: e.target.value }))}
                    placeholder="Please describe your specific reason or details for this appointment..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white placeholder:text-neutral-400"
                  />
                </div>
              )}

              {/* Date */}
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={createForm.appointment_date}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, appointment_date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              {/* Time Slot */}
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">
                  Preferred Time Slot *
                </label>
                <select
                  value={createForm.time_slot}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, time_slot: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
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
                  {createSubmitting ? 'Booking...' : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}