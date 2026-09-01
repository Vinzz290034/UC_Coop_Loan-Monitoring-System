import XLSX from 'xlsx';
import fs from 'fs';
import pool, { query } from '../config/db.js';

// Helper: Safely extract cell value
const cellVal = (sheet, r, c) => {
  const cellAddress = XLSX.utils.encode_cell({ r, c });
  const cell = sheet[cellAddress];
  if (!cell) return null;
  return cell.v !== undefined ? cell.v : null;
};

// Helper: Safely parse date value into YYYY-MM-DD or null
const parseExcelDate = (val) => {
  if (val === null || val === undefined || val === '') return null;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    if (year >= 1900 && year <= 2100) {
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return null;
    try {
      const utc_days = Math.floor(val - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      if (!isNaN(date_info.getTime())) {
        const year = date_info.getUTCFullYear();
        const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date_info.getUTCDate()).padStart(2, '0');
        if (year >= 1900 && year <= 2100) {
          return `${year}-${month}-${day}`;
        }
      }
    } catch (e) {}
    return null;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || ['n/a', 'na', '-', '--', 'none', 'null', 'date', 'date paid', 'date deposited', 'due date', 'end of term', 'interest', 'principal', 'monthly due', 'fines', 'amount paid', 'balance'].includes(trimmed.toLowerCase())) {
      return null;
    }

    if (trimmed.includes('&') || trimmed.includes(',')) {
      const parts = trimmed.split(/[&,]/).map(s => s.trim());
      for (let i = parts.length - 1; i >= 0; i--) {
        const parsed = parseExcelDate(parts[i]);
        if (parsed) return parsed;
      }
    }

    const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
      const day = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
      if (year >= 1900 && year <= 2100) return `${year}-${month}-${day}`;
    }

    const usMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (usMatch) {
      let year = parseInt(usMatch[3], 10);
      if (year < 100) year += 2000;
      const month = String(parseInt(usMatch[1], 10)).padStart(2, '0');
      const day = String(parseInt(usMatch[2], 10)).padStart(2, '0');
      if (year >= 1900 && year <= 2100) return `${year}-${month}-${day}`;
    }

    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        if (year >= 1900 && year <= 2100) {
          return `${year}-${month}-${day}`;
        }
      }
    } catch (e) {}
  }

  return null;
};

// Helper: Safely parse date from Excel cell and format as YYYY-MM-DD or null
const cellDateIso = (sheet, r, c) => {
  return parseExcelDate(cellVal(sheet, r, c));
};

// Helper: Safely calculate maturity date as YYYY-MM-DD
const calcMaturityDate = (loanDateStr, endTermDateStr, termsVal) => {
  if (endTermDateStr) return endTermDateStr;
  if (!loanDateStr) return null;
  try {
    const parts = loanDateStr.split('-').map(Number);
    if (parts.length === 3 && parts[0] > 1900) {
      const termMonths = parseInt(termsVal, 10) || 12;
      const d = new Date(Date.UTC(parts[0], parts[1] - 1 + termMonths, parts[2]));
      if (!isNaN(d.getTime())) {
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  } catch (e) {}
  return null;
};

// Helper: Safe DB Date instance for SQL parameters
const safeDbDate = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  const str = String(val).trim();
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

// Helper: Clean monetary / numeric values
const cleanAmount = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val * 100) / 100;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }
  return 0;
};

// Helper: Clean strings
const cleanStr = (val) => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

// Helper: Parse member name from Sheet tab
const parseMemberName = (sheetName) => {
  const cleanTab = sheetName.trim();
  if (cleanTab.includes(',')) {
    const parts = cleanTab.split(',');
    const lastName = parts[0].trim();
    const firstName = parts.slice(1).join(' ').trim() || 'Member';
    return { firstName, lastName, fullName: `${firstName} ${lastName}` };
  }

  // If no comma, check if multiple words
  const parts = cleanTab.split(/\s+/);
  if (parts.length > 1) {
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return { firstName, lastName, fullName: cleanTab };
  }

  return { firstName: cleanTab, lastName: 'Member', fullName: `${cleanTab} Member` };
};

