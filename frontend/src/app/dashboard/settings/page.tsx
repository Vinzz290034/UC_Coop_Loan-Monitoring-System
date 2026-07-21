'use client';

import React, { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Shield,
  Bell,
  BellOff,
  Lock,
  User,
  ScrollText,
  UserCog,
  Clock,
  Info,
  Calendar,
  ChevronRight,
  Cpu,
  ExternalLink,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Notification preferences (localStorage-only for now)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notification_prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        setEmailNotifications(prefs.email ?? true);
        setInAppNotifications(prefs.inApp ?? true);
      }
    }
  }, []);

  const saveNotifPrefs = (email: boolean, inApp: boolean) => {
    setEmailNotifications(email);
    setInAppNotifications(inApp);
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification_prefs', JSON.stringify({ email, inApp }));
    }
  };

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isAdminOrManager = user.role === 'admin' || user.role === 'manager';

  const themeOptions = [
    { key: 'light', label: 'Light', icon: Sun, desc: 'Bright, clean interface' },
    { key: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
  ];

  return (
    <div className="space-y-6 mx-auto">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="font-headline text-2xl font-extrabold text-on-surface dark:text-white flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
            <Settings className="w-5 h-5" />
          </div>
          Settings
        </h1>
        <p className="font-body text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-[52px]">
          Manage your application preferences and account settings.
        </p>
      </div>

      {/* Appearance is redundant since it is already visible on the header.*/}
      {/* <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center gap-2.5">
          <Sun className="w-4 h-4 text-primary dark:text-secondary" />
          <h2 className="font-headline text-sm font-bold text-on-surface dark:text-white">Appearance</h2>
        </div>
        <div className="p-6">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">Choose your preferred theme for the application interface.</p>
          <div className="grid grid-cols-2 gap-3">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = theme === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setTheme(opt.key as 'light' | 'dark')}
                  className={`p-4 rounded-2xl border-2 transition-all text-left cursor-pointer ${isActive
                    ? 'border-primary dark:border-secondary bg-primary/5 dark:bg-secondary/5 shadow-md'
                    : 'border-outline-variant/50 hover:border-primary/30 dark:hover:border-secondary/30 hover:bg-neutral/5 dark:hover:bg-neutral/10'
                    }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive
                      ? 'bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                      }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold ${isActive ? 'text-primary dark:text-secondary' : 'text-on-surface dark:text-white'}`}>
                        {opt.label}
                      </h4>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold">{opt.desc}</p>
                    </div>
                  </div>
                  {isActive && (
                    <div className="mt-1 text-[10px] font-bold text-primary dark:text-secondary flex items-center gap-1">
                      ✓ Active
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div> */}

      {/* Notification Preferences */}
      <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-primary dark:text-secondary" />
          <h2 className="font-headline text-sm font-bold text-on-surface dark:text-white">Notification Preferences</h2>
        </div>
        <div className="p-6 space-y-4">
          {/* Email Notifications Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-on-surface dark:text-white">Email Notifications</h4>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Receive email alerts for important updates</p>
              </div>
            </div>
            <button
              onClick={() => saveNotifPrefs(!emailNotifications, inAppNotifications)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${emailNotifications
                ? 'bg-primary dark:bg-secondary'
                : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${emailNotifications
                  ? 'translate-x-5'
                  : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* In-App Notifications Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                {inAppNotifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-on-surface dark:text-white">In-App Notifications</h4>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Show notification bell badge in dashboard</p>
              </div>
            </div>
            <button
              onClick={() => saveNotifPrefs(emailNotifications, !inAppNotifications)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${inAppNotifications
                ? 'bg-primary dark:bg-secondary'
                : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${inAppNotifications
                  ? 'translate-x-5'
                  : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-primary dark:text-secondary" />
          <h2 className="font-headline text-sm font-bold text-on-surface dark:text-white">Account Security</h2>
        </div>
        <div className="p-6 space-y-2">
          <button
            onClick={() => router.push('/dashboard/profile')}
            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-neutral/5 dark:hover:bg-neutral/10 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-on-surface dark:text-white">Edit Profile</h4>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Update your personal information and contact details</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          <button
            onClick={() => router.push('/dashboard/profile')}
            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-neutral/5 dark:hover:bg-neutral/10 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-on-surface dark:text-white">Change Password</h4>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Update your account password</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/30 border border-outline-variant/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-600 dark:text-neutral-300">Session Timeout</h4>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Sessions automatically expire after 15 minutes of inactivity</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin / Manager Quick Links */}
      {isAdminOrManager && (
        <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-primary dark:text-secondary" />
            <h2 className="font-headline text-sm font-bold text-on-surface dark:text-white">Administration</h2>
          </div>
          <div className="p-6 space-y-2">
            {isAdmin && (
              <button
                onClick={() => router.push('/dashboard/users')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-neutral/5 dark:hover:bg-neutral/10 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                    <UserCog className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface dark:text-white">User Management</h4>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Manage user accounts, roles, and permissions</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => router.push('/dashboard/audit')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-neutral/5 dark:hover:bg-neutral/10 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                    <ScrollText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface dark:text-white">Audit Trail</h4>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Review system activity logs and audit records</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* System Information */}
      <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-primary dark:text-secondary" />
          <h2 className="font-headline text-sm font-bold text-on-surface dark:text-white">System Information</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/20">
              <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Application</p>
              <p className="text-xs font-bold text-on-surface dark:text-white">SynCo Loan Monitoring System</p>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/20">
              <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Version</p>
              <p className="text-xs font-bold text-on-surface dark:text-white">1.0.0</p>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/20">
              <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Account Role</p>
              <p className="text-xs font-bold text-on-surface dark:text-white capitalize">{user.role}</p>
            </div>
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/20">
              <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1">Developed By</p>
              <p className="text-xs font-bold text-on-surface dark:text-white flex items-center gap-1">
                <Cpu className="w-3 h-3 text-primary dark:text-secondary" />
                KADT Solutions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
