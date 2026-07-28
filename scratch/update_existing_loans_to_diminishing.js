import pool from '../config/db.js';

async function updateDb() {
  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log("Updating all loan_products to 'diminishing_balance'...");
    const productsRes = await client.query("UPDATE loan_products SET amortization_type = 'diminishing_balance'");
    console.log(`Updated ${productsRes.rowCount} loan products.`);

    console.log("Updating all loans to 'diminishing_balance'...");
    const loansRes = await client.query("UPDATE loans SET amortization_type = 'diminishing_balance'");
    console.log(`Updated ${loansRes.rowCount} active/historical loans.`);

    await client.query('COMMIT');
    console.log('Database updated successfully to use diminishing balance for all loans.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

updateDb();
