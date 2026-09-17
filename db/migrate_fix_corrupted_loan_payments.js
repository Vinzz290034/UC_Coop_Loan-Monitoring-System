import pool from '../config/db.js';

export async function migrateFixCorruptedLoanPayments() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fix legacy corrupted records where OR/check number pairs were imported as the payment amount
    await client.query(`
      UPDATE loan_payments
      SET amount = 8340.00, reference_no = 'OR 2723 / 2751'
      WHERE id = '334cdd7c-f664-496e-8990-c81b0d05295d' AND amount > 1000000;

      UPDATE loan_payments
      SET amount = 8340.00, reference_no = 'OR 2775 / 2791'
      WHERE id = '163a90ad-f37e-4fd6-af7d-c4fd250c989e' AND amount > 1000000;

      UPDATE loan_payments
      SET amount = 8340.00, reference_no = 'OR 2817 / 2833'
      WHERE id = '47ad921e-520a-4783-81db-db56ed11344d' AND amount > 1000000;

      UPDATE loan_payments
      SET amount = 8340.00, reference_no = 'OR 2860 / 2897'
      WHERE id = '9f887198-4201-4a35-b631-092c70ab113c' AND amount > 1000000;

      UPDATE loan_payments
      SET amount = 8340.00, reference_no = 'OR 2938 / 2975'
      WHERE id = '0938cf4a-f27c-44b5-b502-8f3f306b1655' AND amount > 1000000;

      UPDATE loan_payments
      SET amount = 8340.00, reference_no = 'OR 94 / 116'
      WHERE id = '70c58ce1-0218-4c1a-b998-9239ad4beb82' AND amount > 50000;

      -- Fix anomalous schedule due dates caused by Excel serial date conversion
      UPDATE repayment_schedules rs
      SET due_date = (l.disbursed_at + (rs.installment_number * INTERVAL '1 month'))::date
      FROM loans l
      WHERE rs.loan_id = l.id
        AND l.disbursed_at IS NOT NULL
        AND (EXTRACT(YEAR FROM rs.due_date) < 2020 OR EXTRACT(YEAR FROM rs.due_date) > 2028);

      -- Align payment dates to their matched schedule due date or disbursement date
      UPDATE loan_payments lp
      SET payment_date = sub.new_date
      FROM (
        SELECT 
          lp_inner.id,
          COALESCE(rs.due_date, l.disbursed_at, lp_inner.created_at) as new_date
        FROM loan_payments lp_inner
        JOIN loans l ON lp_inner.loan_id = l.id
        LEFT JOIN loan_payment_allocations lpa ON lp_inner.id = lpa.loan_payment_id
        LEFT JOIN repayment_schedules rs ON lpa.repayment_schedule_id = rs.id
        WHERE EXTRACT(YEAR FROM lp_inner.payment_date) < 2020 OR EXTRACT(YEAR FROM lp_inner.payment_date) > 2028
      ) sub
      WHERE lp.id = sub.id;
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Failed to sanitize corrupted loan payment amounts:', error);
  } finally {
    client.release();
  }
}
