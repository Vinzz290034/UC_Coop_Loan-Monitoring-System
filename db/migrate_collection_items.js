import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateCollectionItems(customPool = null) {
  console.log('[Migration] Checking and adding items JSONB column to collections table...');
  const activePool = customPool || pool;
  const client = await activePool.connect();

  try {
    await client.query('BEGIN');

    // Add items column to collections table if not exists
    await client.query(`
      ALTER TABLE collections 
      ADD COLUMN IF NOT EXISTS items JSONB;
    `);

    await client.query('COMMIT');
    console.log('[Migration] collections table items column verified/added successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Failed to add items column to collections table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateCollectionItems()
    .then(() => {
      console.log('Migration completed successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
