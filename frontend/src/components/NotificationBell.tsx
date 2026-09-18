'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Info,
  AlertCircle,
  ExternalLink,
  WalletCards,
  Banknote,
  User as UserIcon,
  CalendarClock,
  LifeBuoy,
  Megaphone,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

export default function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch {
      // Silently fail — non-critical
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  };

  const handleNotificationClick = (notif: NotificationData) => {
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    const dest = getNotificationDestination(notif, user?.role);
    setIsOpen(false);
    router.push(dest);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-neutral/5 dark:hover:bg-neutral/10 transition-colors text-neutral-600 dark:text-neutral-300 cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-tertiary text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 sm:right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-h-[480px] bg-white dark:bg-neutral-900 border border-outline-variant/60 dark:border-outline-variant rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant/40">
            <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-[11px] font-bold text-primary dark:text-secondary hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-neutral-200 border-t-primary dark:border-neutral-700 dark:border-t-secondary animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-neutral-400 dark:text-neutral-500">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-xs font-semibold">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => {
                const Icon = getNotificationIcon(notif.type, notif.title, notif.message);
                const actionLabel = getNotificationActionLabel(notif);
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group w-full text-left px-5 py-3.5 flex gap-3 items-start transition-all cursor-pointer hover:bg-neutral/5 dark:hover:bg-neutral/10 border-b border-outline-variant/20 last:border-b-0 ${
                      !notif.is_read ? 'bg-primary/[0.03] dark:bg-secondary/[0.04]' : ''
                    }`}
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      !notif.is_read
                        ? 'bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary group-hover:bg-primary/20 dark:group-hover:bg-secondary/20'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold truncate group-hover:text-primary dark:group-hover:text-secondary transition-colors ${!notif.is_read ? 'text-on-surface dark:text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
                          {notif.title}
                        </span>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary dark:bg-secondary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold">
                          {timeAgo(notif.created_at)}
                        </span>
                        <span className="text-[10px] font-bold text-primary dark:text-secondary opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5">
                          {actionLabel}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-outline-variant/40 px-5 py-2.5">
            <button
              onClick={() => { router.push('/dashboard/notifications'); setIsOpen(false); }}
              className="w-full text-center text-[11px] font-bold text-primary dark:text-secondary hover:underline flex items-center justify-center gap-1 cursor-pointer"
            >
              View All Notifications <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
