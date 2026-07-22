'use client';

import React, { useState, useEffect, useCallback } from 'react';
import BackButton from '@/components/BackButton';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Info,
  Check,
  Inbox,
  Filter,
  RotateCw,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'contact_message': return MessageSquare;
    case 'system': return Info;
    default: return Bell;
  }
}

function groupByDate(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ];

  for (const n of notifications) {
    const d = new Date(n.created_at);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) {
      groups[0].items.push(n);
    } else if (d.getTime() === yesterday.getTime()) {
      groups[1].items.push(n);
    } else {
      groups[2].items.push(n);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = showUnreadOnly ? '?unread_only=true' : '';
      const res = await api.get(`/notifications${params}`);
      setNotifications(res.data.data || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [showUnreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch { /* silent */ }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch { /* silent */ }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    if (notif.type === 'contact_message') {
      router.push('/dashboard/messages');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const grouped = groupByDate(notifications);

  return (
    <div className="space-y-6 mx-auto animate-micro-elevate">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-extrabold text-on-surface dark:text-white flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
              <Bell className="w-5 h-5" />
            </div>
            Notifications
          </h1>
          <p className="font-body text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-[52px]">
            Stay updated with system alerts and messages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-primary dark:text-secondary bg-primary/10 dark:bg-secondary/10 border border-primary/20 dark:border-secondary/20 rounded-xl hover:bg-primary/20 dark:hover:bg-secondary/20 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Read ({unreadCount})
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-2 rounded-xl text-neutral-400 hover:text-primary dark:hover:text-secondary hover:bg-neutral/5 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-xl p-1.5 w-fit">
        <button
          onClick={() => setShowUnreadOnly(false)}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${!showUnreadOnly
            ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-sm'
            : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral/5 dark:hover:bg-neutral/10'
            }`}
        >
          All
        </button>
        <button
          onClick={() => setShowUnreadOnly(true)}
          className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${showUnreadOnly
            ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-sm'
            : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral/5 dark:hover:bg-neutral/10'
            }`}
        >
          Unread Only
        </button>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-neutral-200 border-t-primary dark:border-neutral-700 dark:border-t-secondary animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl p-16 flex flex-col items-center gap-3 text-neutral-400 dark:text-neutral-500">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Inbox className="w-8 h-8 opacity-30" />
          </div>
          <p className="text-sm font-semibold">{showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}</p>
          <p className="text-xs text-center max-w-xs">
            {showUnreadOnly ? 'All caught up! Switch to "All" to see past notifications.' : 'System alerts and notifications will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2 px-1">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.items.map((notif) => {
                  const Icon = getNotificationIcon(notif.type);
                  return (
                    <div
                      key={notif.id}
                      className={`bg-white dark:bg-neutral-900 border rounded-2xl p-4 flex items-start gap-3.5 transition-all ${!notif.is_read
                        ? 'border-primary/20 dark:border-secondary/20 bg-primary/[0.02] dark:bg-secondary/[0.02]'
                        : 'border-outline-variant/50'
                        }`}
                    >
                      <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!notif.is_read
                        ? 'bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                        }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold truncate ${!notif.is_read ? 'text-on-surface dark:text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                            {notif.title}
                          </span>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary dark:bg-secondary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold">
                            {timeAgo(notif.created_at)}
                          </span>
                          {notif.type === 'contact_message' && (
                            <button
                              onClick={() => handleNotificationClick(notif)}
                              className="text-[10px] font-bold text-primary dark:text-secondary hover:underline cursor-pointer"
                            >
                              View Message →
                            </button>
                          )}
                        </div>
                      </div>

                      {!notif.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-primary dark:hover:text-secondary hover:bg-neutral/5 transition-colors flex-shrink-0 cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
