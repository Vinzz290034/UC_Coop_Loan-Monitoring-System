'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  ArrowLeft,
  Pencil,
  Check,
  Loader2,
} from 'lucide-react';

interface Member {
  id: number;
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
  status: 'active' | 'suspended' | 'inactive' | 'pending' | 'approved' | 'disapproved';
  profile_completed?: boolean;
  created_at: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, filter, and sort state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add Member Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [tinInput, setTinInput] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [genderInput, setGenderInput] = useState('');
  const [civilStatusInput, setCivilStatusInput] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [memberStatus, setMemberStatus] = useState<string>('active');
  const [userId, setUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ memberId: number; field: string } | null>(null);
  const [inlineData, setInlineData] = useState<any>({});
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // References for single vs double click & touch interactions
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<number>(0);

  const handleCellSingleClick = (memberId: number) => {
    router.push(`/dashboard/members/${memberId}`);
  };

  // Trigger inline editing mode for a specific member field
  const handleEditClick = (e: React.MouseEvent, memberId: number, field: string, initialValues: any) => {
    e.stopPropagation(); // Prevent triggering row/cell click navigation
    setInlineError(null);
    setEditingCell({ memberId, field });
    setInlineData(initialValues);
  };

  const handleTouchStart = () => {
    touchStartRef.current = performance.now();
  };

