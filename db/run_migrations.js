import { migrateMembersSchema } from './migrate_members_schema.js';
import { migrateRoleStaff } from './migrate_role_staff.js';
import { migrateMembersOnboarding } from './migrate_members_onboarding.js';
import { migrateAnalyticsAudit } from './migrate_analytics_audit.js';
import { migrateUserAccessLogs } from './migrate_user_access_logs.js';
import { migrateAnnouncements } from './migrate_announcements.js';
import { migrateAppointments } from './migrate_appointments.js';
import { migrateSupportTickets } from './migrate_support_tickets.js';
import { migrateContactMessages } from './migrate_contact_messages.js';
import { migrateCalendarEvents } from './migrate_calendar.js';
import { migrateRegistrationOtp } from './migrate_registration_otp.js';
import { migrateLoansComaker } from './migrate_loans_comaker.js';

export async function runMigrations() {
  console.log('[System Startup] Running automated database migrations...');
  try {
    await migrateRoleStaff();
    await migrateMembersSchema();
    await migrateMembersOnboarding();
    await migrateLoansComaker();
    await migrateAnalyticsAudit();
    await migrateUserAccessLogs();
    await migrateAnnouncements();
    await migrateAppointments();
    await migrateSupportTickets();
    await migrateContactMessages();
    await migrateCalendarEvents();
    await migrateRegistrationOtp();
    console.log('[System Startup] All database migrations completed successfully.');
  } catch (error) {
    console.error('[System Startup] Database migration error:', error);
  }
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(() => process.exit(0));
}
