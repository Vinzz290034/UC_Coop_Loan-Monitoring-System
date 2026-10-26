import pool from '../config/db.js';

export async function migrateFixMisaLoans() {
  console.log('[Migration] Checking and synchronizing Teresita Misa loan records...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Find Member Teresita Misa
    const memberRes = await client.query(
      `SELECT id FROM members WHERE last_name ILIKE '%MISA%' AND first_name ILIKE '%TERESITA%' LIMIT 1`
    );

    if (memberRes.rows.length === 0) {
      console.log('[Migration] Member Teresita Misa not found. Skipping.');
      await client.query('COMMIT');
      return;
    }

    const memberId = memberRes.rows[0].id;

    // 2. Find LAF 26-344
    const loanRes = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '26-344' LIMIT 1`,
      [memberId]
    );

    if (loanRes.rows.length === 0) {
      console.log('[Migration] Loan 26-344 not found. Skipping.');
      await client.query('COMMIT');
      return;
    }

    const loanId = loanRes.rows[0].id;

    // Remove any extra orphan schedules (installment_number > 3)
    await client.query(
      `DELETE FROM loan_payment_allocations 
       WHERE repayment_schedule_id IN (
         SELECT id FROM repayment_schedules WHERE loan_id = $1 AND installment_number > 3
       )`,
      [loanId]
    );
    await client.query(
      `DELETE FROM repayment_schedules WHERE loan_id = $1 AND installment_number > 3`,
      [loanId]
    );

    // Remove phantom payment misparsed from balance column (133.33 on 2026-09-29, reference '13400')
    await client.query(
      `DELETE FROM loan_payment_allocations
       WHERE loan_payment_id IN (
         SELECT id FROM loan_payments WHERE loan_id = $1 AND (reference_no = '13400' OR payment_method = '13400')
       )`,
      [loanId]
    );
    await client.query(
      `DELETE FROM loan_payments
       WHERE loan_id = $1 AND (reference_no = '13400' OR payment_method = '13400')`,
      [loanId]
    );

    // Update schedules to start 1 month after release (August 29, 2026)
    // Installment 1: Due 2026-08-29 (Total Due: ₱6,866.67, Paid: ₱6,866.67 - Principal: ₱6,666.67, Interest: ₱200.00)
    await client.query(
      `UPDATE repayment_schedules
       SET due_date = '2026-08-29',
           principal_due = 6666.67,
           interest_due = 200.00,
           total_due = 6866.67,
           principal_paid = 6666.67,
           interest_paid = 200.00,
           fines_due = 0.00,
           status = 'paid',
           updated_at = CURRENT_TIMESTAMP
       WHERE loan_id = $1 AND installment_number = 1`,
      [loanId]
    );

    // Installment 2: Due 2026-09-29 (Total Due: ₱6,800.00, Paid: ₱6,800.00 - Principal: ₱6,666.67, Interest: ₱133.33)
    await client.query(
      `UPDATE repayment_schedules
       SET due_date = '2026-09-29',
           principal_due = 6666.67,
           interest_due = 133.33,
           total_due = 6800.00,
           principal_paid = 6666.67,
           interest_paid = 133.33,
           fines_due = 0.00,
           status = 'paid',
           updated_at = CURRENT_TIMESTAMP
       WHERE loan_id = $1 AND installment_number = 2`,
      [loanId]
    );

    // Installment 3: Due 2026-10-29 (Total Due: ₱6,733.33, Paid: ₱333.33 - Principal Paid: ₱266.66, Interest Paid: ₱66.67)
    await client.query(
      `UPDATE repayment_schedules
       SET due_date = '2026-10-29',
           principal_due = 6666.66,
           interest_due = 66.67,
           total_due = 6733.33,
           principal_paid = 266.66,
           interest_paid = 66.67,
           fines_due = 0.00,
           status = 'partially_paid',
           updated_at = CURRENT_TIMESTAMP
       WHERE loan_id = $1 AND installment_number = 3`,
      [loanId]
    );

    // Fix allocation for the ₱333.33 payment (Invoice 2490) to match: ₱266.66 Principal, ₱66.67 Interest
    const sched3Res = await client.query(
      `SELECT id FROM repayment_schedules WHERE loan_id = $1 AND installment_number = 3 LIMIT 1`,
      [loanId]
    );
    if (sched3Res.rows.length > 0) {
      const sched3Id = sched3Res.rows[0].id;
      const pay333Res = await client.query(
        `SELECT id FROM loan_payments WHERE loan_id = $1 AND amount = 333.33 LIMIT 1`,
        [loanId]
      );
      if (pay333Res.rows.length > 0) {
        await client.query(
          `UPDATE loan_payment_allocations
           SET principal_allocated = 266.66, interest_allocated = 66.67
           WHERE loan_payment_id = $1 AND repayment_schedule_id = $2`,
          [pay333Res.rows[0].id, sched3Id]
        );
      }
    }

    await client.query('COMMIT');
    console.log('[Migration] Teresita Misa loan 26-344 synchronized successfully (Total Paid: ₱14,000.00, Balance: ₱6,400.00).');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Failed to synchronize Teresita Misa loan:', error);
  } finally {
    client.release();
  }
}
