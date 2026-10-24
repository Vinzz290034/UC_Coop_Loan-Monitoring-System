import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateCollections() {
  console.log('[Migration] Checking collections table...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tab VARCHAR(50) NOT NULL DEFAULT 'credit',
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        or_no VARCHAR(100) NOT NULL,
        payor_name VARCHAR(255) NOT NULL,
        member_id VARCHAR(100),
        loans JSONB DEFAULT '[]'::jsonb,
        loan_account VARCHAR(255),
        principal_amount NUMERIC(15, 2) DEFAULT 0,
        interest_account VARCHAR(255),
        interest_amount NUMERIC(15, 2) DEFAULT 0,
        fines_account VARCHAR(255),
        fines_amount NUMERIC(15, 2) DEFAULT 0,
        common_share_amount NUMERIC(15, 2) DEFAULT 0,
        membership_fee NUMERIC(15, 2) DEFAULT 0,
        billing_amount NUMERIC(15, 2) DEFAULT 0,
        item_name VARCHAR(255),
        item_category VARCHAR(100),
        quantity INTEGER DEFAULT 1,
        unit_price NUMERIC(15, 2) DEFAULT 0,
        service_type VARCHAR(255),
        service_copies INTEGER DEFAULT 1,
        service_rate NUMERIC(15, 2) DEFAULT 0,
        particulars TEXT,
        other_category VARCHAR(100),
        amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
        reference_no VARCHAR(100),
        bank_name VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'completed',
        remarks TEXT,
        collected_by VARCHAR(255) NOT NULL DEFAULT 'CHINNETTE A. LAMOSTE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure bank_name, membership_fee, and billing_amount columns exist if table was already created
    await client.query(`
      ALTER TABLE collections ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
      ALTER TABLE collections ADD COLUMN IF NOT EXISTS membership_fee NUMERIC(15, 2) DEFAULT 0;
      ALTER TABLE collections ADD COLUMN IF NOT EXISTS billing_amount NUMERIC(15, 2) DEFAULT 0;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_collections_date ON collections(date DESC);
      CREATE INDEX IF NOT EXISTS idx_collections_or_no ON collections(or_no);
      CREATE INDEX IF NOT EXISTS idx_collections_tab ON collections(tab);
      CREATE INDEX IF NOT EXISTS idx_collections_payor_name ON collections(payor_name);
    `);

    await client.query('COMMIT');
    console.log('[Migration] collections schema is up to date.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Failed to migrate collections schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateCollections()
    .then(() => pool.end())
    .catch(() => pool.end());
}
