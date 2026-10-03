'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BackButton from '@/components/BackButton';
import AppointmentsSection from '@/components/calendar/AppointmentsSection';
import { useBreadcrumb } from '@/context/BreadcrumbContext';

export default function AppointmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { setBreadcrumbLabel } = useBreadcrumb();

  useEffect(() => {
    if (user?.role === 'member') {
      router.replace('/dashboard/notifications?tab=appointment');
      return;
    }
    setBreadcrumbLabel('appointments', 'Schedule');
  }, [user, router, setBreadcrumbLabel]);

  return (
    <div className="space-y-6 animate-micro-elevate">
      <div>
        <BackButton href="/dashboard/calendar">Back to Schedule</BackButton>
      </div>

      <AppointmentsSection />
    </div>
  );
}