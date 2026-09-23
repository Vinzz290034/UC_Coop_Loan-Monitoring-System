import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateLoanDeductions() {
  console.log('[Migration] Checking loans table for deductions and net proceeds columns...');
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS net_proceeds NUMERIC(15, 2) DEFAULT NULL;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS total_deductions NUMERIC(15, 2) DEFAULT 0.00;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS deductions_breakdown JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursement_method VARCHAR(50) DEFAULT NULL;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursement_reference VARCHAR(100) DEFAULT NULL;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursement_remarks TEXT DEFAULT NULL;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS custom_schedule JSONB DEFAULT NULL;
    `);

    console.log('[Migration] Loan deductions and net proceeds columns verified successfully.');
  } catch (error) {
    console.error('[Migration] Failed to migrate loan deductions schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateLoanDeductions()
    .then(() => pool.end())
    .catch(() => pool.end());
}
