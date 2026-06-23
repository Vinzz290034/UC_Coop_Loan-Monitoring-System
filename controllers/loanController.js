import pool, { query } from '../config/db.js';
import { calculateFlatRate, calculateDiminishingBalance } from '../services/calculationCore.js';

// ==========================================
// 1. LOAN PRODUCT REGISTRY (ADMIN/MANAGEMENT)
// ==========================================

// @desc    Create a new loan product
// @route   POST /api/loans/products
// @access  Protected (Admin, Manager)
export const createLoanProduct = async (req, res, next) => {
  try {
    const { name, interest_rate, term_months, amortization_type, min_amount, max_amount } = req.body;

    if (!name || !interest_rate || !term_months || !amortization_type || !max_amount) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required loan product attributes.' }
      });
    }

    const checkProduct = await query('SELECT id FROM loan_products WHERE name = $1', [name]);
    if (checkProduct.rowCount > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'A loan product with this name already exists.' }
      });
    }

    const insertProduct = `
      INSERT INTO loan_products (name, interest_rate, term_months, amortization_type, min_amount, max_amount, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `;
    const result = await query(insertProduct, [
      name,
      interest_rate,
      term_months,
      amortization_type,
      min_amount || 0.00,
      max_amount
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all loan products
// @route   GET /api/loans/products
// @access  Protected
export const getLoanProducts = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM loan_products ORDER BY is_active DESC, name ASC');
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. LOAN LIFECYCLE & DISBURSEMENT
// ==========================================

// @desc    Apply for a new loan (status: pending_approval)
// @route   POST /api/loans
// @access  Protected (Admin, Manager)
export const applyForLoan = async (req, res, next) => {
  try {
    const { member_id, loan_product_id, principal_amount } = req.body;

    if (!member_id || !loan_product_id || !principal_amount) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide member_id, loan_product_id, and principal_amount.' }
      });
    }

    // Verify member exists and is active
    const member = await query('SELECT status FROM members WHERE id = $1', [member_id]);
    if (member.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found.' }
      });
    }
    if (member.rows[0].status !== 'active') {
      return res.status(400).json({
        success: false,
        error: { message: `Cannot approve loans for members who are currently ${member.rows[0].status}.` }
      });
    }

    // Verify loan product terms
    const product = await query('SELECT * FROM loan_products WHERE id = $1 AND is_active = true', [loan_product_id]);
    if (product.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Active loan product not found.' }
      });
    }

    const p = product.rows[0];
    const amount = parseFloat(principal_amount);

    if (amount < parseFloat(p.min_amount) || amount > parseFloat(p.max_amount)) {
      return res.status(400).json({
        success: false,
        error: { 
          message: `Requested loan amount must be between ₱${parseFloat(p.min_amount).toLocaleString()} and ₱${parseFloat(p.max_amount).toLocaleString()} for product "${p.name}".`
        }
      });
    }

    const insertLoan = `
      INSERT INTO loans (member_id, loan_product_id, principal_amount, interest_rate, term_months, amortization_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending_approval')
      RETURNING *
    `;
    const result = await query(insertLoan, [
      member_id,
      loan_product_id,
      amount,
      p.interest_rate,
      p.term_months,
      p.amortization_type
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disburse loan and automatically generate amortization schedules
// @route   POST /api/loans/:id/disburse
// @access  Protected (Admin, Manager)
export const disburseLoan = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Fetch loan details
    const loanCheck = await client.query('SELECT * FROM loans WHERE id = $1 FOR UPDATE', [id]);
    if (loanCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { message: 'Loan application not found.' }
      });
    }

    const loan = loanCheck.rows[0];
    if (loan.status !== 'pending_approval') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: { message: `Loan cannot be disbursed. Current status: ${loan.status}` }
      });
    }

    const disbursementDate = new Date();
    const termMonths = parseInt(loan.term_months, 10);
    
    // Calculate maturity date
    const maturityDate = new Date(disbursementDate);
    maturityDate.setMonth(maturityDate.getMonth() + termMonths);
    const maturityDateStr = maturityDate.toISOString().split('T')[0];

    // 1. Generate amortization schedule
    let schedule = [];
    if (loan.amortization_type === 'flat_rate') {
      schedule = calculateFlatRate(loan.principal_amount, loan.interest_rate, termMonths, disbursementDate);
    } else if (loan.amortization_type === 'diminishing_balance') {
      schedule = calculateDiminishingBalance(loan.principal_amount, loan.interest_rate, termMonths, disbursementDate);
    }

    // 2. Update loan status to disbursed
    const updateLoan = `
      UPDATE loans
      SET status = 'disbursed', disbursed_at = $1, maturity_date = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const updatedLoanResult = await client.query(updateLoan, [
      disbursementDate.toISOString(),
      maturityDateStr,
      id
    ]);

    // 3. Save the amortization schedule installments to DB
    const insertInstallment = `
      INSERT INTO repayment_schedules (loan_id, installment_number, due_date, principal_due, interest_due, total_due, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'unpaid')
    `;

    for (const inst of schedule) {
      await client.query(insertInstallment, [
        id,
        inst.installment_number,
        inst.due_date,
        inst.principal_due,
        inst.interest_due,
        inst.total_due
      ]);
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Loan disbursed successfully. Amortization schedule generated.',
      loan: updatedLoanResult.rows[0],
      schedule
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Get all loans (with filtering)
// @route   GET /api/loans
// @access  Protected
export const getLoans = async (req, res, next) => {
  try {
    const { member_id, status } = req.query;

    // RBAC: Member can only view their own loans
    if (req.user.role === 'member') {
      const memberCheck = await query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
      if (memberCheck.rowCount === 0) {
        return res.status(403).json({
          success: false,
          error: { message: 'No member profile associated with this account.' }
        });
      }
      
      const ownMemberId = memberCheck.rows[0].id;
      let queryText = 'SELECT l.*, lp.name as product_name FROM loans l JOIN loan_products lp ON l.loan_product_id = lp.id WHERE l.member_id = $1';
      const params = [ownMemberId];

      if (status) {
        queryText += ' AND l.status = $2';
        params.push(status);
      }

      const result = await query(queryText, params);
      return res.status(200).json({
        success: true,
        data: result.rows
      });
    }

    // Admin/Manager view
    let queryText = `
      SELECT l.*, lp.name as product_name, m.first_name, m.last_name 
      FROM loans l
      LEFT JOIN loan_products lp ON l.loan_product_id = lp.id
      LEFT JOIN members m ON l.member_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (member_id) {
      queryText += ` AND l.member_id = $${paramIndex}`;
      params.push(member_id);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND l.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryText += ' ORDER BY l.created_at DESC';

    const result = await query(queryText, params);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single loan details with installment schedules and payments
// @route   GET /api/loans/:id
// @access  Protected
export const getLoanById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const loanResult = await query(
      `SELECT l.*, lp.name as product_name, m.first_name, m.last_name 
       FROM loans l
       LEFT JOIN loan_products lp ON l.loan_product_id = lp.id
       LEFT JOIN members m ON l.member_id = m.id
       WHERE l.id = $1`,
      [id]
    );

    if (loanResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Loan not found.' }
      });
    }

    const loan = loanResult.rows[0];

    // RBAC: Member can only view their own loan
    if (req.user.role === 'member') {
      const memberCheck = await query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
      if (memberCheck.rowCount === 0 || memberCheck.rows[0].id !== loan.member_id) {
        return res.status(403).json({
          success: false,
          error: { message: 'Unauthorized access to this loan.' }
        });
      }
    }

    // Fetch schedules
    const schedules = await query(
      'SELECT * FROM repayment_schedules WHERE loan_id = $1 ORDER BY installment_number ASC',
      [id]
    );

    // Fetch payments
    const payments = await query(
      'SELECT * FROM loan_payments WHERE loan_id = $1 ORDER BY payment_date DESC',
      [id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...loan,
        schedule: schedules.rows,
        payments: payments.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. REPAYMENT postings ENGINE
// ==========================================

// @desc    Post a loan repayment and allocate funds across schedules (interest first, then principal)
// @route   POST /api/loans/repayments
// @access  Protected (Admin, Manager)
export const postRepayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { loan_id, amount, payment_method, reference_no } = req.body;

    if (!loan_id || !amount || !payment_method) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide loan_id, amount, and payment_method.' }
      });
    }

    const payAmount = parseFloat(amount);
    if (payAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Payment amount must be greater than zero.' }
      });
    }

    await client.query('BEGIN');

    // Verify loan is disbursed/active
    const loanCheck = await client.query('SELECT status FROM loans WHERE id = $1 FOR UPDATE', [loan_id]);
    if (loanCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { message: 'Loan not found.' }
      });
    }

    const loan = loanCheck.rows[0];
    if (loan.status !== 'disbursed' && loan.status !== 'defaulted') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: { message: `Repayments can only be posted to active loans. Current loan status is: ${loan.status}` }
      });
    }

    // 1. Record payment transaction
    const insertPayment = `
      INSERT INTO loan_payments (loan_id, amount, payment_method, reference_no)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const paymentResult = await client.query(insertPayment, [
      loan_id,
      payAmount,
      payment_method,
      reference_no || null
    ]);
    const newPayment = paymentResult.rows[0];

    // 2. Fetch all unpaid or partially paid schedules sorted by date/installment number
    const scheduleQuery = `
      SELECT * FROM repayment_schedules 
      WHERE loan_id = $1 AND status IN ('unpaid', 'partially_paid')
      ORDER BY installment_number ASC 
      FOR UPDATE
    `;
    const schedulesResult = await client.query(scheduleQuery, [loan_id]);

    let outstandingPayment = payAmount;
    const allocations = [];

    // Loop through each schedule item and allocate payment: interest first, then principal
    for (const sched of schedulesResult.rows) {
      if (outstandingPayment <= 0) break;

      const schedId = sched.id;
      const interestDue = parseFloat(sched.interest_due);
      const interestPaid = parseFloat(sched.interest_paid);
      const principalDue = parseFloat(sched.principal_due);
      const principalPaid = parseFloat(sched.principal_paid);

      const remainingInterest = Math.round((interestDue - interestPaid) * 100) / 100;
      const remainingPrincipal = Math.round((principalDue - principalPaid) * 100) / 100;

      let allocatedInterest = 0;
      let allocatedPrincipal = 0;

      // A. Allocate to Interest First
      if (remainingInterest > 0) {
        allocatedInterest = Math.min(outstandingPayment, remainingInterest);
        allocatedInterest = Math.round(allocatedInterest * 100) / 100;
        outstandingPayment = Math.round((outstandingPayment - allocatedInterest) * 100) / 100;
      }

      // B. Allocate to Principal Next
      if (outstandingPayment > 0 && remainingPrincipal > 0) {
        allocatedPrincipal = Math.min(outstandingPayment, remainingPrincipal);
        allocatedPrincipal = Math.round(allocatedPrincipal * 100) / 100;
        outstandingPayment = Math.round((outstandingPayment - allocatedPrincipal) * 100) / 100;
      }

      // If any allocation was made, update schedule item and save details
      if (allocatedInterest > 0 || allocatedPrincipal > 0) {
        const newInterestPaid = Math.round((interestPaid + allocatedInterest) * 100) / 100;
        const newPrincipalPaid = Math.round((principalPaid + allocatedPrincipal) * 100) / 100;
        
        let newStatus = 'partially_paid';
        if (newInterestPaid === interestDue && newPrincipalPaid === principalDue) {
          newStatus = 'paid';
        }

        // Update repayment schedule
        const updateSched = `
          UPDATE repayment_schedules
          SET interest_paid = $1, principal_paid = $2, status = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `;
        await client.query(updateSched, [newInterestPaid, newPrincipalPaid, newStatus, schedId]);

        // Insert allocation record
        const insertAlloc = `
          INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        const allocResult = await client.query(insertAlloc, [
          newPayment.id,
          schedId,
          allocatedPrincipal,
          allocatedInterest
        ]);
        allocations.push(allocResult.rows[0]);
      }
    }

    // 3. Handle overpayments (if any remaining payment is left over after clearing all current schedules)
    if (outstandingPayment > 0) {
      // Find the last schedule installment to dump the extra funds as advanced principal reduction
      const lastInstallmentResult = await client.query(
        'SELECT id, principal_paid, principal_due FROM repayment_schedules WHERE loan_id = $1 ORDER BY installment_number DESC LIMIT 1 FOR UPDATE',
        [loan_id]
      );
      if (lastInstallmentResult.rowCount > 0) {
        const lastInst = lastInstallmentResult.rows[0];
        const newPrincipalPaid = parseFloat(lastInst.principal_paid) + outstandingPayment;
        
        await client.query(
          "UPDATE repayment_schedules SET principal_paid = $1, status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [newPrincipalPaid, lastInst.id]
        );

        await client.query(
          "INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated) VALUES ($1, $2, $3, 0.00)",
          [newPayment.id, lastInst.id, outstandingPayment]
        );
      }
    }

    // 4. Check if the entire loan is fully paid
    const remainingUnpaidSchedules = await client.query(
      "SELECT id FROM repayment_schedules WHERE loan_id = $1 AND status != 'paid'",
      [loan_id]
    );

    if (remainingUnpaidSchedules.rowCount === 0) {
      await client.query("UPDATE loans SET status = 'fully_paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [loan_id]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Repayment posted and allocated successfully.',
      payment: newPayment,
      allocations
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
