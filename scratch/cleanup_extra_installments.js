import pool from '../config/db.js';

async function run() {
  try {
    console.log('Cleaning up extra installments from database...');
    
    // Get all active/disbursed loans
    const loansRes = await pool.query("SELECT id, term_months FROM loans WHERE status IN ('approved', 'disbursed')");
    
    for (const loan of loansRes.rows) {
      const res = await pool.query('SELECT id, installment_number, total_due FROM repayment_schedules WHERE loan_id = $1 ORDER BY installment_number ASC', [loan.id]);
      
      console.log(`Loan ID: ${loan.id} has ${res.rowCount} installments in DB.`);
      
      if (loan.id === '4a1bc016-4476-4ca4-8dc6-18f6d3db4935') {
        const delRes = await pool.query('DELETE FROM repayment_schedules WHERE loan_id = $1 AND installment_number > 7', [loan.id]);
        console.log(`Deleted ${delRes.rowCount} extra installments for 4a1bc016-4476-4ca4-8dc6-18f6d3db4935`);
      }
      
      if (loan.id === 'fd9f9c6f-e31a-4095-9ae7-8747bf727273') {
        const delRes = await pool.query('DELETE FROM repayment_schedules WHERE loan_id = $1 AND installment_number > 9', [loan.id]);
        console.log(`Deleted ${delRes.rowCount} extra installments for fd9f9c6f-e31a-4095-9ae7-8747bf727273`);
      }
    }
    
    console.log('Cleanup completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
