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

export async function migrateMembersSchema() {
  console.log('[Migration] Checking members table schema for is_verified column...');
  const client = await pool.connect();
  try {
    const checkColumnRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'members' AND column_name = 'is_verified'
    `);

    if (checkColumnRes.rowCount === 0) {
      console.log('[Migration] Column is_verified does not exist on members. Adding column...');
      await client.query('ALTER TABLE members ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false');
      console.log('[Migration] Column is_verified added successfully.');
    }

    // Set status = 'approved' for verified members so status and is_verified stay synchronized
    await client.query("UPDATE members SET status = 'approved', profile_completed = true WHERE is_verified = true AND status = 'pending'");
    await client.query("UPDATE members SET is_verified = true, profile_completed = true WHERE status IN ('active', 'approved')");
    console.log('[Migration] members table schema is ready.');
  } catch (error) {
    console.error('[Migration] Failed to migrate members schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateMembersSchema()
    .then(() => pool.end())
    .catch(() => pool.end());
}
