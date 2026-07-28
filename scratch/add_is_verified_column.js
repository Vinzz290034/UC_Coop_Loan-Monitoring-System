import pool from '../config/db.js';

async function run() {
  try {
    console.log('Adding is_verified column to members table...');
    
    // Check if is_verified column already exists
    const checkColumnRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='members' and column_name='is_verified'
    `);
    
    if (checkColumnRes.rowCount === 0) {
      console.log('Column is_verified does not exist. Adding column...');
      await pool.query('ALTER TABLE members ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false');
      console.log('Column is_verified added successfully.');
    } else {
      console.log('Column is_verified already exists.');
    }
    
    // Mark existing members as verified (optional, to avoid breaking current users)
    console.log('Updating existing members to be verified...');
    await pool.query('UPDATE members SET is_verified = true WHERE is_verified = false');
    
    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
