import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateUserAccessLogs() {
  console.log('[Migration] Checking user_access_logs table...');
  const client = await pool.connect();
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        logout_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        session_duration INT DEFAULT NULL,
        ip_address VARCHAR(45),
        device_type VARCHAR(50) DEFAULT 'Desktop',
        browser VARCHAR(100),
        operating_system VARCHAR(100),
        user_agent TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'Success',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_user_access_logs_user_id ON user_access_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_access_logs_login_at ON user_access_logs(login_at);
      CREATE INDEX IF NOT EXISTS idx_user_access_logs_status ON user_access_logs(status);
    `;
    await client.query(createTableQuery);
    console.log('[Migration] user_access_logs table is ready.');
  } catch (error) {
    console.error('[Migration] Failed to migrate user_access_logs:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateUserAccessLogs()
    .then(() => pool.end())
    .catch(() => pool.end());
}
