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

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
      <div>
        <h1 className="font-headline text-3xl font-extrabold text-on-surface dark:text-white">
          User Management
        </h1>
        <p className="font-body text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          System-wide user directory with profile, login tracking, and activity monitoring
        </p>
      </div>

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
            <Link
              key={u.id}
              href={`/dashboard/users/${u.id}`}
              className="block bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-2xl p-4 hover:border-primary/40 dark:hover:border-secondary/40 transition-all group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0 flex-1">
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
                </div>

                {/* Meta Info */}
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
                  <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:text-primary dark:group-hover:text-secondary transition-colors" />
                </div>
              </div>
            </Link>
          ))}

          {users.length === 0 && !loading && (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-body text-sm">No users found matching your filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
