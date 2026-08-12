'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import api from '@/lib/api';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/context/AuthContext';
import { useBreadcrumb } from '@/context/BreadcrumbContext';
import { SkeletonTable } from '@/components/ui/Skeleton';
import {
  Megaphone,
  PlusCircle,
  Clock,
  Search,
  Filter,
  Trash2,
  Edit3,
  X,
  Loader2,
  Calendar,
  FileText,
  User,
  Inbox,
  AlertTriangle,
  Image as ImageIcon,
  UploadCloud,
  Maximize2,
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_active: boolean;
  created_by?: string;
  author_username?: string;
  related_loan_product_id?: string;
  related_loan_product_name?: string;
  calendar_event_id?: string;
  calendar_event_title?: string;
  calendar_event_date?: string;
  created_at: string;
  updated_at: string;
}

// Helper function to convert relative upload paths to full backend URLs
const getImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const { setBreadcrumbLabel } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbLabel('announcements', 'Announcements');
  }, [setBreadcrumbLabel]);

  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Data state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search state
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);

  // Fullscreen Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    is_active: true,
    related_loan_product_id: '',
    calendar_event_id: '',
    image_url: '',
  });

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch announcements
  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/announcements');
      if (res.data && res.data.success) {
        setAnnouncements(res.data.data || []);
      }
    } catch (err: unknown) {
      console.error('Error fetching announcements:', err);
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error?.message || 'Failed to load announcements.'
        : 'Failed to load announcements.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Handle image selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedAnnouncementId(null);
    setSelectedFile(null);
    setImagePreview(null);
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      is_active: true,
      related_loan_product_id: '',
      calendar_event_id: '',
      image_url: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (ann: Announcement) => {
    setModalMode('edit');
    setSelectedAnnouncementId(ann.id);
    setSelectedFile(null);
    setImagePreview(ann.image_url ? getImageUrl(ann.image_url) : null);
    setFormData({
      title: ann.title,
      content: ann.content,
      priority: ann.priority,
      is_active: ann.is_active,
      related_loan_product_id: ann.related_loan_product_id || '',
      calendar_event_id: ann.calendar_event_id || '',
      image_url: ann.image_url || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      setFormError('Title and content are required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const data = new FormData();
      data.append('title', formData.title);
      data.append('content', formData.content);
      data.append('priority', formData.priority);
      data.append('is_active', String(formData.is_active));

      if (formData.related_loan_product_id) {
        data.append('related_loan_product_id', formData.related_loan_product_id);
      }
      if (formData.calendar_event_id) {
        data.append('calendar_event_id', formData.calendar_event_id);
      }
      if (formData.image_url) {
        data.append('image_url', formData.image_url);
      }
      if (selectedFile) {
        data.append('image', selectedFile);
      }

      if (modalMode === 'create') {
        await api.post('/announcements', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (selectedAnnouncementId) {
        await api.put(`/announcements/${selectedAnnouncementId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setIsModalOpen(false);
      await fetchAnnouncements();
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error?.message || 'Failed to save announcement.'
        : 'Failed to save announcement.';
      setFormError(message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;

    try {
      setActionLoadingId(id);
      await api.delete(`/announcements/${id}`);
      await fetchAnnouncements();
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error?.message || 'Failed to delete announcement.'
        : 'Failed to delete announcement.';
      alert(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter logic
  const filteredAnnouncements = announcements.filter((ann) => {
    if (priorityFilter !== 'all' && ann.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ann.title.toLowerCase().includes(q) ||
        ann.content.toLowerCase().includes(q) ||
        (ann.author_username && ann.author_username.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Priority Badge Styles
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-tertiary/10 text-tertiary border-tertiary/30';
      case 'high':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200/50';
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200/50';
      case 'low':
        return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800/40 dark:text-neutral-400 border-neutral-200/50';
      default:
        return 'bg-neutral-100 text-neutral-600';
    }
  };

  return (
    <div className="space-y-6 animate-micro-elevate">
      <div>
        <BackButton href="/dashboard">Back to System Dashboard</BackButton>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface dark:text-white flex items-center gap-2">
            {/* <Megaphone className="w-7 h-7 text-primary dark:text-secondary" /> */}
            Announcements Board
          </h1>
          <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Stay updated with the latest cooperative news, loan products, and schedule events.
          </p>
        </div>

        {/* Create Announcement Button */}
        {isAdminOrStaff && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            New Announcement
          </button>
        )}
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white dark:bg-surface-container-low p-4 rounded-3xl border border-outline-variant/50 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-400">
          <Filter className="w-4 h-4 text-primary dark:text-secondary" />
          <span>Priority:</span>
        </div>

        <div className="flex flex-wrap gap-2 flex-1">
          {['all', 'urgent', 'high', 'normal', 'low'].map((prio) => (
            <button
              key={prio}
              onClick={() => setPriorityFilter(prio)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${priorityFilter === prio
                  ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 border-primary dark:border-secondary shadow-sm'
                  : 'bg-transparent text-neutral-600 dark:text-neutral-300 border-outline-variant/50 hover:bg-neutral/5 dark:hover:bg-neutral/10'
                }`}
            >
              {prio.charAt(0).toUpperCase() + prio.slice(1)}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-60 pl-9 pr-3 py-2 text-xs border border-outline-variant/60 rounded-xl bg-white dark:bg-surface-container-high focus:ring-1 focus:ring-primary dark:focus:ring-secondary outline-none text-on-surface dark:text-white"
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchAnnouncements} className="ml-auto px-3 py-1 bg-tertiary/10 hover:bg-tertiary/20 rounded-lg font-bold transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Loading & Empty States */}
      {loading ? (
        <SkeletonTable rows={4} cols={3} />
      ) : filteredAnnouncements.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
          <Inbox className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
          <h3 className="font-headline font-bold text-on-surface dark:text-white text-sm">
            No announcements found.
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Check back later for updates from cooperative administration.
          </p>
        </div>
      ) : (
        /* Announcements Feed List */
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getPriorityBadge(ann.priority)}`}>
                    {ann.priority}
                  </span>
                  {!ann.is_active && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-300">
                      Inactive
                    </span>
                  )}
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(ann.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Admin/Staff Actions */}
                {isAdminOrStaff && (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleOpenEdit(ann)}
                      className="p-1.5 hover:bg-neutral/10 rounded-lg text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                      title="Edit announcement"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      disabled={actionLoadingId === ann.id}
                      className="p-1.5 hover:bg-tertiary/10 rounded-lg text-tertiary transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete announcement"
                    >
                      {actionLoadingId === ann.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Title & Content */}
              <div className="space-y-2">
                <h2 className="font-headline text-base sm:text-lg font-bold text-on-surface dark:text-white">
                  {ann.title}
                </h2>
                <p className="font-body text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {ann.content}
                </p>
              </div>

              {/* Attached Announcement Image - Full Picture Uncropped */}
              {ann.image_url && (
                <div className="pt-2">
                  <div
                    onClick={() => setLightboxImage({ url: getImageUrl(ann.image_url), title: ann.title })}
                    className="relative group rounded-2xl overflow-hidden border border-outline-variant/40 bg-neutral-900/5 dark:bg-neutral-950/40 p-1 flex items-center justify-center cursor-pointer transition-all hover:border-primary/50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(ann.image_url)}
                      alt={ann.title}
                      className="w-full h-auto max-h-125 object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 bg-neutral-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <span className="bg-neutral-900/80 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md backdrop-blur-xs">
                        <Maximize2 className="w-3.5 h-3.5" />
                        View Full Screen
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Related Tags / Metadata Footer */}
              {(ann.related_loan_product_name || ann.calendar_event_title || ann.author_username) && (
                <div className="pt-3 border-t border-outline-variant/40 flex flex-wrap items-center gap-4 text-[11px] text-neutral-500 dark:text-neutral-400">
                  {ann.author_username && (
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                      <span>Posted by <strong className="text-on-surface dark:text-white">{ann.author_username}</strong></span>
                    </div>
                  )}

                  {ann.related_loan_product_name && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                      <span>Loan Product: <strong className="text-on-surface dark:text-white">{ann.related_loan_product_name}</strong></span>
                    </div>
                  )}

                  {ann.calendar_event_title && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                      <span>Event: <strong className="text-on-surface dark:text-white">{ann.calendar_event_title}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative animate-modal-pop max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white mb-1 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary dark:text-secondary" />
              {modalMode === 'create' ? 'Create Announcement' : 'Edit Announcement'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Broadcast updates to members and staff across the cooperative dashboard.
            </p>

            {formError && (
              <div className="p-3 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual General Assembly Meeting Notice"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">
                  Content / Body *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide full details of the announcement..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white resize-none"
                />
              </div>

              {/* Photo / Image Upload Field */}
              <div className="space-y-1.5">
                <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                  <span>Announcement Image (Optional)</span>
                </label>

                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-outline-variant/60 bg-neutral-900/5 dark:bg-neutral-950/40 p-2 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Selected upload preview"
                      className="w-full h-auto max-h-56 object-contain rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-3 right-3 bg-neutral-900/80 hover:bg-neutral-950 text-white p-1.5 rounded-full transition-all cursor-pointer shadow-md"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-outline-variant/70 rounded-2xl cursor-pointer hover:bg-neutral/5 dark:hover:bg-neutral/10 transition-colors">
                    <UploadCloud className="w-6 h-6 text-neutral-400 mb-1" />
                    <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                      Click to upload an image
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-0.5">
                      PNG, JPG, WEBP up to 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">
                    Priority Level
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {modalMode === 'edit' && (
                  <div className="space-y-1.5">
                    <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">
                      Status
                    </label>
                    <select
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Optional Relational ID fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">
                    Related Loan Product ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="UUID or leave blank"
                    value={formData.related_loan_product_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, related_loan_product_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white font-mono text-[11px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-label text-neutral-600 dark:text-neutral-400 px-1 font-semibold">
                    Calendar Event ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="ID or leave blank"
                    value={formData.calendar_event_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, calendar_event_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-on-surface dark:text-white font-mono text-[11px]"
                  />
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
                  disabled={formSubmitting}
                  className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 rounded-full text-xs font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {formSubmitting ? 'Saving...' : modalMode === 'create' ? 'Post Announcement' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {lightboxImage && mounted && createPortal(
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-110 flex items-center justify-center bg-neutral-950/90 backdrop-blur-md p-4 animate-modal-backdrop cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[92vh] w-full flex flex-col items-center justify-center"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 bg-neutral-800 hover:bg-neutral-700 text-white p-2 rounded-full transition-all cursor-pointer"
              aria-label="Close image preview"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <p className="text-white text-xs font-medium mt-3 text-center opacity-80">
              {lightboxImage.title}
            </p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}