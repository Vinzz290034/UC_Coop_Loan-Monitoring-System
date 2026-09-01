import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateLoansComaker() {
  console.log('[Migration] Checking loans table schema for co-maker columns...');
  const client = await pool.connect();
  try {
    // Add co_maker_name and co_maker_phone columns if missing
    await client.query(`
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS co_maker_name VARCHAR(150) DEFAULT NULL;
      ALTER TABLE loans ADD COLUMN IF NOT EXISTS co_maker_phone VARCHAR(50) DEFAULT NULL;
    `);

    console.log('[Migration] Loans co-maker schema updated successfully.');
  } catch (error) {
    console.error('[Migration] Failed to migrate loans co-maker schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateLoansComaker()
    .then(() => pool.end())
    .catch(() => pool.end());
}
