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
  } finally {
    client.release();
  }
}
