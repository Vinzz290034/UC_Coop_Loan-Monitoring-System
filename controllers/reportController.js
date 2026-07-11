import { query } from '../config/db.js';
import { exportToExcel } from '../services/reportExporter.js';

// ==========================================
// 1. CASH DISBURSEMENT REFERENCE REPORT
// ==========================================

// @desc    Get Cash Disbursement Reference Report (JSON or Excel)
// @route   GET /api/reports/cash-disbursement
// @access  Protected (Admin, Manager)
export const getCashDisbursementReport = async (req, res, next) => {
  try {
    const dbQuery = `
      SELECT 
        l.id as loan_id,
        m.first_name || ' ' || m.last_name as member_name,
        lp.name as product_name,
        l.principal_amount,
        l.interest_rate,
        l.term_months,
        l.disbursed_at,
        l.maturity_date,
        l.status
      FROM loans l
      JOIN members m ON l.member_id = m.id
      JOIN loan_products lp ON l.loan_product_id = lp.id
      WHERE l.status IN ('disbursed', 'fully_paid', 'defaulted')
      ORDER BY l.disbursed_at DESC
    `;

    const result = await query(dbQuery);

    const formattedData = result.rows.map(row => ({
      ...row,
      principal_amount: parseFloat(row.principal_amount),
      interest_rate: parseFloat(row.interest_rate) * 100 + '%',
      disbursed_at: row.disbursed_at ? new Date(row.disbursed_at).toISOString().split('T')[0] : 'N/A',
      maturity_date: row.maturity_date ? new Date(row.maturity_date).toISOString().split('T')[0] : 'N/A'
    }));

    if (req.query.export === 'excel') {
      const columns = [
        { header: 'Member Name', key: 'member_name', width: 25 },
        { header: 'Loan Product', key: 'product_name', width: 25 },
        { header: 'Principal Amount (₱)', key: 'principal_amount', width: 20 },
        { header: 'Interest Rate', key: 'interest_rate', width: 15 },
        { header: 'Term (Months)', key: 'term_months', width: 15 },
        { header: 'Disbursement Date', key: 'disbursed_at', width: 20 },
        { header: 'Maturity Date', key: 'maturity_date', width: 20 },
        { header: 'Status', key: 'status', width: 15 }
      ];

      return await exportToExcel(
        res,
        'Cash_Disbursements',
        'Disbursements',
        columns,
        formattedData
      );
    }

    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. LOAN MONITORING REPORT
// ==========================================

// @desc    Get Loan Monitoring Portfolio Report (JSON or Excel)
// @route   GET /api/reports/loan-monitoring
// @access  Protected (Admin, Manager)
export const getLoanMonitoringReport = async (req, res, next) => {
  try {
    const dbQuery = `
      SELECT 
        l.id as loan_id,
        m.first_name || ' ' || m.last_name as member_name,
        lp.name as product_name,
        l.principal_amount,
        COALESCE(SUM(rs.principal_paid), 0) as principal_paid,
        COALESCE(SUM(rs.interest_paid), 0) as interest_paid,
        l.principal_amount - COALESCE(SUM(rs.principal_paid), 0) as outstanding_principal,
        COALESCE(SUM(rs.interest_due), 0) - COALESCE(SUM(rs.interest_paid), 0) as outstanding_interest,
        l.status,
        -- Get oldest overdue date if any
        (SELECT MIN(due_date) 
         FROM repayment_schedules 
         WHERE loan_id = l.id AND status IN ('unpaid', 'partially_paid') AND due_date < CURRENT_DATE) as overdue_since
      FROM loans l
      JOIN members m ON l.member_id = m.id
      JOIN loan_products lp ON l.loan_product_id = lp.id
      LEFT JOIN repayment_schedules rs ON l.id = rs.loan_id
      WHERE l.status IN ('disbursed', 'fully_paid', 'defaulted')
      GROUP BY l.id, m.first_name, m.last_name, lp.name
      ORDER BY l.status ASC, m.last_name ASC
    `;

    const result = await query(dbQuery);

    const formattedData = result.rows.map(row => {
      const outstandingPrincipal = parseFloat(row.outstanding_principal);
      const outstandingInterest = parseFloat(row.outstanding_interest);
      const overdueSince = row.overdue_since;

      let daysPastDue = 0;
      if (overdueSince) {
        const diffTime = Math.abs(new Date() - new Date(overdueSince));
        daysPastDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        member_name: row.member_name,
        product_name: row.product_name,
        principal_amount: parseFloat(row.principal_amount),
        principal_paid: parseFloat(row.principal_paid),
        interest_paid: parseFloat(row.interest_paid),
        outstanding_principal: outstandingPrincipal,
        outstanding_interest: outstandingInterest,
        total_outstanding: outstandingPrincipal + outstandingInterest,
        days_past_due: daysPastDue,
        status: row.status
      };
    });

    if (req.query.export === 'excel') {
      const columns = [
        { header: 'Member Name', key: 'member_name', width: 25 },
        { header: 'Loan Product', key: 'product_name', width: 25 },
        { header: 'Original Principal (₱)', key: 'principal_amount', width: 20 },
        { header: 'Principal Paid (₱)', key: 'principal_paid', width: 18 },
        { header: 'Interest Paid (₱)', key: 'interest_paid', width: 18 },
        { header: 'Outstanding Principal (₱)', key: 'outstanding_principal', width: 22 },
        { header: 'Outstanding Interest (₱)', key: 'outstanding_interest', width: 22 },
        { header: 'Total Outstanding (₱)', key: 'total_outstanding', width: 22 },
        { header: 'Days Past Due', key: 'days_past_due', width: 15 },
        { header: 'Status', key: 'status', width: 15 }
      ];

      return await exportToExcel(
        res,
        'Loan_Portfolio_Monitoring',
        'Portfolio_Status',
        columns,
        formattedData
      );
    }

    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. MASTER FINANCIAL TRANSACTION REPORT
// ==========================================

// @desc    Get Master Financial Transaction Report (JSON or Excel)
// @route   GET /api/reports/transactions
// @access  Protected (Admin, Manager)
export const getTransactionReport = async (req, res, next) => {
  try {
    const dbQuery = `
      SELECT 
        'Share Capital' as ledger_type,
        t.id::text as transaction_id,
        m.first_name || ' ' || m.last_name as member_name,
        UPPER(t.transaction_type) as type,
        t.amount,
        t.transaction_date as date,
        COALESCE(t.remarks, 'Share capital contribution/withdrawal') as description
      FROM share_capital_transactions t
      JOIN members m ON t.member_id = m.id
      
      UNION ALL
      
      SELECT 
        'Fixed Deposit' as ledger_type,
        t.id::text as transaction_id,
        m.first_name || ' ' || m.last_name as member_name,
        UPPER(t.transaction_type) as type,
        t.amount,
        t.transaction_date as date,
        'Deposit placements / Interest accruals' as description
      FROM fixed_deposit_transactions t
      JOIN fixed_deposits fd ON t.fixed_deposit_id = fd.id
      JOIN members m ON fd.member_id = m.id
      
      UNION ALL
      
      SELECT 
        'Investment' as ledger_type,
        t.id::text as transaction_id,
        m.first_name || ' ' || m.last_name as member_name,
        UPPER(t.transaction_type) as type,
        t.amount,
        t.transaction_date as date,
        'Equity placement / dividend payouts' as description
      FROM investment_transactions t
      JOIN investments i ON t.investment_id = i.id
      JOIN members m ON i.member_id = m.id
      
      UNION ALL
      
      SELECT 
        'Loan Repayment' as ledger_type,
        p.id::text as transaction_id,
        m.first_name || ' ' || m.last_name as member_name,
        UPPER(p.payment_method) as type,
        p.amount,
        p.payment_date as date,
        'Loan amortization pay-in. Ref: ' || COALESCE(p.reference_no, 'N/A') as description
      FROM loan_payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN members m ON l.member_id = m.id
      
      ORDER BY date DESC
    `;

    const result = await query(dbQuery);

    const formattedData = result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount),
      date: new Date(row.date).toISOString().replace('T', ' ').substring(0, 19)
    }));

    if (req.query.export === 'excel') {
      const columns = [
        { header: 'Ledger Category', key: 'ledger_type', width: 18 },
        { header: 'Transaction ID', key: 'transaction_id', width: 36 },
        { header: 'Member Name', key: 'member_name', width: 25 },
        { header: 'Action/Method', key: 'type', width: 18 },
        { header: 'Amount (₱)', key: 'amount', width: 18 },
        { header: 'Date & Time', key: 'date', width: 22 },
        { header: 'Transaction Description', key: 'description', width: 35 }
      ];

      return await exportToExcel(
        res,
        'Master_Financial_Transactions',
        'Ledger_Activity',
        columns,
        formattedData
      );
    }

    res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. REVENUE EARNINGS & INTERST COLLECTION REPORT
// ==========================================

// @desc    Get Revenue Earnings and Collection Performance Report (JSON or Excel)
// @route   GET /api/reports/revenue
// @access  Protected (Admin, Manager)
export const getRevenueCollectionReport = async (req, res, next) => {
  try {
    const dbQuery = `
      SELECT 
        lp.name as product_name,
        COUNT(DISTINCT l.id) as active_loans_count,
        COALESCE(SUM(rs.principal_due), 0) as expected_principal,
        COALESCE(SUM(rs.interest_due), 0) as expected_interest,
        COALESCE(SUM(rs.principal_paid), 0) as collected_principal,
        COALESCE(SUM(rs.interest_paid), 0) as collected_revenue_interest,
        (COALESCE(SUM(rs.interest_due), 0) - COALESCE(SUM(rs.interest_paid), 0)) as uncollected_interest_variance
      FROM loan_products lp
      JOIN loans l ON l.loan_product_id = lp.id
      LEFT JOIN repayment_schedules rs ON rs.loan_id = l.id
      WHERE l.status IN ('disbursed', 'fully_paid', 'defaulted')
      GROUP BY lp.id, lp.name
      ORDER BY lp.name ASC
    `;

    const result = await query(dbQuery);

    const formattedData = result.rows.map(row => {
      const expectedInterest = parseFloat(row.expected_interest);
      const collectedInterest = parseFloat(row.collected_revenue_interest);
      
      // Calculate individual product realization rate percentages
      const realizationRate = expectedInterest > 0 
        ? Math.round((collectedInterest / expectedInterest) * 10000) / 100 
        : 100.00;

      return {
        product_name: row.product_name,
        active_loans_count: parseInt(row.active_loans_count, 10),
        expected_principal: parseFloat(row.expected_principal),
        expected_interest: expectedInterest,
        collected_principal: parseFloat(row.collected_principal),
        collected_revenue_interest: collectedInterest,
        uncollected_interest_variance: parseFloat(row.uncollected_interest_variance),
        revenue_realization_rate: realizationRate + '%'
      };
    });

    if (req.query.export === 'excel') {
      const columns = [
        { header: 'Loan Product Name', key: 'product_name', width: 25 },
        { header: 'Loans Count', key: 'active_loans_count', width: 15 },
        { header: 'Expected Principal (₱)', key: 'expected_principal', width: 22 },
        { header: 'Expected Interest Revenue (₱)', key: 'expected_interest', width: 26 },
        { header: 'Collected Principal (₱)', key: 'collected_principal', width: 22 },
        { header: 'Collected Interest Gain (₱)', key: 'collected_revenue_interest', width: 26 },
        { header: 'Outstanding Variance (₱)', key: 'uncollected_interest_variance', width: 22 },
        { header: 'Revenue Recovery Rate', key: 'revenue_realization_rate', width: 22 }
      ];

      return await exportToExcel(
        res,
        'Revenue_Collection_Report',
        'Revenue_Performance',
        columns,
        formattedData
      );
    }

    // Calculate system-wide summary metrics for JSON response
    const totalRevenueEarned = formattedData.reduce((acc, row) => acc + row.collected_revenue_interest, 0);
    const totalPrincipalRecovered = formattedData.reduce((acc, row) => acc + row.collected_principal, 0);

    res.status(200).json({
      success: true,
      summary: {
        total_portfolio_principal_recovered: Math.round(totalPrincipalRecovered * 100) / 100,
        total_clean_interest_revenue_earned: Math.round(totalRevenueEarned * 100) / 100
      },
      count: formattedData.length,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};