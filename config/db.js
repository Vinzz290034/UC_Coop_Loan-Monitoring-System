import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Railway provides a single DATABASE_URL; local dev uses individual DB_* vars.
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : false, // Required by Railway's managed PostgreSQL
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      }
);

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
