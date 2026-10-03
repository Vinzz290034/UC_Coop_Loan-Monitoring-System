'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import BackButton from '@/components/BackButton';
import MessagesSection from '@/components/communication/MessagesSection';
import NotificationsSection from '@/components/communication/NotificationsSection';
import CalendarSection from '@/components/calendar/CalendarSection';
import AppointmentsSection from '@/components/calendar/AppointmentsSection';
import {
  MessageSquare,
  Calendar as CalendarIcon,
  CalendarClock,
  Bell,
  Loader2,
  Mail,
} from 'lucide-react';

function NotificationsPageContent() {
  const { user } = useAuth();
  const { setBreadcrumbLabel } = useBreadcrumb();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isMember = user?.role === 'member';

  // Tabs for Member Account: 'messages' | 'calendar' | 'appointment'
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'messages' | 'calendar' | 'appointment'>(() => {
    if (tabParam === 'calendar') return 'calendar';
    if (tabParam === 'appointment' || tabParam === 'appointments') return 'appointment';
    return 'messages';
  });

  // Subtab for Messages tab: 'direct' or 'alerts'
  const subtabParam = searchParams.get('subtab');
  const [messagesSubTab, setMessagesSubTab] = useState<'direct' | 'alerts'>(
    subtabParam === 'notifications' || subtabParam === 'alerts' ? 'alerts' : 'direct'
  );

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [pendingAppointmentsCount, setPendingAppointmentsCount] = useState(0);

  // Sync state with URL
  useEffect(() => {
    if (isMember) {
      setBreadcrumbLabel('notifications', 'Notification');
      if (tabParam === 'calendar') {
        setActiveTab('calendar');
      } else if (tabParam === 'appointment' || tabParam === 'appointments') {
        setActiveTab('appointment');
      } else {
        setActiveTab('messages');
      }

      if (subtabParam === 'notifications' || subtabParam === 'alerts') {
        setMessagesSubTab('alerts');
      }
    } else {
      setBreadcrumbLabel('notifications', 'Inbox');
    }
  }, [tabParam, subtabParam, isMember, setBreadcrumbLabel]);

  const handleTabChange = (tab: 'messages' | 'calendar' | 'appointment', openBookModal = false) => {
    setActiveTab(tab);
    const bookQuery = openBookModal ? '&book=true' : '';
    router.replace(`/dashboard/notifications?tab=${tab}${bookQuery}`);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-secondary" />
      </div>
    );
  }

  // ─── ADMIN / STAFF VIEW (Standard Notifications Feed) ───
  if (!isMember) {
    return (
      <div className="space-y-6 animate-micro-elevate">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <BackButton href="/dashboard">Back to Overview</BackButton>
          </div>

          <Link
            href="/dashboard/messages"
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-surface-container-low border border-outline-variant/60 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-primary dark:hover:text-secondary hover:bg-neutral/10 transition-colors self-start sm:self-auto"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Switch to Direct Messages</span>
          </Link>
        </div>

        <NotificationsSection />
      </div>
    );
  }

  // ─── MEMBER VIEW (Unified Notification Page: Messages, Calendar, Appointment) ───
  return (
    <div className="space-y-6 animate-micro-elevate">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <BackButton href="/dashboard">Back to Overview</BackButton>
        </div>
      </div>

      {/* Main Page Title matching User Specification */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-headline text-2xl font-black text-on-surface dark:text-white">
              Notification
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Manage your member inbox, coop calendar schedule, and scheduled appointments.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Main Navigation Tabs: Messages | Calendar | Appointment */}
      <div className="flex border-b border-outline-variant/50 overflow-x-auto">
        {/* TAB 1: Messages */}
        <button
          type="button"
          onClick={() => handleTabChange('messages')}
          className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'messages'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Messages</span>
          {(unreadMessagesCount > 0 || unreadNotificationsCount > 0) && (
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'messages'
                  ? 'bg-tertiary/15 text-tertiary'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {unreadMessagesCount + unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* TAB 2: Calendar */}
        <button
          type="button"
          onClick={() => handleTabChange('calendar')}
          className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'calendar'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Calendar</span>
        </button>

        {/* TAB 3: Appointment */}
        <button
          type="button"
          onClick={() => handleTabChange('appointment')}
          className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'appointment'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          <span>Appointment</span>
          {pendingAppointmentsCount > 0 && (
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'appointment'
                  ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {pendingAppointmentsCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── TAB CONTENT PANELS ─── */}

      {/* TAB 1 CONTENT: Messages */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {/* Subtab Switcher for Messages: Direct Messages vs Alerts & System Notifications */}
          <div className="flex items-center gap-2 bg-surface-container-low dark:bg-surface-container-high/60 p-1 rounded-2xl border border-outline-variant/50 w-fit">
            <button
              type="button"
              onClick={() => setMessagesSubTab('direct')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                messagesSubTab === 'direct'
                  ? 'bg-white dark:bg-surface-container-highest text-primary dark:text-secondary shadow-xs'
                  : 'text-neutral-500 hover:text-on-surface dark:hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Direct Inquiries</span>
              {unreadMessagesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-tertiary/15 text-tertiary">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMessagesSubTab('alerts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                messagesSubTab === 'alerts'
                  ? 'bg-white dark:bg-surface-container-highest text-primary dark:text-secondary shadow-xs'
                  : 'text-neutral-500 hover:text-on-surface dark:hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>System Alerts</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>

          {messagesSubTab === 'direct' ? (
            <MessagesSection onUnreadCountChange={setUnreadMessagesCount} />
          ) : (
            <NotificationsSection onUnreadCountChange={setUnreadNotificationsCount} />
          )}
        </div>
      )}

      {/* TAB 2 CONTENT: Calendar */}
      {activeTab === 'calendar' && (
        <CalendarSection
          onBookAppointment={() => handleTabChange('appointment', true)}
        />
      )}

      {/* TAB 3 CONTENT: Appointment */}
      {activeTab === 'appointment' && (
        <AppointmentsSection
          onPendingCountChange={setPendingAppointmentsCount}
          initialOpenCreate={searchParams.get('book') === 'true'}
        />
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-32 space-y-3">
          <Loader2 className="w-10 h-10 text-primary dark:text-secondary animate-spin" />
          <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">Loading Notification Page...</p>
        </div>
      }
    >
      <NotificationsPageContent />
    </Suspense>
  );
}
