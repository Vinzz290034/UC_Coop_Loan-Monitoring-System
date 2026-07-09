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
    console.log('Creating appointments table...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        purpose VARCHAR(255) NOT NULL,
        appointment_date DATE NOT NULL,
        time_slot VARCHAR(50) NOT NULL CHECK (time_slot IN ('morning', 'afternoon')),
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_appointments_member ON appointments(member_id);
    `;
    await client.query(createTableQuery);
    console.log('Appointments table created successfully in the PostgreSQL database.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
