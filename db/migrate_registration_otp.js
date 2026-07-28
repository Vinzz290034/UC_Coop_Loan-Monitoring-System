import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

export async function migrateRegistrationOtp() {
  console.log('[Migration] Checking otp_verifications table...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        purpose VARCHAR(50) NOT NULL DEFAULT 'registration'
            CHECK (purpose IN ('registration', 'password_reset')),
        registration_data JSONB,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT false,
        attempts INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications(email);
      CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);
      CREATE INDEX IF NOT EXISTS idx_otp_purpose ON otp_verifications(purpose);
    `);
    console.log('[Migration] otp_verifications table is ready.');
  } catch (error) {
    console.error('[Migration] Failed to migrate otp_verifications schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateRegistrationOtp()
    .then(() => pool.end())
    .catch(() => pool.end());
}
