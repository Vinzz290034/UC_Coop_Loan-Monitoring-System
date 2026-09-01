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
        l.laf_no,
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
    const agingQuery = `
      WITH loan_balances AS (
        SELECT loan_id, SUM(total_due - (principal_paid + interest_paid)) as total_outstanding_loan_balance
        FROM repayment_schedules
        GROUP BY loan_id
      )
      SELECT 
        l.id as loan_id,
        l.laf_no,
        l.principal_amount,
        l.status as loan_status,
        lp.name as product_name,
        m.id as member_id,
        m.first_name,
        m.last_name,
        rs.installment_number,
        rs.due_date,
        (rs.total_due - (rs.principal_paid + rs.interest_paid)) as amount_past_due,
        (CURRENT_DATE - rs.due_date) as days_past_due,
        COALESCE(lb.total_outstanding_loan_balance, 0) as total_outstanding_loan_balance
      FROM repayment_schedules rs
      JOIN loans l ON rs.loan_id = l.id
      JOIN loan_products lp ON l.loan_product_id = lp.id
      JOIN members m ON l.member_id = m.id
      LEFT JOIN loan_balances lb ON lb.loan_id = l.id
      WHERE l.status IN ('disbursed', 'defaulted')
        AND rs.status IN ('unpaid', 'partially_paid')
        AND rs.due_date < CURRENT_DATE
      ORDER BY (CURRENT_DATE - rs.due_date) DESC
    `;

    const result = await query(agingQuery);

    // Classify rows into tranches and calculate metrics
    const reportData = {
      tranches: {
        tranche_30: { label: '1 - 30 days past due', count: 0, loanIds: {}, balance: 0, items: [] },
        tranche_60: { label: '31 - 60 days past due', count: 0, loanIds: {}, balance: 0, items: [] },
        tranche_90: { label: '61 - 90 days past due', count: 0, loanIds: {}, balance: 0, items: [] },
        tranche_90_plus: { label: '91+ days past due (Default Risk)', count: 0, loanIds: {}, balance: 0, items: [] }
      },
      summary: {
        total_past_due_loans: 0,
        total_outstanding_delinquent_balance: 0
      }
    };

    const globalLoanIds = {};

    result.rows.forEach(row => {
      const dpd = parseInt(row.days_past_due, 10);
      const amount = parseFloat(row.amount_past_due);
      
      let trancheKey = 'tranche_90_plus';
      if (dpd <= 30) {
        trancheKey = 'tranche_30';
      } else if (dpd <= 60) {
        trancheKey = 'tranche_60';
      } else if (dpd <= 90) {
        trancheKey = 'tranche_90';
      }

      reportData.tranches[trancheKey].loanIds[row.loan_id] = true;
      reportData.tranches[trancheKey].balance += amount;
      reportData.tranches[trancheKey].items.push(row);

      globalLoanIds[row.loan_id] = true;
      reportData.summary.total_outstanding_delinquent_balance += amount;
    });

    // Finalize counts and formatting
    Object.keys(reportData.tranches).forEach(key => {
      reportData.tranches[key].count = Object.keys(reportData.tranches[key].loanIds).length;
      delete reportData.tranches[key].loanIds;
      reportData.tranches[key].balance = Math.round(reportData.tranches[key].balance * 100) / 100;
    });

    reportData.summary.total_past_due_loans = Object.keys(globalLoanIds).length;
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

    // Query all individual payments allocated to schedules for this loan
    const paymentsQuery = `
      SELECT 
        lp.id as payment_id,
        lp.amount,
        lp.payment_date,
        lp.payment_method,
        lp.reference_no,
        lpa.repayment_schedule_id
      FROM loan_payments lp
      JOIN loan_payment_allocations lpa ON lp.id = lpa.loan_payment_id
      WHERE lp.loan_id = $1
      ORDER BY lp.payment_date ASC
    `;
    const paymentsRes = await query(paymentsQuery, [loanId]);

    const paymentsBySchedule = {};
    paymentsRes.rows.forEach(p => {
      if (p.repayment_schedule_id) {
        if (!paymentsBySchedule[p.repayment_schedule_id]) {
          paymentsBySchedule[p.repayment_schedule_id] = [];
        }
        paymentsBySchedule[p.repayment_schedule_id].push(p);
      }
    });

    const expandedRows = [];
    result.rows.forEach(s => {
      const sPayments = paymentsBySchedule[s.schedule_id] || [];
      if (sPayments.length > 1) {
        // Multi-cutoff semi-monthly payments (e.g. 11/15 and 11/30)
        sPayments.forEach((p, pIdx) => {
          expandedRows.push({
            schedule_id: `${s.schedule_id}-${p.payment_id}`,
            installment_number: s.installment_number,
            is_sub_row: pIdx > 0,
            due_date: pIdx === 0 ? s.due_date : null,
            principal_due: pIdx === 0 ? s.principal_due : '0.00',
            interest_due: pIdx === 0 ? s.interest_due : '0.00',
            total_due: pIdx === 0 ? s.total_due : '0.00',
            amount_paid: p.amount,
            principal_paid: p.amount,
            interest_paid: '0.00',
            installment_status: 'paid',
            outstanding_remaining: '0.00',
            date_paid: p.payment_date,
            days_overdue: 0
          });
        });
      } else if (sPayments.length === 1) {
        const p = sPayments[0];
        expandedRows.push({
          schedule_id: s.schedule_id,
          installment_number: s.installment_number,
          is_sub_row: false,
          due_date: s.due_date,
          principal_due: s.principal_due,
          interest_due: s.interest_due,
          total_due: s.total_due,
          amount_paid: p.amount,
          principal_paid: s.principal_paid,
          interest_paid: s.interest_paid,
          installment_status: s.installment_status,
          outstanding_remaining: s.outstanding_remaining,
          date_paid: p.payment_date,
          days_overdue: s.days_overdue
        });
      } else {
        expandedRows.push({
          schedule_id: s.schedule_id,
          installment_number: s.installment_number,
          is_sub_row: false,
          due_date: s.due_date,
          principal_due: s.principal_due,
          interest_due: s.interest_due,
          total_due: s.total_due,
          amount_paid: (parseFloat(s.principal_paid) + parseFloat(s.interest_paid)).toFixed(2),
          principal_paid: s.principal_paid,
          interest_paid: s.interest_paid,
          installment_status: s.installment_status,
          outstanding_remaining: s.outstanding_remaining,
          date_paid: null,
          days_overdue: s.days_overdue
        });
      }
    });

    const loanQuery = `
      SELECT 
        l.id,
        l.laf_no,
        l.principal_amount,
        l.interest_rate,
        l.term_months,
        l.status,
        l.payment_mode,
        l.disbursed_at,
        l.maturity_date,
        lp.name as product_name,
        m.first_name,
        m.last_name,
        CONCAT(m.first_name, ' ', m.last_name) as borrower_name
      FROM loans l
      LEFT JOIN loan_products lp ON l.loan_product_id = lp.id
      LEFT JOIN members m ON l.member_id = m.id
      WHERE l.id = $1
    `;
    const loanRes = await query(loanQuery, [loanId]);
    const loanDetails = loanRes.rows[0] || null;

    res.status(200).json({
      success: true,
      loan_id: loanId,
      loan: loanDetails,
      records_count: expandedRows.length,
      data: expandedRows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get METC Coop Payroll Billing & Collection Matrix List for salary deduction endorsement
// @route   GET /api/billing/payroll-collection
// @access  Protected (Admin, Staff)
export const getPayrollCollectionList = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    const today = new Date().toISOString().split('T')[0];
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);
    const defaultEndStr = defaultEnd.toISOString().split('T')[0];

    const startDate = start_date || today;
    const endDate = end_date || defaultEndStr;

    // Query all loan repayment schedules falling due or past due up to endDate
    const queryStr = `
      SELECT 
        m.id as member_id,
        m.member_no,
        m.first_name,
        m.last_name,
        m.middle_name,
        lp.name as product_name,
        rs.principal_due,
        rs.interest_due,
        rs.total_due,
        rs.principal_paid,
        rs.interest_paid,
        COALESCE(rs.fines_due, 0) as fines_due,
        CASE 
          WHEN rs.due_date < CURRENT_DATE AND rs.status IN ('unpaid', 'partially_paid') 
          THEN ROUND(((rs.total_due - (rs.principal_paid + rs.interest_paid)) * 0.02)::numeric, 2)
          ELSE 0
        END as overdue_fine,
        (rs.total_due - (rs.principal_paid + rs.interest_paid)) as amount_remaining,
        rs.due_date
      FROM members m
      JOIN loans l ON l.member_id = m.id
      JOIN loan_products lp ON l.loan_product_id = lp.id
      JOIN repayment_schedules rs ON rs.loan_id = l.id
      WHERE (rs.due_date <= $1)
        AND rs.status IN ('unpaid', 'partially_paid')
        AND l.status = 'disbursed'
      ORDER BY m.last_name ASC, m.first_name ASC
    `;

    const result = await query(queryStr, [endDate]);

    // Query real Share Capital / Fixed Deposit contributions for the period
    const shareCapRes = await query(`
      SELECT 
        member_id, 
        SUM(amount) as total_share_deposit
      FROM share_capital_transactions
      WHERE transaction_type = 'credit'
        AND transaction_date BETWEEN $1 AND $2
      GROUP BY member_id
    `, [startDate, endDate]);

    const shareCapMap = {};
    shareCapRes.rows.forEach(sc => {
      shareCapMap[sc.member_id] = parseFloat(sc.total_share_deposit || 0);
    });

    // Group by member to form collection matrix rows matching paper form
    const memberMap = {};

    result.rows.forEach(r => {
      const mId = r.member_id;
      if (!memberMap[mId]) {
        const midInitial = r.middle_name ? `${r.middle_name.trim().charAt(0)}.` : '';
        memberMap[mId] = {
          member_id: r.member_id,
          member_no: r.member_no || 'N/A',
          name: `${r.last_name.toUpperCase()}, ${r.first_name.toUpperCase()} ${midInitial}`.trim(),
          calamity_int: 0,
          calamity_principal: 0,
          emer_int: 0,
          emer_principal: 0,
          ce_int: 0,
          ce_principal: 0,
          so_int: 0,
          so_principal: 0,
          rice_int: 0,
          rice_principal: 0,
          reg_int: 0,
          reg_principal: 0,
          fines: 0,
          fixed_deposit: shareCapMap[mId] || 0, // Real Share Capital / Investment contribution
          total: 0
        };
      }

      const row = memberMap[mId];
      const pName = (r.product_name || '').toLowerCase();
      const pDue = Math.max(0, parseFloat(r.principal_due) - parseFloat(r.principal_paid));
      const iDue = Math.max(0, parseFloat(r.interest_due) - parseFloat(r.interest_paid));
      const finesDue = (parseFloat(r.fines_due) || 0) + (parseFloat(r.overdue_fine) || 0);

      row.fines += finesDue;

      if (pName.includes('calamity')) {
        row.calamity_int += iDue;
        row.calamity_principal += pDue;
      } else if (pName.includes('emergency') || pName.includes('emer')) {
        row.emer_int += iDue;
        row.emer_principal += pDue;
      } else if (pName.includes('cash express') || pName.includes('ce') || pName.includes('stl')) {
        row.ce_int += iDue;
        row.ce_principal += pDue;
      } else if (pName.includes('special occasion') || pName.includes('so')) {
        row.so_int += iDue;
        row.so_principal += pDue;
      } else if (pName.includes('utility') || pName.includes('rice') || pName.includes('sc')) {
        row.rice_int += iDue;
        row.rice_principal += pDue;
      } else {
        row.reg_int += iDue;
        row.reg_principal += pDue;
      }

      row.total = row.calamity_int + row.calamity_principal +
                  row.emer_int + row.emer_principal +
                  row.ce_int + row.ce_principal +
                  row.so_int + row.so_principal +
                  row.rice_int + row.rice_principal +
                  row.reg_int + row.reg_principal +
                  row.fines + row.fixed_deposit;
    });

    const collectionList = Object.values(memberMap);

    // Calculate grand column totals
    const grandTotals = {
      calamity_int: 0,
      calamity_principal: 0,
      emer_int: 0,
      emer_principal: 0,
      ce_int: 0,
      ce_principal: 0,
      so_int: 0,
      so_principal: 0,
      rice_int: 0,
      rice_principal: 0,
      reg_int: 0,
      reg_principal: 0,
      fines: 0,
      fixed_deposit: 0,
      grand_total: 0
    };

    collectionList.forEach(item => {
      grandTotals.calamity_int += item.calamity_int;
      grandTotals.calamity_principal += item.calamity_principal;
      grandTotals.emer_int += item.emer_int;
      grandTotals.emer_principal += item.emer_principal;
      grandTotals.ce_int += item.ce_int;
      grandTotals.ce_principal += item.ce_principal;
      grandTotals.so_int += item.so_int;
      grandTotals.so_principal += item.so_principal;
      grandTotals.rice_int += item.rice_int;
      grandTotals.rice_principal += item.rice_principal;
      grandTotals.reg_int += item.reg_int;
      grandTotals.reg_principal += item.reg_principal;
      grandTotals.fines += item.fines;
      grandTotals.fixed_deposit += item.fixed_deposit;
      grandTotals.grand_total += item.total;
    });

    res.status(200).json({
      success: true,
      period: {
        start_date: startDate,
        end_date: endDate
      },
      summary: grandTotals,
      data: collectionList
    });
  } catch (error) {
    next(error);
  }
};
