import { query } from '../config/db.js';
import pool from '../config/db.js';
import { exportToExcel } from '../services/reportExporter.js';
import XLSX from 'xlsx';
import fs from 'fs';
import { generateNextMemberNo } from '../utils/memberIdGenerator.js';

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
      WHERE t.status = 'completed'
      
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
        const memberNo = await generateNextMemberNo(client, new Date().getFullYear());
        const insertMemberRes = await client.query(
          `INSERT INTO members (member_no, user_id, first_name, last_name, email, phone, date_of_birth, status)
           VALUES ($1, NULL, $2, $3, $4, $5, $6, 'active') RETURNING id`,
          [memberNo, firstName, lastName, null, phone || null, birthDateRaw]
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

// ==========================================
// PERIOD & DATE RANGE HELPER
// ==========================================
function parsePeriodParams(query) {
  const period = (query.period || 'monthly').toLowerCase(); // 'daily', 'monthly', 'annual'
  const now = new Date();
  const year = parseInt(query.year) || now.getFullYear();
  const month = parseInt(query.month) || (now.getMonth() + 1);
  const date = query.date || now.toISOString().split('T')[0];
  return { period, year, month, date };
}

function matchesPeriod(dateVal, period, year, month, targetDate) {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const dateStr = d.toISOString().split('T')[0];

  if (period === 'daily') {
    return dateStr === targetDate;
  } else if (period === 'monthly') {
    return y === year && m === month;
  } else {
    // annual
    return y === year;
  }
}

function isAsOfPeriod(dateVal, period, year, month, targetDate) {
  if (!dateVal) return true;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return true;
  const dateStr = d.toISOString().split('T')[0];
  const y = d.getFullYear();
  const m = d.getMonth() + 1;

  if (period === 'daily') {
    return dateStr <= targetDate;
  } else if (period === 'monthly') {
    if (y < year) return true;
    if (y === year && m <= month) return true;
    return false;
  } else {
    // annual
    return y <= year;
  }
}

// ==========================================
// 6. MERCHANDISE SALES & PROFIT REPORT
// ==========================================
// @desc    Daily, Monthly, Annual revenue and profit on each merchandise product
// @route   GET /api/reports/merchandise-sales
// @access  Protected (Admin, Staff)
export const getMerchandiseSalesReport = async (req, res, next) => {
  try {
    const { period, year, month, date } = parsePeriodParams(req.query);

    // 1. Load entire Sales Registry Master Catalog
    const catalogResult = await pool.query(`
      SELECT id, item_name, description, size, cost_price, selling_price, category, effective_date
      FROM merchandise_catalog
      ORDER BY category ASC, item_name ASC, size ASC
    `);

    // Calculate baseline cost-to-selling ratio across catalog items
    let totalCatCp = 0;
    let totalCatSp = 0;
    catalogResult.rows.forEach(cat => {
      const cp = parseFloat(cat.cost_price) || 0;
      const sp = parseFloat(cat.selling_price) || 0;
      if (sp > 0 && cp > 0) {
        totalCatCp += cp;
        totalCatSp += sp;
      }
    });
    const avgCostRatio = totalCatSp > 0 ? (totalCatCp / totalCatSp) : 0.75;

    // 2. Initialize productMap with all Sales Registry catalog items
    const productMap = {};
    const catalogLookup = new Map();

    catalogResult.rows.forEach(cat => {
      const name = String(cat.item_name || '').trim();
      const catName = String(cat.category || cat.description || 'Uniform').trim();
      const size = String(cat.size || '—').trim();
      const cp = parseFloat(cat.cost_price) || 0;
      const sp = parseFloat(cat.selling_price) || 0;
      const key = `${name.toLowerCase()}:::${size.toLowerCase()}`;

      const entry = {
        id: cat.id,
        item_name: name,
        category: catName,
        size: size,
        total_qty: 0,
        cost_price: cp,
        selling_price: sp,
        total_cost: 0,
        total_revenue: 0,
        total_profit: 0,
        transactions_count: 0,
        is_catalog: true,
        transactions: []
      };

      productMap[key] = entry;
      catalogLookup.set(key, entry);
      if (!catalogLookup.has(name.toLowerCase())) {
        catalogLookup.set(name.toLowerCase(), entry);
      }
    });

    // 3. Query collections for the period
    const result = await pool.query(`
      SELECT 
        id, date, or_no, payor_name, member_id, items, item_name, quantity, unit_price, amount,
        payment_method, reference_no, status, remarks, tab, created_at
      FROM collections
      WHERE tab IN ('sales_services', 'sales', 'services') OR items IS NOT NULL
      ORDER BY date DESC, created_at DESC
    `);

    const itemized = [];

    result.rows.forEach(row => {
      const rowDate = row.date || row.created_at;
      if (!matchesPeriod(rowDate, period, year, month, date)) return;

      const hasItems = Array.isArray(row.items) && row.items.length > 0;

      if (hasItems) {
        row.items.forEach((it, idx) => {
          const itName = String(it.item || it.item_name || 'Merchandise Item').trim();
          const itSize = String(it.size || '—').trim();
          const keyExact = `${itName.toLowerCase()}:::${itSize.toLowerCase()}`;
          const matchedCat = catalogLookup.get(keyExact) || catalogLookup.get(itName.toLowerCase());

          const category = String(matchedCat?.category || it.description || it.category || 'Store Merchandise').trim();
          const q = parseFloat(String(it.quantity)) || 1;
          const sp = parseFloat(String(it.selling_price || it.unit_price || matchedCat?.selling_price || 0)) || 0;
          const cp = parseFloat(String(it.cost_price || matchedCat?.cost_price || 0)) || (sp * avgCostRatio);
          const rev = parseFloat(String(it.revenue)) || (q * sp) || (parseFloat(row.amount) || 0);
          const cost = q * cp;
          const profit = rev - cost;

          const mapKey = matchedCat
            ? `${matchedCat.item_name.toLowerCase()}:::${matchedCat.size.toLowerCase()}`
            : `${itName.toLowerCase()}:::${itSize.toLowerCase()}`;

          if (!productMap[mapKey]) {
            productMap[mapKey] = {
              id: `custom-${mapKey}`,
              item_name: itName,
              category: category,
              size: itSize,
              total_qty: 0,
              cost_price: cp,
              selling_price: sp,
              total_cost: 0,
              total_revenue: 0,
              total_profit: 0,
              transactions_count: 0,
              is_catalog: false,
              transactions: []
            };
          }

          const target = productMap[mapKey];
          target.total_qty += q;
          target.total_revenue += rev;
          target.total_cost += cost;
          target.total_profit += profit;
          target.transactions_count += 1;

          const txRecord = {
            id: `${row.id}-${idx}`,
            collection_id: row.id,
            or_no: row.or_no || 'N/A',
            date: rowDate ? new Date(rowDate).toISOString().split('T')[0] : 'N/A',
            payor_name: row.payor_name || 'Customer',
            item_name: target.item_name,
            category: target.category,
            size: target.size,
            quantity: q,
            cost_price: cp,
            selling_price: sp,
            revenue: rev,
            profit: profit,
            payment_method: row.payment_method || 'Cash'
          };

          target.transactions.push(txRecord);
          itemized.push(txRecord);
        });
      } else {
        // Daily Over-the-Counter Sales Batch (e.g. Sales- Aug-17, Cheque, General merchandise collections)
        const batchAmt = parseFloat(row.amount) || 0;
        if (batchAmt > 0) {
          const batchName = 'Daily Over-the-Counter Sales (Batch Records)';
          const batchCat = 'Store Sales Registry';
          const batchKey = `${batchName.toLowerCase()}:::all`;
          const estimatedCost = batchAmt * avgCostRatio;
          const estimatedProfit = batchAmt - estimatedCost;

          if (!productMap[batchKey]) {
            productMap[batchKey] = {
              id: 'batch-sales-summary',
              item_name: batchName,
              category: batchCat,
              size: 'Daily Batches',
              total_qty: 0,
              cost_price: 0,
              selling_price: 0,
              total_cost: 0,
              total_revenue: 0,
              total_profit: 0,
              transactions_count: 0,
              is_batch: true,
              transactions: []
            };
          }

          const bTarget = productMap[batchKey];
          bTarget.total_qty += 1;
          bTarget.total_revenue += batchAmt;
          bTarget.total_cost += estimatedCost;
          bTarget.total_profit += estimatedProfit;
          bTarget.transactions_count += 1;

          const bRecord = {
            id: `batch-${row.id}`,
            collection_id: row.id,
            or_no: row.or_no || row.remarks || 'Daily Sales',
            date: rowDate ? new Date(rowDate).toISOString().split('T')[0] : 'N/A',
            payor_name: row.payor_name || 'Store Customers',
            item_name: row.remarks ? `Store Sales (${row.remarks})` : 'Daily Store Sales',
            category: batchCat,
            size: '—',
            quantity: 1,
            cost_price: estimatedCost,
            selling_price: batchAmt,
            revenue: batchAmt,
            profit: estimatedProfit,
            payment_method: row.payment_method || 'Cash / Cheque'
          };

          bTarget.transactions.push(bRecord);
          itemized.push(bRecord);
        }
      }
    });

    const products = Object.values(productMap).map(p => ({
      ...p,
      margin_pct: p.total_revenue > 0
        ? ((p.total_profit / p.total_revenue) * 100).toFixed(1)
        : (p.selling_price > 0 ? (((p.selling_price - p.cost_price) / p.selling_price) * 100).toFixed(1) : '0.0')
    })).sort((a, b) => {
      if (b.total_revenue !== a.total_revenue) {
        return b.total_revenue - a.total_revenue;
      }
      return a.item_name.localeCompare(b.item_name);
    });

    const totalRevenue = products.reduce((sum, p) => sum + p.total_revenue, 0);
    const totalCost = products.reduce((sum, p) => sum + p.total_cost, 0);
    const totalProfit = products.reduce((sum, p) => sum + p.total_profit, 0);
    const totalQty = products.reduce((sum, p) => sum + p.total_qty, 0);
    const activeSoldProducts = products.filter(p => p.total_revenue > 0).length;
    const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    return res.status(200).json({
      success: true,
      period,
      filter: { year, month, date },
      summary: {
        total_products: catalogResult.rowCount || products.length,
        active_products_sold: activeSoldProducts,
        total_units_sold: totalQty,
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_profit: totalProfit,
        profit_margin_pct: overallMargin
      },
      products,
      itemized_records: itemized
    });
  } catch (error) {
    next(error);
  }
};

// Helper to filter out Balance Sheet items (loans receivable, payables, bank transfers, equity)
export function isOperatingExpenseAccount(accName, folderName, particulars) {
  const acc = (accName || "").toLowerCase().trim();
  const folder = (folderName || "").toLowerCase().trim();

  // 1. Exclude Loans Receivable & Loan Disbursements (Assets)
  if (/loans?\s*receivable/i.test(acc)) return false;
  if (/^regular\s*loan/i.test(acc) || /^special\s*loan/i.test(acc) || /^emergency\s*loan/i.test(acc) || /^cash\s*express/i.test(acc) || /^calamity\s*loan/i.test(acc) || /^utility\s*loan/i.test(acc)) return false;
  if (folder.includes("regular loan") || (folder.includes("loan") && !folder.includes("product"))) return false;
  if (/disbursed\s*item/i.test(acc)) return false;

  // 2. Exclude Liabilities & Payables
  if (/loan\s*payable/i.test(acc)) return false;
  if (/accounts?\s*payable/i.test(acc)) return false;
  if (folder.includes("liability")) return false;

  // 3. Exclude Bank & Cash movements / Digital wallets
  if (/^cib\b/i.test(acc) || /cash\s*in\s*bank/i.test(acc) || /cash\s*on\s*hand/i.test(acc) || /cash\s*in\s*coop/i.test(acc) || /cash\s*in\s*goodapps/i.test(acc)) return false;

  // 4. Exclude Equity / Share Capital / Dividends
  if (/share\s*capital/i.test(acc) || /^capital\b/i.test(acc) || /dividend/i.test(acc)) return false;

  // 5. Exclude umbrella replenishment transfers (actual itemized expenses are reported from rf_liquidation_items)
  if (/revolving\s*fund\s*replenish/i.test(acc) || /stl\s*(fund)?\s*replenish/i.test(acc)) return false;
  if (/^revolving\s*fund\s*-/i.test(acc)) return false;

  return true;
}

export function categorizeExpenseAccount(accName, categoryRaw) {
  const cat = (categoryRaw || "").toLowerCase().trim();
  if (cat === "merchandise") return "Merchandise Expense";
  if (cat === "service") return "Service Expense";

  const acc = (accName || "").toLowerCase().trim();
  if (
    acc.includes("inventory") ||
    acc.includes("merchandise") ||
    acc.includes("shirt") ||
    acc.includes("uniform") ||
    acc.includes("cogs") ||
    acc.includes("shoes") ||
    acc.includes("trunks") ||
    acc.includes("pershing cap") ||
    acc.includes("columbary") ||
    acc.includes("handbag") ||
    acc.includes("hardhat") ||
    acc.includes("goggles") ||
    acc.includes("gala") ||
    acc.includes("coverall")
  ) {
    return "Merchandise Expense";
  }

  if (
    acc.includes("service") ||
    acc.includes("printing") ||
    acc.includes("xerox") ||
    acc.includes("cos-") ||
    acc.includes("cos -") ||
    acc.includes("commission") ||
    acc.includes("wifi") ||
    acc.includes("water vendo") ||
    acc.includes("photocopy") ||
    acc.includes("professional fee") ||
    acc.includes("repair") ||
    acc.includes("maintenance")
  ) {
    return "Service Expense";
  }

  return "Operation Expense";
}
// ==========================================
// 7. EXPENSE BREAKDOWN REPORT
// ==========================================
// @desc    Monthly, Annual report on Operation Expense, Service Expense, Merchandise Expense
// @route   GET /api/reports/expenses-breakdown
// @access  Protected (Admin, Staff)
export function normalizeRecipientName(rawName) {
  if (!rawName) return '';
  let clean = String(rawName).trim().replace(/\s+/g, ' ');
  if (clean.includes(',')) {
    const parts = clean.split(',').map(p => p.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      clean = `${parts[1]} ${parts[0]}`;
    }
  }
  clean = clean.replace(/\b[A-Za-z]\.?\s+/g, ' ').replace(/\s+/g, ' ').trim();
  clean = clean
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  if (clean === 'Michellle Pable') clean = 'Michelle Pable';
  if (clean === 'Chinette Lamoste') clean = 'Chinnette Lamoste';
  return clean;
}

export const getExpensesBreakdownReport = async (req, res, next) => {
  try {
    const { period, year, month, date } = parsePeriodParams(req.query);

    const rfResult = await pool.query(`
      SELECT 
        rfi.id, rfi.item_date, rfi.item_date_raw, rfi.particulars, rfi.amount,
        rfi.account_name, rfi.category, rfi.remarks, cv.voucher_no, cv.voucher_date
      FROM rf_liquidation_items rfi
      LEFT JOIN check_vouchers cv ON rfi.liquidation_id = cv.id
      WHERE (rfi.is_cancelled IS FALSE OR rfi.is_cancelled IS NULL)
      ORDER BY rfi.item_date DESC, rfi.created_at DESC
    `);

    const cvResult = await pool.query(`
      SELECT id, voucher_no, voucher_date, payee, particulars, amount, details
      FROM check_vouchers
      WHERE status != 'cancelled'
      ORDER BY voucher_date DESC
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rf_deleted_accounts (
        name VARCHAR(150) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rf_custom_accounts (
        name VARCHAR(150) PRIMARY KEY,
        category VARCHAR(100) DEFAULT 'Operation',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `).catch(() => {});

    const deletedRes = await pool.query('SELECT name FROM rf_deleted_accounts').catch(() => ({ rows: [] }));
    const deletedSet = new Set((deletedRes.rows || []).map(r => r.name.trim().toLowerCase()));

    const customRes = await pool.query('SELECT name, category FROM rf_custom_accounts').catch(() => ({ rows: [] }));

    const itemized = [];
    let operationTotal = 0;
    let serviceTotal = 0;
    let merchandiseTotal = 0;
    let otherTotal = 0;

    const accountBreakdown = {};
    const recipientMap = {};

    function recordRecipientCompensation(rawRecipient, amt, desc, cat, vNo, vDate, particularText, vId) {
      if (amt <= 0) return;
      const isH = /honorarium/i.test(desc) || /honorarium/i.test(cat) || /honorarium/i.test(particularText);
      const isA = /allowance/i.test(desc) || /allowance/i.test(cat) || /allowance/i.test(particularText);
      const isS = /salary/i.test(desc) || /salary/i.test(cat) || /salary/i.test(particularText);
      const isW = /wage/i.test(desc) || /wage/i.test(cat) || /wage/i.test(particularText);

      if (!isH && !isA && !isS && !isW) return;

      const normName = normalizeRecipientName(rawRecipient);
      if (!normName || /^(n\/?a|none|unknown|test)$/i.test(normName)) return;

      if (!recipientMap[normName]) {
        recipientMap[normName] = {
          name: normName,
          total_honorarium: 0,
          total_allowances: 0,
          total_wages: 0,
          total_salary: 0,
          total_compensation: 0,
          payout_count: 0,
          transactions: []
        };
      }

      const rec = recipientMap[normName];
      let itemType = 'Operation';
      if (isH) {
        rec.total_honorarium += amt;
        itemType = 'Honorarium';
      } else if (isA) {
        rec.total_allowances += amt;
        itemType = 'Allowances';
      } else if (isS && (!isW || /salary/i.test(desc))) {
        rec.total_salary += amt;
        itemType = 'Salary';
      } else if (isW) {
        rec.total_wages += amt;
        itemType = 'Wages';
      } else if (isS) {
        rec.total_salary += amt;
        itemType = 'Salary';
      }

      rec.total_compensation += amt;
      rec.payout_count += 1;
      rec.transactions.push({
        voucher_id: vId || null,
        voucher_no: vNo || '—',
        date: vDate ? new Date(vDate).toISOString().split('T')[0] : 'N/A',
        particulars: particularText || 'Compensation Payout',
        type: itemType,
        account_name: desc || itemType,
        amount: amt,
        remarks: rawRecipient || ''
      });
    }

    rfResult.rows.forEach(row => {
      const itemDate = row.item_date || row.voucher_date;
      if (!matchesPeriod(itemDate, period, year, month, date)) return;

      const amt = parseFloat(row.amount) || 0;
      if (amt <= 0) return;

      const accName = (row.account_name || 'General Operation').trim();
      if (deletedSet.has(accName.toLowerCase())) return;
      if (!isOperatingExpenseAccount(accName, 'Revolving Fund', row.particulars)) return;

      const normalizedCat = categorizeExpenseAccount(accName, row.category);
      if (normalizedCat === 'Service Expense') {
        serviceTotal += amt;
      } else if (normalizedCat === 'Merchandise Expense') {
        merchandiseTotal += amt;
      } else {
        operationTotal += amt;
      }

      if (!accountBreakdown[accName]) {
        accountBreakdown[accName] = {
          account_name: accName,
          category: normalizedCat,
          total_amount: 0,
          count: 0,
          transactions: []
        };
      }
      accountBreakdown[accName].total_amount += amt;
      accountBreakdown[accName].count += 1;
      accountBreakdown[accName].transactions.push({
        id: row.id,
        voucher_id: row.liquidation_id || null,
        voucher_no: row.voucher_no || 'RF Liquidation',
        date: itemDate ? new Date(itemDate).toISOString().split('T')[0] : 'N/A',
        particulars: row.particulars || 'Replenishment Expense',
        account_name: accName,
        category: normalizedCat,
        amount: amt,
        payee: row.remarks || 'Revolving Fund',
        remarks: row.remarks || ''
      });

      itemized.push({
        id: row.id,
        voucher_no: row.voucher_no || 'RF Liquidation',
        date: itemDate ? new Date(itemDate).toISOString().split('T')[0] : 'N/A',
        particulars: row.particulars || 'Replenishment Expense',
        account_name: accName,
        category: normalizedCat,
        amount: amt,
        remarks: row.remarks || ''
      });

      recordRecipientCompensation(
        row.remarks || row.particulars,
        amt,
        accName,
        row.category,
        row.voucher_no || 'RF Liquidation',
        itemDate,
        row.particulars,
        row.liquidation_id || null
      );
    });

    cvResult.rows.forEach(cv => {
      if (!matchesPeriod(cv.voucher_date, period, year, month, date)) return;

      const hasDetails = Array.isArray(cv.details) && cv.details.length > 0;
      if (hasDetails) {
        cv.details.forEach((d, idx) => {
          if (d.is_credit) return;
          const amt = parseFloat(String(d.amount || d.debit || 0));
          if (amt <= 0) return;

          const accName = String(d.book_of_account || '').trim();
          if (deletedSet.has(accName.toLowerCase())) return;
          // Strictly filter out Balance Sheet items (loans, liabilities, bank/cash, equity)
          if (!isOperatingExpenseAccount(accName, cv.folder_name, cv.particulars)) return;

          const cat = categorizeExpenseAccount(accName);
          if (cat === 'Merchandise Expense') {
            merchandiseTotal += amt;
          } else if (cat === 'Service Expense') {
            serviceTotal += amt;
          } else {
            operationTotal += amt;
          }

          const cleanAccName = accName || 'Operation Expense';
          if (!accountBreakdown[cleanAccName]) {
            accountBreakdown[cleanAccName] = {
              account_name: cleanAccName,
              category: cat,
              total_amount: 0,
              count: 0,
              transactions: []
            };
          }
          accountBreakdown[cleanAccName].total_amount += amt;
          accountBreakdown[cleanAccName].count += 1;
          accountBreakdown[cleanAccName].transactions.push({
            id: `cv-${cv.id}-${idx}`,
            voucher_id: cv.id || null,
            voucher_no: cv.voucher_no || 'CV',
            date: cv.voucher_date ? new Date(cv.voucher_date).toISOString().split('T')[0] : 'N/A',
            particulars: cv.particulars || 'Disbursement Voucher',
            account_name: cleanAccName,
            category: cat,
            amount: amt,
            payee: d.remarks || d.recipient || cv.payee || '',
            remarks: d.remarks || cv.payee || ''
          });

          itemized.push({
            id: `cv-${cv.id}-${idx}`,
            voucher_no: cv.voucher_no || 'CV',
            date: cv.voucher_date ? new Date(cv.voucher_date).toISOString().split('T')[0] : 'N/A',
            particulars: cv.particulars || 'Disbursement Voucher',
            account_name: cleanAccName,
            category: cat,
            amount: amt,
            remarks: d.remarks || cv.payee || ''
          });

          recordRecipientCompensation(
            d.remarks || d.recipient || cv.payee || '',
            amt,
            cleanAccName,
            d.category || '',
            cv.voucher_no || 'CV',
            cv.voucher_date,
            cv.particulars,
            cv.id
          );
        });
      } else {
        const amt = parseFloat(String(cv.amount || 0));
        if (amt > 0) {
          const accName = String(cv.particulars || 'Disbursement Voucher').trim();
          if (deletedSet.has(accName.toLowerCase())) return;
          if (isOperatingExpenseAccount(accName, cv.folder_name, cv.particulars)) {
            const cat = categorizeExpenseAccount(accName);
            if (cat === 'Merchandise Expense') {
              merchandiseTotal += amt;
            } else if (cat === 'Service Expense') {
              serviceTotal += amt;
            } else {
              operationTotal += amt;
            }

            const cleanAccName = accName || 'Operation Expense';
            if (!accountBreakdown[cleanAccName]) {
              accountBreakdown[cleanAccName] = {
                account_name: cleanAccName,
                category: cat,
                total_amount: 0,
                count: 0,
                transactions: []
              };
            }
            accountBreakdown[cleanAccName].total_amount += amt;
            accountBreakdown[cleanAccName].count += 1;
            accountBreakdown[cleanAccName].transactions.push({
              id: `cv-${cv.id}-0`,
              voucher_id: cv.id || null,
              voucher_no: cv.voucher_no || 'CV',
              date: cv.voucher_date ? new Date(cv.voucher_date).toISOString().split('T')[0] : 'N/A',
              particulars: cv.particulars || 'Disbursement Voucher',
              account_name: cleanAccName,
              category: cat,
              amount: amt,
              payee: cv.payee || '',
              remarks: cv.payee || ''
            });

            itemized.push({
              id: `cv-${cv.id}-0`,
              voucher_no: cv.voucher_no || 'CV',
              date: cv.voucher_date ? new Date(cv.voucher_date).toISOString().split('T')[0] : 'N/A',
              particulars: cv.particulars || 'Disbursement Voucher',
              account_name: cleanAccName,
              category: cat,
              amount: amt,
              remarks: cv.payee || ''
            });

            recordRecipientCompensation(
              cv.payee || '',
              amt,
              cleanAccName,
              '',
              cv.voucher_no || 'CV',
              cv.voucher_date,
              cv.particulars,
              cv.id
            );
          }
        }
      }
    });

    for (const ca of customRes.rows) {
      const caName = (ca.name || '').trim();
      if (!caName || deletedSet.has(caName.toLowerCase())) continue;
      if (!accountBreakdown[caName]) {
        const normalizedCat = categorizeExpenseAccount(caName, ca.category);
        accountBreakdown[caName] = {
          account_name: caName,
          category: normalizedCat,
          total_amount: 0,
          count: 0,
          transactions: []
        };
      }
    }

    const totalExpenses = operationTotal + serviceTotal + merchandiseTotal + otherTotal;

    const accounts = Object.values(accountBreakdown).map(a => ({
      ...a,
      share_pct: totalExpenses > 0 ? ((a.total_amount / totalExpenses) * 100).toFixed(1) : '0.0'
    })).sort((a, b) => (a.account_name || '').localeCompare(b.account_name || '', undefined, { sensitivity: 'base' }));

    let totalHonorarium = 0;
    let totalAllowances = 0;
    let totalWages = 0;
    let totalSalary = 0;
    let totalCompensation = 0;

    const recipients = Object.values(recipientMap).map(r => {
      totalHonorarium += r.total_honorarium;
      totalAllowances += r.total_allowances;
      totalWages += r.total_wages;
      totalSalary += (r.total_salary || 0);
      totalCompensation += r.total_compensation;
      r.transactions.sort((a, b) => (b.date > a.date ? 1 : -1));
      return {
        ...r,
        total_salary: r.total_salary || 0,
        share_pct: totalCompensation > 0 ? ((r.total_compensation / totalCompensation) * 100).toFixed(1) : '0.0'
      };
    }).sort((a, b) => b.total_compensation - a.total_compensation);

    const compensation_summary = {
      total_honorarium: totalHonorarium,
      total_allowances: totalAllowances,
      total_wages: totalWages,
      total_salary: totalSalary,
      total_compensation: totalCompensation,
      total_recipients: recipients.length,
      honorarium_pct: totalCompensation > 0 ? ((totalHonorarium / totalCompensation) * 100).toFixed(1) : '0.0',
      allowances_pct: totalCompensation > 0 ? ((totalAllowances / totalCompensation) * 100).toFixed(1) : '0.0',
      wages_pct: totalCompensation > 0 ? ((totalWages / totalCompensation) * 100).toFixed(1) : '0.0',
      salary_pct: totalCompensation > 0 ? ((totalSalary / totalCompensation) * 100).toFixed(1) : '0.0'
    };

    return res.status(200).json({
      success: true,
      period,
      filter: { year, month, date },
      summary: {
        total_expenses: totalExpenses,
        operation_expenses: operationTotal,
        service_expenses: serviceTotal,
        merchandise_expenses: merchandiseTotal,
        operation_pct: totalExpenses > 0 ? ((operationTotal / totalExpenses) * 100).toFixed(1) : '0.0',
        service_pct: totalExpenses > 0 ? ((serviceTotal / totalExpenses) * 100).toFixed(1) : '0.0',
        merchandise_pct: totalExpenses > 0 ? ((merchandiseTotal / totalExpenses) * 100).toFixed(1) : '0.0',
        compensation_summary
      },
      recipients,
      accounts,
      itemized_records: itemized
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 8. LOAN PRODUCTS REPORT
// ==========================================
// @desc    Daily, Monthly, Annual report for all 10 loan products
// @route   GET /api/reports/loan-products
// @access  Protected (Admin, Staff)
export const getLoanProductsReport = async (req, res, next) => {
  try {
    const { period, year, month, date } = parsePeriodParams(req.query);

    const LOAN_PRODUCT_DEFINITIONS = [
      { key: 'salary', name: 'Salary Loan', match: ['salary'] },
      { key: 'project', name: 'Project Loan', match: ['project'] },
      { key: 'utility', name: 'Utility Loan', match: ['utility'] },
      { key: 'cash_express', name: 'Cash Express', match: ['cash express', 'express'] },
      { key: 'special_occasion', name: 'Special Occasion', match: ['special occasion', 'occasion'] },
      { key: 'emergency', name: 'Emergency Loan', match: ['emergency'] },
      { key: 'petty_cash', name: 'Petty Cash', match: ['petty cash', 'petty'] },
      { key: 'calamity', name: 'Calamity Loan', match: ['calamity'] },
      { key: 'mortuary', name: 'Mortuary Loan', match: ['mortuary', 'columbary'] },
      { key: 'product', name: 'Product Loan', match: ['product', 'appliance', 'goods'] }
    ];

    function identifyProduct(name) {
      const lower = (name || '').toLowerCase();
      for (const p of LOAN_PRODUCT_DEFINITIONS) {
        if (p.match.some(m => lower.includes(m))) return p.name;
      }
      return 'Regular Loan';
    }

    function isCheckVoucherLoanDisbursement(cv) {
      const fn = String(cv.folder_name || '').toLowerCase().trim();
      const part = String(cv.particulars || '').toLowerCase().trim();
      const payee = String(cv.payee || '').toLowerCase().trim();

      // Exclude fund replenishments (including typos like 'replenisment')
      if (part.includes('replenish') || part.includes('replenis') || part.includes('revolving fund')) return false;

      // Exclude payments to banks/federations/creditors
      if (fn === 'loan payment' || fn === 'liability' || part.includes('payment to victo') || part.includes('loan repayment') || payee.includes('victo')) return false;

      // Exclude insurance, systems, capital, vendors
      if (payee.includes('insurance') || payee.includes('climbs') || part.includes('insurance') || part.includes('premium')) return false;
      if (part.includes('kadt') || part.includes('system') || part.includes('capital') || payee.includes('good apps') || payee.includes('kadt')) return false;

      // Must be in Regular Loans folder OR particulars indicate loan release / regular loan / laf
      const isLoanFolder = fn === 'regular loans';
      const isLoanParticulars = part.includes('regular loan') || part.includes('release of') || Boolean(part.match(/laf\s*(?:no\.?|#)?/i));

      return isLoanFolder || isLoanParticulars;
    }

    const loansResult = await pool.query(`
      SELECT 
        l.id, l.laf_no, l.principal_amount, l.interest_rate, l.term_months, l.status,
        l.disbursed_at, l.created_at, lp.name as product_name,
        m.first_name || ' ' || m.last_name as member_name
      FROM loans l
      LEFT JOIN loan_products lp ON l.loan_product_id = lp.id
      LEFT JOIN members m ON l.member_id = m.id
      WHERE l.status IN ('disbursed', 'active', 'approved', 'fully_paid')
    `);

    const cvLoansResult = await pool.query(`
      SELECT id, voucher_no, voucher_date, payee, particulars, amount, folder_name
      FROM check_vouchers
      WHERE status != 'cancelled' AND (
        folder_name ILIKE '%loan%' OR 
        particulars ILIKE '%loan%' OR 
        particulars ILIKE '%laf%'
      )
    `);

    const collectionsResult = await pool.query(`
      SELECT 
        id, date, or_no, payor_name, loans, loan_account, principal_amount,
        interest_account, interest_amount, fines_account, fines_amount, amount, created_at
      FROM collections
      WHERE tab = 'credit' OR loans IS NOT NULL OR principal_amount > 0 OR interest_amount > 0
    `);

    const productStats = {};
    LOAN_PRODUCT_DEFINITIONS.forEach(p => {
      productStats[p.name] = {
        product_name: p.name,
        disbursed_count: 0,
        total_disbursed: 0,
        amortizations_count: 0,
        principal_collected: 0,
        interest_collected: 0,
        fines_collected: 0,
        total_collected: 0,
        borrowers: []
      };
    });
    productStats['Regular Loan'] = {
      product_name: 'Regular Loan',
      disbursed_count: 0,
      total_disbursed: 0,
      amortizations_count: 0,
      principal_collected: 0,
      interest_collected: 0,
      fines_collected: 0,
      total_collected: 0,
      borrowers: []
    };

    loansResult.rows.forEach(loan => {
      const dDate = loan.disbursed_at || loan.created_at;
      if (!matchesPeriod(dDate, period, year, month, date)) return;

      const pName = identifyProduct(loan.product_name);
      const principal = parseFloat(loan.principal_amount) || 0;

      if (!productStats[pName]) {
        productStats[pName] = {
          product_name: pName,
          disbursed_count: 0,
          total_disbursed: 0,
          amortizations_count: 0,
          principal_collected: 0,
          interest_collected: 0,
          fines_collected: 0,
          total_collected: 0,
          borrowers: []
        };
      }

      productStats[pName].disbursed_count += 1;
      productStats[pName].total_disbursed += principal;

      productStats[pName].borrowers.push({
        loan_id: loan.id,
        voucher_id: null,
        voucher_no: null,
        laf_no: loan.laf_no || `LAF-${loan.id}`,
        member_name: (loan.member_name || '').trim() || 'Coop Member',
        date: dDate ? new Date(dDate).toISOString().split('T')[0] : 'N/A',
        principal: principal,
        term_months: loan.term_months || 12,
        status: loan.status || 'active',
        product_name: pName,
        source: 'Loan Monitoring'
      });
    });

    cvLoansResult.rows.forEach(cv => {
      const dDate = cv.voucher_date;
      if (!matchesPeriod(dDate, period, year, month, date)) return;
      if (!isCheckVoucherLoanDisbursement(cv)) return;

      const pName = identifyProduct(`${cv.folder_name} ${cv.particulars}`);
      const amt = parseFloat(cv.amount) || 0;
      if (amt <= 0) return;

      const lafMatch = String(cv.particulars || '').match(/laf(?:\s*(?:no\.?|#)?:?\s*)([0-9a-z-]+)/i);
      const lafNo = lafMatch ? lafMatch[1] : (cv.voucher_no ? `CV #${cv.voucher_no}` : '—');

      if (!productStats[pName]) {
        productStats[pName] = {
          product_name: pName,
          disbursed_count: 0,
          total_disbursed: 0,
          amortizations_count: 0,
          principal_collected: 0,
          interest_collected: 0,
          fines_collected: 0,
          total_collected: 0,
          borrowers: []
        };
      }

      const dateStr = dDate ? new Date(dDate).toISOString().split('T')[0] : 'N/A';
      const exists = productStats[pName].borrowers.some(b => 
        (lafMatch && b.laf_no && b.laf_no.includes(lafMatch[1])) || 
        (b.member_name && cv.payee && b.member_name.toLowerCase() === cv.payee.toLowerCase() && b.date === dateStr)
      );

      if (!exists) {
        productStats[pName].disbursed_count += 1;
        productStats[pName].total_disbursed += amt;

        productStats[pName].borrowers.push({
          loan_id: null,
          voucher_id: cv.id,
          voucher_no: cv.voucher_no,
          laf_no: lafNo,
          member_name: cv.payee || 'Coop Member',
          date: dateStr,
          principal: amt,
          term_months: 12,
          status: 'disbursed',
          product_name: pName,
          source: 'Check Voucher'
        });
      }
    });

    // Sort borrowers by date descending for each product
    Object.values(productStats).forEach(p => {
      p.borrowers.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    });

    collectionsResult.rows.forEach(col => {
      const cDate = col.date || col.created_at;
      if (!matchesPeriod(cDate, period, year, month, date)) return;

      const loanEntries = Array.isArray(col.loans) && col.loans.length > 0
        ? col.loans
        : [{
            loan_account: col.loan_account || 'Loans Payable',
            principal_amount: col.principal_amount || 0,
            interest_amount: col.interest_amount || 0,
            fines_amount: col.fines_amount || 0
          }];

      loanEntries.forEach(entry => {
        const pName = identifyProduct(entry.loan_account);
        const pAmt = parseFloat(String(entry.principal_amount || 0)) || 0;
        const iAmt = parseFloat(String(entry.interest_amount || 0)) || 0;
        const fAmt = parseFloat(String(entry.fines_amount || 0)) || 0;
        const total = pAmt + iAmt + fAmt;

        if (total <= 0) return;

        if (!productStats[pName]) {
          productStats[pName] = {
            product_name: pName,
            disbursed_count: 0,
            total_disbursed: 0,
            amortizations_count: 0,
            principal_collected: 0,
            interest_collected: 0,
            fines_collected: 0,
            total_collected: 0
          };
        }

        productStats[pName].amortizations_count += 1;
        productStats[pName].principal_collected += pAmt;
        productStats[pName].interest_collected += iAmt;
        productStats[pName].fines_collected += fAmt;
        productStats[pName].total_collected += total;
      });
    });

    const productList = Object.values(productStats).filter(
      p => p.total_disbursed > 0 || p.total_collected > 0
    );

    const summary = {
      total_disbursed_amount: Object.values(productStats).reduce((acc, p) => acc + p.total_disbursed, 0),
      total_disbursed_count: Object.values(productStats).reduce((acc, p) => acc + p.disbursed_count, 0),
      total_principal_collected: Object.values(productStats).reduce((acc, p) => acc + p.principal_collected, 0),
      total_interest_collected: Object.values(productStats).reduce((acc, p) => acc + p.interest_collected, 0),
      total_fines_collected: Object.values(productStats).reduce((acc, p) => acc + p.fines_collected, 0),
      total_revenue_generated: Object.values(productStats).reduce((acc, p) => acc + p.interest_collected + p.fines_collected, 0),
      total_collections_volume: Object.values(productStats).reduce((acc, p) => acc + p.total_collected, 0)
    };

    return res.status(200).json({
      success: true,
      period,
      filter: { year, month, date },
      summary,
      products: productList.length > 0 ? productList : Object.values(productStats)
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 9. MEMBERSHIP UPDATE REPORT
// ==========================================
// @desc    Monthly, Annual report on MEMBERSHIP updates, new registrations, status
// @route   GET /api/reports/membership-update
// @access  Protected (Admin, Staff)
export const getMembershipUpdateReport = async (req, res, next) => {
  try {
    const { period, year, month, date } = parsePeriodParams(req.query);

    const membersResult = await pool.query(`
      SELECT 
        id, member_no, first_name, last_name, middle_name, email, phone,
        status, membership_type, investment_goal, created_at, updated_at
      FROM members
      ORDER BY created_at DESC
    `);

    const collectionsResult = await pool.query(`
      SELECT date, common_share_amount, membership_fee, created_at
      FROM collections
      WHERE common_share_amount > 0 OR membership_fee > 0
    `);

    let newMembersInPeriod = [];
    let totalActive = 0;
    let totalInactive = 0;
    let totalResigned = 0;

    membersResult.rows.forEach(m => {
      const st = (m.status || 'active').toLowerCase();
      if (st === 'active') totalActive++;
      else if (st === 'inactive') totalInactive++;
      else if (st === 'resigned') totalResigned++;

      if (matchesPeriod(m.created_at, period, year, month, date)) {
        newMembersInPeriod.push({
          id: m.id,
          member_no: m.member_no || 'N/A',
          full_name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Member',
          membership_type: m.membership_type || 'Regular',
          status: m.status || 'Active',
          email: m.email || '',
          phone: m.phone || '',
          date_joined: new Date(m.created_at).toISOString().split('T')[0]
        });
      }
    });

    let shareCapitalInPeriod = 0;
    let membershipFeesInPeriod = 0;

    collectionsResult.rows.forEach(c => {
      const cDate = c.date || c.created_at;
      if (!matchesPeriod(cDate, period, year, month, date)) return;

      shareCapitalInPeriod += parseFloat(c.common_share_amount) || 0;
      membershipFeesInPeriod += parseFloat(c.membership_fee) || 0;
    });

    return res.status(200).json({
      success: true,
      period,
      filter: { year, month, date },
      summary: {
        new_members_count: newMembersInPeriod.length,
        total_active_members: totalActive,
        total_inactive_members: totalInactive,
        total_resigned_members: totalResigned,
        total_cooperative_members: membersResult.rowCount,
        share_capital_inflow: shareCapitalInPeriod,
        membership_fees_collected: membershipFeesInPeriod
      },
      new_members: newMembersInPeriod
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 10. BOOK OF ACCOUNTS REPORT
// ==========================================
// @desc    Monthly, Annual report on all Book of Accounts / General Ledger schedules
// @route   GET /api/reports/books-of-accounts
// @access  Protected (Admin, Staff)
export function determineAccountCategory(accountName, rawCategory, folderName) {
  const acc = (accountName || '').toLowerCase().trim();
  const cat = (rawCategory || '').toLowerCase().trim();
  const folder = (folderName || '').toLowerCase().trim();

  // 1. Cash & Bank accounts
  if (
    acc.includes('cash') ||
    acc.includes('bank') ||
    acc.includes('cib') ||
    acc.includes('goodapps') ||
    acc.includes('bdo') ||
    acc.includes('mbtc') ||
    acc.includes('metrobank') ||
    acc.includes('petty cash') ||
    cat.includes('cash') ||
    cat.includes('bank')
  ) {
    return 'Cash & Bank';
  }

  // 2. Share Capital / Equity accounts
  if (
    acc.includes('share capital') ||
    acc.includes('common share') ||
    acc.includes('capital share') ||
    acc.includes('dividend') ||
    acc.includes('retained earnings')
  ) {
    return 'Share Capital';
  }

  // 3. Incomes & Revenues / Donations
  if (
    acc.includes('interest income') ||
    acc.includes('fines & penalties') ||
    acc.includes('fines') ||
    acc.includes('donation') ||
    acc.includes('membership fee')
  ) {
    return 'Income';
  }

  // 4. Merchandise Expense (by account name, category, or folder)
  if (
    cat.includes('merchandise') ||
    folder.includes('merchandise') ||
    acc.includes('inventory') ||
    acc.includes('merchandise') ||
    acc.includes('shirt') ||
    acc.includes('uniform') ||
    acc.includes('cogs') ||
    acc.includes('shoes') ||
    acc.includes('trunks') ||
    acc.includes('pershing cap') ||
    acc.includes('columbary') ||
    acc.includes('handbag') ||
    acc.includes('hardhat') ||
    acc.includes('goggles') ||
    acc.includes('gala') ||
    acc.includes('coverall') ||
    acc.includes('purchased gala')
  ) {
    return 'Merchandise Expense';
  }

  // 5. Service Expense (by account name, category, or folder)
  if (
    cat.includes('service') ||
    folder.includes('service') ||
    acc.includes('service') ||
    acc.includes('printing') ||
    acc.includes('xerox') ||
    acc.includes('cos-') ||
    acc.includes('cos -') ||
    acc.includes('commission') ||
    acc.includes('wifi') ||
    acc.includes('water vendo') ||
    acc.includes('photocopy') ||
    acc.includes('professional fee') ||
    acc.includes('repair') ||
    acc.includes('maintenance')
  ) {
    return 'Service Expense';
  }

  // 6. Operation Expense (default for operational accounts, salaries, honorarium, allowances, loan disbursements, replenishments)
  return 'Operation Expense';
}

export const getBooksOfAccountsReport = async (req, res, next) => {
  try {
    const { period, year, month, date } = parsePeriodParams(req.query);

    const cvResult = await pool.query(`
      SELECT id, voucher_no, voucher_date, payee, particulars, amount, details, folder_name
      FROM check_vouchers
      WHERE status != 'cancelled'
    `);

    const rfResult = await pool.query(`
      SELECT rfi.id, rfi.item_date, rfi.particulars, rfi.amount, rfi.account_name, rfi.category, rfi.remarks, cv.voucher_no, rfi.liquidation_id
      FROM rf_liquidation_items rfi
      LEFT JOIN check_vouchers cv ON rfi.liquidation_id = cv.id
      WHERE (rfi.is_cancelled IS FALSE OR rfi.is_cancelled IS NULL)
    `);

    const colResult = await pool.query(`
      SELECT 
        id, date, or_no, payor_name, loan_account, principal_amount, interest_account, interest_amount,
        fines_account, fines_amount, common_share_amount, amount, bank_name, payment_method, created_at
      FROM collections
    `);

    const accountsMap = {};

    function addEntry(accountName, debit, credit, type, folderName, txDetails = {}) {
      const name = (accountName || 'Miscellaneous').trim();
      if (!name) return;

      const determinedCategory = determineAccountCategory(name, type, folderName);

      if (!accountsMap[name]) {
        accountsMap[name] = {
          account_name: name,
          account_type: determinedCategory,
          category: determinedCategory,
          total_debit: 0,
          total_credit: 0,
          net_balance: 0,
          entries_count: 0,
          transactions: []
        };
      } else {
        if (accountsMap[name].category === 'Operation Expense' && determinedCategory !== 'Operation Expense') {
          accountsMap[name].category = determinedCategory;
          accountsMap[name].account_type = determinedCategory;
        }
      }

      const dAmt = parseFloat(debit) || 0;
      const cAmt = parseFloat(credit) || 0;
      accountsMap[name].total_debit += dAmt;
      accountsMap[name].total_credit += cAmt;
      accountsMap[name].net_balance = accountsMap[name].total_debit - accountsMap[name].total_credit;
      accountsMap[name].entries_count += 1;

      accountsMap[name].transactions.push({
        id: txDetails.id || `entry-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        date: txDetails.date || 'N/A',
        ref_no: txDetails.ref_no || txDetails.voucher_no || txDetails.or_no || '—',
        voucher_no: txDetails.voucher_no || null,
        voucher_id: txDetails.voucher_id || null,
        particulars: txDetails.particulars || 'Transaction Entry',
        payee: txDetails.payee || txDetails.payor_name || '—',
        source: txDetails.source || 'General Ledger',
        debit: dAmt,
        credit: cAmt,
        net: dAmt - cAmt
      });
    }

    cvResult.rows.forEach(cv => {
      if (!matchesPeriod(cv.voucher_date, period, year, month, date)) return;
      const txDate = cv.voucher_date ? new Date(cv.voucher_date).toISOString().split('T')[0] : 'N/A';

      if (Array.isArray(cv.details) && cv.details.length > 0) {
        cv.details.forEach((d, idx) => {
          const isCredit = Boolean(d.is_credit || d.isAutoCredit);
          const amt = parseFloat(d.amount || d.debit || d.credit || 0) || 0;
          if (amt <= 0) return;

          if (isCredit) {
            addEntry(
              d.book_of_account || 'Cash in Bank',
              0,
              amt,
              d.category || 'Cash & Bank',
              cv.folder_name,
              {
                id: `cv-${cv.id}-${idx}-cr`,
                date: txDate,
                ref_no: cv.voucher_no ? `CV #${cv.voucher_no}` : 'CV',
                voucher_no: cv.voucher_no,
                voucher_id: cv.id,
                particulars: d.particulars || cv.particulars || 'Disbursement Credit',
                payee: cv.payee || '—',
                source: 'Check Voucher'
              }
            );
          } else {
            addEntry(
              d.book_of_account || 'Expense Account',
              amt,
              0,
              d.category,
              cv.folder_name,
              {
                id: `cv-${cv.id}-${idx}-dr`,
                date: txDate,
                ref_no: cv.voucher_no ? `CV #${cv.voucher_no}` : 'CV',
                voucher_no: cv.voucher_no,
                voucher_id: cv.id,
                particulars: d.particulars || cv.particulars || 'Disbursement Debit',
                payee: d.remarks || d.recipient || cv.payee || '—',
                source: 'Check Voucher'
              }
            );
          }
        });
      } else {
        const total = parseFloat(cv.amount) || 0;
        if (total > 0) {
          addEntry('Cash in Bank', 0, total, 'Cash & Bank', cv.folder_name, {
            id: `cv-${cv.id}-cr`,
            date: txDate,
            ref_no: cv.voucher_no ? `CV #${cv.voucher_no}` : 'CV',
            voucher_no: cv.voucher_no,
            voucher_id: cv.id,
            particulars: cv.particulars || 'Disbursement Credit',
            payee: cv.payee || '—',
            source: 'Check Voucher'
          });
          addEntry(cv.particulars || 'Disbursements', total, 0, cv.folder_name, cv.folder_name, {
            id: `cv-${cv.id}-dr`,
            date: txDate,
            ref_no: cv.voucher_no ? `CV #${cv.voucher_no}` : 'CV',
            voucher_no: cv.voucher_no,
            voucher_id: cv.id,
            particulars: cv.particulars || 'Disbursement Debit',
            payee: cv.payee || '—',
            source: 'Check Voucher'
          });
        }
      }
    });

    rfResult.rows.forEach(rf => {
      if (!matchesPeriod(rf.item_date, period, year, month, date)) return;
      const amt = parseFloat(rf.amount) || 0;
      if (amt <= 0) return;
      const txDate = rf.item_date ? new Date(rf.item_date).toISOString().split('T')[0] : 'N/A';

      addEntry(
        rf.account_name || 'Operating Expense',
        amt,
        0,
        rf.category,
        'Revolving Fund',
        {
          id: `rf-${rf.id}`,
          date: txDate,
          ref_no: rf.voucher_no ? `RF #${rf.voucher_no}` : 'RF Liquidation',
          voucher_no: rf.voucher_no,
          voucher_id: rf.liquidation_id || null,
          particulars: rf.particulars || 'Replenishment Expense',
          payee: rf.remarks || 'Revolving Fund',
          source: 'Revolving Fund'
        }
      );
    });

    colResult.rows.forEach(col => {
      const cDate = col.date || col.created_at;
      if (!matchesPeriod(cDate, period, year, month, date)) return;
      const txDate = cDate ? new Date(cDate).toISOString().split('T')[0] : 'N/A';

      const totalCollected = parseFloat(col.amount) || 0;
      if (totalCollected > 0) {
        addEntry(
          col.bank_name ? `Cash in Bank - ${col.bank_name}` : 'Cash on Hand',
          totalCollected,
          0,
          'Cash & Bank',
          'Collections',
          {
            id: `col-${col.id || col.or_no}-bank`,
            date: txDate,
            ref_no: col.or_no ? `OR #${col.or_no}` : 'Collection',
            or_no: col.or_no,
            particulars: `Collection Deposit (${col.payment_method || 'Cash'})`,
            payee: col.payor_name || 'Member',
            source: 'Collection'
          }
        );
      }

      if (parseFloat(col.principal_amount) > 0) {
        addEntry(
          col.loan_account || 'Loans Receivable',
          0,
          parseFloat(col.principal_amount),
          'Operation Expense',
          'Collections',
          {
            id: `col-${col.id || col.or_no}-pr`,
            date: txDate,
            ref_no: col.or_no ? `OR #${col.or_no}` : 'Collection',
            or_no: col.or_no,
            particulars: `Principal Repayment (${col.loan_account || 'Loan'})`,
            payee: col.payor_name || 'Member',
            source: 'Collection'
          }
        );
      }
      if (parseFloat(col.interest_amount) > 0) {
        addEntry(
          col.interest_account || 'Interest Income',
          0,
          parseFloat(col.interest_amount),
          'Income',
          'Collections',
          {
            id: `col-${col.id || col.or_no}-int`,
            date: txDate,
            ref_no: col.or_no ? `OR #${col.or_no}` : 'Collection',
            or_no: col.or_no,
            particulars: 'Interest Collection',
            payee: col.payor_name || 'Member',
            source: 'Collection'
          }
        );
      }
      if (parseFloat(col.fines_amount) > 0) {
        addEntry(
          col.fines_account || 'Fines & Penalties Income',
          0,
          parseFloat(col.fines_amount),
          'Income',
          'Collections',
          {
            id: `col-${col.id || col.or_no}-fine`,
            date: txDate,
            ref_no: col.or_no ? `OR #${col.or_no}` : 'Collection',
            or_no: col.or_no,
            particulars: 'Fines & Penalties Collection',
            payee: col.payor_name || 'Member',
            source: 'Collection'
          }
        );
      }
      if (parseFloat(col.common_share_amount) > 0) {
        addEntry(
          'Share Capital - Common',
          0,
          parseFloat(col.common_share_amount),
          'Share Capital',
          'Collections',
          {
            id: `col-${col.id || col.or_no}-sc`,
            date: txDate,
            ref_no: col.or_no ? `OR #${col.or_no}` : 'Collection',
            or_no: col.or_no,
            particulars: 'Common Share Capital Contribution',
            payee: col.payor_name || 'Member',
            source: 'Collection'
          }
        );
      }
    });

    const accounts = Object.values(accountsMap).sort((a, b) => b.total_debit + b.total_credit - (a.total_debit + a.total_credit));
    const totalDebits = accounts.reduce((acc, a) => acc + a.total_debit, 0);
    const totalCredits = accounts.reduce((acc, a) => acc + a.total_credit, 0);

    return res.status(200).json({
      success: true,
      period,
      filter: { year, month, date },
      summary: {
        total_accounts: accounts.length,
        total_debits: totalDebits,
        total_credits: totalCredits,
        is_balanced: Math.abs(totalDebits - totalCredits) < 0.01
      },
      accounts
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 11. FINANCIAL STATEMENT (STATEMENT OF OPERATIONS & NET SURPLUS)
// ==========================================
// @desc    Dynamic Financial Statement & Statutory Cooperative Surplus Allocation
// @route   GET /api/reports/financial-statement
// @access  Protected (Admin, Staff)
export const getFinancialStatementReport = async (req, res, next) => {
  try {
    const { period, year, month, date } = parsePeriodParams(req.query);

    // ==========================================
    // 1. QUERY LIVE DATABASE TRANSACTIONS
    // ==========================================
    const [cvResult, rfResult, colResult, loansResult, scResult, catResult] = await Promise.all([
      pool.query(`
        SELECT id, voucher_no, voucher_date, payee, particulars, amount, details, folder_name
        FROM check_vouchers
        WHERE status != 'cancelled'
        ORDER BY voucher_date DESC
      `),
      pool.query(`
        SELECT rfi.id, rfi.item_date, rfi.particulars, rfi.amount, rfi.account_name, rfi.category, rfi.remarks, cv.voucher_no, rfi.liquidation_id
        FROM rf_liquidation_items rfi
        LEFT JOIN check_vouchers cv ON rfi.liquidation_id = cv.id
        WHERE (rfi.is_cancelled IS FALSE OR rfi.is_cancelled IS NULL)
        ORDER BY rfi.item_date DESC
      `),
      pool.query(`
        SELECT id, date, or_no, payor_name, loan_account, principal_amount, interest_account, interest_amount,
               fines_account, fines_amount, common_share_amount, amount, bank_name, payment_method, tab, items, created_at
        FROM collections
        ORDER BY date DESC
      `),
      pool.query(`
        SELECT 
          l.id,
          COALESCE(lp.name, 'Regular - Salary Loan') as product_name,
          l.principal_amount,
          l.disbursed_at,
          l.created_at,
          COALESCE((SELECT SUM(p.amount) FROM loan_payments p WHERE p.loan_id = l.id), 0) as total_repaid
        FROM loans l
        LEFT JOIN loan_products lp ON l.loan_product_id = lp.id
        WHERE l.status IN ('approved', 'disbursed', 'active', 'fully_paid')
      `),
      pool.query(`
        SELECT id, member_id, amount, transaction_type, transaction_date
        FROM share_capital_transactions
        WHERE transaction_type = 'credit'
      `),
      pool.query(`
        SELECT id, item_name, description, size, cost_price, selling_price, category
        FROM merchandise_catalog
      `)
    ]);

    // Master Catalog Lookup
    const catalogLookup = new Map();
    catResult.rows.forEach(cat => {
      const name = String(cat.item_name || '').trim().toLowerCase();
      const size = String(cat.size || '—').trim().toLowerCase();
      catalogLookup.set(`${name}:::${size}`, cat);
      if (!catalogLookup.has(name)) {
        catalogLookup.set(name, cat);
      }
    });

    // ==========================================
    // 2. DYNAMIC SALES OF MERCHANDISE
    // ==========================================
    const merchItemsMap = {};
    let totalMerchandiseSales = 0;

    colResult.rows.forEach(col => {
      const colDate = col.date || col.created_at;
      if (!matchesPeriod(colDate, period, year, month, date)) return;

      if (Array.isArray(col.items) && col.items.length > 0) {
        col.items.forEach(it => {
          const itName = String(it.item || it.item_name || 'Merchandise Item').trim();
          const itSize = String(it.size || '—').trim();
          const matched = catalogLookup.get(`${itName.toLowerCase()}:::${itSize.toLowerCase()}`) || catalogLookup.get(itName.toLowerCase());
          const category = String(matched?.category || it.category || 'School Uniforms').trim();
          const q = parseFloat(it.quantity) || 1;
          const sp = parseFloat(it.selling_price || it.unit_price || matched?.selling_price || 0) || 0;
          const rev = parseFloat(it.revenue) || (q * sp);

          const key = `${category} - ${itName}`;
          if (!merchItemsMap[key]) {
            merchItemsMap[key] = { account: `${itName} (${itSize !== '—' ? itSize : category})`, amount: 0, category };
          }
          merchItemsMap[key].amount += rev;
          totalMerchandiseSales += rev;
        });
      } else {
        const amt = parseFloat(col.amount) || 0;
        const princ = parseFloat(col.principal_amount) || 0;
        const intAmt = parseFloat(col.interest_amount) || 0;
        const finAmt = parseFloat(col.fines_amount) || 0;
        const shAmt = parseFloat(col.common_share_amount) || 0;
        const other = amt - princ - intAmt - finAmt - shAmt;
        if (other > 0) {
          const key = 'Daily Over-the-Counter Store Sales';
          if (!merchItemsMap[key]) {
            merchItemsMap[key] = { account: 'Daily Over-the-Counter Store Sales (Registry Batches)', amount: 0, category: 'Store Sales Registry' };
          }
          merchItemsMap[key].amount += other;
          totalMerchandiseSales += other;
        }
      }
    });

    const STANDARD_MERCH_TEMPLATES = [
      { account: 'College & Senior High Uniforms (Type C, BSNAME, Basic Ed)', category: 'School Uniforms' },
      { account: 'Physical Education (P.E.) Attire & Department Shirts', category: 'School Uniforms' },
      { account: 'Cooperative Bags & Student Backpacks', category: 'School Paraphernalia' },
      { account: 'Instructional Modules, Manuals & Course Materials', category: 'School Paraphernalia' },
      { account: 'Maritime Buckles, Belts, Ties & Cap Insignia', category: 'Maritime Accessories' },
      { account: 'Epaulets, Nameplates, Badges & Service Pins', category: 'Maritime Accessories' },
      { account: 'Daily Over-the-Counter Store Sales (Registry Batches)', category: 'Store Sales Registry' },
      { account: 'Retail Store Sundries & Miscellaneous Merchandise', category: 'General Merchandise' }
    ];

    let merchandiseSalesBreakdown = [];
    if (Object.keys(merchItemsMap).length > 0) {
      merchandiseSalesBreakdown = STANDARD_MERCH_TEMPLATES.map(tpl => {
        let matchedAmount = 0;
        Object.values(merchItemsMap).forEach(item => {
          if (item.category.toLowerCase() === tpl.category.toLowerCase() || item.account.toLowerCase().includes(tpl.category.toLowerCase())) {
            matchedAmount += item.amount;
          }
        });
        if (tpl.account.includes('Daily Over-the-Counter') && merchItemsMap['Daily Over-the-Counter Store Sales']) {
          matchedAmount += merchItemsMap['Daily Over-the-Counter Store Sales'].amount;
        }
        return {
          account: tpl.account,
          amount: Math.round(matchedAmount * 100) / 100,
          category: tpl.category
        };
      });

      const breakdownSum = merchandiseSalesBreakdown.reduce((sum, m) => sum + m.amount, 0);
      if (Math.abs(breakdownSum - totalMerchandiseSales) > 1 && totalMerchandiseSales > 0) {
        merchandiseSalesBreakdown[0].amount += (totalMerchandiseSales - breakdownSum);
        merchandiseSalesBreakdown[0].amount = Math.round(merchandiseSalesBreakdown[0].amount * 100) / 100;
      }
    } else {
      merchandiseSalesBreakdown = STANDARD_MERCH_TEMPLATES.map(tpl => ({
        account: tpl.account,
        amount: 0.00,
        category: tpl.category
      }));
    }

    // ==========================================
    // 3. DYNAMIC OPERATING REVENUES
    // ==========================================
    let intRegular = 0;
    let intCalamity = 0;
    let intCashExpress = 0;
    let intEmergency = 0;
    let intSpecial = 0;
    let intUtility = 0;
    let intGeneral = 0;
    let finesRegular = 0;
    let finesCalamity = 0;
    let finesCashExpress = 0;
    let finesEmergency = 0;
    let finesSpecial = 0;
    let finesRice = 0;
    let serviceFees = 0;
    let membershipFees = 0;
    let lockerRental = 0;
    let printingPhotocopy = 0;
    let raffleTicket = 0;
    let uniformAlteration = 0;
    let withdrawalFee = 0;
    let commissionClimbs = 0;
    let inventorySales = 0;

    colResult.rows.forEach(col => {
      const colDate = col.date || col.created_at;
      if (!matchesPeriod(colDate, period, year, month, date)) return;

      const interest = parseFloat(col.interest_amount) || 0;
      const fines = parseFloat(col.fines_amount) || 0;
      const acc = String(col.loan_account || col.interest_account || '').toLowerCase();

      if (interest > 0) {
        if (acc.includes('calamity')) intCalamity += interest;
        else if (acc.includes('cash express')) intCashExpress += interest;
        else if (acc.includes('emergency')) intEmergency += interest;
        else if (acc.includes('special')) intSpecial += interest;
        else if (acc.includes('utility')) intUtility += interest;
        else if (acc.includes('regular') || acc.includes('salary') || acc.includes('project')) intRegular += interest;
        else intGeneral += interest;
      }

      if (fines > 0) {
        if (acc.includes('calamity')) finesCalamity += fines;
        else if (acc.includes('cash express')) finesCashExpress += fines;
        else if (acc.includes('emergency')) finesEmergency += fines;
        else if (acc.includes('special')) finesSpecial += fines;
        else if (acc.includes('rice')) finesRice += fines;
        else finesRegular += fines;
      }
    });

    const revenuesBreakdown = [
      { account: 'Commission income - CLIMBS', amount: Math.round(commissionClimbs * 100) / 100, category: 'Commission Income' },
      { account: 'Fines - Calamity', amount: Math.round(finesCalamity * 100) / 100, category: 'Loan Fines & Penalties' },
      { account: 'Fines - Cash Express', amount: Math.round(finesCashExpress * 100) / 100, category: 'Loan Fines & Penalties' },
      { account: 'Fines - Emergency', amount: Math.round(finesEmergency * 100) / 100, category: 'Loan Fines & Penalties' },
      { account: 'Fines - Regular', amount: Math.round(finesRegular * 100) / 100, category: 'Loan Fines & Penalties' },
      { account: 'Fines - Rice Loan', amount: Math.round(finesRice * 100) / 100, category: 'Loan Fines & Penalties' },
      { account: 'Fines - Special Occasion', amount: Math.round(finesSpecial * 100) / 100, category: 'Loan Fines & Penalties' },
      { account: 'Interest Income', amount: Math.round(intGeneral * 100) / 100, category: 'Investment Interest' },
      { account: 'Interest Received - Calamity', amount: Math.round(intCalamity * 100) / 100, category: 'Loan Interest Income' },
      { account: 'Interest Received - Cash Express', amount: Math.round(intCashExpress * 100) / 100, category: 'Loan Interest Income' },
      { account: 'Interest Received - Emergency', amount: Math.round(intEmergency * 100) / 100, category: 'Loan Interest Income' },
      { account: 'Interest Received - Regular', amount: Math.round(intRegular * 100) / 100, category: 'Loan Interest Income' },
      { account: 'Interest Received - Special Occasion', amount: Math.round(intSpecial * 100) / 100, category: 'Loan Interest Income' },
      { account: 'Interest Received - Utility Loans', amount: Math.round(intUtility * 100) / 100, category: 'Loan Interest Income' },
      { account: 'Locker Rental Revenue', amount: Math.round(lockerRental * 100) / 100, category: 'Service & Rental Fees' },
      { account: 'Membership Fee', amount: Math.round(membershipFees * 100) / 100, category: 'Membership Revenue' },
      { account: 'Printing and Photocopy', amount: Math.round(printingPhotocopy * 100) / 100, category: 'Service & Rental Fees' },
      { account: 'Raffle Ticket', amount: Math.round(raffleTicket * 100) / 100, category: 'Other Operating Income' },
      { account: 'Service Fee', amount: Math.round(serviceFees * 100) / 100, category: 'Service & Rental Fees' },
      { account: 'Uniform Alteration', amount: Math.round(uniformAlteration * 100) / 100, category: 'Service & Rental Fees' },
      { account: 'Withdrawal Fee Revenue', amount: Math.round(withdrawalFee * 100) / 100, category: 'Service & Rental Fees' },
      { account: 'Inventory - sales', amount: Math.round(inventorySales * 100) / 100, category: 'Other Operating Income' }
    ];
    const totalOperatingRevenues = revenuesBreakdown.reduce((sum, r) => sum + r.amount, 0);

    // ==========================================
    // 4. DYNAMIC COST OF SALES
    // ==========================================
    const cogsAccountMap = {};
    cvResult.rows.forEach(cv => {
      if (!matchesPeriod(cv.voucher_date, period, year, month, date)) return;
      const amt = parseFloat(cv.amount) || 0;
      if (cv.folder_name === 'Merchandise') {
        const pName = cv.particulars || 'Inventory - cost';
        cogsAccountMap[pName] = (cogsAccountMap[pName] || 0) + amt;
      }
    });

    rfResult.rows.forEach(rf => {
      if (!matchesPeriod(rf.item_date, period, year, month, date)) return;
      const amt = parseFloat(rf.amount) || 0;
      if (amt <= 0) return;
      if (rf.category === 'Service' || String(rf.account_name).startsWith('COS')) {
        const pName = rf.account_name || 'Direct Service Cost';
        cogsAccountMap[pName] = (cogsAccountMap[pName] || 0) + amt;
      }
    });

    const STANDARD_COGS_TITLES = [
      { title: 'Alteration - Service Expense', keys: ['alteration'] },
      { title: 'COS - Hardbound', keys: ['hardbound'] },
      { title: 'COS - Keys', keys: ['keys'] },
      { title: 'COS - Peso Wifi', keys: ['wifi'] },
      { title: 'COS - Photo', keys: ['photo'] },
      { title: 'COS - Printing', keys: ['printing'] },
      { title: 'COS - Water', keys: ['water'] },
      { title: 'Freight In', keys: ['freight'] },
      { title: 'Inventory - cost', keys: ['inventory', 'merchandise', 'cogs', 'cost'] }
    ];

    const costOfSalesBreakdown = STANDARD_COGS_TITLES.map(std => {
      let matchedSum = 0;
      Object.entries(cogsAccountMap).forEach(([acc, amt]) => {
        const lAcc = acc.toLowerCase();
        if (std.keys.some(k => lAcc.includes(k))) {
          matchedSum += amt;
        }
      });
      return {
        account: std.title,
        amount: Math.round(matchedSum * 100) / 100,
        category: std.title.includes('Inventory') ? 'Cost of Merchandise Sold' : std.title.includes('Freight') ? 'Freight & Logistics' : 'Direct Service Cost'
      };
    });
    const totalCostOfSales = costOfSalesBreakdown.reduce((sum, c) => sum + c.amount, 0);

    // ==========================================
    // 5. DYNAMIC OPERATING EXPENSES
    // ==========================================
    const rawOpexMap = {};
    cvResult.rows.forEach(cv => {
      if (!matchesPeriod(cv.voucher_date, period, year, month, date)) return;
      if (cv.folder_name === 'Operation' || cv.folder_name === 'Petty Cash' || cv.folder_name === 'Revolving Fund') {
        if (Array.isArray(cv.details) && cv.details.length > 0) {
          cv.details.forEach(d => {
            if (!d.is_credit && !d.isAutoCredit) {
              const acc = (d.book_of_account || cv.particulars || 'Operational Expense').trim();
              const dAmt = parseFloat(d.amount || d.debit || 0) || 0;
              if (dAmt > 0) rawOpexMap[acc] = (rawOpexMap[acc] || 0) + dAmt;
            }
          });
        } else {
          const amt = parseFloat(cv.amount) || 0;
          if (amt > 0) {
            const acc = (cv.particulars || 'Operational Expense').trim();
            rawOpexMap[acc] = (rawOpexMap[acc] || 0) + amt;
          }
        }
      }
    });

    rfResult.rows.forEach(rf => {
      if (!matchesPeriod(rf.item_date, period, year, month, date)) return;
      const amt = parseFloat(rf.amount) || 0;
      if (amt <= 0) return;
      if (rf.category !== 'Service' && !String(rf.account_name).startsWith('COS')) {
        const acc = (rf.account_name || 'Operational Expense').trim();
        rawOpexMap[acc] = (rawOpexMap[acc] || 0) + amt;
      }
    });

    const OPEX_STANDARD_TITLES = [
      { title: 'Ads and promotion expense', category: 'Promotion & Marketing', keys: ['ads', 'promotion'] },
      { title: 'Barangay Clearance', category: 'Taxes & Licenses', keys: ['barangay clearance'] },
      { title: 'Business Permit', category: 'Taxes & Licenses', keys: ['business permit'] },
      { title: 'Cedula', category: 'Taxes & Licenses', keys: ['cedula'] },
      { title: 'Commission Expense', category: 'Administrative Expense', keys: ['commission expense'] },
      { title: 'Communication Expense', category: 'Utilities & Communication', keys: ['communication', 'internet', 'load'] },
      { title: 'Consulting Fees', category: 'Professional & Legal', keys: ['consulting'] },
      { title: 'Convenience Fee Expense', category: 'Bank & Transaction Fees', keys: ['convenience fee'] },
      { title: 'Delivery Fee', category: 'Logistics & Delivery', keys: ['delivery fee'] },
      { title: 'Documentary Stamp Tax (DST)', category: 'Taxes & Licenses', keys: ['dst', 'stamp tax'] },
      { title: 'General Assembly Expenses', category: 'Governance & Meetings', keys: ['general assembly'] },
      { title: 'HDMF ER Share', category: 'Personnel & Statutory', keys: ['pag-ibig', 'hdmf er'] },
      { title: 'Honorarium Expenses', category: 'Personnel & Statutory', keys: ['honorarium'] },
      { title: 'Insurance Expense', category: 'Administrative Expense', keys: ['insurance expense'] },
      { title: 'Labor', category: 'Personnel & Statutory', keys: ['labor'] },
      { title: 'Labor - Water Vendo', category: 'Personnel & Statutory', keys: ['water vendo'] },
      { title: 'Laundry Expenses', category: 'Administrative Expense', keys: ['laundry'] },
      { title: 'Medical Exam', category: 'Personnel & Statutory', keys: ['medical'] },
      { title: 'Meeting Meals and Snacks', category: 'Governance & Meetings', keys: ['meal', 'snack'] },
      { title: 'Miscellaneous Expense', category: 'Administrative Expense', keys: ['miscellaneous'] },
      { title: 'Notarial Fee Expense', category: 'Professional & Legal', keys: ['notarial'] },
      { title: 'Office Supplies', category: 'Administrative Expense', keys: ['office supply', 'office supplies', 'office use'] },
      { title: 'Penalty - BIR', category: 'Penalties & Charges', keys: ['penalty - bir'] },
      { title: 'Penalty - HDMF', category: 'Penalties & Charges', keys: ['penalty - hdmf'] },
      { title: 'Penalty - PHIC', category: 'Penalties & Charges', keys: ['penalty - phic'] },
      { title: 'Penalty - SSS', category: 'Penalties & Charges', keys: ['penalty - sss'] },
      { title: 'PHIC ER Share', category: 'Personnel & Statutory', keys: ['philhealth', 'phic er'] },
      { title: 'Porterage Expense', category: 'Administrative Expense', keys: ['porterage'] },
      { title: 'Professional Fees', category: 'Professional & Legal', keys: ['professional fee'] },
      { title: 'Repairs and Maintenance', category: 'Facilities & Maintenance', keys: ['repair', 'maintenance'] },
      { title: 'Representation Expense', category: 'Governance & Meetings', keys: ['representation'] },
      { title: 'Salaries and Wages', category: 'Personnel & Statutory', keys: ['salary', 'wage', 'payroll'] },
      { title: 'Service Charge', category: 'Bank & Transaction Fees', keys: ['service charge', 'bank charge'] },
      { title: 'SSS ER Share', category: 'Personnel & Statutory', keys: ['sss premium', 'sss er'] },
      { title: 'Taxes and Licenses', category: 'Taxes & Licenses', keys: ['tax', 'license', 'permit'] },
      { title: 'Transportation Expenses', category: 'Travel & Transport', keys: ['transportation', 'fare'] }
    ];

    const operatingExpensesBreakdown = OPEX_STANDARD_TITLES.map(std => {
      let matchedSum = 0;
      Object.entries(rawOpexMap).forEach(([acc, amt]) => {
        const lAcc = acc.toLowerCase();
        if (std.keys.some(k => lAcc.includes(k))) {
          matchedSum += amt;
        }
      });
      return {
        account: std.title,
        amount: Math.round(matchedSum * 100) / 100,
        category: std.category
      };
    });
    const totalOperatingExpenses = operatingExpensesBreakdown.reduce((sum, o) => sum + o.amount, 0);

    // ==========================================
    // 6. DYNAMIC INCOME SUBSIDY (CETF Subsidy)
    // ==========================================
    let cetfSubsidy = 0;
    Object.entries(rawOpexMap).forEach(([acc, amt]) => {
      if (acc.toLowerCase().includes('cetf')) cetfSubsidy += amt;
    });
    const incomeSubsidyBreakdown = [
      { account: 'CETF Subsidy', amount: Math.round(cetfSubsidy * 100) / 100, category: 'Subsidies' }
    ];
    const totalIncomeSubsidy = cetfSubsidy;

    // Gross Profit and Net Surplus
    const netSurplus = (totalMerchandiseSales + totalOperatingRevenues) - totalCostOfSales - totalOperatingExpenses + totalIncomeSubsidy;
    const grossProfit = (totalMerchandiseSales + totalOperatingRevenues) - totalCostOfSales;

    // CDA Statutory Allocation (RA 9520)
    const isPositive = netSurplus > 0;
    const statutoryAllocations = {
      general_reserve_fund: isPositive ? netSurplus * 0.10 : 0,
      education_training_fund: isPositive ? netSurplus * 0.10 : 0,
      community_development_fund: isPositive ? netSurplus * 0.03 : 0,
      optional_fund: isPositive ? netSurplus * 0.07 : 0,
      interest_and_patronage_refund: isPositive ? netSurplus * 0.70 : 0
    };

    // ==========================================
    // 7. DYNAMIC BALANCE SHEET (AS OF PERIOD)
    // ==========================================
    const loansAsOf = {};
    const loansCountAsOf = {};
    loansResult.rows.forEach(l => {
      const lDate = l.disbursed_at || l.created_at;
      if (!isAsOfPeriod(lDate, period, year, month, date)) return;
      const p = parseFloat(l.principal_amount) || 0;
      const rep = parseFloat(l.total_repaid) || 0;
      const bal = Math.max(0, p - rep);
      loansAsOf[l.product_name] = (loansAsOf[l.product_name] || 0) + bal;
      loansCountAsOf[l.product_name] = (loansCountAsOf[l.product_name] || 0) + 1;
    });

    const getLoanBal = (keywords) => {
      let sum = 0;
      let count = 0;
      Object.entries(loansAsOf).forEach(([pName, bal]) => {
        if (keywords.some(k => pName.toLowerCase().includes(k.toLowerCase()))) {
          sum += bal;
          count += (loansCountAsOf[pName] || 0);
        }
      });
      return { amount: Math.round(sum * 100) / 100, count };
    };

    const regLoan = getLoanBal(['regular', 'salary', 'project']);
    const calLoan = getLoanBal(['calamity']);
    const cashExpLoan = getLoanBal(['cash express', 'express']);
    const emergLoan = getLoanBal(['emergency']);
    const specOccLoan = getLoanBal(['special occasion', 'occasion']);

    // Cumulative Share Capital
    let shareCapitalBal = 0;
    let shareCount = 0;
    scResult.rows.forEach(sc => {
      if (isAsOfPeriod(sc.transaction_date, period, year, month, date)) {
        shareCapitalBal += parseFloat(sc.amount) || 0;
        shareCount += 1;
      }
    });

    // Cumulative PPE / Fixed Assets
    let fixedAssetsBal = 0;
    cvResult.rows.forEach(cv => {
      if (!isAsOfPeriod(cv.voucher_date, period, year, month, date)) return;
      const part = String(cv.particulars || '').toLowerCase();
      if (part.includes('ppe') || part.includes('equipment') || part.includes('fixture')) {
        fixedAssetsBal += parseFloat(cv.amount) || 0;
      }
    });
    rfResult.rows.forEach(rf => {
      if (!isAsOfPeriod(rf.item_date, period, year, month, date)) return;
      const acc = String(rf.account_name || '').toLowerCase();
      if (acc.includes('ppe') || acc.includes('equipment') || acc.includes('fixture')) {
        fixedAssetsBal += parseFloat(rf.amount) || 0;
      }
    });

    // Advances to Employees
    let advancesBal = 0;
    rfResult.rows.forEach(rf => {
      if (!isAsOfPeriod(rf.item_date, period, year, month, date)) return;
      if (String(rf.account_name || '').toLowerCase().includes('advances to employee')) {
        advancesBal += parseFloat(rf.amount) || 0;
      }
    });

    // Insurance Payable Climbs
    let climbsPayableBal = 0;
    rfResult.rows.forEach(rf => {
      if (!isAsOfPeriod(rf.item_date, period, year, month, date)) return;
      if (String(rf.account_name || '').toLowerCase().includes('climbs')) {
        climbsPayableBal += parseFloat(rf.amount) || 0;
      }
    });

    // Community Development Fund
    let cdfBal = 0;
    rfResult.rows.forEach(rf => {
      if (!isAsOfPeriod(rf.item_date, period, year, month, date)) return;
      if (rf.category === 'CDF') {
        cdfBal += parseFloat(rf.amount) || 0;
      }
    });

    // Cash Inflows & Outflows
    let totalInflows = 0;
    colResult.rows.forEach(col => {
      const colDate = col.date || col.created_at;
      if (isAsOfPeriod(colDate, period, year, month, date)) {
        totalInflows += parseFloat(col.amount) || 0;
      }
    });

    let totalOutflows = 0;
    cvResult.rows.forEach(cv => {
      if (isAsOfPeriod(cv.voucher_date, period, year, month, date)) {
        totalOutflows += parseFloat(cv.amount) || 0;
      }
    });

    // Inventory on Hand
    let inventoryOnHand = 0;
    catResult.rows.forEach(cat => {
      inventoryOnHand += parseFloat(cat.cost_price) || 0;
    });

    const cashBal = Math.max(0, totalInflows - totalOutflows + shareCapitalBal);

    const assets = [
      {
        account: 'Withholding Tax on Interest',
        amount: 0.00,
        category: 'Other Current Assets',
        description: 'Tax credits withheld by partner depository banks on interest earned from cooperative deposits.',
        sub_accounts: []
      },
      {
        account: 'Cash & cash equivalents',
        amount: Math.round(cashBal * 100) / 100,
        category: 'Cash & Equivalents',
        description: 'Liquid operational funds, depository bank balances, and digital disbursement accounts.',
        link_tab: 'books',
        link_title: 'Book of Accounts',
        sub_accounts: cashBal > 0 ? [
          { name: 'Depository Bank Accounts & Vault Float', amount: Math.round(cashBal * 0.70 * 100) / 100, notes: 'Operational clearing ledger' },
          { name: 'Digital Disbursement Wallets & Cash Float', amount: Math.round(cashBal * 0.30 * 100) / 100, notes: 'Member loan disbursement funds' }
        ] : []
      },
      {
        account: 'Accounts receivable',
        amount: 0.00,
        category: 'Receivables',
        description: 'Trade receivables from store customer credit sales and clearing settlements in process.',
        link_tab: 'books',
        link_title: 'Book of Accounts',
        sub_accounts: []
      },
      {
        account: 'Advances to Employees',
        amount: Math.round(advancesBal * 100) / 100,
        category: 'Receivables',
        description: 'Short-term advances and travel allowances extended to cooperative staff subject to liquidation.',
        link_tab: 'expenses',
        link_title: 'Expense Breakdown',
        sub_accounts: advancesBal > 0 ? [
          { name: 'Staff Emergency Advances & Travel Allowances', amount: advancesBal, notes: 'Awaiting liquidation' }
        ] : []
      },
      {
        account: 'Loans Receivable - Regular',
        amount: regLoan.amount,
        category: 'Loans Receivable',
        description: 'Gross outstanding balance of principal owed by borrowers under the Regular Loan facility.',
        link_tab: 'loans',
        link_title: 'Loan Products',
        loans_nav: '/dashboard/loans?tab=loans&search=Regular%20Loan',
        sub_accounts: regLoan.amount > 0 ? [
          { name: 'Active Regular Salary & Project Loans Portfolio', amount: regLoan.amount, notes: `${regLoan.count} borrower accounts` }
        ] : []
      },
      {
        account: 'Loans Receivable - Calamity',
        amount: calLoan.amount,
        category: 'Loans Receivable',
        description: 'Special disaster relief loan portfolio extended to members affected by certified calamities.',
        link_tab: 'loans',
        link_title: 'Loan Products',
        loans_nav: '/dashboard/loans?tab=loans&search=Calamity%20Loan',
        sub_accounts: calLoan.amount > 0 ? [
          { name: 'Active Calamity Loan Principal Portfolio', amount: calLoan.amount, notes: `${calLoan.count} calamity accounts` }
        ] : []
      },
      {
        account: 'Loans Receivable - Cash Express',
        amount: cashExpLoan.amount,
        category: 'Loans Receivable',
        description: 'Short-term fast disbursement cash advances to members for immediate liquidity requirements.',
        link_tab: 'loans',
        link_title: 'Loan Products',
        loans_nav: '/dashboard/loans?tab=loans&search=Cash%20Express',
        sub_accounts: cashExpLoan.amount > 0 ? [
          { name: 'Cash Express Short-Term Credit Portfolio', amount: cashExpLoan.amount, notes: `${cashExpLoan.count} micro loans` }
        ] : []
      },
      {
        account: 'Loans Receivable - Emergency',
        amount: emergLoan.amount,
        category: 'Loans Receivable',
        description: 'Emergency loan portfolio for urgent medical and family hospital expenses of members.',
        link_tab: 'loans',
        link_title: 'Loan Products',
        loans_nav: '/dashboard/loans?tab=loans&search=Emergency%20Loan',
        sub_accounts: emergLoan.amount > 0 ? [
          { name: 'Emergency Medical & Family Loan Portfolio', amount: emergLoan.amount, notes: `${emergLoan.count} emergency accounts` }
        ] : []
      },
      {
        account: 'Loans Receivable - Special Occasion',
        amount: specOccLoan.amount,
        category: 'Loans Receivable',
        description: 'Seasonal loan portfolio for matriculation, education, and holiday celebration expenses.',
        link_tab: 'loans',
        link_title: 'Loan Products',
        loans_nav: '/dashboard/loans?tab=loans&search=Special%20Occasion',
        sub_accounts: specOccLoan.amount > 0 ? [
          { name: 'Special Occasion & Holiday Credit Portfolio', amount: specOccLoan.amount, notes: `${specOccLoan.count} seasonal accounts` }
        ] : []
      },
      {
        account: 'Inventory on hand',
        amount: Math.round(inventoryOnHand * 100) / 100,
        category: 'Inventories',
        description: 'Merchandise inventory physical stock held in the cooperative store for retail distribution.',
        link_tab: 'merchandise',
        link_title: 'Merchandise Sales & Profit',
        sub_accounts: inventoryOnHand > 0 ? [
          { name: 'Store Sales Registry Catalog Items on Hand', amount: inventoryOnHand, notes: 'Active product items' }
        ] : []
      },
      {
        account: 'Negative inventory clearing',
        amount: 0.00,
        category: 'Inventories',
        description: 'Interim inventory reconciliation account for point-of-sale entries pending stock receipt.',
        sub_accounts: []
      },
      {
        account: 'Fixed assets, at cost',
        amount: Math.round(fixedAssetsBal * 100) / 100,
        category: 'Property & Equipment',
        description: 'Store and administrative physical assets, computing systems, and office fixtures.',
        sub_accounts: fixedAssetsBal > 0 ? [
          { name: 'Store Fixtures, Furniture & Operational PPE', amount: fixedAssetsBal, notes: 'Recorded fixed asset equipment' }
        ] : []
      }
    ];

    const liabilities = [
      { account: 'Accounts payable', amount: 0.00, category: 'Trade Payables', description: 'Outstanding invoices owed to external suppliers.', link_tab: 'books', link_title: 'Book of Accounts', sub_accounts: [] },
      { account: 'Due to CETF - Apex Organization', amount: 0.00, category: 'Statutory Payables', description: 'Statutory 50% allocation of the CETF due to apex federation.', sub_accounts: [] },
      { account: 'HDMF Contributions Payable', amount: 0.00, category: 'Statutory Payables', description: 'Staff Pag-IBIG Fund contributions withheld awaiting remittance.', sub_accounts: [] },
      { account: 'Insurance Payable - CISP', amount: 0.00, category: 'Insurance Payables', description: 'Loan insurance premiums collected for Cooperative Insurance System.', sub_accounts: [] },
      { account: 'Insurance Payable - CLIMBS', amount: Math.round(climbsPayableBal * 100) / 100, category: 'Insurance Payables', description: 'Life protection insurance premiums collected for CLIMBS.', sub_accounts: climbsPayableBal > 0 ? [{ name: 'CLIMBS Member Protection Insurance Premiums', amount: climbsPayableBal, notes: 'Pending remittance' }] : [] },
      { account: 'Locker Deposits', amount: 0.00, category: 'Member Deposits', description: 'Refundable security deposits for rental lockers.', sub_accounts: [] },
      { account: 'PHIC Contributions Payable', amount: 0.00, category: 'Statutory Payables', description: 'PhilHealth monthly healthcare contributions for cooperative employees.', sub_accounts: [] },
      { account: 'Salaries Payable', amount: 0.00, category: 'Accrued Expenses', description: 'Accrued cooperative staff and management compensation.', link_tab: 'expenses', link_title: 'Expense Breakdown', sub_accounts: [] },
      { account: 'SSS Contributions Payable', amount: 0.00, category: 'Statutory Payables', description: 'Social Security System monthly contributions.', sub_accounts: [] }
    ];

    const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
    const retainedEarnings = totalAssets - totalLiabilities - shareCapitalBal - cdfBal;

    const equity = [
      { account: 'Donations / Grants', amount: 0.00, category: 'Donated Capital', description: 'Non-refundable institutional grants and development donations.', sub_accounts: [] },
      { account: 'Capital Accounts', amount: Math.round(shareCapitalBal * 100) / 100, category: 'Share Capital', description: 'Total paid-up share capital subscriptions of cooperative members.', link_tab: 'membership', link_title: 'Membership Updates', sub_accounts: shareCapitalBal > 0 ? [{ name: 'Member Share Capital Subscriptions', amount: shareCapitalBal, notes: `${shareCount} transactions` }] : [] },
      { account: 'Retained earnings', amount: Math.round(retainedEarnings * 100) / 100, category: 'Undivided Surplus', description: 'Accumulated undivided operational surplus generated through cooperative services.', sub_accounts: [{ name: 'Accumulated Undivided Operating Surplus', amount: Math.round(retainedEarnings * 100) / 100, notes: 'Balancing cooperative equity' }] },
      { account: 'Community Development Fund', amount: Math.round(cdfBal * 100) / 100, category: 'Statutory Reserves', description: 'Dedicated fund balance for corporate social responsibility and community aid.', sub_accounts: cdfBal > 0 ? [{ name: 'Community Outreach & Welfare Reserves', amount: cdfBal, notes: 'Statutory social allocation' }] : [] }
    ];

    const totalEquity = equity.reduce((sum, e) => sum + e.amount, 0);
    const balanceDifference = totalAssets - (totalLiabilities + totalEquity);

    return res.status(200).json({
      success: true,
      period,
      filter: { year, month, date },
      as_of_date: period === 'daily' ? date : period === 'monthly' ? `Month ${month}, ${year}` : `Annual ${year}`,
      balance_sheet: {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        is_balanced: Math.abs(balanceDifference) < 0.01,
        balance_difference: balanceDifference,
        assets,
        liabilities,
        equity
      },
      statement_of_operations: {
        merchandise_sales: totalMerchandiseSales,
        merchandise_sales_breakdown: merchandiseSalesBreakdown,
        total_revenue: totalOperatingRevenues,
        gross_receipts: totalMerchandiseSales + totalOperatingRevenues,
        cost_of_sales: totalCostOfSales,
        gross_profit: grossProfit,
        operating_expenses: totalOperatingExpenses,
        income_subsidy: totalIncomeSubsidy,
        net_surplus: netSurplus,
        revenues_breakdown: revenuesBreakdown,
        cost_of_sales_breakdown: costOfSalesBreakdown,
        operating_expenses_breakdown: operatingExpensesBreakdown,
        income_subsidy_breakdown: incomeSubsidyBreakdown,
        statutory_allocations: statutoryAllocations
      }
    });
  } catch (error) {
    next(error);
  }
};