  const handleTouchEnd = (memberId: number, field: string, initialValues: any) => {
    // eslint-disable-next-line react-hooks/purity
    const duration = performance.now() - touchStartRef.current;
    if (duration >= 450) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      setInlineError(null);
      setEditingCell({ memberId, field });
      setInlineData(initialValues);
    }
  };

  const handleSaveInline = async (memberId: number, field: string) => {
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
        } else if (field === 'phone') {
          payload.phone = inlineData.phone ? inlineData.phone.trim() : undefined;
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
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
    return `${baseUrl}${path}`;
  };

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (sortBy) params.sortBy = sortBy;

      const response = await api.get('/members', { params });
      setMembers(response.data.data || []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      setError(err.response?.data?.message || 'Failed to retrieve members list.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy]);

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
        'Member ID': `#${m.id}`,
        'Last Name': m.last_name || '',
        'First Name': m.first_name || '',
        'Middle Name': m.middle_name || '',
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Members Directory');
      XLSX.writeFile(workbook, `Members_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
      await api.post('/members', {
        title: titleInput?.trim() || undefined,
        tin: tinInput?.trim() || undefined,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName || undefined,
        age: ageInput ? parseInt(ageInput, 10) : undefined,
        gender: genderInput || undefined,
        civil_status: civilStatusInput || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        date_of_birth: dob || undefined,
        status: memberStatus,
        user_id: userId ? parseInt(userId, 10) : undefined
      });

      // Clear Form and Close Modal
      setTitleInput('');
      setTinInput('');
      setFirstName('');
      setLastName('');
      setMiddleName('');
      setAgeInput('');
      setGenderInput('');
      setCivilStatusInput('');
      setEmail('');
      setPhone('');
      setAddress('');
      setDob('');
      setMemberStatus('active');
      setUserId('');
      setIsModalOpen(false);

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
        <div>
          <BackButton href="/dashboard">Back to System Dashboard</BackButton>
        </div>

        {/* Header and Exporter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface dark:text-white flex items-center gap-3">Members Directory</h1>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400">
              Cooperative registry roster containing {members.length} members.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white dark:bg-surface-container-low border border-outline-variant/65 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral/5 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-primary dark:text-secondary" />
              Export Excel Ledger
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Register Profile
            </button>
          </div>
        </div>

        {/* Filter & Sort Desk */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm">
          <SearchInput placeholder="Search by name, middle name, email, phone..." onSearch={handleSearch} />

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold font-label text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Sort By:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-xs border border-outline-variant rounded-xl bg-white dark:bg-surface-container-low focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
              >
                <option value="name_asc">Name (A → Z)</option>
                <option value="name_desc">Name (Z → A)</option>
                <option value="age_asc">Age (Youngest → Oldest)</option>
                <option value="age_desc">Age (Oldest → Youngest)</option>
                <option value="created_at_desc">Registration (Newest → Oldest)</option>
                <option value="created_at_asc">Registration (Oldest → Newest)</option>
                <option value="status">Status (Active First)</option>
                <option value="updated">Recently Updated</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold font-label text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-outline-variant rounded-xl bg-white dark:bg-surface-container-low focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="disapproved">Disapproved</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
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
            <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-primary/10 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Table */}
        {loading ? (
          <SkeletonTable rows={itemsPerPage} cols={6} />
        ) : error ? (
          <div className="p-6 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-3xl flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60 shadow-sm">
            <AlertTriangle className="w-8 h-8 text-neutral-600 dark:text-neutral-400/50 mx-auto mb-3" />
            <h3 className="font-headline font-bold text-on-surface dark:text-white">No Members Found</h3>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400/80 mt-1">Try relaxing search parameters or register a member.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/80 dark:bg-neutral-800/60 border-b border-outline-variant/50 text-[11px] font-headline font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Member Profile</th>
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
                    {currentItems.map((member) => {
                      const isEditingName = editingCell?.memberId === member.id && editingCell?.field === 'name';
                      const isEditingAge = editingCell?.memberId === member.id && editingCell?.field === 'age';
                      const isEditingPhone = editingCell?.memberId === member.id && editingCell?.field === 'phone';
                      const isEditingEmail = editingCell?.memberId === member.id && editingCell?.field === 'email';
                      const isEditingStatus = editingCell?.memberId === member.id && editingCell?.field === 'status';

                      return (
                        <tr key={member.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
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
                                    />
                                  ) : (
                                    <span className="font-bold text-xs text-primary dark:text-secondary">
                                      {member.first_name?.[0]}{member.last_name?.[0]}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="font-semibold text-on-surface dark:text-white group-hover/cell:text-primary dark:group-hover/cell:text-secondary transition-colors whitespace-nowrap">
                                    {member.last_name}, {member.first_name} {member.middle_name ? `${member.middle_name}` : ''}
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
                              <div className="p-2 bg-white dark:bg-neutral-900 border border-primary/30 rounded-2xl shadow-xl space-y-2 z-10">
                                <select
                                  value={inlineData.gender || member.gender || ''}
                                  onChange={(e) => setInlineData({ ...inlineData, gender: e.target.value })}
                                  className="px-2.5 py-1 text-xs border border-outline-variant/60 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-on-surface dark:text-white"
                                >
                                  <option value="">Select Gender</option>
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                </select>
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
                              <div className="p-2 bg-white dark:bg-neutral-900 border border-primary/30 rounded-2xl shadow-xl space-y-2 z-10">
                                <select
                                  value={inlineData.civil_status || member.civil_status || ''}
                                  onChange={(e) => setInlineData({ ...inlineData, civil_status: e.target.value })}
                                  className="px-2.5 py-1 text-xs border border-outline-variant/60 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-on-surface dark:text-white"
                                >
                                  <option value="">Select Status</option>
                                  <option value="Single">Single</option>
                                  <option value="Married">Married</option>
                                  <option value="Widowed">Widowed</option>
                                  <option value="Separated">Separated</option>
                                  <option value="Divorced">Divorced</option>
                                </select>
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
                              <div className="p-2 bg-white dark:bg-neutral-900 border border-primary/30 rounded-2xl shadow-xl space-y-2 z-10">
                                <select
                                  value={inlineData.status || member.status}
                                  onChange={(e) => setInlineData({ ...inlineData, status: e.target.value })}
                                  className="px-2.5 py-1 text-xs border border-outline-variant/60 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-on-surface dark:text-white font-semibold"
                                >
                                  <option value="pending">Pending Review</option>
                                  <option value="approved">Approved</option>
                                  <option value="disapproved">Disapproved</option>
                                  <option value="active">Active</option>
                                  <option value="suspended">Suspended</option>
                                  <option value="inactive">Inactive</option>
                                </select>
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
                                    onClick={() => handleSaveInline(member.id, 'status')}
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
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bordered Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border border-outline-variant/65 rounded-3xl p-4 bg-white dark:bg-surface-container-low shadow-sm">
                <span className="font-body text-xs text-neutral-600 dark:text-neutral-400">
                  Displaying {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, members.length)} of {members.length} members
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="px-4 py-1.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-colors disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={`w-8 h-8 rounded-full text-xs font-bold border transition-colors ${currentPage === idx + 1
                        ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border-primary dark:border-secondary'
                        : 'border-outline-variant hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400'
                        }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-4 py-1.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-colors disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Add Member Modal Popup System */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Title (Optional)</label>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="e.g. Mr., Ms., Engr., Dr."
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">TIN (Taxpayer ID)</label>
                  <input
                    type="text"
                    value={tinInput}
                    onChange={(e) => setTinInput(e.target.value)}
                    placeholder="000-000-000-000"
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
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

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-1">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Age</label>
                  <input
                    type="number"
                    min={18}
                    max={120}
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value)}
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
                    value={genderInput}
                    onChange={(e) => setGenderInput(e.target.value)}
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
                    value={civilStatusInput}
                    onChange={(e) => setCivilStatusInput(e.target.value)}
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
                    placeholder="e.g. jean@coop.org"
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 09123456789"
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
                  placeholder="Street details, City"
                  className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Initial Status</label>
                  <select
                    value={memberStatus}
                    onChange={(e: any) => setMemberStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white font-semibold"
                  >
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="disapproved">Disapproved</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Linked Login User ID (Optional)</label>
                  <input
                    type="number"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="System User ID"
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
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
