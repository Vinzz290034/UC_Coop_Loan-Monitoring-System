import pool from '../config/db.js';

async function run() {
  try {
    const res = await pool.query('SELECT id, name, interest_rate, term_months, amortization_type, min_amount, max_amount FROM loan_products');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
