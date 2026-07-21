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
    console.log('Altering users table to add profile_picture_url...');
    const alterQuery = `
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(255) DEFAULT NULL;
    `;
    await client.query(alterQuery);
    console.log('Successfully added profile_picture_url column to users table.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
