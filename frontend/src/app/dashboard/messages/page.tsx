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
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <BackButton href="/dashboard">Back to System Dashboard</BackButton>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-neutral-100 dark:bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/60 shadow-xs self-start sm:self-auto">
          <button
            onClick={() => handleTabChange('messages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-white dark:bg-surface-container-high text-primary dark:text-secondary shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-on-surface dark:hover:text-white hover:bg-neutral/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Direct Messages</span>
            {unreadMessagesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-tertiary/15 text-tertiary border border-tertiary/20">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('notifications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-white dark:bg-surface-container-high text-primary dark:text-secondary shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-on-surface dark:hover:text-white hover:bg-neutral/5'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications & Alerts</span>
            {unreadNotificationsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/15 text-primary dark:bg-secondary/20 dark:text-secondary border border-primary/20 dark:border-secondary/30">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
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