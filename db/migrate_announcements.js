import { query } from '../config/db.js';

const migrateAnnouncements = async () => {
  const sql = `
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

  try {
    await query(sql);
    console.log('Announcements table and indexes created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating announcements table:', error);
    process.exit(1);
  }
};

migrateAnnouncements();