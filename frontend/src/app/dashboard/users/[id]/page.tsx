'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
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
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useBreadcrumb } from '@/context/BreadcrumbContext';

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

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    async function fetchUserDetail() {
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
    }

    fetchUserDetail();
  }, [userId, user]);

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
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
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
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/users')}
        className="flex items-center gap-2 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-primary dark:hover:text-secondary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {/* User Profile Card */}
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-6 shadow-sm">
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
    </div>
  );
}
