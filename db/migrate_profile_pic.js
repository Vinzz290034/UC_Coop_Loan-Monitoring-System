import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

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
