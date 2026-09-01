import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateSystemSettings() {
  console.log('[Migration] Checking system settings table...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES ('state_of_calamity_declared', 'false')
      ON CONFLICT (setting_key) DO NOTHING;
    `);
    console.log('[Migration] system_settings table checked/initialized successfully.');
  } catch (error) {
    console.error('[Migration] Error in migrateSystemSettings:', error);
    throw error;
  } finally {
    client.release();
  }
}
