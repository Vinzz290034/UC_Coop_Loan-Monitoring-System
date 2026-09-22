'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Info,
  Inbox,
  RotateCw,
  WalletCards,
  Banknote,
  User as UserIcon,
  CalendarClock,
  LifeBuoy,
  Megaphone,
  CalendarCheck,
} from 'lucide-react';
import {
  NotificationData,
  getNotificationDestination,
  getNotificationActionLabel,
} from '@/lib/notificationRoutes';

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

function getNotificationIcon(type: string, title: string = '', message: string = '') {
  const t = (type || '').toLowerCase();
  const tit = (title || '').toLowerCase();
  const msg = (message || '').toLowerCase();

  if (t === 'contact_message' || tit.includes('message') || tit.includes('inquiry')) return MessageSquare;
  if (
    t === 'account' ||
    t.includes('capital') ||
    tit.includes('capital') ||
    tit.includes('deposit') ||
    tit.includes('placement') ||
    msg.includes('share capital') ||
    msg.includes('fixed deposit')
  ) {
    return WalletCards;
  }
  if (t.startsWith('loan') || tit.includes('loan') || msg.includes('loan') || tit.includes('repayment')) return Banknote;
  if (t.startsWith('profile') || tit.includes('profile')) return UserIcon;
  if (t.includes('appointment') || tit.includes('appointment')) return CalendarClock;
  if (t.includes('support') || t.includes('ticket') || tit.includes('ticket') || tit.includes('support')) return LifeBuoy;
  if (t.includes('announcement') || tit.includes('announcement')) return Megaphone;
  if (t.includes('billing') || tit.includes('billing')) return CalendarCheck;
  if (t === 'system') return Info;
  return Bell;
}

function groupByDate(notifications: NotificationData[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: NotificationData[] }[] = [
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

interface NotificationsSectionProps {
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationsSection({ onUnreadCountChange }: NotificationsSectionProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = showUnreadOnly ? '?unread_only=true' : '';
      const res = await api.get(`/notifications${params}`);
      const data: NotificationData[] = res.data.data || [];
      setNotifications(data);
      const unread = data.filter((n) => !n.is_read).length;
      if (onUnreadCountChange) {
        onUnreadCountChange(unread);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [showUnreadOnly, onUnreadCountChange]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        const unread = updated.filter((n) => !n.is_read).length;
        if (onUnreadCountChange) onUnreadCountChange(unread);
        return updated;
      });
    } catch {
      /* silent */
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch {
      /* silent */
    }
  };

  const handleNotificationClick = (notif: NotificationData) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    const destination = getNotificationDestination(notif, user?.role);
    router.push(destination);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const grouped = groupByDate(notifications);

  return (
    <div className="space-y-6">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm">
        {/* Filter Tabs */}
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl p-1 w-fit">
          <button
            onClick={() => setShowUnreadOnly(false)}
            className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              !showUnreadOnly
                ? 'bg-white dark:bg-surface-container-high text-primary dark:text-secondary shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral/5'
            }`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            onClick={() => setShowUnreadOnly(true)}
            className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              showUnreadOnly
                ? 'bg-white dark:bg-surface-container-high text-primary dark:text-secondary shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral/5'
            }`}
          >
            Unread Only {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-primary dark:text-secondary bg-primary/10 dark:bg-secondary/10 border border-primary/20 dark:border-secondary/20 rounded-2xl hover:bg-primary/20 dark:hover:bg-secondary/20 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read ({unreadCount})</span>
            </button>
          )}

          <button
            onClick={fetchNotifications}
            className="p-2 rounded-2xl border border-outline-variant/60 text-neutral-500 hover:text-primary dark:hover:text-secondary hover:bg-neutral/5 transition-colors cursor-pointer"
            title="Refresh Notifications"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-3 border-neutral-200 border-t-primary dark:border-neutral-700 dark:border-t-secondary animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white dark:bg-surface-container-low border border-outline-variant/50 rounded-3xl p-16 flex flex-col items-center gap-3 text-neutral-400 dark:text-neutral-500 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Inbox className="w-8 h-8 opacity-40" />
          </div>
          <h3 className="font-headline font-bold text-on-surface dark:text-white text-sm">
            {showUnreadOnly ? 'No Unread Notifications' : 'No Notifications Yet'}
          </h3>
          <p className="text-xs text-center max-w-xs text-neutral-500 dark:text-neutral-400">
            {showUnreadOnly
              ? 'All caught up! Switch to "All Alerts" to see past system notifications.'
              : 'System alerts, loan notices, and member activity updates will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label} className="space-y-2.5">
              <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-1">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.items.map((notif) => {
                  const Icon = getNotificationIcon(notif.type, notif.title, notif.message);
                  const actionLabel = getNotificationActionLabel(notif);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`group bg-white dark:bg-surface-container-low border rounded-3xl p-4 flex items-start gap-3.5 transition-all cursor-pointer hover:shadow-md hover:border-primary/40 dark:hover:border-secondary/40 ${
                        !notif.is_read
                          ? 'border-primary/20 dark:border-secondary/20 bg-primary/[0.02] dark:bg-secondary/[0.02]'
                          : 'border-outline-variant/50'
                      }`}
                    >
                      <div
                        className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          !notif.is_read
                            ? 'bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary group-hover:bg-primary/20 dark:group-hover:bg-secondary/20'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`font-headline text-xs truncate ${
                              !notif.is_read ? 'font-extrabold text-on-surface dark:text-white' : 'font-semibold text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            {notif.title}
                          </h4>
                          <span className="text-[10px] text-neutral-400 whitespace-nowrap font-mono">{timeAgo(notif.created_at)}</span>
                        </div>
                        <p className="font-body text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/20">
                          <span className="text-[11px] font-bold text-primary dark:text-secondary group-hover:underline">
                            {actionLabel}
                          </span>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary dark:bg-secondary flex-shrink-0" />
                          )}
                        </div>
                      </div>
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
