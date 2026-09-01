import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateMembershipType() {
  console.log('[Migration] Checking members table schema for membership_type column...');
  const client = await pool.connect();
  try {
    const checkColumnRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'members' AND column_name = 'membership_type'
    `);

    if (checkColumnRes.rowCount === 0) {
      console.log('[Migration] Adding membership_type column to members...');
      await client.query(`
        ALTER TABLE members 
        ADD COLUMN membership_type VARCHAR(50) NOT NULL DEFAULT 'Regular' 
        CHECK (membership_type IN ('Regular', 'Associate'))
      `);
      console.log('[Migration] Column membership_type added successfully.');
    } else {
      console.log('[Migration] Column membership_type already exists on members.');
    }

    // Ensure existing rows have 'Regular' if null
    await client.query(`
      UPDATE members 
      SET membership_type = 'Regular' 
      WHERE membership_type IS NULL
    `);

    console.log('[Migration] members table membership_type schema is up to date.');
  } catch (error) {
    console.error('[Migration] Failed to migrate membership_type schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow CLI execution
import { fileURLToPath } from 'url';
import path from 'path';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrateMembershipType()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
    });
}