// Core parser function that extracts structured data from workbook buffer or file
export const parseExcelWorkbook = async (bufferOrPath) => {
  const workbook = typeof bufferOrPath === 'string'
    ? XLSX.readFile(bufferOrPath, { cellDates: false })
    : XLSX.read(bufferOrPath, { type: 'buffer', cellDates: false });

  const parsedSheets = [];
  const systemLoanProducts = await query('SELECT id, name, interest_rate, amortization_type FROM loan_products WHERE is_active = true');
  const defaultProduct = systemLoanProducts.rows[0] || null;

  for (const sheetName of workbook.SheetNames) {
    // Skip obvious system, summary, totals, or template sheets
    const lowerTab = sheetName.toLowerCase().trim();
    if (
      ['instructions', 'instruction', 'template', 'summary', 'settings', 'master', 'sheet1_example', 'sum-sc', 'sum_sc', 'sum sc', 'total', 'totals', 'grand total', 'all'].includes(lowerTab) ||
      lowerTab.startsWith('sum-') ||
      lowerTab.startsWith('sum_') ||
      lowerTab.startsWith('sum ') ||
      lowerTab.startsWith('summary') ||
      lowerTab.startsWith('total')
    ) {
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;

    const range = XLSX.utils.decode_range(sheet['!ref']);
    if (range.e.r < 1) continue; // Not enough rows

    const { firstName, lastName, fullName } = parseMemberName(sheetName);

    // Look for member demographics if available in top rows
    const birthDateStr = cellDateIso(sheet, 1, 9);
    const phoneRaw = cellVal(sheet, 1, 13);
    let phone = phoneRaw ? String(phoneRaw).replace(/[^0-9+]/g, '') : '';
    if (phone.length > 15) phone = phone.slice(0, 15);

    const memberData = {
      sheetName,
      firstName,
      lastName,
      fullName,
      phone: phone || null,
      birthDate: birthDateStr,
      shareCapitalDeposits: [],
      shareCapitalTotal: 0,
      loans: []
    };

    let currentLoan = null;

    // Scan all rows starting from row 1 (Row 2 in Excel)
    for (let r = 1; r <= range.e.r; r++) {
      // 1. Share Capital Columns (A, B, C)
      const scDateStr = cellDateIso(sheet, r, 0);       // Col A: DATE DEPOSITED
      const scInvoice = cleanStr(cellVal(sheet, r, 1)); // Col B: INVOICE / LAF NO
      const scAmount = cleanAmount(cellVal(sheet, r, 2)); // Col C: SHARED CAPITAL

      // Check if this row is a genuine deposit (must have amount > 0 and a deposit date or invoice)
      if (scAmount > 0 && (scDateStr || scInvoice)) {
        memberData.shareCapitalDeposits.push({
          row: r + 1,
          date: scDateStr,
          invoiceNo: scInvoice || 'SD',
          amount: scAmount
        });
        memberData.shareCapitalTotal += scAmount;
      }

      // 2. Loan Columns (D - R)
      const loanDateStr = cellDateIso(sheet, r, 3);       // Col D: DATE
      const lafNo = cleanStr(cellVal(sheet, r, 4));        // Col E: LAF NO
      const amountLoaned = cleanAmount(cellVal(sheet, r, 5)); // Col F: AMOUNT LOANED
      const mode = cleanStr(cellVal(sheet, r, 6));        // Col G: MODE (e.g. SD, SD2)
      const termsRaw = cellVal(sheet, r, 7);              // Col H: TERMS
      const endTermDateStr = cellDateIso(sheet, r, 8);    // Col I: END OF TERM

      // Repayment / Installment Columns
      const interestDue = cleanAmount(cellVal(sheet, r, 9));   // Col J: INTEREST
      const principalDue = cleanAmount(cellVal(sheet, r, 10)); // Col K: PRINCIPAL
      const monthlyDue = cleanAmount(cellVal(sheet, r, 11));   // Col L: MONTHLY DUE
      const fines = cleanAmount(cellVal(sheet, r, 12));        // Col M: FINES
      const amountPaid = cleanAmount(cellVal(sheet, r, 13));   // Col N: AMOUNT PAID
      const balance = cleanAmount(cellVal(sheet, r, 14));      // Col O: BALANCE
      const principalBalance = cleanAmount(cellVal(sheet, r, 15)); // Col P: Principal loan balance
      const invoiceNo = cleanStr(cellVal(sheet, r, 16));       // Col Q: INVOICE NO
      const datePaidStr = cellDateIso(sheet, r, 17);           // Col R: DATE PAID

      // Check if this row starts a new Loan Application
      if (amountLoaned > 0 && lafNo) {
        const termsVal = termsRaw ? parseInt(String(termsRaw), 10) : 12;
        const maturityDate = calcMaturityDate(loanDateStr, endTermDateStr, termsVal);

        // Check next row's Col E for product tag (e.g. EMERGENCY, CASH EXPRESS, SO)
        const nextRowTag = r < range.e.r ? cleanStr(cellVal(sheet, r + 1, 4)) : '';

        currentLoan = {
          row: r + 1,
          lafNo,
          productTag: nextRowTag || mode || '',
          principalAmount: amountLoaned,
          mode: mode || 'SD',
          terms: termsVal || 12,
          disbursedAt: loanDateStr,
          maturityDate,
          initialMonthlyDue: monthlyDue > 0 ? monthlyDue : null,
          installments: [],
          totalPaid: 0,
          remainingBalance: amountLoaned,
          status: 'disbursed'
        };
        memberData.loans.push(currentLoan);
      }

      // If a loan is active, check for installment / payment records on this row
      if (currentLoan) {
        // Skip creating an installment if this row is strictly a loan origination/header row (no payment or specific schedule breakdown)
        const isHeaderOnly = (amountLoaned > 0 && lafNo) && amountPaid === 0 && !datePaidStr && !invoiceNo && principalDue === 0 && interestDue === 0;
        const hasPayment = amountPaid > 0 || datePaidStr !== null || invoiceNo !== '';
        const hasSchedule = principalDue > 0 || interestDue > 0 || (monthlyDue > 0 && !isHeaderOnly);

        if (!isHeaderOnly && (hasPayment || hasSchedule)) {
          const installmentNumber = currentLoan.installments.length + 1;
          const instDueDate = loanDateStr || datePaidStr || currentLoan.disbursedAt || new Date().toISOString().split('T')[0];
          const instDatePaid = datePaidStr;

          // If principalDue and monthlyDue are not specified, default to amountPaid if paid, or calculate amortized amount
          let pDue = principalDue > 0 ? principalDue : (monthlyDue > 0 ? monthlyDue : (amountPaid > 0 ? amountPaid : (currentLoan.principalAmount / currentLoan.terms)));
          let iDue = interestDue > 0 ? interestDue : (monthlyDue > pDue ? monthlyDue - pDue : 0);
          let tDue = monthlyDue > 0 ? monthlyDue : (pDue + iDue);

          const isPaidThru = invoiceNo && invoiceNo.toUpperCase().includes('PAID THRU');
          const effectivePaid = amountPaid > 0 ? amountPaid : (isPaidThru && datePaidStr ? (pDue + iDue) : 0);

          const lastInst = currentLoan.installments.length > 0 ? currentLoan.installments[currentLoan.installments.length - 1] : null;
          const isAdvanceCutoff = lastInst && (lastInst.amountPaid < lastInst.totalDue) && (!principalDue && !interestDue && !monthlyDue);

          if (isAdvanceCutoff && effectivePaid > 0) {
            lastInst.amountPaid = Math.round((lastInst.amountPaid + effectivePaid) * 100) / 100;
            lastInst.principalPaid = Math.min(lastInst.principalDue, Math.round((lastInst.principalPaid + effectivePaid) * 100) / 100);
            if (lastInst.amountPaid >= lastInst.principalDue) {
              lastInst.interestPaid = Math.min(lastInst.interestDue, Math.round((lastInst.amountPaid - lastInst.principalDue) * 100) / 100);
            }
            lastInst.isPaid = lastInst.amountPaid >= lastInst.totalDue;
            if (instDatePaid) {
              lastInst.datePaid = instDatePaid;
            }
            lastInst.balanceAfter = balance;
            lastInst.principalBalanceAfter = principalBalance;
            currentLoan.totalPaid += effectivePaid;
          } else {
            const inst = {
              installmentNumber,
              row: r + 1,
              dueDate: instDueDate,
              principalDue: Math.round(pDue * 100) / 100,
              interestDue: Math.round(iDue * 100) / 100,
              totalDue: Math.round(tDue * 100) / 100,
              finesDue: fines,
              amountPaid: effectivePaid,
              principalPaid: principalDue > 0 && effectivePaid >= principalDue ? principalDue : (effectivePaid > 0 ? Math.min(effectivePaid, pDue) : 0),
              interestPaid: interestDue > 0 && effectivePaid >= interestDue ? interestDue : 0,
              balanceAfter: balance,
              principalBalanceAfter: principalBalance,
              invoiceNo: invoiceNo || mode || 'SD',
              datePaid: instDatePaid,
              isPaid: effectivePaid >= tDue || (balance === 0 && instDatePaid !== null)
            };

            currentLoan.installments.push(inst);
            currentLoan.totalPaid += effectivePaid;
          }

          const balanceRaw = cellVal(sheet, r, 14);
          if (balanceRaw !== null && balanceRaw !== undefined && String(balanceRaw).trim() !== '') {
            currentLoan.remainingBalance = balance;
          }
        }
      }
    }

    // Determine final status for each loan
    for (const l of memberData.loans) {
      if (l.remainingBalance === 0 || (l.totalPaid >= l.principalAmount && l.totalPaid > 0)) {
        l.status = 'fully_paid';
        // When loan is fully paid, ensure all paid installments are marked fully paid
        for (const inst of l.installments) {
          if (inst.amountPaid > 0) {
            inst.principalDue = inst.principalPaid;
            inst.interestDue = inst.interestPaid;
            inst.totalDue = inst.principalPaid + inst.interestPaid;
            inst.isPaid = true;
          }
        }
      } else {
        l.status = 'disbursed';
      }
    }

    // Only include sheet if it contains share capital deposits or loans
    if (memberData.shareCapitalDeposits.length > 0 || memberData.loans.length > 0) {
      parsedSheets.push(memberData);
    }
  }

  // Cross-reference existing database members
  const existingMembersRes = await query('SELECT id, first_name, last_name, email FROM members');
  const existingMembersMap = new Map();
  for (const m of existingMembersRes.rows) {
    const key = `${m.first_name.toLowerCase().trim()}_${m.last_name.toLowerCase().trim()}`;
    existingMembersMap.set(key, m);
  }

  let totalShareCapitalCount = 0;
  let totalShareCapitalSum = 0;
  let totalLoansCount = 0;
  let totalLoanAmount = 0;
  let totalPaymentsCount = 0;
  let totalPaymentsSum = 0;
  let existingMembersCount = 0;
  let newMembersCount = 0;

  for (const sheet of parsedSheets) {
    const key = `${sheet.firstName.toLowerCase()}_${sheet.lastName.toLowerCase()}`;
    if (existingMembersMap.has(key)) {
      sheet.existingMember = true;
      sheet.memberId = existingMembersMap.get(key).id;
      existingMembersCount++;
    } else {
      sheet.existingMember = false;
      sheet.memberId = null;
      newMembersCount++;
    }

    totalShareCapitalCount += sheet.shareCapitalDeposits.length;
    totalShareCapitalSum += sheet.shareCapitalTotal;

    totalLoansCount += sheet.loans.length;
    for (const l of sheet.loans) {
      totalLoanAmount += l.principalAmount;
      totalPaymentsCount += l.installments.filter(i => i.isPaid).length;
      totalPaymentsSum += l.totalPaid;
    }
  }

  return {
    summary: {
      totalSheetsFound: workbook.SheetNames.length,
      totalParsedMembers: parsedSheets.length,
      newMembersCount,
      existingMembersCount,
      totalShareCapitalDeposits: totalShareCapitalCount,
      totalShareCapitalSum: Math.round(totalShareCapitalSum * 100) / 100,
      totalLoans: totalLoansCount,
      totalLoanAmount: Math.round(totalLoanAmount * 100) / 100,
      totalPayments: totalPaymentsCount,
      totalPaymentsSum: Math.round(totalPaymentsSum * 100) / 100,
    },
    defaultProductId: defaultProduct?.id || null,
    members: parsedSheets
  };
};

// ==========================================
// 1. PREVIEW IMPORT WORKBOOK (DRY-RUN)
// @route   POST /api/import/preview
// @access  Protected (Admin, Staff)
// ==========================================
export const previewImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No Excel file uploaded. Please upload a .xlsx or .xls spreadsheet.' }
      });
    }

    const parsedData = await parseExcelWorkbook(req.file.path);

    // Clean up uploaded temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (_) {}

    res.status(200).json({
      success: true,
      message: `Workbook parsed successfully. Found ${parsedData.summary.totalParsedMembers} member records.`,
      data: parsedData
    });
  } catch (error) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    next(error);
  }
};

