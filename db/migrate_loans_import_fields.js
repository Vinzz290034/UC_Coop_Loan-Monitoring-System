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

export async function migrateLoansImportFields() {
  console.log('[Migration] Checking loans and share capital schemas for import fields...');
  const client = await pool.connect();
  try {
    // Add columns if missing
    await client.query(`
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS laf_no VARCHAR(100) DEFAULT NULL;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT NULL;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS total_fines NUMERIC(15, 2) DEFAULT 0.00;
      ALTER TABLE share_capital_transactions ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100) DEFAULT NULL;
      ALTER TABLE repayment_schedules ADD COLUMN IF NOT EXISTS fines_due NUMERIC(15, 2) DEFAULT 0.00;
    `);

    console.log('[Migration] Import support columns verified and updated successfully.');
  } catch (error) {
    console.error('[Migration] Failed to migrate import schema fields:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateLoansImportFields()
    .then(() => pool.end())
    .catch(() => pool.end());
}
