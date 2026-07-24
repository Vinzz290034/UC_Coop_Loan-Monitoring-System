'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { SkeletonCard } from '@/components/ui/Skeleton';
import KpiCard from '@/components/charts/KpiCard';
import {
  ArrowLeft,
  Shield,
  Clock,
  UserCheck,
  UserX,
  Building,
  Banknote,
  PiggyBank,
  Coins,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Pencil,
  Trash2,
  X,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import UserAccessHistoryTable from '@/components/UserAccessHistoryTable';

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({
  isOpen,
  onClose,
  userData,
  onSuccess,
  currentUserId,
}: {
  isOpen: boolean;
  onClose: () => void;
  userData: any;
  onSuccess: () => void;
  currentUserId: string;
}) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isSelf = userData?.id === currentUserId;

  useEffect(() => {
    if (userData) {
      setUsername(userData.username || '');
      setRole(userData.role || 'member');
      setIsActive(userData.is_active ?? true);
      setNewPassword('');
      setShowPassword(false);
      setError(null);
      setSuccess(false);
    }
  }, [userData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = { username, role, is_active: isActive };
      if (newPassword) payload.new_password = newPassword;

      await api.put(`/auth/users/${userData.id}`, payload);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update user.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !userData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-modal-backdrop">
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
          <div>
            <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">
              Edit User Account
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Modify account details for @{userData.username}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>User updated successfully!</span>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface dark:text-neutral-200" htmlFor="edit-username">
              Username
            </label>
            <input
              type="text"
              id="edit-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              disabled={success}
              className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/65 rounded-xl text-sm font-body font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-secondary/30 disabled:opacity-50 transition-all"
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface dark:text-neutral-200" htmlFor="edit-role">
              Role
            </label>
            <select
              id="edit-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={success || isSelf}
              className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/65 rounded-xl text-sm font-body font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-secondary/30 disabled:opacity-50 transition-all"
            >
              <option value="member">Member</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            {isSelf && (
              <p className="text-[10px] text-neutral-500 px-1">You cannot change your own role.</p>
            )}
          </div>

          {/* Active Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface dark:text-neutral-200">
              Account Status
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => !isSelf && setIsActive(true)}
                disabled={success || isSelf}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  isActive
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                    : 'border-outline-variant/65 text-neutral-500 hover:bg-neutral/5'
                } disabled:opacity-50`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Active
                </span>
              </button>
              <button
                type="button"
                onClick={() => !isSelf && setIsActive(false)}
                disabled={success || isSelf}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  !isActive
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
                    : 'border-outline-variant/65 text-neutral-500 hover:bg-neutral/5'
                } disabled:opacity-50`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <UserX className="w-4 h-4" /> Inactive
                </span>
              </button>
            </div>
            {isSelf && (
              <p className="text-[10px] text-neutral-500 px-1">You cannot deactivate your own account.</p>
            )}
          </div>

          {/* New Password (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface dark:text-neutral-200" htmlFor="edit-password">
              Reset Password <span className="text-neutral-400 normal-case">(optional)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="edit-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                disabled={success}
                className="w-full px-4 pr-12 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/65 rounded-xl text-sm font-body font-semibold text-on-surface dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-secondary/30 disabled:opacity-50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary dark:hover:text-secondary transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-outline-variant/65 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || success}
              className="flex-1 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-xl text-sm font-bold hover:scale-[1.01] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  username,
  deleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  username: string;
  deleting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-modal-backdrop">
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-modal-pop">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-tertiary" />
          </div>
          <div>
            <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">
              Delete User
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              This action cannot be undone.
            </p>
          </div>
        </div>

        <p className="text-sm text-on-surface/80 dark:text-neutral-300">
          Are you sure you want to permanently delete user <strong className="text-tertiary">@{username}</strong>?
        </p>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-2.5 border border-outline-variant/65 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral/5 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 bg-tertiary text-white rounded-xl text-sm font-bold hover:scale-[1.01] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {deleting ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main User Detail Page ────────────────────────────────────────────────────
export default function UserDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { setBreadcrumbLabel } = useBreadcrumb();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [activityData, setActivityData] = useState<any>(null);
  const [memberSummary, setMemberSummary] = useState<any>(null);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isSelf = userId === user?.id?.toString();

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchUserDetail = async () => {
    if (!userId || user?.role !== 'admin') return;
    try {
      setLoading(true);
      setError(null);

      // Fetch user activity from audit controller
      const activityRes = await api.get(`/audit/user/${userId}/activity?limit=55`);
      setUserData(activityRes.data.user);
      setActivityData(activityRes.data);
      if (activityRes.data.user?.username) {
        setBreadcrumbLabel(userId, activityRes.data.user.username);
      }

      // If user has a member profile, fetch financial summary
      const usersRes = await api.get(`/auth/users?search=`);
      const matchedUser = usersRes.data.data.find((u: any) => u.id === userId);
      if (matchedUser?.member_profile?.id) {
        try {
          const summaryRes = await api.get(`/members/${matchedUser.member_profile.id}/dashboard-summary`);
          setMemberSummary(summaryRes.data.data);
        } catch {
          // Member summary might fail if no financial data exists
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load user details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetail();
  }, [userId, user]);

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      await api.delete(`/auth/users/${userId}`);
      router.push('/dashboard/users');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete user.');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val || 0);
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      member: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${styles[role] || 'bg-neutral/10 text-neutral-600'}`}>
        <Shield className="w-3.5 h-3.5" />
        {role}
      </span>
    );
  };

  if (user?.role !== 'admin') return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-neutral/20 w-48 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackButton>Back</BackButton>
        <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl">
          <h4 className="font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Error</h4>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const stats = activityData?.stats || {};
  const balances = memberSummary?.balances || {};
  const loans = memberSummary?.loans || {};

  return (
    <div className="space-y-6">
      <BackButton href="/dashboard/users">Back to Users</BackButton>

      {/* User Profile Card */}
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 dark:bg-secondary/15 flex items-center justify-center text-xl font-bold text-primary dark:text-secondary">
              {userData?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-headline text-2xl font-extrabold text-on-surface dark:text-white">
                  {userData?.username}
                </h1>
                {getRoleBadge(userData?.role)}
                {userData?.is_active ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-600"><UserCheck className="w-4 h-4" /> Active</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-red-500"><UserX className="w-4 h-4" /> Inactive</span>
                )}
              </div>
              <div className="flex flex-wrap gap-6 mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                <div>
                  <span className="font-bold text-neutral-600 dark:text-neutral-300">Registered:</span>{' '}
                  {formatDateTime(userData?.created_at)}
                </div>
                <div>
                  <span className="font-bold text-neutral-600 dark:text-neutral-300">Last Login:</span>{' '}
                  <span className="flex items-center gap-1 inline-flex"><Clock className="w-3 h-3" /> {formatDateTime(userData?.last_login_at)}</span>
                </div>
                <div>
                  <span className="font-bold text-neutral-600 dark:text-neutral-300">Last Activity:</span>{' '}
                  {formatDateTime(userData?.last_activity_at)}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-xs font-bold rounded-xl hover:scale-[1.01] active:scale-95 transition-all shadow-md cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            {!isSelf && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-tertiary/10 text-tertiary font-label text-xs font-bold rounded-xl hover:bg-tertiary/20 active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activity Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
          <div className="text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400 mb-1">Total Actions</div>
          <div className="font-headline text-xl font-extrabold text-on-surface dark:text-white">{stats.total_actions || 0}</div>
        </div>
        <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
          <div className="text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400 mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" /> Successful
          </div>
          <div className="font-headline text-xl font-extrabold text-green-600 dark:text-green-400">{stats.successful_actions || 0}</div>
        </div>
        <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
          <div className="text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400 mb-1 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-500" /> Failed
          </div>
          <div className="font-headline text-xl font-extrabold text-red-500">{stats.failed_actions || 0}</div>
        </div>
        <div className="p-4 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl shadow-sm">
          <div className="text-[10px] font-bold uppercase text-neutral-600 dark:text-neutral-400 mb-1">Login Attempts</div>
          <div className="font-headline text-xl font-extrabold text-on-surface dark:text-white">{stats.login_attempts || 0}</div>
        </div>
      </div>

      {/* Financial Summary (if member) */}
      {memberSummary && (
        <div>
          <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Financial Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard label="Share Capital" value={formatCurrency(balances.share_capital)} icon={Building} description="Equity contributions" />
            <KpiCard label="Fixed Deposits" value={formatCurrency(balances.fixed_deposits)} icon={PiggyBank} description="Timed placements" />
            <KpiCard label="Investments" value={formatCurrency(balances.investments)} icon={Coins} description="Investment portfolios" />
            <KpiCard label="Outstanding Loan" value={formatCurrency(loans.outstanding_balance)} icon={Banknote} variant="danger" description={`${loans.active_count} active loan(s)`} />
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-6 shadow-sm">
        <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary dark:text-secondary" />
          Recent Activity
        </h2>

        {activityData?.data?.length > 0 ? (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {activityData.data.map((log: any) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-surface dark:bg-surface-container-high/50 border border-outline-variant/30"
              >
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-sm font-bold text-on-surface dark:text-white">{log.action}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral/5 dark:bg-neutral/10 text-neutral-500 font-mono">{log.module}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>{formatDateTime(log.created_at)}</span>
                    <span className="font-mono">{log.method} {log.endpoint}</span>
                    {log.ip_address && <span>IP: {log.ip_address}</span>}
                    <span className={`font-bold ${log.status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                      {log.status_code} {log.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No activity recorded yet.</p>
          </div>
        )}
      </div>

      {/* User Login & Logout History */}
      <UserAccessHistoryTable userId={userId} title={`${userData.username}'s Login & Logout History`} />

      {/* Modals */}
      <EditUserModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        userData={userData}
        onSuccess={fetchUserDetail}
        currentUserId={user?.id?.toString() || ''}
      />
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteUser}
        username={userData?.username || ''}
        deleting={deleting}
      />
    </div>
  );
}
