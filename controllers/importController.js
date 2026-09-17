import XLSX from 'xlsx';
import fs from 'fs';
import bcrypt from 'bcryptjs';
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

// Helper: Clean monetary / numeric values (supports accounting parentheses e.g. (300.00) -> -300)
const cleanAmount = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val * 100) / 100;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    const isNegative = /^\(.*\)$/.test(trimmed) || trimmed.startsWith('-');
    const cleaned = trimmed.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    const result = isNegative ? -num : num;
    return Math.round(result * 100) / 100;
  }
  return 0;
};

// Helper: Clean strings
const cleanStr = (val) => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

// Helper: Clean tokens for fuzzy/loose matching (handles accents like ñ/n, punctuation, and casing)
const cleanToken = (s) => (s ? String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ñ/g, 'n').replace(/[^a-z0-9]/g, '') : '');

// Helper: Smartly resolve member name against database records (handles single names, swapped names, accents, and initials)
export const resolveMemberName = (sheetName, existingMembers = []) => {
  if (!sheetName) return { matched: false, memberId: null, firstName: 'Member', lastName: 'Member', fullName: 'Member', memberNo: null };

  const cleanTab = sheetName.trim();
  const cleanRaw = cleanToken(cleanTab);
  if (!cleanRaw) return { matched: false, memberId: null, firstName: 'Member', lastName: 'Member', fullName: 'Member', memberNo: null };

  let targetFirst = '';
  let targetLast = '';

  // 1. Tab has comma: "LASTNAME, FIRSTNAME"
  if (cleanTab.includes(',')) {
    const parts = cleanTab.split(',');
    targetLast = parts[0].trim();
    targetFirst = parts.slice(1).join(' ').trim() || 'Member';
  } else {
    // Multi-word or single word
    const parts = cleanTab.split(/\s+/);
    if (parts.length > 1) {
      targetFirst = parts.slice(0, -1).join(' ');
      targetLast = parts[parts.length - 1];
    } else {
      targetFirst = cleanTab;
      targetLast = '';
    }
  }

  const firstToken = cleanToken(targetFirst);
  const lastToken = cleanToken(targetLast);

  // A. Exact full concatenated token match (any order e.g. "KIRKALBANO" or "ALBANOKIRK")
  for (const m of existingMembers) {
    const mFn = cleanToken(m.first_name || m.fn);
    const mLn = cleanToken(m.last_name || m.ln);
    const comb1 = `${mFn}${mLn}`;
    const comb2 = `${mLn}${mFn}`;
    const targetComb1 = `${firstToken}${lastToken}`;
    const targetComb2 = `${lastToken}${firstToken}`;

    if (
      comb1 === cleanRaw || comb2 === cleanRaw ||
      comb1 === targetComb1 || comb1 === targetComb2 ||
      comb2 === targetComb1 || comb2 === targetComb2
    ) {
      return {
        matched: true,
        memberId: m.id,
        firstName: m.first_name || m.fn,
        lastName: m.last_name || m.ln,
        fullName: `${m.first_name || m.fn} ${m.last_name || m.ln}`,
        memberNo: m.member_no || null
      };
    }
  }

  // B. Both first and last tokens match or start with each other (ignoring middle names/initials/accents)
  if (firstToken && lastToken) {
    for (const m of existingMembers) {
      const mFn = cleanToken(m.first_name || m.fn);
      const mLn = cleanToken(m.last_name || m.ln);

      const normalMatch = (mLn === lastToken || mLn.startsWith(lastToken) || lastToken.startsWith(mLn)) &&
                          (mFn === firstToken || mFn.startsWith(firstToken) || firstToken.startsWith(mFn));
      const swappedMatch = (mFn === lastToken || mFn.startsWith(lastToken) || lastToken.startsWith(mFn)) &&
                           (mLn === firstToken || mLn.startsWith(firstToken) || firstToken.startsWith(mLn));

      if (normalMatch || swappedMatch) {
        return {
          matched: true,
          memberId: m.id,
          firstName: m.first_name || m.fn,
          lastName: m.last_name || m.ln,
          fullName: `${m.first_name || m.fn} ${m.last_name || m.ln}`,
          memberNo: m.member_no || null
        };
      }
    }
  }

  // C. Single word tab: e.g. "KIRK" or "AMOROTO"
  if (!lastToken || !firstToken) {
    const single = firstToken || lastToken;
    const fnMatches = existingMembers.filter(m => {
      const mFn = cleanToken(m.first_name || m.fn);
      return mFn === single || mFn.startsWith(single);
    });
    if (fnMatches.length === 1) {
      const m = fnMatches[0];
      return {
        matched: true,
        memberId: m.id,
        firstName: m.first_name || m.fn,
        lastName: m.last_name || m.ln,
        fullName: `${m.first_name || m.fn} ${m.last_name || m.ln}`,
        memberNo: m.member_no || null
      };
    }

    const lnMatches = existingMembers.filter(m => {
      const mLn = cleanToken(m.last_name || m.ln);
      return mLn === single || mLn.startsWith(single);
    });
    if (lnMatches.length === 1) {
      const m = lnMatches[0];
      return {
        matched: true,
        memberId: m.id,
        firstName: m.first_name || m.fn,
        lastName: m.last_name || m.ln,
        fullName: `${m.first_name || m.fn} ${m.last_name || m.ln}`,
        memberNo: m.member_no || null
      };
    }
  }

  return {
    matched: false,
    memberId: null,
    firstName: targetFirst || cleanTab,
    lastName: targetLast || 'Member',
    fullName: targetLast ? `${targetFirst} ${targetLast}` : `${cleanTab} Member`,
    memberNo: null
  };
};

