import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateRevolvingFunds() {
  console.log('[Migration] Checking revolving_fund_liquidations tables...');
  const client = await pool.connect();
  try {
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS revolving_fund_liquidations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lf_no VARCHAR(50) NOT NULL,
        sheet_name VARCHAR(100),
        check_voucher_id UUID REFERENCES check_vouchers(id) ON DELETE SET NULL,
        voucher_no VARCHAR(50),
        authorized_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        total_liquidated NUMERIC(15,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        custodian_name VARCHAR(255) DEFAULT 'Michelle M. Pable',
        period_start DATE,
        period_end DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rf_liquidation_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        liquidation_id UUID NOT NULL REFERENCES revolving_fund_liquidations(id) ON DELETE CASCADE,
        item_date DATE,
        item_date_raw VARCHAR(100),
        particulars VARCHAR(255),
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        account_name VARCHAR(150),
        category VARCHAR(100),
        remarks TEXT,
        is_cancelled BOOLEAN DEFAULT FALSE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_rf_liquidations_lf_no ON revolving_fund_liquidations(lf_no);
      CREATE INDEX IF NOT EXISTS idx_rf_liquidations_cv_id ON revolving_fund_liquidations(check_voucher_id);
      CREATE INDEX IF NOT EXISTS idx_rf_items_liquidation_id ON rf_liquidation_items(liquidation_id);
      CREATE INDEX IF NOT EXISTS idx_rf_items_account_name ON rf_liquidation_items(account_name);
    `;
    await client.query(createTablesQuery);

    console.log('[Migration] revolving_fund_liquidations and rf_liquidation_items tables verified.');
  } catch (error) {
    console.error('[Migration] Failed to migrate revolving_fund_liquidations:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateRevolvingFunds()
    .then(() => pool.end())
    .catch(() => pool.end());
}
