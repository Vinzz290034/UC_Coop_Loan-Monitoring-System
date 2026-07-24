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

  // ⚡ ADD THESE TWO TIMEOUT PROPERTIES:
  connectionTimeoutMillis: 5000, // Terminate connection attempt after 5 seconds
  idleTimeoutMillis: 30000,      // Close idle connections after 30 seconds
});

// Test database connection
pool.on('connect', () => {
  console.log('Successfully connected to the PostgreSQL database.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);

export default pool;
