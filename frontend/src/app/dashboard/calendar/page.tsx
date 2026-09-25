'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import BackButton from '@/components/BackButton';
import AppointmentsSection from '@/components/calendar/AppointmentsSection';
import api from '@/lib/api';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Filter,
  AlertCircle,
  Clock,
  Briefcase,
  Megaphone,
  CreditCard,
  X,
  Loader2,
  CalendarDays,
  CalendarClock,
  Sparkles,
  CalendarCheck,
  PlusCircle,
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

function CalendarPageContent() {
  const { user } = useAuth();
  const { setBreadcrumbLabel } = useBreadcrumb();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'calendar' | 'appointments'>(
    tabParam === 'appointments' ? 'appointments' : 'calendar'
  );
  const [pendingAppointmentsCount, setPendingAppointmentsCount] = useState(0);

  // Synchronize active tab with URL query parameter
  useEffect(() => {
    if (tabParam === 'appointments') {
      setActiveTab('appointments');
      setBreadcrumbLabel('calendar', 'Schedule');
    } else {
      setActiveTab('calendar');
      setBreadcrumbLabel('calendar', 'Schedule');
    }
  }, [tabParam, setBreadcrumbLabel]);

  const handleTabChange = (tab: 'calendar' | 'appointments') => {
    setActiveTab(tab);
    if (tab === 'appointments') {
      router.replace('/dashboard/calendar?tab=appointments');
    } else {
      router.replace('/dashboard/calendar');
    }
  };

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
    special_schedule: true,
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
    event_date: '',
  });

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'staff';

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/calendar');
      if (res.data && res.data.success) {
        const formattedEvents = res.data.data.map((evt: any) => {
          const d = new Date(evt.event_date);
          const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return {
            ...evt,
            event_date: localDateStr,
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
    'July', 'August', 'September', 'October', 'November', 'December',
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
    return events.filter((evt) => {
      if (evt.event_date !== dateStr) return false;
      return filters[evt.type];
    });
  };

  // Open the day modal
  const handleDayClick = (dayNum: number) => {
    const clickedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayEvents = events.filter((evt) => evt.event_date === clickedDateStr);

    setSelectedDateStr(clickedDateStr);
    setSelectedDayEvents(dayEvents);
    setShowDayModal(true);

    setFormFields({
      title: '',
      description: '',
      type: 'announcement',
      status: 'open',
      event_date: clickedDateStr,
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
        const res = await api.put(`/calendar/${editingEventId}`, formFields);
        if (res.data && res.data.success) {
          await fetchEvents();
          const updatedEvents = events.map((evt) =>
            evt.id === editingEventId ? { ...evt, ...formFields } : evt
          );
          setSelectedDayEvents(updatedEvents.filter((evt) => evt.event_date === selectedDateStr));
          setIsManaging(false);
          setEditingEventId(null);
        }
      } else {
        const res = await api.post('/calendar', formFields);
        if (res.data && res.data.success) {
          await fetchEvents();
          const newEvent = {
            ...res.data.data,
            event_date: formFields.event_date,
          };
          setSelectedDayEvents((prev) => [...prev, newEvent]);
          setIsManaging(false);
        }
      }

      setFormFields((prev) => ({
        ...prev,
        title: '',
        description: '',
        status: 'open',
      }));
    } catch (err) {
      console.error(err);
      alert('Error updating event details.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      setActionLoading(true);
      const res = await api.delete(`/calendar/${eventId}`);
      if (res.data && res.data.success) {
        await fetchEvents();
        setSelectedDayEvents((prev) => prev.filter((evt) => evt.id !== eventId));
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting event.');
    } finally {
      setActionLoading(false);
    }
  };

  const startEditEvent = (evt: CalendarEvent) => {
    setEditingEventId(evt.id);
    setFormFields({
      title: evt.title,
      description: evt.description || '',
      type: evt.type,
      status: evt.status,
      event_date: evt.event_date,
    });
    setIsManaging(true);
  };

  // Badge/Tag style helpers
  const getEventBadgeStyle = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'announcement':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'payment_deadline':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'office_duty':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'holiday':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'special_schedule':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      default:
        return 'bg-neutral-100 text-neutral-600 border-neutral-200';
    }
  };

  const getEventDotColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'announcement':
        return 'bg-blue-500';
      case 'payment_deadline':
        return 'bg-amber-500';
      case 'office_duty':
        return 'bg-emerald-500';
      case 'holiday':
        return 'bg-rose-500';
      case 'special_schedule':
        return 'bg-purple-500';
      default:
        return 'bg-neutral-400';
    }
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-3.5 h-3.5 text-blue-500" />;
      case 'payment_deadline':
        return <CreditCard className="w-3.5 h-3.5 text-amber-500" />;
      case 'office_duty':
        return <Briefcase className="w-3.5 h-3.5 text-emerald-500" />;
      case 'holiday':
        return <CalendarDays className="w-3.5 h-3.5 text-rose-500" />;
      case 'special_schedule':
        return <Sparkles className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <CalendarIcon className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  // Build Calendar grid cells
  const calendarCells = [];

  // Previous Month's trailing days
  const prevMonthTotalDays = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = prevMonthTotalDays - i;
    calendarCells.push({
      dayNum: day,
      isCurrentMonth: false,
      dateStr: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }

  // Current Month's days
  const today = new Date();
  const isCurrentYearAndMonth = today.getFullYear() === year && today.getMonth() === month;
  const currentDayNum = today.getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      dayNum: i,
      isCurrentMonth: true,
      isToday: isCurrentYearAndMonth && currentDayNum === i,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
    });
  }

  // Next Month's leading days to fill grid of 42 cells (6 rows of 7)
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      dayNum: i,
      isCurrentMonth: false,
      dateStr: `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
    });
  }

  return (
    <div className="space-y-6 animate-micro-elevate">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Top Combined Module Tab Switcher & Month Navigation Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-variant/50 gap-3">
        <div className="flex overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => handleTabChange('calendar')}
            className={`px-6 py-3 font-headline text-sm font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Interactive Calendar</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('appointments')}
            className={`px-6 py-3 font-headline text-sm font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'appointments'
                ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Appointments & Schedules</span>
            {pendingAppointmentsCount > 0 && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'appointments'
                  ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}>
                {pendingAppointmentsCount}
              </span>
            )}
          </button>
        </div>

        {/* Right side: Actions container (Today & Month Switcher on calendar tab, or Appointment actions) */}
        <div id="calendar-header-actions" className="flex items-center gap-2 self-end sm:self-center mb-2 sm:mb-0">
          {activeTab === 'calendar' && (
            <>
              {user?.role === 'member' && (
                <button
                  type="button"
                  onClick={() => {
                    handleTabChange('appointments');
                    router.replace('/dashboard/calendar?tab=appointments&book=true');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-xl hover:shadow-lg transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Book Appointment</span>
                </button>
              )}
              <button
                onClick={resetToToday}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-outline-variant/60 hover:bg-neutral/5 dark:hover:bg-neutral/10 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
              >
                Today
              </button>
              <div className="flex items-center rounded-xl border border-outline-variant/60 overflow-hidden bg-white dark:bg-surface-container-low shadow-xs">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-neutral/5 dark:hover:bg-neutral/10 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="px-3 text-xs font-black text-on-surface dark:text-white min-w-[115px] text-center bg-neutral/5 dark:bg-neutral/15 font-headline">
                  {monthNames[month]} {year}
                </div>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-neutral/5 dark:hover:bg-neutral/10 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: APPOINTMENTS SECTION */}
      {activeTab === 'appointments' && (
        <AppointmentsSection
          onPendingCountChange={setPendingAppointmentsCount}
          initialOpenCreate={searchParams.get('book') === 'true'}
        />
      )}

      {/* TAB 2: CALENDAR SECTION */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">

          {/* Main Grid + Filter Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Panel */}
            <div className="lg:col-span-1 bg-white dark:bg-surface-container-low p-6 rounded-3xl border border-outline-variant/50 shadow-sm h-fit space-y-6">
              <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white flex items-center gap-2 pb-3 border-b border-outline-variant/45">
                <Filter className="w-4 h-4 text-primary dark:text-secondary" />
                Event Categories
              </h3>

              <div className="space-y-3.5">
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={filters.announcement}
                    onChange={(e) => setFilters({ ...filters, announcement: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-outline-variant accent-blue-600 cursor-pointer"
                  />
                  <span className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    Announcements
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={filters.payment_deadline}
                    onChange={(e) => setFilters({ ...filters, payment_deadline: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-outline-variant accent-amber-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Payment Deadlines
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={filters.office_duty}
                    onChange={(e) => setFilters({ ...filters, office_duty: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-outline-variant accent-emerald-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Office Operations
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={filters.holiday}
                    onChange={(e) => setFilters({ ...filters, holiday: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 border-outline-variant accent-rose-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Holidays / Closed
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={filters.special_schedule}
                    onChange={(e) => setFilters({ ...filters, special_schedule: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500 border-outline-variant accent-purple-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    Special Schedules
                  </span>
                </label>
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
                  <p className="text-sm font-bold text-on-surface dark:text-white">{error}</p>
                  <button
                    onClick={fetchEvents}
                    className="px-4 py-2 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-xs rounded-xl"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {daysOfWeek.map((day, idx) => (
                      <div
                        key={day}
                        className={`text-xs font-black uppercase tracking-wider py-2 font-headline ${
                          idx === 0 || idx === 6
                            ? 'text-rose-500/80 dark:text-rose-400/80'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* 6x7 Grid of Days */}
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {calendarCells.map((cell, idx) => {
                      const dayEvents = getFilteredEventsForDate(cell.dateStr);
                      const hasEvents = dayEvents.length > 0;

                      return (
                        <div
                          key={idx}
                          onClick={() => handleDayClick(cell.dayNum)}
                          className={`min-h-[75px] sm:min-h-[90px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group select-none relative overflow-hidden ${
                            cell.isToday
                              ? 'bg-primary/5 dark:bg-secondary/10 border-primary/40 dark:border-secondary/40 shadow-xs'
                              : cell.isCurrentMonth
                                ? 'bg-neutral-50/50 dark:bg-neutral-800/30 border-outline-variant/35 hover:border-primary/40 dark:hover:border-secondary/40 hover:bg-white dark:hover:bg-neutral-800/60'
                                : 'bg-transparent border-transparent opacity-30 cursor-not-allowed pointer-events-none'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold leading-none ${
                                cell.isToday
                                  ? 'w-6 h-6 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 flex items-center justify-center font-black shadow-xs'
                                  : 'text-on-surface dark:text-neutral-200'
                              }`}
                            >
                              {cell.dayNum}
                            </span>

                            {hasEvents && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary">
                                {dayEvents.length}
                              </span>
                            )}
                          </div>

                          {/* Event Indicators */}
                          <div className="space-y-1 mt-1">
                            {dayEvents.slice(0, 2).map((evt) => (
                              <div
                                key={evt.id}
                                className={`text-[10px] font-semibold truncate px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${getEventBadgeStyle(
                                  evt.type
                                )}`}
                                title={evt.title}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getEventDotColor(evt.type)}`} />
                                <span className="truncate">{evt.title}</span>
                              </div>
                            ))}

                            {dayEvents.length > 2 && (
                              <div className="text-[9px] font-bold text-neutral-400 pl-1">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Day Events Drawer / Modal */}
      {showDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-xs animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-modal-pop">
            <div className="p-6 border-b border-outline-variant/40 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/40">
              <div>
                <h3 className="font-headline font-bold text-lg text-on-surface dark:text-white">
                  Events on{' '}
                  {selectedDateStr &&
                    new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Scheduled notifications and calendar notices
                </p>
              </div>
              <button
                onClick={() => setShowDayModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 text-neutral-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* List of existing events */}
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 space-y-2">
                  <CalendarDays className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs font-semibold">No scheduled events for this date.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-4 rounded-2xl border border-outline-variant/60 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-2 relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getEventIcon(evt.type)}
                          <h4 className="text-xs font-bold text-on-surface dark:text-white">{evt.title}</h4>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getEventBadgeStyle(
                            evt.type
                          )}`}
                        >
                          {evt.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      {evt.description && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 pl-5.5">
                          {evt.description}
                        </p>
                      )}

                      {/* Admin/Manager Actions */}
                      {isAdminOrManager && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
                          <button
                            onClick={() => startEditEvent(evt)}
                            className="text-[11px] font-bold text-primary dark:text-secondary hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(evt.id)}
                            className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Event Creation Form (Admin only) */}
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
                      event_date: selectedDateStr || '',
                    });
                  }}
                  className="w-full py-2.5 rounded-xl border border-dashed border-primary/50 text-primary dark:text-secondary text-xs font-bold hover:bg-primary/5 dark:hover:bg-secondary/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Event on this Day
                </button>
              )}

              {isAdminOrManager && isManaging && (
                <form onSubmit={handleSaveEvent} className="p-4 rounded-2xl border border-primary/30 bg-primary/5 dark:bg-secondary/5 space-y-3">
                  <h4 className="text-xs font-bold text-primary dark:text-secondary">
                    {editingEventId ? 'Edit Event Details' : 'Create New Event'}
                  </h4>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formFields.title}
                        onChange={(e) => setFormFields((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Loan Payment Due Date"
                        className="w-full px-3 py-2 bg-white dark:bg-surface-container-high rounded-xl border border-outline-variant/80 dark:border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={formFields.description}
                        onChange={(e) => setFormFields((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional details or instructions..."
                        className="w-full px-3 py-2 bg-white dark:bg-surface-container-high rounded-xl border border-outline-variant/80 dark:border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                          Event Category
                        </label>
                        <select
                          value={formFields.type}
                          onChange={(e) =>
                            setFormFields((prev) => ({
                              ...prev,
                              type: e.target.value as CalendarEvent['type'],
                            }))
                          }
                          className="w-full px-3 py-2 bg-white dark:bg-surface-container-high rounded-xl border border-outline-variant/80 dark:border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white"
                        >
                          <option value="announcement">Announcement</option>
                          <option value="payment_deadline">Payment Deadline</option>
                          <option value="office_duty">Office Duty</option>
                          <option value="holiday">Holiday</option>
                          <option value="special_schedule">Special Schedule</option>
                        </select>
                      </div>

                      {formFields.type === 'office_duty' ? (
                        <div>
                          <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                            Office Status
                          </label>
                          <select
                            value={formFields.status}
                            onChange={(e) => setFormFields((prev) => ({ ...prev, status: e.target.value }))}
                            className="w-full px-3 py-2 bg-white dark:bg-surface-container-high rounded-xl border border-outline-variant/80 dark:border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white"
                          >
                            <option value="open">Open / On Duty</option>
                            <option value="closed">Closed / No Operations</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                            Status State
                          </label>
                          <select
                            value={formFields.status}
                            onChange={(e) => setFormFields((prev) => ({ ...prev, status: e.target.value }))}
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
                      className="px-4 py-2 border border-outline-variant/60 rounded-xl text-neutral-700 dark:text-neutral-200 text-xs font-bold hover:bg-neutral/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-xl text-xs font-bold hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
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

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-32 space-y-3">
          <Loader2 className="w-10 h-10 text-primary dark:text-secondary animate-spin" />
          <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Loading Calendar & Appointments...</p>
        </div>
      }
    >
      <CalendarPageContent />
    </Suspense>
  );
}
