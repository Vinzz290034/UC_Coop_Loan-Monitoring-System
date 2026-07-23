'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import BackButton from '@/components/BackButton';
import api from '@/lib/api';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Filter,
  Info,
  AlertCircle,
  Clock,
  Briefcase,
  Megaphone,
  CreditCard,
  X,
  Loader2,
  CalendarDays,
  Sparkles
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_date: string; // YYYY-MM-DD
  type: 'announcement' | 'payment_deadline' | 'office_duty' | 'holiday' | 'special_schedule';
  status: string; // e.g. open, closed, active
  creator_name?: string;
  is_system: boolean;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { setBreadcrumbLabel } = useBreadcrumb();

  // Set breadcrumb title
  useEffect(() => {
    setBreadcrumbLabel('calendar', 'Calendar');
  }, [setBreadcrumbLabel]);

  // Calendar Date Navigation States
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // API State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [filters, setFilters] = useState({
    announcement: true,
    payment_deadline: true,
    office_duty: true,
    holiday: true,
    special_schedule: true
  });

  // Modal / Interactive States
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  // Event Management States (Admin/Manager only)
  const [isManaging, setIsManaging] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [formFields, setFormFields] = useState({
    title: '',
    description: '',
    type: 'announcement' as CalendarEvent['type'],
    status: 'open',
    event_date: ''
  });

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/calendar');
      if (res.data && res.data.success) {
        // Strip timezone suffix or parse accurately to local date
        const formattedEvents = res.data.data.map((evt: any) => {
          // Format date string to YYYY-MM-DD
          const d = new Date(evt.event_date);
          const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return {
            ...evt,
            event_date: localDateStr
          };
        });
        setEvents(formattedEvents);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch calendar events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Helpers for calendar rendering
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Event handlers for date switching
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const resetToToday = () => {
    setCurrentDate(new Date());
  };

  // Filter events based on type and filter settings
  const getFilteredEventsForDate = (dateStr: string) => {
    return events.filter(evt => {
      if (evt.event_date !== dateStr) return false;
      return filters[evt.type];
    });
  };

  // Open the day modal
  const handleDayClick = (dayNum: number) => {
    const clickedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayEvents = events.filter(evt => evt.event_date === clickedDateStr);

    setSelectedDateStr(clickedDateStr);
    setSelectedDayEvents(dayEvents);
    setShowDayModal(true);

    // Initialize creation form fields for that day
    setFormFields({
      title: '',
      description: '',
      type: 'announcement',
      status: 'open',
      event_date: clickedDateStr
    });
    setEditingEventId(null);
    setIsManaging(false);
  };

  // Add or Edit event (Admin/Manager API call)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.title.trim() || !formFields.event_date) return;

    try {
      setActionLoading(true);
      if (editingEventId) {
        // Edit event
        const res = await api.put(`/calendar/${editingEventId}`, formFields);
        if (res.data && res.data.success) {
          await fetchEvents();
          // Update active events list for modal
          const updatedEvents = events.map(evt =>
            evt.id === editingEventId
              ? { ...evt, ...formFields }
              : evt
          );
          setSelectedDayEvents(updatedEvents.filter(evt => evt.event_date === selectedDateStr));
          setIsManaging(false);
          setEditingEventId(null);
        }
      } else {
        // Create event
        const res = await api.post('/calendar', formFields);
        if (res.data && res.data.success) {
          await fetchEvents();
          // Refresh local modal list
          const newEvent = {
            ...res.data.data,
            event_date: formFields.event_date
          };
          setSelectedDayEvents(prev => [...prev, newEvent]);
          setIsManaging(false);
        }
      }

      // Reset input form titles
      setFormFields(prev => ({
        ...prev,
        title: '',
        description: '',
        status: 'open'
      }));
    } catch (err) {
      console.error(err);
      alert('Error updating event details.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete event (Admin/Manager API call)
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      setActionLoading(true);
      const res = await api.delete(`/calendar/${eventId}`);
      if (res.data && res.data.success) {
        await fetchEvents();
        // Remove from current modal display
        setSelectedDayEvents(prev => prev.filter(evt => evt.id !== eventId));
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting event.');
    } finally {
      setActionLoading(false);
    }
  };

  // Populate Edit form fields
  const startEditEvent = (evt: CalendarEvent) => {
    setEditingEventId(evt.id);
    setFormFields({
      title: evt.title,
      description: evt.description || '',
      type: evt.type,
      status: evt.status,
      event_date: evt.event_date
    });
    setIsManaging(true);
  };

  // Style tags/badges based on type
  const getBadgeStyles = (type: CalendarEvent['type'], status?: string) => {
    switch (type) {
      case 'announcement':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200/50';
      case 'payment_deadline':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200/50';
      case 'office_duty':
        return status === 'closed'
          ? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300 border-neutral-300'
          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200/50';
      case 'holiday':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200/50';
      case 'special_schedule':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200/50';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200';
    }
  };

  // Render events dots on cells
  const getDotColorClass = (type: CalendarEvent['type'], status?: string) => {
    switch (type) {
      case 'announcement': return 'bg-blue-500';
      case 'payment_deadline': return 'bg-red-500';
      case 'office_duty': return status === 'closed' ? 'bg-neutral-400' : 'bg-emerald-500';
      case 'holiday': return 'bg-amber-500';
      case 'special_schedule': return 'bg-purple-500';
      default: return 'bg-neutral-400';
    }
  };

  // Helper to format Date string
  const formatReadableDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Generate calendar grid array
  const calendarCells = [];

  // Previous Month's trailing days
  const prevMonthDate = new Date(year, month, 0);
  const prevMonthDays = prevMonthDate.getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      dayNum: prevMonthDays - i,
      isCurrentMonth: false,
      dateStr: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`
    });
  }

  // Active Month days
  const todayStr = new Date().toISOString().split('T')[0];
  for (let i = 1; i <= daysInMonth; i++) {
    const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarCells.push({
      dayNum: i,
      isCurrentMonth: true,
      dateStr: cellDateStr,
      isToday: cellDateStr === todayStr
    });
  }

  // Next Month's leading days to fill grid of 42 cells (6 rows of 7)
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      dayNum: i,
      isCurrentMonth: false,
      dateStr: `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-surface-container-low p-6 rounded-3xl border border-outline-variant/50 shadow-sm transition-all">
        <div>
          <h1 className="font-headline text-2xl font-black text-on-surface dark:text-white flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-primary dark:text-secondary" />
            Calendar & Event Scheduler
          </h1>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mt-1">
            Track coop announcements, office hours, and your payment schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetToToday}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-outline-variant/60 hover:bg-neutral/5 dark:hover:bg-neutral/10 text-neutral-800 dark:text-neutral-200 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center rounded-xl border border-outline-variant/60 overflow-hidden">
            <button
              onClick={prevMonth}
              className="p-2.5 hover:bg-neutral/5 dark:hover:bg-neutral/10 text-neutral-700 dark:text-neutral-300 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-4 text-xs font-black text-on-surface dark:text-white min-w-[120px] text-center bg-neutral/5 dark:bg-neutral/15 font-headline">
              {monthNames[month]} {year}
            </div>
            <button
              onClick={nextMonth}
              className="p-2.5 hover:bg-neutral/5 dark:hover:bg-neutral/10 text-neutral-700 dark:text-neutral-300 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid + Filter Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-surface-container-low p-6 rounded-3xl border border-outline-variant/50 shadow-sm h-fit space-y-6">
          <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white flex items-center gap-2 pb-3 border-b border-outline-variant/45">
            <Filter className="w-4 h-4 text-primary dark:text-secondary" />
            Event Filters
          </h3>

          <div className="space-y-3.5">
            {/* System Announcement Filter */}
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={filters.announcement}
                onChange={() => setFilters(prev => ({ ...prev, announcement: !prev.announcement }))}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-outline-variant/80 dark:bg-surface-container-high dark:border-outline-variant/40"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 group-hover:text-primary dark:group-hover:text-secondary transition-colors">
                Announcements
              </span>
            </label>

            {/* Payment Deadline Filter */}
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={filters.payment_deadline}
                onChange={() => setFilters(prev => ({ ...prev, payment_deadline: !prev.payment_deadline }))}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-outline-variant/80 dark:bg-surface-container-high dark:border-outline-variant/40"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 group-hover:text-primary dark:group-hover:text-secondary transition-colors">
                Payment Deadlines
              </span>
            </label>

            {/* Office Duty Status Filter */}
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={filters.office_duty}
                onChange={() => setFilters(prev => ({ ...prev, office_duty: !prev.office_duty }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-outline-variant/80 dark:bg-surface-container-high dark:border-outline-variant/40"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 group-hover:text-primary dark:group-hover:text-secondary transition-colors">
                Office Open status
              </span>
            </label>

            {/* Holidays Filter */}
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={filters.holiday}
                onChange={() => setFilters(prev => ({ ...prev, holiday: !prev.holiday }))}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-outline-variant/80 dark:bg-surface-container-high dark:border-outline-variant/40"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 group-hover:text-primary dark:group-hover:text-secondary transition-colors">
                Holidays
              </span>
            </label>

            {/* Special Schedules Filter */}
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <input
                type="checkbox"
                checked={filters.special_schedule}
                onChange={() => setFilters(prev => ({ ...prev, special_schedule: !prev.special_schedule }))}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-outline-variant/80 dark:bg-surface-container-high dark:border-outline-variant/40"
              />
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 group-hover:text-primary dark:group-hover:text-secondary transition-colors">
                Special Schedules
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-outline-variant/35 rounded-xl bg-primary/5 dark:bg-secondary/5 p-4 space-y-2">
            <h4 className="text-xs font-black text-primary dark:text-secondary flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Quick Info
            </h4>
            <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Click on any day in the grid calendar to view detailed events, schedule loan appointments, or post custom notices (Admins).
            </p>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="lg:col-span-3 bg-white dark:bg-surface-container-low p-6 rounded-3xl border border-outline-variant/50 shadow-sm transition-all">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-3">
              <Loader2 className="w-10 h-10 text-primary dark:text-secondary animate-spin" />
              <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Loading events...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-2.5">
              <AlertCircle className="w-12 h-12 text-tertiary" />
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{error}</p>
              <button
                onClick={fetchEvents}
                className="px-4 py-2 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-xs rounded-xl"
              >
                Retry Loading
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {daysOfWeek.map(d => (
                  <div
                    key={d}
                    className="text-center text-xs font-black text-neutral-500 dark:text-neutral-400 py-2 select-none"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-1 md:gap-2 select-none">
                {calendarCells.map((cell, idx) => {
                  const dayEvents = getFilteredEventsForDate(cell.dateStr);

                  return (
                    <div
                      key={idx}
                      onClick={() => handleDayClick(cell.dayNum)}
                      className={`min-h-[72px] md:min-h-[96px] p-1.5 md:p-2 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer relative group ${cell.isCurrentMonth
                        ? 'bg-surface dark:bg-surface-container-high/40 hover:bg-primary/5 dark:hover:bg-secondary/5 border-outline-variant/30 dark:border-outline-variant/10'
                        : 'bg-neutral-50 dark:bg-neutral-950/20 text-neutral-400 border-outline-variant/15 dark:border-outline-variant/5 hover:opacity-75'
                        } ${cell.isToday ? 'ring-2 ring-primary dark:ring-secondary ring-offset-2 dark:ring-offset-neutral-900' : ''}`}
                    >
                      {/* Day Number */}
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-xs font-black p-1 rounded-lg ${cell.isToday
                            ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-black'
                            : 'text-neutral-700 dark:text-neutral-300'
                            }`}
                        >
                          {cell.dayNum}
                        </span>

                        {cell.isToday && (
                          <span className="text-[9px] uppercase tracking-wider text-primary dark:text-secondary font-black hidden md:inline-flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                            Today
                          </span>
                        )}
                      </div>

                      {/* Event badges on desktop view */}
                      <div className="hidden md:flex flex-col gap-1 mt-1 overflow-y-auto max-h-[50px] scrollbar-thin">
                        {dayEvents.slice(0, 3).map((evt) => (
                          <div
                            key={evt.id}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate border ${getBadgeStyles(evt.type, evt.status)}`}
                          >
                            {evt.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[8px] font-black text-neutral-400 pl-1">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>

                      {/* Event dots on mobile view */}
                      <div className="flex md:hidden flex-row gap-1 flex-wrap mt-2">
                        {dayEvents.map(evt => (
                          <span
                            key={evt.id}
                            className={`w-1.5 h-1.5 rounded-full ${getDotColorClass(evt.type, evt.status)}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Day Events Details Modal */}
      {showDayModal && (
        <div key={selectedDateStr || 'day-modal'} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-modal-backdrop">
          <div key={`card-${selectedDateStr || 'day-modal'}`} className="bg-white dark:bg-surface-container bg-surface rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-outline-variant/60 flex flex-col max-h-[90vh] animate-modal-pop">
            {/* Modal Header */}
            <div className="p-5 border-b border-outline-variant/50 flex justify-between items-center bg-primary/5 dark:bg-secondary/5">
              <div>
                <h3 className="font-headline text-md font-black text-on-surface dark:text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary dark:text-secondary" />
                  {formatReadableDate(selectedDateStr)}
                </h3>
              </div>
              <button
                onClick={() => setShowDayModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Event Listings */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                  Scheduled Events
                </h4>

                {selectedDayEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 border border-dashed border-outline-variant/60 rounded-2xl text-center p-4">
                    <Clock className="w-8 h-8 text-neutral-400 mb-2" />
                    <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">No events or deadlines for this day.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayEvents.map(evt => (
                      <div
                        key={evt.id}
                        className="p-4 rounded-2xl border border-outline-variant/35 bg-surface-container-low dark:bg-surface-container-high/40 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black text-on-surface dark:text-white">
                                {evt.title}
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getBadgeStyles(evt.type, evt.status)}`}>
                                {evt.type.replace('_', ' ')}
                              </span>
                            </div>
                            {evt.description && (
                              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300 leading-relaxed pt-1">
                                {evt.description}
                              </p>
                            )}
                            {evt.creator_name && (
                              <p className="text-[10px] font-bold text-neutral-400 pt-1">
                                Posted by: {evt.creator_name}
                              </p>
                            )}
                          </div>

                          {isAdminOrManager && evt.is_system && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => startEditEvent(evt)}
                                className="p-1.5 rounded-lg border border-outline-variant/60 hover:bg-neutral/5 text-neutral-600 dark:text-neutral-300 transition-colors"
                                title="Edit Event"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(evt.id)}
                                className="p-1.5 rounded-lg border border-outline-variant/60 hover:bg-tertiary/10 text-tertiary transition-colors"
                                title="Delete Event"
                                disabled={actionLoading}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin/Manager Event Form Toggle button */}
              {isAdminOrManager && !isManaging && (
                <button
                  onClick={() => {
                    setIsManaging(true);
                    setEditingEventId(null);
                    setFormFields({
                      title: '',
                      description: '',
                      type: 'announcement',
                      status: 'open',
                      event_date: selectedDateStr || ''
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-primary/40 dark:border-secondary/40 text-primary dark:text-secondary bg-primary/5 dark:bg-secondary/5 rounded-2xl text-xs font-bold hover:bg-primary/10 dark:hover:bg-secondary/10 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Event or Modify Office Schedule
                </button>
              )}

              {/* Event Editor Form (Admin/Manager) */}
              {isAdminOrManager && isManaging && (
                <form onSubmit={handleSaveEvent} className="p-5 border border-outline-variant/65 rounded-2xl space-y-4 bg-neutral/5 dark:bg-neutral/10">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                    <h5 className="text-xs font-black text-on-surface dark:text-white flex items-center gap-1.5">
                      {editingEventId ? 'Edit Calendar Entry' : 'Create Calendar Entry'}
                    </h5>
                    <button
                      type="button"
                      onClick={() => setIsManaging(false)}
                      className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                        Event Title / Header
                      </label>
                      <input
                        type="text"
                        required
                        value={formFields.title}
                        onChange={e => setFormFields(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Christmas Day, System Upgrade Maintenance"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-surface-container-high rounded-xl border border-outline-variant/80 dark:border-outline-variant/40 focus:ring-1 focus:ring-primary dark:focus:ring-secondary text-xs font-medium text-on-surface dark:text-white"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                        Description / Details (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={formFields.description}
                        onChange={e => setFormFields(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Provide details about the schedule, timing, or links..."
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-surface-container-high rounded-xl border border-outline-variant/80 dark:border-outline-variant/40 focus:ring-1 focus:ring-primary dark:focus:ring-secondary text-xs font-medium text-on-surface dark:text-white resize-none"
                      />
                    </div>

                    {/* Type and Status Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Event Type */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                          Category Type
                        </label>
                        <select
                          value={formFields.type}
                          onChange={e => {
                            const val = e.target.value as CalendarEvent['type'];
                            setFormFields(prev => ({
                              ...prev,
                              type: val,
                              status: val === 'office_duty' ? 'open' : 'active'
                            }));
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-surface-container-high rounded-xl border border-outline-variant/80 dark:border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white"
                        >
                          <option value="announcement">Announcement</option>
                          <option value="office_duty">Office duty status</option>
                          <option value="holiday">Holiday</option>
                          <option value="special_schedule">Special schedule</option>
                        </select>
                      </div>

                      {/* Status (especially relevant for office duty) */}
                      {formFields.type === 'office_duty' ? (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                            Office Status
                          </label>
                          <select
                            value={formFields.status}
                            onChange={e => setFormFields(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-3 py-2 bg-white dark:bg-surface-container-high rounded-xl border border-outline-variant/80 dark:border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white"
                          >
                            <option value="open">Open / On Duty</option>
                            <option value="closed">Closed / No Operations</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                            Status state
                          </label>
                          <select
                            value={formFields.status}
                            onChange={e => setFormFields(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-3 py-2 bg-white dark:bg-surface-container-high rounded-xl border border-outline-variant/80 dark:border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Draft / Hidden</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsManaging(false)}
                      className="px-4 py-2 border border-outline-variant/60 rounded-xl text-neutral-700 dark:text-neutral-200 text-xs font-bold hover:bg-neutral/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-xl text-xs font-bold hover:opacity-90 flex items-center gap-1.5"
                    >
                      {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {editingEventId ? 'Update Event' : 'Save Event'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-outline-variant/40 bg-neutral-50 dark:bg-neutral-950/20 flex justify-end">
              <button
                onClick={() => setShowDayModal(false)}
                className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-2xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
