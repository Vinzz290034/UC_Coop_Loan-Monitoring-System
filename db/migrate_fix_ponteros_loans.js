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

    // Fetch product IDs
    const productsRes = await client.query(`SELECT id, name FROM loan_products`);
    const prodMap = {};
    for (const p of productsRes.rows) {
      const lower = p.name.toLowerCase();
      if (lower.includes('salary')) prodMap.salary = p.id;
      else if (lower.includes('cash express')) prodMap.cash_express = p.id;
      else if (lower.includes('emergency')) prodMap.emergency = p.id;
      else if (lower.includes('special occasion')) prodMap.special_occasion = p.id;
    }

    // -------------------------------------------------------------
    // 1. LAF #26-185 (Regular - Salary Loan: ₱20,000.00, 12 mos, Disbursed 2026-04-22)
    // 7 installments paid (May-Nov 2026 = ₱13,766.69), 5 unpaid (Dec 2026 - Apr 2027 = ₱8,833.31) -> ACTIVE
    // -------------------------------------------------------------
    const loan185Res = await client.query(`SELECT id FROM loans WHERE member_id = $1 AND laf_no = '26-185'`, [memberId]);
    if (loan185Res.rows.length > 0) {
      const loan185Id = loan185Res.rows[0].id;
      await client.query(
        `UPDATE loans 
         SET status = 'disbursed', term_months = 12, payment_mode = 'SD15', maturity_date = '2027-04-22', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loan185Id]
      );
      await client.query(`
        DELETE FROM loan_payment_allocations 
        WHERE repayment_schedule_id IN (SELECT id FROM repayment_schedules WHERE loan_id = $1)
           OR loan_payment_id IN (SELECT id FROM loan_payments WHERE loan_id = $1)
      `, [loan185Id]);
      await client.query(`DELETE FROM loan_payments WHERE loan_id = $1`, [loan185Id]);
      await client.query(`DELETE FROM repayment_schedules WHERE loan_id = $1`, [loan185Id]);

      const scheds185 = [
        { num: 1, date: '2026-05-22', pDue: 1666.67, iDue: 400.00, tDue: 2066.67, pPaid: 1666.67, iPaid: 400.00, status: 'paid', datePaid: '2026-05-15' },
        { num: 2, date: '2026-06-22', pDue: 1666.67, iDue: 366.67, tDue: 2033.34, pPaid: 1666.67, iPaid: 366.67, status: 'paid', datePaid: '2026-06-15' },
        { num: 3, date: '2026-07-22', pDue: 1666.67, iDue: 333.33, tDue: 2000.00, pPaid: 1666.67, iPaid: 333.33, status: 'paid', datePaid: '2026-07-15' },
        { num: 4, date: '2026-08-22', pDue: 1666.67, iDue: 300.00, tDue: 1966.67, pPaid: 1666.67, iPaid: 300.00, status: 'paid', datePaid: '2026-08-15' },
        { num: 5, date: '2026-09-22', pDue: 1666.67, iDue: 266.67, tDue: 1933.34, pPaid: 1666.67, iPaid: 266.67, status: 'paid', datePaid: '2026-09-15' },
        { num: 6, date: '2026-10-22', pDue: 1666.67, iDue: 233.33, tDue: 1900.00, pPaid: 1666.67, iPaid: 233.33, status: 'paid', datePaid: '2026-10-15' },
        { num: 7, date: '2026-11-22', pDue: 1666.67, iDue: 200.00, tDue: 1866.67, pPaid: 1666.67, iPaid: 200.00, status: 'paid', datePaid: '2026-11-15' },
        { num: 8, date: '2026-12-22', pDue: 1666.67, iDue: 166.67, tDue: 1833.34, pPaid: 0.00, iPaid: 0.00, status: 'unpaid', datePaid: null },
        { num: 9, date: '2027-01-22', pDue: 1666.67, iDue: 133.33, tDue: 1800.00, pPaid: 0.00, iPaid: 0.00, status: 'unpaid', datePaid: null },
        { num: 10, date: '2027-02-22', pDue: 1666.67, iDue: 100.00, tDue: 1766.67, pPaid: 0.00, iPaid: 0.00, status: 'unpaid', datePaid: null },
        { num: 11, date: '2027-03-22', pDue: 1666.67, iDue: 66.67, tDue: 1733.34, pPaid: 0.00, iPaid: 0.00, status: 'unpaid', datePaid: null },
        { num: 12, date: '2027-04-22', pDue: 1666.63, iDue: 33.33, tDue: 1699.96, pPaid: 0.00, iPaid: 0.00, status: 'unpaid', datePaid: null },
      ];

      for (const s of scheds185) {
        const schedRes = await client.query(`
          INSERT INTO repayment_schedules (loan_id, installment_number, due_date, principal_due, interest_due, total_due, fines_due, principal_paid, interest_paid, status)
          VALUES ($1, $2, $3, $4, $5, $6, 0.00, $7, $8, $9)
          RETURNING id
        `, [loan185Id, s.num, s.date, s.pDue, s.iDue, s.tDue, s.pPaid, s.iPaid, s.status]);

        if (s.status === 'paid' && s.datePaid) {
          const payRes = await client.query(`
            INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_no)
            VALUES ($1, $2, $3, 'SD', 'SD')
            RETURNING id
          `, [loan185Id, s.tDue, s.datePaid]);

          await client.query(`
            INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated)
            VALUES ($1, $2, $3, $4)
          `, [payRes.rows[0].id, schedRes.rows[0].id, s.pPaid, s.iPaid]);
        }
      }
    }

    // -------------------------------------------------------------
    // 2. LAF #26-393 (Cash Express: ₱7,000.00, 2 mos, Disbursed 2026-09-01) -> ACTIVE (Bal ₱3,570.00)
    // -------------------------------------------------------------
    const loan393Res = await client.query(`SELECT id FROM loans WHERE member_id = $1 AND laf_no = '26-393'`, [memberId]);
    let loan393Id;
    if (loan393Res.rows.length === 0) {
      const ins393 = await client.query(`
        INSERT INTO loans (member_id, loan_product_id, principal_amount, interest_rate, term_months, amortization_type, status, laf_no, payment_mode, disbursed_at, maturity_date)
        VALUES ($1, $2, 7000.00, 0.02, 2, 'flat_rate', 'disbursed', '26-393', 'HAND-IN', '2026-09-01', '2026-11-01')
        RETURNING id
      `, [memberId, prodMap.cash_express]);
      loan393Id = ins393.rows[0].id;
    } else {
      loan393Id = loan393Res.rows[0].id;
      await client.query(`UPDATE loans SET status = 'disbursed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [loan393Id]);
    }
    await client.query(`
      DELETE FROM loan_payment_allocations 
      WHERE repayment_schedule_id IN (SELECT id FROM repayment_schedules WHERE loan_id = $1)
         OR loan_payment_id IN (SELECT id FROM loan_payments WHERE loan_id = $1)
    `, [loan393Id]);
    await client.query(`DELETE FROM loan_payments WHERE loan_id = $1`, [loan393Id]);
    await client.query(`DELETE FROM repayment_schedules WHERE loan_id = $1`, [loan393Id]);

    const sched393_1 = await client.query(`
      INSERT INTO repayment_schedules (loan_id, installment_number, due_date, principal_due, interest_due, total_due, fines_due, principal_paid, interest_paid, status)
      VALUES ($1, 1, '2026-10-01', 3500.00, 140.00, 3640.00, 0.00, 3500.00, 140.00, 'paid')
      RETURNING id
    `, [loan393Id]);

    const pay393 = await client.query(`
      INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_no)
      VALUES ($1, 3640.00, '2026-09-30', 'HAND-IN', '2503')
      RETURNING id
    `, [loan393Id]);

    await client.query(`
      INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated)
      VALUES ($1, $2, 3500.00, 140.00)
    `, [pay393.rows[0].id, sched393_1.rows[0].id]);

    await client.query(`
      INSERT INTO repayment_schedules (loan_id, installment_number, due_date, principal_due, interest_due, total_due, fines_due, principal_paid, interest_paid, status)
      VALUES ($1, 2, '2026-11-01', 3500.00, 70.00, 3570.00, 0.00, 0.00, 0.00, 'unpaid')
    `, [loan393Id]);

    // -------------------------------------------------------------
    // 3. LAF #26-442 (Emergency Loan: ₱5,000.00, 1 mos, Disbursed 2026-09-29) -> FULLY PAID
    // -------------------------------------------------------------
    const loan442Res = await client.query(`SELECT id FROM loans WHERE member_id = $1 AND laf_no = '26-442'`, [memberId]);
    let loan442Id;
    if (loan442Res.rows.length === 0) {
      const ins442 = await client.query(`
        INSERT INTO loans (member_id, loan_product_id, principal_amount, interest_rate, term_months, amortization_type, status, laf_no, payment_mode, disbursed_at, maturity_date)
        VALUES ($1, $2, 5000.00, 0.02, 1, 'flat_rate', 'fully_paid', '26-442', 'HAND-IN', '2026-09-29', '2026-10-29')
        RETURNING id
      `, [memberId, prodMap.emergency]);
      loan442Id = ins442.rows[0].id;
    } else {
      loan442Id = loan442Res.rows[0].id;
      await client.query(`UPDATE loans SET status = 'fully_paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [loan442Id]);
    }
    await client.query(`
      DELETE FROM loan_payment_allocations 
      WHERE repayment_schedule_id IN (SELECT id FROM repayment_schedules WHERE loan_id = $1)
         OR loan_payment_id IN (SELECT id FROM loan_payments WHERE loan_id = $1)
    `, [loan442Id]);
    await client.query(`DELETE FROM loan_payments WHERE loan_id = $1`, [loan442Id]);
    await client.query(`DELETE FROM repayment_schedules WHERE loan_id = $1`, [loan442Id]);

    const sched442_1 = await client.query(`
      INSERT INTO repayment_schedules (loan_id, installment_number, due_date, principal_due, interest_due, total_due, fines_due, principal_paid, interest_paid, status)
      VALUES ($1, 1, '2026-10-29', 5000.00, 100.00, 5100.00, 0.00, 5000.00, 100.00, 'paid')
      RETURNING id
    `, [loan442Id]);

    const pay442 = await client.query(`
      INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_no)
      VALUES ($1, 5100.00, '2026-10-30', 'HAND-IN', '2608')
      RETURNING id
    `, [loan442Id]);

    await client.query(`
      INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated)
      VALUES ($1, $2, 5000.00, 100.00)
    `, [pay442.rows[0].id, sched442_1.rows[0].id]);

    // -------------------------------------------------------------
    // 4. LAF #26-498 (Special Occasion: ₱10,000.00, 3 mos, Disbursed 2026-10-30) -> ACTIVE (Bal ₱10,401.00)
    // -------------------------------------------------------------
    const loan498Res = await client.query(`SELECT id FROM loans WHERE member_id = $1 AND laf_no = '26-498'`, [memberId]);
    let loan498Id;
    if (loan498Res.rows.length === 0) {
      const ins498 = await client.query(`
        INSERT INTO loans (member_id, loan_product_id, principal_amount, interest_rate, term_months, amortization_type, status, laf_no, payment_mode, disbursed_at, maturity_date)
        VALUES ($1, $2, 10000.00, 0.02, 3, 'flat_rate', 'disbursed', '26-498', 'HAND-IN', '2026-10-30', '2027-01-30')
        RETURNING id
      `, [memberId, prodMap.special_occasion]);
      loan498Id = ins498.rows[0].id;
    } else {
      loan498Id = loan498Res.rows[0].id;
      await client.query(`UPDATE loans SET status = 'disbursed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [loan498Id]);
    }
    await client.query(`
      DELETE FROM loan_payment_allocations 
      WHERE repayment_schedule_id IN (SELECT id FROM repayment_schedules WHERE loan_id = $1)
         OR loan_payment_id IN (SELECT id FROM loan_payments WHERE loan_id = $1)
    `, [loan498Id]);
    await client.query(`DELETE FROM loan_payments WHERE loan_id = $1`, [loan498Id]);
    await client.query(`DELETE FROM repayment_schedules WHERE loan_id = $1`, [loan498Id]);

    await client.query(`
      INSERT INTO repayment_schedules (loan_id, installment_number, due_date, principal_due, interest_due, total_due, fines_due, principal_paid, interest_paid, status)
      VALUES 
        ($1, 1, '2026-11-30', 3334.00, 200.00, 3534.00, 0.00, 0.00, 0.00, 'unpaid'),
        ($1, 2, '2026-12-30', 3334.00, 133.00, 3467.00, 0.00, 0.00, 0.00, 'unpaid'),
        ($1, 3, '2027-01-30', 3334.00, 66.00, 3400.00, 0.00, 0.00, 0.00, 'unpaid')
    `, [loan498Id]);

    // -------------------------------------------------------------
    // 5. Ensure Historical Fully Paid Loans remain accurately fully paid
    // -------------------------------------------------------------
    const historicalLafs = ['25-153', '25-228', '25-358', '25-462', '25-547', '26-121', '26-292', '26-365'];
    for (const hLaf of historicalLafs) {
      const hLoanRes = await client.query(`SELECT id FROM loans WHERE member_id = $1 AND laf_no = $2`, [memberId, hLaf]);
      if (hLoanRes.rows.length > 0) {
        const hId = hLoanRes.rows[0].id;
        await client.query(`UPDATE loans SET status = 'fully_paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [hId]);
        await client.query(
          `UPDATE repayment_schedules 
           SET principal_paid = principal_due, interest_paid = interest_due, status = 'paid', updated_at = CURRENT_TIMESTAMP
           WHERE loan_id = $1`,
          [hId]
        );
      }
    }

    await client.query('COMMIT');
    console.log('[Migration] Gwen Jade Ponteros loan portfolio synchronized accurately (3 active loans, 9 fully paid).');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Failed to synchronize Ponteros loans:', error);
    throw error;
  } finally {
    client.release();
  }
}
