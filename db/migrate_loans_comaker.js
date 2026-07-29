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
