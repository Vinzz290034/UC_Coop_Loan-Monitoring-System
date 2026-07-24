import { query } from '../config/db.js';

/**
 * Service to execute automatic data retention cleanup for audit logs and user access logs.
 * Deletes records older than configured retention period (default: 30 days).
 */
export async function cleanupOldLogs() {
  try {
    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '30', 10);
    console.log(`[Retention Service] Starting automated log cleanup (Retention period: ${retentionDays} days)...`);

    // 1. Delete audit logs older than retention period
    const auditCleanupResult = await query(
      `DELETE FROM audit_logs
       WHERE created_at < CURRENT_TIMESTAMP - ($1 || ' days')::INTERVAL`,
      [retentionDays]
    );

    // 2. Delete user access history logs older than retention period
    const accessCleanupResult = await query(
      `DELETE FROM user_access_logs
       WHERE login_at < CURRENT_TIMESTAMP - ($1 || ' days')::INTERVAL`,
      [retentionDays]
    );

    console.log(
      `[Retention Service] Cleanup complete: Removed ${auditCleanupResult.rowCount || 0} old audit logs and ${
        accessCleanupResult.rowCount || 0
      } old access logs.`
    );

    return {
      deletedAuditLogs: auditCleanupResult.rowCount || 0,
      deletedAccessLogs: accessCleanupResult.rowCount || 0,
    };
  } catch (error) {
    console.error('[Retention Service] Error executing automated log cleanup:', error.message);
  }
}

/**
 * Initializes the background retention scheduler.
 * Runs an initial cleanup asynchronously on startup and schedules recurring 24-hour cleanup tasks.
 */
export function initRetentionScheduler() {
  // Trigger initial cleanup in the background without blocking server startup
  setTimeout(() => {
    cleanupOldLogs();
  }, 5000);

  // Run cleanup every 24 hours (24 * 60 * 60 * 1000 ms)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    cleanupOldLogs();
  }, TWENTY_FOUR_HOURS);
}
