import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export async function migrateRenameRegularLoans(customPool = null) {
  console.log('[Migration] Checking and consolidating Regular Loan products to remove duplicates...');
  const activePool = customPool || pool;
  const client = await activePool.connect();

  try {
    await client.query('BEGIN');

    // 1. Consolidate Salary Loan:
    // Check if 'Regular - Salary Loan' already exists
    const regSalaryRes = await client.query(
      `SELECT id FROM loan_products WHERE name = 'Regular - Salary Loan' ORDER BY created_at ASC LIMIT 1`
    );

    if (regSalaryRes.rows.length > 0) {
      const canonicalSalaryId = regSalaryRes.rows[0].id;
      // Re-point any loans referencing duplicate old Salary Loan products to canonical ID
      await client.query(`
        UPDATE loans 
        SET loan_product_id = $1 
        WHERE loan_product_id IN (
          SELECT id FROM loan_products 
          WHERE name IN ('Regular Loan - Salary Loan', 'Regular Loan - Salary Deduction', 'Regular - Salary Deduction')
          AND id != $1
        )
      `, [canonicalSalaryId]);

      // Delete the duplicate old Salary Loan products
      await client.query(`
        DELETE FROM loan_products 
        WHERE name IN ('Regular Loan - Salary Loan', 'Regular Loan - Salary Deduction', 'Regular - Salary Deduction')
        AND id != $1
      `, [canonicalSalaryId]);
    } else {
      // If Regular - Salary Loan does not exist yet, rename the old one
      await client.query(`
        UPDATE loan_products 
        SET name = 'Regular - Salary Loan' 
        WHERE name IN ('Regular Loan - Salary Loan', 'Regular Loan - Salary Deduction', 'Regular - Salary Deduction');
      `);
    }

    // 2. Consolidate Project Loan:
    // Check if 'Regular - Project Loan' already exists
    const regProjectRes = await client.query(
      `SELECT id FROM loan_products WHERE name = 'Regular - Project Loan' ORDER BY created_at ASC LIMIT 1`
    );

    if (regProjectRes.rows.length > 0) {
      const canonicalProjectId = regProjectRes.rows[0].id;
      // Re-point any loans referencing duplicate old Project Loan products to canonical ID
      await client.query(`
        UPDATE loans 
        SET loan_product_id = $1 
        WHERE loan_product_id IN (
          SELECT id FROM loan_products 
          WHERE name = 'Regular Loan - Project Loan'
          AND id != $1
        )
      `, [canonicalProjectId]);

      // Delete the duplicate old Project Loan products
      await client.query(`
        DELETE FROM loan_products 
        WHERE name = 'Regular Loan - Project Loan'
        AND id != $1
      `, [canonicalProjectId]);
    } else {
      // If Regular - Project Loan does not exist yet, rename the old one
      await client.query(`
        UPDATE loan_products 
        SET name = 'Regular - Project Loan' 
        WHERE name = 'Regular Loan - Project Loan';
      `);
    }

    // 3. Update any check vouchers mentioning "Regular Loan - Salary Loan" or "Regular Loan - Project Loan" in particulars
    await client.query(`
      UPDATE check_vouchers
      SET particulars = REPLACE(particulars, 'Regular Loan - Salary Loan', 'Regular - Salary Loan')
      WHERE particulars LIKE '%Regular Loan - Salary Loan%';
    `);

    await client.query(`
      UPDATE check_vouchers
      SET particulars = REPLACE(particulars, 'Regular Loan - Project Loan', 'Regular - Project Loan')
      WHERE particulars LIKE '%Regular Loan - Project Loan%';
    `);

    await client.query('COMMIT');
    console.log('[Migration] Regular loan products successfully consolidated and duplicates removed.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Failed to consolidate regular loan products:', error);
    throw error;
  } finally {
    client.release();
  }
}
