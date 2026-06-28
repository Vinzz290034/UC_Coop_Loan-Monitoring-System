import { query } from '../config/db.js';

// @desc    Get billing queue for upcoming dues (loans & scheduled items)
// @route   GET /api/billing/due
// @access  Protected (Admin, Manager)
export const getBillingQueue = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    // Default billing period: from today to 30 days in the future
    const today = new Date().toISOString().split('T')[0];
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);
    const defaultEndStr = defaultEnd.toISOString().split('T')[0];

    const startDate = start_date || today;
    const endDate = end_date || defaultEndStr;

    // Fetch repayment schedules falling due within the range
    const billingQuery = `
      SELECT 
        rs.id as schedule_id,
        rs.installment_number,
        rs.due_date,
        rs.principal_due,
        rs.interest_due,
        rs.total_due,
        rs.principal_paid,
        rs.interest_paid,
        (rs.total_due - (rs.principal_paid + rs.interest_paid)) as amount_remaining,
        rs.status as installment_status,
        l.id as loan_id,
        l.principal_amount as loan_principal,
        l.interest_rate as loan_interest_rate,
        lp.name as product_name,
        m.id as member_id,
        m.first_name,
        m.last_name,
        m.email,
        m.phone
      FROM repayment_schedules rs
      JOIN loans l ON rs.loan_id = l.id
      JOIN loan_products lp ON l.loan_product_id = lp.id
      JOIN members m ON l.member_id = m.id
      WHERE rs.due_date BETWEEN $1 AND $2
        AND rs.status IN ('unpaid', 'partially_paid')
        AND l.status = 'disbursed'
      ORDER BY rs.due_date ASC, m.last_name ASC
    `;

    const result = await query(billingQuery, [startDate, endDate]);

    // Calculate aggregated billing totals for the period
    let totalPrincipalDue = 0;
    let totalInterestDue = 0;
    let totalAmountRemaining = 0;

    result.rows.forEach(row => {
      totalPrincipalDue += parseFloat(row.principal_due - row.principal_paid);
      totalInterestDue += parseFloat(row.interest_due - row.interest_paid);
      totalAmountRemaining += parseFloat(row.amount_remaining);
    });

    res.status(200).json({
      success: true,
      billing_period: {
        start: startDate,
        end: endDate
      },
      summary: {
        records_count: result.rowCount,
        total_principal_remaining: Math.round(totalPrincipalDue * 100) / 100,
        total_interest_remaining: Math.round(totalInterestDue * 100) / 100,
        total_amount_due: Math.round(totalAmountRemaining * 100) / 100
      },
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get delinquency aging report (30, 60, 90+ days past due)
// @route   GET /api/billing/aging
// @access  Protected (Admin, Manager)
export const getAgingReport = async (req, res, next) => {
  try {
    // 1. Query all loans that are currently active (disbursed or defaulted)
    // and extract details of their oldest unpaid/partially paid schedule
    const agingQuery = `
      WITH oldest_unpaid AS (
        SELECT 
          loan_id,
          installment_number,
          due_date,
          (total_due - (principal_paid + interest_paid)) as amount_past_due,
          (CURRENT_DATE - due_date) as days_past_due
        FROM repayment_schedules
        WHERE status IN ('unpaid', 'partially_paid')
        ORDER BY loan_id, installment_number ASC
      ),
      first_unpaid AS (
        SELECT DISTINCT ON (loan_id) * FROM oldest_unpaid
      )
      SELECT 
        l.id as loan_id,
        l.principal_amount,
        l.status as loan_status,
        lp.name as product_name,
        m.id as member_id,
        m.first_name,
        m.last_name,
        fu.installment_number as oldest_unpaid_installment,
        fu.due_date as oldest_due_date,
        fu.days_past_due,
        fu.amount_past_due,
        -- Calculate total outstanding unpaid balance on the whole loan
        (SELECT SUM(total_due - (principal_paid + interest_paid)) 
         FROM repayment_schedules 
         WHERE loan_id = l.id) as total_outstanding_loan_balance
      FROM loans l
      JOIN first_unpaid fu ON l.id = fu.loan_id
      JOIN loan_products lp ON l.loan_product_id = lp.id
      JOIN members m ON l.member_id = m.id
      WHERE l.status IN ('disbursed', 'defaulted')
        AND fu.days_past_due > 0
      ORDER BY fu.days_past_due DESC
    `;

    const result = await query(agingQuery);

    // 2. Classify rows into tranches and calculate metrics
    const reportData = {
      tranches: {
        current: { label: 'Current (0 days)', count: 0, balance: 0, items: [] },
        tranche_30: { label: '1 - 30 days past due', count: 0, balance: 0, items: [] },
        tranche_60: { label: '31 - 60 days past due', count: 0, balance: 0, items: [] },
        tranche_90: { label: '61 - 90 days past due', count: 0, balance: 0, items: [] },
        tranche_90_plus: { label: '91+ days past due (Default Risk)', count: 0, balance: 0, items: [] }
      },
      summary: {
        total_past_due_loans: 0,
        total_outstanding_delinquent_balance: 0
      }
    };

    result.rows.forEach(row => {
      const dpd = parseInt(row.days_past_due, 10);
      const balance = parseFloat(row.total_outstanding_loan_balance);
      
      let trancheKey = 'tranche_90_plus';
      if (dpd <= 0) {
        trancheKey = 'current';
      } else if (dpd <= 30) {
        trancheKey = 'tranche_30';
      } else if (dpd <= 60) {
        trancheKey = 'tranche_60';
      } else if (dpd <= 90) {
        trancheKey = 'tranche_90';
      }

      reportData.tranches[trancheKey].count++;
      reportData.tranches[trancheKey].balance += balance;
      reportData.tranches[trancheKey].items.push(row);

      reportData.summary.total_past_due_loans++;
      reportData.summary.total_outstanding_delinquent_balance += balance;
    });

    // Round the totals
    Object.keys(reportData.tranches).forEach(key => {
      reportData.tranches[key].balance = Math.round(reportData.tranches[key].balance * 100) / 100;
    });
    reportData.summary.total_outstanding_delinquent_balance = 
      Math.round(reportData.summary.total_outstanding_delinquent_balance * 100) / 100;

    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get complete billing status and history for a single specific loan
// @route   GET /api/billing/loan/:loanId
// @access  Protected (Admin, Manager)
export const getBillingByLoanId = async (req, res, next) => {
  try {
    const { loanId } = req.params;

    const historyQuery = `
      SELECT 
        rs.id as schedule_id,
        rs.installment_number,
        rs.due_date,
        rs.principal_due,
        rs.interest_due,
        rs.total_due,
        rs.principal_paid,
        rs.interest_paid,
        rs.status as installment_status,
        (rs.total_due - (rs.principal_paid + rs.interest_paid)) as outstanding_remaining,
        CASE 
          WHEN rs.due_date < CURRENT_DATE AND rs.status IN ('unpaid', 'partially_paid') THEN (CURRENT_DATE - rs.due_date)
          ELSE 0
        END as days_overdue
      FROM repayment_schedules rs
      WHERE rs.loan_id = $1
      ORDER BY rs.installment_number ASC
    `;

    const result = await query(historyQuery, [loanId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No repayment schedules or billing records found for this loan ID.' }
      });
    }

    res.status(200).json({
      success: true,
      loan_id: loanId,
      records_count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};
