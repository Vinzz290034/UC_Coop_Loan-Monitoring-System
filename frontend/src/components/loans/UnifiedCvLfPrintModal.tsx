'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import {
  Printer,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Link2,
  Layers,
  Loader2,
  Receipt,
  FileSpreadsheet,
  Check,
  Edit3
} from 'lucide-react';

export interface UnifiedCvLfPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Either a check voucher OR a liquidation form can be passed initially
  initialCv?: any | null;
  initialLf?: any | null;
  initialType?: 'stl' | 'rf' | null;
  initialMode?: 'summary' | 'detailed';
  onEdit?: (cv: any, mode?: 'summary' | 'detailed', rows?: any[]) => void;
  onLinkSuccess?: (updatedCv?: any, updatedLf?: any) => void;
}

// Helpers
function formatCurrency(amt: number | string | null | undefined): string {
  const val = Number(amt) || 0;
  return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cleanCvNumber(vNo?: string): string {
  if (!vNo) return '—';
  return String(vNo).replace(/^CV\s*#?/i, '').trim();
}

export function getSignatoryTitle(name: string, fallback: string = ''): string {
  if (!name) return '';
  const n = name.trim().toLowerCase();
  if (n.includes('pable') || n.includes('michelle')) {
    return 'Manager';
  }
  if (n.includes('tatoy') || n.includes('candilario')) {
    return 'Chairman';
  }
  if (n.includes('lariosa') || n.includes('marilou')) {
    return 'Bookkeeper';
  }
  if (n.includes('lamoste') || n.includes('chinnette')) {
    return 'Cashier';
  }
  return fallback;
}

function formatRawDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const str = String(dateStr).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (match) {
    const monthIdx = parseInt(match[2], 10) - 1;
    const day = match[3];
    return `${day}-${months[monthIdx] || match[2]}`;
  }
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}-${months[d.getMonth()]}`;
  } catch {
    return str;
  }
}

function formatIsoDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const str = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str.split('T')[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return str;
  }
}

function formatLongDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return String(dateStr);
  }
}

function formatDisbursedInWords(amount: number): string {
  if (amount <= 0) return 'ZERO PESOS ONLY';
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  const toWords = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '') + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' HUNDRED ' + toWords(n % 100);
    if (n < 1000000) return toWords(Math.floor(n / 1000)).trim() + ' THOUSAND ' + toWords(n % 1000);
    return toWords(Math.floor(n / 1000000)).trim() + ' MILLION ' + toWords(n % 1000000);
  };
  const pesos = Math.floor(amount);
  const centavos = Math.round((amount - pesos) * 100);
  const words = pesos === 0 ? 'ZERO' : toWords(pesos).replace(/\s+/g, ' ').trim();
  const currencyUnit = pesos === 1 ? 'PESO' : 'PESOS';

  if (centavos > 0) {
    return `${words} AND ${centavos.toString().padStart(2, '0')}/100 ${currencyUnit} ONLY`;
  }
  return `${words} ${currencyUnit} ONLY`;
}

function getCvDisbursedAmount(cv: any): number {
  if (!cv) return 0;

  // 1. Explicit cib_amount field on voucher
  if (cv.cib_amount && parseFloat(String(cv.cib_amount).replace(/,/g, '')) > 0) {
    return parseFloat(String(cv.cib_amount).replace(/,/g, ''));
  }

  let details: any[] = [];
  if (Array.isArray(cv.details)) {
    details = cv.details;
  } else if (typeof cv.details === 'string') {
    try {
      const parsed = JSON.parse(cv.details);
      if (Array.isArray(parsed)) details = parsed;
    } catch {
      details = [];
    }
  }

  if (details.length > 0) {
    // 2. Search for explicit CIB (Cash In Bank) entry representing actual check disbursed
    for (const item of details) {
      const desc = (item.book_of_account || item.description || '').trim();
      if (/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc)) {
        const creditRaw = item.credit !== null && item.credit !== undefined && item.credit !== '' ? item.credit : null;
        const amtRaw = item.amount !== null && item.amount !== undefined && item.amount !== '' ? item.amount : null;
        const val = creditRaw !== null
          ? parseFloat(String(creditRaw).replace(/,/g, ''))
          : (typeof amtRaw === 'number' ? Math.abs(amtRaw) : Math.abs(parseFloat(String(amtRaw || item.debit || 0).replace(/,/g, ''))));
        if (!isNaN(val) && val > 0) return val;
      }
    }

    // 3. If no explicit CIB row, compute net disbursed: Total Debits minus deductions (other credits)
    let dSum = 0;
    let cSum = 0;
    for (const item of details) {
      const desc = (item.book_of_account || item.description || '').trim();
      if (/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc)) continue;
      const val = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount || item.debit || 0).replace(/,/g, ''));
      const isCredit = item.is_credit === true ||
                       item.isAutoCredit === true ||
                       /^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc) ||
                       val < 0 ||
                       (item.credit !== null && item.credit !== undefined && item.credit !== '' && !item.debit);
      if (isCredit) {
        const creditVal = val < 0 ? Math.abs(val) : (item.credit !== null && item.credit !== undefined && item.credit !== '' ? parseFloat(String(item.credit).replace(/,/g, '')) : Math.abs(val));
        if (!isNaN(creditVal)) cSum += creditVal;
      } else if (!isNaN(val) && val > 0) {
        dSum += val;
      }
    }
    if (dSum > 0 && cSum > 0 && dSum > cSum) {
      return dSum - cSum;
    }
    if (dSum > 0) return dSum;
  }

  // Check linked revolving fund items or STL items if details is not yet populated
  if (Array.isArray(cv.revolving_fund?.items) && cv.revolving_fund.items.length > 0) {
    const rfSum = cv.revolving_fund.items
      .filter((it: any) => !it.is_cancelled)
      .reduce((sum: number, it: any) => sum + (parseFloat(String(it.amount || 0).replace(/,/g, '')) || 0), 0);
    if (rfSum > 0) return rfSum;
  }
  if (Array.isArray(cv.stl_liquidation?.items) && cv.stl_liquidation.items.length > 0) {
    const stlSum = cv.stl_liquidation.items
      .filter((it: any) => !it.is_cancelled)
      .reduce((sum: number, it: any) => sum + (parseFloat(String(it.amount || 0).replace(/,/g, '')) || 0), 0);
    if (stlSum > 0) return stlSum;
  }

  return parseFloat(String(cv.amount || 0).replace(/,/g, '')) || 0;
}

export function formatPayeeName(name?: string): string {
  if (!name || typeof name !== 'string') return name || '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',');
    const lastName = parts[0].trim();
    const firstName = parts.slice(1).join(',').trim();
    if (firstName && lastName) {
      return `${firstName} ${lastName}`.replace(/\s+/g, ' ').toUpperCase();
    }
  }

  return trimmed.replace(/\s+/g, ' ').toUpperCase();
}

const VALID_CV_CATEGORIES = ['Operation', 'Service', 'Merchandise', 'CETF', 'CDF', 'Honorarium', 'Allowances', 'Wages'];

function cleanCategoryName(name: string): string {
  if (!name) return 'Operation';
  const stripped = name
    .replace(/^revolving\s*fund\s*-\s*/i, '')
    .replace(/^stl\s*-\s*/i, '')
    .replace(/^short\s*term\s*loan\s*-\s*/i, '')
    .trim();
  const lower = stripped.toLowerCase();
  if (lower === 'honorarium') return 'Honorarium';
  if (lower === 'allowance' || lower === 'allowances') return 'Allowances';
  if (lower === 'wage' || lower === 'wages') return 'Wages';
  if (lower === 'honorarium and allowances') return 'Honorarium';
  if (lower === 'operation' || lower === 'operations') return 'Operation';
  if (lower === 'service' || lower === 'services') return 'Service';
  if (lower === 'merchandise') return 'Merchandise';
  if (lower === 'cetf') return 'CETF';
  if (lower === 'cdf') return 'CDF';
  if (lower === 'stl') return 'STL';
  return stripped;
}

function isRowCredit(row: any): boolean {
  if (!row) return false;
  if (row.is_credit === true || row.isAutoCredit === true) return true;
  const rawAmt = typeof row.amount === 'number' ? row.amount : parseFloat(row.amount || 0);
  if (rawAmt < 0) return true;
  const creditVal = typeof row.credit === 'number' ? row.credit : parseFloat(row.credit || 0);
  const debitVal = typeof row.debit === 'number' ? row.debit : parseFloat(row.debit || 0);
  if (creditVal > 0 && debitVal <= 0) return true;
  const desc = (row.book_of_account || row.description || '').trim();
  if (/^revolving\s*fund\s*-\s*/i.test(desc)) return true;
  return false;
}

function getCreditRowCategory(creditRow: any): string {
  if (!creditRow) return '';
  if (creditRow.category) {
    const cleaned = cleanCategoryName(creditRow.category);
    if (VALID_CV_CATEGORIES.includes(cleaned)) return cleaned;
  }
  const creditAcct = (creditRow.book_of_account || creditRow.description || '').trim();
  const cleaned = cleanCategoryName(creditAcct);
  if (VALID_CV_CATEGORIES.includes(cleaned)) return cleaned;
  return '';
}

function getCategoryForAccount(acct: string): string {
  const trimmed = (acct || '').trim();
  if (!trimmed) return 'Operation';
  const lower = trimmed.toLowerCase();

  // 1. Check localStorage cache if available
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('rf_account_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[lower]) return parsed[lower];
      }
    } catch {
      // ignore
    }
  }

  // 2. Specific Honorarium & Wages accounts
  if (lower === 'honorarium' || (lower.includes('honorarium') && !lower.includes('allowance'))) {
    return 'Honorarium';
  }
  if (lower === 'allowances' || lower === 'allowance' || (lower.includes('allowance') && !lower.includes('honorarium'))) {
    return 'Allowances';
  }
  if (lower === 'honorarium and allowances') {
    return 'Honorarium';
  }
  if (lower.includes('wage')) {
    return 'Wages';
  }

  // 3. Keyword heuristic
  if (
    lower.includes('wifi') ||
    lower.includes('water') ||
    lower.includes('cos') ||
    lower.includes('service') ||
    lower.includes('repair') ||
    lower.includes('labor') ||
    lower.includes('duplicate') ||
    lower.includes('toga rental labor')
  ) {
    return 'Service';
  }
  if (
    lower.includes('merchandise') ||
    lower.includes('inventory') ||
    lower.includes('cogs') ||
    lower.includes('freight') ||
    lower.includes('commission') ||
    lower.includes('pershing') ||
    lower.includes('lanyard') ||
    lower.includes('handbag') ||
    lower.includes('hardhat') ||
    lower.includes('goggles') ||
    lower.includes('porterage')
  ) {
    return 'Merchandise';
  }
  if (lower.includes('cetf') || lower.includes('apex')) {
    return 'CETF';
  }
  if (lower.includes('cdf')) {
    return 'CDF';
  }
  return 'Operation';
}

function resolveItemCategory(it: any, cvDetails?: any[], lfItems?: any[]): string {
  if (!it) return 'Operation';

  // 1. Explicit category directly on the item
  if (it.category) {
    const cleaned = cleanCategoryName(it.category);
    if (VALID_CV_CATEGORIES.includes(cleaned)) return cleaned;
  }

  // 2. Direct account inspection for Honorarium, Allowances, Wages
  const desc = (it.book_of_account || it.description || it.particulars || '').trim();
  const lower = desc.toLowerCase();
  if (lower === 'honorarium' || (lower.includes('honorarium') && !lower.includes('allowance'))) {
    return 'Honorarium';
  }
  if (lower === 'allowances' || lower === 'allowance' || (lower.includes('allowance') && !lower.includes('honorarium'))) {
    return 'Allowances';
  }
  if (lower === 'honorarium and allowances') {
    return 'Honorarium';
  }
  if (lower.includes('wage')) {
    return 'Wages';
  }

  // If the item itself is an explicit credit row (e.g. "Revolving Fund - CDF"), return its category directly
  if (isRowCredit(it)) {
    const directCat = getCreditRowCategory(it);
    if (directCat) return directCat;
  }

  const vKey = it.voucher_no ? String(it.voucher_no).replace(/^CV-?0*/i, '').trim() : '';

  // 3. Look for paired credit row in cvDetails
  if (Array.isArray(cvDetails) && cvDetails.length > 0) {
    const itIdx = cvDetails.indexOf(it);

    // 3a. Primary journal check: immediate subsequent row (itIdx + 1)
    if (itIdx !== -1 && itIdx + 1 < cvDetails.length) {
      const nextRow = cvDetails[itIdx + 1];
      if (isRowCredit(nextRow) && !/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(nextRow.book_of_account || nextRow.description || '')) {
        const cat = getCreditRowCategory(nextRow);
        if (cat) return cat;
      }
    }

    // 3b. Look forward from itIdx for credit row matching voucher_no
    if (itIdx !== -1) {
      for (let j = itIdx + 1; j < cvDetails.length; j++) {
        const c = cvDetails[j];
        if (isRowCredit(c) && !/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(c.book_of_account || c.description || '')) {
          const cVKey = c.voucher_no ? String(c.voucher_no).replace(/^CV-?0*/i, '').trim() : '';
          if (vKey && cVKey && cVKey.toLowerCase() === vKey.toLowerCase()) {
            const cat = getCreditRowCategory(c);
            if (cat) return cat;
          }
        }
      }
    }

    // 3c. Look across all cvDetails for a credit row with matching voucher_no
    if (vKey) {
      const pairedCredit = cvDetails.find((c: any) => {
        if (!isRowCredit(c) || /^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(c.book_of_account || c.description || '')) return false;
        const cVKey = c.voucher_no ? String(c.voucher_no).replace(/^CV-?0*/i, '').trim() : '';
        return cVKey && cVKey.toLowerCase() === vKey.toLowerCase();
      });

      if (pairedCredit) {
        const cat = getCreditRowCategory(pairedCredit);
        if (cat) return cat;
      }
    }

    // 3d. Adjacent preceding row (itIdx - 1)
    if (itIdx > 0) {
      const prevRow = cvDetails[itIdx - 1];
      if (isRowCredit(prevRow) && !/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(prevRow.book_of_account || prevRow.description || '')) {
        const cat = getCreditRowCategory(prevRow);
        if (cat) return cat;
      }
    }
  }

  // 4. Matched liquidation schedule item
  if (Array.isArray(lfItems) && lfItems.length > 0) {
    const matchLf = lfItems.find((l: any) =>
      !l.is_cancelled &&
      ((vKey && l.voucher_no && String(l.voucher_no).replace(/^CV-?0*/i, '').trim() === vKey) ||
       (vKey && l.particulars && String(l.particulars).includes(vKey)) ||
       (it.remarks && l.remarks && String(it.remarks).trim() === String(l.remarks).trim()))
    );
    if (matchLf?.category) {
      const cleaned = cleanCategoryName(matchLf.category);
      if (VALID_CV_CATEGORIES.includes(cleaned)) return cleaned;
    }
  }

  // 5. Remarks or description explicit mentions of category
  const textToCheck = `${it.remarks || ''} ${it.book_of_account || ''} ${it.description || ''}`.toLowerCase();
  if (/\bcdf\b/i.test(textToCheck)) return 'CDF';
  if (/\bcetf\b/i.test(textToCheck)) return 'CETF';
  if (/\bhonorarium\b/i.test(textToCheck) && !/\ballowance\b/i.test(textToCheck)) return 'Honorarium';
  if (/\ballowance\b/i.test(textToCheck) && !/\bhonorarium\b/i.test(textToCheck)) return 'Allowances';
  if (/\bwages?\b/i.test(textToCheck)) return 'Wages';

  // 6. Account heuristic fallback
  const descToUse = (it.book_of_account || it.description || '').trim();
  return cleanCategoryName(getCategoryForAccount(descToUse));
}

function getBalancedCvRows(cv: any, lfItems?: any[], resolvedType?: 'stl' | 'rf') {
  const rows: { date: string; voucher_no: string; description: string; remarks: string; debit: number | null; credit: number | null; category?: string }[] = [];
  let debitTotal = 0;
  let creditTotal = 0;

  const activeItems = (lfItems || []).filter((it: any) => !it.is_cancelled);

  let details: any[] = [];
  if (Array.isArray(cv?.details)) {
    details = cv.details;
  } else if (typeof cv?.details === 'string') {
    try {
      const parsed = JSON.parse(cv.details);
      if (Array.isArray(parsed)) details = parsed;
    } catch {
      details = [];
    }
  }

  const isBroadCategoryDesc = (desc: string) => {
    const d = (desc || '').trim().toLowerCase();
    return ['operation', 'operations', 'service', 'services', 'merchandise', 'cdf', 'cetf', 'stl', 'short term loan', 'revolving fund', 'loan', 'petty cash'].includes(d) ||
           /^(revolving\s*fund|stl|short\s*term\s*loan)\s*-\s*(operation|operations|service|services|stl|cdf|cetf|merchandise)$/i.test(d);
  };

  const debitDetails = details.filter(d => {
    const val = typeof d.amount === 'number' ? d.amount : parseFloat(d.amount || d.debit || 0);
    const desc = d.book_of_account || d.description || '';
    const isCredit = d.is_credit === true || /^(cib\b|cash\s*in\s*bank)/i.test(desc) || val < 0;
    return !isCredit && val > 0;
  });

  const detailsAreOnlyCategories = debitDetails.length > 0 && debitDetails.every(d => isBroadCategoryDesc(d.book_of_account || d.description || ''));

  // Prioritize activeItems from attached liquidation schedule when:
  // 1. cv details is empty, OR
  // 2. stored details only contain broad category labels (Operation/Service/etc.) — treat those as summary-level, not truly detailed
  const shouldUseActiveItems = activeItems.length > 0 && (debitDetails.length === 0 || detailsAreOnlyCategories);

  if (shouldUseActiveItems) {
    const defaultVNo = (cv?.voucher_no ? String(cv.voucher_no).replace(/^CV-?0*/i, '').trim() : '') || '—';
    for (const it of activeItems) {
      const amt = typeof it.amount === 'number' ? it.amount : parseFloat(it.amount || 0);
      if (amt <= 0) continue;
      const rawDate = it.item_date || it.item_date_raw || it.release_date || it.release_date_raw;
      const dateStr = rawDate ? formatIsoDate(rawDate) : (cv?.voucher_date ? formatIsoDate(cv.voucher_date) : '—');
      const vNo = it.voucher_no || defaultVNo || it.particulars || '—';
      const expAccount = it.account_name || (resolvedType === 'stl' ? (it.particulars || 'Short Term Loan') : 'Expense');

      rows.push({
        date: dateStr,
        voucher_no: vNo,
        description: expAccount,
        remarks: it.remarks || '',
        debit: amt,
        credit: null,
        category: it.category ? cleanCategoryName(it.category) : resolveItemCategory(it, [], activeItems)
      });
      debitTotal += amt;
    }

    return { rows, debitTotal, creditTotal: 0 };
  }

  if (details.length > 0) {
    let lastDebitCategory: string | undefined = undefined;
    let lastDebitVoucherNo: string | undefined = undefined;

    for (const item of details) {
      const desc = item.book_of_account || item.description || '';
      const rawVal = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || 0);
      
      // Skip CIB in body rows because CIB is rendered as the dedicated CIB footer row at the table bottom
      if (/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc.trim())) {
        continue;
      }

      const isCreditItem = item.is_credit === true ||
                           item.isAutoCredit === true ||
                           rawVal < 0 ||
                           (item.credit !== null && item.credit !== undefined && item.credit !== '' && !item.debit && !item.book_of_account && !item.description);
      const dateStr = item.date ? formatIsoDate(item.date) : (cv?.voucher_date ? formatIsoDate(cv.voucher_date) : '—');
      const vNo = item.voucher_no || (cv?.voucher_no ? String(cv.voucher_no).replace(/^CV-?0*/i, '').trim() : '') || '—';

      if (isCreditItem) {
        const creditVal = rawVal < 0
          ? Math.abs(rawVal)
          : (item.credit !== null && item.credit !== undefined && item.credit !== '' ? Number(item.credit) : (item.debit ? Number(item.debit) : (rawVal > 0 ? rawVal : null)));
        
        let creditCat = item.category ? cleanCategoryName(item.category) : '';
        if (!creditCat || !VALID_CV_CATEGORIES.includes(creditCat)) {
          const fromDesc = cleanCategoryName(desc);
          if (VALID_CV_CATEGORIES.includes(fromDesc)) {
            creditCat = fromDesc;
          }
        }
        if (!creditCat && lastDebitCategory && (vNo === lastDebitVoucherNo || vNo === '—' || !vNo)) {
          creditCat = lastDebitCategory;
        }

        rows.push({
          date: dateStr,
          voucher_no: vNo,
          description: desc || 'Credit / Deduction',
          remarks: item.remarks || '',
          debit: null,
          credit: creditVal,
          category: creditCat || undefined
        });
        if (creditVal) creditTotal += creditVal;
      } else if (rawVal > 0) {
        const resolvedCat = resolveItemCategory(item, details, activeItems);
        lastDebitCategory = resolvedCat;
        lastDebitVoucherNo = vNo;
        rows.push({
          date: dateStr,
          voucher_no: vNo,
          description: desc || 'Disbursement Line',
          remarks: item.remarks || '',
          debit: rawVal,
          credit: null,
          category: resolvedCat
        });
        debitTotal += rawVal;
      } else if (desc) {
        rows.push({
          date: dateStr,
          voucher_no: vNo,
          description: desc,
          remarks: item.remarks || '',
          debit: null,
          credit: null
        });
      }
    }

    return { rows, debitTotal, creditTotal };
  }

  const fallbackAmt = parseFloat(cv?.amount || 0);
  if (fallbackAmt > 0) {
    const dateStr = cv?.voucher_date ? formatIsoDate(cv.voucher_date) : '—';
    const vNo = cv?.voucher_no || '—';
    rows.push({
      date: dateStr,
      voucher_no: vNo,
      description: cv?.particulars || (resolvedType === 'stl' ? 'Short Term Loan' : 'Operation'),
      remarks: '',
      debit: fallbackAmt,
      credit: null
    });
    debitTotal = fallbackAmt;
    creditTotal = 0;
  }

  return { rows, debitTotal, creditTotal };
}

function formatCibAccountName(bankName?: string): string {
  const b = (bankName || '').trim().toUpperCase();
  if (!b) return 'CIB-MBTC';
  if (b.includes('METRO') || b.includes('MBTC')) return 'CIB-MBTC';
  if (b.includes('BDO')) return 'CIB-BDO';
  if (b.includes('LAND') || b.includes('LBP')) return 'CIB-LBP';
  if (b.includes('PNB')) return 'CIB-PNB';
  if (b.includes('DBP')) return 'CIB-DBP';
  if (b.includes('BPI')) return 'CIB-BPI';
  if (b.startsWith('CIB-')) return b;
  if (b.startsWith('CIB - ')) return `CIB-${b.slice(6)}`;
  if (b.startsWith('CIB ')) return `CIB-${b.slice(4)}`;
  return `CIB-${b.replace(/\s*BANK\b/i, '').trim()}`;
}

function checkIsHonorariumAndWages(cv: any): boolean {
  if (!cv) return false;
  const rfClass = String(
    cv?.rf_classification ||
    cv?.revolving_fund_classification ||
    ''
  ).toLowerCase();
  if (rfClass.includes('honorarium') || rfClass.includes('wages')) return true;

  const folder = String(cv?.folder_name || '').toLowerCase();
  if (folder.includes('honorarium') || folder.includes('wages')) return true;

  const particulars = String(cv?.particulars || cv?.description || '').toLowerCase();
  if (particulars.includes('honorarium') || particulars.includes('wages')) return true;

  let detailsText = '';
  const details = cv?.details;
  if (Array.isArray(details)) {
    detailsText = details.map((d: any) => `${d.book_of_account || ''} ${d.description || ''} ${d.particulars || ''} ${d.remarks || ''}`).join(' ');
  } else if (typeof details === 'string') {
    detailsText = details;
  }
  if (detailsText.toLowerCase().includes('honorarium') || detailsText.toLowerCase().includes('wages')) return true;

  const fa = Number(cv?.fund_amount || cv?.authorized_amount);
  if (fa === 56100) return true;

  return false;
}

function getSummaryCvRows(
  cv: any,
  resolvedType: 'stl' | 'rf',
  categoryBreakdown: { list: { name: string; amount: number; percent: string }[]; total: number },
  detailedRows?: { description: string; debit: number | null; credit: number | null }[]
) {
  const rows: { description: string; debit: number | null; credit: number | null }[] = [];
  let debitTotal = 0;
  let creditTotal = 0;

  const isHonorarium = checkIsHonorariumAndWages(cv);
  const cibName = formatCibAccountName(cv?.bank || cv?.bank_name);

  // STL Replenishment: Group into Loans Receivable, Service Fee, Insurance Payable, other deductions, and CIB
  if (resolvedType === 'stl') {
    let sourceRows: { description: string; debit: number | null; credit: number | null }[] = [];
    if (detailedRows && detailedRows.length > 0) {
      sourceRows = detailedRows;
    } else {
      let rawDetails: any[] = [];
      if (Array.isArray(cv?.details)) {
        rawDetails = cv.details;
      } else if (typeof cv?.details === 'string') {
        try {
          const parsed = JSON.parse(cv.details);
          if (Array.isArray(parsed)) rawDetails = parsed;
        } catch {}
      }
      if (rawDetails.length > 0) {
        for (const item of rawDetails) {
          const desc = item.book_of_account || item.description || '';
          const val = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || 0);
          const isCred = item.is_credit === true || item.isAutoCredit === true || val < 0;
          if (isCred) {
            sourceRows.push({ description: desc, debit: null, credit: Math.abs(val) || Number(item.credit) || 0 });
          } else {
            sourceRows.push({ description: desc, debit: val || Number(item.debit) || 0, credit: null });
          }
        }
      } else if (Array.isArray(cv?.stl_liquidation?.items) && cv.stl_liquidation.items.length > 0) {
        for (const it of cv.stl_liquidation.items) {
          if (it.is_cancelled) continue;
          const val = typeof it.amount === 'number' ? it.amount : parseFloat(it.amount || 0);
          if (val > 0) {
            sourceRows.push({ description: it.particulars || 'Loans Receivable', debit: val, credit: null });
          }
        }
      }
    }

    const debitMap: Record<string, number> = {};
    const creditMap: Record<string, number> = {};

    for (const r of sourceRows) {
      const desc = (r.description || '').trim();
      if (!desc) continue;
      // Skip CIB in detailed rows because CIB is added as balancing row
      if (/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc)) continue;

      const dVal = r.debit !== null && r.debit !== undefined ? Number(r.debit) : 0;
      const cVal = r.credit !== null && r.credit !== undefined ? Number(r.credit) : 0;

      if (dVal > 0) {
        let acct = 'Loans Receivable';
        if (/loans?\s*receivable/i.test(desc) || /short\s*term\s*loan|stl/i.test(desc)) {
          acct = 'Loans Receivable';
        } else {
          acct = desc.replace(/;.*$/, '').trim() || 'Loans Receivable';
        }
        debitMap[acct] = (debitMap[acct] || 0) + dVal;
      }

      if (cVal > 0) {
        let acct = 'Other Deductions';
        if (/service\s*fee/i.test(desc)) {
          acct = 'Service Fee';
        } else if (/insurance/i.test(desc)) {
          acct = 'Insurance Payable';
        } else if (/interest/i.test(desc)) {
          acct = 'Interest Receive';
        } else if (/loans?\s*receivable/i.test(desc)) {
          acct = 'Loans Receivable';
        } else {
          acct = desc.replace(/;.*$/, '').trim() || 'Other Deductions';
        }
        creditMap[acct] = (creditMap[acct] || 0) + cVal;
      }
    }

    if (Object.keys(debitMap).length === 0) {
      const fallbackAmt = parseFloat(cv?.amount || 0);
      if (fallbackAmt > 0) {
        debitMap['Loans Receivable'] = fallbackAmt;
      }
    }

    for (const [name, amt] of Object.entries(debitMap)) {
      if (amt > 0) {
        rows.push({
          description: name,
          debit: amt,
          credit: null
        });
        debitTotal += amt;
      }
    }

    const preferredOrder = ['Service Fee', 'Insurance Payable', 'Interest Receive', 'Loans Receivable'];
    const sortedCreditKeys = Object.keys(creditMap).sort((a, b) => {
      const idxA = preferredOrder.indexOf(a);
      const idxB = preferredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    for (const name of sortedCreditKeys) {
      const amt = creditMap[name];
      if (amt > 0) {
        rows.push({
          description: name,
          debit: null,
          credit: amt
        });
        creditTotal += amt;
      }
    }

    const balancingCib = Math.max(0, debitTotal - creditTotal);
    if (balancingCib > 0 || creditTotal === 0) {
      const cibAmount = balancingCib > 0 ? balancingCib : (cv?.amount ? parseFloat(cv.amount) : 0);
      rows.push({
        description: cibName,
        debit: null,
        credit: cibAmount
      });
      creditTotal += cibAmount;
    }

    return { rows, debitTotal, creditTotal };
  }

  // Revolving Fund (resolvedType === 'rf')
  if (isHonorarium) {
    // For Revolving Fund Replenishment - Honorarium & Wages:
    // Separate by specific account (e.g. Honorarium and Allowances, Wages, Allowances) instead of collapsing into a single category
    const honorariumMap: Record<string, number> = {};

    let sourceItems: any[] = [];
    if (detailedRows && detailedRows.length > 0) {
      sourceItems = detailedRows;
    } else {
      let rawDetails: any[] = [];
      if (Array.isArray(cv?.details)) {
        rawDetails = cv.details;
      } else if (typeof cv?.details === 'string') {
        try {
          const parsed = JSON.parse(cv.details);
          if (Array.isArray(parsed)) rawDetails = parsed;
        } catch {}
      }
      if (rawDetails.length > 0) {
        sourceItems = rawDetails;
      } else if (Array.isArray(cv?.revolving_fund?.items) && cv.revolving_fund.items.length > 0) {
        sourceItems = cv.revolving_fund.items.filter((it: any) => !it.is_cancelled);
      }
    }

    if (sourceItems.length > 0) {
      for (const it of sourceItems) {
        const desc = (it.book_of_account || it.description || it.particulars || '').trim();
        if (/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc)) continue;

        const val = typeof it.amount === 'number'
          ? it.amount
          : (it.debit !== null && it.debit !== undefined && it.debit !== ''
              ? parseFloat(it.debit)
              : parseFloat(it.amount || 0));

        const isCredit = it.is_credit === true || it.isAutoCredit === true || val < 0;
        if (!isCredit && val > 0) {
          let acctName = desc;
          const lowerAcct = acctName.toLowerCase();
          if (!acctName || lowerAcct === 'operation') {
            acctName = 'Honorarium';
          } else if (lowerAcct === 'honorarium and allowances') {
            acctName = 'Honorarium';
          } else if (lowerAcct.includes('honorarium') && !lowerAcct.includes('allowance')) {
            acctName = 'Honorarium';
          } else if (lowerAcct.includes('allowance') && !lowerAcct.includes('honorarium')) {
            acctName = 'Allowances';
          } else if (lowerAcct.includes('wage')) {
            acctName = 'Wages';
          }
          honorariumMap[acctName] = (honorariumMap[acctName] || 0) + val;
        }
      }
    }

    if (Object.keys(honorariumMap).length === 0) {
      const fallbackAmt = parseFloat(cv?.amount || 0);
      if (fallbackAmt > 0) {
        honorariumMap['Honorarium'] = fallbackAmt;
      }
    }

    const preferredOrder = [
      'Honorarium',
      'Allowances',
      'Wages'
    ];

    const sortedKeys = Object.keys(honorariumMap).sort((a, b) => {
      const idxA = preferredOrder.indexOf(a);
      const idxB = preferredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    for (const acct of sortedKeys) {
      const amt = honorariumMap[acct];
      rows.push({
        description: acct,
        debit: amt,
        credit: null
      });
      debitTotal += amt;
    }
  } else if (categoryBreakdown.list.length > 0) {
    for (const cat of categoryBreakdown.list) {
      const cleanName = cleanCategoryName(cat.name);
      rows.push({
        description: cleanName,
        debit: cat.amount,
        credit: null
      });
      debitTotal += cat.amount;
    }
  } else {
    // If no category breakdown available, fallback to cv details or amount
    let details: any[] = [];
    if (Array.isArray(cv?.details)) {
      details = cv.details;
    } else if (typeof cv?.details === 'string') {
      try {
        const parsed = JSON.parse(cv.details);
        if (Array.isArray(parsed)) details = parsed;
      } catch {
        details = [];
      }
    }

    const catMap: Record<string, number> = {};
    if (details.length > 0) {
      for (const item of details) {
        const val = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || 0);
        const desc = item.book_of_account || item.description || '';
        if (val > 0 && !/cib\b|cash\s*in\s*bank/i.test(desc)) {
          const cat = resolveItemCategory(item, details, []);
          catMap[cat] = (catMap[cat] || 0) + val;
        }
      }
    } else if (Array.isArray(cv?.revolving_fund?.items) && cv.revolving_fund.items.length > 0) {
      for (const it of cv.revolving_fund.items) {
        if (it.is_cancelled) continue;
        const val = typeof it.amount === 'number' ? it.amount : parseFloat(it.amount || 0);
        if (val > 0) {
          const cat = resolveItemCategory(it, [], cv.revolving_fund.items);
          catMap[cat] = (catMap[cat] || 0) + val;
        }
      }
    }

    const preferredOrder = ['Operation', 'CDF', 'Service', 'Merchandise', 'CETF'];
    const sortedCats = Object.keys(catMap).sort((a, b) => {
      const idxA = preferredOrder.indexOf(a);
      const idxB = preferredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return catMap[b] - catMap[a];
    });

    if (sortedCats.length > 0) {
      for (const cat of sortedCats) {
        const amt = catMap[cat];
        rows.push({
          description: cat,
          debit: amt,
          credit: null
        });
        debitTotal += amt;
      }
    } else {
      const fallbackAmt = parseFloat(cv?.amount || 0);
      if (fallbackAmt > 0) {
        rows.push({
          description: 'Operation',
          debit: fallbackAmt,
          credit: null
        });
        debitTotal = fallbackAmt;
      }
    }
  }

  // Balancing Credit row: CIB-MBTC
  if (debitTotal > 0) {
    rows.push({
      description: cibName,
      debit: null,
      credit: debitTotal
    });
    creditTotal = debitTotal;
  }

  return { rows, debitTotal, creditTotal };
}

function getJournalCvRows(
  cv: any,
  resolvedType: 'stl' | 'rf',
  categoryBreakdown: { list: { name: string; amount: number; percent: string }[]; total: number }
) {
  const summary = getSummaryCvRows(cv, resolvedType, categoryBreakdown);
  const rawDate = cv?.voucher_date || cv?.date;
  const dateStr = rawDate ? formatIsoDate(rawDate) : '—';
  const vNo = cv?.voucher_no ? cleanCvNumber(cv.voucher_no) : '—';

  const rows = summary.rows.map(r => ({
    date: dateStr,
    voucher_no: vNo,
    description: r.description,
    remarks: '',
    debit: r.debit,
    credit: r.credit
  }));

  return { rows, debitTotal: summary.debitTotal, creditTotal: summary.creditTotal };
}

export default function UnifiedCvLfPrintModal({
  isOpen,
  onClose,
  initialCv,
  initialLf,
  initialType,
  initialMode,
  onEdit,
  onLinkSuccess
}: UnifiedCvLfPrintModalProps) {
  const [loading, setLoading] = useState(false);
  const [linkingAction, setLinkingAction] = useState(false);
  const [currentCv, setCurrentCv] = useState<any | null>(null);
  const [currentLf, setCurrentLf] = useState<any | null>(null);
  const [lfItems, setLfItems] = useState<any[]>([]);
  const [resolvedType, setResolvedType] = useState<'stl' | 'rf'>('stl');

  // View mode: 'summary' (categorized 4-row summary) | 'detailed' (detailed itemized schedule)
  const [cvViewMode, setCvViewMode] = useState<'summary' | 'detailed'>(initialMode || 'summary');
  // Track whether modal was already open to avoid resetting view mode mid-session
  const wasOpenRef = useRef(false);

  // Category filter for on-screen inspection (never prints)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // Only reset view mode when modal first opens, not while it stays open
      setCvViewMode(initialMode || 'detailed');
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialMode]);

  // Available options for linking when unlinked
  const [availableLiquidations, setAvailableLiquidations] = useState<any[]>([]);
  const [availableCheckVouchers, setAvailableCheckVouchers] = useState<any[]>([]);
  const [selectedLinkTargetId, setSelectedLinkTargetId] = useState<string>('');

  // Actual print trigger state
  const [isPrinting, setIsPrinting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Detailed Check Voucher Signatories
  const [isEditingDetailedSignatories, setIsEditingDetailedSignatories] = useState(false);
  const [detailedLiquidatedBy, setDetailedLiquidatedBy] = useState('MICHELLE M. PABLE');
  const [detailedLiquidatedByTitle, setDetailedLiquidatedByTitle] = useState('Manager');
  const [detailedApprovedBy, setDetailedApprovedBy] = useState('CANDILARIO N. TATOY');
  const [detailedApprovedByTitle, setDetailedApprovedByTitle] = useState('Chairman');
  const [isSavingSignatories, setIsSavingSignatories] = useState(false);

  // Sync signatories when currentCv or currentLf updates
  useEffect(() => {
    if (currentCv || currentLf) {
      const liq = currentCv?.signatories?.liquidated_by || currentLf?.custodian_name || 'MICHELLE M. PABLE';
      const liqTitle = currentCv?.signatories?.liquidated_by_title !== undefined
        ? currentCv.signatories.liquidated_by_title
        : (getSignatoryTitle(liq) || 'Manager');
      const app = currentCv?.signatories?.detailed_approved_by || currentCv?.signatories?.approved_by || currentLf?.approved_by || 'CANDILARIO N. TATOY';
      const appTitle = currentCv?.signatories?.detailed_approved_by_title !== undefined
        ? currentCv.signatories.detailed_approved_by_title
        : (currentCv?.signatories?.approved_by_title !== undefined
            ? currentCv.signatories.approved_by_title
            : (getSignatoryTitle(app) || 'Chairman'));
      setDetailedLiquidatedBy(liq);
      setDetailedLiquidatedByTitle(liqTitle);
      setDetailedApprovedBy(app);
      setDetailedApprovedByTitle(appTitle);
    }
  }, [currentCv, currentLf]);

  const liquidatedByTitle = detailedLiquidatedByTitle;
  const approvedByTitle = detailedApprovedByTitle;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize and load data
  const loadFullData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      let cvObj = initialCv ? { ...initialCv } : null;
      let lfObj = initialLf ? { ...initialLf } : null;
      let detectedType: 'stl' | 'rf' = initialType || 'stl';

      // Detect type if not provided
      if (!initialType) {
        if (cvObj) {
          const folder = (cvObj.folder_name || '').toLowerCase();
          const part = (cvObj.particulars || '').toLowerCase();
          if (folder.includes('revolving') || part.includes('revolving') || cvObj.revolving_fund) {
            detectedType = 'rf';
          } else {
            detectedType = 'stl';
          }
        } else if (lfObj) {
          if ('sheet_name' in lfObj || 'custodian_name' in lfObj || 'total_liquidated' in lfObj) {
            detectedType = 'rf';
          } else {
            detectedType = 'stl';
          }
        }
      }
      setResolvedType(detectedType);

      // Case 1: Opened with CV
      if (cvObj && !lfObj) {
        let linkedLfId = detectedType === 'stl' 
          ? (cvObj.stl_liquidation?.id || null)
          : (cvObj.revolving_fund?.id || null);

        // If no explicit linked ID, try to find an LF matching voucher_no or particulars
        if (!linkedLfId) {
          try {
            if (detectedType === 'stl') {
              const resStl = await api.get('/stl-liquidations', { params: { search: cvObj.voucher_no, limit: 25 } });
              let found = resStl.data?.data?.find((f: any) => f.check_voucher_id === cvObj.id || f.voucher_no === cvObj.voucher_no);
              if (!found && cvObj.amount) {
                found = resStl.data?.data?.find((f: any) => Math.abs(parseFloat(f.total_expense || f.total_liquidated || 0) - parseFloat(cvObj.amount)) < 0.01);
              }
              if (found) linkedLfId = found.id;
            } else {
              const resRf = await api.get('/revolving-funds', { params: { search: cvObj.voucher_no, limit: 25 } });
              let found = resRf.data?.data?.find((f: any) => f.check_voucher_id === cvObj.id || f.voucher_no === cvObj.voucher_no);
              if (!found && cvObj.amount) {
                found = resRf.data?.data?.find((f: any) => Math.abs(parseFloat(f.total_liquidated || 0) - parseFloat(cvObj.amount)) < 0.01);
              }
              if (found) linkedLfId = found.id;
            }
          } catch (e) {
            console.warn('Auto search for LF items failed:', e);
          }
        }

        if (linkedLfId) {
          if (detectedType === 'stl') {
            const lfRes = await api.get(`/stl-liquidations/${linkedLfId}`);
            if (lfRes.data?.data) {
              lfObj = lfRes.data.data;
              setLfItems(lfRes.data.data.items || []);
            }
          } else {
            const lfRes = await api.get(`/revolving-funds/${linkedLfId}`);
            if (lfRes.data?.data) {
              lfObj = lfRes.data.data;
              setLfItems(lfRes.data.data.items || []);
            }
          }
        } else {
          // Load available items schedules to attach
          if (detectedType === 'stl') {
            const res = await api.get('/stl-liquidations', { params: { limit: 25 } });
            setAvailableLiquidations(res.data?.data || []);
          } else {
            const res = await api.get('/revolving-funds', { params: { limit: 25 } });
            setAvailableLiquidations(res.data?.data || []);
          }
        }
      }

      // Case 2: Opened with LF
      if (lfObj && !cvObj) {
        const linkedCvId = lfObj.check_voucher_id;
        const linkedCvNo = lfObj.voucher_no || lfObj.cv_voucher_no;

        // Fetch full line items if not present
        if (!lfObj.items || lfObj.items.length === 0) {
          try {
            if (detectedType === 'stl') {
              const lfRes = await api.get(`/stl-liquidations/${lfObj.id}`);
              if (lfRes.data?.data) {
                lfObj = lfRes.data.data;
                setLfItems(lfRes.data.data.items || []);
              }
            } else {
              const lfRes = await api.get(`/revolving-funds/${lfObj.id}`);
              if (lfRes.data?.data) {
                lfObj = lfRes.data.data;
                setLfItems(lfRes.data.data.items || []);
              }
            }
          } catch (e) {
            console.warn('Failed to reload schedule items:', e);
          }
        } else {
          setLfItems(lfObj.items || []);
        }

        // Fetch Check Voucher if linked
        if (linkedCvId) {
          const cvRes = await api.get('/accounts/check-vouchers', { params: { id: linkedCvId } });
          if (cvRes.data?.data?.[0]) {
            cvObj = cvRes.data.data[0];
          }
        } else if (linkedCvNo) {
          const cvRes = await api.get('/accounts/check-vouchers', { params: { search: linkedCvNo, limit: 5 } });
          const matched = cvRes.data?.data?.find((v: any) => v.voucher_no === linkedCvNo) || cvRes.data?.data?.[0];
          if (matched) cvObj = matched;
        }

        if (!cvObj) {
          const folder = detectedType === 'stl' ? 'STL' : 'Revolving Fund';
          const cvRes = await api.get('/accounts/check-vouchers', { params: { folder, limit: 30 } });
          setAvailableCheckVouchers(cvRes.data?.data || []);
        }
      }

      setCurrentCv(cvObj);
      setCurrentLf(lfObj);
    } catch (err) {
      console.error('Failed to load check voucher print data:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, initialCv, initialLf, initialType]);

  useEffect(() => {
    if (isOpen) {
      loadFullData();
    } else {
      setCurrentCv(null);
      setCurrentLf(null);
      setLfItems([]);
      setIsPrinting(false);
      setSelectedLinkTargetId('');
      setIsEditingDetailedSignatories(false);
      setSelectedCategoryFilter(null);
    }
  }, [isOpen, loadFullData]);

  // Handle linking check voucher with itemized schedule
  const handleLinkTogether = async (targetId?: string) => {
    const idToLink = targetId || selectedLinkTargetId;
    if (!idToLink) return;

    setLinkingAction(true);
    try {
      if (currentCv && !currentLf) {
        if (resolvedType === 'stl') {
          await api.post(`/stl-liquidations/${idToLink}/link-voucher`, { check_voucher_id: currentCv.id });
        } else {
          await api.post(`/revolving-funds/${idToLink}/link-voucher`, { check_voucher_id: currentCv.id });
        }
      } else if (currentLf && !currentCv) {
        if (resolvedType === 'stl') {
          await api.post(`/stl-liquidations/${currentLf.id}/link-voucher`, { check_voucher_id: idToLink });
        } else {
          await api.post(`/revolving-funds/${currentLf.id}/link-voucher`, { check_voucher_id: idToLink });
        }
      }

      await loadFullData();
      if (onLinkSuccess) {
        onLinkSuccess(currentCv, currentLf);
      }
    } catch (err: any) {
      console.error('Failed to attach schedule to voucher:', err);
      alert(err.response?.data?.error?.message || 'Failed to attach schedule.');
    } finally {
      setLinkingAction(false);
    }
  };

  // Save Detailed Check Voucher Signatories
  const handleSaveDetailedSignatories = async () => {
    try {
      setIsSavingSignatories(true);
      const updatedSignatories = {
        ...(currentCv?.signatories || {}),
        liquidated_by: detailedLiquidatedBy.trim(),
        liquidated_by_title: detailedLiquidatedByTitle.trim(),
        detailed_approved_by: detailedApprovedBy.trim(),
        approved_by: detailedApprovedBy.trim(),
        detailed_approved_by_title: detailedApprovedByTitle.trim(),
        approved_by_title: detailedApprovedByTitle.trim()
      };

      if (currentCv?.id) {
        await api.put(`/accounts/check-vouchers/${currentCv.id}`, {
          signatories: updatedSignatories
        });
      }

      setCurrentCv((prev: any) => prev ? {
        ...prev,
        signatories: updatedSignatories
      } : prev);

      // Do NOT call onLinkSuccess here — that would trigger a full parent reload
      // (loadCheckVouchers) which changes the initialCv prop, re-runs loadFullData,
      // and resets cvViewMode back to 'summary'. The local setCurrentCv update above
      // is sufficient; the DB is already persisted.
      setIsEditingDetailedSignatories(false);
    } catch (err: any) {
      console.error('Failed to save signatories:', err);
      alert(err.response?.data?.error?.message || 'Failed to save signatories.');
    } finally {
      setIsSavingSignatories(false);
    }
  };

  // Perform physical browser print
  const triggerPrint = () => {
    setIsPrinting(true);

    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup);
      setIsPrinting(false);
    };
    window.addEventListener('afterprint', cleanup);

    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Compute category breakdown matching photo
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;

    let cvDetails: any[] = [];
    if (Array.isArray(currentCv?.details)) {
      cvDetails = currentCv.details;
    } else if (typeof currentCv?.details === 'string') {
      try {
        const parsed = JSON.parse(currentCv.details);
        if (Array.isArray(parsed)) cvDetails = parsed;
      } catch {
        cvDetails = [];
      }
    }

    const cvDebitItems = cvDetails.filter(it => {
      const val = typeof it.amount === 'number' ? it.amount : parseFloat(it.amount || it.debit || 0);
      const desc = it.book_of_account || it.description || '';
      const isCredit = it.is_credit === true || /^(cib\b|cash\s*in\s*bank)/i.test(desc) || val < 0;
      return !isCredit && val > 0;
    });

    if (cvDebitItems.length > 0) {
      for (const it of cvDebitItems) {
        const amt = typeof it.amount === 'number' ? it.amount : parseFloat(it.amount || it.debit || 0);
        const cat = resolveItemCategory(it, cvDetails, lfItems);
        map[cat] = (map[cat] || 0) + amt;
        total += amt;
      }
    } else {
      const activeLf = (lfItems || []).filter((it: any) => !it.is_cancelled);
      if (activeLf.length > 0) {
        for (const it of activeLf) {
          const amt = parseFloat(it.amount) || 0;
          if (amt > 0) {
            const cat = resolveItemCategory(it, [], activeLf);
            map[cat] = (map[cat] || 0) + amt;
            total += amt;
          }
        }
      }
    }

    const preferredOrder = checkIsHonorariumAndWages(currentCv)
      ? ['Honorarium', 'Allowances', 'Wages', 'Operation', 'CDF', 'Service', 'Merchandise', 'CETF']
      : ['Operation', 'CDF', 'Service', 'Merchandise', 'CETF'];
    const list = Object.entries(map).map(([name, amount]) => ({
      name,
      amount,
      percent: total > 0 ? ((amount / total) * 100).toFixed(1) : '0.0'
    }));
    list.sort((a, b) => {
      const idxA = preferredOrder.indexOf(a.name);
      const idxB = preferredOrder.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.amount - a.amount;
    });
    return { list, total };
  }, [lfItems, currentCv]);

  const detailedCvData = useMemo(() => getBalancedCvRows(currentCv, lfItems, resolvedType), [currentCv, lfItems, resolvedType]);

  const activeItems = useMemo(() => {
    const nonCibRows = (detailedCvData.rows || []).filter(r => !/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test((r.description || '').trim()) && Number(r.debit) > 0);
    if (nonCibRows.length > 0) {
      return nonCibRows;
    }
    return lfItems.filter(it => !it.is_cancelled);
  }, [detailedCvData.rows, lfItems]);

  const totalExpenseAmount = useMemo(() => {
    if (detailedCvData.debitTotal > 0) {
      return detailedCvData.debitTotal;
    }
    if (resolvedType === 'stl') {
      return Number(currentLf?.total_expense || categoryBreakdown.total || 0);
    }
    return Number(currentLf?.total_liquidated || categoryBreakdown.total || 0);
  }, [detailedCvData.debitTotal, currentLf, resolvedType, categoryBreakdown.total]);

  const authorizedAmount = useMemo(() => {
    return Number(currentCv?.fund_amount || currentCv?.authorized_amount || currentLf?.authorized_amount || 100000);
  }, [currentCv, currentLf]);

  const balanceNetDue = useMemo(() => {
    return authorizedAmount - totalExpenseAmount;
  }, [authorizedAmount, totalExpenseAmount]);

  const summaryCvData = useMemo(() => getSummaryCvRows(currentCv, resolvedType, categoryBreakdown, detailedCvData.rows), [currentCv, resolvedType, categoryBreakdown, detailedCvData.rows]);
  const activeCvDebitTotal = cvViewMode === 'summary' ? summaryCvData.debitTotal : detailedCvData.debitTotal;

  const cibName = useMemo(() => formatCibAccountName(currentCv?.bank || currentCv?.bank_name), [currentCv]);

  const cibDetailedAmount = useMemo(() => {
    // For Revolving Fund (non-STL):
    // CIB-MBTC is always the full replenishment check / disbursed amount (debitTotal)
    if (resolvedType !== 'stl') {
      if (detailedCvData.debitTotal > 0) {
        return detailedCvData.debitTotal;
      }
      if (currentCv?.amount && Number(currentCv.amount) > 0) {
        return Number(currentCv.amount);
      }
      if (totalExpenseAmount > 0) {
        return totalExpenseAmount;
      }
      return getCvDisbursedAmount(currentCv);
    }

    // For STL Replenishment:
    // 1. Check if currentCv.details explicitly defines a CIB row
    let rawDetails: any[] = [];
    if (Array.isArray(currentCv?.details)) {
      rawDetails = currentCv.details;
    } else if (typeof currentCv?.details === 'string') {
      try {
        const parsed = JSON.parse(currentCv.details);
        if (Array.isArray(parsed)) rawDetails = parsed;
      } catch {}
    }
    for (const d of rawDetails) {
      const desc = (d.book_of_account || d.description || '').toLowerCase();
      if (/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc.trim())) {
        const val = typeof d.amount === 'number' ? Math.abs(d.amount) : parseFloat(d.amount || d.credit || 0);
        if (val > 0) return val;
      }
    }

    // 2. Check if currentCv has explicit cib_amount
    if (currentCv?.cib_amount && parseFloat(currentCv.cib_amount) > 0) {
      return parseFloat(currentCv.cib_amount);
    }

    // 3. Fallback: calculate difference between debitTotal and creditTotal
    if (detailedCvData.debitTotal > 0) {
      return Math.max(0, detailedCvData.debitTotal - detailedCvData.creditTotal);
    }
    return 0;
  }, [resolvedType, currentCv, detailedCvData, totalExpenseAmount]);

  // Overall credit amount:
  // In detailed mode: overall credit is the sum of expense deductions + CIB amount (= debitTotal)
  // In summary mode: overall credit is summaryCvData.creditTotal (= debitTotal)
  const overallCreditAmount = useMemo(() => {
    if (cvViewMode === 'detailed') {
      if (resolvedType !== 'stl') {
        if (detailedCvData.debitTotal > 0) return detailedCvData.debitTotal;
      }
      const totalCredit = detailedCvData.creditTotal + cibDetailedAmount;
      if (totalCredit > 0) return totalCredit;
      if (detailedCvData.debitTotal > 0) return detailedCvData.debitTotal;
    } else {
      if (summaryCvData.creditTotal > 0) return summaryCvData.creditTotal;
      if (summaryCvData.debitTotal > 0) return summaryCvData.debitTotal;
    }
    if (currentCv?.amount && Number(currentCv.amount) > 0) return Number(currentCv.amount);
    if (totalExpenseAmount > 0) return totalExpenseAmount;
    return getCvDisbursedAmount(currentCv);
  }, [cvViewMode, resolvedType, detailedCvData, cibDetailedAmount, summaryCvData, currentCv, totalExpenseAmount]);

  const displayedTotalExpense = useMemo(() => {
    if (resolvedType === 'stl') {
      if (cibDetailedAmount > 0) return cibDetailedAmount;
      if (currentCv?.cib_amount && parseFloat(currentCv.cib_amount) > 0) return parseFloat(currentCv.cib_amount);
      if (currentCv?.amount && Number(currentCv.amount) > 0) return Number(currentCv.amount);
    }
    return overallCreditAmount;
  }, [resolvedType, cibDetailedAmount, currentCv, overallCreditAmount]);

  const displayedDisbursedAmount = useMemo(() => {
    if (resolvedType === 'stl') {
      if (cibDetailedAmount > 0) return cibDetailedAmount;
      if (currentCv?.cib_amount && parseFloat(currentCv.cib_amount) > 0) return parseFloat(currentCv.cib_amount);
      if (currentCv?.amount && Number(currentCv.amount) > 0) return Number(currentCv.amount);
    }
    return overallCreditAmount;
  }, [resolvedType, cibDetailedAmount, currentCv, overallCreditAmount]);

  const displayedFundBalance = useMemo(() => {
    return authorizedAmount - displayedTotalExpense;
  }, [authorizedAmount, displayedTotalExpense]);

  const isRevolvingFund = useMemo(() => {
    if (resolvedType === 'stl') return false;
    if (resolvedType === 'rf') return true;
    const folder = (currentCv?.folder_name || '').toLowerCase();
    const part = (currentCv?.particulars || '').toLowerCase();
    return folder.includes('revolving') || part.includes('revolving') || Boolean(currentCv?.revolving_fund);
  }, [resolvedType, currentCv]);

  const isStlFund = useMemo(() => {
    if (resolvedType === 'stl') return true;
    const folder = String(currentCv?.folder_name || currentLf?.folder_name || '').toLowerCase();
    const part = String(currentCv?.particulars || currentCv?.description || currentLf?.particulars || '').toLowerCase();
    const tt = String(currentCv?.transaction_type || '').toLowerCase();
    const rfClass = String(currentCv?.rf_classification || currentCv?.revolving_fund_classification || '').toLowerCase();
    return folder.includes('stl') || part.includes('stl') || tt.includes('stl') || rfClass.includes('stl');
  }, [resolvedType, currentCv, currentLf]);

  const isHonorariumAndWages = useMemo(() => {
    // 1. Check direct classification properties
    const rfClass = String(
      currentCv?.rf_classification ||
      currentCv?.revolving_fund_classification ||
      currentLf?.rf_classification ||
      ''
    ).toLowerCase();
    if (rfClass.includes('honorarium') || rfClass.includes('wages')) return true;

    // 2. Check folder name
    const folder = String(currentCv?.folder_name || currentLf?.folder_name || '').toLowerCase();
    if (folder.includes('honorarium') || folder.includes('wages')) return true;

    // 3. Check particulars and description
    const particulars = String(currentCv?.particulars || currentCv?.description || currentLf?.particulars || '').toLowerCase();
    if (particulars.includes('honorarium') || particulars.includes('wages')) return true;

    // 4. Check details / rows
    let detailsText = '';
    const details = currentCv?.details;
    if (Array.isArray(details)) {
      detailsText = details.map((d: any) => `${d.book_of_account || ''} ${d.description || ''} ${d.particulars || ''} ${d.remarks || ''}`).join(' ');
    } else if (typeof details === 'string') {
      detailsText = details;
    }
    if (detailsText.toLowerCase().includes('honorarium') || detailsText.toLowerCase().includes('wages')) return true;

    // 5. Check rows in summaryCvData and detailedCvData
    if (summaryCvData.rows.some(r => (r.description || '').toLowerCase().includes('honorarium') || (r.description || '').toLowerCase().includes('wages'))) {
      return true;
    }
    if (detailedCvData.rows.some(r => (r.description || '').toLowerCase().includes('honorarium') || (r.remarks || '').toLowerCase().includes('honorarium'))) {
      return true;
    }

    // 6. Fund amount: 56100 is specifically defined for Revolving Fund - Honorarium & Wages
    const fa = Number(currentCv?.fund_amount || currentLf?.fund_amount || currentLf?.authorized_amount);
    if (fa === 56100) return true;

    return false;
  }, [currentCv, currentLf, summaryCvData.rows, detailedCvData.rows]);

  const rfDetailedCategoryBreakdown = useMemo(() => {
    if (!isRevolvingFund) return [];

    const preferredOrder = isHonorariumAndWages
      ? ['Honorarium', 'Allowances', 'Wages', 'Service', 'Merchandise', 'Operation', 'CETF', 'CDF']
      : ['Service', 'Merchandise', 'Operation', 'CETF', 'CDF'];
    const catMap: Record<string, number> = {};

    const nonCibRows = (detailedCvData.rows || []).filter(r => !/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test((r.description || '').trim()));
    const hasDebitRows = nonCibRows.some(r => Number(r.debit) > 0);

    // 1. Primary source: detailed CV rows if debit items exist (reflects immediate user edits)
    if (hasDebitRows) {
      for (const r of nonCibRows) {
        const amt = Number(r.debit) || 0;
        if (amt > 0) {
          const cat = (r as any).category || resolveItemCategory(r, detailedCvData.rows, lfItems);
          catMap[cat] = (catMap[cat] || 0) + amt;
        }
      }
    } else {
      // 2. Secondary source: active LF liquidation schedule items if unedited CV details
      const activeLf = (lfItems || []).filter((it: any) => !it.is_cancelled);
      if (activeLf.length > 0) {
        for (const it of activeLf) {
          const amt = parseFloat(it.amount) || 0;
          if (amt > 0) {
            const cat = resolveItemCategory(it, [], activeLf);
            catMap[cat] = (catMap[cat] || 0) + amt;
          }
        }
      } else if (categoryBreakdown.list.length > 0) {
        for (const item of categoryBreakdown.list) {
          if (item.amount > 0) {
            const cat = cleanCategoryName(item.name);
            catMap[cat] = (catMap[cat] || 0) + item.amount;
          }
        }
      }
    }

    const categories = Object.keys(catMap).filter(k => catMap[k] > 0);
    if (categories.length === 0) return [];

    categories.sort((a, b) => {
      const idxA = preferredOrder.indexOf(a);
      const idxB = preferredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return catMap[b] - catMap[a];
    });

    return categories.map(name => ({
      name,
      amount: catMap[name],
      formatted: formatCurrency(catMap[name])
    }));
  }, [isRevolvingFund, isHonorariumAndWages, detailedCvData.rows, lfItems, categoryBreakdown.list]);

  // On-screen filtered rows based on user breakdown pill click (does NOT affect printing)
  const displayedDetailedRows = useMemo(() => {
    if (!selectedCategoryFilter) {
      return detailedCvData.rows;
    }
    const filterCat = selectedCategoryFilter.trim().toLowerCase();
    return detailedCvData.rows.filter(r => {
      const rowCat = ((r as any).category || '').trim().toLowerCase();
      if (rowCat === filterCat) return true;

      const descCat = cleanCategoryName(r.description || '').toLowerCase();
      if (descCat === filterCat) return true;

      const desc = (r.description || '').toLowerCase();
      if (filterCat === 'honorarium' && desc.includes('honorarium')) return true;
      if (filterCat === 'allowances' && desc.includes('allowance')) return true;
      if (filterCat === 'wages' && desc.includes('wage')) return true;

      return false;
    });
  }, [detailedCvData.rows, selectedCategoryFilter]);

  const filteredTotals = useMemo(() => {
    if (!selectedCategoryFilter) {
      return {
        debitTotal: detailedCvData.debitTotal,
        creditTotal: detailedCvData.creditTotal,
        count: detailedCvData.rows.length
      };
    }
    let dTot = 0;
    let cTot = 0;
    for (const r of displayedDetailedRows) {
      if (r.debit !== null && r.debit !== undefined) dTot += Number(r.debit) || 0;
      if (r.credit !== null && r.credit !== undefined) cTot += Number(r.credit) || 0;
    }
    return {
      debitTotal: dTot,
      creditTotal: cTot,
      count: displayedDetailedRows.length
    };
  }, [selectedCategoryFilter, displayedDetailedRows, detailedCvData]);

  if (!isOpen || !mounted) return null;

  const hasAttachedSchedule = Boolean(currentLf && lfItems.length > 0);

  return (
    <>
      {/* 1. ON-SCREEN PREVIEW MODAL PORTALED TO BODY WITH HIGHEST Z-INDEX */}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-modal-backdrop">
        <div className="relative w-full max-w-4xl bg-surface dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/40 bg-surface-container-lowest dark:bg-surface-container">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-on-surface">
                    Check Voucher {currentCv?.voucher_no ? `• CV #${cleanCvNumber(currentCv.voucher_no)}` : ''}
                  </h3>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    {resolvedType === 'stl' ? 'STL Replenishment' : 'Revolving Fund'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Official Check Voucher with integrated itemized expense schedule, category breakdown, and summary cards
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
              title="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-500">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-xs font-semibold">Loading Check Voucher and itemized schedule details...</p>
              </div>
            ) : (
              <>


                {/* View Mode Indicator / Switcher */}
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCvViewMode('summary')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        cvViewMode === 'summary'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Summary Voucher</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCvViewMode('detailed')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        cvViewMode === 'detailed'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Detailed Transaction</span>
                    </button>

                    {onEdit && (currentCv || initialCv) && (
                      <button
                        type="button"
                        onClick={() => {
                          const activeCv = currentCv || initialCv;
                          const rowsToPass = detailedCvData.rows && detailedCvData.rows.length > 0 ? detailedCvData.rows : summaryCvData.rows;
                          onEdit(activeCv, cvViewMode, rowsToPass);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all active:scale-95 cursor-pointer ml-1"
                        title="Edit Voucher details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Voucher</span>
                      </button>
                    )}
                  </div>

                  <span className="text-[11px] text-neutral-500 font-medium hidden sm:inline-block">
                    {cvViewMode === 'detailed'
                      ? 'Displaying detailed itemized voucher format'
                      : 'Displaying summary voucher format'}
                  </span>
                </div>

                {/* Document Preview Canvas */}
                <div className="bg-neutral-100 dark:bg-neutral-950/80 p-4 sm:p-6 rounded-2xl border border-outline-variant/40 max-h-[560px] overflow-y-auto">
                  <div className="bg-white text-black p-6 sm:p-8 rounded-xl shadow-md border border-neutral-300 font-sans space-y-4">
                    
                    {/* Header: Official UC-METC MPC Check Voucher Header */}
                    <div className="flex items-center justify-between pb-3 border-b-2 border-emerald-950">
                      <div className="flex items-center gap-3">
                        <img src="/Coop.jpeg" alt="Logo" className="w-12 h-12 rounded-full object-cover shrink-0" />
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950 leading-tight">
                            UNIVERSITY OF CEBU - METC MULTIPURPOSE COOPERATIVE (UC-METC MPC)
                          </h3>
                          <p className="text-[9px] text-neutral-600 leading-tight mt-0.5">
                            UC-METC Campus, Alumnos, Mambaling, Cebu City • Tel: (032) 410-8811 local 5155
                          </p>
                          <p className="text-[8.5px] text-neutral-500 leading-tight">
                            Email: ucmetcmpc@gmail.com • CDA Reg. No. 9520-1070000000029729
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <h2 className="text-base font-black uppercase tracking-wider text-neutral-900">
                          CHECK VOUCHER
                        </h2>
                        <div className="text-sm font-mono font-bold text-emerald-800">
                          CV #{cleanCvNumber(currentCv?.voucher_no)}
                        </div>
                      </div>
                    </div>

                    {/* Voucher Info Grid */}
                    <div className="grid grid-cols-[1fr_1.8fr_1.5fr_1fr_1fr] gap-3 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200 text-xs items-center">
                      <div>
                        <span className="text-[9px] font-bold text-emerald-800 uppercase block tracking-wider">Voucher Date</span>
                        <strong className="text-neutral-900 font-medium text-[11.5px] whitespace-nowrap">
                          {currentCv?.voucher_date ? new Date(currentCv.voucher_date).toLocaleDateString() : '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-emerald-800 uppercase block tracking-wider">Transaction Type</span>
                        <strong className="text-neutral-900 font-medium text-[11.5px] whitespace-nowrap">
                          {resolvedType === 'stl' ? 'STL Replenishment' : 'Revolving Fund Replenishment'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-emerald-800 uppercase block tracking-wider">Payee</span>
                        <strong className="text-neutral-900 font-medium text-[11.5px] whitespace-nowrap">
                          {formatPayeeName(currentCv?.payee || currentLf?.custodian_name || 'Michelle Pable')}
                        </strong>
                      </div>
                      <div className="text-right pr-2">
                        <span className="text-[9px] font-bold text-emerald-800 uppercase block tracking-wider">Bank</span>
                        <strong className="text-neutral-900 font-medium text-[11.5px] whitespace-nowrap">
                          {currentCv?.bank_name || currentCv?.bank || '—'}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-emerald-800 uppercase block tracking-wider">Check No.</span>
                        <strong className="text-emerald-950 font-mono font-bold text-[12px] whitespace-nowrap">
                          {currentCv?.check_no || 'PENDING'}
                        </strong>
                      </div>
                    </div>

                    {/* Particulars / Breakdown */}
                    {isRevolvingFund && cvViewMode === 'detailed' && rfDetailedCategoryBreakdown.length > 0 ? (
                      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 p-2.5 rounded-xl border border-emerald-200/90 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#064e3b] text-white font-extrabold text-[9.5px] uppercase tracking-wider shadow-2xs">
                              Breakdown
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedCategoryFilter(null)}
                              className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                !selectedCategoryFilter
                                  ? 'bg-[#064e3b] text-white border-[#064e3b] shadow-2xs ring-2 ring-emerald-500/30'
                                  : 'bg-white/95 text-neutral-600 hover:bg-emerald-50 hover:text-emerald-900 border-emerald-200'
                              }`}
                              title="Show all transactions across all categories"
                            >
                              All
                            </button>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {rfDetailedCategoryBreakdown.map((cat) => {
                                const isSelected = selectedCategoryFilter === cat.name;
                                return (
                                  <button
                                    key={cat.name}
                                    type="button"
                                    onClick={() => setSelectedCategoryFilter(prev => prev === cat.name ? null : cat.name)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer select-none active:scale-95 ${
                                      isSelected
                                        ? 'bg-[#065f46] text-white border-[#047857] shadow-xs ring-2 ring-emerald-400 font-bold scale-[1.02]'
                                        : 'bg-white/95 hover:bg-emerald-100/70 border-emerald-200 hover:border-emerald-300 shadow-2xs text-neutral-800'
                                    }`}
                                    title={`Click to filter transaction details by ${cat.name}`}
                                  >
                                    <span className={`font-bold text-[11px] ${isSelected ? 'text-emerald-100' : 'text-[#065f46]'}`}>
                                      {cat.name}:
                                    </span>
                                    <span className={`font-mono font-bold text-[11.5px] ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                                      {cat.formatted}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {selectedCategoryFilter && (
                            <span className="text-[10px] text-emerald-800 italic font-medium bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200">
                              Click category again or &apos;All&apos; to view full schedule
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (isStlFund && cvViewMode === 'detailed') ? null : (
                      <div className="text-xs bg-neutral-50 p-2.5 rounded border border-neutral-200">
                        <strong className="text-neutral-700 uppercase text-[10px] tracking-wide">Description:</strong>{' '}
                        <span className="italic text-neutral-800 font-medium">
                          {currentCv?.particulars || (resolvedType === 'stl' ? 'STL Replenishment Disbursement' : 'Revolving Fund Replenishment')}
                        </span>
                      </div>
                    )}

                    {/* TRANSACTION DETAILS */}
                    {cvViewMode === 'summary' ? (
                      <div className="space-y-3">
                        <div className="border border-emerald-300 rounded-2xl overflow-hidden text-[10px] shadow-2xs">
                          <div className="bg-[#064e3b] text-white px-4 py-2 text-center">
                            <span className="font-extrabold uppercase text-[10px] tracking-wider text-white">
                              TRANSACTION DETAILS
                            </span>
                          </div>
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-[#ecfdf5] text-[#064e3b] font-extrabold uppercase text-[9px] border-b border-emerald-200">
                              <tr>
                                <th className="p-2.5 w-12 text-center border-r border-emerald-200">#</th>
                                <th className="p-2.5 border-r border-emerald-200">BOOK OF ACCOUNTS</th>
                                <th className="p-2.5 w-36 text-right border-r border-emerald-200">DEBIT (₱)</th>
                                <th className="p-2.5 w-36 text-right">CREDIT (₱)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {summaryCvData.rows.map((r, i) => (
                                <tr key={i} className="border-b border-neutral-200 hover:bg-emerald-50/30">
                                  <td className="p-2.5 text-center font-mono font-medium text-neutral-600 border-r border-neutral-200">
                                    {i + 1}
                                  </td>
                                  <td className="p-2.5 border-r border-neutral-200 font-bold text-neutral-900">
                                    {r.description}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-neutral-900 border-r border-neutral-200">
                                    {r.debit !== null ? r.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : <span className="text-neutral-400 font-bold">–</span>}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                                    {r.credit !== null ? r.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : <span className="text-rose-500 font-bold">–</span>}
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-[#ecfdf5] font-bold border-t border-emerald-300 text-[10px]">
                                <td colSpan={2} className="p-2.5 text-right uppercase tracking-wider text-neutral-900 font-extrabold">TOTAL:</td>
                                <td className="p-2.5 text-right font-mono font-extrabold text-neutral-900 border-r border-neutral-200">
                                  ₱{summaryCvData.debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-2.5 text-right font-mono font-extrabold text-rose-600">
                                  ₱{summaryCvData.creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold uppercase text-[10px] tracking-wider text-[#064e3b]">
                              TRANSACTION DETAILS
                            </span>
                            {selectedCategoryFilter && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-bold">
                                <span>Filtered: <strong className="font-extrabold text-emerald-900">{selectedCategoryFilter}</strong> ({formatCurrency(filteredTotals.debitTotal)} • {filteredTotals.count} line{filteredTotals.count === 1 ? '' : 's'})</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedCategoryFilter(null)}
                                  className="ml-1 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/80 rounded px-1 text-[9px] font-black cursor-pointer"
                                  title="Clear category filter"
                                >
                                  ✕ Clear
                                </button>
                              </span>
                            )}
                          </div>
                          {selectedCategoryFilter ? (
                            <button
                              type="button"
                              onClick={() => setSelectedCategoryFilter(null)}
                              className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                            >
                              Show All Transactions ({formatCurrency(detailedCvData.debitTotal)})
                            </button>
                          ) : (
                            <span className="text-[10px] text-neutral-400 font-medium hidden sm:inline-block">
                              Tip: Click any breakdown pill above to inspect its transactions
                            </span>
                          )}
                        </div>
                        <div className="border border-emerald-300 rounded-2xl overflow-hidden text-[10px] shadow-2xs">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] border-b border-emerald-800">
                              <tr>
                                <th className="p-2.5 w-28 text-left border-r border-emerald-700/60 text-white whitespace-nowrap">DATE</th>
                                <th className="p-2.5 w-28 text-left border-r border-emerald-700/60 text-white whitespace-nowrap">{isHonorariumAndWages ? 'Cash Release Form No.' : (resolvedType === 'stl' ? 'LAF No.' : 'RF VOUCHER #')}</th>
                                <th className="p-2.5 w-1/3 text-left border-r border-emerald-700/60 text-white">BOOK OF ACCOUNTS</th>
                                <th className="p-2.5 w-1/3 text-left border-r border-emerald-700/60 text-white">{isHonorariumAndWages ? 'RECIPIENT' : 'REMARKS'}</th>
                                <th className="p-2.5 w-32 text-right border-r border-emerald-700/60 text-white whitespace-nowrap">DEBIT (₱)</th>
                                <th className="p-2.5 w-32 text-right text-white whitespace-nowrap">CREDIT (₱)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayedDetailedRows.length > 0 ? (
                                displayedDetailedRows.map((r, i) => (
                                  <tr key={i} className="border-b border-neutral-200 hover:bg-emerald-50/30">
                                    <td
                                      className="p-2.5 font-mono text-[9.5px] text-neutral-600 border-r border-neutral-200 whitespace-nowrap cursor-pointer hover:bg-emerald-100/70 hover:text-emerald-900 transition-colors"
                                      title="Click to edit date"
                                      onClick={() => {
                                        if (onEdit && (currentCv || initialCv)) {
                                          const activeCv = currentCv || initialCv;
                                          const rowsToPass = detailedCvData.rows && detailedCvData.rows.length > 0 ? detailedCvData.rows : summaryCvData.rows;
                                          onEdit(activeCv, cvViewMode, rowsToPass);
                                        }
                                      }}
                                    >
                                      {r.date}
                                    </td>
                                    <td className="p-2.5 font-mono text-[10px] font-bold text-neutral-800 border-r border-neutral-200">
                                      {r.voucher_no}
                                    </td>
                                    <td className={`p-2.5 border-r border-neutral-200 ${r.credit !== null ? 'pl-6 italic text-neutral-700 font-medium' : 'font-bold text-neutral-900'}`}>
                                      {r.description}
                                    </td>
                                    <td className="p-2.5 border-r border-neutral-200 text-[9.5px] text-neutral-600 italic">
                                      {r.remarks || <span className="text-neutral-300">—</span>}
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-bold text-neutral-900 border-r border-neutral-200">
                                      {r.debit !== null ? `₱${r.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : <span className="text-neutral-400 font-bold">–</span>}
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-bold text-neutral-900">
                                      {r.credit !== null ? `₱${r.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : <span className="text-neutral-400 font-bold">–</span>}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-neutral-500 font-medium">
                                    <p className="text-xs font-semibold text-neutral-700">No transactions found for category &ldquo;{selectedCategoryFilter}&rdquo;.</p>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCategoryFilter(null)}
                                      className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                                    >
                                      Show all transactions
                                    </button>
                                  </td>
                                </tr>
                              )}
                              {/* 3-ROW FOOTER MATCHING DETAILED CV SPEC FOR STL ONLY; 2-ROW FOOTER FOR REVOLVING */}
                              {resolvedType === 'stl' ? (
                                <>
                                  <tr className="bg-[#ecfdf5] font-bold border-t border-emerald-300 text-[10px]">
                                    <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-[#064e3b] font-extrabold">TOTAL:</td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-[#064e3b] border-r border-neutral-200">
                                      <span className="text-neutral-400 font-bold">–</span>
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-[#064e3b]">
                                      {detailedCvData.creditTotal > 0 ? `₱${detailedCvData.creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : <span className="text-neutral-400 font-bold">–</span>}
                                    </td>
                                  </tr>
                                  <tr className="bg-[#ecfdf5] font-bold border-t border-emerald-200 text-[10px]">
                                    <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-[#064e3b] font-extrabold">{cibName}:</td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-[#064e3b] border-r border-neutral-200">
                                      <span className="text-neutral-400 font-bold">–</span>
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-[#064e3b]">
                                      ₱{cibDetailedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                  <tr className="bg-[#ecfdf5] font-bold border-t-2 border-emerald-400 text-[10px]">
                                    <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-[#064e3b] font-extrabold">Overall:</td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-[#064e3b] border-r border-neutral-200">
                                      ₱{detailedCvData.debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-[#064e3b]">
                                      ₱{(detailedCvData.creditTotal + cibDetailedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                </>
                              ) : (
                                <>
                                  <tr className="bg-[#ecfdf5] font-bold border-t border-emerald-300 text-[10px]">
                                    <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-[#064e3b] font-extrabold">
                                      {selectedCategoryFilter ? `TOTAL (${selectedCategoryFilter.toUpperCase()}):` : 'TOTAL:'}
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-[#064e3b] border-r border-neutral-200">
                                      ₱{(selectedCategoryFilter ? filteredTotals.debitTotal : detailedCvData.debitTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-[#064e3b]">
                                      {selectedCategoryFilter && filteredTotals.creditTotal > 0 ? (
                                        `₱${filteredTotals.creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                      ) : (
                                        <span className="text-neutral-400 font-bold">–</span>
                                      )}
                                    </td>
                                  </tr>
                                  <tr className="bg-[#ecfdf5] font-bold border-t border-emerald-200 text-[10px]">
                                    <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-[#064e3b] font-extrabold">
                                      {selectedCategoryFilter ? `${cibName} (${selectedCategoryFilter.toUpperCase()}):` : `${cibName}:`}
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-[#064e3b] border-r border-neutral-200">
                                      <span className="text-neutral-400 font-bold">–</span>
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-extrabold text-[#064e3b]">
                                      ₱{(selectedCategoryFilter ? filteredTotals.debitTotal : cibDetailedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                </>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Disbursed Amount Banner */}
                    <div className="flex items-center justify-between p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs">
                      <div>
                        <span className="text-[8.5px] uppercase font-bold text-emerald-800 block">Disbursed Amount</span>
                        <span className="font-bold text-neutral-900 uppercase text-[10px]">
                          {formatDisbursedInWords(displayedDisbursedAmount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-extrabold text-sm text-emerald-900">
                          ₱{displayedDisbursedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* 3 Summary Cards */}
                    {!(cvViewMode === 'summary' && isHonorariumAndWages) && (
                      <div className="grid grid-cols-3 gap-2.5 text-xs">
                        <div className="p-2.5 border border-neutral-200 rounded-lg bg-white">
                          <span className="text-[8px] font-bold uppercase text-neutral-400 block tracking-wider">FUND AMOUNT</span>
                          <div className="text-[13px] font-extrabold font-mono text-neutral-900 mt-0.5">
                            ₱{authorizedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="p-2.5 border border-neutral-200 rounded-lg bg-white">
                          <span className="text-[8px] font-bold uppercase text-neutral-400 block tracking-wider">
                            TOTAL EXPENSE ({activeItems.length > 0 ? activeItems.length : (cvViewMode === 'summary' ? summaryCvData.rows.filter(r => r.debit !== null).length : detailedCvData.rows.filter(r => r.debit !== null).length)} ITEMS)
                          </span>
                          <div className="text-[13px] font-extrabold font-mono text-neutral-900 mt-0.5">
                            ₱{displayedTotalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className={`p-2.5 border-2 rounded-lg ${
                          displayedFundBalance < 0
                            ? 'border-rose-500 bg-rose-50/70'
                            : 'border-emerald-500 bg-emerald-50/70'
                        }`}>
                          <span className={`text-[8px] font-bold uppercase block tracking-wider ${
                            displayedFundBalance < 0
                              ? 'text-rose-800'
                              : 'text-emerald-800'
                          }`}>FUND BALANCE</span>
                          <div className={`text-[13px] font-extrabold font-mono mt-0.5 ${
                            displayedFundBalance < 0
                              ? 'text-rose-700'
                              : 'text-emerald-900'
                          }`}>
                            ₱{displayedFundBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Official Signatories */}
                    {cvViewMode === 'summary' ? (
                      <div className="pt-4 border-t border-neutral-200">
                        <div className="grid grid-cols-3 gap-x-8 gap-y-4 text-left">
                          {/* Row 1 */}
                          <div>
                            <span className="font-bold uppercase text-[9.5px] text-neutral-500 tracking-wider block">
                              PREPARED BY:
                            </span>
                            <div className="pt-2.5 pb-1">
                              <p className="font-bold text-neutral-900 uppercase text-[11px] tracking-wide">
                                {currentCv?.signatories?.prepared_by || currentLf?.prepared_by || 'CHINNETTE A. LAMOSTE'}
                              </p>
                            </div>
                            <div className="border-b border-neutral-300"></div>
                          </div>

                          <div>
                            <span className="font-bold uppercase text-[9.5px] text-neutral-500 tracking-wider block">
                              CHECKED BY:
                            </span>
                            <div className="pt-2.5 pb-1">
                              <p className="font-bold text-neutral-900 uppercase text-[11px] tracking-wide">
                                {currentCv?.signatories?.checked_by || currentLf?.checked_by || 'MARILOU LARIOSA'}
                              </p>
                            </div>
                            <div className="border-b border-neutral-300"></div>
                          </div>

                          <div>
                            <span className="font-bold uppercase text-[9.5px] text-neutral-500 tracking-wider block">
                              APPROVED BY:
                            </span>
                            <div className="pt-2.5 pb-1">
                              <p className="font-bold text-neutral-900 uppercase text-[11px] tracking-wide">
                                {currentCv?.signatories?.approved_by || currentLf?.approved_by || 'MICHELLE M. PABLE'}
                              </p>
                            </div>
                            <div className="border-b border-neutral-300"></div>
                          </div>

                          {/* Row 2: Received By, Date */}
                          <div>
                            <span className="font-bold uppercase text-[9.5px] text-neutral-500 tracking-wider block">
                              RECEIVED BY:
                            </span>
                            <div className="pt-2.5 pb-1">
                              <p className="font-bold text-neutral-900 uppercase text-[11px] tracking-wide min-h-[16px]">
                                &nbsp;
                              </p>
                            </div>
                            <div className="border-b border-neutral-300"></div>
                            <span className="text-[8.5px] text-neutral-500 block mt-1">
                              Signature over Printed Name
                            </span>
                          </div>

                          <div>
                            <span className="font-bold uppercase text-[9.5px] text-neutral-500 tracking-wider block">
                              DATE:
                            </span>
                            <div className="pt-2.5 pb-1">
                              <p className="font-bold text-neutral-900 uppercase text-[11px] tracking-wide min-h-[16px]">
                                &nbsp;
                              </p>
                            </div>
                            <div className="border-b border-neutral-300"></div>
                          </div>

                          <div>{/* Blank spacer column */}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-neutral-200 text-[9px] text-neutral-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold uppercase text-[7.5px] text-neutral-400 tracking-wider">
                            Official Signatures
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingDetailedSignatories(prev => !prev)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer"
                            title="Edit signatories for this voucher"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{isEditingDetailedSignatories ? 'Close Edit' : 'Edit Signatories'}</span>
                          </button>
                        </div>

                        {/* Interactive Signatories Edit Box */}
                        {isEditingDetailedSignatories && (
                          <div className="p-3 mb-3 rounded-xl bg-neutral-50 border border-neutral-300 space-y-3 shadow-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Liquidated By */}
                              <div className="space-y-1.5">
                                <div>
                                  <label className="text-[8px] font-bold uppercase text-neutral-600 block mb-0.5">
                                    Liquidated By (Name):
                                  </label>
                                  <input
                                    type="text"
                                    value={detailedLiquidatedBy}
                                    onChange={e => setDetailedLiquidatedBy(e.target.value)}
                                    placeholder="Full Name (e.g. MICHELLE M. PABLE)"
                                    className="w-full px-2 py-1 text-[11px] font-bold uppercase rounded border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-bold uppercase text-neutral-600 block mb-0.5">
                                    Position / Title:
                                  </label>
                                  <input
                                    type="text"
                                    value={detailedLiquidatedByTitle}
                                    onChange={e => setDetailedLiquidatedByTitle(e.target.value)}
                                    placeholder="Position (e.g. Manager)"
                                    className="w-full px-2 py-1 text-[10px] font-semibold rounded border border-neutral-300 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs"
                                  />
                                </div>
                              </div>

                              {/* Approved By */}
                              <div className="space-y-1.5">
                                <div>
                                  <label className="text-[8px] font-bold uppercase text-neutral-600 block mb-0.5">
                                    Approved By (Name):
                                  </label>
                                  <input
                                    type="text"
                                    value={detailedApprovedBy}
                                    onChange={e => setDetailedApprovedBy(e.target.value)}
                                    placeholder="Full Name (e.g. CANDILARIO N. TATOY)"
                                    className="w-full px-2 py-1 text-[11px] font-bold uppercase rounded border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] font-bold uppercase text-neutral-600 block mb-0.5">
                                    Position / Title:
                                  </label>
                                  <input
                                    type="text"
                                    value={detailedApprovedByTitle}
                                    onChange={e => setDetailedApprovedByTitle(e.target.value)}
                                    placeholder="Position (e.g. Chairman)"
                                    className="w-full px-2 py-1 text-[10px] font-semibold rounded border border-neutral-300 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-200">
                              <button
                                type="button"
                                onClick={() => setIsEditingDetailedSignatories(false)}
                                className="px-2.5 py-0.5 text-[9px] font-semibold rounded border border-neutral-300 hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveDetailedSignatories}
                                disabled={isSavingSignatories}
                                className="px-3 py-0.5 text-[9px] font-bold rounded bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              >
                                {isSavingSignatories ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                <span>Save Signatories</span>
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-8">
                          <div>
                            <span className="font-bold uppercase text-[7.5px] text-neutral-500 block">LIQUIDATED BY:</span>
                            <div className="h-4"></div>
                            <p className="font-bold text-neutral-900 uppercase text-[9.5px] m-0">
                              {detailedLiquidatedBy || 'MICHELLE M. PABLE'}
                            </p>
                            <div className="border-b border-neutral-800 mt-0.5" style={{ width: '180px' }}></div>
                            <span className="text-[7.5px] text-neutral-500 block mt-0.5 min-h-[11px]">{liquidatedByTitle || ''}</span>
                          </div>

                          <div>
                            <span className="font-bold uppercase text-[7.5px] text-neutral-500 block">APPROVED BY:</span>
                            <div className="h-4"></div>
                            <p className="font-bold text-neutral-900 uppercase text-[9.5px] m-0">
                              {detailedApprovedBy || 'CANDILARIO N. TATOY'}
                            </p>
                            <div className="border-b border-neutral-800 mt-0.5" style={{ width: '180px' }}></div>
                            <span className="text-[7.5px] text-neutral-500 block mt-0.5 min-h-[11px]">{approvedByTitle || ''}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-200 text-[8px] text-neutral-400">
                      <span>Generated via UC-METC MPC Portal • Check Voucher System • KADT Solutions</span>
                      <span>Printed on {new Date().toLocaleString()}</span>
                    </div>

                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/40 bg-surface-container-lowest dark:bg-surface-container">
            <div className="flex items-center gap-2.5 flex-wrap justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
              >
                Close
              </button>

              {/* Print Check Voucher (Primary) */}
              <button
                type="button"
                onClick={() => triggerPrint()}
                className="px-5 py-2 text-xs font-extrabold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                title="Print Official Check Voucher"
              >
                <Printer className="w-4 h-4" />
                <span>Print Check Voucher</span>
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}

      {/* 2. DEDICATED PRINT-ONLY PORTAL */}
      {isPrinting && typeof document !== 'undefined' && createPortal(
        <div
          id="unified-cv-lf-print-section"
          className="hidden print:block text-black bg-white font-sans"
          style={{ fontFamily: 'sans-serif', color: '#000000', backgroundColor: '#ffffff', boxSizing: 'border-box', width: '100%' }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: portrait;
                margin: 6mm 10mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              body > *:not(#unified-cv-lf-print-section) {
                display: none !important;
              }
              #unified-cv-lf-print-section {
                display: block !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
              }
              .no-print-split {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              table {
                page-break-inside: auto !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              thead {
                display: table-header-group !important;
              }
            }
          `}} />

          <div className="w-full mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '8px', boxSizing: 'border-box', padding: '10px 14px' }}>
            
            {/* Header: Official UC-METC MPC Check Voucher Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #064e3b', paddingBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/Coop.jpeg" alt="Logo" style={{ height: '42px', width: '42px', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                <div>
                  <h2 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.02em', color: '#064e3b', margin: 0, lineHeight: 1.2 }}>
                    UNIVERSITY OF CEBU - METC MULTIPURPOSE COOPERATIVE (UC-METC MPC)
                  </h2>
                  <p style={{ fontSize: '8px', color: '#4b5563', margin: '1px 0 0 0', lineHeight: 1.2 }}>
                    UC-METC Campus, Alumnos, Mambaling, Cebu City • Tel: (032) 410-8811 local 5155
                  </p>
                  <p style={{ fontSize: '7.5px', color: '#6b7280', margin: '1px 0 0 0', lineHeight: 1.2 }}>
                    Email: ucmetcmpc@gmail.com • CDA Reg. No. 9520-1070000000029729
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h1 style={{ fontSize: '14px', fontWeight: '900', color: '#111827', textTransform: 'uppercase', margin: 0, letterSpacing: '0.03em' }}>
                  CHECK VOUCHER
                </h1>
                <p style={{ fontSize: '15px', fontFamily: 'monospace', color: '#064e3b', fontWeight: '800', margin: '1px 0 0 0' }}>
                  CV #{cleanCvNumber(currentCv?.voucher_no)}
                </p>
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr 1.5fr 1fr 1fr', gap: '8px', backgroundColor: '#ecfdf5', padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1fae5' }}>
              <div>
                <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block' }}>Voucher Date</span>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937', margin: '1px 0 0 0', whiteSpace: 'nowrap' }}>
                  {currentCv?.voucher_date ? new Date(currentCv.voucher_date).toLocaleDateString() : '—'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block' }}>Transaction Type</span>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937', margin: '1px 0 0 0', whiteSpace: 'nowrap' }}>
                  {resolvedType === 'stl' ? 'STL Replenishment' : 'Revolving Fund Replenishment'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block' }}>Payee</span>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937', margin: '1px 0 0 0', whiteSpace: 'nowrap' }}>
                  {formatPayeeName(currentCv?.payee || currentLf?.custodian_name || 'Michelle Pable')}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block' }}>Bank</span>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1f2937', margin: '1px 0 0 0', whiteSpace: 'nowrap' }}>
                  {currentCv?.bank_name || currentCv?.bank || '—'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', display: 'block' }}>Check No.</span>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#064e3b', margin: '1px 0 0 0', fontFamily: 'monospace' }}>
                  {currentCv?.check_no || 'PENDING'}
                </p>
              </div>
            </div>

            {/* Particulars / Breakdown (PRINT) */}
            {isRevolvingFund && cvViewMode === 'detailed' && rfDetailedCategoryBreakdown.length > 0 ? (
              <div style={{ backgroundColor: '#ecfdf5', padding: '5px 8px', borderRadius: '4px', border: '1px solid #a7f3d0', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ backgroundColor: '#065f46', color: '#ffffff', padding: '1.5px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  BREAKDOWN:
                </span>
                <span style={{ color: '#111827', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {rfDetailedCategoryBreakdown.map((cat) => (
                    <span key={cat.name} style={{ backgroundColor: '#ffffff', border: '1px solid #d1fae5', padding: '1.5px 6px', borderRadius: '3px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <strong style={{ color: '#065f46', fontWeight: 'bold' }}>{cat.name}:</strong>{' '}
                      <span style={{ fontFamily: 'monospace', color: '#111827', fontWeight: 'bold' }}>{cat.formatted}</span>
                    </span>
                  ))}
                </span>
              </div>
            ) : (isStlFund && cvViewMode === 'detailed') ? null : (
              <div style={{ backgroundColor: '#f9fafb', padding: '5px 8px', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '9px' }}>
                <strong style={{ color: '#374151' }}>DESCRIPTION:</strong>{' '}
                <span style={{ color: '#1f2937', fontStyle: 'italic' }}>
                  {currentCv?.particulars || (resolvedType === 'stl' ? 'STL Replenishment Disbursement' : 'Revolving Fund Replenishment')}
                </span>
              </div>
            )}

            {/* TRANSACTION DETAILS (PRINT) */}
            {cvViewMode === 'summary' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <div style={{ border: '1px solid #6ee7b7', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#064e3b', color: '#ffffff', padding: '4px 8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '8.5px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#ffffff' }}>
                      TRANSACTION DETAILS
                    </span>
                  </div>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '8px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#ecfdf5', color: '#064e3b', fontWeight: 'bold', borderBottom: '1px solid #a7f3d0' }}>
                        <th style={{ padding: '3px 5px', width: '25px', textAlign: 'center', borderRight: '1px solid #d1fae5' }}>#</th>
                        <th style={{ padding: '3px 6px', borderRight: '1px solid #d1fae5' }}>BOOK OF ACCOUNTS</th>
                        <th style={{ padding: '3px 6px', textAlign: 'right', width: '85px', borderRight: '1px solid #d1fae5' }}>DEBIT (₱)</th>
                        <th style={{ padding: '3px 6px', textAlign: 'right', width: '85px' }}>CREDIT (₱)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryCvData.rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '3px 5px', textAlign: 'center', borderRight: '1px solid #e5e7eb', color: '#6b7280', fontFamily: 'monospace' }}>
                            {i + 1}
                          </td>
                          <td style={{ padding: '3px 6px', borderRight: '1px solid #e5e7eb', fontWeight: 'bold', color: '#111827' }}>
                            {r.description}
                          </td>
                          <td style={{ padding: '3px 6px', textAlign: 'right', borderRight: '1px solid #e5e7eb', fontFamily: 'monospace', fontWeight: 'bold', color: '#111827' }}>
                            {r.debit !== null ? r.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : <span style={{ color: '#9ca3af' }}>–</span>}
                          </td>
                          <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#dc2626' }}>
                            {r.credit !== null ? r.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : <span style={{ color: '#dc2626' }}>–</span>}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ backgroundColor: '#ecfdf5', borderTop: '1px solid #6ee7b7', fontWeight: 'bold' }}>
                        <td colSpan={2} style={{ padding: '3px 6px', textAlign: 'right', textTransform: 'uppercase', fontSize: '7.5px', color: '#111827' }}>TOTAL:</td>
                        <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', borderRight: '1px solid #a7f3d0', color: '#111827' }}>
                          ₱{summaryCvData.debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>
                          ₱{summaryCvData.creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', color: '#064e3b', letterSpacing: '0.04em' }}>
                    TRANSACTION DETAILS
                  </span>
                </div>
                <div style={{ border: '1px solid #6ee7b7', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '8px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#064e3b', color: '#ffffff', fontWeight: 'bold' }}>
                        <th style={{ padding: '2.5px 5px', width: '75px', borderRight: '1px solid #047857', color: '#ffffff', whiteSpace: 'nowrap' }}>DATE</th>
                        <th style={{ padding: '2.5px 5px', width: isHonorariumAndWages ? '95px' : '65px', borderRight: '1px solid #047857', color: '#ffffff', whiteSpace: 'nowrap' }}>{isHonorariumAndWages ? 'Cash Release Form No.' : (resolvedType === 'stl' ? 'LAF No.' : 'RF VOUCHER #')}</th>
                        <th style={{ padding: '2.5px 5px', width: '30%', borderRight: '1px solid #047857', color: '#ffffff' }}>BOOK OF ACCOUNTS</th>
                        <th style={{ padding: '2.5px 5px', width: '30%', borderRight: '1px solid #047857', color: '#ffffff' }}>{isHonorariumAndWages ? 'RECIPIENT' : 'REMARKS'}</th>
                        <th style={{ padding: '2.5px 5px', textAlign: 'right', width: '85px', borderRight: '1px solid #047857', color: '#ffffff' }}>DEBIT (₱)</th>
                        <th style={{ padding: '2.5px 5px', textAlign: 'right', width: '85px', color: '#ffffff' }}>CREDIT (₱)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedCvData.rows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '2px 5px', borderRight: '1px solid #e5e7eb', fontFamily: 'monospace', color: '#4b5563', whiteSpace: 'nowrap' }}>{r.date}</td>
                          <td style={{ padding: '2px 5px', borderRight: '1px solid #e5e7eb', fontFamily: 'monospace', fontWeight: 'bold', color: '#111827' }}>{r.voucher_no}</td>
                          <td style={{ padding: '2px 5px', borderRight: '1px solid #e5e7eb', fontWeight: r.credit !== null ? 'normal' : 'bold', paddingLeft: r.credit !== null ? '12px' : '5px', fontStyle: r.credit !== null ? 'italic' : 'normal', color: r.credit !== null ? '#4b5563' : '#111827' }}>
                            {r.description}
                          </td>
                          <td style={{ padding: '2px 5px', borderRight: '1px solid #e5e7eb', fontStyle: 'italic', color: '#6b7280', fontSize: '7.5px' }}>
                            {r.remarks || '—'}
                          </td>
                          <td style={{ padding: '2px 5px', textAlign: 'right', borderRight: '1px solid #e5e7eb', fontFamily: 'monospace', fontWeight: 'bold', color: '#111827' }}>
                            {r.debit !== null ? `₱${r.debit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '–'}
                          </td>
                          <td style={{ padding: '2px 5px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', color: '#111827' }}>
                            {r.credit !== null ? `₱${r.credit.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '–'}
                          </td>
                        </tr>
                      ))}
                      {/* 3-ROW FOOTER FOR STL; 2-ROW FOOTER (TOTAL & CIB ONLY) FOR REVOLVING */}
                      {resolvedType === 'stl' ? (
                        <>
                          <tr style={{ backgroundColor: '#ecfdf5', borderTop: '1px solid #6ee7b7', fontWeight: 'bold', color: '#064e3b' }}>
                            <td colSpan={4} style={{ padding: '3px 6px', textAlign: 'right', textTransform: 'uppercase', fontSize: '7.5px' }}>TOTAL:</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', borderRight: '1px solid #a7f3d0' }}>
                              –
                            </td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b' }}>
                              {detailedCvData.creditTotal > 0 ? `₱${detailedCvData.creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '–'}
                            </td>
                          </tr>
                          <tr style={{ backgroundColor: '#ecfdf5', borderTop: '1px solid #a7f3d0', fontWeight: 'bold', color: '#064e3b' }}>
                            <td colSpan={4} style={{ padding: '3px 6px', textAlign: 'right', textTransform: 'uppercase', fontSize: '7.5px' }}>{cibName}:</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', borderRight: '1px solid #a7f3d0' }}>
                              –
                            </td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b' }}>
                              ₱{cibDetailedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                          <tr style={{ backgroundColor: '#ecfdf5', borderTop: '2px solid #34d399', fontWeight: 'bold', color: '#064e3b' }}>
                            <td colSpan={4} style={{ padding: '3px 6px', textAlign: 'right', textTransform: 'uppercase', fontSize: '7.5px' }}>Overall:</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', borderRight: '1px solid #a7f3d0' }}>
                              ₱{detailedCvData.debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b' }}>
                              ₱{(detailedCvData.creditTotal + cibDetailedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr style={{ backgroundColor: '#ecfdf5', borderTop: '1px solid #6ee7b7', fontWeight: 'bold', color: '#064e3b' }}>
                            <td colSpan={4} style={{ padding: '3px 6px', textAlign: 'right', textTransform: 'uppercase', fontSize: '7.5px' }}>TOTAL:</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', borderRight: '1px solid #a7f3d0' }}>
                              ₱{detailedCvData.debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b' }}>
                              –
                            </td>
                          </tr>
                          <tr style={{ backgroundColor: '#ecfdf5', borderTop: '1px solid #a7f3d0', fontWeight: 'bold', color: '#064e3b' }}>
                            <td colSpan={4} style={{ padding: '3px 6px', textAlign: 'right', textTransform: 'uppercase', fontSize: '7.5px' }}>{cibName}:</td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', borderRight: '1px solid #a7f3d0' }}>
                              –
                            </td>
                            <td style={{ padding: '3px 6px', textAlign: 'right', fontFamily: 'monospace', color: '#064e3b' }}>
                              ₱{cibDetailedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Disbursed Amount in Words */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ecfdf5', padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1fae5' }}>
              <div>
                <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#064e3b', textTransform: 'uppercase', display: 'block' }}>Disbursed Amount</span>
                <p style={{ fontSize: '8px', fontWeight: 'bold', color: '#111827', margin: 0, textTransform: 'uppercase' }}>
                  {formatDisbursedInWords(displayedDisbursedAmount)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '800', color: '#064e3b' }}>
                  ₱{displayedDisbursedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* 3 Summary Cards */}
            {!(cvViewMode === 'summary' && isHonorariumAndWages) && (
              <div className="no-print-split" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <div style={{ padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#ffffff' }}>
                  <span style={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280', display: 'block' }}>FUND AMOUNT</span>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace', color: '#111827' }}>
                    ₱{authorizedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#ffffff' }}>
                  <span style={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', color: '#6b7280', display: 'block' }}>
                    TOTAL EXPENSE ({activeItems.length > 0 ? activeItems.length : (cvViewMode === 'summary' ? summaryCvData.rows.filter(r => r.debit !== null).length : detailedCvData.rows.filter(r => r.debit !== null).length)} ITEMS)
                  </span>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace', color: '#047857' }}>
                    ₱{displayedTotalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{ padding: '3px 6px', border: displayedFundBalance < 0 ? '1.5px solid #ef4444' : '1.5px solid #059669', borderRadius: '4px', backgroundColor: displayedFundBalance < 0 ? '#fef2f2' : '#ecfdf5' }}>
                  <span style={{ fontSize: '7px', fontWeight: 'bold', textTransform: 'uppercase', color: displayedFundBalance < 0 ? '#991b1b' : '#047857', display: 'block' }}>FUND BALANCE</span>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace', color: displayedFundBalance < 0 ? '#b91c1c' : '#065f46' }}>
                    ₱{displayedFundBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}

            {/* Signatures */}
            {cvViewMode === 'summary' ? (
              <div className="no-print-split" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: '20px', rowGap: '10px' }}>
                  {/* Row 1 */}
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', fontSize: '7.5px', display: 'block', letterSpacing: '0.04em' }}>
                      PREPARED BY:
                    </span>
                    <div style={{ paddingTop: '8px', paddingBottom: '2px' }}>
                      <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: 0, fontSize: '9.5px', color: '#111827' }}>
                        {currentCv?.signatories?.prepared_by || currentLf?.prepared_by || 'CHINNETTE A. LAMOSTE'}
                      </p>
                    </div>
                    <div style={{ borderBottom: '1px solid #d1d5db', width: '100%' }}></div>
                  </div>

                  <div>
                    <span style={{ fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', fontSize: '7.5px', display: 'block', letterSpacing: '0.04em' }}>
                      CHECKED BY:
                    </span>
                    <div style={{ paddingTop: '8px', paddingBottom: '2px' }}>
                      <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: 0, fontSize: '9.5px', color: '#111827' }}>
                        {currentCv?.signatories?.checked_by || currentLf?.checked_by || 'MARILOU LARIOSA'}
                      </p>
                    </div>
                    <div style={{ borderBottom: '1px solid #d1d5db', width: '100%' }}></div>
                  </div>

                  <div>
                    <span style={{ fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', fontSize: '7.5px', display: 'block', letterSpacing: '0.04em' }}>
                      APPROVED BY:
                    </span>
                    <div style={{ paddingTop: '8px', paddingBottom: '2px' }}>
                      <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: 0, fontSize: '9.5px', color: '#111827' }}>
                        {currentCv?.signatories?.approved_by || currentLf?.approved_by || 'MICHELLE M. PABLE'}
                      </p>
                    </div>
                    <div style={{ borderBottom: '1px solid #d1d5db', width: '100%' }}></div>
                  </div>

                  {/* Row 2: Received By, Date */}
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', fontSize: '7.5px', display: 'block', letterSpacing: '0.04em' }}>
                      RECEIVED BY:
                    </span>
                    <div style={{ paddingTop: '8px', paddingBottom: '2px' }}>
                      <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: 0, fontSize: '9.5px', color: '#111827', minHeight: '14px' }}>
                        &nbsp;
                      </p>
                    </div>
                    <div style={{ borderBottom: '1px solid #d1d5db', width: '100%' }}></div>
                    <span style={{ fontSize: '7px', color: '#6b7280', display: 'block', marginTop: '2px' }}>
                      Signature over Printed Name
                    </span>
                  </div>

                  <div>
                    <span style={{ fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', fontSize: '7.5px', display: 'block', letterSpacing: '0.04em' }}>
                      DATE:
                    </span>
                    <div style={{ paddingTop: '8px', paddingBottom: '2px' }}>
                      <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: 0, fontSize: '9.5px', color: '#111827', minHeight: '14px' }}>
                        &nbsp;
                      </p>
                    </div>
                    <div style={{ borderBottom: '1px solid #d1d5db', width: '100%' }}></div>
                  </div>

                  <div>{/* Blank spacer column */}</div>
                </div>
              </div>
            ) : (
              <div className="no-print-split" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginTop: '6px', fontSize: '8px' }}>
                <div>
                  <span style={{ fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', fontSize: '7px', display: 'block' }}>
                    LIQUIDATED BY:
                  </span>
                  <div style={{ height: '12px' }}></div>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: 0, fontSize: '9px', color: '#111827' }}>
                    {detailedLiquidatedBy || 'MICHELLE M. PABLE'}
                  </p>
                  <div style={{ borderBottom: '1px solid #111827', marginTop: '1px', width: '180px' }}></div>
                  <span style={{ fontSize: '7px', color: '#6b7280', display: 'block', minHeight: '10px' }}>
                    {liquidatedByTitle || ''}
                  </span>
                </div>

                <div>
                  <span style={{ fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', fontSize: '7px', display: 'block' }}>
                    APPROVED BY:
                  </span>
                  <div style={{ height: '12px' }}></div>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: 0, fontSize: '9px', color: '#111827' }}>
                    {detailedApprovedBy || 'CANDILARIO N. TATOY'}
                  </p>
                  <div style={{ borderBottom: '1px solid #111827', marginTop: '1px', width: '180px' }}></div>
                  <span style={{ fontSize: '7px', color: '#6b7280', display: 'block', minHeight: '10px' }}>
                    {approvedByTitle || ''}
                  </span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="no-print-split" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '1px solid #e5e7eb', paddingTop: '4px', fontSize: '7px', color: '#9ca3af', marginTop: '6px' }}>
              <div>
                <div>Generated via UC-METC MPC Portal • Check Voucher System • KADT Solutions</div>
              </div>
              <span>Printed on {new Date().toLocaleString()}</span>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
