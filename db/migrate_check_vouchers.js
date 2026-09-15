import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateCheckVouchers() {
  console.log('[Migration] Checking check_vouchers table...');
  const client = await pool.connect();
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS check_vouchers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        voucher_no VARCHAR(50) NOT NULL,
        voucher_date DATE,
        check_no VARCHAR(100),
        payee VARCHAR(255) NOT NULL,
        bank VARCHAR(100),
        particulars TEXT,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        managers_approval_date DATE,
        date_released DATE,
        folder_name VARCHAR(150),
        box_name VARCHAR(150),
        details JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE check_vouchers ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE check_vouchers ADD COLUMN IF NOT EXISTS signatories JSONB DEFAULT '{"prepared_by":"LAMOSTE, CHINNETTE A.","checked_by":"MANILYN VELOS","approved_by":"MICHELLE M. PABLE"}'::jsonb;

      CREATE INDEX IF NOT EXISTS idx_check_vouchers_voucher_date ON check_vouchers(voucher_date DESC);
      CREATE INDEX IF NOT EXISTS idx_check_vouchers_folder_name ON check_vouchers(folder_name);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_check_vouchers_voucher_no_check_no ON check_vouchers(voucher_no, check_no);
    `;
    await client.query(createTableQuery);

    console.log('[Migration] check_vouchers table created/verified successfully.');
  } catch (error) {
    console.error('[Migration] Failed to migrate check_vouchers:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateCheckVouchers()
    .then(() => pool.end())
    .catch(() => pool.end());
}
