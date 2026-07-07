import { query } from '../config/db.js';

// @desc    Get comprehensive system-wide dashboard KPI summary
// @route   GET /api/analytics/dashboard-summary
// @access  Protected (Admin, Manager)
export const getDashboardSummary = async (req, res, next) => {
  try {
    const summaryQuery = `
      SELECT
        -- User/Member counts
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
        (SELECT COUNT(*) FROM users WHERE is_active = false) as inactive_users,
        (SELECT COUNT(*) FROM users WHERE role = 'member') as total_members_users,
        (SELECT COUNT(*) FROM users WHERE role = 'manager') as total_managers,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
        (SELECT COUNT(*) FROM members) as total_member_profiles,
        (SELECT COUNT(*) FROM members WHERE status = 'active') as active_members,
        (SELECT COUNT(*) FROM members WHERE status = 'suspended') as suspended_members,
        (SELECT COUNT(*) FROM members WHERE status = 'inactive') as inactive_members,

        -- Loan counts by status
        (SELECT COUNT(*) FROM loans) as total_loans,
        (SELECT COUNT(*) FROM loans WHERE status = 'pending_approval') as pending_loans,
        (SELECT COUNT(*) FROM loans WHERE status = 'approved') as approved_loans,
        (SELECT COUNT(*) FROM loans WHERE status = 'disbursed') as disbursed_loans,
        (SELECT COUNT(*) FROM loans WHERE status = 'fully_paid') as fully_paid_loans,
        (SELECT COUNT(*) FROM loans WHERE status = 'defaulted') as defaulted_loans,
        (SELECT COUNT(*) FROM loans WHERE status = 'rejected') as rejected_loans,

        -- Financial aggregates
        (SELECT COALESCE(SUM(principal_amount), 0) FROM loans WHERE status = 'disbursed') as total_active_loan_principal,
        (SELECT COALESCE(SUM(principal_amount), 0) FROM loans WHERE status IN ('disbursed', 'fully_paid', 'defaulted')) as total_capital_ever_deployed,
        
        -- Share capital totals
        (SELECT COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0) 
         FROM share_capital_transactions) as total_share_capital,

        -- Fixed deposit totals
        (SELECT COALESCE(SUM(principal_amount), 0) FROM fixed_deposits WHERE status = 'active') as total_active_fixed_deposits,

        -- Investment totals
        (SELECT COALESCE(SUM(current_balance), 0) FROM investments WHERE status = 'active') as total_active_investments,

        -- Repayment totals
        (SELECT COALESCE(SUM(amount), 0) FROM loan_payments) as total_repayments_collected,
        (SELECT COALESCE(SUM(interest_paid), 0) FROM repayment_schedules) as total_interest_earned,

        -- Outstanding balance
        (SELECT COALESCE(SUM(principal_amount), 0) FROM loans WHERE status = 'disbursed') -
        (SELECT COALESCE(SUM(principal_paid), 0) FROM repayment_schedules rs 
         JOIN loans l ON rs.loan_id = l.id WHERE l.status = 'disbursed') as total_outstanding_balance
    `;

    const result = await query(summaryQuery);
    const data = result.rows[0];

    // Parse all numeric values
    const parsed = {};
    for (const [key, value] of Object.entries(data)) {
      parsed[key] = parseFloat(value) || 0;
    }

    res.status(200).json({
      success: true,
      data: parsed
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly loan trends (applications, disbursements, rejections) over last 12 months
// @route   GET /api/analytics/loan-trends
// @access  Protected (Admin, Manager)
export const getLoanTrends = async (req, res, next) => {
  try {
    const { months = 12 } = req.query;
    const monthCount = Math.min(parseInt(months, 10) || 12, 24);

    const trendsQuery = `
      WITH month_series AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${monthCount - 1} months'),
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'::interval
        )::date AS month
      )
      SELECT 
        TO_CHAR(ms.month, 'YYYY-MM') as month,
        TO_CHAR(ms.month, 'Mon YYYY') as month_label,
        COALESCE(SUM(CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END), 0) as total_applications,
        COALESCE(SUM(CASE WHEN l.status = 'disbursed' OR l.status = 'fully_paid' THEN 1 ELSE 0 END), 0) as disbursed,
        COALESCE(SUM(CASE WHEN l.status = 'pending_approval' THEN 1 ELSE 0 END), 0) as pending,
        COALESCE(SUM(CASE WHEN l.status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected,
        COALESCE(SUM(CASE WHEN l.status = 'defaulted' THEN 1 ELSE 0 END), 0) as defaulted,
        COALESCE(SUM(CASE WHEN l.status = 'fully_paid' THEN 1 ELSE 0 END), 0) as fully_paid,
        COALESCE(SUM(l.principal_amount), 0) as total_principal_volume
      FROM month_series ms
      LEFT JOIN loans l ON DATE_TRUNC('month', l.created_at) = ms.month
      GROUP BY ms.month
      ORDER BY ms.month ASC
    `;

    const result = await query(trendsQuery);

    res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        total_applications: parseInt(row.total_applications, 10),
        disbursed: parseInt(row.disbursed, 10),
        pending: parseInt(row.pending, 10),
        rejected: parseInt(row.rejected, 10),
        defaulted: parseInt(row.defaulted, 10),
        fully_paid: parseInt(row.fully_paid, 10),
        total_principal_volume: parseFloat(row.total_principal_volume)
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly repayment trends over last 12 months
// @route   GET /api/analytics/repayment-trends
// @access  Protected (Admin, Manager)
export const getRepaymentTrends = async (req, res, next) => {
  try {
    const { months = 12 } = req.query;
    const monthCount = Math.min(parseInt(months, 10) || 12, 24);

    const trendsQuery = `
      WITH month_series AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${monthCount - 1} months'),
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'::interval
        )::date AS month
      )
      SELECT
        TO_CHAR(ms.month, 'YYYY-MM') as month,
        TO_CHAR(ms.month, 'Mon YYYY') as month_label,
        COALESCE(COUNT(lp.id), 0) as payment_count,
        COALESCE(SUM(lp.amount), 0) as total_amount
      FROM month_series ms
      LEFT JOIN loan_payments lp ON DATE_TRUNC('month', lp.payment_date) = ms.month
      GROUP BY ms.month
      ORDER BY ms.month ASC
    `;

    const result = await query(trendsQuery);

    res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        payment_count: parseInt(row.payment_count, 10),
        total_amount: parseFloat(row.total_amount)
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly member growth over last 12 months
// @route   GET /api/analytics/member-growth
// @access  Protected (Admin, Manager)
export const getMemberGrowth = async (req, res, next) => {
  try {
    const { months = 12 } = req.query;
    const monthCount = Math.min(parseInt(months, 10) || 12, 24);

    const growthQuery = `
      WITH month_series AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${monthCount - 1} months'),
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'::interval
        )::date AS month
      )
      SELECT
        TO_CHAR(ms.month, 'YYYY-MM') as month,
        TO_CHAR(ms.month, 'Mon YYYY') as month_label,
        COALESCE(COUNT(m.id), 0) as new_members,
        (SELECT COUNT(*) FROM members WHERE created_at <= (ms.month + INTERVAL '1 month' - INTERVAL '1 day')) as cumulative_members
      FROM month_series ms
      LEFT JOIN members m ON DATE_TRUNC('month', m.created_at) = ms.month
      GROUP BY ms.month
      ORDER BY ms.month ASC
    `;

    const result = await query(growthQuery);

    res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        new_members: parseInt(row.new_members, 10),
        cumulative_members: parseInt(row.cumulative_members, 10)
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get loan status distribution (counts and amounts by status)
// @route   GET /api/analytics/loan-status-distribution
// @access  Protected (Admin, Manager)
export const getLoanStatusDistribution = async (req, res, next) => {
  try {
    const distributionQuery = `
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(principal_amount), 0) as total_amount
      FROM loans
      GROUP BY status
      ORDER BY count DESC
    `;

    const result = await query(distributionQuery);

    res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count, 10),
        total_amount: parseFloat(row.total_amount)
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get financial summary with monthly breakdowns (share capital, deposits, investments)
// @route   GET /api/analytics/financial-summary
// @access  Protected (Admin, Manager)
export const getFinancialSummary = async (req, res, next) => {
  try {
    const { months = 12 } = req.query;
    const monthCount = Math.min(parseInt(months, 10) || 12, 24);

    // Monthly share capital transaction volumes
    const shareCapitalQuery = `
      WITH month_series AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${monthCount - 1} months'),
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'::interval
        )::date AS month
      )
      SELECT
        TO_CHAR(ms.month, 'YYYY-MM') as month,
        TO_CHAR(ms.month, 'Mon YYYY') as month_label,
        COALESCE(SUM(CASE WHEN sc.transaction_type = 'credit' THEN sc.amount ELSE 0 END), 0) as credits,
        COALESCE(SUM(CASE WHEN sc.transaction_type = 'debit' THEN sc.amount ELSE 0 END), 0) as debits,
        COALESCE(SUM(CASE WHEN sc.transaction_type = 'credit' THEN sc.amount ELSE -sc.amount END), 0) as net_change
      FROM month_series ms
      LEFT JOIN share_capital_transactions sc ON DATE_TRUNC('month', sc.transaction_date) = ms.month
      GROUP BY ms.month
      ORDER BY ms.month ASC
    `;

    // Monthly loan disbursement volumes
    const loanDisbursementQuery = `
      WITH month_series AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${monthCount - 1} months'),
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'::interval
        )::date AS month
      )
      SELECT
        TO_CHAR(ms.month, 'YYYY-MM') as month,
        COALESCE(SUM(l.principal_amount), 0) as disbursed_amount,
        COALESCE(COUNT(l.id), 0) as disbursed_count
      FROM month_series ms
      LEFT JOIN loans l ON DATE_TRUNC('month', l.disbursed_at) = ms.month AND l.status IN ('disbursed', 'fully_paid', 'defaulted')
      GROUP BY ms.month
      ORDER BY ms.month ASC
    `;

    const [scResult, ldResult] = await Promise.all([
      query(shareCapitalQuery),
      query(loanDisbursementQuery)
    ]);

    // Merge results by month
    const mergedData = scResult.rows.map((scRow, index) => ({
      month: scRow.month,
      month_label: scRow.month_label,
      share_capital_credits: parseFloat(scRow.credits),
      share_capital_debits: parseFloat(scRow.debits),
      share_capital_net: parseFloat(scRow.net_change),
      loan_disbursements: parseFloat(ldResult.rows[index]?.disbursed_amount || 0),
      loan_disbursement_count: parseInt(ldResult.rows[index]?.disbursed_count || 0, 10)
    }));

    res.status(200).json({
      success: true,
      data: mergedData
    });
  } catch (error) {
    next(error);
  }
};
