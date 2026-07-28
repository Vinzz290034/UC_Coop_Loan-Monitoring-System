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

export async function migrateRoleStaff() {
  console.log('[Migration] Migrating role constraints (manager -> staff)...');
  const client = await pool.connect();
  try {
    // 1. Drop existing role check constraint on users table if any
    const checkConstraintsRes = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%role%'
    `);

    for (const row of checkConstraintsRes.rows) {
      await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${row.conname}`);
    }

    // 2. Update existing manager role entries to staff
    await client.query(`UPDATE users SET role = 'staff' WHERE role = 'manager'`);

    // 3. Add updated check constraint allowing admin, staff, member
    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('admin', 'staff', 'member'))
    `);

    console.log('[Migration] Role update (manager -> staff) completed successfully.');
  } catch (error) {
    console.error('[Migration] Failed to migrate role constraints:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateRoleStaff()
    .then(() => pool.end())
    .catch(() => pool.end());
}
