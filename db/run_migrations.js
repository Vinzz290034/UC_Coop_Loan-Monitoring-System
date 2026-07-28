import { migrateAppointments } from './migrate_appointments.js';
import { migrateSupportTickets } from './migrate_support_tickets.js';
import { migrateContactMessages } from './migrate_contact_messages.js';
import { migrateCalendarEvents } from './migrate_calendar.js';

export async function runMigrations() {
  console.log('[System Startup] Running automated database migrations...');
  try {
    await migrateAppointments();
    await migrateSupportTickets();
    await migrateContactMessages();
    await migrateCalendarEvents();
    console.log('[System Startup] All database migrations completed successfully.');
  } catch (error) {
    console.error('[System Startup] Database migration error:', error);
  }
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(() => process.exit(0));
}
