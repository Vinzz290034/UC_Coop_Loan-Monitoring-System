import pool from '../config/db.js';
import { calculateDiminishingBalance, calculateFlatRate } from '../services/calculationCore.js';

async function run() {
  try {
    console.log('Recalculating all active/disbursed loan schedules...');
    
    // 1. Fetch all active or disbursed loans
    const loansRes = await pool.query(`
      SELECT id, principal_amount, interest_rate, term_months, amortization_type, disbursed_at, status 
      FROM loans 
      WHERE status IN ('approved', 'disbursed')
    `);
    
    const loans = loansRes.rows;
    console.log(`Found ${loans.length} active/disbursed loans to update.`);
    
    for (const loan of loans) {
      const p = parseFloat(loan.principal_amount);
      const r = parseFloat(loan.interest_rate);
      const term = parseInt(loan.term_months, 10);
      const startDate = loan.disbursed_at || loan.created_at;
      
      console.log(`Updating Loan ID: ${loan.id} - Principal: ₱${p}, Term: ${term} months, Rate: ${r * 100}%`);
      
      // Calculate schedule using new straight-line principal logic
      let schedule = [];
      if (loan.amortization_type === 'flat_rate') {
        schedule = calculateFlatRate(p, r, term, startDate);
      } else {
        schedule = calculateDiminishingBalance(p, r, term, startDate);
      }
      
      // Update each installment in the database
      for (const inst of schedule) {
        await pool.query(`
          UPDATE repayment_schedules 
          SET principal_due = $1, interest_due = $2, total_due = $3, updated_at = CURRENT_TIMESTAMP
          WHERE loan_id = $4 AND installment_number = $5
        `, [
          inst.principal_due,
          inst.interest_due,
          inst.total_due,
          loan.id,
          inst.installment_number
        ]);
      }
      
      console.log(`Successfully updated schedule for Loan ID: ${loan.id}`);
    }
    
    console.log('All schedules successfully updated!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to update schedules:', err);
    process.exit(1);
  }
}

run();
