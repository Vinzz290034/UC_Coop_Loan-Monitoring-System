import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateAppointments() {
  console.log('[Migration] Checking appointments table...');
  const client = await pool.connect();
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        purpose VARCHAR(255) NOT NULL,
        appointment_date DATE NOT NULL,
        time_slot VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_appointments_member ON appointments(member_id);
    `;
    await client.query(createTableQuery);

    // If appointments table already existed with strict check constraints, alter them safely
    try {
      await client.query(`ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_time_slot_check;`);
      await client.query(`ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;`);
    } catch (e) {
      // Ignore if constraints do not exist
    }

    console.log('[Migration] appointments table is ready.');
  } catch (error) {
    console.error('[Migration] Failed to migrate appointments:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAppointments()
    .then(() => pool.end())
    .catch(() => pool.end());
}
