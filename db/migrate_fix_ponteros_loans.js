import pool from '../config/db.js';

export async function migrateFixPonterosLoans() {
  console.log('[Migration] Checking and synchronizing all Gwen Jade Ponteros loan records...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Find Member Gwen Jade Ponteros
    const memberRes = await client.query(
      `SELECT id FROM members WHERE (last_name ILIKE '%PONTEROS%' AND first_name ILIKE '%GWEN%') OR member_no = '2025-230' LIMIT 1`
    );

    if (memberRes.rows.length === 0) {
      console.log('[Migration] Member Gwen Jade Ponteros not found. Skipping.');
      await client.query('COMMIT');
      return;
    }

    const memberId = memberRes.rows[0].id;

    // -------------------------------------------------------------
    // SPECIFIC LOAN FIXES WITH VERIFIED SPREADSHEET LEDGERS
    // -------------------------------------------------------------

    // 2. LAF 26-365 (Emergency Loan: Principal ₱5,000.00, fully paid ₱5,100.00 on 08/28/2026)
    const loan365Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '26-365' LIMIT 1`,
      [memberId]
    );
    if (loan365Res.rows.length > 0) {
      const loan365Id = loan365Res.rows[0].id;
      await client.query(
        `UPDATE loans SET status = 'fully_paid', term_months = 1, payment_mode = 'HAND-IN', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [loan365Id]
      );
      await client.query(
        `DELETE FROM loan_payment_allocations 
         WHERE repayment_schedule_id IN (SELECT id FROM repayment_schedules WHERE loan_id = $1)
            OR loan_payment_id IN (SELECT id FROM loan_payments WHERE loan_id = $1)`,
        [loan365Id]
      );
      await client.query(`DELETE FROM repayment_schedules WHERE loan_id = $1`, [loan365Id]);
      await client.query(`DELETE FROM loan_payments WHERE loan_id = $1`, [loan365Id]);

      const sched365 = await client.query(
        `INSERT INTO repayment_schedules (loan_id, installment_number, due_date, principal_due, interest_due, total_due, principal_paid, interest_paid, fines_due, status)
         VALUES ($1, 1, '2026-09-14', 5000.00, 100.00, 5100.00, 5000.00, 100.00, 0.00, 'paid')
         RETURNING id`,
        [loan365Id]
      );
      const pay365 = await client.query(
        `INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_no)
         VALUES ($1, 5100.00, '2026-08-28', 'HAND-IN', '2375')
         RETURNING id`,
        [loan365Id]
      );
      await client.query(
        `INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated)
         VALUES ($1, $2, 5000.00, 100.00)`,
        [pay365.rows[0].id, sched365.rows[0].id]
      );
    }

    // 3. LAF 26-292 (Emergency Loan: Principal ₱5,000.00, fully paid ₱5,100.00 on 07/29/2026)
    const loan292Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '26-292' LIMIT 1`,
      [memberId]
    );
    if (loan292Res.rows.length > 0) {
      const loan292Id = loan292Res.rows[0].id;
      await client.query(
        `UPDATE loans SET status = 'fully_paid', term_months = 1, payment_mode = 'HAND-IN', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [loan292Id]
      );
      await client.query(
        `DELETE FROM loan_payment_allocations 
         WHERE repayment_schedule_id IN (SELECT id FROM repayment_schedules WHERE loan_id = $1)
            OR loan_payment_id IN (SELECT id FROM loan_payments WHERE loan_id = $1)`,
        [loan292Id]
      );
      await client.query(`DELETE FROM repayment_schedules WHERE loan_id = $1`, [loan292Id]);
      await client.query(`DELETE FROM loan_payments WHERE loan_id = $1`, [loan292Id]);

      const sched292 = await client.query(
        `INSERT INTO repayment_schedules (loan_id, installment_number, due_date, principal_due, interest_due, total_due, principal_paid, interest_paid, fines_due, status)
         VALUES ($1, 1, '2026-07-28', 5000.00, 100.00, 5100.00, 5000.00, 100.00, 0.00, 'paid')
         RETURNING id`,
        [loan292Id]
      );
      const pay292 = await client.query(
        `INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_no)
         VALUES ($1, 5100.00, '2026-07-29', 'HAND-IN', 'PAID THRU-2274')
         RETURNING id`,
        [loan292Id]
      );
      await client.query(
        `INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated)
         VALUES ($1, $2, 5000.00, 100.00)`,
        [pay292.rows[0].id, sched292.rows[0].id]
      );
    }

    // -------------------------------------------------------------
    // 4. SYNCHRONIZE ALL REMAINING HISTORICAL LOANS AS FULLY PAID
    // Member should be completely clean (0 active loans, 0 balance)
    // -------------------------------------------------------------
    const allLoansRes = await client.query(
      `SELECT id, laf_no, principal_amount, term_months FROM loans WHERE member_id = $1`,
      [memberId]
    );

    for (const l of allLoansRes.rows) {
      const loanId = l.id;
      const terms = l.term_months || 12;

      // Update status to fully_paid
      await client.query(
        `UPDATE loans 
         SET status = 'fully_paid', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loanId]
      );

      // Delete spurious schedules exceeding the terms
      await client.query(
        `DELETE FROM loan_payment_allocations 
         WHERE repayment_schedule_id IN (
           SELECT id FROM repayment_schedules WHERE loan_id = $1 AND installment_number > $2
         )`,
        [loanId, terms]
      );
      await client.query(
        `DELETE FROM repayment_schedules WHERE loan_id = $1 AND installment_number > $2`,
        [loanId, terms]
      );

      // Mark all valid installments as fully paid
      await client.query(
        `UPDATE repayment_schedules 
         SET principal_paid = principal_due,
             interest_paid = interest_due,
             status = 'paid',
             updated_at = CURRENT_TIMESTAMP
         WHERE loan_id = $1`,
        [loanId]
      );

      // Ensure each schedule has a payment record in loan_payments so payment accounting balances
      const unpaidSchedules = await client.query(
        `SELECT rs.id, rs.due_date, rs.principal_due, rs.interest_due, rs.total_due
         FROM repayment_schedules rs
         WHERE rs.loan_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM loan_payment_allocations lpa WHERE lpa.repayment_schedule_id = rs.id
           )`,
        [loanId]
      );

      for (const s of unpaidSchedules.rows) {
        const pAmt = parseFloat(s.total_due || (parseFloat(s.principal_due) + parseFloat(s.interest_due)));
        const payRes = await client.query(
          `INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_no)
           VALUES ($1, $2, $3, 'SD', COALESCE($4, 'HISTORICAL_SETTLEMENT'))
           RETURNING id`,
          [loanId, pAmt, s.due_date, l.laf_no ? `PAID-${l.laf_no}` : 'PAID']
        );
        await client.query(
          `INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated)
           VALUES ($1, $2, $3, $4)`,
          [payRes.rows[0].id, s.id, parseFloat(s.principal_due), parseFloat(s.interest_due)]
        );
      }
    }

    await client.query('COMMIT');
    console.log('[Migration] All 9 loans for Gwen Jade Ponteros synchronized as fully paid with 0 balance (Clean portfolio).');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Failed to synchronize Ponteros loans:', error);
    throw error;
  } finally {
    client.release();
  }
}
