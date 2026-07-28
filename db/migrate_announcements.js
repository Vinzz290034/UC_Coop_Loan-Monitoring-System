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

export async function migrateAnnouncements() {
  console.log('[Migration] Checking announcements table...');
  const client = await pool.connect();
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        
        -- Foreign Key Relationships to Existing Tables
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        related_loan_product_id UUID REFERENCES loan_products(id) ON DELETE SET NULL,
        calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
      CREATE INDEX IF NOT EXISTS idx_announcements_loan_product ON announcements(related_loan_product_id);
      CREATE INDEX IF NOT EXISTS idx_announcements_calendar_event ON announcements(calendar_event_id);
      CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
    `;
    await client.query(createTableQuery);

    // Ensure priority constraint is updated safely if modified in the future
    try {
      await client.query(`ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_priority_check;`);
      await client.query(`ALTER TABLE announcements ADD CONSTRAINT announcements_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'));`);
    } catch (e) {
      // Ignore if constraint already exists or alter succeeds
    }

    console.log('[Migration] announcements table is ready with relational schema.');
  } catch (error) {
    console.error('[Migration] Failed to migrate announcements:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAnnouncements()
    .then(() => pool.end())
    .catch(() => pool.end());
}