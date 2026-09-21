'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import AppointmentsSection from '@/components/calendar/AppointmentsSection';
import { useBreadcrumb } from '@/context/BreadcrumbContext';

export default function AppointmentsPage() {
  const router = useRouter();
  const { setBreadcrumbLabel } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbLabel('appointments', 'Appointments & Schedules');
  }, [setBreadcrumbLabel]);

  return (
    <div className="space-y-6 animate-micro-elevate">
      <div>
        <BackButton href="/dashboard/calendar">Back to Calendar & Appointments</BackButton>
      </div>

      <AppointmentsSection />
    </div>
  );
}