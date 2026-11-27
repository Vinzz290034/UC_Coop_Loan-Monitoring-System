'use client';

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import SearchInput from '@/components/SearchInput';
import { SkeletonTable } from '@/components/ui/Skeleton';
import * as XLSX from 'xlsx';
import {
  UserPlus,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  X,
  CheckCircle,
  Eye,
  FileSpreadsheet,
  FileUp,
  ArrowLeft,
  Pencil,
  Check,
  Loader2,
  Maximize2,
  Minimize2,
  Users,
  ChevronDown,
  Clock,
  Shield,
  ArrowUpDown,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

interface Member {
  id: number | string;
  member_no?: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  age?: number;
  gender?: string;
  civil_status?: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  profile_picture_url?: string | null;
  status: 'active' | 'dormant' | 'withdrawn' | 'suspended' | 'inactive' | 'pending' | 'approved' | 'disapproved';
  membership_type?: 'Regular' | 'Associate';
  user_role?: string;
  profile_completed?: boolean;
  created_at: string;
}

function AnimatedSelect({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className = '',
  menuClassName = '',
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const activeLabel = options.find((o) => o.value === value)?.label || placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full px-3 py-1.5 text-xs border border-outline-variant/60 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-on-surface dark:text-white font-semibold flex items-center justify-between gap-2 cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-primary dark:text-secondary shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      <div
        className={`absolute left-0 right-0 mt-1 z-30 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden origin-top transition-all duration-200 ease-out max-h-56 overflow-y-auto ${
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
        } ${menuClassName}`}
      >
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-left text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                selected
                  ? 'bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary'
                  : 'text-on-surface dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {selected && <Check className="w-3 h-3 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MembersPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const urlMembership = searchParams?.get('membership');
  const isAdminOrManager = user ? (user.role === 'admin' || user.role === 'staff') : true;
  const [members, setMembers] = useState<Member[]>([]);
  const [allMembersSummary, setAllMembersSummary] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const memberStats = React.useMemo(() => {
    const source = allMembersSummary.length > 0 ? allMembersSummary : members;
    let regular = 0;
    let associate = 0;
    let active = 0;
    let withdrawn = 0;
    let dormant = 0;
    let pending = 0;
    for (const m of source) {
      const mt = String(m.membership_type || '').toLowerCase();
      if (mt.includes('associate')) {
        associate += 1;
      } else if (mt.includes('regular')) {
        regular += 1;
      }
      const st = String(m.status || '').trim().toLowerCase();
      if (st === 'active' || st === 'approved') {
        active += 1;
      } else if (st === 'withdrawn') {
        withdrawn += 1;
      } else if (st === 'dormant' || st === 'inactive') {
        dormant += 1;
      } else if (st === 'pending' || st === 'pending_review' || st === 'pending review' || !st) {
        pending += 1;
      }
    }
    return { total: source.length, regular, associate, active, withdrawn, dormant, pending };
  }, [allMembersSummary, members]);
  const [error, setError] = useState<string | null>(null);

  // Search, filter, and sort state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [membershipFilter, setMembershipFilter] = useState(
    urlMembership === 'Regular' || urlMembership === 'Associate' ? urlMembership : ''
  );
  const [sortBy, setSortBy] = useState('member_no_asc');

  useEffect(() => {
    if (urlMembership === 'Regular' || urlMembership === 'Associate') {
      setMembershipFilter(urlMembership);
    }
  }, [urlMembership]);

  // Pagination & Expand state
  const [currentPage, setCurrentPage] = useState(1);
  const [isExpandedAll, setIsExpandedAll] = useState(false);
  const itemsPerPage = 8;

  // Add Member Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberNoInput, setMemberNoInput] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [memberStatus, setMemberStatus] = useState<string>('active');
  const [membershipTypeInput, setMembershipTypeInput] = useState<'Regular' | 'Associate'>('Regular');
  const [isMembershipTypeOpen, setIsMembershipTypeOpen] = useState(false);
  const [isInitialStatusOpen, setIsInitialStatusOpen] = useState(false);
  const [isInlineStatusOpen, setIsInlineStatusOpen] = useState(false);
  const membershipTypeDropdownRef = useRef<HTMLDivElement>(null);
  const initialStatusDropdownRef = useRef<HTMLDivElement>(null);
  const inlineStatusDropdownRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (membershipTypeDropdownRef.current && !membershipTypeDropdownRef.current.contains(e.target as Node)) {
        setIsMembershipTypeOpen(false);
      }
      if (initialStatusDropdownRef.current && !initialStatusDropdownRef.current.contains(e.target as Node)) {
        setIsInitialStatusOpen(false);
      }
      if (inlineStatusDropdownRef.current && !inlineStatusDropdownRef.current.contains(e.target as Node)) {
        setIsInlineStatusOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMembershipTypeOpen(false);
        setIsInitialStatusOpen(false);
        setIsInlineStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const router = useRouter();

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ memberId: number | string; field: string } | null>(null);
  const [inlineData, setInlineData] = useState<any>({});
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // References for single vs double click & touch interactions
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<number>(0);

  const handleCellSingleClick = (memberId: number | string) => {
    router.push(`/dashboard/members/${memberId}`);
  };

  // Trigger inline editing mode for a specific member field
  const handleEditClick = (e: React.MouseEvent, memberId: number | string, field: string, initialValues: any) => {
    e.stopPropagation(); // Prevent triggering row/cell click navigation
    setInlineError(null);
    setEditingCell({ memberId, field });
    setInlineData(initialValues);
  };

  const handleTouchStart = () => {
    touchStartRef.current = performance.now();
  };

  const handleTouchEnd = (memberId: number | string, field: string, initialValues: any) => {
    // eslint-disable-next-line react-hooks/purity
    const duration = performance.now() - touchStartRef.current;
    if (duration >= 450) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      setInlineError(null);
      setEditingCell({ memberId, field });
      setInlineData(initialValues);
    }
  };

  const handleSaveInline = async (memberId: number | string, field: string) => {
    try {
      setInlineSaving(true);
      setInlineError(null);

      let updatedFields: any = {};
      if (field === 'status') {
        const patchRes = await api.patch(`/members/${memberId}/status`, {
          status: inlineData.status,
          remarks: 'Updated status via directory table inline edit',
        });
        updatedFields = patchRes.data.data;
      } else {
        const targetMember = members.find((m) => m.id === memberId);
        if (!targetMember) return;

        const payload: any = {
          first_name: targetMember.first_name,
          last_name: targetMember.last_name,
          middle_name: targetMember.middle_name || undefined,
          age: targetMember.age || undefined,
          gender: targetMember.gender || undefined,
          civil_status: targetMember.civil_status || undefined,
          email: targetMember.email || undefined,
          phone: targetMember.phone || undefined,
          address: targetMember.address || undefined,
          date_of_birth: targetMember.date_of_birth ? targetMember.date_of_birth.split('T')[0] : undefined,
        };

        if (field === 'name') {
          if (!inlineData.first_name || !inlineData.last_name) {
            setInlineError('First and Last names are required.');
            setInlineSaving(false);
            return;
          }
          payload.first_name = inlineData.first_name.trim();
          payload.last_name = inlineData.last_name.trim();
          payload.middle_name = inlineData.middle_name ? inlineData.middle_name.trim() : undefined;
        } else if (field === 'age') {
          if (inlineData.date_of_birth) {
            payload.date_of_birth = inlineData.date_of_birth;
            const birthDate = new Date(inlineData.date_of_birth);
            const today = new Date();
            let calcAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calcAge--;
            payload.age = calcAge >= 0 ? calcAge : undefined;
          } else if (inlineData.age) {
            payload.age = parseInt(inlineData.age, 10);
          }
        } else if (field === 'gender') {
          payload.gender = inlineData.gender || undefined;
        } else if (field === 'civil_status') {
          payload.civil_status = inlineData.civil_status || undefined;
        } else if (field === 'membership_type') {
          payload.membership_type = inlineData.membership_type || 'Regular';
        } else if (field === 'phone') {
          payload.phone = inlineData.phone ? inlineData.phone.trim() : undefined;
        } else if (field === 'member_no') {
          payload.member_no = inlineData.member_no ? inlineData.member_no.trim() : undefined;
        } else if (field === 'email') {
          if (inlineData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inlineData.email)) {
            setInlineError('Please enter a valid email address.');
            setInlineSaving(false);
            return;
          }
          payload.email = inlineData.email ? inlineData.email.trim() : undefined;
        }

        const putRes = await api.put(`/members/${memberId}`, payload);
        updatedFields = putRes.data.data;
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, ...updatedFields } : m))
      );

      setEditingCell(null);
      setToastMessage('Member updated successfully!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      console.error('Inline save error:', err);
      setInlineError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update member.');
    } finally {
      setInlineSaving(false);
    }
  };

  const getAvatarUrl = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || '';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  };

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (membershipFilter) params.membership_type = membershipFilter;
      if (sortBy) params.sortBy = sortBy;

      const response = await api.get('/members', { params });
      const rawMembers: any[] = response.data.data || [];
      const filteredMembers = rawMembers.filter((m: any) => {
        const isStaffOrAdminRole = m.user_role === 'admin' || m.user_role === 'staff' || m.user_role === 'manager';
        const isStaffOrAdminNo = typeof m.member_no === 'string' && (m.member_no.startsWith('ADM-') || m.member_no.startsWith('STF-'));
        return !isStaffOrAdminRole && !isStaffOrAdminNo;
      });
      setMembers(filteredMembers);
      if (!search && !statusFilter && !membershipFilter) {
        setAllMembersSummary(filteredMembers);
      }
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      setError(err.response?.data?.message || 'Failed to retrieve members list.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, membershipFilter, sortBy]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSearch = (val: string) => {
    setSearch(val);
  };

  const handleExportExcel = async () => {
    try {
      if (members.length === 0) return;

      const excelData = members.map((m) => ({
        'Member ID': m.member_no || 'N/A',
        'Last Name': m.last_name || '',
        'First Name': m.first_name || '',
        'Middle Name': m.middle_name || '',
        'Membership Type': m.membership_type || 'Regular',
        'Email': m.email || 'N/A',
        'Phone': m.phone || 'N/A',
        'Gender': m.gender || 'N/A',
        'Civil Status': m.civil_status || 'N/A',
        'Date of Birth': m.date_of_birth ? new Date(m.date_of_birth).toLocaleDateString() : 'N/A',
        'Age': m.age || 'N/A',
        'Address': m.address || 'N/A',
        'Status': (m.status || '').toUpperCase(),
        'Registration Date': m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Membership Directory');
      XLSX.writeFile(workbook, `Membership_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export report. Please try again.');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) {
      setFormError('First Name and Last Name are required.');
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      const res = await api.post('/members', {
        member_no: memberNoInput?.trim() || undefined,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName || undefined,
        status: memberStatus,
        membership_type: membershipTypeInput,
      });

      // Clear Form and Close Modal
      setMemberNoInput('');
      setFirstName('');
      setLastName('');
      setMiddleName('');
      setMemberStatus('active');
      setMembershipTypeInput('Regular');
      setIsMembershipTypeOpen(false);
      setIsInitialStatusOpen(false);
      setIsModalOpen(false);

      if (res.data?.provisioned_account) {
        setToastMessage(`Member registered! Login Username: "${res.data.provisioned_account.username}" (Password: UCCoop@2026)`);
        setTimeout(() => setToastMessage(null), 6000);
      } else {
        setToastMessage('Member registered successfully!');
        setTimeout(() => setToastMessage(null), 3500);
      }

      // Refresh list
      fetchMembers();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || err.response?.data?.message || 'Error occurred while saving profile.');
    } finally {
      setSubmitting(false);
    }
  };

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = members.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(members.length / itemsPerPage);
  const displayedMembers = isExpandedAll ? members : currentItems;

  const getPaginationNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending Review
          </span>
        );
      case 'approved':
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5" />
            {status === 'approved' ? 'Approved' : 'Active'}
          </span>
        );
      case 'disapproved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <X className="w-3.5 h-3.5" />
            Disapproved
          </span>
        );
      case 'withdrawn':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Withdrawn
          </span>
        );
      case 'dormant':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/25">
            <Clock className="w-3.5 h-3.5" />
            Dormant
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-tertiary/10 text-tertiary">
            <AlertTriangle className="w-3.5 h-3.5" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral/15 text-neutral-600 dark:text-neutral-400">
            <X className="w-3.5 h-3.5" />
            Inactive
          </span>
        );
    }
  };

  return (
    <>
      <div className="space-y-6 animate-micro-elevate">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <BackButton href="/dashboard">Back to Overview</BackButton>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
            <Link
              href="/dashboard/import"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-full text-neutral-700 dark:text-neutral-300 hover:bg-neutral/5 transition-all shadow-sm"
            >
              <FileUp className="w-4 h-4 text-primary dark:text-secondary" />
              Import Excel Data
            </Link>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral/5 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-primary dark:text-secondary" />
              Export Excel Ledger
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Register Member
            </button>
          </div>
        </div>

        {/* Membership Summary Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Box 1: Regular vs Associate Members */}
          <div className="p-5 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/60 shadow-sm flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Total Members by Classification
                </span>
                <p className="text-2xl font-headline font-black text-on-surface dark:text-white mt-0.5">
                  {memberStats.total}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-outline-variant/40">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                  Regular
                </span>
                <span className="text-lg font-black text-neutral-900 dark:text-white">
                  {memberStats.regular}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                  Associate
                </span>
                <span className="text-lg font-black text-neutral-900 dark:text-white">
                  {memberStats.associate}
                </span>
              </div>
            </div>
          </div>

          {/* Box 2: Active, Withdrawn, Dormant, Pending Review */}
          <div className="p-5 rounded-3xl bg-white dark:bg-surface-container-low border border-outline-variant/60 shadow-sm flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Members by Status
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {memberStats.active + memberStats.withdrawn + memberStats.dormant + memberStats.pending} accounted of {memberStats.total} members
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => setStatusFilter((prev) => (prev === 'active' ? '' : 'active'))}
                className={`p-2.5 rounded-2xl bg-emerald-500/10 border text-left transition-all cursor-pointer ${
                  statusFilter === 'active' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-emerald-500/20 hover:border-emerald-500/40'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                  Active
                </span>
                <span className="text-lg font-black text-neutral-900 dark:text-white">
                  {memberStats.active}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter((prev) => (prev === 'withdrawn' ? '' : 'withdrawn'))}
                className={`p-2.5 rounded-2xl bg-amber-500/10 border text-left transition-all cursor-pointer ${
                  statusFilter === 'withdrawn' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-500/20 hover:border-amber-500/40'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                  Withdrawn
                </span>
                <span className="text-lg font-black text-neutral-900 dark:text-white">
                  {memberStats.withdrawn}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter((prev) => (prev === 'dormant' ? '' : 'dormant'))}
                className={`p-2.5 rounded-2xl bg-slate-500/10 border text-left transition-all cursor-pointer ${
                  statusFilter === 'dormant' ? 'border-slate-500 ring-2 ring-slate-500/20' : 'border-slate-500/25 hover:border-slate-500/50'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Dormant
                </span>
                <span className="text-lg font-black text-neutral-900 dark:text-white">
                  {memberStats.dormant}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter((prev) => (prev === 'pending' ? '' : 'pending'))}
                className={`p-2.5 rounded-2xl bg-orange-500/10 border text-left transition-all cursor-pointer ${
                  statusFilter === 'pending' ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-orange-500/20 hover:border-orange-500/40'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300 block">
                  Pending Review
                </span>
                <span className="text-lg font-black text-neutral-900 dark:text-white">
                  {memberStats.pending}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter & Sort Desk */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm">
          <div className="w-full lg:w-auto flex-1 max-w-md">
            <SearchInput placeholder="Search by name, middle name, email, phone..." onSearch={handleSearch} />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold font-label text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Sort By:</label>
              <AnimatedSelect
                value={sortBy}
                onChange={(val) => setSortBy(val)}
                className="py-2 bg-white dark:bg-surface-container-low border-outline-variant min-w-[205px]"
                options={[
                  { value: 'member_no_asc', label: 'Member ID (Oldest → Newest)' },
                  { value: 'member_no_desc', label: 'Member ID (Newest → Oldest)' },
                  { value: 'name_asc', label: 'Name (A → Z)' },
                  { value: 'name_desc', label: 'Name (Z → A)' },
                  { value: 'age_asc', label: 'Age (Youngest → Oldest)' },
                  { value: 'age_desc', label: 'Age (Oldest → Youngest)' },
                  { value: 'created_at_desc', label: 'Registration (Newest → Oldest)' },
                  { value: 'created_at_asc', label: 'Registration (Oldest → Newest)' },
                  { value: 'status', label: 'Status (Active First)' },
                  { value: 'updated', label: 'Recently Updated' },
                ]}
              />
              <button
                type="button"
                onClick={() => {
                  if (sortBy.endsWith('_asc')) {
                    setSortBy(sortBy.replace(/_asc$/, '_desc'));
                  } else if (sortBy.endsWith('_desc')) {
                    setSortBy(sortBy.replace(/_desc$/, '_asc'));
                  } else {
                    setSortBy('member_no_desc');
                  }
                }}
                title="Reverse sort order"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant bg-white dark:bg-surface-container-low text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral/5 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                <span>Reverse</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold font-label text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Membership:</label>
              <AnimatedSelect
                value={membershipFilter}
                onChange={(val) => setMembershipFilter(val)}
                className="py-2 bg-white dark:bg-surface-container-low border-outline-variant min-w-[155px]"
                options={[
                  { value: '', label: 'All Memberships' },
                  { value: 'Regular', label: 'Regular Member' },
                  { value: 'Associate', label: 'Associate Member' },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold font-label text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Status:</label>
              <AnimatedSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                className="py-2 bg-white dark:bg-surface-container-low border-outline-variant min-w-[140px]"
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'pending', label: 'Pending Review' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'disapproved', label: 'Disapproved' },
                  { value: 'active', label: 'Active' },
                  { value: 'dormant', label: 'Dormant' },
                  { value: 'withdrawn', label: 'Withdrawn' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Feedback Toast */}
        {toastMessage && (
          <div className="p-4 bg-primary/10 dark:bg-secondary/10 border border-primary/20 dark:border-secondary/20 text-primary dark:text-secondary rounded-2xl flex items-center justify-between animate-fade-in text-xs font-bold shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-primary/10 rounded-full cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Table */}
        {loading ? (
          <SkeletonTable rows={itemsPerPage} cols={7} />
        ) : error ? (
          <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60 shadow-sm">
            <Users className="w-8 h-8 text-neutral-600 dark:text-neutral-400/50 mx-auto mb-3" />
            <h3 className="font-headline font-bold text-on-surface dark:text-white">No Members Found</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table Header Bar with Roster Count and Expand All Toggle */}
            <div className="flex items-center justify-between px-1 flex-wrap gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface dark:text-white">
                  Membership Table
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold border border-outline-variant/30">
                  {isExpandedAll ? `Showing all ${members.length} members (Full Roster)` : `Showing ${displayedMembers.length} of ${members.length} members`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsExpandedAll((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-2xl border transition-all cursor-pointer shadow-2xs active:scale-95 ${isExpandedAll
                  ? 'bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary border-primary/30 hover:bg-primary/20'
                  : 'bg-white dark:bg-surface-container-low text-neutral-700 dark:text-neutral-300 border-outline-variant hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                title={isExpandedAll ? 'Restore pagination (8 per page)' : 'Expand table to display all members on page'}
              >
                {isExpandedAll ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                    <span>Minimize Table</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                    <span>Expand All List</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm p-1.5">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/80 dark:bg-neutral-800/60 border-b border-outline-variant/50 text-[11px] font-headline font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Member ID</th>
                      <th className="px-5 py-3.5">Member Profile</th>
                      <th className="px-4 py-3.5">Membership</th>
                      <th className="px-4 py-3.5 text-center">Age</th>
                      <th className="px-4 py-3.5 hidden xl:table-cell">Sex / Gender</th>
                      <th className="px-4 py-3.5 hidden xl:table-cell">Civil Status</th>
                      <th className="px-4 py-3.5 hidden lg:table-cell">Mobile / Contact</th>
                      <th className="px-4 py-3.5 hidden md:table-cell">Email Address</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 hidden sm:table-cell">Join Date</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 font-body text-xs text-on-surface dark:text-white/90">
                    {displayedMembers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-neutral-500 italic">
                          No members found.
                        </td>
                      </tr>
                    ) : (
                      displayedMembers.map((member) => {
                      const isEditingName = editingCell?.memberId === member.id && editingCell?.field === 'name';
                      const isEditingMembershipType = editingCell?.memberId === member.id && editingCell?.field === 'membership_type';
                      const isEditingAge = editingCell?.memberId === member.id && editingCell?.field === 'age';
                      const isEditingPhone = editingCell?.memberId === member.id && editingCell?.field === 'phone';
                      const isEditingEmail = editingCell?.memberId === member.id && editingCell?.field === 'email';
                      const isEditingStatus = editingCell?.memberId === member.id && editingCell?.field === 'status';

                      return (
                        <tr key={member.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                          {/* Member ID Cell */}
                          <td className="px-5 py-3.5 whitespace-nowrap relative group">
                            {editingCell?.memberId === member.id && editingCell?.field === 'member_no' ? (
                              <div className="flex items-center gap-1.5 z-10 animate-pop">
                                <input
                                  type="text"
                                  placeholder="e.g. 2026-41"
                                  value={inlineData.member_no || ''}
                                  onChange={(e) => setInlineData({ ...inlineData, member_no: e.target.value })}
                                  className="px-2.5 py-1 text-xs font-mono font-bold border border-primary/40 rounded-xl bg-white dark:bg-neutral-800 text-on-surface dark:text-white outline-none focus:ring-1 focus:ring-primary"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveInline(member.id, 'member_no')}
                                  disabled={inlineSaving}
                                  className="p-1 rounded-lg bg-primary text-white dark:bg-secondary dark:text-neutral-950 font-bold hover:scale-105 transition-all shadow-xs"
                                >
                                  {inlineSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCell(null)}
                                  className="p-1 rounded-lg border border-outline-variant text-neutral-500 hover:text-on-surface"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-primary/10 text-primary dark:bg-secondary/10 dark:text-secondary border border-primary/20 dark:border-secondary/20">
                                  {member.member_no || 'N/A'}
                                </span>
                                {isAdminOrManager && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleEditClick(e, member.id, 'member_no', { member_no: member.member_no || '' })}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-primary dark:hover:text-secondary transition-all"
                                    title="Edit Member ID"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Member Profile Cell (Name) */}
                          <td className="px-5 py-3.5 relative group">
                            {isEditingName ? (
                              <div className="p-3 bg-white dark:bg-neutral-900 border border-primary/30 rounded-2xl shadow-xl space-y-2 z-10 animate-pop">
                                <p className="text-[10px] uppercase font-bold text-primary dark:text-secondary">Edit Full Name</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    placeholder="First"
                                    value={inlineData.first_name || ''}
                                    onChange={(e) => setInlineData({ ...inlineData, first_name: e.target.value })}
                                    className="px-2.5 py-1.5 text-xs border border-outline-variant/60 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-on-surface dark:text-white"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Middle"
                                    value={inlineData.middle_name || ''}
                                    onChange={(e) => setInlineData({ ...inlineData, middle_name: e.target.value })}
                                    className="px-2.5 py-1.5 text-xs border border-outline-variant/60 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-on-surface dark:text-white"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Last"
                                    value={inlineData.last_name || ''}
                                    onChange={(e) => setInlineData({ ...inlineData, last_name: e.target.value })}
                                    className="px-2.5 py-1.5 text-xs border border-outline-variant/60 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-on-surface dark:text-white"
                                  />
                                </div>
                                {inlineError && <p className="text-[10px] text-tertiary font-semibold">{inlineError}</p>}
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCell(null)}
                                    className="px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={inlineSaving}
                                    onClick={() => handleSaveInline(member.id, 'name')}
                                    className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:opacity-90 disabled:opacity-50"
                                  >
                                    {inlineSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleCellSingleClick(member.id)}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={() =>
                                  handleTouchEnd(member.id, 'name', {
                                    first_name: member.first_name,
                                    last_name: member.last_name,
                                    middle_name: member.middle_name || '',
                                  })
                                }
                                className="flex items-center gap-3 cursor-pointer group/cell"
                                title="Click member to view profile, or click pencil to edit"
                              >
                                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 dark:bg-secondary/10 flex items-center justify-center border border-primary/20 dark:border-secondary/20 shadow-xs">
                                  {member.profile_picture_url ? (
                                    <img
                                      src={getAvatarUrl(member.profile_picture_url) || ''}
                                      alt={`${member.first_name} ${member.last_name}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.parentElement && !e.currentTarget.parentElement.querySelector('span')) {
                                          const span = document.createElement('span');
                                          span.className = 'font-bold text-xs text-primary dark:text-secondary';
                                          span.innerText = `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`;
                                          e.currentTarget.parentElement.appendChild(span);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span className="font-bold text-xs text-primary dark:text-secondary">
                                      {member.first_name?.[0]}{member.last_name?.[0]}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="font-semibold text-on-surface dark:text-white group-hover/cell:text-primary dark:group-hover/cell:text-secondary transition-colors whitespace-nowrap">
                                    {member.last_name}, {member.first_name}{member.middle_name?.trim() ? ` ${member.middle_name.trim()[0].toUpperCase()}.` : ''}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleEditClick(e, member.id, 'name', {
                                        first_name: member.first_name,
                                        last_name: member.last_name,
                                        middle_name: member.middle_name || '',
                                      })
                                    }
                                    className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-secondary/10 opacity-0 group-hover/cell:opacity-100 transition-all focus:opacity-100 flex-shrink-0"
                                    title="Edit Name"
                                    aria-label="Edit Name"
                                  >
                                    <Pencil className="w-3 h-3 text-neutral-500 hover:text-primary dark:hover:text-secondary" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Membership Type Cell */}
                          <td className="px-4 py-3.5 relative font-medium">
                            {isEditingMembershipType ? (
                              <div className="p-2 bg-white dark:bg-neutral-900 border border-primary/30 rounded-2xl shadow-xl space-y-2 z-20 relative min-w-[130px]">
                                <p className="text-[10px] uppercase font-bold text-primary dark:text-secondary">Edit Type</p>
                                <AnimatedSelect
                                  value={inlineData.membership_type || member.membership_type || 'Regular'}
                                  onChange={(val) => setInlineData({ ...inlineData, membership_type: val })}
                                  options={[
                                    { value: 'Regular', label: 'Regular' },
                                    { value: 'Associate', label: 'Associate' },
                                  ]}
                                />
                                {inlineError && <p className="text-[10px] text-tertiary font-semibold">{inlineError}</p>}
                                <div className="flex items-center justify-end gap-1 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCell(null)}
                                    className="p-1 text-neutral-500 hover:bg-neutral-100 rounded"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={inlineSaving}
                                    onClick={() => handleSaveInline(member.id, 'membership_type')}
                                    className="p-1 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                                  >
                                    {inlineSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleCellSingleClick(member.id)}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={() => handleTouchEnd(member.id, 'membership_type', { membership_type: member.membership_type || 'Regular' })}
                                className="cursor-pointer group/cell flex items-center gap-1.5"
                                title="Click member to view profile, or click pencil to edit"
                              >
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${member.membership_type === 'Associate'
                                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/50'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50'
                                  }`}>
                                  {member.membership_type === 'Associate' ? 'Associate' : 'Regular'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleEditClick(e, member.id, 'membership_type', { membership_type: member.membership_type || 'Regular' })}
                                  className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-secondary/10 opacity-0 group-hover/cell:opacity-100 transition-all focus:opacity-100"
                                  title="Edit Membership Type"
                                  aria-label="Edit Membership Type"
                                >
                                  <Pencil className="w-3 h-3 text-neutral-500 hover:text-primary dark:hover:text-secondary" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Age / DOB Cell */}
                          <td className="px-4 py-3.5 font-medium text-center relative">
                            {isEditingAge ? (
                              <div className="p-2 bg-white dark:bg-neutral-900 border border-primary/30 rounded-2xl shadow-xl space-y-2 z-10">
                                <p className="text-[10px] uppercase font-bold text-primary dark:text-secondary">Edit Date of Birth</p>
                                <input
                                  type="date"
                                  max={new Date().toISOString().split('T')[0]}
                                  value={inlineData.date_of_birth || (member.date_of_birth ? member.date_of_birth.split('T')[0] : '')}
                                  onChange={(e) => setInlineData({ ...inlineData, date_of_birth: e.target.value })}
                                  className="px-2.5 py-1 text-xs border border-outline-variant/60 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-on-surface dark:text-white"
                                />
                                {inlineError && <p className="text-[10px] text-tertiary font-semibold">{inlineError}</p>}
                                <div className="flex items-center justify-center gap-1 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCell(null)}
                                    className="p-1 text-neutral-500 hover:bg-neutral-100 rounded"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={inlineSaving}
                                    onClick={() => handleSaveInline(member.id, 'age')}
                                    className="p-1 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                                  >
                                    {inlineSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleCellSingleClick(member.id)}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={() =>
                                  handleTouchEnd(member.id, 'age', {
                                    date_of_birth: member.date_of_birth ? member.date_of_birth.split('T')[0] : '',
                                    age: member.age || '',
                                  })
                                }
                                className="cursor-pointer group/cell inline-flex items-center justify-center gap-1"
                                title="Click member to view profile, or click pencil to edit"
                              >
                                {member.age != null ? (
                                  <span className="dark:bg-neutral-800 font-mono text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                                    {member.age} yrs
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 font-mono text-[11px]">N/A</span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleEditClick(e, member.id, 'age', {
                                      date_of_birth: member.date_of_birth ? member.date_of_birth.split('T')[0] : '',
                                      age: member.age || '',
                                    })
                                  }
                                  className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-secondary/10 opacity-0 group-hover/cell:opacity-100 transition-all focus:opacity-100"
                                  title="Edit Age / Date of Birth"
                                  aria-label="Edit Age / Date of Birth"
                                >
                                  <Pencil className="w-3 h-3 text-neutral-500 hover:text-primary dark:hover:text-secondary" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Sex/Gender Cell */}
                          <td className="px-4 py-3.5 hidden xl:table-cell relative font-medium">
                            {editingCell?.memberId === member.id && editingCell?.field === 'gender' ? (
                              <div className="p-2 bg-white dark:bg-neutral-900 border border-primary/30 rounded-2xl shadow-xl space-y-2 z-20 relative min-w-[130px]">
                                <AnimatedSelect
                                  value={inlineData.gender || member.gender || ''}
                                  onChange={(val) => setInlineData({ ...inlineData, gender: val })}
                                  placeholder="Select Gender"
                                  options={[
                                    { value: '', label: 'Select Gender' },
                                    { value: 'Male', label: 'Male' },
                                    { value: 'Female', label: 'Female' },
                                  ]}
                                />
                                {inlineError && <p className="text-[10px] text-tertiary font-semibold">{inlineError}</p>}
                                <div className="flex items-center gap-1 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCell(null)}
                                    className="p-1 text-neutral-500 hover:bg-neutral-100 rounded"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={inlineSaving}
                                    onClick={() => handleSaveInline(member.id, 'gender')}
                                    className="p-1 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                                  >
                                    {inlineSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleCellSingleClick(member.id)}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={() => handleTouchEnd(member.id, 'gender', { gender: member.gender || '' })}
                                className="cursor-pointer group/cell flex items-center gap-1.5"
                                title="Click member to view profile, or click pencil to edit"
                              >
                                {member.gender ? (
                                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800/60 font-semibold text-neutral-700 dark:text-neutral-300 text-[11px]">
                                    {member.gender}
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 font-mono text-[11px]">N/A</span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleEditClick(e, member.id, 'gender', { gender: member.gender || '' })}
                                  className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-secondary/10 opacity-0 group-hover/cell:opacity-100 transition-all focus:opacity-100"
                                  title="Edit Gender"
                                  aria-label="Edit Gender"
                                >
                                  <Pencil className="w-3 h-3 text-neutral-500 hover:text-primary dark:hover:text-secondary" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Civil Status Cell */}
                          <td className="px-4 py-3.5 hidden xl:table-cell relative font-medium">
                            {editingCell?.memberId === member.id && editingCell?.field === 'civil_status' ? (
                              <div className="p-2 bg-white dark:bg-neutral-900 border border-primary/30 rounded-2xl shadow-xl space-y-2 z-20 relative min-w-[135px]">
                                <AnimatedSelect
                                  value={inlineData.civil_status || member.civil_status || ''}
                                  onChange={(val) => setInlineData({ ...inlineData, civil_status: val })}
                                  placeholder="Select Status"
                                  options={[
                                    { value: '', label: 'Select Status' },
                                    { value: 'Single', label: 'Single' },
                                    { value: 'Married', label: 'Married' },
                                    { value: 'Widowed', label: 'Widowed' },
                                    { value: 'Separated', label: 'Separated' },
                                    { value: 'Divorced', label: 'Divorced' },
                                  ]}
                                />
                                {inlineError && <p className="text-[10px] text-tertiary font-semibold">{inlineError}</p>}
                                <div className="flex items-center gap-1 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCell(null)}
                                    className="p-1 text-neutral-500 hover:bg-neutral-100 rounded"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={inlineSaving}
                                    onClick={() => handleSaveInline(member.id, 'civil_status')}
                                    className="p-1 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                                  >
                                    {inlineSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleCellSingleClick(member.id)}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={() => handleTouchEnd(member.id, 'civil_status', { civil_status: member.civil_status || '' })}
                                className="cursor-pointer group/cell flex items-center gap-1.5"
                                title="Click member to view profile, or click pencil to edit"
                              >
                                {member.civil_status ? (
                                  <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800/60 font-semibold text-neutral-700 dark:text-neutral-300 text-[11px]">
                                    {member.civil_status}
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 font-mono text-[11px]">N/A</span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleEditClick(e, member.id, 'civil_status', { civil_status: member.civil_status || '' })}
                                  className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-secondary/10 opacity-0 group-hover/cell:opacity-100 transition-all focus:opacity-100"
                                  title="Edit Civil Status"
                                  aria-label="Edit Civil Status"
                                >
                                  <Pencil className="w-3 h-3 text-neutral-500 hover:text-primary dark:hover:text-secondary" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Mobile Cell */}
                          <td className="px-4 py-3.5 hidden lg:table-cell relative">
                            {isEditingPhone ? (
                              <div className="p-2 bg-white dark:bg-neutral-900 border border-primary/30 rounded-2xl shadow-xl space-y-2 z-10">
                                <input
                                  type="tel"
                                  placeholder="09123456789"
                                  value={inlineData.phone || ''}
                                  onChange={(e) => setInlineData({ ...inlineData, phone: e.target.value })}
                                  className="px-2.5 py-1 text-xs border border-outline-variant/60 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-on-surface dark:text-white"
                                />
                                {inlineError && <p className="text-[10px] text-tertiary font-semibold">{inlineError}</p>}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCell(null)}
                                    className="p-1 text-neutral-500 hover:bg-neutral-100 rounded"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={inlineSaving}
                                    onClick={() => handleSaveInline(member.id, 'phone')}
                                    className="p-1 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                                  >
                                    {inlineSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleCellSingleClick(member.id)}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={() => handleTouchEnd(member.id, 'phone', { phone: member.phone || '' })}
                                className="cursor-pointer group/cell flex items-center gap-1.5"
                                title="Click member to view profile, or click pencil to edit"
                              >
                                {member.phone ? (
                                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
                                    <Phone className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                                    {member.phone}
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 font-mono text-[11px]">N/A</span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleEditClick(e, member.id, 'phone', { phone: member.phone || '' })}
                                  className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-secondary/10 opacity-0 group-hover/cell:opacity-100 transition-all focus:opacity-100"
                                  title="Edit Phone Number"
                                  aria-label="Edit Phone Number"
                                >
                                  <Pencil className="w-3 h-3 text-neutral-500 hover:text-primary dark:hover:text-secondary" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Email Cell */}
                          <td className="px-4 py-3.5 hidden md:table-cell relative">
                            {isEditingEmail ? (
                              <div className="p-2 bg-white dark:bg-neutral-900 border border-primary/30 rounded-2xl shadow-xl space-y-2 z-10">
                                <input
                                  type="email"
                                  placeholder="email@example.com"
                                  value={inlineData.email || ''}
                                  onChange={(e) => setInlineData({ ...inlineData, email: e.target.value })}
                                  className="px-2.5 py-1 text-xs border border-outline-variant/60 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-on-surface dark:text-white"
                                />
                                {inlineError && <p className="text-[10px] text-tertiary font-semibold">{inlineError}</p>}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCell(null)}
                                    className="p-1 text-neutral-500 hover:bg-neutral-100 rounded"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={inlineSaving}
                                    onClick={() => handleSaveInline(member.id, 'email')}
                                    className="p-1 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                                  >
                                    {inlineSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleCellSingleClick(member.id)}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={() => handleTouchEnd(member.id, 'email', { email: member.email || '' })}
                                className="cursor-pointer group/cell flex items-center gap-1.5 min-w-0"
                                title="Click member to view profile, or click pencil to edit"
                              >
                                {member.email ? (
                                  <span className="flex items-center gap-1.5 text-[11px] text-neutral-700 dark:text-neutral-300 truncate">
                                    <Mail className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                                    <span className="truncate">{member.email}</span>
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 font-mono text-[11px]">N/A</span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleEditClick(e, member.id, 'email', { email: member.email || '' })}
                                  className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-secondary/10 opacity-0 group-hover/cell:opacity-100 transition-all focus:opacity-100 flex-shrink-0"
                                  title="Edit Email Address"
                                  aria-label="Edit Email Address"
                                >
                                  <Pencil className="w-3 h-3 text-neutral-500 hover:text-primary dark:hover:text-secondary" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Status Cell */}
                          <td className="px-4 py-3.5 relative">
                            {isEditingStatus ? (
                              <div ref={inlineStatusDropdownRef} className="p-2 bg-white dark:bg-neutral-900 border border-primary/30 rounded-2xl shadow-xl space-y-2 z-20 relative">
                                <div className="relative">
                                  <button
                                    type="button"
                                    aria-expanded={isInlineStatusOpen}
                                    onClick={() => setIsInlineStatusOpen((prev) => !prev)}
                                    className="w-full min-w-[145px] px-3 py-1.5 text-xs border border-outline-variant/60 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-on-surface dark:text-white font-semibold flex items-center justify-between gap-2 cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <span>
                                      {({
                                        pending: 'Pending Review',
                                        approved: 'Approved',
                                        disapproved: 'Disapproved',
                                        active: 'Active',
                                        dormant: 'Dormant',
                                        withdrawn: 'Withdrawn',
                                        suspended: 'Suspended',
                                        inactive: 'Inactive',
                                      } as Record<string, string>)[inlineData.status || member.status] || 'Active'}
                                    </span>
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 text-primary dark:text-secondary transition-transform duration-200 ${
                                        isInlineStatusOpen ? 'rotate-180' : 'rotate-0'
                                      }`}
                                    />
                                  </button>

                                  <div
                                    className={`absolute left-0 right-0 mt-1 z-30 rounded-xl border border-outline-variant/60 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden origin-top transition-all duration-200 ease-out ${
                                      isInlineStatusOpen
                                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                                        : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
                                    }`}
                                  >
                                    {[
                                      { value: 'pending', label: 'Pending Review' },
                                      { value: 'disapproved', label: 'Disapproved' },
                                      { value: 'active', label: 'Active' },
                                      { value: 'dormant', label: 'Dormant' },
                                      { value: 'withdrawn', label: 'Withdrawn' },
                                    ].map((opt) => {
                                      const currentVal = inlineData.status || member.status;
                                      const selected = currentVal === opt.value;
                                      return (
                                        <button
                                          key={opt.value}
                                          type="button"
                                          onClick={() => {
                                            setInlineData({ ...inlineData, status: opt.value });
                                            setIsInlineStatusOpen(false);
                                          }}
                                          className={`w-full px-3 py-1.5 text-left text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                            selected
                                              ? 'bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary'
                                              : 'text-on-surface dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                          }`}
                                        >
                                          <span>{opt.label}</span>
                                          {selected && <Check className="w-3 h-3 shrink-0" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                {inlineError && <p className="text-[10px] text-tertiary font-semibold">{inlineError}</p>}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsInlineStatusOpen(false);
                                      setEditingCell(null);
                                    }}
                                    className="p-1 text-neutral-500 hover:bg-neutral-100 rounded"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={inlineSaving}
                                    onClick={() => {
                                      setIsInlineStatusOpen(false);
                                      handleSaveInline(member.id, 'status');
                                    }}
                                    className="p-1 bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                                  >
                                    {inlineSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleCellSingleClick(member.id)}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={() => handleTouchEnd(member.id, 'status', { status: member.status })}
                                className="cursor-pointer group/cell flex items-center gap-1.5"
                                title="Click member to view profile, or click pencil to edit"
                              >
                                {getStatusBadge(member.status)}
                                <button
                                  type="button"
                                  onClick={(e) => handleEditClick(e, member.id, 'status', { status: member.status })}
                                  className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-secondary/10 opacity-0 group-hover/cell:opacity-100 transition-all focus:opacity-100"
                                  title="Edit Status"
                                  aria-label="Edit Status"
                                >
                                  <Pencil className="w-3 h-3 text-neutral-500 hover:text-primary dark:hover:text-secondary" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Join Date Cell */}
                          <td className="px-4 py-3.5 hidden sm:table-cell whitespace-nowrap">
                            <span className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                              <Calendar className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                              {new Date(member.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Actions Cell */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                            {member.status === 'pending' && (
                              <>
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.patch(`/members/${member.id}/approval`, { status: 'approved' });
                                      setToastMessage(`Member ${member.first_name} ${member.last_name} profile approved.`);
                                      fetchMembers();
                                    } catch (err: any) {
                                      alert(err.response?.data?.error?.message || 'Failed to approve profile.');
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all border border-emerald-500/20"
                                  title="Approve Member Profile"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.patch(`/members/${member.id}/approval`, { status: 'disapproved' });
                                      setToastMessage(`Member ${member.first_name} ${member.last_name} profile disapproved.`);
                                      fetchMembers();
                                    } catch (err: any) {
                                      alert(err.response?.data?.error?.message || 'Failed to disapprove profile.');
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all border border-red-500/20"
                                  title="Disapprove Member Profile"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </>
                            )}
                            <Link
                              href={`/dashboard/members/${member.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 dark:bg-secondary/10 dark:hover:bg-secondary/20 text-primary dark:text-secondary text-xs font-bold transition-all active:scale-95 shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Profile
                            </Link>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table Footer: Pagination or Expanded Roster Bar */}
            {isExpandedAll ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  <span className="w-2 h-2 rounded-full bg-primary dark:bg-secondary animate-pulse" />
                  <span>Expanded Full Table: Displaying all {members.length} members</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpandedAll(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-outline-variant rounded-full text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Restore pagination (8 members per page)"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                  <span>Minimize Table</span>
                </button>
              </div>
            ) : totalPages > 1 ? (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm">
                <span className="font-body text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                  Displaying {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, members.length)} of {members.length} members
                </span>
                <div className="flex flex-wrap items-center gap-1.5 justify-center">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-3.5 py-1.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-colors disabled:opacity-40 cursor-pointer text-neutral-700 dark:text-neutral-300"
                  >
                    Previous
                  </button>
                  {getPaginationNumbers(currentPage, totalPages).map((page, idx) => {
                    if (page === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-neutral-400 font-bold select-none">
                          ...
                        </span>
                      );
                    }
                    const pageNum = Number(page);
                    return (
                      <button
                        key={`page-${pageNum}`}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-full text-xs font-bold border transition-all cursor-pointer ${currentPage === pageNum
                          ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border-primary dark:border-secondary shadow-xs'
                          : 'border-outline-variant hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-3.5 py-1.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-colors disabled:opacity-40 cursor-pointer text-neutral-700 dark:text-neutral-300"
                  >
                    Next
                  </button>

                  {/* Expand All Button in Pagination Bar */}
                  <button
                    type="button"
                    onClick={() => setIsExpandedAll(true)}
                    className="ml-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 dark:bg-secondary/10 dark:hover:bg-secondary/20 text-primary dark:text-secondary text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Expand table to display all members on page"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand All</span>
                  </button>
                </div>
              </div>
            ) : members.length > 0 ? (
              <div className="flex items-center justify-between border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm">
                <span className="font-body text-xs text-neutral-600 dark:text-neutral-400">
                  Displaying all {members.length} members
                </span>
              </div>
            ) : null}
          </div>
        )}

      </div>

      {/* Add Member Modal Popup System */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop overflow-visible">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-4">Register Member Profile</h2>

            {formError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Member ID</label>
                <input
                  type="text"
                  value={memberNoInput}
                  onChange={(e) => setMemberNoInput(e.target.value)}
                  placeholder="e.g. 2026-326 (auto-generated if left blank)"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
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
                    placeholder="e.g. Jean"
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
                    placeholder="e.g. Doe"
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Middle Name (Optional)</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Animated Membership Type Dropdown */}
                <div className="space-y-1.5" ref={membershipTypeDropdownRef}>
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Membership Type *</label>
                  <div className="relative">
                    <button
                      type="button"
                      aria-expanded={isMembershipTypeOpen}
                      onClick={() => {
                        setIsMembershipTypeOpen((prev) => !prev);
                        setIsInitialStatusOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white font-semibold flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="truncate">
                        {membershipTypeInput === 'Regular'
                          ? 'Regular Member (Full Rights & Loans)'
                          : 'Associate Member (Non-Voting / Restricted)'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-primary dark:text-secondary shrink-0 transition-transform duration-200 ${
                          isMembershipTypeOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </button>

                    <div
                      className={`absolute left-0 right-0 mt-1.5 z-30 rounded-xl border border-outline-variant bg-white dark:bg-neutral-900 shadow-lg overflow-hidden origin-top transition-all duration-200 ease-out ${
                        isMembershipTypeOpen
                          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
                      }`}
                    >
                      {[
                        { value: 'Regular' as const, label: 'Regular Member (Full Rights & Loans)' },
                        { value: 'Associate' as const, label: 'Associate Member (Non-Voting / Restricted)' },
                      ].map((opt) => {
                        const selected = membershipTypeInput === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setMembershipTypeInput(opt.value);
                              setIsMembershipTypeOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              selected
                                ? 'bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary'
                                : 'text-on-surface dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Animated Initial Status Dropdown */}
                <div className="space-y-1.5" ref={initialStatusDropdownRef}>
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Initial Status</label>
                  <div className="relative">
                    <button
                      type="button"
                      aria-expanded={isInitialStatusOpen}
                      onClick={() => {
                        setIsInitialStatusOpen((prev) => !prev);
                        setIsMembershipTypeOpen(false);
                      }}
                      className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white font-semibold flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="truncate">
                        {({
                          pending: 'Pending Review',
                          approved: 'Approved',
                          disapproved: 'Disapproved',
                          active: 'Active',
                          dormant: 'Dormant',
                          withdrawn: 'Withdrawn',
                        } as Record<string, string>)[memberStatus] || 'Active'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-primary dark:text-secondary shrink-0 transition-transform duration-200 ${
                          isInitialStatusOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </button>

                    <div
                      className={`absolute left-0 right-0 mt-1.5 z-30 rounded-xl border border-outline-variant bg-white dark:bg-neutral-900 shadow-lg overflow-hidden origin-top transition-all duration-200 ease-out max-h-56 overflow-y-auto ${
                        isInitialStatusOpen
                          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                          : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
                      }`}
                    >
                      {[
                        { value: 'pending', label: 'Pending Review' },
                        { value: 'disapproved', label: 'Disapproved' },
                        { value: 'active', label: 'Active' },
                        { value: 'dormant', label: 'Dormant' },
                        { value: 'withdrawn', label: 'Withdrawn' },
                      ].map((opt) => {
                        const selected = memberStatus === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setMemberStatus(opt.value);
                              setIsInitialStatusOpen(false);
                            }}
                            className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              selected
                                ? 'bg-primary/10 dark:bg-secondary/15 text-primary dark:text-secondary'
                                : 'text-on-surface dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Saving Profile...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<div className="p-6"><SkeletonTable rows={8} /></div>}>
      <MembersPageContent />
    </Suspense>
  );
}
