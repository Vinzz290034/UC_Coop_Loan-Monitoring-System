import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

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
