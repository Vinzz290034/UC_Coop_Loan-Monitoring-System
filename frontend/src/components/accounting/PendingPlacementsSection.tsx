'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Clock, CheckCircle2, XCircle, X, AlertTriangle, Phone, Calendar } from 'lucide-react';

interface PendingPlacementItem {
  id: string | number;
  member_id: string | number;
  member_no: string | number;
  first_name: string;
  last_name: string;
  amount: string | number;
  placement_type: 'fixed_deposit' | 'share_capital';
  created_at?: string;
  placement_date?: string;
  phone?: string;
  email?: string;
}

interface PendingPlacementsSectionProps {
  onConfirmed?: () => void;
  className?: string;
}

export default function PendingPlacementsSection({
  onConfirmed,
  className = '',
}: PendingPlacementsSectionProps) {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'staff';

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [pendingPlacements, setPendingPlacements] = useState<PendingPlacementItem[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | number | null>(null);

  // Decline modal states
  const [declineTarget, setDeclineTarget] = useState<PendingPlacementItem | null>(null);
  const [declineRemarks, setDeclineRemarks] = useState('');
  const [declining, setDeclining] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);

  const loadPendingPlacements = useCallback(async () => {
    if (!isAdminOrManager) return;
    try {
      const res = await api.get('/accounts/pending-placements');
      setPendingPlacements(res.data.data?.all_pending || []);
    } catch (err) {
      console.error('Error fetching pending placements:', err);
    }
  }, [isAdminOrManager]);

  useEffect(() => {
    loadPendingPlacements();
  }, [loadPendingPlacements]);

  const handleConfirmPayment = async (type: string, id: string | number) => {
    try {
      setConfirmingId(id);
      const endpointType = type === 'fixed_deposit' ? 'fixed-deposit' : 'share-capital';
      await api.put(`/accounts/confirm-placement/${endpointType}/${id}`);
      await loadPendingPlacements();
      if (onConfirmed) {
        onConfirmed();
      }
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Error confirming cash payment.');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDeclinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineTarget) return;

    try {
      setDeclining(true);
      setDeclineError(null);
      const endpointType = declineTarget.placement_type === 'fixed_deposit' ? 'fixed-deposit' : 'share-capital';
      
      await api.put(`/accounts/decline-placement/${endpointType}/${declineTarget.id}`, {
        remarks: declineRemarks.trim() || undefined,
      });

      setDeclineTarget(null);
      setDeclineRemarks('');
      await loadPendingPlacements();
      if (onConfirmed) {
        onConfirmed();
      }
    } catch (err: any) {
      setDeclineError(err.response?.data?.error?.message || 'Failed to decline office payment.');
    } finally {
      setDeclining(false);
    }
  };

  if (!isAdminOrManager) {
    return null;
  }

  return (
    <div
      className={`bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/30 rounded-3xl p-5 space-y-4 shadow-sm transition-all ${className}`}
    >
      {/* Sidebar Section Header */}
      <div className="space-y-1.5 border-b border-amber-500/20 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Clock className="w-4 h-4 flex-shrink-0 animate-pulse text-amber-600 dark:text-amber-400" />
            <h3 className="font-headline text-sm font-extrabold tracking-tight">
              Pending Member Placements
            </h3>
          </div>
          <span className="text-[11px] font-extrabold text-amber-900 dark:text-amber-200 bg-amber-500/30 dark:bg-amber-500/25 px-2.5 py-0.5 rounded-full border border-amber-500/40">
            {pendingPlacements.length}
          </span>
        </div>
        <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium leading-normal">
          Awaiting in-person office cash payment confirmation
        </p>
      </div>

      {/* Pending Items Stack / Empty State */}
      {pendingPlacements.length === 0 ? (
        <div className="p-6 bg-white/70 dark:bg-surface-container-low/70 border border-amber-500/20 rounded-2xl text-center space-y-2 shadow-2xs">
          <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto" />
          <h4 className="font-headline font-bold text-xs text-on-surface dark:text-white">
            No Pending Office Payments
          </h4>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
            All member share capital and fixed deposit cash placements are currently up to date.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {pendingPlacements.map((p) => {
          const rawMemberNo = p.member_no?.toString() || '';
          const displayMemberNo = rawMemberNo.length > 10 ? `#${rawMemberNo.slice(0, 8)}...` : `#${rawMemberNo}`;

          return (
            <div
              key={`${p.placement_type}-${p.id}`}
              className="p-4 bg-white dark:bg-surface-container-low border border-amber-500/30 dark:border-amber-500/30 rounded-2xl space-y-3 shadow-xs hover:border-amber-500/60 hover:shadow-md transition-all"
            >
              {/* Member Profile Info */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {p.first_name?.[0] || 'M'}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-on-surface dark:text-white text-xs block truncate" title={`${p.first_name} ${p.last_name}`}>
                      {p.first_name} {p.last_name}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono block truncate" title={rawMemberNo}>
                      {displayMemberNo}
                    </span>
                  </div>
                </div>
                <span className="uppercase font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-[9px] font-extrabold text-amber-800 dark:text-amber-300 flex-shrink-0 border border-amber-500/20">
                  {p.placement_type === 'fixed_deposit' ? 'Fixed Deposit' : 'Share Capital'}
                </span>
              </div>

              {/* Amount Display */}
              <div className="p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl flex items-center justify-between border border-outline-variant/30">
                <span className="text-[10px] font-bold uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">
                  Amount Due
                </span>
                <span className="font-headline font-extrabold text-amber-700 dark:text-amber-400 text-sm font-mono">
                  ₱{parseFloat(p.amount.toString()).toLocaleString()}
                </span>
              </div>

              {/* Sub-details (Phone & Submitted Date) */}
              <div className="space-y-1 text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                  <span className="truncate">{p.phone || 'No phone recorded'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                  <span>Submitted: {new Date(p.created_at || p.placement_date || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons Stack */}
              <div className="pt-1 space-y-2">
                <button
                  type="button"
                  disabled={confirmingId === p.id}
                  onClick={() => handleConfirmPayment(p.placement_type, p.id)}
                  className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{confirmingId === p.id ? 'Approving...' : 'Confirm Office Payment'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeclineTarget(p);
                    setDeclineRemarks('');
                    setDeclineError(null);
                  }}
                  className="w-full py-1.5 px-3 border border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 dark:text-red-400 font-bold text-[11px] rounded-xl transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Decline Payment</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* DECLINE REASON MODAL OVERLAY */}
      {declineTarget && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 animate-modal-backdrop">
          <div className="bg-white dark:bg-surface-container-low border border-outline-variant/70 rounded-3xl w-full max-w-md shadow-2xl p-6 relative animate-modal-pop">
            <button
              onClick={() => setDeclineTarget(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral/10 dark:hover:bg-neutral/20 text-neutral-500 hover:text-on-surface dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 cursor-pointer focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h2 className="font-headline text-lg font-bold">Decline Office Payment Request</h2>
            </div>
            
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4">
              You are declining the{' '}
              <strong className="text-on-surface dark:text-white">
                {declineTarget.placement_type === 'fixed_deposit' ? 'Fixed Deposit' : 'Share Capital'}
              </strong>{' '}
              placement of ₱{parseFloat(declineTarget.amount.toString()).toLocaleString()} for{' '}
              <strong className="text-on-surface dark:text-white">
                {declineTarget.first_name} {declineTarget.last_name}
              </strong>
              .
            </p>

            {declineError && (
              <div className="p-3 mb-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
                {declineError}
              </div>
            )}

            <form onSubmit={handleDeclinePayment} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-neutral-600 dark:text-neutral-400">
                  Reason for Recline / Cancellation (Optional)
                </label>
                <textarea
                  rows={3}
                  value={declineRemarks}
                  onChange={(e) => setDeclineRemarks(e.target.value)}
                  placeholder="e.g. Invalid amount entered, member requested cancellation, or insufficient verification..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-surface border border-outline-variant/60 rounded-xl focus:ring-1 focus:ring-red-500 outline-none text-on-surface dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeclineTarget(null)}
                  className="px-5 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 text-neutral-600 dark:text-neutral-400 transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={declining}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full text-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer shadow-md"
                >
                  {declining ? 'Declining...' : 'Submit Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
