'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Clock, CheckCircle2 } from 'lucide-react';

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

  const [pendingPlacements, setPendingPlacements] = useState<PendingPlacementItem[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | number | null>(null);

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

  if (!isAdminOrManager || pendingPlacements.length === 0) {
    return null;
  }

  return (
    <div
      className={`bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/30 rounded-3xl p-6 space-y-4 shadow-sm transition-all ${className}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Clock className="w-5 h-5 flex-shrink-0 animate-pulse" />
          <h3 className="font-headline text-base font-extrabold">
            Pending Member Placements & Office Payments ({pendingPlacements.length})
          </h3>
        </div>
        <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
          Awaiting In-Person Office Cash Payment
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pendingPlacements.map((p) => (
          <div
            key={`${p.placement_type}-${p.id}`}
            className="p-4 bg-white dark:bg-surface-container-low border border-amber-500/30 dark:border-amber-500/30 rounded-2xl flex items-center justify-between gap-4 shadow-xs hover:border-amber-500/60 transition-all"
          >
            <div className="space-y-1 text-xs">
              <span className="font-bold text-on-surface dark:text-white block text-sm">
                {p.first_name} {p.last_name}{' '}
                <span className="font-mono text-xs text-neutral-500 font-normal">
                  ({p.member_no})
                </span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px] font-extrabold text-amber-800 dark:text-amber-300">
                  {p.placement_type === 'fixed_deposit' ? 'Fixed Deposit' : 'Share Capital'}
                </span>
                <span className="font-extrabold text-amber-700 dark:text-amber-400 text-sm">
                  ₱{parseFloat(p.amount.toString()).toLocaleString()}
                </span>
              </div>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block font-mono">
                Phone: {p.phone || 'N/A'} • Submitted:{' '}
                {new Date(p.created_at || p.placement_date || Date.now()).toLocaleDateString()}
              </span>
            </div>

            <button
              disabled={confirmingId === p.id}
              onClick={() => handleConfirmPayment(p.placement_type, p.id)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-neutral-950 font-bold text-xs rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{confirmingId === p.id ? 'Approving...' : 'Confirm Office Payment'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
