import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateRemoveRegularCalamityLoan(customPool = null) {
  console.log('[Migration] Checking and consolidating Calamity Loan products...');
  const activePool = customPool || pool;
  const client = await activePool.connect();

  try {
    await client.query('BEGIN');

    // 1. Locate "Special Loan - Calamity Loan"
    const specialRes = await client.query(
      `SELECT id, name FROM loan_products WHERE name = 'Special Loan - Calamity Loan' LIMIT 1`
    );

    // 2. Locate "Regular Loan - Calamity Loan"
    const regularRes = await client.query(
      `SELECT id, name FROM loan_products WHERE name = 'Regular Loan - Calamity Loan' LIMIT 1`
    );

    if (regularRes.rows.length === 0) {
      console.log('[Migration] "Regular Loan - Calamity Loan" not found or already removed. Skipping cleanup.');
      await client.query('COMMIT');
      return;
    }

    const regularId = regularRes.rows[0].id;

    let specialId;
    if (specialRes.rows.length === 0) {
      // If Special Loan - Calamity Loan doesn't exist, create it or rename Regular Loan - Calamity Loan
      console.log('[Migration] "Special Loan - Calamity Loan" not found. Creating it...');
      const createRes = await client.query(`
        INSERT INTO loan_products (name, interest_rate, term_months, amortization_type, min_amount, max_amount, is_active)
        VALUES ('Special Loan - Calamity Loan', 0.0800, 24, 'flat_rate', 10000.00, 50000.00, true)
        RETURNING id
      `);
      specialId = createRes.rows[0].id;
    } else {
      specialId = specialRes.rows[0].id;
    }

    // 3. Re-link loans that reference Regular Loan - Calamity Loan to Special Loan - Calamity Loan
    const updateLoansRes = await client.query(
      `UPDATE loans SET loan_product_id = $1 WHERE loan_product_id = $2`,
      [specialId, regularId]
    );
    console.log(`[Migration] Re-linked ${updateLoansRes.rowCount} loans to "Special Loan - Calamity Loan" (ID: ${specialId}).`);

    // 4. Re-link announcements if any
    const updateAnnouncementsRes = await client.query(
      `UPDATE announcements SET related_loan_product_id = $1 WHERE related_loan_product_id = $2`,
      [specialId, regularId]
    );
    if (updateAnnouncementsRes.rowCount > 0) {
      console.log(`[Migration] Re-linked ${updateAnnouncementsRes.rowCount} announcements.`);
    }

    // 5. Update any check vouchers mentioning "Regular Loan - Calamity Loan" in particulars
    const updateCvRes = await client.query(`
      UPDATE check_vouchers 
      SET particulars = REPLACE(particulars, 'Regular Loan - Calamity Loan', 'Special Loan - Calamity Loan')
      WHERE particulars LIKE '%Regular Loan - Calamity Loan%'
    `);
    if (updateCvRes.rowCount > 0) {
      console.log(`[Migration] Updated ${updateCvRes.rowCount} check voucher particulars.`);
    }

    // 6. Delete "Regular Loan - Calamity Loan" product
    const deleteRes = await client.query(
      `DELETE FROM loan_products WHERE id = $1`,
      [regularId]
    );
    console.log(`[Migration] Successfully deleted "Regular Loan - Calamity Loan" (ID: ${regularId}).`);

    await client.query('COMMIT');
    console.log('[Migration] Calamity loan consolidation completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Calamity loan consolidation error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateRemoveRegularCalamityLoan()
    .then(() => pool.end())
    .catch(() => pool.end());
}
