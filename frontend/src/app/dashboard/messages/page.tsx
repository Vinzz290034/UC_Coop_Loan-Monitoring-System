'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import BackButton from '@/components/BackButton';
import MessagesSection from '@/components/communication/MessagesSection';
import NotificationsSection from '@/components/communication/NotificationsSection';
import { MessageSquare, Bell, Loader2 } from 'lucide-react';

function MessagesPageContent() {
  const { user } = useAuth();
  const { setBreadcrumbLabel } = useBreadcrumb();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>(
    tabParam === 'notifications' ? 'notifications' : 'messages'
  );
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Synchronize active tab with URL query parameter
  useEffect(() => {
    if (tabParam === 'notifications') {
      setActiveTab('notifications');
    } else {
      setActiveTab('messages');
    }
    setBreadcrumbLabel('messages', 'Inbox');
  }, [tabParam, setBreadcrumbLabel]);

  const handleTabChange = (tab: 'messages' | 'notifications') => {
    setActiveTab(tab);
    if (tab === 'notifications') {
      router.replace('/dashboard/messages?tab=notifications');
    } else {
      router.replace('/dashboard/messages');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-micro-elevate">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <BackButton href="/dashboard">Back to System Dashboard</BackButton>
        </div>
      </div>

      {/* Tabs - Standardized underline tab design matching Loans page */}
      <div className="flex border-b border-outline-variant/50 overflow-x-auto">
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
          <span>Direct Messages</span>
          {unreadMessagesCount > 0 && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'messages'
                ? 'bg-tertiary/15 text-tertiary'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}>
              {unreadMessagesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('notifications')}
          className={`px-6 py-3 font-headline text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'notifications'
              ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications & Alerts</span>
          {unreadNotificationsCount > 0 && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'notifications'
                ? 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}>
              {unreadNotificationsCount}
            </span>
          )}
        </button>
      </div>

      {/* Render Active View */}
      {activeTab === 'messages' ? (
        <MessagesSection onUnreadCountChange={setUnreadMessagesCount} />
      ) : (
        <NotificationsSection onUnreadCountChange={setUnreadNotificationsCount} />
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}