import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateMembersOnboarding() {
  console.log('[Migration] Checking members table schema for onboarding columns...');
  const client = await pool.connect();
  try {
    // 1. Add tin, title, profile_completed, investment_goal columns if missing
    await client.query(`
      ALTER TABLE members ADD COLUMN IF NOT EXISTS tin VARCHAR(50) DEFAULT NULL;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS title VARCHAR(50) DEFAULT NULL;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE members ADD COLUMN IF NOT EXISTS investment_goal NUMERIC DEFAULT 0.00;
    `);

    // 2. Drop existing members status check constraint safely if present
    const checkConstraintsRes = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'members'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%status%'
    `);

    for (const row of checkConstraintsRes.rows) {
      await client.query(`ALTER TABLE members DROP CONSTRAINT IF EXISTS ${row.conname}`);
    }

    // 3. Re-add status check constraint allowing pending, approved, disapproved, active, suspended, inactive
    await client.query(`
      ALTER TABLE members 
      ADD CONSTRAINT members_status_check 
      CHECK (status IN ('active', 'suspended', 'inactive', 'pending', 'approved', 'disapproved'))
    `);

    // 4. Backfill existing active member accounts so legacy users are marked approved & completed
    await client.query(`
      UPDATE members 
      SET profile_completed = true, status = 'approved' 
      WHERE status = 'active' OR status IS NULL
    `);

    console.log('[Migration] Members onboarding schema updated successfully.');
  } catch (error) {
    console.error('[Migration] Failed to migrate members onboarding schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateMembersOnboarding()
    .then(() => pool.end())
    .catch(() => pool.end());
}
