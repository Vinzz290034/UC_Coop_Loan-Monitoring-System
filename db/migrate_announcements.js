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
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        related_loan_product_id UUID REFERENCES loan_products(id) ON DELETE SET NULL,
        calendar_event_id INTEGER REFERENCES calendar_events(id) ON DELETE SET NULL,
        
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

    // Safely add image_url column if table already exists
    await client.query(`
      ALTER TABLE announcements 
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);

    try {
      await client.query(`ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_priority_check;`);
      await client.query(`ALTER TABLE announcements ADD CONSTRAINT announcements_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'));`);
    } catch (e) {
      // Ignore if constraint already exists
    }

    console.log('[Migration] announcements table updated with image_url column.');
  } catch (error) {
    console.error('[Migration] Failed to migrate announcements:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAnnouncements()
    .then(() => pool.end())
    .catch(() => pool.end());
}