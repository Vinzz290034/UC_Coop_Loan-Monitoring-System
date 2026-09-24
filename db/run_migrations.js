import { fileURLToPath } from 'url';
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
import { migrateSeedDefaults } from './migrate_seed_defaults.js';
import { migrateSystemSettings } from './migrate_system_settings.js';
import { migrateMemberIdFormalization } from './migrate_member_id_formalization.js';
import { migrateLoansImportFields } from './migrate_loans_import_fields.js';
import { migrateMembershipType } from './migrate_membership_type.js';
import { migrateCheckVouchers } from './migrate_check_vouchers.js';
import { migrateFixCorruptedLoanPayments } from './migrate_fix_corrupted_loan_payments.js';
import { migrateFixVillarinLoans } from './migrate_fix_villarin_loans.js';
import { migrateFixPonterosLoans } from './migrate_fix_ponteros_loans.js';
import { migrateFixVelosLoans } from './migrate_fix_velos_loans.js';
import { migrateLoanDeductions } from './migrate_loan_deductions.js';
import { migrateRevolvingFunds } from './migrate_revolving_funds.js';
import { migrateStlLiquidations } from './migrate_stl_liquidations.js';
import { migrateSavingsAccounts } from './migrate_savings_accounts.js';

export async function runMigrations() {
  console.log('[System Startup] Running automated database migrations...');
  try {
    await migrateRoleStaff();
    await migrateMembersSchema();
    await migrateMembersOnboarding();
    await migrateMembershipType();
    await migrateLoansComaker();
    await migrateLoansImportFields();
    await migrateAnalyticsAudit();
    await migrateUserAccessLogs();
    await migrateCalendarEvents();
    await migrateAnnouncements();
    await migrateAppointments();
    await migrateSupportTickets();
    await migrateContactMessages();
    await migrateRegistrationOtp();
    await migrateSeedDefaults();
    await migrateSystemSettings();
    await migrateMemberIdFormalization();
    await migrateCheckVouchers();
    await migrateFixCorruptedLoanPayments();
    await migrateFixVillarinLoans();
    await migrateFixPonterosLoans();
    await migrateFixVelosLoans();
    await migrateLoanDeductions();
    await migrateRevolvingFunds();
    await migrateStlLiquidations();
    await migrateSavingsAccounts();
    console.log('[System Startup] All database migrations completed successfully.');
  } catch (error) {
    console.error('[System Startup] Database migration error:', error);
  }
}

// Allow CLI execution
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigrations().then(() => process.exit(0));
}