// ==========================================
// 2. COMMIT IMPORT (TRANSACTION PERSISTENCE)
// @route   POST /api/import/execute
// @access  Protected (Admin, Staff)
// ==========================================
export const executeImport = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { membersData } = req.body;

    if (!membersData || !Array.isArray(membersData) || membersData.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No parsed member data provided to import.' }
      });
    }

    await client.query('BEGIN');

    // 1. Get all active loan products for mapping imported loans
    const prodRes = await client.query('SELECT id, name, interest_rate FROM loan_products WHERE is_active = true');
    const systemProducts = prodRes.rows;
    const defaultProductId = systemProducts[0]?.id || null;
    const defaultInterestRate = systemProducts[0]?.interest_rate || 0.02;

    const matchProductForLoan = (l) => {
      const tag = (l.productTag || l.mode || l.lafNo || '').toLowerCase();
      if (tag.includes('emergenc')) return systemProducts.find(p => p.name.toLowerCase().includes('emergency')) || systemProducts[0];
      if (tag.includes('cash express') || tag.includes('express')) return systemProducts.find(p => p.name.toLowerCase().includes('cash express')) || systemProducts[0];
      if (tag === 'so' || tag.includes('special occasion') || tag.includes('occasion')) return systemProducts.find(p => p.name.toLowerCase().includes('special occasion')) || systemProducts[0];
      if (tag.includes('utility')) return systemProducts.find(p => p.name.toLowerCase().includes('utility')) || systemProducts[0];
      if (tag.includes('calamity')) return systemProducts.find(p => p.name.toLowerCase().includes('calamity')) || systemProducts[0];
      if (tag.includes('project')) return systemProducts.find(p => p.name.toLowerCase().includes('project')) || systemProducts[0];
      
      const pAmt = parseFloat(l.principalAmount || 0);
      const termsNum = parseInt(l.terms || 0, 10);
      if (pAmt === 3000 && termsNum === 1) return systemProducts.find(p => p.name.toLowerCase().includes('utility')) || systemProducts[0];
      if (pAmt === 5000 && (termsNum === 2 || l.mode === 'SD2')) return systemProducts.find(p => p.name.toLowerCase().includes('emergency')) || systemProducts[0];
      if (pAmt === 7000 && (termsNum === 2 || l.mode === 'SD2')) return systemProducts.find(p => p.name.toLowerCase().includes('cash express')) || systemProducts[0];
      if (pAmt === 10000 && (termsNum === 3 || l.mode === 'SD2' || l.mode === 'SD30')) return systemProducts.find(p => p.name.toLowerCase().includes('special occasion')) || systemProducts[0];
      
      return systemProducts.find(p => p.name.toLowerCase().includes('regular loan - salary deduction')) || systemProducts[0];
    };

    // 2. Pre-cache existing database entities to eliminate 30,000+ sequential round-trips
    const memRes = await client.query('SELECT id, LOWER(first_name) as fn, LOWER(last_name) as ln FROM members');
    const memberMap = new Map();
    for (const m of memRes.rows) {
      memberMap.set(`${m.fn}_${m.ln}`, m.id);
    }

    const scRes = await client.query('SELECT member_id, amount, invoice_no, transaction_date::date as tdate FROM share_capital_transactions');
    const scSet = new Set();
    for (const sc of scRes.rows) {
      const dStr = sc.tdate ? new Date(sc.tdate).toISOString().split('T')[0] : '';
      scSet.add(`${sc.member_id}_${parseFloat(sc.amount)}_${sc.invoice_no || 'SD'}_${dStr}`);
    }

    const balRes = await client.query(
      `SELECT member_id, COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0) as current_balance
       FROM share_capital_transactions WHERE status = 'completed' GROUP BY member_id`
    );
    const scBalMap = new Map();
    for (const b of balRes.rows) {
      scBalMap.set(b.member_id, parseFloat(b.current_balance));
    }

    const loansRes = await client.query('SELECT id, member_id, laf_no, principal_amount, disbursed_at::date as ddate FROM loans');
    const loanMap = new Map();
    for (const l of loansRes.rows) {
      const dStr = l.ddate ? new Date(l.ddate).toISOString().split('T')[0] : '';
      if (l.laf_no) loanMap.set(`${l.member_id}_${l.laf_no.toLowerCase()}`, l.id);
      loanMap.set(`${l.member_id}_${parseFloat(l.principal_amount)}_${dStr}`, l.id);
    }

    const schedRes = await client.query('SELECT id, loan_id, installment_number FROM repayment_schedules');
    const schedMap = new Map();
    for (const s of schedRes.rows) {
      schedMap.set(`${s.loan_id}_${s.installment_number}`, s.id);
    }

    const payRes = await client.query('SELECT id, loan_id, amount, payment_date::date as pdate, reference_no FROM loan_payments');
    const payMap = new Map();
    for (const p of payRes.rows) {
      const dStr = p.pdate ? new Date(p.pdate).toISOString().split('T')[0] : '';
      payMap.set(`${p.loan_id}_${parseFloat(p.amount)}_${dStr}_${p.reference_no}`, p.id);
    }

    const allocRes = await client.query('SELECT loan_payment_id, repayment_schedule_id FROM loan_payment_allocations');
    const allocSet = new Set();
    for (const a of allocRes.rows) {
      allocSet.add(`${a.loan_payment_id}_${a.repayment_schedule_id}`);
    }

    let membersCreated = 0;
    let membersUpdated = 0;
    let shareDepositsCreated = 0;
    let loansCreated = 0;
    let schedulesCreated = 0;
    let paymentsCreated = 0;

    for (const mem of membersData) {
      const { firstName, lastName, phone, birthDate, shareCapitalDeposits, loans } = mem;
      if (!firstName || !lastName) continue;

      const memKey = `${firstName.toLowerCase().trim()}_${lastName.toLowerCase().trim()}`;
      let memberId = mem.memberId || memberMap.get(memKey);

      // 1. Check or Create Member
      if (!memberId) {
        const insertMem = await client.query(
          `INSERT INTO members (user_id, first_name, last_name, email, phone, date_of_birth, status, profile_completed)
           VALUES (NULL, $1, $2, NULL, $3, $4, 'active', true) RETURNING id`,
          [firstName, lastName, phone || null, safeDbDate(birthDate)]
        );
        memberId = insertMem.rows[0].id;
        memberMap.set(memKey, memberId);
        membersCreated++;
      } else {
        membersUpdated++;
      }

      // 2. Insert Share Capital Deposits
      if (shareCapitalDeposits && shareCapitalDeposits.length > 0) {
        for (const sc of shareCapitalDeposits) {
          const scAmount = parseFloat(sc.amount);
          if (scAmount <= 0) continue;

          const transDate = safeDbDate(sc.date) || new Date();
          const dStr = transDate.toISOString().split('T')[0];
          const invoice = sc.invoiceNo || 'SD';
          const scKey = `${memberId}_${scAmount}_${invoice}_${dStr}`;

          if (!scSet.has(scKey)) {
            const currentBal = scBalMap.get(memberId) || 0;
            const balanceAfter = currentBal + scAmount;
            scBalMap.set(memberId, balanceAfter);

            await client.query(
              `INSERT INTO share_capital_transactions (member_id, transaction_type, amount, balance_after, transaction_date, invoice_no, remarks, status)
               VALUES ($1, 'credit', $2, $3, $4, $5, $6, 'completed')`,
              [
                memberId,
                scAmount,
                balanceAfter,
                transDate,
                invoice,
                `Imported from Excel - LAF/Invoice: ${invoice}`
              ]
            );
            scSet.add(scKey);
            shareDepositsCreated++;
          }
        }
      }

      // 3. Insert Loans and Schedules
      if (loans && loans.length > 0) {
        for (const l of loans) {
          const pAmount = parseFloat(l.principalAmount);
          if (pAmount <= 0) continue;

          const lafNo = l.lafNo || 'LEGACY';
          const disbDate = safeDbDate(l.disbursedAt) || new Date();
          const dStr = disbDate.toISOString().split('T')[0];
          const matDate = safeDbDate(l.maturityDate);
          const terms = parseInt(l.terms || 12, 10);
          const loanStatus = l.status || 'disbursed';

          const matchedProd = matchProductForLoan(l);
          const resolvedProductId = matchedProd?.id || defaultProductId;
          const resolvedInterestRate = matchedProd?.interest_rate || defaultInterestRate;

          const loanKey1 = `${memberId}_${lafNo.toLowerCase()}`;
          const loanKey2 = `${memberId}_${pAmount}_${dStr}`;
          let loanId = loanMap.get(loanKey1) || loanMap.get(loanKey2);

          if (!loanId) {
            const insertLoan = await client.query(
              `INSERT INTO loans (member_id, loan_product_id, principal_amount, interest_rate, term_months, amortization_type, status, laf_no, payment_mode, disbursed_at, maturity_date)
               VALUES ($1, $2, $3, $4, $5, 'flat_rate', $6, $7, $8, $9, $10) RETURNING id`,
              [
                memberId,
                resolvedProductId,
                pAmount,
                resolvedInterestRate,
                terms,
                loanStatus,
                lafNo,
                l.mode || 'SD',
                disbDate,
                matDate
              ]
            );
            loanId = insertLoan.rows[0].id;
            loanMap.set(loanKey1, loanId);
            loanMap.set(loanKey2, loanId);
            loansCreated++;
          }

          // 4. Insert Installments and Payments
          if (l.installments && l.installments.length > 0) {
            for (const inst of l.installments) {
              const instNum = inst.installmentNumber;
              const dueDate = safeDbDate(inst.dueDate) || disbDate;
              const pDue = parseFloat(inst.principalDue || 0);
              const iDue = parseFloat(inst.interestDue || 0);
              const tDue = parseFloat(inst.totalDue || (pDue + iDue));
              const finesDue = parseFloat(inst.finesDue || 0);
              const amtPaid = parseFloat(inst.amountPaid || 0);
              let pPaid = parseFloat(inst.principalPaid || 0);
              let iPaid = parseFloat(inst.interestPaid || 0);
              if (amtPaid > 0 && pPaid === 0 && iPaid === 0) {
                pPaid = amtPaid;
              }
              const isPaid = inst.isPaid && amtPaid > 0;
              const instStatus = (l.status === 'fully_paid' && isPaid) ? 'paid' : (isPaid ? (amtPaid >= tDue ? 'paid' : 'partially_paid') : 'unpaid');
              const finalPDue = (l.status === 'fully_paid' && isPaid && pDue > pPaid) ? pPaid : pDue;
              const finalTDue = Math.max(0.01, (l.status === 'fully_paid' && isPaid && tDue > (pPaid + iPaid)) ? (pPaid + iPaid) : (tDue > 0 ? tDue : 0.01));

              // Upsert Repayment Schedule
              const schedKey = `${loanId}_${instNum}`;
              let scheduleId = schedMap.get(schedKey);

              if (scheduleId) {
                if (isPaid) {
                  await client.query(
                    `UPDATE repayment_schedules
                     SET principal_due = $1, total_due = $2, principal_paid = $3, interest_paid = $4, fines_due = $5, status = $6
                     WHERE id = $7`,
                    [finalPDue, finalTDue, pPaid, iPaid, finesDue, instStatus, scheduleId]
                  );
                }
              } else {
                const insertSched = await client.query(
                  `INSERT INTO repayment_schedules (loan_id, installment_number, due_date, principal_due, interest_due, total_due, fines_due, principal_paid, interest_paid, status)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
                  [
                    loanId,
                    instNum,
                    dueDate,
                    finalPDue,
                    iDue,
                    finalTDue,
                    finesDue,
                    pPaid,
                    iPaid,
                    instStatus
                  ]
                );
                scheduleId = insertSched.rows[0].id;
                schedMap.set(schedKey, scheduleId);
                schedulesCreated++;
              }

              // 5. Insert Loan Payment if paid
              if (isPaid && amtPaid > 0) {
                const payDate = safeDbDate(inst.datePaid) || dueDate;
                const payDStr = payDate.toISOString().split('T')[0];
                const payRef = inst.invoiceNo || lafNo || 'EXCEL_IMPORT';
                const payKey = `${loanId}_${amtPaid}_${payDStr}_${payRef}`;

                let paymentId = payMap.get(payKey);
                if (!paymentId) {
                  const insertPay = await client.query(
                    `INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_no)
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [loanId, amtPaid, payDate, inst.invoiceNo || 'SD', payRef]
                  );
                  paymentId = insertPay.rows[0].id;
                  payMap.set(payKey, paymentId);
                  paymentsCreated++;
                }

                // Payment Allocation
                const allocKey = `${paymentId}_${scheduleId}`;
                if (!allocSet.has(allocKey) && (pPaid + iPaid > 0)) {
                  await client.query(
                    `INSERT INTO loan_payment_allocations (loan_payment_id, repayment_schedule_id, principal_allocated, interest_allocated)
                     VALUES ($1, $2, $3, $4)`,
                    [paymentId, scheduleId, pPaid, iPaid]
                  );
                  allocSet.add(allocKey);
                }
              }
            }
          }
        }
      }
    }

    // Record Audit Log
    try {
      await client.query(
        `INSERT INTO audit_logs (user_id, username, action, module, method, endpoint, status_code, status, ip_address, user_agent, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          req.user?.id || null,
          req.user?.username || req.user?.email || 'admin',
          'IMPORT_EXCEL_DATA',
          'DATA_IMPORT',
          req.method,
          req.originalUrl || '/api/import/confirm',
          200,
          'success',
          req.ip || '127.0.0.1',
          req.headers['user-agent'] || 'System Import Agent',
          JSON.stringify({
            membersCreated,
            membersUpdated,
            shareDepositsCreated,
            loansCreated,
            schedulesCreated,
            paymentsCreated,
            importedAt: new Date().toISOString()
          })
        ]
      );
    } catch (auditErr) {
      console.warn('Failed to insert import audit log:', auditErr.message);
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Excel data imported successfully!',
      data: {
        membersCreated,
        membersUpdated,
        shareDepositsCreated,
        loansCreated,
        schedulesCreated,
        paymentsCreated
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// ==========================================
// 3. BULK UPDATE MEMBERS REGISTRY & CREDENTIALS
// @route   POST /api/import/members-registry
// @access  Protected (Admin, Staff)
// ==========================================
export const importMembersRegistry = async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { message: 'No Excel file uploaded. Please upload a .xlsx spreadsheet.' }
      });
    }

    const workbook = XLSX.readFile(req.file.path, { cellDates: false });

    // Clean up uploaded temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (_) {}

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'The uploaded file contains no sheets.' }
      });
    }

    // Select strictly the 'PROFILE' sheet (ignoring copies, ledger sheets or secondary tabs)
    let targetSheetName = workbook.SheetNames.find(s => s.trim().toUpperCase() === 'PROFILE')
      || workbook.SheetNames.find(s => s.trim().toUpperCase().includes('PROFILE') && !s.trim().toUpperCase().includes('COPY'))
      || workbook.SheetNames[0];

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet || !sheet['!ref']) {
      return res.status(400).json({
        success: false,
        error: { message: `Sheet '${targetSheetName}' contains no data.` }
      });
    }

    const range = XLSX.utils.decode_range(sheet['!ref']);

    // Find header row (search first 10 rows for 'LAST NAME' or 'MEMBER NO' or 'MEMBER NO.')
    let headerRow = -1;
    let colMap = {
      memberNo: -1,
      lastName: -1,
      firstName: -1,
      middleName: -1,
      tin: -1,
      membershipType: -1,
      age: -1,
      gender: -1,
      civilStatus: -1,
      email: -1,
      phone: -1,
      address: -1,
      dateOfBirth: -1
    };

    for (let r = 0; r <= Math.min(10, range.e.r); r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const val = cleanStr(cellVal(sheet, r, c)).toUpperCase();
        if (val === 'MEMBER NO.' || val === 'MEMBER NO' || val === 'MEMBER ID') colMap.memberNo = c;
        else if (val === 'LAST NAME' || val === 'LASTNAME') colMap.lastName = c;
        else if (val === 'FIRST NAME' || val === 'FIRSTNAME') colMap.firstName = c;
        else if (val === 'MIDDLE NAME' || val === 'MIDDLENAME') colMap.middleName = c;
        else if (val === 'TIN' || val === 'TIN NO' || val === 'TIN NO.') colMap.tin = c;
        else if (val === 'TYPE OF MEMBERSHIP' || val === 'MEMBERSHIP TYPE' || val === 'MEMBERSHIP') colMap.membershipType = c;
        else if (val === 'AGE') colMap.age = c;
        else if (val === 'GENDER' || val === 'SEX') colMap.gender = c;
        else if (val === 'CIVIL STATUS' || val === 'MARITAL STATUS') colMap.civilStatus = c;
        else if (val === 'EMAIL' || val === 'EMAIL ADDRESS') colMap.email = c;
        else if (val === 'CONTACT NO.' || val === 'CONTACT NO' || val === 'MOBILE' || val === 'PHONE') colMap.phone = c;
        else if (val === 'ADDRESS' || val === 'RESIDENCE') colMap.address = c;
        else if (val === 'BIRTHDAY' || val === 'DATE OF BIRTH' || val === 'DOB') colMap.dateOfBirth = c;
      }

      if (colMap.lastName !== -1 && colMap.firstName !== -1) {
        headerRow = r;
        break;
      }
    }

    if (headerRow === -1 || colMap.lastName === -1 || colMap.firstName === -1) {
      return res.status(400).json({
        success: false,
        error: { message: `Could not detect FIRST NAME and LAST NAME columns in sheet '${targetSheetName}'.` }
      });
    }

    await client.query('BEGIN');

    // Fetch existing members from DB
    const existingMembersRes = await client.query(`
      SELECT id, member_no, LOWER(first_name) as fn, LOWER(last_name) as ln, LOWER(COALESCE(middle_name, '')) as mn
      FROM members
    `);

    const cleanToken = (str) => (str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '');

    let updatedCount = 0;
    let createdCount = 0;
    const updateLogs = [];

    // Parse each data row after headerRow
    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const rawFirstName = cleanStr(cellVal(sheet, r, colMap.firstName));
      const rawLastName = cleanStr(cellVal(sheet, r, colMap.lastName));
      const rawMiddleName = colMap.middleName !== -1 ? cleanStr(cellVal(sheet, r, colMap.middleName)) : '';
      const rawMemberNo = colMap.memberNo !== -1 ? cleanStr(cellVal(sheet, r, colMap.memberNo)) : '';
      const rawTin = colMap.tin !== -1 ? cleanStr(cellVal(sheet, r, colMap.tin)) : '';
      const rawMembershipType = colMap.membershipType !== -1 ? cleanStr(cellVal(sheet, r, colMap.membershipType)) : '';

      // Demographics if columns exist
      const rawAgeStr = colMap.age !== -1 ? cleanStr(cellVal(sheet, r, colMap.age)) : '';
      const parsedAge = rawAgeStr ? parseInt(rawAgeStr, 10) : null;
      const ageVal = (!isNaN(parsedAge) && parsedAge > 0) ? parsedAge : null;

      let genderVal = null;
      if (colMap.gender !== -1) {
        const g = cleanStr(cellVal(sheet, r, colMap.gender)).toUpperCase();
        if (g.startsWith('M') || g.includes('MALE')) genderVal = 'Male';
        else if (g.startsWith('F') || g.includes('FEMALE')) genderVal = 'Female';
      }

      let civilStatusVal = null;
      if (colMap.civilStatus !== -1) {
        const cs = cleanStr(cellVal(sheet, r, colMap.civilStatus)).toLowerCase();
        if (cs.includes('single')) civilStatusVal = 'Single';
        else if (cs.includes('married')) civilStatusVal = 'Married';
        else if (cs.includes('widow')) civilStatusVal = 'Widowed';
        else if (cs.includes('separat')) civilStatusVal = 'Separated';
        else if (cs.includes('divorced')) civilStatusVal = 'Divorced';
      }

      let emailVal = colMap.email !== -1 ? cleanStr(cellVal(sheet, r, colMap.email)).toLowerCase() : null;
      if (emailVal && !emailVal.includes('@')) emailVal = null;

      let phoneVal = colMap.phone !== -1 ? cleanStr(cellVal(sheet, r, colMap.phone)) : null;
      if (phoneVal) phoneVal = phoneVal.replace(/[^0-9+]/g, '');

      let addressVal = colMap.address !== -1 ? cleanStr(cellVal(sheet, r, colMap.address)) : null;
      let dobVal = colMap.dateOfBirth !== -1 ? cellDateIso(sheet, r, colMap.dateOfBirth) : null;

      // Skip rows without first or last name
      if (!rawFirstName || !rawLastName || rawFirstName.toUpperCase().includes('NAME') || rawLastName.toUpperCase().includes('NAME')) {
        continue;
      }

      // Map membership type to Regular / Associate
      let membershipType = null;
      if (rawMembershipType) {
        const lowerType = rawMembershipType.toLowerCase();
        if (lowerType.includes('associate')) {
          membershipType = 'Associate';
        } else if (lowerType.includes('regular')) {
          membershipType = 'Regular';
        }
      }

      const excelLast = cleanToken(rawLastName);
      const excelFirst = cleanToken(rawFirstName);

      if (!excelLast || !excelFirst) continue;

      // Strict matching logic
      const targetMember = existingMembersRes.rows.find(m => {
        const dbLast = cleanToken(m.ln);
        const dbFirst = cleanToken(m.fn);

        // 1. Check exact Member No match if rawMemberNo is provided
        if (rawMemberNo && m.member_no && m.member_no.trim() === rawMemberNo.trim()) {
          return true;
        }

        // 2. Strict Last Name + First Name match
        if (dbLast === excelLast) {
          if (dbFirst === excelFirst || dbFirst.startsWith(excelFirst) || excelFirst.startsWith(dbFirst)) {
            return true;
          }
        }

        return false;
      });

      // User Directive: If a name on the excel file is NOT in the system already, ignore it!
      if (!targetMember) {
        continue;
      }

      // Build dynamic SQL update fields (only for columns detected in Excel)
      const setClauses = [];
      const queryParams = [];
      let paramIdx = 1;

      if (colMap.memberNo !== -1 && rawMemberNo) {
        // Resolve member_no conflict if another member currently holds it
        const conflictRes = await client.query(
          `SELECT id FROM members WHERE member_no = $1 AND id != $2`,
          [rawMemberNo.trim(), targetMember.id]
        );
        if (conflictRes.rows.length > 0) {
          await client.query(`UPDATE members SET member_no = NULL WHERE id = $1`, [conflictRes.rows[0].id]);
        }
        setClauses.push(`member_no = $${paramIdx++}`);
        queryParams.push(rawMemberNo.trim());
      }

      if (colMap.membershipType !== -1 && membershipType) {
        setClauses.push(`membership_type = $${paramIdx++}`);
        queryParams.push(membershipType);
      }

      if (colMap.tin !== -1 && rawTin) {
        setClauses.push(`tin = $${paramIdx++}`);
        queryParams.push(rawTin);
      }

      if (colMap.middleName !== -1 && rawMiddleName) {
        setClauses.push(`middle_name = $${paramIdx++}`);
        queryParams.push(rawMiddleName);
      }

      if (colMap.address !== -1 && addressVal) {
        setClauses.push(`address = $${paramIdx++}`);
        queryParams.push(addressVal);
      }

      if (colMap.dateOfBirth !== -1 && dobVal) {
        setClauses.push(`date_of_birth = $${paramIdx++}`);
        queryParams.push(dobVal);
      }

      if (colMap.age !== -1 && ageVal !== null) {
        setClauses.push(`age = $${paramIdx++}`);
        queryParams.push(ageVal);
      }

      if (colMap.gender !== -1 && genderVal !== null) {
        setClauses.push(`gender = $${paramIdx++}`);
        queryParams.push(genderVal);
      }

      if (colMap.civilStatus !== -1 && civilStatusVal !== null) {
        setClauses.push(`civil_status = $${paramIdx++}`);
        queryParams.push(civilStatusVal);
      }

      if (colMap.email !== -1 && emailVal !== null) {
        setClauses.push(`email = $${paramIdx++}`);
        queryParams.push(emailVal);
      }

      if (colMap.phone !== -1 && phoneVal !== null) {
        setClauses.push(`phone = $${paramIdx++}`);
        queryParams.push(phoneVal);
      }

      if (setClauses.length === 0) continue;

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
      queryParams.push(targetMember.id);

      const updateQuery = `
        UPDATE members
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIdx}
        RETURNING *
      `;
      const updatedRes = await client.query(updateQuery, queryParams);

      if (updatedRes.rowCount > 0) {
        updatedCount++;
        updateLogs.push({
          name: `${rawFirstName} ${rawLastName}`,
          memberNo: rawMemberNo || updatedRes.rows[0].member_no,
          membershipType: membershipType || updatedRes.rows[0].membership_type,
          tin: rawTin || updatedRes.rows[0].tin,
          status: 'Updated'
        });
      }
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `Members Registry update completed! Updated ${updatedCount} members, created ${createdCount} new members.`,
      data: {
        updatedCount,
        createdCount,
        totalProcessed: updatedCount + createdCount,
        details: updateLogs
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    next(error);
  } finally {
    client.release();
  }
};
