import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateAnalyticsAudit() {
  console.log('[Migration] Checking audit_logs table and users tracking columns...');
  const client = await pool.connect();
  try {
    // 1. Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        username VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        module VARCHAR(100),
        method VARCHAR(10),
        endpoint VARCHAR(255),
        status_code INT,
        status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed')),
        ip_address VARCHAR(45),
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
    `);

    // 2. Add tracking columns to users table
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    `);

    // 3. Fix loans status CHECK constraint
    try {
      await client.query(`ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_status_check;`);
      await client.query(`
        ALTER TABLE loans ADD CONSTRAINT loans_status_check
        CHECK (status IN ('pending_approval', 'approved', 'disbursed', 'fully_paid', 'defaulted', 'rejected'));
      `);
    } catch (e) {
      // Ignore if constraint modification succeeds or exists
    }

    console.log('[Migration] Analytics and audit schema is ready.');
  } catch (error) {
    console.error('[Migration] Failed to migrate analytics audit schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAnalyticsAudit()
    .then(() => pool.end())
    .catch(() => pool.end());
}
