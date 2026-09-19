import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateSavingsAccounts() {
  console.log('[Migration] Checking savings_accounts and savings_transactions tables...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create savings_accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS savings_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
        account_number VARCHAR(50) UNIQUE,
        balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
        maintaining_balance NUMERIC(15, 2) NOT NULL DEFAULT 100.00,
        interest_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0200,
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'closed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create savings_transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS savings_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        savings_account_id UUID NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
        transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'interest_credit', 'loan_offset', 'transfer', 'fee')),
        amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
        balance_after NUMERIC(15, 2) NOT NULL,
        reference_no VARCHAR(100),
        payment_method VARCHAR(50) DEFAULT 'cash',
        performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        remarks TEXT,
        transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled'))
      );
    `);

    // 3. Create indices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_savings_accounts_member_id ON savings_accounts(member_id);
      CREATE INDEX IF NOT EXISTS idx_savings_transactions_account_id ON savings_transactions(savings_account_id);
      CREATE INDEX IF NOT EXISTS idx_savings_transactions_date ON savings_transactions(transaction_date);
    `);

    // 4. Provision savings accounts for existing members who don't have one yet
    const membersWithoutSavings = await client.query(`
      SELECT m.id, m.member_no, m.created_at
      FROM members m
      LEFT JOIN savings_accounts sa ON sa.member_id = m.id
      WHERE sa.id IS NULL
    `);

    if (membersWithoutSavings.rowCount > 0) {
      console.log(`[Migration] Auto-provisioning savings accounts for ${membersWithoutSavings.rowCount} existing members...`);
      for (const member of membersWithoutSavings.rows) {
        const rawNo = member.member_no ? member.member_no.replace(/[^a-zA-Z0-9]/g, '') : member.id.slice(0, 8);
        const accountNo = `SAV-${rawNo}`;
        await client.query(
          `INSERT INTO savings_accounts (member_id, account_number, balance, maintaining_balance, status)
           VALUES ($1, $2, 0.00, 100.00, 'active')
           ON CONFLICT (member_id) DO NOTHING`,
          [member.id, accountNo]
        );
      }
    }

    await client.query('COMMIT');
    console.log('[Migration] savings_accounts and savings_transactions schema is up to date.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Failed to migrate savings accounts schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSavingsAccounts()
    .then(() => pool.end())
    .catch(() => pool.end());
}
