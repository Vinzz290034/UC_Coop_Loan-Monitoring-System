'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import NotificationsSection from '@/components/communication/NotificationsSection';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { MessageSquare } from 'lucide-react';

export default function NotificationsPage() {
  const { setBreadcrumbLabel } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbLabel('notifications', 'Inbox');
  }, [setBreadcrumbLabel]);

  return (
    <div className="space-y-6 animate-micro-elevate">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <BackButton href="/dashboard">Back to System Dashboard</BackButton>
        </div>

        <Link
          href="/dashboard/messages"
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-100 dark:bg-surface-container-low border border-outline-variant/60 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-primary dark:hover:text-secondary hover:bg-neutral/10 transition-colors self-start sm:self-auto"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Switch to Direct Messages</span>
        </Link>
      </div>

      {/* Notifications Section */}
      <NotificationsSection />
    </div>
  );
}
