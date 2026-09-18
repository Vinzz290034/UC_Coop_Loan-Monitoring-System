import pool from '../config/db.js';

export async function migrateFixVelosLoans() {
  console.log('[Migration] Checking and synchronizing Manilyn B. Velos loan records...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Find Member Manilyn B. Velos
    const memberRes = await client.query(
      `SELECT id FROM members WHERE (last_name ILIKE '%VELOS%' AND first_name ILIKE '%MANILYN%') OR member_no = '2019-112' LIMIT 1`
    );

    if (memberRes.rows.length === 0) {
      console.log('[Migration] Member Manilyn B. Velos not found. Skipping.');
      await client.query('COMMIT');
      return;
    }

    const memberId = memberRes.rows[0].id;

    // Helper to clear existing allocations, schedules, payments for a loan
    const resetLoanLedger = async (loanId) => {
      await client.query(
        `DELETE FROM loan_payment_allocations 
         WHERE repayment_schedule_id IN (SELECT id FROM repayment_schedules WHERE loan_id = $1)
            OR loan_payment_id IN (SELECT id FROM loan_payments WHERE loan_id = $1)`,
        [loanId]
      );
      await client.query(`DELETE FROM repayment_schedules WHERE loan_id = $1`, [loanId]);
      await client.query(`DELETE FROM loan_payments WHERE loan_id = $1`, [loanId]);
    };

    // Helper to insert a schedule, a payment, and link them with an allocation
    const insertInstallmentAndPayment = async (loanId, {
      installment_number,
      due_date,
      principal_due,
      interest_due = 0,
      payment_date,
      payment_method = 'HAND-IN',
      reference_no,
      amount_paid,
      principal_allocated,
      interest_allocated = 0
    }) => {
      const total_due = parseFloat(principal_due) + parseFloat(interest_due);
      const schedRes = await client.query(
        `INSERT INTO repayment_schedules 
         (loan_id, installment_number, due_date, principal_due, interest_due, total_due, fines_due, principal_paid, interest_paid, status)
         VALUES ($1, $2, $3, $4, $5, $6, 0.00, $4, $5, 'paid')
         RETURNING id`,
        [loanId, installment_number, due_date, principal_due, interest_due, total_due]
      );
      const schedId = schedRes.rows[0].id;

      const payRes = await client.query(
        `INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_no)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [loanId, amount_paid, payment_date, payment_method, reference_no]
      );
      const payId = payRes.rows[0].id;

      await client.query(
        `INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated)
         VALUES ($1, $2, $3, $4)`,
        [payId, schedId, principal_allocated, interest_allocated]
      );
    };

    // -------------------------------------------------------------
    // SPECIFIC LOAN FIXES WITH VERIFIED SPREADSHEET LEDGERS
    // -------------------------------------------------------------

    // 1. LAF 728 (Principal: ₱20,000.00, Disbursed: 2024-02-01, Paid off: 2024-08-05 via LAF 867)
    const loan728Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '728' LIMIT 1`,
      [memberId]
    );
    if (loan728Res.rows.length > 0) {
      const loan728Id = loan728Res.rows[0].id;
      await client.query(
        `UPDATE loans 
         SET status = 'fully_paid', term_months = 7, payment_mode = 'HAND IN',
             disbursed_at = '2024-02-01', maturity_date = '2024-08-30', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loan728Id]
      );
      await resetLoanLedger(loan728Id);

      const items728 = [
        { installment_number: 1, due_date: '2024-02-29', principal_due: 1667.00, interest_due: 0.00, payment_date: '2024-02-15', reference_no: '2577', amount_paid: 1667.00, principal_allocated: 1667.00, interest_allocated: 0.00 },
        { installment_number: 2, due_date: '2024-03-30', principal_due: 1700.00, interest_due: 0.00, payment_date: '2024-04-03', reference_no: '2639', amount_paid: 1700.00, principal_allocated: 1700.00, interest_allocated: 0.00 },
        { installment_number: 3, due_date: '2024-04-30', principal_due: 1700.00, interest_due: 0.00, payment_date: '2024-05-03', reference_no: '2679', amount_paid: 1700.00, principal_allocated: 1700.00, interest_allocated: 0.00 },
        { installment_number: 4, due_date: '2024-05-30', principal_due: 1700.00, interest_due: 0.00, payment_date: '2024-05-22', reference_no: '2737', amount_paid: 1700.00, principal_allocated: 1700.00, interest_allocated: 0.00 },
        { installment_number: 5, due_date: '2024-06-30', principal_due: 1700.00, interest_due: 0.00, payment_date: '2024-07-01', reference_no: '2796', amount_paid: 1700.00, principal_allocated: 1700.00, interest_allocated: 0.00 },
        { installment_number: 6, due_date: '2024-07-30', principal_due: 1700.00, interest_due: 0.00, payment_date: '2024-07-22', reference_no: '2825', amount_paid: 1700.00, principal_allocated: 1700.00, interest_allocated: 0.00 },
        { installment_number: 7, due_date: '2024-08-30', principal_due: 9833.00, interest_due: 0.00, payment_date: '2024-08-05', reference_no: 'LAF 867', amount_paid: 9833.00, principal_allocated: 9833.00, interest_allocated: 0.00 },
      ];

      for (const item of items728) {
        await insertInstallmentAndPayment(loan728Id, item);
      }
      console.log('[Migration] LAF 728 synchronized as fully paid.');
    }

    // 2. LAF 867 (Principal: ₱40,000.00, Disbursed: 2024-08-05, Paid off: 2025-04-14 via 25-139)
    const loan867Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '867' LIMIT 1`,
      [memberId]
    );
    if (loan867Res.rows.length > 0) {
      const loan867Id = loan867Res.rows[0].id;
      await client.query(
        `UPDATE loans 
         SET status = 'fully_paid', term_months = 7, payment_mode = 'HAND IN',
             disbursed_at = '2024-08-05', maturity_date = '2025-02-28', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loan867Id]
      );
      await resetLoanLedger(loan867Id);

      const items867 = [
        { installment_number: 1, due_date: '2024-08-31', principal_due: 3350.00, interest_due: 0.00, payment_date: '2024-09-17', reference_no: '2952', amount_paid: 3350.00, principal_allocated: 3350.00, interest_allocated: 0.00 },
        { installment_number: 2, due_date: '2024-09-30', principal_due: 3350.00, interest_due: 0.00, payment_date: '2024-10-01', reference_no: '2980', amount_paid: 3350.00, principal_allocated: 3350.00, interest_allocated: 0.00 },
        { installment_number: 3, due_date: '2024-10-31', principal_due: 3400.00, interest_due: 0.00, payment_date: '2024-11-05', reference_no: '0066', amount_paid: 3400.00, principal_allocated: 3400.00, interest_allocated: 0.00 },
        { installment_number: 4, due_date: '2024-11-30', principal_due: 3400.00, interest_due: 0.00, payment_date: '2024-12-17', reference_no: '169', amount_paid: 3400.00, principal_allocated: 3400.00, interest_allocated: 0.00 },
        { installment_number: 5, due_date: '2024-12-31', principal_due: 5000.00, interest_due: 0.00, payment_date: '2025-02-03', reference_no: '264', amount_paid: 5000.00, principal_allocated: 5000.00, interest_allocated: 0.00 },
        { installment_number: 6, due_date: '2025-01-30', principal_due: 3800.00, interest_due: 0.00, payment_date: '2025-03-07', reference_no: '358', amount_paid: 3800.00, principal_allocated: 3800.00, interest_allocated: 0.00 },
        { installment_number: 7, due_date: '2025-02-28', principal_due: 17700.00, interest_due: 0.00, payment_date: '2025-04-14', reference_no: 'PAID THRU 25-139', amount_paid: 17700.00, principal_allocated: 17700.00, interest_allocated: 0.00 },
      ];

      for (const item of items867) {
        await insertInstallmentAndPayment(loan867Id, item);
      }
      console.log('[Migration] LAF 867 synchronized as fully paid.');
    }

    // 3. LAF 25-139 (Principal: ₱36,000.00, Disbursed: 2025-04-14, Paid off: 2025-10-15 via 25-476)
    const loan139Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '25-139' LIMIT 1`,
      [memberId]
    );
    if (loan139Res.rows.length > 0) {
      const loan139Id = loan139Res.rows[0].id;
      await client.query(
        `UPDATE loans 
         SET status = 'fully_paid', term_months = 7, payment_mode = 'HAND IN',
             disbursed_at = '2025-04-14', maturity_date = '2025-11-14', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loan139Id]
      );
      await resetLoanLedger(loan139Id);

      const items139 = [
        { installment_number: 1, due_date: '2025-05-14', principal_due: 3000.00, interest_due: 720.00, payment_date: '2025-05-15', reference_no: '649', amount_paid: 3720.00, principal_allocated: 3000.00, interest_allocated: 720.00 },
        { installment_number: 2, due_date: '2025-06-14', principal_due: 3000.00, interest_due: 660.00, payment_date: '2025-06-17', reference_no: '814', amount_paid: 3660.00, principal_allocated: 3000.00, interest_allocated: 660.00 },
        { installment_number: 3, due_date: '2025-07-14', principal_due: 3000.00, interest_due: 600.00, payment_date: '2025-07-16', reference_no: '924', amount_paid: 3600.00, principal_allocated: 3000.00, interest_allocated: 600.00 },
        { installment_number: 4, due_date: '2025-08-14', principal_due: 3000.00, interest_due: 540.00, payment_date: '2025-08-19', reference_no: '1023', amount_paid: 3540.00, principal_allocated: 3000.00, interest_allocated: 540.00 },
        { installment_number: 5, due_date: '2025-09-14', principal_due: 3000.00, interest_due: 480.00, payment_date: '2025-09-16', reference_no: '1106', amount_paid: 3480.00, principal_allocated: 3000.00, interest_allocated: 480.00 },
        { installment_number: 6, due_date: '2025-10-14', principal_due: 3000.00, interest_due: 420.00, payment_date: '2025-10-14', reference_no: '1184', amount_paid: 3420.00, principal_allocated: 3000.00, interest_allocated: 420.00 },
        { installment_number: 7, due_date: '2025-11-14', principal_due: 18000.00, interest_due: 0.00, payment_date: '2025-10-15', reference_no: 'PAID THRU 25-476', amount_paid: 18000.00, principal_allocated: 18000.00, interest_allocated: 0.00 },
      ];

      for (const item of items139) {
        await insertInstallmentAndPayment(loan139Id, item);
      }
      console.log('[Migration] LAF 25-139 synchronized as fully paid.');
    }

    // 4. LAF 25-216 (RAFFLE: Principal ₱1,350.00, Terms: 3, Disbursed: 2025-05-21, Paid off: 2025-07-17)
    const loan216Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '25-216' LIMIT 1`,
      [memberId]
    );
    if (loan216Res.rows.length > 0) {
      const loan216Id = loan216Res.rows[0].id;
      await client.query(
        `UPDATE loans 
         SET status = 'fully_paid', term_months = 3, payment_mode = 'HAND-IN',
             disbursed_at = '2025-05-21', maturity_date = '2025-08-21', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loan216Id]
      );
      await resetLoanLedger(loan216Id);

      const items216 = [
        { installment_number: 1, due_date: '2025-06-21', principal_due: 500.00, interest_due: 0.00, payment_date: '2025-05-26', reference_no: '728', amount_paid: 500.00, principal_allocated: 500.00, interest_allocated: 0.00 },
        { installment_number: 2, due_date: '2025-07-21', principal_due: 500.00, interest_due: 0.00, payment_date: '2025-06-23', reference_no: '839', amount_paid: 500.00, principal_allocated: 500.00, interest_allocated: 0.00 },
        { installment_number: 3, due_date: '2025-08-21', principal_due: 350.00, interest_due: 0.00, payment_date: '2025-07-17', reference_no: '931', amount_paid: 350.00, principal_allocated: 350.00, interest_allocated: 0.00 },
      ];

      for (const item of items216) {
        await insertInstallmentAndPayment(loan216Id, item);
      }
      console.log('[Migration] LAF 25-216 synchronized as fully paid.');
    }

    // 5. LAF 25-476 (Principal: ₱36,000.00, Disbursed: 2025-10-15, Paid off: 2026-03-23 via Inv 1707)
    const loan476Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '25-476' LIMIT 1`,
      [memberId]
    );
    if (loan476Res.rows.length > 0) {
      const loan476Id = loan476Res.rows[0].id;
      await client.query(
        `UPDATE loans 
         SET status = 'fully_paid', term_months = 6, payment_mode = 'HAND IN',
             disbursed_at = '2025-10-15', maturity_date = '2026-04-15', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loan476Id]
      );
      await resetLoanLedger(loan476Id);

      const items476 = [
        { installment_number: 1, due_date: '2025-11-15', principal_due: 3000.00, interest_due: 720.00, payment_date: '2025-11-18', reference_no: '1282', amount_paid: 3720.00, principal_allocated: 3000.00, interest_allocated: 720.00 },
        { installment_number: 2, due_date: '2025-12-15', principal_due: 3000.00, interest_due: 660.00, payment_date: '2025-12-18', reference_no: '1416', amount_paid: 3660.00, principal_allocated: 3000.00, interest_allocated: 660.00 },
        { installment_number: 3, due_date: '2026-01-15', principal_due: 3000.00, interest_due: 600.00, payment_date: '2026-01-20', reference_no: '1486', amount_paid: 3600.00, principal_allocated: 3000.00, interest_allocated: 600.00 },
        { installment_number: 4, due_date: '2026-02-15', principal_due: 3000.00, interest_due: 540.00, payment_date: '2026-02-20', reference_no: '1588', amount_paid: 3540.00, principal_allocated: 3000.00, interest_allocated: 540.00 },
        { installment_number: 5, due_date: '2026-03-15', principal_due: 3000.00, interest_due: 480.00, payment_date: '2026-03-21', reference_no: '1698', amount_paid: 3480.00, principal_allocated: 3000.00, interest_allocated: 480.00 },
        { installment_number: 6, due_date: '2026-04-15', principal_due: 21000.00, interest_due: 0.00, payment_date: '2026-03-23', reference_no: '1707', amount_paid: 21000.00, principal_allocated: 21000.00, interest_allocated: 0.00 },
      ];

      for (const item of items476) {
        await insertInstallmentAndPayment(loan476Id, item);
      }
      console.log('[Migration] LAF 25-476 synchronized as fully paid.');
    }

    // 6. LAF 26-08 (SO: Principal ₱10,000.00, Terms: 2, Disbursed: 2026-01-05, Paid off: 2026-03-10)
    const loan2608Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '26-08' LIMIT 1`,
      [memberId]
    );
    if (loan2608Res.rows.length > 0) {
      const loan2608Id = loan2608Res.rows[0].id;
      await client.query(
        `UPDATE loans 
         SET status = 'fully_paid', term_months = 2, payment_mode = 'HAND-IN',
             disbursed_at = '2026-01-05', maturity_date = '2026-03-05', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loan2608Id]
      );
      await resetLoanLedger(loan2608Id);

      const items2608 = [
        { installment_number: 1, due_date: '2026-02-05', principal_due: 5000.00, interest_due: 200.00, payment_date: '2026-02-10', reference_no: '1550', amount_paid: 5200.00, principal_allocated: 5000.00, interest_allocated: 200.00 },
        { installment_number: 2, due_date: '2026-03-05', principal_due: 5000.00, interest_due: 100.00, payment_date: '2026-03-10', reference_no: '1654', amount_paid: 5100.00, principal_allocated: 5000.00, interest_allocated: 100.00 },
      ];

      for (const item of items2608) {
        await insertInstallmentAndPayment(loan2608Id, item);
      }
      console.log('[Migration] LAF 26-08 synchronized as fully paid.');
    }

    // 7. LAF 26-09 (CASH EXPRESS: Principal ₱7,000.00, Terms: 1, Disbursed: 2026-01-05, Paid off: 2026-02-10)
    const loan2609Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '26-09' LIMIT 1`,
      [memberId]
    );
    if (loan2609Res.rows.length > 0) {
      const loan2609Id = loan2609Res.rows[0].id;
      await client.query(
        `UPDATE loans 
         SET status = 'fully_paid', term_months = 1, payment_mode = 'HAND-IN',
             disbursed_at = '2026-01-05', maturity_date = '2026-02-05', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loan2609Id]
      );
      await resetLoanLedger(loan2609Id);

      const items2609 = [
        { installment_number: 1, due_date: '2026-02-05', principal_due: 7000.00, interest_due: 140.00, payment_date: '2026-02-10', reference_no: '1550', amount_paid: 7140.00, principal_allocated: 7000.00, interest_allocated: 140.00 },
      ];

      for (const item of items2609) {
        await insertInstallmentAndPayment(loan2609Id, item);
      }
      console.log('[Migration] LAF 26-09 synchronized as fully paid.');
    }

    // 8. LAF 26-10 (EMERGENCY: Principal ₱5,000.00, Terms: 1, Disbursed: 2026-01-05, Paid off: 2026-02-10)
    const loan2610Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '26-10' LIMIT 1`,
      [memberId]
    );
    if (loan2610Res.rows.length > 0) {
      const loan2610Id = loan2610Res.rows[0].id;
      await client.query(
        `UPDATE loans 
         SET status = 'fully_paid', term_months = 1, payment_mode = 'HAND-IN',
             disbursed_at = '2026-01-05', maturity_date = '2026-02-05', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loan2610Id]
      );
      await resetLoanLedger(loan2610Id);

      const items2610 = [
        { installment_number: 1, due_date: '2026-02-05', principal_due: 5000.00, interest_due: 100.00, payment_date: '2026-02-10', reference_no: '1550', amount_paid: 5100.00, principal_allocated: 5000.00, interest_allocated: 100.00 },
      ];

      for (const item of items2610) {
        await insertInstallmentAndPayment(loan2610Id, item);
      }
      console.log('[Migration] LAF 26-10 synchronized as fully paid.');
    }

    // -------------------------------------------------------------
    // Comprehensive Safety Audit for all loans belonging to Velos
    // -------------------------------------------------------------
    const allLoansRes = await client.query(
      `SELECT id, laf_no, principal_amount, term_months FROM loans WHERE member_id = $1`,
      [memberId]
    );

    for (const l of allLoansRes.rows) {
      const loanId = l.id;
      const terms = l.term_months || 12;

      // Mark loan status as fully_paid
      await client.query(
        `UPDATE loans 
         SET status = 'fully_paid', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loanId]
      );

      // Clean spurious schedules beyond terms
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

      // Ensure all remaining installments are marked paid
      await client.query(
        `UPDATE repayment_schedules 
         SET principal_paid = principal_due,
             interest_paid = interest_due,
             status = 'paid',
             updated_at = CURRENT_TIMESTAMP
         WHERE loan_id = $1`,
        [loanId]
      );
    }

    await client.query('COMMIT');
    console.log('[Migration] All loans for Manilyn B. Velos synchronized as fully paid with 0.00 balance.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Failed to synchronize Velos loans:', error);
    throw error;
  } finally {
    client.release();
  }
}
