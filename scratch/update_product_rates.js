import pool from '../config/db.js';

async function run() {
  try {
    console.log('Updating loan products interest rates and terms...');
    
    // 1. Update all interest rates to 2% (0.0200)
    await pool.query('UPDATE loan_products SET interest_rate = 0.0200');
    
    // 2. Set the maximum term of "Regular Loan - Project Loan" to 36 months
    await pool.query("UPDATE loan_products SET term_months = 36 WHERE name = 'Regular Loan - Project Loan'");
    
    console.log('Update completed successfully!');
    
    // View results
    const res = await pool.query('SELECT name, interest_rate, term_months FROM loan_products');
    console.log('Updated loan products:', res.rows);
    
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
}

run();
