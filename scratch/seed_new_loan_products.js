import pool from '../config/db.js';

async function seed() {
  console.log("Starting database seeding for new loan products...");
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear out old default products
    console.log("Removing old loan products...");
    await client.query("DELETE FROM loan_products WHERE name IN ('Regular Flat Rate Loan', 'Emergency Loan', 'Diminishing Balance Loan')");
    
    // Insert new products
    const products = [
      // 1. Regular Loan
      { name: 'Standard Salary Deduction Loan', interest_rate: 0.1200, term_months: 12, amortization_type: 'diminishing_balance', min_amount: 5000.00, max_amount: 100000.00 },
      
      // 2. Short-term / Micro
      { name: 'Cash Express', interest_rate: 0.0800, term_months: 3, amortization_type: 'flat_rate', min_amount: 7000.00, max_amount: 7000.00 },
      { name: 'Emergency Loan', interest_rate: 0.0400, term_months: 6, amortization_type: 'flat_rate', min_amount: 5000.00, max_amount: 5000.00 },
      { name: 'Micro Advance / Petty Loan', interest_rate: 0.0200, term_months: 1, amortization_type: 'flat_rate', min_amount: 3000.00, max_amount: 3000.00 },
      { name: 'Utility Bill Loan', interest_rate: 0.0300, term_months: 2, amortization_type: 'flat_rate', min_amount: 3000.00, max_amount: 3000.00 },
      { name: 'Occasion / Seasonal Loan', interest_rate: 0.0500, term_months: 6, amortization_type: 'flat_rate', min_amount: 10000.00, max_amount: 10000.00 },
      
      // 3. Product & Commodity
      { name: 'Consumer Electronics / Laptop / Computer Loan', interest_rate: 0.0600, term_months: 12, amortization_type: 'flat_rate', min_amount: 5000.00, max_amount: 40000.00 },
      { name: 'Appliances & Furniture Loan', interest_rate: 0.0500, term_months: 12, amortization_type: 'flat_rate', min_amount: 5000.00, max_amount: 30000.00 },
      { name: 'Motorcycle & Vehicle Loan', interest_rate: 0.0800, term_months: 24, amortization_type: 'diminishing_balance', min_amount: 20000.00, max_amount: 120000.00 },
      { name: 'Jewelry / Valuables Loan', interest_rate: 0.0400, term_months: 6, amortization_type: 'flat_rate', min_amount: 5000.00, max_amount: 50000.00 },
      { name: 'Essential Commodities (Rice & Store Grocery Vouchers)', interest_rate: 0.0100, term_months: 2, amortization_type: 'flat_rate', min_amount: 1000.00, max_amount: 5000.00 },
      
      // 4. Special & Assistance
      { name: 'Calamity Loan (Typhoon/Flood/Disaster)', interest_rate: 0.0150, term_months: 12, amortization_type: 'flat_rate', min_amount: 5000.00, max_amount: 20000.00 },
      { name: 'Mortuary / Bereavement Assistance Loan', interest_rate: 0.0200, term_months: 12, amortization_type: 'flat_rate', min_amount: 5000.00, max_amount: 15000.00 },
      { name: 'Project / Entrepreneurial Loan', interest_rate: 0.0700, term_months: 24, amortization_type: 'diminishing_balance', min_amount: 10000.00, max_amount: 150000.00 }
    ];
    
    for (const p of products) {
      await client.query(`
        INSERT INTO loan_products (name, interest_rate, term_months, amortization_type, min_amount, max_amount, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (name) DO NOTHING
      `, [p.name, p.interest_rate, p.term_months, p.amortization_type, p.min_amount, p.max_amount]);
    }
    
    await client.query('COMMIT');
    console.log("Seeding completed successfully!");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Seeding failed: ", err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
