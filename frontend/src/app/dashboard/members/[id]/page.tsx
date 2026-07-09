'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  AlertTriangle,
  Edit2,
  Lock,
  History,
  CheckCircle,
  X,
  UserCheck,
  Building,
  PiggyBank,
  Coins,
  TrendingDown
} from 'lucide-react';

interface MemberProfileProps {
  params: Promise<{ id: string }>;
}

export default function MemberProfilePage({ params }: MemberProfileProps) {
  const router = useRouter();
  const { user } = useAuth();
  const resolvedParams = use(params);
  const memberId = resolvedParams.id;
  const { setBreadcrumbLabel } = useBreadcrumb();

  const [member, setMember] = useState<any>(null);
  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit profile state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Update status state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<'active' | 'suspended' | 'inactive'>('active');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchProfileAndBalances = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile
      const profileRes = await api.get(`/members/${memberId}`);
      const mData = profileRes.data.data;
      setMember(mData);
      if (mData?.first_name) {
        setBreadcrumbLabel(memberId, `${mData.first_name} ${mData.last_name}`);
      }
      
      // Initialize edit fields
      setFirstName(mData.first_name || '');
      setLastName(mData.last_name || '');
      setMiddleName(mData.middle_name || '');
      setEmail(mData.email || '');
      setPhone(mData.phone || '');
      setAddress(mData.address || '');
      if (mData.date_of_birth) {
        setDob(new Date(mData.date_of_birth).toISOString().split('T')[0]);
      }

      // Fetch balances summary
      try {
        const balancesRes = await api.get(`/members/${memberId}/dashboard-summary`);
        setBalances(balancesRes.data.data);
      } catch (err) {
        console.warn('Failed to load financial balances for member.', err);
      }
    } catch (err: any) {
      console.error('Error fetching member profile:', err);
      setError(err.response?.data?.message || 'Failed to retrieve member profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndBalances();
  }, [memberId]);

  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) {
      setEditError('First and Last names are required.');
      return;
    }

    setEditError(null);
    setUpdatingProfile(true);

    try {
      await api.put(`/members/${memberId}`, {
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        date_of_birth: dob || undefined,
      });
      setIsEditModalOpen(false);
      fetchProfileAndBalances();
    } catch (err: any) {
      setEditError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusRemarks) {
      setStatusError('Remarks are required for audit trail.');
      return;
    }

    setStatusError(null);
    setUpdatingStatus(true);

    try {
      await api.patch(`/members/${memberId}/status`, {
        status: newStatus,
        remarks: statusRemarks,
      });
      setIsStatusModalOpen(false);
      setStatusRemarks('');
      fetchProfileAndBalances();
    } catch (err: any) {
      setStatusError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(val || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
            <CheckCircle className="w-3.5 h-3.5" />
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-tertiary/10 text-tertiary">
            <AlertTriangle className="w-3.5 h-3.5" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-neutral/15 text-neutral-600 dark:text-neutral-400">
            <X className="w-3.5 h-3.5" />
            Inactive
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/members" className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Back to members
        </Link>
        <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl">
          <h4 className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Retrieval Failed
          </h4>
          <p className="text-sm mt-1">{error || 'Member not found.'}</p>
        </div>
      </div>
    );
  }

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div>
        <Link
          href="/dashboard/members"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-primary dark:hover:text-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Members Ledger
        </Link>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Profile Card */}
        <div className="lg:col-span-1 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary text-2xl font-bold font-headline border border-outline-variant/30">
              {member.first_name.charAt(0)}{member.last_name.charAt(0)}
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white">
                {member.first_name} {member.middle_name || ''} {member.last_name}
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">Joined {new Date(member.created_at).toLocaleDateString()}</p>
            </div>
            <div>{getStatusBadge(member.status)}</div>
          </div>

          <div className="border-t border-outline-variant/40 pt-6 space-y-4 text-xs font-body">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
              <span className="text-on-surface dark:text-white truncate">{member.email || <span className="italic text-neutral-600 dark:text-neutral-400/50">No email registered</span>}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
              <span className="text-on-surface dark:text-white">{member.phone || <span className="italic text-neutral-600 dark:text-neutral-400/50">No phone registered</span>}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
              <span className="text-on-surface dark:text-white">{member.address || <span className="italic text-neutral-600 dark:text-neutral-400/50">No address registered</span>}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
              <span className="text-on-surface dark:text-white">
                DOB: {member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString() : <span className="italic text-neutral-600 dark:text-neutral-400/50">Not set</span>}
              </span>
            </div>
          </div>

          {isAdminOrManager && (
            <div className="flex flex-col gap-2 pt-4 border-t border-outline-variant/40">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-full text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral/5 transition-all active:scale-95"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile Details
              </button>
              <button
                onClick={() => {
                  setNewStatus(member.status);
                  setIsStatusModalOpen(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                Update Account Status
              </button>
            </div>
          )}
        </div>

        {/* Financial Assets & Status Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Member Balance breakdown (only if loaded) */}
          {balances && (
            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white">Financial Position Ledger</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-neutral/5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Share Capital</span>
                  <div className="font-headline text-base font-extrabold text-on-surface dark:text-white mt-1">
                    {formatCurrency(balances.balances?.share_capital)}
                  </div>
                </div>

                <div className="p-4 bg-neutral/5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Fixed Deposits</span>
                  <div className="font-headline text-base font-extrabold text-on-surface dark:text-white mt-1">
                    {formatCurrency(balances.balances?.fixed_deposits)}
                  </div>
                </div>

                <div className="p-4 bg-neutral/5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Active Investments</span>
                  <div className="font-headline text-base font-extrabold text-on-surface dark:text-white mt-1">
                    {formatCurrency(balances.balances?.investments)}
                  </div>
                </div>

                <div className="p-4 bg-tertiary/10 border border-tertiary/20 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-tertiary font-label flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Credit Debt
                  </span>
                  <div className="font-headline text-base font-extrabold text-tertiary mt-1">
                    {formatCurrency(balances.loans?.outstanding_balance)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs */}
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-primary dark:text-secondary" />
              Administrative Audit Logs (Status Changes)
            </h3>
            
            {member.status_history && member.status_history.length === 0 ? (
              <p className="text-xs text-neutral-600 dark:text-neutral-400 italic text-center py-6">No historical status modifications logged.</p>
            ) : (
              <div className="relative border-l border-outline-variant/60 ml-3 pl-5 space-y-6">
                {member.status_history?.map((log: any, index: number) => (
                  <div key={log.id} className="relative">
                    {/* Bullet marker */}
                    <div className="absolute -left-[26px] top-1.5 w-3 h-3 rounded-full bg-outline-variant border-2 border-white dark:border-surface"></div>
                    
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold font-label px-2 py-0.5 bg-neutral/10 rounded-full text-neutral-600 dark:text-neutral-400 font-mono">
                          {log.previous_status || 'initial'}
                        </span>
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">➔</span>
                        <span className={`text-xs font-bold font-label px-2 py-0.5 rounded-full ${
                          log.new_status === 'active' ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'
                        }`}>
                          {log.new_status}
                        </span>
                        <span className="text-[10px] text-neutral-600 dark:text-neutral-400 ml-auto font-mono">
                          {new Date(log.changed_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface dark:text-white/80">{log.remarks}</p>
                      <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-semibold">Logged by: @{log.changed_by_username || 'system'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-fade-in max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral/10 text-neutral-600 dark:text-neutral-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Edit Profile Details</h2>

            {editError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Home Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
                >
                  {updatingProfile ? 'Saving Details...' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-fade-in">
            <button
              onClick={() => setIsStatusModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral/10 text-neutral-600 dark:text-neutral-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Modify Account Status</h2>

            {statusError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            <form onSubmit={handleStatusChangeSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Select Status</label>
                <select
                  value={newStatus}
                  onChange={(e: any) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Remarks / Reasoning *</label>
                <textarea
                  required
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="State the audit logs remark (e.g., annual renewal, delinquency lock)"
                  rows={4}
                  className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
                >
                  {updatingStatus ? 'Updating Status...' : 'Apply Status Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
