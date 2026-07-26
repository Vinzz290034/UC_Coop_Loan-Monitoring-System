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