// Core parser function that extracts structured data from workbook buffer or file
export const parseExcelWorkbook = async (bufferOrPath) => {
  const workbook = typeof bufferOrPath === 'string'
    ? XLSX.readFile(bufferOrPath, { cellDates: false })
    : XLSX.read(bufferOrPath, { type: 'buffer', cellDates: false });

  const parsedSheets = [];
  const systemLoanProducts = await query('SELECT id, name, interest_rate, amortization_type FROM loan_products WHERE is_active = true');
  const defaultProduct = systemLoanProducts.rows[0] || null;

  // Pre-fetch all existing members to resolve member names (including single-name tabs like KIRK or AMOROTO)
  const existingMembersRes = await query('SELECT id, first_name, last_name, member_no, email FROM members');
  const existingMembers = existingMembersRes.rows;

  for (const sheetName of workbook.SheetNames) {
    // Skip obvious system, summary, totals, or template sheets
    const lowerTab = sheetName.toLowerCase().trim();
    if (
      [
        'instructions', 'instruction', 'template', 'summary', 'settings', 'master',
        'sheet1_example', 'sum-sc', 'sum_sc', 'sum sc', 'total', 'totals', 'grand total',
        'all', 'regular', 'associate', 'investment', 'investments', 'investment accounts',
        'investment only', 'investment only accounts'
      ].includes(lowerTab) ||
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

    const resolved = resolveMemberName(sheetName, existingMembers);
    const { firstName, lastName, fullName } = resolved;

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
      existingMember: resolved.matched,
      memberId: resolved.memberId,
      phone: phone || null,
      birthDate: birthDateStr,
      shareCapitalDeposits: [],
      shareCapitalTotal: 0,
      loans: []
    };

    let currentLoan = null;

    // Detect column layout dynamically from sheet header
    let colMap = {
      loanDate: 3,
      lafNo: 4,
      amountLoaned: 5,
      mode: 6,
      terms: 7,
      endTerm: 8,
      interestDue: 9,
      principalDue: 10,
      monthlyDue: 11,
      fines: 12,
      amountPaid: 13,
      balance: 14,
      principalBalance: 15,
      invoiceNo: 16,
      datePaid: 17
    };
    let startRow = 1;

    for (let r = 0; r <= Math.min(6, range.e.r); r++) {
      const row = [];
      for (let c = 0; c <= range.e.c; c++) {
        const v = cellVal(sheet, r, c);
        row.push(v ? String(v).trim().toUpperCase() : '');
      }
      if (row.includes('LAF NO') || row.includes('AMOUNT LOANED')) {
        startRow = r + 1;
        const findIdx = (predicate, fallback) => {
          const idx = row.findIndex((c, i) => i >= 3 && predicate(c));
          return idx !== -1 ? idx : fallback;
        };
        colMap = {
          loanDate: findIdx(c => c === 'DATE', 3),
          lafNo: findIdx(c => c === 'LAF NO' || c === 'LAF NO.', 4),
          amountLoaned: findIdx(c => c.includes('AMOUNT LOANED'), 5),
          mode: findIdx(c => c === 'MODE', 6),
          terms: findIdx(c => c === 'TERMS' || c === 'TERM', 7),
          endTerm: findIdx(c => c.includes('END') || c.includes('MATURITY'), 8),
          interestDue: findIdx(c => c === 'INTEREST' || c === 'INTEREST DUE', 9),
          principalDue: findIdx(c => c === 'PRINCIPAL' || c === 'PRINCIPAL DUE', 10),
          monthlyDue: findIdx(c => c.includes('MONTHLY DUE') || c === 'MONTHLY', 11),
          fines: findIdx(c => c.includes('FINE'), 12),
          amountPaid: findIdx(c => c === 'AMOUNT PAID' || c.includes('AMT PAID'), 15),
          balance: findIdx(c => c === 'BALANCE', 16),
          principalBalance: findIdx(c => c.includes('PRINCIPAL') && c.includes('BALANCE'), 17),
          invoiceNo: findIdx(c => c.includes('INVOICE'), 18),
          datePaid: findIdx(c => c.includes('DATE PAID'), 19)
        };
        break;
      }
    }

    // Scan all rows starting after header row
    for (let r = startRow; r <= range.e.r; r++) {
      // 1. Share Capital Columns (A, B, C)
      const scDateStr = cellDateIso(sheet, r, 0);       // Col A: DATE DEPOSITED
      const scInvoice = cleanStr(cellVal(sheet, r, 1)); // Col B: INVOICE / LAF NO
      const scAmount = cleanAmount(cellVal(sheet, r, 2)); // Col C: SHARED CAPITAL

      // Safeguard: Check if this row is a total/summary row (e.g. "TOTAL", "SUM", "BALANCE", "SUBTOTAL")
      const rawColA = cleanStr(cellVal(sheet, r, 0)).toLowerCase();
      const rawColB = scInvoice.toLowerCase();
      const isTotalKeyword = (s) => ['total', 'totals', 'sum', 'subtotal', 'grand total', 'balance'].some(k => s.includes(k));
      if (isTotalKeyword(rawColA) || isTotalKeyword(rawColB)) {
        continue;
      }

      // Filter placeholder invoice strings if there is no date
      const isPlaceholder = ['n/a', 'na', '-', '--', 'none', 'null'].includes(rawColB);

      // Check if this row is a genuine deposit (must have amount > 0 and either a valid deposit date or real invoice)
      if (scAmount > 0 && (scDateStr || (scInvoice && !isPlaceholder))) {
        memberData.shareCapitalDeposits.push({
          row: r + 1,
          date: scDateStr,
          invoiceNo: scInvoice || 'SD',
          amount: scAmount
        });
        memberData.shareCapitalTotal = Math.round((memberData.shareCapitalTotal + scAmount) * 100) / 100;
      }

      // 2. Loan Columns (dynamically mapped)
      const loanDateStr = cellDateIso(sheet, r, colMap.loanDate);
      const lafNo = cleanStr(cellVal(sheet, r, colMap.lafNo));
      const amountLoaned = cleanAmount(cellVal(sheet, r, colMap.amountLoaned));
      const mode = cleanStr(cellVal(sheet, r, colMap.mode));
      const termsRaw = cellVal(sheet, r, colMap.terms);
      const endTermDateStr = cellDateIso(sheet, r, colMap.endTerm);

      // Repayment / Installment Columns
      const interestDue = cleanAmount(cellVal(sheet, r, colMap.interestDue));
      const principalDue = cleanAmount(cellVal(sheet, r, colMap.principalDue));
      const monthlyDue = cleanAmount(cellVal(sheet, r, colMap.monthlyDue));
      const fines = cleanAmount(cellVal(sheet, r, colMap.fines));
      const amountPaid = cleanAmount(cellVal(sheet, r, colMap.amountPaid));
      const balance = cleanAmount(cellVal(sheet, r, colMap.balance));
      const principalBalance = colMap.principalBalance !== -1 ? cleanAmount(cellVal(sheet, r, colMap.principalBalance)) : 0;
      const invoiceNo = cleanStr(cellVal(sheet, r, colMap.invoiceNo));
      const datePaidStr = cellDateIso(sheet, r, colMap.datePaid);

      // Check if this row starts a new Loan Application
      if (amountLoaned > 0 && lafNo) {
        const termsVal = termsRaw ? parseInt(String(termsRaw), 10) : 12;
        const maturityDate = calcMaturityDate(loanDateStr, endTermDateStr, termsVal);

        // Check next row's Col E for product tag (e.g. EMERGENCY, CASH EXPRESS, SO)
        const nextRowTag = r < range.e.r ? cleanStr(cellVal(sheet, r + 1, colMap.lafNo)) : '';

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
          lastBalance: null,
          lastPrincipalBalance: null,
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
          let effectivePaid = amountPaid > 0 ? amountPaid : (isPaidThru && datePaidStr ? (pDue + iDue) : 0);

          // If payment was recorded under balance column while principalBalance stepped down
          if (effectivePaid === 0 && colMap.principalBalance !== -1 && balance > 0 && (datePaidStr !== null || invoiceNo !== '')) {
            effectivePaid = balance;
          }

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
              isPaid: effectivePaid >= tDue || ((balance === 0 || principalBalance === 0) && instDatePaid !== null)
            };

            currentLoan.installments.push(inst);
            currentLoan.totalPaid += effectivePaid;
          }

          const balanceRaw = cellVal(sheet, r, colMap.balance);
          const princBalanceRaw = colMap.principalBalance !== -1 ? cellVal(sheet, r, colMap.principalBalance) : null;
          if (balanceRaw !== null && balanceRaw !== undefined && !isNaN(parseFloat(balanceRaw))) {
            currentLoan.lastBalance = parseFloat(balanceRaw);
          }
          if (princBalanceRaw !== null && princBalanceRaw !== undefined && !isNaN(parseFloat(princBalanceRaw))) {
            currentLoan.lastPrincipalBalance = parseFloat(princBalanceRaw);
          }
          if (currentLoan.lastBalance === 0 || currentLoan.lastPrincipalBalance === 0) {
            currentLoan.remainingBalance = 0;
          } else if (currentLoan.lastPrincipalBalance !== null && currentLoan.lastPrincipalBalance !== undefined) {
            currentLoan.remainingBalance = currentLoan.lastPrincipalBalance;
          } else if (currentLoan.lastBalance !== null && currentLoan.lastBalance !== undefined) {
            currentLoan.remainingBalance = currentLoan.lastBalance;
          }
        }
      }
    }

    // Determine final status for each loan
    for (const l of memberData.loans) {
      if (
        l.remainingBalance === 0 ||
        l.lastBalance === 0 ||
        l.lastPrincipalBalance === 0 ||
        (l.totalPaid >= l.principalAmount && l.totalPaid > 0)
      ) {
        l.status = 'fully_paid';
        l.remainingBalance = 0;
        // When loan is fully paid, ensure all installments are marked fully paid
        for (const inst of l.installments) {
          inst.principalPaid = inst.principalDue;
          inst.interestPaid = inst.interestDue;
          inst.totalDue = inst.principalDue + inst.interestDue;
          inst.isPaid = true;
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

  let totalShareCapitalCount = 0;
  let totalShareCapitalSum = 0;
  let totalLoansCount = 0;
  let totalLoanAmount = 0;
  let totalPaymentsCount = 0;
  let totalPaymentsSum = 0;
  let existingMembersCount = 0;
  let newMembersCount = 0;

  for (const sheet of parsedSheets) {
    if (sheet.existingMember) {
      existingMembersCount++;
    } else {
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
    const memRes = await client.query('SELECT id, first_name, last_name, LOWER(first_name) as fn, LOWER(last_name) as ln FROM members');
    const memberMap = new Map();
    for (const m of memRes.rows) {
      memberMap.set(`${m.fn}_${m.ln}`, m.id);
    }

    const scRes = await client.query("SELECT member_id, amount, invoice_no, TO_CHAR(transaction_date, 'YYYY-MM-DD') as tdate FROM share_capital_transactions");
    const scSet = new Set();
    for (const sc of scRes.rows) {
      const dStr = sc.tdate || '';
      scSet.add(`${sc.member_id}_${parseFloat(sc.amount)}_${sc.invoice_no || 'SD'}_${dStr}`);
      if (sc.invoice_no && sc.invoice_no !== 'SD' && sc.invoice_no !== 'HAND-IN') {
        scSet.add(`${sc.member_id}_ref_${sc.invoice_no.toLowerCase().trim()}`);
      }
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

    const payRes = await client.query("SELECT id, loan_id, amount, TO_CHAR(payment_date, 'YYYY-MM-DD') as pdate, reference_no FROM loan_payments");
    const payMap = new Map();
    for (const p of payRes.rows) {
      const dStr = p.pdate || '';
      payMap.set(`${p.loan_id}_${parseFloat(p.amount)}_${dStr}_${p.reference_no || ''}`, p.id);
      if (p.reference_no && p.reference_no !== 'SD' && p.reference_no !== 'HAND-IN') {
        payMap.set(`${p.loan_id}_ref_${p.reference_no}`, p.id);
      }
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

      // If still not found, try smart resolve against existing members
      if (!memberId) {
        const resolved = resolveMemberName(mem.sheetName || `${firstName} ${lastName}`, memRes.rows);
        if (resolved.matched && resolved.memberId) {
          memberId = resolved.memberId;
        }
      }

      // 1. Check or Create Member (never duplicate existing account)
      if (!memberId) {
        const insertMem = await client.query(
          `INSERT INTO members (user_id, first_name, last_name, email, phone, date_of_birth, status, profile_completed)
           VALUES (NULL, $1, $2, NULL, $3, $4, 'inactive', false) RETURNING id`,
          [firstName, lastName, phone || null, safeDbDate(birthDate)]
        );
        memberId = insertMem.rows[0].id;
        memberMap.set(memKey, memberId);
        membersCreated++;
      } else {
        membersUpdated++;
      }

      // 2. Insert Share Capital Deposits (updates existing member's ledger)
      if (shareCapitalDeposits && shareCapitalDeposits.length > 0) {
        for (const sc of shareCapitalDeposits) {
          const scAmount = parseFloat(sc.amount);
          if (scAmount <= 0) continue;

          const transDate = safeDbDate(sc.date) || new Date();
          const dStr = sc.date ? sc.date : (transDate ? transDate.toISOString().split('T')[0] : '');
          const invoice = sc.invoiceNo || 'SD';
          const scKey = `${memberId}_${scAmount}_${invoice}_${dStr}`;
          const scKeyRef = (invoice && invoice !== 'SD' && invoice !== 'HAND-IN')
            ? `${memberId}_ref_${invoice.toLowerCase().trim()}`
            : null;

          if (!scSet.has(scKey) && (!scKeyRef || !scSet.has(scKeyRef))) {
            const currentBal = scBalMap.get(memberId) || 0;
            const balanceAfter = Math.round((currentBal + scAmount) * 100) / 100;
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
            if (scKeyRef) scSet.add(scKeyRef);
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
          } else {
            if (loanStatus === 'fully_paid') {
              await client.query(
                `UPDATE loans SET status = 'fully_paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [loanId]
              );
            }
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
              const isLoanFullyPaid = l.status === 'fully_paid';
              const isPaid = isLoanFullyPaid || (inst.isPaid && amtPaid > 0);
              let pPaid = parseFloat(inst.principalPaid || 0);
              let iPaid = parseFloat(inst.interestPaid || 0);
              if (isLoanFullyPaid) {
                pPaid = pDue;
                iPaid = iDue;
              } else if (amtPaid > 0 && pPaid === 0 && iPaid === 0) {
                pPaid = amtPaid;
              }
              const instStatus = isPaid ? (isLoanFullyPaid || amtPaid >= tDue ? 'paid' : 'partially_paid') : 'unpaid';
              const finalPDue = pDue;
              const finalTDue = Math.max(0.01, tDue > 0 ? tDue : 0.01);

              // Upsert Repayment Schedule
              const schedKey = `${loanId}_${instNum}`;
              let scheduleId = schedMap.get(schedKey);

              if (scheduleId) {
                if (isPaid) {
                  await client.query(
                    `UPDATE repayment_schedules
                     SET principal_due = $1, total_due = $2, principal_paid = $3, interest_paid = $4, fines_due = $5, status = $6, updated_at = CURRENT_TIMESTAMP
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
                const payDStr = inst.datePaid || (payDate ? payDate.toISOString().split('T')[0] : '');
                const payRef = inst.invoiceNo || lafNo || 'EXCEL_IMPORT';
                const payKey = `${loanId}_${amtPaid}_${payDStr}_${payRef}`;
                const payKeyRef = (payRef && payRef !== 'SD' && payRef !== 'HAND-IN') ? `${loanId}_ref_${payRef}` : null;

                let paymentId = payMap.get(payKey) || (payKeyRef ? payMap.get(payKeyRef) : null);
                if (!paymentId) {
                  const insertPay = await client.query(
                    `INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_no)
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [loanId, amtPaid, payDate, inst.invoiceNo || 'SD', payRef]
                  );
                  paymentId = insertPay.rows[0].id;
                  payMap.set(payKey, paymentId);
                  if (payKeyRef) payMap.set(payKeyRef, paymentId);
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

// ==========================================
// 4. PROVISION USER ACCOUNTS FOR IMPORTED MEMBERS
// @route   POST /api/import/provision-accounts
// @access  Protected (Admin only)
// ==========================================
export const provisionImportedAccounts = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const cleanStr = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanFirst = (s) => {
      if (!s) return '';
      const parts = s.trim().split(/\s+/);
      const mainFirst = parts.filter(p => !p.match(/^[A-Za-z]\.?$/)).join('') || parts[0];
      return (mainFirst || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    // 1. Fetch all members without a linked user account
    const membersRes = await client.query(`
      SELECT id, first_name, last_name, email, phone, status
      FROM members
      WHERE user_id IS NULL
      ORDER BY last_name, first_name
    `);

    const unlinkedMembers = membersRes.rows;

    if (unlinkedMembers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All imported members already have user accounts.',
        data: { provisioned: 0, accounts: [] }
      });
    }

    // 2. Fetch existing usernames to avoid collisions
    const existingUsersRes = await client.query('SELECT username FROM users');
    const existingUsernames = new Set(existingUsersRes.rows.map(r => r.username.toLowerCase()));

    // 3. Hash default password once
    const defaultPassword = 'UCCoop@2026';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await client.query('BEGIN');

    const provisioned = [];

    for (const member of unlinkedMembers) {
      const baseFirst = cleanFirst(member.first_name);
      const baseLast = cleanStr(member.last_name);

      // If member only has a single name/surname (or placeholder 'member'), use the surname directly
      let username;
      if ((!baseLast || baseLast === 'member') && baseFirst && baseFirst !== 'member') {
        username = baseFirst;
      } else if ((!baseFirst || baseFirst === 'member') && baseLast && baseLast !== 'member') {
        username = baseLast;
      } else {
        const first = baseFirst || 'member';
        const last = baseLast || 'user';
        username = `${first}.${last}`;
      }

      // Generate unique username
      const baseUsername = username;
      let count = 1;
      while (existingUsernames.has(username)) {
        count++;
        username = `${baseUsername}${count}`;
      }
      existingUsernames.add(username);

      // Create user account
      const userRes = await client.query(
        `INSERT INTO users (username, password_hash, role)
         VALUES ($1, $2, 'member')
         RETURNING id, username`,
        [username, passwordHash]
      );
      const newUser = userRes.rows[0];

      // Link user_id to member and set status to pending for onboarding
      await client.query(
        `UPDATE members
         SET user_id = $1,
             status = 'pending',
             profile_completed = false,
             is_verified = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newUser.id, member.id]
      );

      // Audit trail
      await client.query(
        `INSERT INTO member_status_logs (member_id, previous_status, new_status, remarks)
         VALUES ($1, $2, 'pending', 'User account provisioned via Import Hub; awaiting member profile completion and verification.')`,
        [member.id, member.status]
      );

      provisioned.push({
        memberId: member.id,
        fullName: `${member.last_name}, ${member.first_name}`,
        username: newUser.username,
        defaultPassword,
        status: 'pending'
      });
    }

    await client.query('COMMIT');

    // Audit log for the admin action
    try {
      await client.query(
        `INSERT INTO audit_logs (user_id, username, action, module, method, endpoint, status_code, status, ip_address, user_agent, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          req.user?.id || null,
          req.user?.username || 'admin',
          'PROVISION_MEMBER_ACCOUNTS',
          'DATA_IMPORT',
          req.method,
          req.originalUrl || '/api/import/provision-accounts',
          200,
          'success',
          req.ip || '127.0.0.1',
          req.headers['user-agent'] || 'System',
          JSON.stringify({ provisionedCount: provisioned.length, provisionedAt: new Date().toISOString() })
        ]
      );
    } catch (auditErr) {
      console.warn('Failed to insert provision audit log:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Successfully provisioned ${provisioned.length} user account${provisioned.length !== 1 ? 's' : ''}.`,
      data: {
        provisioned: provisioned.length,
        defaultPassword,
        accounts: provisioned
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
// 5. CHECK VOUCHERS IMPORT ENGINE
// ==========================================

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

// Helper: Parse date strings specifically for check voucher formats (e.g. "28-May", "1-Jun", or ISO) without UTC timezone drift
const parseVoucherDate = (val, defaultYear = 2026) => {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    return parseExcelDate(val);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Pattern: 28-May or 1-Jun or 28 May
    const matchDayMonth = trimmed.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})/i);
    if (matchDayMonth) {
      const day = String(matchDayMonth[1]).padStart(2, '0');
      const monStr = matchDayMonth[2].substring(0, 3).toLowerCase();
      const month = MONTH_MAP[monStr] || '01';
      return `${defaultYear}-${month}-${day}`;
    }

    // Pattern: May-28 or May 28
    const matchMonthDay = trimmed.match(/^([A-Za-z]{3,})[-/ ](\d{1,2})/i);
    if (matchMonthDay) {
      const monStr = matchMonthDay[1].substring(0, 3).toLowerCase();
      const month = MONTH_MAP[monStr] || '01';
      const day = String(matchMonthDay[2]).padStart(2, '0');
      return `${defaultYear}-${month}-${day}`;
    }

    return parseExcelDate(trimmed);
  }
  return null;
};

// Helper: Parse all check vouchers from a worksheet (supports multi-line deductions and dynamic headers)
export const parseCheckVouchersFromSheet = (sheet, sheetName = '') => {
  if (!sheet) return [];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z500');

  // Determine base year from sheetName e.g. "Check Vouchers 2026" -> 2026
  let defaultYear = new Date().getFullYear();
  const yearMatch = (sheetName || '').match(/(?:19|20)\d{2}/);
  if (yearMatch) {
    defaultYear = parseInt(yearMatch[0], 10);
  }

  // Scan rows 0 to 25 to locate header row
  let headerRow = -1;
  let colMap = {
    voucherNo: -1,
    voucherDate: -1,
    checkNo: -1,
    payee: -1,
    bank: -1,
    particulars: -1,
    bookOfAccount: -1,
    amount: -1,
    approvalDate: -1,
    dateReleased: -1,
    folder: -1,
    box: -1
  };

  for (let r = 0; r <= Math.min(25, range.e.r); r++) {
    let matches = 0;
    const tempMap = {
      voucherNo: -1,
      voucherDate: -1,
      checkNo: -1,
      payee: -1,
      bank: -1,
      particulars: -1,
      bookOfAccount: -1,
      amount: -1,
      approvalDate: -1,
      dateReleased: -1,
      folder: -1,
      box: -1
    };

    for (let c = 0; c <= range.e.c; c++) {
      const val = String(cellVal(sheet, r, c) || '').trim().toLowerCase();
      if (!val) continue;

      if (/voucher\s*(?:no|#|\b)/i.test(val) && tempMap.voucherNo === -1) {
        tempMap.voucherNo = c;
        matches++;
      } else if (/voucher\s*date/i.test(val) && tempMap.voucherDate === -1) {
        tempMap.voucherDate = c;
        matches++;
      } else if (/check\s*(?:no|#|\b)/i.test(val) && tempMap.checkNo === -1) {
        tempMap.checkNo = c;
        matches++;
      } else if (/payee|member|recipient/i.test(val) && tempMap.payee === -1) {
        tempMap.payee = c;
        matches++;
      } else if (/^bank/i.test(val) && tempMap.bank === -1) {
        tempMap.bank = c;
        matches++;
      } else if (/particulars|description|purpose/i.test(val) && tempMap.particulars === -1) {
        tempMap.particulars = c;
        matches++;
      } else if (/book\s*of\s*account|account/i.test(val) && tempMap.bookOfAccount === -1) {
        tempMap.bookOfAccount = c;
        matches++;
      } else if (/(?:disbursed\s*amount|net\s*amount|disbursement|^amount$)/i.test(val) && tempMap.amount === -1) {
        tempMap.amount = c;
        matches++;
      } else if (/manager.*approval|approval/i.test(val) && tempMap.approvalDate === -1) {
        tempMap.approvalDate = c;
        matches++;
      } else if (/date\s*released|release\s*date/i.test(val) && tempMap.dateReleased === -1) {
        tempMap.dateReleased = c;
        matches++;
      } else if (/folder/i.test(val) && tempMap.folder === -1) {
        tempMap.folder = c;
      } else if (/box/i.test(val) && tempMap.box === -1) {
        tempMap.box = c;
      }
    }

    if (matches >= 2) {
      headerRow = r;
      colMap = tempMap;
      break;
    }
  }

  // Fallback defaults if header row not explicitly identified
  if (headerRow === -1) {
    headerRow = 1;
    colMap = {
      voucherNo: 0,
      voucherDate: 1,
      checkNo: 2,
      payee: 3,
      bank: 4,
      particulars: 5,
      bookOfAccount: 6,
      amount: 7,
      approvalDate: 8,
      dateReleased: 9,
      folder: 10,
      box: 11
    };
  } else {
    // If amount was not explicitly matched, derive from book of account or particulars position
    if (colMap.amount === -1) {
      if (colMap.bookOfAccount !== -1) {
        colMap.amount = colMap.bookOfAccount + 1;
      } else if (colMap.particulars !== -1) {
        colMap.amount = colMap.particulars + 1;
      } else {
        colMap.amount = 7;
      }
    }
    if (colMap.voucherNo === -1) colMap.voucherNo = 0;
    if (colMap.voucherDate === -1) colMap.voucherDate = 1;
    if (colMap.checkNo === -1) colMap.checkNo = 2;
    if (colMap.payee === -1) colMap.payee = 3;
    if (colMap.bank === -1) colMap.bank = 4;
    if (colMap.particulars === -1) colMap.particulars = 5;
  }

  const finalizeVoucher = (v) => {
    if (!v) return null;
    let finalAmount = v.amount;
    let details = [];

    if (v.subRows && v.subRows.length > 1) {
      const lastRow = v.subRows[v.subRows.length - 1];
      const precedingSum = v.subRows.slice(0, -1).reduce((sum, item) => sum + item.amount, 0);
      const roundedPreceding = Math.round(precedingSum * 100) / 100;
      const roundedLast = Math.round(lastRow.amount * 100) / 100;

      if (Math.abs(roundedPreceding - roundedLast) < 0.05 && roundedLast !== 0) {
        finalAmount = roundedLast;
      } else if (lastRow.amount > 0 && (!lastRow.bookOfAccount || /total|net/i.test(lastRow.bookOfAccount))) {
        finalAmount = lastRow.amount;
      } else {
        const totalSum = v.subRows.reduce((sum, item) => sum + item.amount, 0);
        finalAmount = Math.round(totalSum * 100) / 100;
      }

      // Filter subRows to build clean breakdown line items
      details = v.subRows
        .filter((item, idx) => {
          // If the last item is just the total repeated, omit it from the line item breakdown
          if (idx === v.subRows.length - 1 && Math.abs(item.amount - finalAmount) < 0.05 && !item.bookOfAccount) {
            return false;
          }
          return Boolean((item.bookOfAccount && item.bookOfAccount.trim()) || item.amount !== 0);
        })
        .map(item => ({
          book_of_account: item.bookOfAccount || 'Disbursed Item',
          amount: item.amount
        }));
    } else if (v.subRows && v.subRows.length === 1 && v.subRows[0].bookOfAccount && v.subRows[0].bookOfAccount.trim()) {
      details = [{
        book_of_account: v.subRows[0].bookOfAccount,
        amount: v.amount
      }];
    }

    v.amount = finalAmount;
    v.details = details;
    return v;
  };

  const vouchers = [];
  let currentVoucher = null;

  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const rawVoucherNo = cleanStr(cellVal(sheet, r, colMap.voucherNo));
    const voucherDateRaw = colMap.voucherDate !== -1 ? cellVal(sheet, r, colMap.voucherDate) : null;
    const check_no = colMap.checkNo !== -1 ? cleanStr(cellVal(sheet, r, colMap.checkNo)) : '';
    const payee = colMap.payee !== -1 ? cleanStr(cellVal(sheet, r, colMap.payee)) : '';
    const bank = colMap.bank !== -1 ? cleanStr(cellVal(sheet, r, colMap.bank)) : '';
    const particulars = colMap.particulars !== -1 ? cleanStr(cellVal(sheet, r, colMap.particulars)) : '';
    const bookOfAccount = colMap.bookOfAccount !== -1 ? cleanStr(cellVal(sheet, r, colMap.bookOfAccount)) : '';
    const rawAmountVal = colMap.amount !== -1 ? cellVal(sheet, r, colMap.amount) : null;
    const amount = cleanAmount(rawAmountVal);
    const approvalRaw = colMap.approvalDate !== -1 ? cellVal(sheet, r, colMap.approvalDate) : null;
    const releasedRaw = colMap.dateReleased !== -1 ? cellVal(sheet, r, colMap.dateReleased) : null;
    const folder_name = colMap.folder !== -1 ? cleanStr(cellVal(sheet, r, colMap.folder)) : '';
    const box_name = colMap.box !== -1 ? cleanStr(cellVal(sheet, r, colMap.box)) : '';

    // Skip empty filler rows
    if (!rawVoucherNo && !payee && !check_no && amount === 0 && !bookOfAccount && !particulars) {
      continue;
    }

    // Determine whether this row starts a new check voucher
    const isNewVoucher = Boolean(
      rawVoucherNo ||
      (payee && (check_no || bank || particulars))
    );

    if (isNewVoucher) {
      if (currentVoucher) {
        const finalized = finalizeVoucher(currentVoucher);
        if (finalized && (finalized.voucher_no || finalized.payee)) {
          vouchers.push(finalized);
        }
      }

      // Check year prefix (e.g. 26-139 -> 2026)
      let rowYear = defaultYear;
      const prefixMatch = rawVoucherNo.match(/^(\d{2})-/);
      if (prefixMatch) {
        rowYear = 2000 + parseInt(prefixMatch[1], 10);
      }

      currentVoucher = {
        id: `cv_${vouchers.length}_${rawVoucherNo || 'novouch'}_${check_no || 'nochk'}_${r}`,
        voucher_no: rawVoucherNo,
        voucher_date: parseVoucherDate(voucherDateRaw, rowYear),
        check_no: check_no || null,
        payee: payee,
        bank: bank || null,
        particulars: particulars || null,
        amount: amount,
        managers_approval_date: parseVoucherDate(approvalRaw, rowYear),
        date_released: parseVoucherDate(releasedRaw, rowYear),
        folder_name: folder_name || null,
        box_name: box_name || null,
        subRows: [{ bookOfAccount, amount }]
      };
    } else if (currentVoucher) {
      // Continuation / deduction row
      if (approvalRaw && !currentVoucher.managers_approval_date) {
        currentVoucher.managers_approval_date = parseVoucherDate(approvalRaw, defaultYear);
      }
      if (releasedRaw && !currentVoucher.date_released) {
        currentVoucher.date_released = parseVoucherDate(releasedRaw, defaultYear);
      }
      if (folder_name && !currentVoucher.folder_name) {
        currentVoucher.folder_name = folder_name;
      }
      if (box_name && !currentVoucher.box_name) {
        currentVoucher.box_name = box_name;
      }
      currentVoucher.subRows.push({ bookOfAccount, amount });
    }
  }

  if (currentVoucher) {
    const finalized = finalizeVoucher(currentVoucher);
    if (finalized && (finalized.voucher_no || finalized.payee)) {
      vouchers.push(finalized);
    }
  }

  return vouchers;
};

// @desc    Preview check vouchers from uploaded Excel file & selected sheet
// @route   POST /api/import/check-vouchers/preview
// @access  Protected (Admin, Staff)
export const previewCheckVouchers = async (req, res, next) => {
  const filePath = req.file?.path;
  try {
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: { message: 'No Excel file uploaded.' }
      });
    }

    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Uploaded workbook has no sheets.' }
      });
    }

    // Determine target sheet
    const requestedSheet = req.body.sheetName || req.query.sheetName;
    let targetSheetName = sheetNames[0];

    if (requestedSheet && sheetNames.includes(requestedSheet)) {
      targetSheetName = requestedSheet;
    } else {
      // Default to sheet containing "voucher" or "check"
      const foundSheet = sheetNames.find((s) => /voucher|check/i.test(s));
      if (foundSheet) {
        targetSheetName = foundSheet;
      }
    }

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) {
      return res.status(400).json({
        success: false,
        error: { message: `Sheet "${targetSheetName}" could not be opened.` }
      });
    }

    const parsedVouchers = parseCheckVouchersFromSheet(sheet, targetSheetName);

    // Query database to identify already-imported vouchers
    const existingRes = await query(
      'SELECT LOWER(TRIM(voucher_no)) AS v_no, LOWER(TRIM(COALESCE(check_no, \'\'))) AS c_no FROM check_vouchers'
    );
    const existingSet = new Set(
      existingRes.rows.map((r) => `${r.v_no}__${r.c_no}`)
    );

    let existingCount = 0;
    const enrichedVouchers = parsedVouchers.map((v) => {
      const vKey = `${(v.voucher_no || '').trim().toLowerCase()}__${(v.check_no || '').trim().toLowerCase()}`;
      const existsInDb = existingSet.has(vKey);
      if (existsInDb) existingCount++;
      return {
        ...v,
        existsInDb
      };
    });

    const totalFound = enrichedVouchers.length;
    const newCount = totalFound - existingCount;
    const totalAmount = enrichedVouchers.reduce((acc, v) => acc + (v.amount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        sheetNames,
        selectedSheet: targetSheetName,
        totalFound,
        newCount,
        existingCount,
        totalAmount,
        vouchers: enrichedVouchers
      }
    });
  } catch (error) {
    next(error);
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Failed to clean up temp file:', err.message);
      }
    }
  }
};

// @desc    Execute import of user-selected check vouchers
// @route   POST /api/import/check-vouchers/execute
// @access  Protected (Admin, Staff)
export const executeCheckVouchersImport = async (req, res, next) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No check vouchers selected for import.' }
      });
    }

    let imported = 0;
    let skipped = 0;
    const previewRecords = [];

    for (const r of records) {
      const {
        voucher_no,
        voucher_date,
        check_no,
        payee,
        bank,
        particulars,
        amount,
        managers_approval_date,
        date_released,
        folder_name,
        box_name
      } = r;

      if (!voucher_no && !payee) {
        skipped++;
        continue;
      }

      const insertResult = await query(
        `INSERT INTO check_vouchers
           (voucher_no, voucher_date, check_no, payee, bank, particulars, amount,
            managers_approval_date, date_released, folder_name, box_name, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (voucher_no, check_no) DO UPDATE SET
            voucher_date = COALESCE(EXCLUDED.voucher_date, check_vouchers.voucher_date),
            payee = EXCLUDED.payee,
            bank = COALESCE(EXCLUDED.bank, check_vouchers.bank),
            particulars = COALESCE(EXCLUDED.particulars, check_vouchers.particulars),
            amount = EXCLUDED.amount,
            managers_approval_date = COALESCE(EXCLUDED.managers_approval_date, check_vouchers.managers_approval_date),
            date_released = COALESCE(EXCLUDED.date_released, check_vouchers.date_released),
            folder_name = COALESCE(EXCLUDED.folder_name, check_vouchers.folder_name),
            box_name = COALESCE(EXCLUDED.box_name, check_vouchers.box_name),
            details = CASE WHEN EXCLUDED.details IS NOT NULL AND jsonb_array_length(EXCLUDED.details) > 0 THEN EXCLUDED.details ELSE check_vouchers.details END,
            updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [
          voucher_no,
          voucher_date || null,
          check_no || null,
          payee,
          bank || null,
          particulars || null,
          amount ?? 0,
          managers_approval_date || null,
          date_released || null,
          folder_name || null,
          box_name || null,
          JSON.stringify(r.details || [])
        ]
      );

      if (insertResult.rowCount > 0) {
        imported++;
        if (previewRecords.length < 15) {
          previewRecords.push({
            voucher_no,
            payee,
            bank,
            amount,
            folder_name
          });
        }
      } else {
        skipped++;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        imported,
        skipped,
        total: records.length,
        records: previewRecords
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Import purchase check vouchers directly from uploaded Excel file (Legacy/Batch fallback)
// @route   POST /api/import/check-vouchers
// @access  Protected (Admin, Staff)
export const importCheckVouchersFromExcel = async (req, res, next) => {
  const filePath = req.file?.path;
  try {
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: { message: 'No Excel file uploaded.' }
      });
    }

    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Uploaded workbook has no sheets.' }
      });
    }

    const requestedSheet = req.body.sheetName || req.query.sheetName;
    let targetSheetName = sheetNames[0];
    if (requestedSheet && sheetNames.includes(requestedSheet)) {
      targetSheetName = requestedSheet;
    } else {
      const foundSheet = sheetNames.find((s) => /voucher|check/i.test(s));
      if (foundSheet) targetSheetName = foundSheet;
    }

    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) {
      return res.status(400).json({
        success: false,
        error: { message: 'Failed to access sheet.' }
      });
    }

    const vouchers = parseCheckVouchersFromSheet(sheet, targetSheetName);

    let imported = 0;
    let skipped = 0;
    const previewRecords = [];

    for (const v of vouchers) {
      if (!v.voucher_no && !v.payee) {
        skipped++;
        continue;
      }

      const insertResult = await query(
        `INSERT INTO check_vouchers
           (voucher_no, voucher_date, check_no, payee, bank, particulars, amount,
            managers_approval_date, date_released, folder_name, box_name, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (voucher_no, check_no) DO UPDATE SET
            voucher_date = COALESCE(EXCLUDED.voucher_date, check_vouchers.voucher_date),
            payee = EXCLUDED.payee,
            bank = COALESCE(EXCLUDED.bank, check_vouchers.bank),
            particulars = COALESCE(EXCLUDED.particulars, check_vouchers.particulars),
            amount = EXCLUDED.amount,
            managers_approval_date = COALESCE(EXCLUDED.managers_approval_date, check_vouchers.managers_approval_date),
            date_released = COALESCE(EXCLUDED.date_released, check_vouchers.date_released),
            folder_name = COALESCE(EXCLUDED.folder_name, check_vouchers.folder_name),
            box_name = COALESCE(EXCLUDED.box_name, check_vouchers.box_name),
            details = CASE WHEN EXCLUDED.details IS NOT NULL AND jsonb_array_length(EXCLUDED.details) > 0 THEN EXCLUDED.details ELSE check_vouchers.details END,
            updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [
          v.voucher_no,
          v.voucher_date || null,
          v.check_no || null,
          v.payee,
          v.bank || null,
          v.particulars || null,
          v.amount ?? 0,
          v.managers_approval_date || null,
          v.date_released || null,
          v.folder_name || null,
          v.box_name || null,
          JSON.stringify(v.details || [])
        ]
      );

      if (insertResult.rowCount > 0) {
        imported++;
        if (previewRecords.length < 10) {
          previewRecords.push(v);
        }
      } else {
        skipped++;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        imported,
        skipped,
        total: vouchers.length,
        records: previewRecords
      }
    });
  } catch (error) {
    next(error);
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Failed to clean up temp file:', err.message);
      }
    }
  }
};

