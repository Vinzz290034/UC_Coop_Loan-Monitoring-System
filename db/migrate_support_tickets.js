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

export async function migrateSupportTickets() {
  console.log('[Migration] Checking support_tickets table...');
  const client = await pool.connect();
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('loan', 'account', 'general')),
        status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
    `;
    await client.query(createTableQuery);

    // If constraint existed without 'loan'/'account'/'general', drop and re-add constraint safely
    try {
      await client.query(`ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;`);
      await client.query(`ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_category_check CHECK (category IN ('loan', 'account', 'general'));`);
    } catch (e) {
      // Ignore if constraint already exists or alter succeeds
    }

    console.log('[Migration] support_tickets table is ready with team schema.');
  } catch (error) {
    console.error('[Migration] Failed to migrate support_tickets:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSupportTickets()
    .then(() => pool.end())
    .catch(() => pool.end());
}
