'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

function formatRawDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}-${months[d.getMonth()]}`;
  } catch {
    return String(dateStr);
  }
}

function formatIsoDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).split('T')[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return String(dateStr);
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
    return `${words} ${currencyUnit} AND ${centavos.toString().padStart(2, '0')}/100 ONLY`;
  }
  return `${words} ${currencyUnit} ONLY`;
}

function getCvDisbursedAmount(cv: any): number {
  if (!cv) return 0;
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

  // 1. Calculate sum of debit items (gross voucher disbursement amount)
  let debitSum = 0;
  for (const item of details) {
    const desc = (item.book_of_account || item.description || '').trim();
    const val = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || item.debit || 0);
    const isCredit = item.is_credit === true ||
                     item.isAutoCredit === true ||
                     /^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test(desc) ||
                     val < 0 ||
                     (item.credit !== null && item.credit !== undefined && item.credit !== '' && !item.debit);
    if (!isCredit && val > 0) {
      debitSum += val;
    }
  }
    if (debitSum > 0) return debitSum;

    // Check linked revolving fund items or STL items if details is not yet populated
    if (Array.isArray(cv.revolving_fund?.items) && cv.revolving_fund.items.length > 0) {
      const rfSum = cv.revolving_fund.items
        .filter((it: any) => !it.is_cancelled)
        .reduce((sum: number, it: any) => sum + (parseFloat(it.amount || 0) || 0), 0);
      if (rfSum > 0) return rfSum;
    }
    if (Array.isArray(cv.stl_liquidation?.items) && cv.stl_liquidation.items.length > 0) {
      const stlSum = cv.stl_liquidation.items
        .filter((it: any) => !it.is_cancelled)
        .reduce((sum: number, it: any) => sum + (parseFloat(it.amount || 0) || 0), 0);
      if (stlSum > 0) return stlSum;
    }

    return parseFloat(cv.amount || 0);
  };

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

  // 2. Keyword heuristic
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

function getBalancedCvRows(cv: any, lfItems?: any[], resolvedType?: 'stl' | 'rf') {
  const rows: { date: string; voucher_no: string; description: string; remarks: string; debit: number | null; credit: number | null }[] = [];
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
    return ['operation', 'service', 'services', 'merchandise', 'stl', 'short term loan', 'revolving fund', 'loan', 'petty cash'].includes(d) ||
           /^(revolving\s*fund|stl|short\s*term\s*loan)\s*-\s*(operation|service|services|stl)$/i.test(d);
  };

  const debitDetails = details.filter(d => {
    const val = typeof d.amount === 'number' ? d.amount : parseFloat(d.amount || d.debit || 0);
    const desc = d.book_of_account || d.description || '';
    const isCredit = d.is_credit === true || /^(cib\b|cash\s*in\s*bank)/i.test(desc) || val < 0;
    return !isCredit && val > 0;
  });

  const detailsAreOnlyCategories = debitDetails.length > 0 && debitDetails.every(d => isBroadCategoryDesc(d.book_of_account || d.description || ''));

  // Prioritize activeItems from attached liquidation schedule ONLY when cv details is empty
  const shouldUseActiveItems = activeItems.length > 0 && debitDetails.length === 0;

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
        credit: null
      });
      debitTotal += amt;
    }

    return { rows, debitTotal, creditTotal: 0 };
  }

  if (details.length > 0) {
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
        rows.push({
          date: dateStr,
          voucher_no: vNo,
          description: desc || 'Credit / Deduction',
          remarks: item.remarks || '',
          debit: null,
          credit: creditVal
        });
        if (creditVal) creditTotal += creditVal;
      } else if (rawVal > 0) {
        rows.push({
          date: dateStr,
          voucher_no: vNo,
          description: desc || 'Disbursement Line',
          remarks: item.remarks || '',
          debit: rawVal,
          credit: null
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

function cleanCategoryName(name: string): string {
  if (!name) return 'Operation';
  return name
    .replace(/^revolving\s*fund\s*-\s*/i, '')
    .replace(/^stl\s*-\s*/i, '')
    .replace(/^short\s*term\s*loan\s*-\s*/i, '')
    .trim();
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

function getSummaryCvRows(
  cv: any,
  resolvedType: 'stl' | 'rf',
  categoryBreakdown: { list: { name: string; amount: number; percent: string }[]; total: number }
) {
  const rows: { description: string; debit: number | null; credit: number | null }[] = [];
  let debitTotal = 0;
  let creditTotal = 0;

  const cibName = formatCibAccountName(cv?.bank || cv?.bank_name);

  if (categoryBreakdown.list.length > 0) {
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
          const cat = cleanCategoryName(getCategoryForAccount(desc));
          catMap[cat] = (catMap[cat] || 0) + val;
        }
      }
    } else if (Array.isArray(cv?.revolving_fund?.items) && cv.revolving_fund.items.length > 0) {
      for (const it of cv.revolving_fund.items) {
        if (it.is_cancelled) continue;
        const val = typeof it.amount === 'number' ? it.amount : parseFloat(it.amount || 0);
        if (val > 0) {
          const rawCat = it.category || getCategoryForAccount(it.account_name || '') || 'Operation';
          const cat = cleanCategoryName(rawCat);
          catMap[cat] = (catMap[cat] || 0) + val;
        }
      }
    } else if (Array.isArray(cv?.stl_liquidation?.items) && cv.stl_liquidation.items.length > 0) {
      for (const it of cv.stl_liquidation.items) {
        if (it.is_cancelled) continue;
        const val = typeof it.amount === 'number' ? it.amount : parseFloat(it.amount || 0);
        if (val > 0) {
          const cat = 'Short Term Loan';
          catMap[cat] = (catMap[cat] || 0) + val;
        }
      }
    }

    if (Object.keys(catMap).length > 0) {
      for (const [cat, amt] of Object.entries(catMap)) {
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
          description: resolvedType === 'stl' ? 'Short Term Loan' : 'Operation',
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

  useEffect(() => {
    if (isOpen && initialMode) {
      setCvViewMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Available options for linking when unlinked
  const [availableLiquidations, setAvailableLiquidations] = useState<any[]>([]);
  const [availableCheckVouchers, setAvailableCheckVouchers] = useState<any[]>([]);
  const [selectedLinkTargetId, setSelectedLinkTargetId] = useState<string>('');

  // Actual print trigger state
  const [isPrinting, setIsPrinting] = useState(false);
  const [mounted, setMounted] = useState(false);

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
              const resStl = await api.get('/stl-liquidations', { params: { search: cvObj.voucher_no, limit: 5 } });
              const found = resStl.data?.data?.find((f: any) => f.check_voucher_id === cvObj.id || f.voucher_no === cvObj.voucher_no);
              if (found) linkedLfId = found.id;
            } else {
              const resRf = await api.get('/revolving-funds', { params: { search: cvObj.voucher_no, limit: 5 } });
              const found = resRf.data?.data?.find((f: any) => f.check_voucher_id === cvObj.id || f.voucher_no === cvObj.voucher_no);
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
        const desc = (it.book_of_account || it.description || '').trim();
        const rawCat = it.category || getCategoryForAccount(desc);
        const cat = cleanCategoryName(rawCat);
        map[cat] = (map[cat] || 0) + amt;
        total += amt;
      }
    } else {
      const activeLf = (lfItems || []).filter((it: any) => !it.is_cancelled);
      if (activeLf.length > 0) {
        for (const it of activeLf) {
          const amt = parseFloat(it.amount) || 0;
          if (amt > 0) {
            const rawCat = it.category || getCategoryForAccount(it.account_name || '') || 'Operation';
            const cat = cleanCategoryName(rawCat);
            map[cat] = (map[cat] || 0) + amt;
            total += amt;
          }
        }
      }
    }

    const list = Object.entries(map).map(([name, amount]) => ({
      name,
      amount,
      percent: total > 0 ? ((amount / total) * 100).toFixed(1) : '0.0'
    }));
    list.sort((a, b) => b.amount - a.amount);
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

  const summaryCvData = useMemo(() => getSummaryCvRows(currentCv, resolvedType, categoryBreakdown), [currentCv, resolvedType, categoryBreakdown]);
  const activeCvDebitTotal = cvViewMode === 'summary' ? summaryCvData.debitTotal : detailedCvData.debitTotal;

  const cibName = useMemo(() => formatCibAccountName(currentCv?.bank || currentCv?.bank_name), [currentCv]);

  const cibDetailedAmount = useMemo(() => {
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
  }, [currentCv, detailedCvData]);

  // Overall credit amount:
  // In detailed mode: overall credit is the sum of expense deductions + CIB amount (= debitTotal)
  // In summary mode: overall credit is summaryCvData.creditTotal (= debitTotal)
  const overallCreditAmount = useMemo(() => {
    if (cvViewMode === 'detailed') {
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
  }, [cvViewMode, detailedCvData, cibDetailedAmount, summaryCvData, currentCv, totalExpenseAmount]);

  const displayedTotalExpense = useMemo(() => {
    return overallCreditAmount;
  }, [overallCreditAmount]);

  const displayedDisbursedAmount = useMemo(() => {
    return overallCreditAmount;
  }, [overallCreditAmount]);

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

  const rfDetailedCategoryBreakdown = useMemo(() => {
    if (!isRevolvingFund) return [];

    const preferredOrder = ['Service', 'Merchandise', 'Operation', 'CETF', 'CDF'];
    const catMap: Record<string, number> = {};

    const nonCibRows = (detailedCvData.rows || []).filter(r => !/^(cib\b|cib[-_\s]|cash\s*in\s*bank)/i.test((r.description || '').trim()));
    const hasDebitRows = nonCibRows.some(r => Number(r.debit) > 0);

    // 1. Primary source: detailed CV rows if debit items exist (reflects immediate user edits)
    if (hasDebitRows) {
      for (const r of nonCibRows) {
        const amt = Number(r.debit) || 0;
        if (amt > 0) {
          const rawCat = (r as any).category || getCategoryForAccount(r.description || '');
          const cat = cleanCategoryName(rawCat);
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
            const rawCat = it.category || getCategoryForAccount(it.account_name || '');
            const cat = cleanCategoryName(rawCat);
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
  }, [isRevolvingFund, detailedCvData.rows, lfItems, categoryBreakdown.list]);

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
                      <span>Summary Voucher Only</span>
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
                      <span>Detailed Check Voucher</span>
                    </button>

                    {onEdit && (currentCv || initialCv) && (
                      <button
                        type="button"
                        onClick={() => {
                          const activeCv = currentCv || initialCv;
                          const rowsToPass = cvViewMode === 'detailed' ? detailedCvData.rows : summaryCvData.rows;
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
                      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/90 dark:border-emerald-800/60 shadow-2xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-[#064e3b] text-white font-extrabold text-[9.5px] uppercase tracking-wider shadow-2xs">
                            Breakdown
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {rfDetailedCategoryBreakdown.map((cat) => (
                              <span
                                key={cat.name}
                                className="inline-flex items-center gap-1.5 bg-white/95 dark:bg-neutral-900/90 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-700/60 shadow-2xs"
                              >
                                <span className="text-[#065f46] dark:text-emerald-400 font-bold text-[11px]">{cat.name}:</span>
                                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 text-[11.5px]">{cat.formatted}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs bg-neutral-50 dark:bg-neutral-900/60 p-2.5 rounded border border-neutral-200 dark:border-neutral-800">
                        <strong className="text-neutral-700 dark:text-neutral-300 uppercase text-[10px] tracking-wide">Particulars:</strong>{' '}
                        <span className="italic text-neutral-800 dark:text-neutral-200 font-medium">
                          {currentCv?.particulars || (resolvedType === 'stl' ? 'STL Replenishment Disbursement' : 'Revolving Fund Replenishment')}
                        </span>
                      </div>
                    )}

                    {/* TRANSACTION DETAILS */}
                    {cvViewMode === 'summary' ? (
                      <div className="space-y-3">
                        <div className="border border-emerald-300 dark:border-emerald-700/60 rounded-2xl overflow-hidden text-[10px] shadow-2xs">
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
                          <span className="font-extrabold uppercase text-[10px] tracking-wider text-[#064e3b]">
                            TRANSACTION DETAILS
                          </span>
                        </div>
                        <div className="border border-emerald-300 dark:border-emerald-700/60 rounded-2xl overflow-hidden text-[10px] shadow-2xs">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-[#064e3b] text-white font-bold uppercase text-[9px] border-b border-emerald-800">
                              <tr>
                                <th className="p-2.5 w-28 text-left border-r border-emerald-700/60 text-white whitespace-nowrap">DATE</th>
                                <th className="p-2.5 w-28 text-left border-r border-emerald-700/60 text-white whitespace-nowrap">{resolvedType === 'stl' ? 'LAF No.' : 'RF VOUCHER #'}</th>
                                <th className="p-2.5 w-1/3 text-left border-r border-emerald-700/60 text-white">BOOK OF ACCOUNTS</th>
                                <th className="p-2.5 w-1/3 text-left border-r border-emerald-700/60 text-white">REMARKS</th>
                                <th className="p-2.5 w-32 text-right border-r border-emerald-700/60 text-white whitespace-nowrap">DEBIT (₱)</th>
                                <th className="p-2.5 w-32 text-right text-white whitespace-nowrap">CREDIT (₱)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailedCvData.rows.map((r, i) => (
                                <tr key={i} className="border-b border-neutral-200 hover:bg-emerald-50/30">
                                  <td className="p-2.5 font-mono text-[9.5px] text-neutral-600 border-r border-neutral-200 whitespace-nowrap">
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
                              ))}
                              {/* 3-ROW FOOTER MATCHING DETAILED CV SPEC */}
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
                                {currentCv?.signatories?.prepared_by || currentLf?.prepared_by || 'LAMOSTE, CHINNETTE A.'}
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

                          {/* Row 2 */}
                          <div>
                            <span className="font-bold uppercase text-[9.5px] text-neutral-500 tracking-wider block">
                              RECEIVED BY:
                            </span>
                            <div className="h-6"></div>
                            <div className="border-b border-neutral-300"></div>
                            <span className="text-[8.5px] text-neutral-500 block mt-1">
                              Signature over Printed Name
                            </span>
                          </div>

                          <div>
                            <span className="font-bold uppercase text-[9.5px] text-neutral-500 tracking-wider block">
                              DATE:
                            </span>
                            <div className="h-6"></div>
                            <div className="border-b border-neutral-300"></div>
                          </div>

                          <div>{/* Blank spacer column */}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-neutral-200 grid grid-cols-2 gap-8 text-[9px] text-neutral-700">
                        <div>
                          <span className="font-bold uppercase text-[7.5px] text-neutral-500 block">LIQUIDATED BY:</span>
                          <div className="h-4"></div>
                          <p className="font-bold text-neutral-900 uppercase text-[9.5px] m-0">
                            MICHELLE M. PABLE
                          </p>
                          <div className="border-b border-neutral-800 mt-0.5" style={{ width: '180px' }}></div>
                          <span className="text-[7.5px] text-neutral-500 block mt-0.5">Manager</span>
                        </div>

                        <div>
                          <span className="font-bold uppercase text-[7.5px] text-neutral-500 block">APPROVED BY:</span>
                          <div className="h-4"></div>
                          <p className="font-bold text-neutral-900 uppercase text-[9.5px] m-0">
                            CANDILARIO N. TATOY
                          </p>
                          <div className="border-b border-neutral-800 mt-0.5" style={{ width: '180px' }}></div>
                          <span className="text-[7.5px] text-neutral-500 block mt-0.5">Chairman</span>
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
            ) : (
              <div style={{ backgroundColor: '#f9fafb', padding: '5px 8px', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '9px' }}>
                <strong style={{ color: '#374151' }}>PARTICULARS:</strong>{' '}
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
                        <th style={{ padding: '2.5px 5px', width: '65px', borderRight: '1px solid #047857', color: '#ffffff', whiteSpace: 'nowrap' }}>{resolvedType === 'stl' ? 'LAF No.' : 'RF VOUCHER #'}</th>
                        <th style={{ padding: '2.5px 5px', width: '30%', borderRight: '1px solid #047857', color: '#ffffff' }}>BOOK OF ACCOUNTS</th>
                        <th style={{ padding: '2.5px 5px', width: '30%', borderRight: '1px solid #047857', color: '#ffffff' }}>REMARKS</th>
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
                      {/* 3-ROW FOOTER MATCHING DETAILED CV SPEC */}
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
                        {currentCv?.signatories?.prepared_by || currentLf?.prepared_by || 'LAMOSTE, CHINNETTE A.'}
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

                  {/* Row 2 */}
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', fontSize: '7.5px', display: 'block', letterSpacing: '0.04em' }}>
                      RECEIVED BY:
                    </span>
                    <div style={{ height: '18px' }}></div>
                    <div style={{ borderBottom: '1px solid #d1d5db', width: '100%' }}></div>
                    <span style={{ fontSize: '7px', color: '#6b7280', display: 'block', marginTop: '2px' }}>
                      Signature over Printed Name
                    </span>
                  </div>

                  <div>
                    <span style={{ fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', fontSize: '7.5px', display: 'block', letterSpacing: '0.04em' }}>
                      DATE:
                    </span>
                    <div style={{ height: '18px' }}></div>
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
                    MICHELLE M. PABLE
                  </p>
                  <div style={{ borderBottom: '1px solid #111827', marginTop: '1px', width: '180px' }}></div>
                  <span style={{ fontSize: '7px', color: '#6b7280', display: 'block' }}>
                    Manager
                  </span>
                </div>

                <div>
                  <span style={{ fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', fontSize: '7px', display: 'block' }}>
                    APPROVED BY:
                  </span>
                  <div style={{ height: '12px' }}></div>
                  <p style={{ fontWeight: 'bold', textTransform: 'uppercase', margin: 0, fontSize: '9px', color: '#111827' }}>
                    CANDILARIO N. TATOY
                  </p>
                  <div style={{ borderBottom: '1px solid #111827', marginTop: '1px', width: '180px' }}></div>
                  <span style={{ fontSize: '7px', color: '#6b7280', display: 'block' }}>
                    Chairman
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
