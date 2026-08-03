import { fileURLToPath } from 'url';
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
  console.log('[Migration] Checking support_tickets and faqs_guides tables...');
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

      CREATE TABLE IF NOT EXISTS faqs_guides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('faq', 'guide')),
        category VARCHAR(100) DEFAULT 'general',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_faqs_guides_type ON faqs_guides(type);
      CREATE INDEX IF NOT EXISTS idx_faqs_guides_created_at ON faqs_guides(created_at DESC);
    `;
    await client.query(createTableQuery);

    // If constraint existed without 'loan'/'account'/'general', drop and re-add constraint safely
    try {
      await client.query(`ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;`);
      await client.query(`ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_category_check CHECK (category IN ('loan', 'account', 'general'));`);
    } catch (e) {
      // Ignore if constraint already exists or alter succeeds
    }

    console.log('[Migration] support_tickets and faqs_guides tables are ready with team schema.');
  } catch (error) {
    console.error('[Migration] Failed to migrate support_tickets and faqs_guides:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct execution
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrateSupportTickets()
    .then(() => pool.end())
    .catch(() => pool.end());
}
