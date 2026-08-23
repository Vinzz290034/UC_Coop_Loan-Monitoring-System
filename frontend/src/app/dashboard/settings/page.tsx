'use client';

import React, { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
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
  HelpCircle,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Notification preferences (localStorage-only for now)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);

  // State of Calamity status
  const [isCalamityDeclared, setIsCalamityDeclared] = useState(false);
  const [loadingCalamity, setLoadingCalamity] = useState(false);
  const [savingCalamity, setSavingCalamity] = useState(false);
  const [calamityMsg, setCalamityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = user?.role === 'admin';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'staff';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('notification_prefs');
        if (saved) {
          const prefs = JSON.parse(saved);
          setEmailNotifications(prefs.email ?? true);
          setInAppNotifications(prefs.inApp ?? true);
        }
      } catch (e) {
        console.error('Failed to parse notification preferences', e);
      }
    }
  }, []);

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
      localStorage.setItem('notification_prefs', JSON.stringify({ email, inApp }));
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
