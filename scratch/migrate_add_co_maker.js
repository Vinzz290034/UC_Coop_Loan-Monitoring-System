import pool from '../config/db.js';

async function migrate() {
  console.log("Altering loans table to add co-maker columns...");
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE loans 
      ADD COLUMN IF NOT EXISTS co_maker_name VARCHAR(150) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS co_maker_phone VARCHAR(50) DEFAULT NULL;
    `);
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed: ", err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
