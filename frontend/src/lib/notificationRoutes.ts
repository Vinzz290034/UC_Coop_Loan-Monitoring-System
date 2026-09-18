export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Resolves the destination URL when a user clicks a notification.
 */
export function getNotificationDestination(notif: NotificationData, userRole?: string): string {
  const type = (notif.type || '').toLowerCase();
  const title = (notif.title || '').toLowerCase();
  const msg = (notif.message || '').toLowerCase();

  // 1. Messages & Inquiries
  if (type === 'contact_message' || title.includes('contact message') || title.includes('inquiry')) {
    return '/dashboard/messages';
  }

  // 2. Capital Accounts: Share Capital, Fixed Deposits, Investments
  if (
    type === 'account' ||
    type === 'share_capital' ||
    type === 'fixed_deposit' ||
    type === 'investment' ||
    title.includes('share capital') ||
    msg.includes('share capital') ||
    title.includes('placement') ||
    msg.includes('placement')
  ) {
    if (title.includes('fixed deposit') || msg.includes('fixed deposit')) {
      return '/dashboard/accounting?tab=fixed_deposits';
    }
    if (title.includes('investment') || msg.includes('investment')) {
      return '/dashboard/accounting?tab=investments';
    }
    return '/dashboard/accounting?tab=share_capital';
  }

  if (title.includes('fixed deposit') || msg.includes('fixed deposit')) {
    return '/dashboard/accounting?tab=fixed_deposits';
  }

  // 3. Loans: Application, Decisions, Approvals, Payments, Due Reminders
  if (
    type.startsWith('loan') ||
    title.includes('loan') ||
    msg.includes('loan') ||
    title.includes('repayment') ||
    msg.includes('installment') ||
    title.includes('amortization')
  ) {
    return '/dashboard/loans';
  }

  // 4. Member Profile & Verification
  if (type === 'profile_review' || title.includes('profile submitted')) {
    if (userRole === 'admin' || userRole === 'staff') {
      return notif.reference_id ? `/dashboard/members/${notif.reference_id}` : '/dashboard/members';
    }
    return '/dashboard/profile';
  }

  if (type === 'profile_decision' || title.includes('profile')) {
    return '/dashboard/profile';
  }

  // 5. Appointments
  if (type.includes('appointment') || title.includes('appointment')) {
    return '/dashboard/appointments';
  }

  // 6. Support Desk
  if (type.includes('support') || type.includes('ticket') || title.includes('ticket') || title.includes('support')) {
    return '/dashboard/support';
  }

  // 7. Announcements
  if (type.includes('announcement') || title.includes('announcement')) {
    return '/dashboard/announcements';
  }

  // 8. Billings
  if (type.includes('billing') || title.includes('billing')) {
    return '/dashboard/billing';
  }

  // Default fallback
  return '/dashboard/notifications';
}

/**
 * Returns a human-friendly action label for navigating from a notification.
 */
export function getNotificationActionLabel(notif: NotificationData): string {
  const dest = getNotificationDestination(notif);
  if (dest.includes('/dashboard/accounting')) {
    if (dest.includes('fixed_deposits')) return 'View Fixed Deposit →';
    if (dest.includes('investments')) return 'View Investment →';
    return 'View Share Capital →';
  }
  if (dest.includes('/dashboard/loans')) return 'View Loans →';
  if (dest.includes('/dashboard/messages')) return 'View Message →';
  if (dest.includes('/dashboard/members')) return 'Review Member Profile →';
  if (dest.includes('/dashboard/profile')) return 'View Profile →';
  if (dest.includes('/dashboard/appointments')) return 'View Appointment →';
  if (dest.includes('/dashboard/support')) return 'View Support Desk →';
  if (dest.includes('/dashboard/announcements')) return 'View Announcement →';
  if (dest.includes('/dashboard/billing')) return 'View Billings →';
  return 'View Details →';
}
