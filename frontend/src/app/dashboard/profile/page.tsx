'use client';

import React, { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import {
  User,
  Shield,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Save,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Edit3,
} from 'lucide-react';

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Contains a number', pass: /\d/.test(password) },
    { label: 'Contains a letter', pass: /[a-zA-Z]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ['bg-tertiary', 'bg-orange-400', 'bg-yellow-400', 'bg-secondary'];
  const labels = ['Weak', 'Weak', 'Fair', 'Strong'];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score] : 'bg-neutral-200 dark:bg-neutral-700'}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-bold ${score === 3 ? 'text-secondary' : score === 2 ? 'text-yellow-500' : 'text-tertiary'}`}>
          {labels[score]}
        </p>
      </div>
      <div className="space-y-0.5">
        {checks.map((c, i) => (
          <p key={i} className={`text-[10px] font-semibold flex items-center gap-1 ${c.pass ? 'text-primary dark:text-secondary' : 'text-neutral-400'}`}>
            {c.pass ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-neutral-300 dark:border-neutral-600 inline-block" />}
            {c.label}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // UI state
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get('/auth/me');
        const data = res.data.data;
        const profile = data.profile;
        if (profile) {
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');
          setMiddleName(profile.middle_name || '');
          setEmail(profile.email || '');
          setPhone(profile.phone || '');
          setAddress(profile.address || '');
          setDateOfBirth(profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '');
        }
      } catch {
        setProfileError('Failed to load profile data.');
      } finally {
        setProfileLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!firstName.trim() || !lastName.trim()) {
      setProfileError('First name and last name are required.');
      return;
    }

    setSaving(true);
    try {
      await api.put('/auth/me/profile', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_name: middleName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        date_of_birth: dateOfBirth || null,
      });
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.response?.data?.error?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordError('New password must contain at least one letter and one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await api.put('/auth/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.error?.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) return null;

  const displayName = firstName && lastName ? `${firstName} ${lastName}` : user.username;

  return (
    <div className="space-y-6 mx-auto">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Profile Header */}
      <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 dark:from-secondary dark:to-secondary/70 flex items-center justify-center text-white dark:text-neutral-950 shadow-lg">
            <User className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h1 className="font-headline text-xl font-extrabold text-on-surface dark:text-white">
              {displayName}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-[10px] font-bold uppercase">
                <Shield className="w-3 h-3" />
                {user.role}
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold">
                @{user.username}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center gap-2.5">
          <Edit3 className="w-4 h-4 text-primary dark:text-secondary" />
          <h2 className="font-headline text-sm font-bold text-on-surface dark:text-white">Personal Information</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
          {profileError && (
            <div className="p-3 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-xl text-[11px] font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="p-3 bg-primary/10 dark:bg-secondary/10 border border-primary/20 dark:border-secondary/20 text-primary dark:text-secondary rounded-xl text-[11px] font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {profileSuccess}
            </div>
          )}

          {profileLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-3 border-neutral-200 border-t-primary dark:border-neutral-700 dark:border-t-secondary animate-spin" />
            </div>
          ) : (
            <>
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    First Name *
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white"
                  />
                </div>
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white placeholder:text-neutral-400"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Phone Number
                  </label>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+63 xxx xxx xxxx"
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white placeholder:text-neutral-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Date of Birth
                  </label>
                  <div className="relative group">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary pointer-events-none" />
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Address
                  </label>
                  <div className="relative group">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary pointer-events-none" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="City, Province"
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white placeholder:text-neutral-400"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-xs font-bold rounded-xl shadow hover:-translate-y-px active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-primary dark:text-secondary" />
          <h2 className="font-headline text-sm font-bold text-on-surface dark:text-white">Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          {passwordError && (
            <div className="p-3 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-xl text-[11px] font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 bg-primary/10 dark:bg-secondary/10 border border-primary/20 dark:border-secondary/20 text-primary dark:text-secondary rounded-xl text-[11px] font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              {passwordSuccess}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
              Current Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary pointer-events-none" />
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary dark:hover:text-secondary transition-colors"
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                New Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary pointer-events-none" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white placeholder:text-neutral-400"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary dark:hover:text-secondary transition-colors"
                >
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={newPassword} />
            </div>
            <div className="space-y-1.5">
              <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                Confirm New Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary pointer-events-none" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white placeholder:text-neutral-400"
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[10px] font-bold text-tertiary mt-1">Passwords do not match.</p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="px-6 py-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-xs font-bold rounded-xl shadow hover:-translate-y-px active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
