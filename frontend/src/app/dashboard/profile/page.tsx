'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Camera,
  X,
  Clock,
} from 'lucide-react';
import UserAccessHistoryTable from '@/components/UserAccessHistoryTable';

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
  const { user, updateUser, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar upload states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const getAvatarUrl = (path?: string | null) => {
    if (!path) return null;
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
    return `${baseUrl}${path}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setAvatarSuccess(null);

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image size must be less than 2MB.');
      return;
    }

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) return;

    setAvatarUploading(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    const formData = new FormData();
    formData.append('avatar', selectedFile);

    try {
      const res = await api.put('/auth/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        updateUser({ profile_picture_url: res.data.profile_picture_url });
        setAvatarSuccess('Profile picture updated successfully!');
        setSelectedFile(null);
        setAvatarPreview(null);
        setTimeout(() => setAvatarSuccess(null), 4000);
      }
    } catch (err: any) {
      setAvatarError(err.response?.data?.error?.message || 'Failed to upload profile picture.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleCancelAvatar = () => {
    setSelectedFile(null);
    setAvatarPreview(null);
    setAvatarError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Profile form state
  const PREDEFINED_TITLES = ['Mr.', 'Ms.', 'Mrs.', 'Engr.', 'Atty.', 'Dr.'];
  const [titleDropdown, setTitleDropdown] = useState('Mr.');
  const [customTitle, setCustomTitle] = useState('');
  const [tin, setTin] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [civilStatus, setCivilStatus] = useState('');
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
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [mounted, setMounted] = useState(false);

const computeAgeFromDob = (dobString: string): string => {
  if (!dobString) return '';
  const birthDate = new Date(dobString);
  const today = new Date();
  if (isNaN(birthDate.getTime())) return '';
  let computed = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    computed--;
  }
  return computed >= 0 ? String(computed) : '';
};

// Load profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get('/auth/me');
        const data = res.data.data;
        const profile = data.profile;
        if (profile) {
          const t = profile.title || '';
          if (t && !PREDEFINED_TITLES.includes(t)) {
            setTitleDropdown('Other');
            setCustomTitle(t);
          } else {
            setTitleDropdown(t || 'Mr.');
            setCustomTitle('');
          }
          setTin(profile.tin || '');
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');
          setMiddleName(profile.middle_name || '');
          setGender(profile.gender || '');
          setCivilStatus(profile.civil_status || '');
          setEmail(profile.email || '');
          setPhone(profile.phone || '');
          setAddress(profile.address || '');
          const dobVal = profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '';
          setDateOfBirth(dobVal);
          const computedAge = computeAgeFromDob(dobVal);
          setAge(computedAge || (profile.age != null ? String(profile.age) : ''));
        }
      } catch {
        setProfileError('Failed to load profile data.');
      } finally {
        setProfileLoading(false);
      }
    }
    loadProfile();
    setMounted(true);
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const selectedTitle = titleDropdown === 'Other' ? customTitle.trim() : titleDropdown;

    // Validate mandatory fields for profile verification
    if (
      !selectedTitle ||
      !tin.trim() ||
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !gender ||
      !civilStatus ||
      !address.trim() ||
      !dateOfBirth
    ) {
      setProfileError('Please complete all required verification fields (Member Title, TIN, First Name, Last Name, Email, Phone, Gender, Civil Status, Date of Birth, and Address).');
      return;
    }

    setSaving(true);
    try {
      await api.put('/auth/me/profile', {
        title: selectedTitle || null,
        tin: tin.trim() || null,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_name: middleName.trim() || null,
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
        civil_status: civilStatus || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        date_of_birth: dateOfBirth || null,
      });
      const wasApproved = user?.profile?.status === 'approved' || user?.profile?.status === 'active' || user?.profile?.is_verified === true;
      await refreshUser();
      if (!wasApproved) {
        setShowVerificationModal(true);
      } else {
        setProfileSuccess('Profile updated successfully!');
        setTimeout(() => setProfileSuccess(null), 4000);
      }
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
    <div className="space-y-6 mx-auto animate-micro-elevate">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Profile Header */}
      <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar upload container */}
          <div className="relative group w-20 h-20 rounded-2xl overflow-hidden shadow-lg border border-outline-variant/30 flex-shrink-0 bg-neutral-100 dark:bg-neutral-800">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            ) : user.profile_picture_url ? (
              <img
                src={getAvatarUrl(user.profile_picture_url) || ''}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-primary/70 dark:from-secondary dark:to-secondary/70 flex items-center justify-center text-white dark:text-neutral-950">
                <User className="w-10 h-10" />
              </div>
            )}

            {/* Hover overlay */}
            <button
              disabled={avatarUploading}
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>Change</span>
            </button>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div>
              <h1 className="font-headline text-xl font-extrabold text-on-surface dark:text-white">
                {displayName}
              </h1>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-[10px] font-bold uppercase">
                  <Shield className="w-3 h-3" />
                  {user.role}
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold">
                  @{user.username}
                </span>
              </div>
            </div>

            {/* Save/Cancel Controls */}
            {avatarPreview && (
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  onClick={handleUploadAvatar}
                  disabled={avatarUploading}
                  className="px-3 py-1.5 rounded-lg bg-primary dark:bg-secondary text-white dark:text-neutral-950 text-xs font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {avatarUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save Picture
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancelAvatar}
                  disabled={avatarUploading}
                  className="px-3 py-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-300 dark:hover:bg-neutral-700 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            )}

            {/* Alert messages */}
            {avatarError && (
              <p className="text-[10px] text-tertiary font-bold">{avatarError}</p>
            )}
            {avatarSuccess && (
              <p className="text-[10px] text-primary dark:text-secondary font-bold">{avatarSuccess}</p>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information & Profile Verification Card */}
      <div className="bg-white dark:bg-neutral-900 border border-outline-variant/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-4 h-4 text-primary dark:text-secondary" />
            <h2 className="font-headline text-sm font-bold text-on-surface dark:text-white">
              Personal Information & Profile Verification
            </h2>
          </div>
          {user.role === 'member' && (() => {
            const isApprovedMember = user.profile?.status === 'approved' || user.profile?.status === 'active' || user.profile?.is_verified === true;
            return user.profile?.profile_completed ? (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                isApprovedMember
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300/40'
                  : user.profile?.status === 'disapproved'
                  ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-300/40'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/40'
              }`}>
                {isApprovedMember
                  ? 'Approved'
                  : user.profile?.status === 'disapproved'
                  ? 'Disapproved'
                  : 'Under Review'}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/40">
                Incomplete
              </span>
            );
          })()}
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
          {user.role === 'member' && user.profile?.profile_completed && !(user.profile?.status === 'approved' || user.profile?.status === 'active' || user.profile?.is_verified === true) && user.profile?.status !== 'disapproved' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-medium space-y-1 mb-4">
              <p className="font-bold">Your profile has been submitted for verification.</p>
              <p>Your information is currently under review by Coop Admin. Approval typically takes 24–48 hours. Loan application features will be unlocked once your account has been approved.</p>
            </div>
          )}

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
              {/* Title & TIN Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Member Title *
                  </label>
                  <select
                    required
                    value={titleDropdown}
                    onChange={(e) => setTitleDropdown(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white"
                  >
                    {PREDEFINED_TITLES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    <option value="Other">Other (Specify Custom Title)</option>
                  </select>
                </div>

                {titleDropdown === 'Other' ? (
                  <div className="space-y-1.5">
                    <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                      Custom Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. Prof. or Rev."
                      className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white placeholder:text-neutral-400"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                      TIN (Taxpayer ID) *
                    </label>
                    <input
                      type="text"
                      required
                      value={tin}
                      onChange={(e) => setTin(e.target.value)}
                      placeholder="000-000-000-000"
                      className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white placeholder:text-neutral-400"
                    />
                  </div>
                )}
              </div>

              {titleDropdown === 'Other' && (
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    TIN (Taxpayer ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={tin}
                    onChange={(e) => setTin(e.target.value)}
                    placeholder="000-000-000-000"
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white placeholder:text-neutral-400"
                  />
                </div>
              )}

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
                    Middle Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Optional"
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
                    Email Address *
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white placeholder:text-neutral-400"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Phone Number *
                  </label>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0917XXXXXXX"
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white placeholder:text-neutral-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Age (Auto-computed)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={age}
                    placeholder="Auto-computed"
                    className="w-full px-3 py-2.5 bg-neutral-200/60 dark:bg-neutral-800/80 border border-outline-variant/50 rounded-xl text-xs font-bold text-neutral-700 dark:text-neutral-300 cursor-not-allowed outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Sex / Gender *
                  </label>
                  <select
                    required
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Civil Status *
                  </label>
                  <select
                    required
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white"
                  >
                    <option value="">Select Civil Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Date of Birth *
                  </label>
                  <div className="relative group">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={(e) => {
                        const dobVal = e.target.value;
                        setDateOfBirth(dobVal);
                        setAge(computeAgeFromDob(dobVal));
                      }}
                      className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/50 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary transition-all text-on-surface dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-[11px] uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400">
                    Address *
                  </label>
                  <div className="relative group">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary pointer-events-none" />
                    <input
                      type="text"
                      required
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
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {user.role === 'member' && !user.profile?.profile_completed ? 'Submit Profile for Verification' : 'Submit Changes'}
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

      {/* User Login & Logout History */}
      <UserAccessHistoryTable />

      {showVerificationModal && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-modal-pop text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">
                Under Review
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Your credentials have been submitted for review.
              </p>
            </div>
            <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">
              Your profile updates have been successfully submitted to the Cooperative Administrator. Please wait up to <strong>24 hours</strong> while the admin reviews and verifies your credentials. You will be notified as soon as you are fully verified.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowVerificationModal(false)}
                className="w-full py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-xl text-sm font-bold hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


