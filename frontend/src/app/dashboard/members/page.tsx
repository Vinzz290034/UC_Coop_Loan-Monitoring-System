'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import SearchInput from '@/components/SearchInput';
import { SkeletonTable } from '@/components/ui/Skeleton';
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
  ArrowLeft
} from 'lucide-react';

interface Member {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  status: 'active' | 'suspended' | 'inactive';
  created_at: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add Member Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [memberStatus, setMemberStatus] = useState<'active' | 'suspended' | 'inactive'>('active');
  const [userId, setUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/members', { params });
      setMembers(response.data.data || []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      setError(err.response?.data?.message || 'Failed to retrieve members list.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSearch = (val: string) => {
    setSearch(val);
  };

  const handleExportExcel = async () => {
    try {
      // Export report endpoint: /members/export/excel
      const response = await api.get('/members/export/excel', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Members_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert('Failed to export report. Verify you have administrative permissions.');
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
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        date_of_birth: dob || undefined,
        status: memberStatus,
        user_id: userId ? parseInt(userId, 10) : undefined
      });

      // Clear Form and Close Modal
      setFirstName('');
      setLastName('');
      setMiddleName('');
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
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
            <CheckCircle className="w-3.5 h-3.5" />
            Active
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
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-neutral-500 hover:text-primary dark:hover:text-secondary transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to System Dashboard
        </Link>
      </div>

      {/* Header and Exporter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface dark:text-white">Members Directory</h1>
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

      {/* Filter Desk */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm">
        <SearchInput placeholder="Search member by first name, last_name, email..." onSearch={handleSearch} />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold font-label text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Status Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 text-xs border border-outline-variant rounded-xl bg-white dark:bg-surface-container-low focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <SkeletonTable rows={itemsPerPage} cols={5} />
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
                  <tr className="bg-surface-container-low dark:bg-surface-container-high/55 border-b border-outline-variant/50">
                    <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">FullName</th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Email Address</th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Phone Contacts</th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Status</th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase">Join Date</th>
                    <th className="px-6 py-4 font-headline text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 font-body text-sm text-on-surface dark:text-white/95">
                  {currentItems.map((member) => (
                    <tr key={member.id} className="hover:bg-neutral/5 dark:hover:bg-neutral/10 transition-colors">
                      <td className="px-6 py-4 font-semibold">
                        {member.last_name}, {member.first_name} {member.middle_name ? `${member.middle_name.charAt(0)}.` : ''}
                      </td>
                      <td className="px-6 py-4">
                        {member.email ? (
                          <span className="flex items-center gap-1 text-xs">
                            <Mail className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                            {member.email}
                          </span>
                        ) : (
                          <span className="text-neutral-400 font-mono text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {member.phone ? (
                          <span className="flex items-center gap-1 text-xs">
                            <Phone className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                            {member.phone}
                          </span>
                        ) : (
                          <span className="text-neutral-400 font-mono text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(member.status)}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(member.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/members/${member.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 dark:bg-secondary/10 dark:hover:bg-secondary/20 text-primary dark:text-secondary text-xs font-bold transition-all active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
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

      {/* Add Member Modal Popup System */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral/10 text-neutral-600 dark:text-neutral-400 transition-colors"
            >
              <X className="w-5 h-5" />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-xs text-neutral-600 dark:text-neutral-400 px-1">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Optional"
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
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-on-surface dark:text-white"
                  >
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
    </div>
  );
}
