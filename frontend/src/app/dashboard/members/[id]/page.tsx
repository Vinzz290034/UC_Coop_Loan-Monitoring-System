'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { SkeletonCard } from '@/components/ui/Skeleton';
import LoanBillingLedgerModal from '@/components/billing/LoanBillingLedgerModal';
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
  CheckCircle2,
  X,
  UserCheck,
  Building,
  PiggyBank,
  Coins,
  TrendingDown,
  ShieldCheck,
  Clock,
  Trash2,
  FileText,
  Layers,
  Eye,
  Receipt,
  Wallet,
  Banknote,
  AlertCircle,
  CircleDollarSign
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
  const [memberNo, setMemberNo] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [civilStatus, setCivilStatus] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [title, setTitle] = useState('');
  const [tin, setTin] = useState('');
  const [membershipType, setMembershipType] = useState<'Regular' | 'Associate'>('Regular');
  const [isVerified, setIsVerified] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Update status state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<'active' | 'suspended' | 'inactive'>('active');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Delete member state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Tab & Portfolio states
  const [activeTab, setActiveTab] = useState<'loans' | 'share_capital' | 'logs'>('loans');
  const [loanFilter, setLoanFilter] = useState<'all' | 'active' | 'fully_paid'>('all');
  const [loans, setLoans] = useState<any[]>([]);
  const [shareCapital, setShareCapital] = useState<any>(null);
  const [selectedLoanIdForLedger, setSelectedLoanIdForLedger] = useState<string | null>(null);

  const getAvatarUrl = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || '';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  };

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
      setMemberNo(mData.member_no || '');
      setTitle(mData.title || '');
      setTin(mData.tin || '');
      setFirstName(mData.first_name || '');
      setLastName(mData.last_name || '');
      setMiddleName(mData.middle_name || '');
      setAge(mData.age != null ? String(mData.age) : '');
      setGender(mData.gender || '');
      setCivilStatus(mData.civil_status || '');
      setEmail(mData.email || '');
      setPhone(mData.phone || '');
      setAddress(mData.address || '');
      setMembershipType(mData.membership_type || 'Regular');
      setIsVerified(!!mData.is_verified);
      if (mData.date_of_birth) {
        setDob(new Date(mData.date_of_birth).toISOString().split('T')[0]);
      }

      // Parallel fetch for financial portfolios
      const [balancesRes, loansRes, scRes] = await Promise.allSettled([
        api.get(`/members/${memberId}/dashboard-summary`),
        api.get(`/loans?member_id=${memberId}`),
        api.get(`/accounts/share-capital/${memberId}`)
      ]);

      if (balancesRes.status === 'fulfilled') {
        setBalances(balancesRes.value.data.data);
      }
      if (loansRes.status === 'fulfilled') {
        setLoans(loansRes.value.data.data || []);
      }
      if (scRes.status === 'fulfilled') {
        setShareCapital(scRes.value.data || null);
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
        member_no: memberNo?.trim() || undefined,
        title: title || undefined,
        tin: tin || undefined,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName || undefined,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        civil_status: civilStatus || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        date_of_birth: dob || undefined,
        membership_type: membershipType,
        is_verified: isVerified,
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

  const handleDeleteMember = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const res = await api.delete(`/members/${memberId}`);
      if (res.data && res.data.success) {
        router.push('/dashboard/members');
      }
    } catch (err: any) {
      console.error('Error deleting member profile:', err);
      setDeleteError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to remove member and associated data.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(val || 0);
  };

  const getStatusBadge = (status: string, isVerified?: boolean) => {
    if (isVerified || status === 'pending' || status === 'approved') {
      return null;
    }
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
      case 'inactive':
      default:
        return null;
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
        <BackButton href="/dashboard/members">Back to members</BackButton>
        <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl">
          <h4 className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Retrieval Failed
          </h4>
          <p className="text-sm mt-1">{error || 'Member not found.'}</p>
        </div>
      </div>
    );
  }

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'staff';

  return (
    <div className="space-y-6">
      {/* Navigation */}
        <BackButton href="/dashboard/members">Back to Members Ledger</BackButton>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Profile Card */}
        <div className="lg:col-span-1 bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary text-2xl font-bold font-headline border border-outline-variant/30">
              {member.profile_picture_url ? (
                <img
                  src={getAvatarUrl(member.profile_picture_url) || ''}
                  alt={`${member.first_name} ${member.last_name}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.parentElement && !e.currentTarget.parentElement.querySelector('span')) {
                      const span = document.createElement('span');
                      span.innerText = `${member.first_name?.charAt(0) || ''}${member.last_name?.charAt(0) || ''}`;
                      e.currentTarget.parentElement.appendChild(span);
                    }
                  }}
                />
              ) : (
                <span>{member.first_name.charAt(0)}{member.last_name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white">
                {member.first_name} {member.middle_name ? `${member.middle_name} ` : ''}{member.last_name}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary dark:bg-secondary/10 dark:text-secondary border border-primary/20 dark:border-secondary/20">
                  Member ID: {member.member_no || 'N/A'}
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Joined {new Date(member.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 w-full">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                member.membership_type === 'Associate'
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/50'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50'
              }`}>
                {member.membership_type === 'Associate' ? 'Associate Member' : 'Regular Member'}
              </span>
              {getStatusBadge(member.status, member.is_verified || member.status === 'approved' || member.status === 'active') ? <div>{getStatusBadge(member.status, member.is_verified || member.status === 'approved' || member.status === 'active')}</div> : null}
              {(member.is_verified || member.status === 'approved' || member.status === 'active') ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary dark:bg-secondary/10 dark:text-secondary border border-primary/20 dark:border-secondary/20">
                  <ShieldCheck className="w-3 h-3" /> Fully Verified
                </span>
              ) : (
                <div className="flex flex-col items-center gap-2 w-full px-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30">
                    <Clock className="w-3 h-3 animate-pulse" /> Pending Verification
                  </span>
                  {isAdminOrManager && (
                    <button
                      onClick={async () => {
                        try {
                          await api.put(`/members/${memberId}`, {
                            first_name: member.first_name,
                            last_name: member.last_name,
                            middle_name: member.middle_name,
                            title: member.title || undefined,
                            tin: member.tin || undefined,
                            age: member.age,
                            gender: member.gender,
                            civil_status: member.civil_status,
                            email: member.email,
                            phone: member.phone,
                            address: member.address,
                            date_of_birth: member.date_of_birth ? new Date(member.date_of_birth).toISOString().split('T')[0] : null,
                            membership_type: member.membership_type || 'Regular',
                            is_verified: true,
                            status: 'approved',
                          });
                          fetchProfileAndBalances();
                        } catch (err: any) {
                          alert(err.response?.data?.error?.message || 'Failed to verify member.');
                        }
                      }}
                      className="w-full py-1.5 px-3 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-[10px] rounded-lg shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer text-center"
                    >
                      Approve Verification
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-outline-variant/40 pt-6 space-y-4 text-xs font-body">
            <div className="flex items-center gap-3">
              <span className="font-bold text-neutral-600 dark:text-neutral-400 w-24">Member ID:</span>
              <span className="text-on-surface dark:text-white font-mono font-bold text-primary dark:text-secondary">
                {member.member_no || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-neutral-600 dark:text-neutral-400 w-24">Membership:</span>
              <span className={`font-semibold ${member.membership_type === 'Associate' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {member.membership_type === 'Associate' ? 'Associate Member' : 'Regular Member'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-neutral-600 dark:text-neutral-400 w-24">Title:</span>
              <span className="text-on-surface dark:text-white font-semibold">{member.title || <span className="italic text-neutral-600 dark:text-neutral-400/50">Not set</span>}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-neutral-600 dark:text-neutral-400 w-24">TIN:</span>
              <span className="text-on-surface dark:text-white font-semibold">{member.tin || <span className="italic text-neutral-600 dark:text-neutral-400/50">Not set</span>}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-neutral-600 dark:text-neutral-400 w-24">Age:</span>
              <span className="text-on-surface dark:text-white font-semibold">{member.age != null ? `${member.age} years old` : <span className="italic text-neutral-600 dark:text-neutral-400/50">Not set</span>}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-neutral-600 dark:text-neutral-400 w-24">Sex / Gender:</span>
              <span className="text-on-surface dark:text-white font-semibold">{member.gender || <span className="italic text-neutral-600 dark:text-neutral-400/50">Not set</span>}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-neutral-600 dark:text-neutral-400 w-24">Civil Status:</span>
              <span className="text-on-surface dark:text-white font-semibold">{member.civil_status || <span className="italic text-neutral-600 dark:text-neutral-400/50">Not set</span>}</span>
            </div>
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
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-full text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral/5 transition-all active:scale-95 cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile Details
              </button>
              <button
                onClick={() => {
                  setNewStatus(member.status);
                  setIsStatusModalOpen(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                Update Account Status
              </button>
              <button
                onClick={() => {
                  setDeleteError(null);
                  setIsDeleteModalOpen(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Remove Member Account
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
                  <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Active Loans</span>
                  <div className="font-headline text-base font-extrabold text-on-surface dark:text-white mt-1">
                    {balances.loans?.active_count ?? 0}
                  </div>
                </div>

                <div className="p-4 bg-neutral/5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-neutral-600 dark:text-neutral-400 font-label">Total Disbursed Principal</span>
                  <div className="font-headline text-base font-extrabold text-on-surface dark:text-white mt-1">
                    {formatCurrency(balances.loans?.original_principal)}
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

          {/* Tabbed Portfolio Workspace */}
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-3xl shadow-sm overflow-hidden">
            {/* Tab Header Navigation */}
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-outline-variant/40 overflow-x-auto scrollbar-none bg-surface-container-low/40 dark:bg-surface-container-high/20">
              <button
                type="button"
                onClick={() => setActiveTab('loans')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-headline text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'loans'
                    ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                    : 'border-transparent text-neutral-500 hover:text-on-surface dark:hover:text-white'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Loans Portfolio</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'loans'
                    ? 'bg-primary/10 text-primary dark:bg-secondary/10 dark:text-secondary font-bold'
                    : 'bg-neutral/10 text-neutral-500'
                }`}>
                  {loans.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('share_capital')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-headline text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'share_capital'
                    ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                    : 'border-transparent text-neutral-500 hover:text-on-surface dark:hover:text-white'
                }`}
              >
                <PiggyBank className="w-4 h-4" />
                <span>Share Capital Ledger</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'share_capital'
                    ? 'bg-primary/10 text-primary dark:bg-secondary/10 dark:text-secondary font-bold'
                    : 'bg-neutral/10 text-neutral-500'
                }`}>
                  {formatCurrency(shareCapital?.balance ?? shareCapital?.current_balance ?? balances?.balances?.share_capital ?? 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-headline text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'logs'
                    ? 'border-primary dark:border-secondary text-primary dark:text-secondary'
                    : 'border-transparent text-neutral-500 hover:text-on-surface dark:hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Status Audit Logs</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral/10 text-neutral-500">
                  {member.status_history?.length || 0}
                </span>
              </button>
            </div>

            {/* Tab 1: Loans Portfolio */}
            {activeTab === 'loans' && (
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 p-1 bg-surface-container-low dark:bg-surface-container-high/30 rounded-xl border border-outline-variant/40">
                    <button
                      type="button"
                      onClick={() => setLoanFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        loanFilter === 'all'
                          ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-sm'
                          : 'text-neutral-500 hover:text-on-surface dark:hover:text-white'
                      }`}
                    >
                      All Loans ({loans.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoanFilter('active')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        loanFilter === 'active'
                          ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-sm'
                          : 'text-neutral-500 hover:text-on-surface dark:hover:text-white'
                      }`}
                    >
                      Active ({loans.filter(l => ['disbursed', 'active', 'approved', 'defaulted'].includes(l.status)).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoanFilter('fully_paid')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        loanFilter === 'fully_paid'
                          ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-sm'
                          : 'text-neutral-500 hover:text-on-surface dark:hover:text-white'
                      }`}
                    >
                      Fully Paid ({loans.filter(l => l.status === 'fully_paid').length})
                    </button>
                  </div>

                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Showing {loans.filter(l => {
                      if (loanFilter === 'active') return ['disbursed', 'active', 'approved', 'defaulted'].includes(l.status);
                      if (loanFilter === 'fully_paid') return l.status === 'fully_paid';
                      return true;
                    }).length} loan contracts
                  </span>
                </div>

                {/* Loans Table */}
                <div className="border border-outline-variant/50 rounded-2xl overflow-hidden bg-white dark:bg-surface-container-low shadow-sm">
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse min-w-[950px]">
                      <thead className="sticky top-0 z-10 bg-surface-container-low dark:bg-surface-container-high/80 backdrop-blur-md border-b border-outline-variant/60">
                        <tr>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">#</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">LAF No</th>
                          <th className="px-4 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider min-w-[200px] whitespace-nowrap">Loan Product</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Disbursed</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap text-center">Terms</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Amount Loaned</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Total Paid</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Balance</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-center">Status</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider text-right">Ledger</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30 font-body text-xs text-on-surface dark:text-white/90">
                        {loans
                          .filter(l => {
                            if (loanFilter === 'active') return ['disbursed', 'active', 'approved', 'defaulted'].includes(l.status);
                            if (loanFilter === 'fully_paid') return l.status === 'fully_paid';
                            return true;
                          })
                          .map((loan, idx) => {
                            const isPaid = loan.status === 'fully_paid' || parseFloat(loan.remaining_balance) <= 0;
                            const isDelinquent = ['defaulted'].includes(loan.status) || (!isPaid && parseFloat(loan.remaining_balance) > 0);

                            return (
                              <tr
                                key={loan.id}
                                className={`hover:bg-neutral/5 dark:hover:bg-white/5 transition-colors ${
                                  !isPaid ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                                }`}
                              >
                                <td className="px-3.5 py-3 font-mono text-[11px] text-neutral-400">{idx + 1}</td>
                                <td className="px-3.5 py-3 whitespace-nowrap">
                                  <span className="font-mono text-[11px] font-bold text-primary dark:text-secondary px-2 py-0.5 rounded-md bg-primary/10 dark:bg-secondary/10 border border-primary/20 dark:border-secondary/20">
                                    LAF #{loan.laf_no || '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-on-surface dark:text-white min-w-[200px] whitespace-nowrap">
                                  {loan.product_name || 'Loan Contract'}
                                </td>
                                <td className="px-3.5 py-3 font-mono text-[11px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                                  {loan.disbursed_at
                                    ? new Date(loan.disbursed_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })
                                    : loan.created_at
                                    ? new Date(loan.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })
                                    : '—'}
                                </td>
                                <td className="px-3.5 py-3 font-mono text-[11px] text-center whitespace-nowrap">
                                  {loan.term_months ? `${loan.term_months} mos` : '—'}
                                </td>
                                <td className="px-3.5 py-3 font-mono font-bold whitespace-nowrap">
                                  {formatCurrency(loan.principal_amount)}
                                </td>
                                <td className="px-3.5 py-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                  {formatCurrency(loan.total_paid || 0)}
                                </td>
                                <td className="px-3.5 py-3 font-mono font-bold whitespace-nowrap">
                                  {isPaid ? (
                                    <span className="text-neutral-400 font-normal">₱0.00</span>
                                  ) : (
                                    <span className="text-tertiary font-bold">{formatCurrency(loan.remaining_balance || 0)}</span>
                                  )}
                                </td>
                                <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                  {isPaid ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      <CheckCircle2 className="w-3 h-3" /> Fully Paid
                                    </span>
                                  ) : loan.status === 'defaulted' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                      <AlertCircle className="w-3 h-3" /> Defaulted
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                      <Clock className="w-3 h-3" /> Active
                                    </span>
                                  )}
                                </td>
                                <td className="px-3.5 py-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLoanIdForLedger(loan.id)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface border border-outline-variant rounded-lg text-[11px] font-bold text-primary dark:text-secondary hover:bg-primary/10 dark:hover:bg-secondary/10 transition-all active:scale-95 cursor-pointer shadow-2xs"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Ledger</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Share Capital Ledger */}
            {activeTab === 'share_capital' && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/40 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 font-label">Current Share Capital</span>
                    <div className="font-headline text-lg font-extrabold text-primary dark:text-secondary mt-1">
                      {formatCurrency(shareCapital?.balance ?? shareCapital?.current_balance ?? balances?.balances?.share_capital ?? 0)}
                    </div>
                  </div>
                  <div className="p-4 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/40 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 font-label">Total Deposits / Credits</span>
                    <div className="font-headline text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatCurrency(
                        shareCapital?.transactions
                          ?.filter((t: any) => t.transaction_type === 'credit')
                          ?.reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0) ?? balances?.balances?.share_capital ?? 0
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-surface-container-low dark:bg-surface-container-high/40 border border-outline-variant/40 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 font-label">Total Withdrawals</span>
                    <div className="font-headline text-lg font-extrabold text-neutral-500 mt-1">
                      ₱0.00
                    </div>
                  </div>
                </div>

                {/* Share Capital Transactions Table */}
                <div className="border border-outline-variant/50 rounded-2xl overflow-hidden bg-white dark:bg-surface-container-low shadow-sm">
                  <div className="overflow-x-auto max-h-[450px] overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left border-collapse min-w-[650px]">
                      <thead className="sticky top-0 z-10 bg-surface-container-low dark:bg-surface-container-high/80 backdrop-blur-md border-b border-outline-variant/60">
                        <tr>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">#</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Transaction Date</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Invoice / Mode</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Amount</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">Running Balance</th>
                          <th className="px-3.5 py-3 font-headline text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Remarks / Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/30 font-body text-xs text-on-surface dark:text-white/90">
                        {shareCapital?.transactions && shareCapital.transactions.length > 0 ? (
                          shareCapital.transactions.map((tx: any, idx: number) => (
                            <tr key={tx.id || idx} className="hover:bg-neutral/5 dark:hover:bg-white/5 transition-colors">
                              <td className="px-3.5 py-3 font-mono text-[11px] text-neutral-400">{idx + 1}</td>
                              <td className="px-3.5 py-3 font-mono text-[11px] whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                                {new Date(tx.transaction_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-neutral/10 text-neutral-600 dark:text-neutral-300">
                                  {tx.invoice_no || tx.mode || 'SD'}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  tx.transaction_type === 'credit'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                }`}>
                                  {tx.transaction_type?.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-3.5 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                +{formatCurrency(tx.amount)}
                              </td>
                              <td className="px-3.5 py-3 font-mono font-extrabold text-on-surface dark:text-white whitespace-nowrap">
                                {formatCurrency(tx.balance_after)}
                              </td>
                              <td className="px-3.5 py-3 text-neutral-500 text-xs truncate max-w-xs">
                                {tx.remarks || 'Share capital placement'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-neutral-400 text-xs italic">
                              No share capital transactions recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Audit Logs */}
            {activeTab === 'logs' && (
              <div className="p-6 space-y-4">
                {member.status_history && member.status_history.length === 0 ? (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 italic text-center py-6">
                    No historical status modifications logged.
                  </p>
                ) : (
                  <div className="relative border-l border-outline-variant/60 ml-3 pl-5 space-y-6">
                    {member.status_history?.map((log: any) => (
                      <div key={log.id} className="relative">
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
                          <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-semibold">
                            Logged by: @{log.changed_by_username || 'system'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Edit Profile Details</h2>

            {editError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditProfileSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-label text-xs font-bold text-primary dark:text-secondary px-1">Member ID / System Code</label>
                <input
                  type="text"
                  value={memberNo}
                  onChange={(e) => setMemberNo(e.target.value)}
                  placeholder="e.g. 2026-41"
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                />
              </div>

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
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Mr., Ms., Engr., Dr."
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">TIN (Taxpayer ID)</label>
                  <input
                    type="text"
                    value={tin}
                    onChange={(e) => setTin(e.target.value)}
                    placeholder="000-000-000-000"
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-1">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Age</label>
                  <input
                    type="number"
                    min={18}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
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
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Sex / Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Civil Status</label>
                  <select
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Membership Type *</label>
                  <select
                    value={membershipType}
                    onChange={(e: any) => setMembershipType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white font-semibold"
                  >
                    <option value="Regular">Regular Member (Full Rights & Loans)</option>
                    <option value="Associate">Associate Member (Non-Voting / Restricted)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Home Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street details, City"
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 px-1">
                <input
                  type="checkbox"
                  id="isVerifiedCheckbox"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="w-4 h-4 text-primary dark:text-secondary rounded border-outline-variant focus:ring-primary/20 cursor-pointer"
                />
                <label htmlFor="isVerifiedCheckbox" className="font-label text-xs font-bold text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                  Fully Verified (Unlocks Loan Privileges)
                </label>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setIsStatusModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
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

      {/* Delete Member Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-headline text-base font-bold text-on-surface dark:text-white">Remove Member Account</h2>
                <p className="text-xs text-neutral-500">Permanent ledger & data removal</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl text-red-800 dark:text-red-300 text-xs font-medium space-y-1.5 mb-5">
              <p>Are you sure you want to permanently delete <strong>{member.first_name} {member.last_name}</strong>?</p>
              <p className="text-[11px] text-red-700 dark:text-red-400">
                This will permanently delete this member along with all associated loan contracts, repayment schedules, payment history, share capital transactions, and ledger logs. <strong>This action cannot be undone.</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? 'Deleting Member...' : 'Delete Member & Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loan Billing Ledger Modal */}
      {selectedLoanIdForLedger && (
        <LoanBillingLedgerModal
          loanId={selectedLoanIdForLedger}
          onClose={() => setSelectedLoanIdForLedger(null)}
        />
      )}
    </div>
  );
}
