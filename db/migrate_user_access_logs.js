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

async function migrate() {
  console.log('Connecting to database:', process.env.DB_NAME);
  const client = await pool.connect();
  try {
    console.log('Creating user_access_logs table if not exists...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        logout_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        session_duration INT DEFAULT NULL,
        ip_address VARCHAR(45),
        device_type VARCHAR(50) DEFAULT 'Desktop',
        browser VARCHAR(100),
        operating_system VARCHAR(100),
        user_agent TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'Success',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_user_access_logs_user_id ON user_access_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_access_logs_login_at ON user_access_logs(login_at);
      CREATE INDEX IF NOT EXISTS idx_user_access_logs_status ON user_access_logs(status);
    `;
    await client.query(createTableQuery);
    console.log('Successfully created user_access_logs table and indexes.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
