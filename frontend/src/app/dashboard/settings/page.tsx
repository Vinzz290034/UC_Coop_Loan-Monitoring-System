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
  HelpCircle,
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

  const saveNotifPrefs = (email: boolean, inApp: boolean) => {
    setEmailNotifications(email);
    setInAppNotifications(inApp);
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification_prefs', JSON.stringify({ email, inApp }));
    }
  };

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isAdminOrManager = user.role === 'admin' || user.role === 'staff';

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

      {/* Member Personal Information & Verification Section */}
      {user.role === 'member' && (
        <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-primary dark:text-secondary" />
              <h2 className="font-headline text-sm font-bold text-on-surface dark:text-white">
                Personal Information & Profile Verification
              </h2>
            </div>
            {user.profile?.profile_completed ? (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.profile?.status === 'approved' || user.profile?.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/40' : user.profile?.status === 'disapproved' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-300/40' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/40'}`}>
                {user.profile?.status === 'approved' || user.profile?.status === 'active' ? 'Approved' : user.profile?.status === 'disapproved' ? 'Disapproved' : 'Under Review'}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/40">
                Incomplete
              </span>
            )}
          </div>

          <div className="p-6 space-y-5">
            {user.profile?.profile_completed && (user.profile?.status === 'pending') && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-medium space-y-1">
                <p className="font-bold">Your profile has been submitted successfully.</p>
                <p>Your information is currently under review. Approval typically takes 24–48 hours. You will receive access to transaction features once your account has been approved.</p>
              </div>
            )}

            <MemberProfileForm user={user} />
          </div>
        </div>
      )}

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

function MemberProfileForm({ user }: { user: any }) {
  const profile = user.profile || {};
  
  const PREDEFINED_TITLES = ['Mr.', 'Ms.', 'Mrs.', 'Engr.', 'Atty.', 'Dr.'];

  const initialTitle = profile.title || '';
  const isCustomTitleInitial = initialTitle && !PREDEFINED_TITLES.includes(initialTitle);

  const [titleDropdown, setTitleDropdown] = useState<string>(
    isCustomTitleInitial ? 'Other' : (initialTitle || 'Mr.')
  );
  const [customTitle, setCustomTitle] = useState<string>(isCustomTitleInitial ? initialTitle : '');
  const [tin, setTin] = useState<string>(profile.tin || '');
  const [gender, setGender] = useState<string>(profile.gender || 'Male');
  const [civilStatus, setCivilStatus] = useState<string>(profile.civil_status || 'Single');
  const [address, setAddress] = useState<string>(profile.address || '');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const selectedTitle = titleDropdown === 'Other' ? customTitle.trim() : titleDropdown;

    try {
      const res = await fetch('/api/members/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: selectedTitle,
          tin: tin.trim(),
          gender,
          civil_status: civilStatus,
          address: address.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Profile submitted successfully!');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setErrorMsg(data.error?.message || 'Failed to submit profile.');
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred while saving your profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Title Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-on-surface dark:text-neutral-200">
            Member Title (Optional)
          </label>
          <select
            value={titleDropdown}
            onChange={(e) => setTitleDropdown(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/50 rounded-xl text-xs font-semibold text-on-surface dark:text-white outline-none focus:border-primary dark:focus:border-secondary"
          >
            {PREDEFINED_TITLES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value="Other">Other (Specify Custom Title)</option>
          </select>
        </div>

        {/* Custom Title (if Other) */}
        {titleDropdown === 'Other' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface dark:text-neutral-200">
              Custom Title
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Prof. or Rev."
              className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/50 rounded-xl text-xs font-semibold text-on-surface dark:text-white outline-none focus:border-primary dark:focus:border-secondary"
            />
          </div>
        )}

        {/* TIN */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-on-surface dark:text-neutral-200">
            TIN (Taxpayer ID)
          </label>
          <input
            type="text"
            value={tin}
            onChange={(e) => setTin(e.target.value)}
            placeholder="000-000-000-000"
            className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/50 rounded-xl text-xs font-semibold text-on-surface dark:text-white outline-none focus:border-primary dark:focus:border-secondary"
          />
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-on-surface dark:text-neutral-200">
            Gender *
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/50 rounded-xl text-xs font-semibold text-on-surface dark:text-white outline-none focus:border-primary dark:focus:border-secondary"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        {/* Civil Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-on-surface dark:text-neutral-200">
            Civil Status *
          </label>
          <select
            value={civilStatus}
            onChange={(e) => setCivilStatus(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/50 rounded-xl text-xs font-semibold text-on-surface dark:text-white outline-none focus:border-primary dark:focus:border-secondary"
          >
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
            <option value="Divorced">Divorced</option>
          </select>
        </div>
      </div>

      {/* Complete Address */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-on-surface dark:text-neutral-200">
          Complete Residential Address *
        </label>
        <textarea
          rows={3}
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="House/Unit No., Street, Barangay, City/Municipality, Province"
          className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-outline-variant/50 rounded-xl text-xs font-semibold text-on-surface dark:text-white outline-none focus:border-primary dark:focus:border-secondary"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-xs hover:opacity-90 transition-all disabled:opacity-50"
        >
          {submitting ? 'Submitting Profile...' : 'Submit Profile for Verification'}
        </button>
      </div>
    </form>
  );
}