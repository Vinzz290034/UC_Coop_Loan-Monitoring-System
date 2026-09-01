import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateCalendarEvents() {
  console.log('[Migration] Checking calendar_events table...');
  const client = await pool.connect();
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS calendar_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date DATE NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('announcement', 'payment_deadline', 'office_duty', 'holiday', 'special_schedule')),
        status VARCHAR(50) DEFAULT 'open',
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(type);
    `;
    await client.query(createTableQuery);

    // Safely alter id column to UUID if it exists as integer or non-uuid
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'calendar_events' 
          AND column_name = 'id' 
          AND udt_name != 'uuid'
        ) THEN
          ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_calendar_event_id_fkey;
          ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_pkey CASCADE;
          ALTER TABLE calendar_events ALTER COLUMN id DROP DEFAULT;
          ALTER TABLE calendar_events ALTER COLUMN id TYPE UUID USING gen_random_uuid();
          ALTER TABLE calendar_events ALTER COLUMN id SET DEFAULT gen_random_uuid();
          ALTER TABLE calendar_events ADD PRIMARY KEY (id);
        END IF;
      END $$;
    `);

    console.log('[Migration] calendar_events table is ready.');
  } catch (error) {
    console.error('[Migration] Failed to migrate calendar_events:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateCalendarEvents()
    .then(() => pool.end())
    .catch(() => pool.end());
}
