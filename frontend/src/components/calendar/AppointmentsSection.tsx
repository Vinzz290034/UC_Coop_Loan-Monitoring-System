'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { SkeletonTable } from '@/components/ui/Skeleton';
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
  FileText,
  Ban,
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
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface AppointmentsSectionProps {
  onPendingCountChange?: (count: number) => void;
}

export default function AppointmentsSection({ onPendingCountChange }: AppointmentsSectionProps) {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'staff';

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
        const data: Appointment[] = res.data.data || [];
        setAppointments(data);
        const pending = data.filter((a) => a.status === 'pending').length;
        if (onPendingCountChange) {
          onPendingCountChange(pending);
        }
      }
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError(err.response?.data?.error?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, [isAdminOrManager, onPendingCountChange]);

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
      setCreateForm({
        purpose: 'Discuss a Loan Application',
        specific_reason: '',
        appointment_date: '',
        time_slot: '9:00 AM - 10:00 AM',
      });
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
    if (filteredAppointments.length === 0) {
      alert('No appointments available to export.');
      return;
    }

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
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'scheduled':
        return <CalendarCheck className="w-3 h-3" />;
      case 'completed':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'cancelled':
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const formatPurpose = (purpose: string) => {
    return purpose.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const statusCounts = {
    pending: appointments.filter((a) => a.status === 'pending').length,
    scheduled: appointments.filter((a) => a.status === 'scheduled').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  };

  const timeSlots = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '1:00 PM - 2:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM',
  ];

  const purposeOptions = [
    { value: 'Discuss a Loan Application', label: 'Discuss a Loan Application' },
    { value: 'System Inquiries', label: 'System Inquiries' },
    { value: 'General Cooperative Inquiry', label: 'General Cooperative Inquiry' },
    { value: 'Other / Specify Reason', label: 'Other / Specify Reason' },
  ];

  return (
    <div className="space-y-6">
      {/* Action Buttons Header */}
      {(filteredAppointments.length > 0 || user?.role === 'member') && (
        <div className="flex items-center justify-end gap-2">
          {filteredAppointments.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Download Excel Report"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          )}

          {user?.role === 'member' && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          )}
        </div>
      )}

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
            onClick={() => setStatusFilter(statusFilter === stat.label.toLowerCase() ? 'all' : stat.label.toLowerCase())}
            className={`p-4 bg-white dark:bg-surface-container-low border rounded-3xl shadow-sm flex items-center gap-4 cursor-pointer transition-all hover:shadow-md ${
              statusFilter === stat.label.toLowerCase()
                ? 'border-primary dark:border-secondary ring-2 ring-primary/20'
                : 'border-outline-variant/60'
            }`}
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
          <span>Status Filter:</span>
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
              {status === 'all' ? 'All Records' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {isAdminOrManager && (
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search member or purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-60 pl-9 pr-3 py-2 text-xs border border-outline-variant/60 rounded-xl bg-white dark:bg-surface-container-high focus:ring-1 focus:ring-primary dark:focus:ring-secondary outline-none text-on-surface dark:text-white"
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

      {/* Table / Content State */}
      {loading ? (
        <SkeletonTable rows={5} cols={isAdminOrManager ? 6 : 5} />
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
          <Inbox className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <h3 className="font-headline font-bold text-on-surface dark:text-white text-sm">
            {statusFilter !== 'all' ? `No ${statusFilter} appointments found.` : 'No appointments recorded yet.'}
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            {user?.role === 'member'
              ? 'Click "Book Appointment" above to schedule a consultation with the coop officers.'
              : 'No member appointment requests match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm p-1.5">
          <div className="overflow-x-auto custom-scrollbar">
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
                            {!isAdminOrManager && ['pending', 'scheduled'].includes(apt.status) && (
                              <button
                                onClick={() => handleStatusUpdate(apt.id, 'cancelled')}
                                className="px-2.5 py-1 bg-tertiary/10 hover:bg-tertiary/20 text-tertiary rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Cancel appointment"
                              >
                                <Ban className="w-3 h-3" />
                                Cancel
                              </button>
                            )}

                            {isAdminOrManager && apt.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(apt.id, 'scheduled')}
                                  className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                  title="Confirm and schedule"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(apt.id, 'cancelled')}
                                  className="px-2.5 py-1 bg-tertiary/10 hover:bg-tertiary/20 text-tertiary rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                  title="Reject appointment"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {isAdminOrManager && apt.status === 'scheduled' && (
                              <button
                                onClick={() => handleStatusUpdate(apt.id, 'completed')}
                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Mark as completed"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Complete
                              </button>
                            )}

                            {['completed', 'cancelled'].includes(apt.status) && (
                              <span className="text-[11px] text-neutral-400 italic">No action needed</span>
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

      {/* Booking Modal for Members */}
      {isCreateOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-modal-pop">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-primary/10 dark:bg-secondary/15 flex items-center justify-center text-primary dark:text-secondary">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-base text-on-surface dark:text-white">
                    Book an Appointment
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Select your preferred schedule and reason for consultation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl flex items-center gap-2 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Consultation Purpose *
                </label>
                <select
                  value={createForm.purpose}
                  onChange={(e) => setCreateForm({ ...createForm, purpose: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs border border-outline-variant/60 rounded-xl bg-white dark:bg-surface-container-high outline-none focus:ring-1 focus:ring-primary dark:focus:ring-secondary text-on-surface dark:text-white font-medium"
                >
                  {purposeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {createForm.purpose === 'Other / Specify Reason' && (
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Please Specify Reason *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Briefly describe what you would like to discuss..."
                    value={createForm.specific_reason}
                    onChange={(e) => setCreateForm({ ...createForm, specific_reason: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-outline-variant/60 rounded-xl bg-white dark:bg-surface-container-high outline-none focus:ring-1 focus:ring-primary dark:focus:ring-secondary text-on-surface dark:text-white font-medium resize-none"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={createForm.appointment_date}
                    onChange={(e) => setCreateForm({ ...createForm, appointment_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-outline-variant/60 rounded-xl bg-white dark:bg-surface-container-high outline-none focus:ring-1 focus:ring-primary dark:focus:ring-secondary text-on-surface dark:text-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Preferred Time Slot *
                  </label>
                  <select
                    value={createForm.time_slot}
                    onChange={(e) => setCreateForm({ ...createForm, time_slot: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs border border-outline-variant/60 rounded-xl bg-white dark:bg-surface-container-high outline-none focus:ring-1 focus:ring-primary dark:focus:ring-secondary text-on-surface dark:text-white font-medium"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createSubmitting}
                  className="px-4 py-2 border border-outline-variant/60 rounded-full text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Appointment</span>
                  )}
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
