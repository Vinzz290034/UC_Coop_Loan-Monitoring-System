import pool from '../config/db.js';

export async function migrateSalesRegistryCatalog(customPool = null) {
  const activePool = customPool || pool;
  const client = await activePool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchandise_catalog (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_name VARCHAR(255) NOT NULL,
        description VARCHAR(255),
        size VARCHAR(50),
        cost_price NUMERIC(15, 2) DEFAULT 0,
        selling_price NUMERIC(15, 2) DEFAULT 0,
        cost_price_2025 NUMERIC(15, 2) DEFAULT 0,
        selling_price_2025 NUMERIC(15, 2) DEFAULT 0,
        category VARCHAR(100) DEFAULT 'Merchandise',
        effective_date VARCHAR(100) DEFAULT 'As of October 15, 2026',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_merchandise_catalog_name ON merchandise_catalog(item_name);
      CREATE INDEX IF NOT EXISTS idx_merchandise_catalog_cat ON merchandise_catalog(category);
    `);
    console.log('[Migration] merchandise_catalog table ensured successfully.');
  } catch (error) {
    console.error('[Migration] Error migrating merchandise_catalog:', error);
    throw error;
  } finally {
    client.release();
  }
}

