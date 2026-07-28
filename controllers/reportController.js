import { query } from '../config/db.js';
import pool from '../config/db.js';
import { exportToExcel } from '../services/reportExporter.js';
import XLSX from 'xlsx';
import fs from 'fs';

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

// ==========================================
// 5. EXCEL DATA IMPORT ledgers
// ==========================================

// @desc    Import member accounts and ledgers from Excel
// @route   POST /api/reports/import-excel
// @access  Protected (Admin, Staff)
export const importExcelLedger = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: { message: 'No spreadsheet file uploaded.' }
    });
  }

  // ── Shared helpers ──────────────────────────────────────────────────────────

  // SheetJS returns numbers for dates (Excel serial); convert to JS Date.
  const serialToDate = (serial) => {
    if (!serial && serial !== 0) return null;
    const date = XLSX.SSF.parse_date_code(serial);
    if (!date) return null;
    return new Date(date.y, date.m - 1, date.d);
  };

  const cleanAmount = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const p = parseFloat(val.replace(/[^0-9.-]/g, ''));
      return isNaN(p) ? 0 : p;
    }
    return 0;
  };

  const cleanStr = (val) => (val !== undefined && val !== null ? String(val).trim() : '');

  // Get a cell value by 0-based (row, col) from a SheetJS sheet.
  // SheetJS cell addresses are like 'A1', 'B3'. Row/col are 0-based here.
  const cellVal = (sheet, row, col) => {
    const addr = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = sheet[addr];
    if (!cell) return undefined;
    // Return raw value (v); 'w' is formatted text
    return cell.v;
  };

  const cellDate = (sheet, row, col) => {
    const addr = XLSX.utils.encode_cell({ r: row, c: col });
    const cell = sheet[addr];
    if (!cell) return null;
    if (cell.t === 'd') return cell.v instanceof Date ? cell.v : new Date(cell.v);
    if (cell.t === 'n') return serialToDate(cell.v);
    if (cell.t === 's') {
      const d = new Date(cell.v);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  // ── Read workbook from disk (streaming, low RAM) ─────────────────────────────
  let workbook;
  try {
    workbook = XLSX.readFile(req.file.path, {
      type: 'file',
      cellDates: true,   // parse date serials into JS Date automatically
      cellNF: false,     // skip number formats
      cellStyles: false, // skip styles — huge RAM saving
      sheetStubs: false  // skip empty cell stubs
    });
  } catch (parseErr) {
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    return res.status(400).json({
      success: false,
      error: { message: `Could not read spreadsheet: ${parseErr.message}` }
    });
  }

  const dryRun = req.query.dryRun === 'true';
  const client = await pool.connect();

  try {
    // ── DRY RUN: parse only, no DB writes ──────────────────────────────────────
    if (dryRun) {
      const parsedMembers = [];

      for (const sheetName of workbook.SheetNames) {
        // Member sheets are named "LASTNAME,FIRSTNAME" — skip any without a comma
        if (!sheetName.includes(',')) continue;

        const sheet = workbook.Sheets[sheetName];
        if (!sheet || !sheet['!ref']) continue;
        const range = XLSX.utils.decode_range(sheet['!ref']);

        // Use sheet tab name as the authoritative member name
        const nameParts = sheetName.split(',');
        const lastName  = nameParts[0].trim();
        const firstName = nameParts[1] ? nameParts[1].trim() : '';
        if (!lastName || !firstName) continue;

        // J2 = row 1, col 9  |  N2 = row 1, col 13
        const birthDateRaw = cellDate(sheet, 1, 9);
        const phoneRaw     = cellVal(sheet, 1, 13);
        let phone = phoneRaw ? String(phoneRaw).replace(/[^0-9]/g, '') : '';
        if (phone.length > 11) phone = phone.slice(0, 11);

        const memberInfo = {
          firstName, lastName,
          birthDate: birthDateRaw ? birthDateRaw.toISOString().split('T')[0] : null,
          phone,
          shareCapitalCount: 0,
          shareCapitalSum:   0,
          loans: []
        };

        let currentLoan = null;

        // Data rows start at row index 3 (row 4 in Excel, 0-based)
        for (let r = 3; r <= range.e.r; r++) {
          const scAmount     = cleanAmount(cellVal(sheet, r, 2));  // col C
          const amountLoaned = cleanAmount(cellVal(sheet, r, 5));  // col F
          const lafNo        = cleanStr(cellVal(sheet, r, 4));     // col E
          const termsRaw     = cellVal(sheet, r, 7);              // col H

          if (scAmount > 0) {
            memberInfo.shareCapitalCount++;
            memberInfo.shareCapitalSum += scAmount;
          }

          if (amountLoaned > 0 && lafNo) {
            currentLoan = {
              lafNo, amount: amountLoaned,
              termMonths: termsRaw ? parseInt(String(termsRaw), 10) : 12,
              paymentsCount: 0
            };
            memberInfo.loans.push(currentLoan);
          }

          const amountPaid    = cleanAmount(cellVal(sheet, r, 15)); // col P
          const principalPaid = cleanAmount(cellVal(sheet, r, 14)); // col O
          const interestPaid  = cleanAmount(cellVal(sheet, r, 13)); // col N

          if (currentLoan && (amountPaid > 0 || principalPaid > 0 || interestPaid > 0)) {
            currentLoan.paymentsCount++;
          }
        }

        parsedMembers.push(memberInfo);
      }

      client.release();
      return res.status(200).json({
        success: true,
        dryRun: true,
        summary: { members: parsedMembers, membersCount: parsedMembers.length }
      });
    }

    // ── COMMIT: persist to database ────────────────────────────────────────────
    await client.query('BEGIN');

    let membersImported           = 0;
    let shareTransactionsImported = 0;
    let loansImported             = 0;
    let paymentsImported          = 0;

    for (const sheetName of workbook.SheetNames) {
      // Member sheets are named "LASTNAME,FIRSTNAME" — skip any without a comma
      if (!sheetName.includes(',')) continue;

      const sheet = workbook.Sheets[sheetName];
      if (!sheet || !sheet['!ref']) continue;
      const range = XLSX.utils.decode_range(sheet['!ref']);

      // Use sheet tab name as the authoritative member name
      const nameParts = sheetName.split(',');
      const lastName  = nameParts[0].trim();
      const firstName = nameParts[1] ? nameParts[1].trim() : '';
      if (!lastName || !firstName) continue;

      const birthDateRaw = cellDate(sheet, 1, 9);
      const phoneRaw     = cellVal(sheet, 1, 13);
      let phone = phoneRaw ? String(phoneRaw).replace(/[^0-9]/g, '') : '';
      if (phone.length > 11) phone = phone.slice(0, 11);


      // Find or create member record only — no user account is created on import.
      // Members imported from Excel are ledger records; they register themselves
      // separately if they need portal access.
      let memberId;
      const memberCheck = await client.query(
        `SELECT id FROM members WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2) LIMIT 1`,
        [firstName, lastName]
      );
      if (memberCheck.rowCount > 0) {
        memberId = memberCheck.rows[0].id;
      } else {
        const insertMemberRes = await client.query(
          `INSERT INTO members (user_id, first_name, last_name, email, phone, date_of_birth, status)
           VALUES (NULL, $1, $2, $3, $4, $5, 'active') RETURNING id`,
          [firstName, lastName, null, phone || null, birthDateRaw]
        );
        memberId = insertMemberRes.rows[0].id;
        membersImported++;
      }

      let currentLoanId = null;
      let currentInstallmentNumber = 1;

      for (let r = 3; r <= range.e.r; r++) {
        // ── Share Capital ──
        const scDate    = cellDate(sheet, r, 0);             // col A
        const scInvoice = cleanStr(cellVal(sheet, r, 1));    // col B
        const scAmount  = cleanAmount(cellVal(sheet, r, 2)); // col C

        if (scAmount > 0) {
          const scTransDate = scDate || new Date();
          const dupSc = await client.query(
            `SELECT id FROM share_capital_transactions
             WHERE member_id = $1 AND amount = $2 AND transaction_date = $3 AND remarks LIKE $4`,
            [memberId, scAmount, scTransDate, `%LAF/Inv: ${scInvoice}%`]
          );
          if (dupSc.rowCount === 0) {
            const balCheck = await client.query(
              `SELECT COALESCE(SUM(CASE WHEN transaction_type='credit' THEN amount ELSE -amount END),0) AS current_balance
               FROM share_capital_transactions WHERE member_id=$1 AND status='completed'`,
              [memberId]
            );
            const balanceAfter = parseFloat(balCheck.rows[0].current_balance) + scAmount;
            await client.query(
              `INSERT INTO share_capital_transactions (member_id,transaction_type,amount,balance_after,transaction_date,remarks,status)
               VALUES ($1,'credit',$2,$3,$4,$5,'completed')`,
              [memberId, scAmount, balanceAfter, scTransDate, `Imported from Excel - LAF/Inv: ${scInvoice}`]
            );
            shareTransactionsImported++;
          }
        }

        // ── Loan header ──
        const loanDate     = cellDate(sheet, r, 3);              // col D
        const lafNo        = cleanStr(cellVal(sheet, r, 4));     // col E
        const amountLoaned = cleanAmount(cellVal(sheet, r, 5));  // col F
        const mode         = cleanStr(cellVal(sheet, r, 6));     // col G
        const termsRaw     = cellVal(sheet, r, 7);               // col H
        const endTerm      = cellDate(sheet, r, 8);              // col I

        // ── Repayment fields ──
        const interestDue   = cleanAmount(cellVal(sheet, r, 9));  // col J
        const principalDue  = cleanAmount(cellVal(sheet, r, 10)); // col K
        const monthlyDue    = cleanAmount(cellVal(sheet, r, 11)); // col L
        const interestPaid  = cleanAmount(cellVal(sheet, r, 13)); // col N
        const principalPaid = cleanAmount(cellVal(sheet, r, 14)); // col O
        const amountPaid    = cleanAmount(cellVal(sheet, r, 15)); // col P
        const invoiceNo     = cleanStr(cellVal(sheet, r, 18));    // col S
        const payDateRaw    = cellDate(sheet, r, 19);             // col T
        const payDate       = payDateRaw || loanDate || new Date();

        if (amountLoaned > 0 && lafNo) {
          const termsVal     = termsRaw ? parseInt(String(termsRaw), 10) : 12;
          const maturityDate = endTerm || new Date(new Date(loanDate).setMonth(new Date(loanDate).getMonth() + termsVal));

          const dupLoan = await client.query(
            `SELECT id FROM loans WHERE member_id=$1 AND principal_amount=$2 AND disbursed_at=$3`,
            [memberId, amountLoaned, loanDate]
          );
          if (dupLoan.rowCount > 0) {
            currentLoanId = dupLoan.rows[0].id;
          } else {
            const prodRes = await client.query('SELECT id FROM loan_products WHERE is_active=true LIMIT 1');
            const productId = prodRes.rowCount > 0 ? prodRes.rows[0].id : null;
            const insertLoanRes = await client.query(
              `INSERT INTO loans (member_id,loan_product_id,principal_amount,interest_rate,term_months,amortization_type,status,disbursed_at,maturity_date,co_maker_name)
               VALUES ($1,$2,$3,0.02,$4,'flat_rate','disbursed',$5,$6,$7) RETURNING id`,
              [memberId, productId, amountLoaned, termsVal, loanDate, maturityDate, lafNo]
            );
            currentLoanId = insertLoanRes.rows[0].id;
            loansImported++;
          }
          currentInstallmentNumber = 1;
        }

        if (currentLoanId && (amountPaid > 0 || principalPaid > 0 || interestPaid > 0)) {
          const paymentAmount = amountPaid || (principalPaid + interestPaid);
          const payReference  = invoiceNo || lafNo || 'EXCEL';

          const dupPay = await client.query(
            `SELECT id FROM loan_payments WHERE loan_id=$1 AND amount=$2 AND reference_no=$3`,
            [currentLoanId, paymentAmount, payReference]
          );
          let paymentId;
          if (dupPay.rowCount > 0) {
            paymentId = dupPay.rows[0].id;
          } else {
            const insertPayRes = await client.query(
              `INSERT INTO loan_payments (loan_id,amount,payment_date,payment_method,reference_no)
               VALUES ($1,$2,$3,$4,$5) RETURNING id`,
              [currentLoanId, paymentAmount, payDate, mode || 'HAND-IN', payReference]
            );
            paymentId = insertPayRes.rows[0].id;
            paymentsImported++;
          }

          const dupSchedule = await client.query(
            `SELECT id FROM repayment_schedules WHERE loan_id=$1 AND installment_number=$2`,
            [currentLoanId, currentInstallmentNumber]
          );
          let scheduleId;
          if (dupSchedule.rowCount > 0) {
            scheduleId = dupSchedule.rows[0].id;
            await client.query(
              `UPDATE repayment_schedules
               SET principal_paid=principal_paid+$1, interest_paid=interest_paid+$2, status='paid'
               WHERE id=$3`,
              [principalPaid, interestPaid, scheduleId]
            );
          } else {
            const insertScheduleRes = await client.query(
              `INSERT INTO repayment_schedules (loan_id,installment_number,due_date,principal_due,interest_due,total_due,principal_paid,interest_paid,status)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'paid') RETURNING id`,
              [
                currentLoanId, currentInstallmentNumber,
                loanDate || payDate,
                principalDue || (paymentAmount / 1.02),
                interestDue  || (paymentAmount * 0.02),
                monthlyDue   || paymentAmount,
                principalPaid, interestPaid
              ]
            );
            scheduleId = insertScheduleRes.rows[0].id;
          }

          const dupAlloc = await client.query(
            `SELECT id FROM loan_payment_allocations WHERE loan_payment_id=$1 AND repayment_schedule_id=$2`,
            [paymentId, scheduleId]
          );
          if (dupAlloc.rowCount === 0) {
            await client.query(
              `INSERT INTO loan_payment_allocations (loan_payment_id,repayment_schedule_id,principal_allocated,interest_allocated)
               VALUES ($1,$2,$3,$4)`,
              [paymentId, scheduleId, principalPaid, interestPaid]
            );
          }

          currentInstallmentNumber++;
        }
      }
    }

    // Mark fully paid loans
    await client.query(`
      UPDATE loans l SET status='fully_paid'
      WHERE status='disbursed'
        AND NOT EXISTS (
          SELECT 1 FROM repayment_schedules rs
          WHERE rs.loan_id=l.id AND rs.status != 'paid'
        )
    `);

    await client.query('COMMIT');
    res.status(200).json({
      success: true,
      message: 'Excel spreadsheet parsed and imported successfully.',
      summary: {
        members_created:            membersImported,
        share_transactions_created: shareTransactionsImported,
        loans_created:              loansImported,
        payments_created:           paymentsImported
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
  }
};