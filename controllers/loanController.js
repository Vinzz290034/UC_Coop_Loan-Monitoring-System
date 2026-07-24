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
    let { member_id, loan_product_id, principal_amount } = req.body;

    // Enforce own profile ID if caller is a member
    if (req.user.role === 'member') {
      if (!req.user.profile?.id) {
        return res.status(400).json({
          success: false,
          error: { message: 'Authenticated user session is not linked to a member profile.' }
        });
      }
      member_id = req.user.profile.id;
    }

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

// @desc    Reject a pending loan application with underwriter remarks
// @route   PATCH /api/loans/:id/reject
// @access  Protected (Admin, Manager)
export const rejectLoanApplication = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    await client.query('BEGIN');

    const loanCheck = await client.query('SELECT status, principal_amount FROM loans WHERE id = $1 FOR UPDATE', [id]);
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
        error: { message: `Only pending applications can be rejected. Current status: ${loan.status}` }
      });
    }

    const updateLoanQuery = `
      UPDATE loans
      SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const updatedResult = await client.query(updateLoanQuery, [id]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Loan application has been officially rejected.',
      data: {
        loan_id: updatedResult.rows[0].id,
        status: updatedResult.rows[0].status,
        underwriter_remarks: remarks || 'No remarks provided.'
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Get system-wide loan portfolio performance and credit risk metrics
// @route   GET /api/loans/metrics/summary
// @access  Protected (Admin, Manager)
export const getLoanMetricsSummary = async (req, res, next) => {
  try {
    // Aggregates high-level credit metrics across the entire database layout
    const metricsQuery = `
      SELECT
        -- Total number of all active loans disbursed
        COUNT(CASE WHEN status = 'disbursed' THEN 1 END) as active_loans_count,
        
        -- Total principal capital ever deployed to members
        COALESCE(SUM(CASE WHEN status = 'disbursed' THEN principal_amount ELSE 0 END), 0) as total_capital_deployed,
        
        -- Cumulative principal recovered through payments
        COALESCE(
          (SELECT SUM(principal_paid) FROM repayment_schedules WHERE status = 'paid' OR status = 'partially_paid'), 
          0
        ) as total_principal_recovered,

        -- Cumulative interest earned/collected so far
        COALESCE(
          (SELECT SUM(interest_paid) FROM repayment_schedules), 
          0
        ) as total_interest_earned,

        -- Total number of applications requiring underwriter review
        COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_applications_count,

        -- Total number of defaulted/delinquent accounts
        COUNT(CASE WHEN status = 'defaulted' THEN 1 END) as defaulted_loans_count
      FROM loans
    `;

    const result = await query(metricsQuery);
    const metrics = result.rows[0];

    // Compute remaining active portfolio risk asset metrics
    const totalDeployed = parseFloat(metrics.total_capital_deployed);
    const totalRecovered = parseFloat(metrics.total_principal_recovered);
    const totalOutstandingPrincipal = Math.max(0, totalDeployed - totalRecovered);

    res.status(200).json({
      success: true,
      data: {
        portfolio_health: {
          active_loans: parseInt(metrics.active_loans_count, 10),
          defaulted_loans: parseInt(metrics.defaulted_loans_count, 10),
          pending_applications: parseInt(metrics.pending_applications_count, 10)
        },
        ledger_aggregates: {
          total_capital_deployed: totalDeployed,
          total_principal_recovered: totalRecovered,
          current_outstanding_balance: totalOutstandingPrincipal,
          total_interest_earned: parseFloat(metrics.total_interest_earned)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Get loan history specific to logged-in user profile
// @route   GET /api/loans/my-history
// @access  Protected (Member)
export const getMyLoanHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Resolve member profile ID attached to current user
    const memberResult = await query('SELECT id FROM members WHERE user_id = $1', [userId]);
    if (memberResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No member profile associated with this account.' }
      });
    }

    const memberId = memberResult.rows[0].id;

    // 2. Query member's loan history along with aggregate repayment totals
    const historyQuery = `
      SELECT 
        l.id,
        l.principal_amount,
        l.interest_rate,
        l.term_months,
        l.amortization_type,
        l.status,
        l.disbursed_at,
        l.maturity_date,
        l.created_at,
        lp.name AS product_name,
        COALESCE(SUM(rs.principal_paid), 0) AS total_principal_paid,
        COALESCE(SUM(rs.interest_paid), 0) AS total_interest_paid,
        COALESCE(SUM(rs.total_due), 0) AS total_expected_repayment
      FROM loans l
      LEFT JOIN loan_products lp ON l.loan_product_id = lp.id
      LEFT JOIN repayment_schedules rs ON l.id = rs.loan_id
      WHERE l.member_id = $1
      GROUP BY l.id, lp.name
      ORDER BY l.created_at DESC
    `;

    const historyResult = await query(historyQuery, [memberId]);

    // 3. Format repayment metrics per loan
    const formattedHistory = historyResult.rows.map((loan) => {
      const principalPaid = parseFloat(loan.total_principal_paid);
      const interestPaid = parseFloat(loan.total_interest_paid);
      const totalPaid = principalPaid + interestPaid;
      const principal = parseFloat(loan.principal_amount);

      return {
        id: loan.id,
        product_name: loan.product_name,
        principal_amount: principal,
        interest_rate: parseFloat(loan.interest_rate),
        term_months: parseInt(loan.term_months, 10),
        amortization_type: loan.amortization_type,
        status: loan.status,
        disbursed_at: loan.disbursed_at,
        maturity_date: loan.maturity_date,
        created_at: loan.created_at,
        repayment_summary: {
          total_paid: Math.round(totalPaid * 100) / 100,
          principal_paid: Math.round(principalPaid * 100) / 100,
          interest_paid: Math.round(interestPaid * 100) / 100,
          outstanding_principal: Math.max(0, Math.round((principal - principalPaid) * 100) / 100)
        }
      };
    });

    res.status(200).json({
      success: true,
      count: formattedHistory.length,
      data: formattedHistory
      });
  } catch (error) {
    next(error);
  }
};
// =========================================
// 4. AMORTIZATION PREVIEW & CALCULATIONS
// ==========================================

// @desc    Preview amortization schedule using calculationCore (Flat Rate vs Diminishing Balance)
// @route   POST /api/loans/preview-schedule
// @access  Protected
export const previewAmortizationSchedule = async (req, res, next) => {
  try {
    const { principal_amount, interest_rate, term_months, amortization_type, start_date } = req.body;

    if (!principal_amount || interest_rate === undefined || !term_months || !amortization_type) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required parameters: principal_amount, interest_rate, term_months, amortization_type.' }
      });
    }

    const principal = parseFloat(principal_amount);
    const rate = parseFloat(interest_rate);
    const term = parseInt(term_months, 10);
    const startDate = start_date || new Date();

    let schedule = [];
    if (amortization_type === 'diminishing_balance') {
      schedule = calculateDiminishingBalance(principal, rate, term, startDate);
    } else if (amortization_type === 'flat_rate') {
      schedule = calculateFlatRate(principal, rate, term, startDate);
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid amortization_type. Must be "flat_rate" or "diminishing_balance".' }
      });
    }

    // Summarize monetization totals directly from calculationCore's generated schedule
    const totalInterest = schedule.reduce((sum, item) => sum + item.interest_due, 0);
    const totalPrincipal = schedule.reduce((sum, item) => sum + item.principal_due, 0);
    const totalRepayment = totalPrincipal + totalInterest;

    res.status(200).json({
      success: true,
      data: {
        principal_amount: principal,
        total_interest: Math.round(totalInterest * 100) / 100,
        total_repayment: Math.round(totalRepayment * 100) / 100,
        term_months: term,
        amortization_type,
        schedule
      }

    });
  } catch (error) {
    next(error);
  }
};