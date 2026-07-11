'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  Clock,
  ChevronRight,
  Filter,
  AlertTriangle,
  Plus,
  X,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserData {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  last_activity_at: string | null;
  created_at: string;
  member_profile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    status: string;
  } | null;
}

// ─── Create Account Modal ─────────────────────────────────────────────────────
function CreateAccountModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setRole('member');
    setShowPassword(false);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/register', { username, password, role });
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
          <div>
            <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">
              Create Account
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Add a new user to the system
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-neutral-500 hover:bg-neutral/10 transition-colors"
          >
            <X className="w-5 h-5" />
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
              <span>Account created successfully!</span>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface dark:text-neutral-200" htmlFor="create-username">
              Username
            </label>
            <input
              type="text"
              id="create-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              placeholder="Enter username"
              disabled={success}
              className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/65 rounded-xl text-sm font-body font-semibold text-on-surface dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-secondary/30 disabled:opacity-50 transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface dark:text-neutral-200" htmlFor="create-password">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="create-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface dark:text-neutral-200" htmlFor="create-role">
              Role
            </label>
            <select
              id="create-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={success}
              className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/50 border border-outline-variant/65 rounded-xl text-sm font-body font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-secondary/30 disabled:opacity-50 transition-all"
            >
              <option value="member">Member</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
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
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
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
          Are you sure you want to permanently delete user <strong className="text-tertiary">@{username}</strong> and all their associated data?
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

// ─── Main Users Page ──────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('is_active', statusFilter);

      const response = await api.get(`/auth/users?${params.toString()}`);
      setUsers(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      const debounce = setTimeout(() => fetchUsers(), 300);
      return () => clearTimeout(debounce);
    }
  }, [searchQuery, roleFilter, statusFilter]);

  // Auto-dismiss success messages
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/auth/users/${deleteTarget.id}`);
      setActionSuccess(`User "${deleteTarget.username}" has been deleted.`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete user.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      member: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${styles[role] || 'bg-neutral/10 text-neutral-600'}`}>
        <Shield className="w-3 h-3" />
        {role}
      </span>
    );
  };

  if (user?.role !== 'admin') return null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface dark:text-white">
            User Management
          </h1>
          <p className="font-body text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            System-wide user directory with profile, login tracking, and activity monitoring
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-sm font-bold rounded-xl shadow-md hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Account
        </button>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username, name, or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-surface-container-low border border-outline-variant/65 text-sm font-body text-on-surface dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-secondary/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-500" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-white dark:bg-surface-container-low border border-outline-variant/65 text-sm font-body text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="member">Member</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-white dark:bg-surface-container-low border border-outline-variant/65 text-sm font-body text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs font-bold text-neutral-600 dark:text-neutral-400">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> {users.length} users found
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        /* Users Grid */
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl p-4 hover:border-primary/40 dark:hover:border-secondary/40 transition-all group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <Link
                  href={`/dashboard/users/${u.id}`}
                  className="flex items-center gap-4 min-w-0 flex-1"
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${u.is_active ? 'bg-primary/15 text-primary dark:bg-secondary/15 dark:text-secondary' : 'bg-neutral/10 text-neutral-500'}`}>
                    {u.member_profile
                      ? `${u.member_profile.first_name[0]}${u.member_profile.last_name[0]}`
                      : u.username[0].toUpperCase()}
                  </div>

                  {/* User Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-headline text-sm font-bold text-on-surface dark:text-white truncate">
                        {u.member_profile
                          ? `${u.member_profile.first_name} ${u.member_profile.last_name}`
                          : u.username}
                      </h4>
                      {getRoleBadge(u.role)}
                      {u.is_active ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600">
                          <UserCheck className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-500">
                          <UserX className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span>@{u.username}</span>
                      {u.member_profile?.email && <span>{u.member_profile.email}</span>}
                    </div>
                  </div>
                </Link>

                {/* Meta + Actions */}
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-6 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <div className="text-right">
                      <div className="font-bold text-neutral-600 dark:text-neutral-300">Last Login</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(u.last_login_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-neutral-600 dark:text-neutral-300">Registered</div>
                      <div>{formatDate(u.created_at)}</div>
                    </div>
                  </div>

                  {/* Delete button (don't show for self) */}
                  {u.id !== user?.id.toString() && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget(u);
                      }}
                      className="p-2 rounded-xl text-neutral-400 hover:text-tertiary hover:bg-tertiary/10 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <Link href={`/dashboard/users/${u.id}`}>
                    <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-primary dark:group-hover:text-secondary transition-colors" />
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {users.length === 0 && !loading && (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-body text-sm">No users found matching your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateAccountModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchUsers}
      />
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        username={deleteTarget?.username || ''}
        deleting={deleting}
      />
    </div>
  );
}
