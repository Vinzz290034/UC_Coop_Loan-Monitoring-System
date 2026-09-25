'use client';

import React, { useState, useEffect, useRef } from 'react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
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
  ChevronDown,
  Check,
  ShieldOff,
  Cpu,
  ExternalLink,
  HelpCircle,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const TIMEOUT_OPTIONS = [
  { value: 5, label: '5 minutes', desc: 'Short security timeout' },
  { value: 10, label: '10 minutes', desc: 'Standard working session' },
  { value: 15, label: '15 minutes', desc: 'Extended working session' },
  { value: 30, label: '30 minutes (Default)', desc: 'Recommended security timeout' },
  { value: 60, label: '60 minutes', desc: '1 hour uninterrupted session' },
  { value: 0, label: 'Disabled (Never)', desc: 'Session will never automatically expire' }
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Notification preferences (localStorage-only for now)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);

  // Session Timeout state (default: 30 minutes)
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);
  const [isTimeoutDropdownOpen, setIsTimeoutDropdownOpen] = useState(false);
  const timeoutDropdownRef = useRef<HTMLDivElement>(null);

  // State of Calamity status
  const [isCalamityDeclared, setIsCalamityDeclared] = useState(false);
  const [loadingCalamity, setLoadingCalamity] = useState(false);
  const [savingCalamity, setSavingCalamity] = useState(false);
  const [calamityMsg, setCalamityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = user?.role === 'admin';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'staff';

  // Per-user localStorage key so each user has their own timeout preference
  const timeoutKey = user?.id ? `session_timeout_minutes_${user.id}` : 'session_timeout_minutes';
  const notifKey = user?.id ? `notification_prefs_${user.id}` : 'notification_prefs';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeoutDropdownRef.current && !timeoutDropdownRef.current.contains(event.target as Node)) {
        setIsTimeoutDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
      try {
        const saved = localStorage.getItem(notifKey);
        if (saved) {
          const prefs = JSON.parse(saved);
          setEmailNotifications(prefs.email ?? true);
          setInAppNotifications(prefs.inApp ?? true);
        }
        const savedTimeout = localStorage.getItem(timeoutKey);
        if (savedTimeout) {
          if (savedTimeout === '0' || savedTimeout === 'disabled' || savedTimeout === 'never') {
            setSessionTimeoutMinutes(0);
          } else {
            const parsed = parseInt(savedTimeout, 10);
            if (!isNaN(parsed) && parsed >= 0) {
              setSessionTimeoutMinutes(parsed);
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse notification preferences', e);
      }
    }
  }, [user, timeoutKey, notifKey]);

  const handleTimeoutChange = (mins: number) => {
    setSessionTimeoutMinutes(mins);
    if (typeof window !== 'undefined') {
      localStorage.setItem(timeoutKey, mins.toString());
    }
  };

  const handleTestTimeout = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('test-session-timeout', { detail: { seconds: 15 } }));
    }
  };

  useEffect(() => {
    if (isAdminOrManager) {
      const fetchCalamityStatus = async () => {
        try {
          setLoadingCalamity(true);
          const res = await api.get('/loans/calamity-status');
          if (res.data && typeof res.data.is_calamity_declared === 'boolean') {
            setIsCalamityDeclared(res.data.is_calamity_declared);
          }
        } catch (err) {
          console.error('Failed to fetch calamity status:', err);
        } finally {
          setLoadingCalamity(false);
        }
      };
      fetchCalamityStatus();
    }
  }, [isAdminOrManager]);

  const handleToggleCalamity = async (newStatus: boolean) => {
    try {
      setSavingCalamity(true);
      setCalamityMsg(null);
      await api.patch('/loans/calamity-status', { is_calamity_declared: newStatus });
      setIsCalamityDeclared(newStatus);
      setCalamityMsg({
        type: 'success',
        text: newStatus
          ? 'State of Calamity is now DECLARED. Calamity Loan applications are now active.'
          : 'State of Calamity status set to Normal/Inactive.'
      });
      setTimeout(() => setCalamityMsg(null), 5000);
    } catch (err: any) {
      console.error('Failed to update calamity status:', err);
      setCalamityMsg({
        type: 'error',
        text: err?.response?.data?.error?.message || 'Failed to update State of Calamity status.'
      });
    } finally {
      setSavingCalamity(false);
    }
  };

  const saveNotifPrefs = (email: boolean, inApp: boolean) => {
    setEmailNotifications(email);
    setInAppNotifications(inApp);
    if (typeof window !== 'undefined') {
      localStorage.setItem(notifKey, JSON.stringify({ email, inApp }));
    }
  };

  if (!user) return null;

  const themeOptions = [
    { key: 'light', label: 'Light', icon: Sun, desc: 'Bright, clean interface' },
    { key: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
  ];

  return (
    <div className="space-y-6 mx-auto animate-micro-elevate">
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
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                emailNotifications ? 'bg-primary dark:bg-secondary' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  emailNotifications ? 'translate-x-5' : 'translate-x-0'
                }`}
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
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                inAppNotifications ? 'bg-primary dark:bg-secondary' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  inAppNotifications ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl">
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center gap-2.5 rounded-t-2xl">
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

          {/* Support Link */}
          <button
            onClick={() => router.push('/dashboard/support')}
            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-neutral/5 dark:hover:bg-neutral/10 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-on-surface dark:text-white">Support</h4>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Get assistance and manage support requests</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/30 border border-outline-variant/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center border flex-shrink-0 transition-colors",
                    sessionTimeoutMinutes === 0
                      ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-300 dark:border-neutral-700"
                      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  )}
                >
                  {sessionTimeoutMinutes === 0 ? (
                    <ShieldOff className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-on-surface dark:text-white">Session Timeout</h4>
                    {sessionTimeoutMinutes === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200/80 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700">
                        <ShieldOff className="w-3 h-3 text-neutral-500" />
                        Disabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active • {sessionTimeoutMinutes} Mins
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {sessionTimeoutMinutes === 0
                      ? "Automatic session timeout is disabled. Your session will remain active until you manually sign out."
                      : `Sessions automatically expire after ${sessionTimeoutMinutes} minutes of inactivity for your account security.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                <button
                  type="button"
                  onClick={handleTestTimeout}
                  disabled={sessionTimeoutMinutes === 0}
                  className={cn(
                    "px-2.5 py-1.5 text-[11px] font-bold rounded-lg border transition-colors",
                    sessionTimeoutMinutes === 0
                      ? "opacity-40 cursor-not-allowed text-neutral-400 bg-neutral-100 dark:bg-neutral-800/50 border-neutral-300 dark:border-neutral-700"
                      : "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border-amber-300 dark:border-amber-800 cursor-pointer"
                  )}
                  title={sessionTimeoutMinutes === 0 ? "Enable session timeout to test warning" : "Simulate the session expiry warning countdown"}
                >
                  Test Warning
                </button>

                {/* Custom Animated Dropdown Popover */}
                <div className="relative" ref={timeoutDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsTimeoutDropdownOpen((prev) => !prev)}
                    className="inline-flex items-center justify-between gap-2 min-w-[155px] px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-neutral-800 border border-outline-variant/60 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 text-on-surface dark:text-white shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                    aria-expanded={isTimeoutDropdownOpen}
                    aria-haspopup="listbox"
                  >
                    <span className="truncate">
                      {TIMEOUT_OPTIONS.find((opt) => opt.value === sessionTimeoutMinutes)?.label || `${sessionTimeoutMinutes} minutes`}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ease-out flex-shrink-0",
                        isTimeoutDropdownOpen && "rotate-180 text-emerald-600 dark:text-emerald-400"
                      )}
                    />
                  </button>

                  {isTimeoutDropdownOpen && (
                    <div
                      role="listbox"
                      className="absolute right-0 top-full mt-1.5 w-64 z-[100] rounded-xl bg-white dark:bg-neutral-900 border border-outline-variant/60 dark:border-neutral-800 shadow-2xl p-1.5 space-y-0.5 animate-dropdown-pop origin-top-right focus:outline-none"
                    >
                      <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        Inactivity Duration
                      </div>
                      {TIMEOUT_OPTIONS.map((option) => {
                        const isSelected = sessionTimeoutMinutes === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              handleTimeoutChange(option.value);
                              setIsTimeoutDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer group",
                              isSelected
                                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-medium"
                                : "hover:bg-neutral-100 dark:hover:bg-neutral-800/80 text-on-surface dark:text-neutral-200"
                            )}
                          >
                            <div className="flex flex-col pr-2">
                              <span className={cn("text-xs leading-tight", isSelected ? "text-emerald-700 dark:text-emerald-300 font-bold" : "font-medium")}>
                                {option.label}
                              </span>
                              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight mt-0.5">
                                {option.desc}
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
          <div className="p-6 space-y-3">
            {/* State of Calamity Policy Toggle */}
            <div className="p-4 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-on-surface dark:text-white">State of Calamity Declaration</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold font-mono uppercase tracking-wider ${
                        isCalamityDeclared
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        {loadingCalamity ? 'Checking...' : isCalamityDeclared ? 'ACTIVE / DECLARED' : 'INACTIVE'}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                      Enable emergency loan eligibility across the cooperative system during natural disasters or local crises.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={savingCalamity || loadingCalamity}
                  onClick={() => handleToggleCalamity(!isCalamityDeclared)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-50 flex-shrink-0 ${
                    isCalamityDeclared ? 'bg-amber-600 dark:bg-amber-500' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                  title={isCalamityDeclared ? 'Deactivate State of Calamity' : 'Declare State of Calamity'}
                >
                  {savingCalamity ? (
                    <span className="absolute inset-0 flex items-center justify-center text-white">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </span>
                  ) : (
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                        isCalamityDeclared ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  )}
                </button>
              </div>

              {calamityMsg && (
                <div className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  calamityMsg.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30'
                }`}>
                  {calamityMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                  <span>{calamityMsg.text}</span>
                </div>
              )}
            </div>
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
              <p className="text-xs font-bold text-on-surface dark:text-white">Coop Sync Loan Monitoring System</p>
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
