import pool from '../config/db.js';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Link CV 26-280 to Marines Romano's loan
    const linkRomano = await client.query(`
      UPDATE check_vouchers
      SET loan_id = '32a421ad-5207-47ee-aa0a-d85187ba511e',
          folder_name = 'Regular Loans',
          status = 'filed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = '5bc58410-ece6-433c-a274-67c742a58afd'
    `);
    console.log(`Linked CV 26-280 to Marines Romano loan (${linkRomano.rowCount} row updated)`);

    // 2. Link CV 26-277 (Check 392009) to Candilario Tatoy's loan
    const linkTatoy = await client.query(`
      UPDATE check_vouchers
      SET loan_id = 'a21f94a8-6cd7-4a50-a24d-b71d6b120b2c',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 'ec099fa1-0248-4a19-a6e9-8d15e584ebbc'
    `);
    console.log(`Linked CV 26-277 (Check 392009) to Candilario Tatoy loan (${linkTatoy.rowCount} row updated)`);

    // 3. Remove duplicate CV 26-277 with typo check 392007
    const delDuplicateTatoy = await client.query(`
      DELETE FROM check_vouchers
      WHERE id = '9185626a-1e3e-40f2-b2b0-c06f114cbdd7'
    `);
    console.log(`Deleted duplicate CV 26-277 typo check 392007 (${delDuplicateTatoy.rowCount} row deleted)`);

    // 4. Remove all dummy check vouchers created using LAF numbers (26-4xx)
    const delDummyVouchers = await client.query(`
      DELETE FROM check_vouchers
      WHERE voucher_no LIKE '26-4%'
    `);
    console.log(`Deleted dummy 26-4xx check vouchers (${delDummyVouchers.rowCount} rows deleted)`);

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate();
