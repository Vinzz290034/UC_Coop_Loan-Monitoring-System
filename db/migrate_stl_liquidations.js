import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateStlLiquidations() {
  console.log('[Migration] Checking stl_liquidations tables...');
  const client = await pool.connect();
  try {
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS stl_liquidations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lf_no VARCHAR(50) NOT NULL,
        check_voucher_id UUID REFERENCES check_vouchers(id) ON DELETE SET NULL,
        voucher_no VARCHAR(50),
        authorized_amount NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
        total_expense NUMERIC(15,2) NOT NULL DEFAULT 0,
        cash_on_hand NUMERIC(15,2) NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        prepared_by VARCHAR(255) DEFAULT 'Vanessa Mae A. Mondrano',
        prepared_designation VARCHAR(100) DEFAULT 'Staff',
        date_submitted DATE DEFAULT CURRENT_DATE,
        approved_by VARCHAR(255) DEFAULT 'Michelle Pable',
        approved_designation VARCHAR(100) DEFAULT 'Manager',
        date_approved DATE DEFAULT CURRENT_DATE,
        period_start DATE,
        period_end DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stl_liquidation_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        liquidation_id UUID NOT NULL REFERENCES stl_liquidations(id) ON DELETE CASCADE,
        release_date DATE,
        release_date_raw VARCHAR(100),
        particulars VARCHAR(255) NOT NULL,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        remarks TEXT,
        sort_order INT DEFAULT 0,
        loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE stl_liquidation_items ADD COLUMN IF NOT EXISTS loan_id UUID REFERENCES loans(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_stl_liquidations_lf_no ON stl_liquidations(lf_no);
      CREATE INDEX IF NOT EXISTS idx_stl_liquidations_cv_id ON stl_liquidations(check_voucher_id);
      CREATE INDEX IF NOT EXISTS idx_stl_items_liquidation_id ON stl_liquidation_items(liquidation_id);
      CREATE INDEX IF NOT EXISTS idx_stl_items_loan_id ON stl_liquidation_items(loan_id);
    `;
    await client.query(createTablesQuery);

    // Check if table is empty, seed LF no. 26-58 from the official document
    const countRes = await client.query('SELECT COUNT(*) FROM stl_liquidations');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      console.log('[Migration] Seeding initial STL Liquidation Form (LF no. 26-58)...');
      const seedFormRes = await client.query(`
        INSERT INTO stl_liquidations (
          lf_no,
          authorized_amount,
          total_expense,
          cash_on_hand,
          status,
          prepared_by,
          prepared_designation,
          date_submitted,
          approved_by,
          approved_designation,
          date_approved,
          notes
        ) VALUES (
          '26-58',
          100000.00,
          87215.00,
          12785.00,
          'open',
          'Vanessa Mae A. Mondrano',
          'Staff',
          '2026-09-18',
          'Michelle Pable',
          'Manager',
          '2026-09-18',
          'Initial seeded STL liquidation from physical records'
        ) RETURNING id
      `);

      const formId = seedFormRes.rows[0].id;

      const sampleItems = [
        { date: '2026-09-07', raw: '07-Sep', particulars: 'LAF no. 26-407', amount: 4889.00 },
        { date: '2026-09-08', raw: '08-Sep', particulars: 'LAF no. 26-410', amount: 3274.60 },
        { date: '2026-09-08', raw: '08-Sep', particulars: 'LAF no. 26-411', amount: 7900.00 },
        { date: '2026-09-10', raw: '10-Sep', particulars: 'LAF no. 26-412', amount: 4617.00 },
        { date: '2026-09-10', raw: '10-Sep', particulars: 'LAF no. 26-413', amount: 9767.00 },
        { date: '2026-09-12', raw: '12-Sep', particulars: 'LAF no. 26-414', amount: 2901.00 },
        { date: '2026-09-15', raw: '15-Sep', particulars: 'LAF no. 26-415', amount: 4889.00 },
        { date: '2026-09-16', raw: '16-Sep', particulars: 'LAF no. 26-416', amount: 6367.00 },
        { date: '2026-09-16', raw: '16-Sep', particulars: 'LAF no. 26-417', amount: 6844.60 },
        { date: '2026-09-16', raw: '16-Sep', particulars: 'LAF no. 26-418', amount: 4889.00 },
        { date: '2026-09-16', raw: '16-Sep', particulars: 'LAF no. 26-419', amount: 3274.60 },
        { date: '2026-09-17', raw: '17-Sep', particulars: 'LAF no. 26-420', amount: 6400.00 },
        { date: '2026-09-17', raw: '17-Sep', particulars: 'LAF no. 26-421', amount: 6844.60 },
        { date: '2026-09-17', raw: '17-Sep', particulars: 'LAF no. 26-422', amount: 5059.60 },
        { date: '2026-09-18', raw: '18-Sep', particulars: 'LAF no. 26-424', amount: 2931.00 },
        { date: '2026-09-18', raw: '18-Sep', particulars: 'LAF no. 26-425', amount: 6367.00 },
      ];

      for (let i = 0; i < sampleItems.length; i++) {
        const item = sampleItems[i];
        await client.query(`
          INSERT INTO stl_liquidation_items (
            liquidation_id,
            release_date,
            release_date_raw,
            particulars,
            amount,
            sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [formId, item.date, item.raw, item.particulars, item.amount, i + 1]);
      }
      console.log(`[Migration] Seeded ${sampleItems.length} items for LF no. 26-58.`);
    }

    console.log('[Migration] stl_liquidations tables verified.');
  } catch (error) {
    console.error('[Migration] Failed to migrate stl_liquidations:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  migrateStlLiquidations()
    .then(() => pool.end())
    .catch(() => pool.end());
}
