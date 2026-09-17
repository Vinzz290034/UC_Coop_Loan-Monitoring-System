import pool from '../config/db.js';

export async function migrateFixVillarinLoans() {
  console.log('[Migration] Checking and synchronizing Rolan Villarin loan records...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Find Member Rolan Villarin
    const memberRes = await client.query(
      `SELECT id FROM members WHERE (last_name ILIKE '%VILLARIN%' AND first_name ILIKE '%ROLAN%') OR member_no = '2024-213' LIMIT 1`
    );

    if (memberRes.rows.length === 0) {
      console.log('[Migration] Member Rolan Villarin not found. Skipping.');
      await client.query('COMMIT');
      return;
    }

    const memberId = memberRes.rows[0].id;

    // -------------------------------------------------------------
    // 2. FIX LAF 952 (Amount: ₱96,000.00, Status: fully_paid)
    // -------------------------------------------------------------
    const loan952Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '952' LIMIT 1`,
      [memberId]
    );

    if (loan952Res.rows.length > 0) {
      const loan952Id = loan952Res.rows[0].id;

      // Update loan status to fully_paid
      await client.query(
        `UPDATE loans 
         SET status = 'fully_paid', term_months = 12, payment_mode = 'SD2', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loan952Id]
      );

      // Delete excess schedules > 14
      await client.query(
        `DELETE FROM repayment_schedules WHERE loan_id = $1 AND installment_number > 14`,
        [loan952Id]
      );

      // Clean existing payments & allocations for loan 952 to prevent duplicates
      await client.query(`DELETE FROM loan_payments WHERE loan_id = $1`, [loan952Id]);

      // Schedule & Payment definitions from the verified spreadsheet ledger
      const payments952 = [
        { inst: 1,  due: '2024-10-30', paidDate: '2024-11-15', dueAmt: 8000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 2,  due: '2024-11-30', paidDate: '2024-11-30', dueAmt: 8000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 3,  due: '2024-12-30', paidDate: '2024-12-15', dueAmt: 8000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 4,  due: '2025-01-30', paidDate: '2024-12-31', dueAmt: 8000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 5,  due: '2025-02-28', paidDate: '2025-01-15', dueAmt: 8000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 6,  due: '2025-03-30', paidDate: '2025-01-31', dueAmt: 8000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 7,  due: '2025-04-30', paidDate: '2025-02-15', dueAmt: 8000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 8,  due: '2025-05-30', paidDate: '2025-02-28', dueAmt: 8000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 9,  due: '2025-06-30', paidDate: '2025-03-15', dueAmt: 8000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 10, due: '2025-07-30', paidDate: '2025-03-31', dueAmt: 8000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 11, due: '2025-08-30', paidDate: '2025-04-15', dueAmt: 8000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 12, due: '2025-09-30', paidDate: '2025-04-30', dueAmt: 8000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 13, due: '2025-10-30', paidDate: '2025-05-15', dueAmt: 4000, paidAmt: 4000, pPaid: 4000, iPaid: 0, ref: 'SD' },
        { inst: 14, due: '2025-05-23', paidDate: '2025-05-23', dueAmt: 44000, paidAmt: 44000, pPaid: 44000, iPaid: 0, ref: 'PAID THRU 25-201' },
      ];

      for (const p of payments952) {
        // Upsert schedule
        const schedRes = await client.query(
          `SELECT id FROM repayment_schedules WHERE loan_id = $1 AND installment_number = $2`,
          [loan952Id, p.inst]
        );

        let schedId;
        if (schedRes.rows.length > 0) {
          schedId = schedRes.rows[0].id;
          await client.query(
            `UPDATE repayment_schedules
             SET due_date = $1, principal_due = $2, interest_due = 0, total_due = $2,
                 principal_paid = $3, interest_paid = 0, status = 'paid', fines_due = 0, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [p.due, p.pPaid, p.pPaid, schedId]
          );
        } else {
          const insertSched = await client.query(
            `INSERT INTO repayment_schedules (loan_id, installment_number, due_date, principal_due, interest_due, total_due, fines_due, principal_paid, interest_paid, status)
             VALUES ($1, $2, $3, $4, 0, $4, 0, $5, 0, 'paid') RETURNING id`,
            [loan952Id, p.inst, p.due, p.pPaid, p.pPaid]
          );
          schedId = insertSched.rows[0].id;
        }

        // Insert payment
        const payRes = await client.query(
          `INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_no)
           VALUES ($1, $2, $3, 'salary_deduction', $4) RETURNING id`,
          [loan952Id, p.paidAmt, p.paidDate, p.ref]
        );
        const payId = payRes.rows[0].id;

        // Insert allocation
        await client.query(
          `INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated)
           VALUES ($1, $2, $3, 0)`,
          [payId, schedId, p.pPaid]
        );
      }
      console.log(`[Migration] Successfully synchronized LAF 952 (14 paid installments, status: fully_paid).`);
    }

    // -------------------------------------------------------------
    // 3. FIX LAF 25-07 (Amount: ₱6,000.00, Status: fully_paid)
    // -------------------------------------------------------------
    const loan2507Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '25-07' LIMIT 1`,
      [memberId]
    );

    if (loan2507Res.rows.length > 0) {
      const loan2507Id = loan2507Res.rows[0].id;

      await client.query(
        `UPDATE loans 
         SET status = 'fully_paid', term_months = 3, payment_mode = 'SD30', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loan2507Id]
      );

      // Delete excess schedules > 3
      await client.query(
        `DELETE FROM repayment_schedules WHERE loan_id = $1 AND installment_number > 3`,
        [loan2507Id]
      );

      await client.query(`DELETE FROM loan_payments WHERE loan_id = $1`, [loan2507Id]);

      const payments2507 = [
        { inst: 1, due: '2025-02-06', paidDate: '2025-01-31', pDue: 2000, iDue: 120, tDue: 2120, paidAmt: 2120 },
        { inst: 2, due: '2025-03-06', paidDate: '2025-02-28', pDue: 2000, iDue: 80,  tDue: 2080, paidAmt: 2080 },
        { inst: 3, due: '2025-04-06', paidDate: '2025-03-31', pDue: 2000, iDue: 40,  tDue: 2040, paidAmt: 2040 }
      ];

      for (const p of payments2507) {
        const schedRes = await client.query(
          `SELECT id FROM repayment_schedules WHERE loan_id = $1 AND installment_number = $2`,
          [loan2507Id, p.inst]
        );

        let schedId;
        if (schedRes.rows.length > 0) {
          schedId = schedRes.rows[0].id;
          await client.query(
            `UPDATE repayment_schedules
             SET due_date = $1, principal_due = $2, interest_due = $3, total_due = $4,
                 principal_paid = $2, interest_paid = $3, status = 'paid', fines_due = 0, updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [p.due, p.pDue, p.iDue, p.tDue, schedId]
          );
        } else {
          const insertSched = await client.query(
            `INSERT INTO repayment_schedules (loan_id, installment_number, due_date, principal_due, interest_due, total_due, fines_due, principal_paid, interest_paid, status)
             VALUES ($1, $2, $3, $4, $5, $6, 0, $4, $5, 'paid') RETURNING id`,
            [loan2507Id, p.inst, p.due, p.pDue, p.iDue, p.tDue]
          );
          schedId = insertSched.rows[0].id;
        }

        const payRes = await client.query(
          `INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_no)
           VALUES ($1, $2, $3, 'salary_deduction', 'SD') RETURNING id`,
          [loan2507Id, p.paidAmt, p.paidDate]
        );
        const payId = payRes.rows[0].id;

        await client.query(
          `INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated)
           VALUES ($1, $2, $3, $4)`,
          [payId, schedId, p.pDue, p.iDue]
        );
      }
      console.log(`[Migration] Successfully synchronized LAF 25-07 (3 paid installments, status: fully_paid).`);
    }

    // -------------------------------------------------------------
    // 4. FIX LAF 25-201 (Amount: ₱75,000.00, Status: disbursed, Remaining Principal: ₱50,000.00)
    // -------------------------------------------------------------
    const loan25201Res = await client.query(
      `SELECT id FROM loans WHERE member_id = $1 AND laf_no = '25-201' LIMIT 1`,
      [memberId]
    );

    if (loan25201Res.rows.length > 0) {
      const loan25201Id = loan25201Res.rows[0].id;

      await client.query(
        `UPDATE loans 
         SET status = 'disbursed', term_months = 12, payment_mode = 'SD15', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [loan25201Id]
      );

      // Clean existing payments to avoid duplicate records
      await client.query(`DELETE FROM loan_payments WHERE loan_id = $1`, [loan25201Id]);

      // Reset all schedules for loan 25-201
      await client.query(
        `UPDATE repayment_schedules 
         SET principal_paid = 0, interest_paid = 0, status = 'unpaid' 
         WHERE loan_id = $1`,
        [loan25201Id]
      );

      // Actual payments from spreadsheet:
      const payments25201 = [
        { inst: 1, due: '2025-06-23', paidDate: '2025-09-15', amount: 5275, pAlloc: 5275, iAlloc: 0, status: 'partially_paid' },
        { inst: 1, due: '2025-06-23', paidDate: '2025-09-30', amount: 2475, pAlloc: 975,  iAlloc: 1500, status: 'paid' },
        { inst: 2, due: '2025-07-23', paidDate: '2025-09-30', amount: 1796.25, pAlloc: 1796.25, iAlloc: 0, status: 'partially_paid' },
        { inst: 2, due: '2025-07-23', paidDate: '2025-10-15', amount: 5828.75, pAlloc: 5828.75, iAlloc: 0, status: 'paid' },
        { inst: 3, due: '2025-08-23', paidDate: '2025-10-31', amount: 4500, pAlloc: 4500, iAlloc: 0, status: 'partially_paid' },
        { inst: 3, due: '2025-08-23', paidDate: '2025-11-15', amount: 3000, pAlloc: 3000, iAlloc: 0, status: 'paid' },
        { inst: 4, due: '2025-09-23', paidDate: '2025-11-15', amount: 4250, pAlloc: 4250, iAlloc: 0, status: 'partially_paid' },
        { inst: 4, due: '2025-09-23', paidDate: '2025-11-30', amount: 3125, pAlloc: 3125, iAlloc: 0, status: 'paid' },
        { inst: 5, due: '2025-10-23', paidDate: '2025-11-30', amount: 375,  pAlloc: 375,  iAlloc: 0, status: 'partially_paid' }
      ];

      for (const p of payments25201) {
        const schedRes = await client.query(
          `SELECT id, principal_paid, interest_paid, total_due FROM repayment_schedules WHERE loan_id = $1 AND installment_number = $2`,
          [loan25201Id, p.inst]
        );

        if (schedRes.rows.length > 0) {
          const s = schedRes.rows[0];
          const newPPaid = parseFloat(s.principal_paid || 0) + p.pAlloc;
          const newIPaid = parseFloat(s.interest_paid || 0) + p.iAlloc;
          const schedStatus = (newPPaid + newIPaid >= parseFloat(s.total_due)) ? 'paid' : 'partially_paid';

          await client.query(
            `UPDATE repayment_schedules 
             SET principal_paid = $1, interest_paid = $2, status = $3, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4`,
            [newPPaid, newIPaid, schedStatus, s.id]
          );

          const payRes = await client.query(
            `INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_no)
             VALUES ($1, $2, $3, 'salary_deduction', 'SD') RETURNING id`,
            [loan25201Id, p.amount, p.paidDate]
          );
          const payId = payRes.rows[0].id;

          await client.query(
            `INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated)
             VALUES ($1, $2, $3, $4)`,
            [payId, s.id, p.pAlloc, p.iAlloc]
          );
        }
      }
      console.log(`[Migration] Successfully synchronized LAF 25-201 (₱30,625 paid, ₱50,000 remaining principal).`);
    }

    await client.query('COMMIT');
    console.log('[Migration] All Rolan Villarin loan records synchronized successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Failed to synchronize Rolan Villarin loans:', error);
    throw error;
  } finally {
    client.release();
  }
}
